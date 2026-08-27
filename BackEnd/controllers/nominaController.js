const db = require('../config/db');

// =========================================================================
// MOTOR CENTRAL DE NÓMINAS Y AUDITORÍA FINANCIERA (LFT MEXICO)
// =========================================================================

exports.guardarNomina = async (req, res) => {
    const { datos_corte, usuario_admin_id } = req.body;
    try {
        const result = await db.query(
            'INSERT INTO historico_nominas (usuario_admin_id, datos_corte) VALUES ($1, $2) RETURNING *',
            [usuario_admin_id || null, JSON.stringify(datos_corte)]
        );
        res.json(result.rows[0]);
    } catch (error) {
        console.error("Error al procesar el corte de nómina:", error);
        res.status(500).json({ error: 'Error crítico al guardar la nómina en la base de datos.' });
    }
};

// =========================================================================
// 🚨 BOTÓN DE PÁNICO: REVERSIÓN TOTAL Y BLINDADA (TRANSACCIÓN SQL)
// =========================================================================
exports.revertirNomina = async (req, res) => {
    const { id } = req.params;
    
    try {
        // 1. Obtener los datos de la nómina a revertir
        const nominaRes = await db.query('SELECT datos_corte FROM historico_nominas WHERE id = $1', [id]);
        if (nominaRes.rows.length === 0) {
            return res.status(404).json({ error: 'Nómina no encontrada en el historial.' });
        }

        const datosCorte = typeof nominaRes.rows[0].datos_corte === 'string'
            ? JSON.parse(nominaRes.rows[0].datos_corte)
            : nominaRes.rows[0].datos_corte;

        const recibos = datosCorte.recibos || [];

        // INICIAR TRANSACCIÓN (Si algo falla, no se guardan cambios a medias)
        await db.query('BEGIN');

        // 2. Por cada empleado en el recibo, hacer Rollback de sus estados financieros
        for (const r of recibos) {
            const empRes = await db.query('SELECT horario_semanal, prestaciones FROM usuarios WHERE id = $1', [r.empleado_id]);
            if (empRes.rows.length === 0) continue;

            let horActual = typeof empRes.rows[0].horario_semanal === 'string'
                ? JSON.parse(empRes.rows[0].horario_semanal || '{}')
                : (empRes.rows[0].horario_semanal || {});

            let presActual = typeof empRes.rows[0].prestaciones === 'string'
                ? JSON.parse(empRes.rows[0].prestaciones || '{}')
                : (empRes.rows[0].prestaciones || {});

            let huboCambio = false;

            // A. LIBERAR DÍAS (Quitar estado de 'nomina_pagada' para recalcularlos)
            const diasAuditados = r.metricas?.diasAuditados || [];
            diasAuditados.forEach(dia => {
                if (horActual[dia] && horActual[dia].nomina_pagada) {
                    horActual[dia].nomina_pagada = false;
                    delete horActual[dia].nomina_pagada;
                    huboCambio = true;
                }
            });

            // B. DEVOLVER DINERO AL SALDO DE PRÉSTAMOS
            let prestamosActuales = presActual.prestamos || [];
            const prestamosAplicados = r.metricas?.prestamosAplicados || [];
            
            if (prestamosAplicados.length > 0) {
                prestamosActuales = prestamosActuales.map(prestamo => {
                    const aplico = prestamosAplicados.find(pa => String(pa.id) === String(prestamo.id));
                    if (aplico) {
                        const nuevoSaldo = Number(prestamo.saldo_restante) + Number(aplico.descontado);
                        return { ...prestamo, saldo_restante: nuevoSaldo, activo: true }; // Se reactiva la deuda
                    }
                    return prestamo;
                });
                presActual.prestamos = prestamosActuales;
                huboCambio = true;
            }

            // C. DEVOLVER HORAS EXTRA AL BANCO DE HORAS DEL EMPLEADO
            let horasExtrasHistoricas = Number(presActual.horas_extras_acumuladas) || 0;
            const horasExtraAplicadas = Number(r.metricas?.horasExtrasAcumulables) || 0;
            
            if (horasExtraAplicadas > 0) {
                presActual.horas_extras_acumuladas = Math.max(0, horasExtrasHistoricas - horasExtraAplicadas);
                huboCambio = true;
            }

            // 3. ACTUALIZAR AL EMPLEADO
            if (huboCambio) {
                await db.query(
                    'UPDATE usuarios SET horario_semanal = $1, prestaciones = $2 WHERE id = $3',
                    [JSON.stringify(horActual), JSON.stringify(presActual), r.empleado_id]
                );
            }
        }

        // 4. DESTRUIR EL REGISTRO DE NÓMINA (El Rollback final)
        await db.query('DELETE FROM historico_nominas WHERE id = $1', [id]);

        // CONFIRMAR TRANSACCIÓN
        await db.query('COMMIT');
        
        res.json({ success: true, message: 'Rollback completo: Nómina eliminada y finanzas restauradas.' });
    } catch (error) {
        // CANCELAR TODO EN CASO DE ERROR (Protección ACID)
        await db.query('ROLLBACK');
        console.error("Fallo crítico al revertir nómina:", error);
        res.status(500).json({ error: 'Error interno al revertir la nómina. No se alteraron los saldos.' });
    }
};

// =========================================================================
// PLANTILLAS PERPETUAS (Motor Semanal Fijo)
// =========================================================================
exports.actualizarPlantillaBase = async (req, res) => {
    const { id } = req.params;
    const { plantilla_semanal } = req.body;

    try {
        const result = await db.query(
            'UPDATE usuarios SET horario_semanal = $1 WHERE id = $2 RETURNING *',
            [JSON.stringify(plantilla_semanal || {}), id]
        );

        if (result.rows.length === 0) return res.status(404).json({ error: 'Usuario no encontrado' });

        res.json({ success: true, usuario: result.rows[0] });
    } catch (error) {
        console.error("Error al actualizar plantilla fija:", error);
        res.status(500).json({ error: 'Error al actualizar la plantilla perpetua del empleado' });
    }
};