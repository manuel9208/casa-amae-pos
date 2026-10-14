const db = require('../config/db');

// ==========================================
// 🍳 MÓDULO AISLADO: OPERATIVA DE COCINA (Personal Presente + Log de Producción)
// Tablas 100% independientes — solo lectura cruzada con usuarios/registro_asistencias.
// ==========================================

exports.inicializarTablaCocinaOperativa = async () => {
    try {
        await db.query(`
            CREATE TABLE IF NOT EXISTS log_produccion_items (
                id SERIAL PRIMARY KEY,
                pedido_id INT NOT NULL,
                item_index INT NOT NULL,
                usuario_id INT,
                accion VARCHAR(20) NOT NULL,
                creado_en TIMESTAMP DEFAULT NOW()
            );
        `);
        await db.query(`
    CREATE INDEX IF NOT EXISTS idx_log_produccion_pedido ON log_produccion_items (pedido_id, item_index);
    `);

    // 🏭 NUEVO: Estaciones de Cocina (Capacidad de Producción)
    await db.query(`
        CREATE TABLE IF NOT EXISTS estaciones_cocina (
            id SERIAL PRIMARY KEY,
            nombre VARCHAR(100) NOT NULL,
            capacidad_maxima_paralela INT DEFAULT 5,
            ventana_minutos INT DEFAULT 15,
            es_automatica BOOLEAN DEFAULT false,
            activo BOOLEAN DEFAULT true,
            creado_en TIMESTAMP DEFAULT NOW()
        );
    `);
    await db.query(`
        CREATE TABLE IF NOT EXISTS estacion_clasificacion (
                id SERIAL PRIMARY KEY,
                estacion_id INT REFERENCES estaciones_cocina(id) ON DELETE CASCADE,
                clasificacion_id INT UNIQUE NOT NULL
            );
        `);
    console.log("✅ Tablas 'log_produccion_items' y 'estaciones_cocina' verificadas/creadas correctamente.");
        } catch (error) {
            console.error("🚨 Error al inicializar tablas de cocina operativa:", error);
        }
    };

// Roles que pueden operar el KDS (admin se incluye para operar, pero se excluirá
// en el futuro reporte de eficiencia por un filtro aparte, no aquí).
const ROLES_COCINA = ['cocina', 'ayudante_cocina', 'jefe', 'gerente', 'admin'];

// 👇 Log append-only: nunca se actualiza, solo se inserta. Fuente de verdad para
// reconstruir segmentos de tiempo por persona (espera/preparación) más adelante.
exports.registrarEventoProduccion = async (pedido_id, item_index, usuario_id, accion) => {
    try {
        await db.query(
            'INSERT INTO log_produccion_items (pedido_id, item_index, usuario_id, accion) VALUES ($1, $2, $3, $4)',
            [pedido_id, item_index, usuario_id || null, accion]
        );
    } catch (error) {
        console.error("Error al registrar evento de producción:", error.message);
    }
};

// 👇 FASE 1: Personal presente según el criterio configurado (asistencia/horario/ambos)
exports.obtenerPersonalPresente = async (req, res) => {
    try {
        const confRes = await db.query('SELECT criterio_presencia_cocina FROM configuracion_operativa WHERE id = 1');
        const criterio = confRes.rows[0]?.criterio_presencia_cocina || 'asistencia';

        const placeholders = ROLES_COCINA.map((_, i) => `$${i + 1}`).join(',');
        const usuariosRes = await db.query(
            `SELECT id, nombre, rol, horario_semanal FROM usuarios WHERE LOWER(TRIM(rol)) IN (${placeholders})`,
            ROLES_COCINA
        );
        const usuarios = usuariosRes.rows;

        // Asistencia abierta de HOY (con entrada, sin salida)
        const asistenciaRes = await db.query(
            `SELECT usuario_id FROM registro_asistencias WHERE fecha = CURRENT_DATE AND hora_entrada IS NOT NULL AND hora_salida IS NULL`
        );
        const idsConAsistenciaAbierta = new Set(asistenciaRes.rows.map(r => r.usuario_id));

        // Día/hora actual en la zona horaria del negocio
        const horaRes = await db.query(
            "SELECT TRIM(TO_CHAR(CURRENT_TIMESTAMP AT TIME ZONE 'America/Mazatlan', 'Day')) as dia, TO_CHAR(CURRENT_TIMESTAMP AT TIME ZONE 'America/Mazatlan', 'HH24:MI') as hora"
        );
        const diasMapa = {
            'Sunday': 'Domingo', 'Monday': 'Lunes', 'Tuesday': 'Martes', 'Wednesday': 'Miércoles',
            'Thursday': 'Jueves', 'Friday': 'Viernes', 'Saturday': 'Sábado'
        };
        const diaHoy = diasMapa[horaRes.rows[0]?.dia] || horaRes.rows[0]?.dia;
        const horaActual = horaRes.rows[0]?.hora || '00:00';

        const estaEnHorario = (horarioSemanal) => {
            if (!horarioSemanal) return false;
            const horParsed = typeof horarioSemanal === 'string' ? JSON.parse(horarioSemanal || '{}') : horarioSemanal;
            const turnoHoy = horParsed[diaHoy];
            if (!turnoHoy || turnoHoy.activo === false) return false;
            const entrada = turnoHoy.entrada || '00:00';
            const salida = turnoHoy.salida || '23:59';
            if (entrada <= salida) return horaActual >= entrada && horaActual <= salida;
            return horaActual >= entrada || horaActual <= salida; // turno que cruza medianoche
        };

        const presentes = usuarios.filter(u => {
            const tieneAsistencia = idsConAsistenciaAbierta.has(u.id);
            const tieneHorario = estaEnHorario(u.horario_semanal);
            if (criterio === 'horario') return tieneHorario;
            if (criterio === 'ambos') return tieneAsistencia && tieneHorario;
            return tieneAsistencia; // 'asistencia' (default, igual al comportamiento previo)
        }).map(u => ({ id: u.id, nombre: u.nombre, rol: u.rol }));

        res.json(presentes);
    } catch (error) {
        console.error("Error al obtener personal presente:", error);
        res.status(500).json({ error: 'Error al obtener personal presente en cocina' });
    }
};

// 🏭 NUEVO: Sincronización de lectura (self-healing). NO se engancha a ningún
// flujo de alta/edición de productos ni clasificaciones — simplemente LEE
// la tabla "clasificaciones" (ajena, sin tocarla) y, si alguna clasificación
// todavía no tiene Estación asignada, le crea una por defecto usando su ID.
// Se invoca de forma perezosa desde los propios endpoints de Cocina.
exports.sincronizarEstacionesFaltantes = async () => {
    try {
        const clasifs = await db.query('SELECT id, nombre FROM clasificaciones');

        for (const clasif of clasifs.rows) {
            const yaExiste = await db.query(
                'SELECT id FROM estacion_clasificacion WHERE clasificacion_id = $1',
                [clasif.id]
            );
            if (yaExiste.rows.length > 0) continue; // Ya tiene estación (manual o automática)

            // Tiempo por defecto: lectura simple (solo SELECT) del promedio de
            // tiempo_preparacion de los productos de esa clasificación, si existen.
            let ventana = 15;
            try {
                const tiempoRes = await db.query(
                    'SELECT AVG(tiempo_preparacion) as promedio FROM productos WHERE categoria = $1 AND tiempo_preparacion IS NOT NULL',
                    [clasif.nombre]
                );
                const promedio = Number(tiempoRes.rows[0]?.promedio);
                if (promedio > 0) ventana = Math.round(promedio);
            } catch (e) { /* si falla, se queda el default de 15 */ }

            const nuevaEstacion = await db.query(
                `INSERT INTO estaciones_cocina (nombre, capacidad_maxima_paralela, ventana_minutos, es_automatica)
                 VALUES ($1, 5, $2, true) RETURNING id`,
                [`${clasif.nombre} (Auto)`, ventana]
            );
            const estacionId = nuevaEstacion.rows[0].id;

            await db.query(
                'INSERT INTO estacion_clasificacion (estacion_id, clasificacion_id) VALUES ($1, $2) ON CONFLICT (clasificacion_id) DO NOTHING',
                [estacionId, clasif.id]
            );
        }
    } catch (error) {
        console.error("Error al sincronizar estaciones de cocina:", error.message);
    }
};

// 🏭 FASE 5: Producción en vivo por Estación (cuenta unidades activas en TODOS los
// pedidos Pendiente/Preparando, cruzadas contra la capacidad configurada de cada estación).
exports.obtenerProduccionEnVivo = async (req, res) => {
    try {
        // Self-healing: garantiza que toda clasificación tenga Estación antes de calcular
        await exports.sincronizarEstacionesFaltantes();

        const mapaEstacionesRes = await db.query(`
            SELECT c.nombre as clasificacion_nombre, e.id as estacion_id, e.nombre as estacion_nombre,
                   e.capacidad_maxima_paralela, e.ventana_minutos
            FROM estacion_clasificacion ec
            JOIN estaciones_cocina e ON ec.estacion_id = e.id
            JOIN clasificaciones c ON ec.clasificacion_id = c.id
            WHERE e.activo = true
        `);

        // Cuenta unidades activas (Pendiente/Preparando) por clasificación, leyendo
        // directamente el carrito JSONB de los pedidos — sin tocar ninguna tabla ajena.
        const conteoRes = await db.query(`
            SELECT obj->>'categoria' as categoria, SUM(COALESCE((obj->>'cantidad')::int, 1)) as total
            FROM pedidos p, jsonb_array_elements(p.carrito) obj
            WHERE p.estado_preparacion IN ('Pendiente', 'Preparando')
              AND COALESCE(obj->>'estado', 'Pendiente') NOT IN ('Listo', 'Finalizado')
            GROUP BY categoria
        `);

        const conteoPorClasificacion = {};
        conteoRes.rows.forEach(r => { conteoPorClasificacion[r.categoria] = Number(r.total) || 0; });

        const resultado = {};
        mapaEstacionesRes.rows.forEach(row => {
            resultado[row.clasificacion_nombre] = {
                estacion_id: row.estacion_id,
                estacion_nombre: row.estacion_nombre,
                capacidad_maxima_paralela: row.capacidad_maxima_paralela,
                ventana_minutos: row.ventana_minutos,
                unidades_en_cola: conteoPorClasificacion[row.clasificacion_nombre] || 0
            };
        });

        res.json(resultado);
    } catch (error) {
        console.error("Error al obtener producción en vivo:", error);
        res.status(500).json({ error: 'Error al obtener producción en vivo' });
    }
};

// 🏭 FASE 4: CRUD de Estaciones de Cocina (gestión manual desde el Admin)
exports.obtenerEstaciones = async (req, res) => {
    try {
        // Self-healing: garantiza que ninguna clasificación quede huérfana antes de listar
        await exports.sincronizarEstacionesFaltantes();

        const estacionesRes = await db.query('SELECT * FROM estaciones_cocina WHERE activo = true ORDER BY id ASC');
        const relacionesRes = await db.query(`
            SELECT ec.estacion_id, c.id as clasificacion_id, c.nombre as clasificacion_nombre
            FROM estacion_clasificacion ec
            JOIN clasificaciones c ON ec.clasificacion_id = c.id
        `);

        const estaciones = estacionesRes.rows.map(e => ({
            ...e,
            clasificaciones: relacionesRes.rows
                .filter(r => r.estacion_id === e.id)
                .map(r => ({ id: r.clasificacion_id, nombre: r.clasificacion_nombre }))
        }));

        res.json(estaciones);
    } catch (error) {
        console.error("Error al obtener estaciones:", error);
        res.status(500).json({ error: 'Error al obtener estaciones de cocina' });
    }
};

exports.crearEstacion = async (req, res) => {
    const { nombre, capacidad_maxima_paralela, ventana_minutos } = req.body;
    if (!nombre || String(nombre).trim() === '') return res.status(400).json({ error: 'El nombre es obligatorio' });

    try {
        const result = await db.query(
            `INSERT INTO estaciones_cocina (nombre, capacidad_maxima_paralela, ventana_minutos, es_automatica)
             VALUES ($1, $2, $3, false) RETURNING *`,
            [nombre.trim(), Number(capacidad_maxima_paralela) || 5, Number(ventana_minutos) || 15]
        );
        const io = req.app.get('io');
        if (io) io.emit('cocina_estaciones_actualizadas');
        res.json(result.rows[0]);
    } catch (error) {
        console.error("Error al crear estación:", error);
        res.status(500).json({ error: 'Error al crear estación' });
    }
};

exports.actualizarEstacion = async (req, res) => {
    const { id } = req.params;
    const { nombre, capacidad_maxima_paralela, ventana_minutos } = req.body;
    try {
        const result = await db.query(
            `UPDATE estaciones_cocina SET
                nombre = COALESCE($1, nombre),
                capacidad_maxima_paralela = COALESCE($2, capacidad_maxima_paralela),
                ventana_minutos = COALESCE($3, ventana_minutos),
                es_automatica = false
             WHERE id = $4 RETURNING *`,
            [nombre, capacidad_maxima_paralela, ventana_minutos, id]
        );
        if (result.rows.length === 0) return res.status(404).json({ error: 'Estación no encontrada' });
        const io = req.app.get('io');
        if (io) io.emit('cocina_estaciones_actualizadas');
        res.json(result.rows[0]);
    } catch (error) {
        console.error("Error al actualizar estación:", error);
        res.status(500).json({ error: 'Error al actualizar estación' });
    }
};

exports.eliminarEstacion = async (req, res) => {
    const { id } = req.params;
    try {
        // ON DELETE CASCADE ya definido en estacion_clasificacion libera las clasificaciones,
        // que recibirán una estación automática nueva en la próxima sincronización.
        await db.query('DELETE FROM estaciones_cocina WHERE id = $1', [id]);
        const io = req.app.get('io');
        if (io) io.emit('cocina_estaciones_actualizadas');
        res.json({ success: true });
    } catch (error) {
        console.error("Error al eliminar estación:", error);
        res.status(500).json({ error: 'Error al eliminar estación' });
    }
};

exports.asignarClasificacion = async (req, res) => {
    const { id } = req.params; // estacion_id destino
    const { clasificacion_id } = req.body;
    if (!clasificacion_id) return res.status(400).json({ error: 'clasificacion_id es obligatorio' });

    try {
        // Al ser clasificacion_id UNIQUE, esto mueve la clasificación de su estación
        // anterior (si tenía una) hacia la nueva, sin dejar registros duplicados.
        await db.query(
            `INSERT INTO estacion_clasificacion (estacion_id, clasificacion_id)
             VALUES ($1, $2)
             ON CONFLICT (clasificacion_id) DO UPDATE SET estacion_id = EXCLUDED.estacion_id`,
            [id, clasificacion_id]
        );
        const io = req.app.get('io');
        if (io) io.emit('cocina_estaciones_actualizadas');
        res.json({ success: true });
    } catch (error) {
        console.error("Error al asignar clasificación:", error);
        res.status(500).json({ error: 'Error al asignar clasificación a la estación' });
    }
};