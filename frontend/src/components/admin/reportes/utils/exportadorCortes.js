import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { apiFetch } from '../../../../utils/apiFetch';

// ==========================================
// 💡 HELPERS (idénticos a exportadorReportes.js, para mantener consistencia
// visual entre los PDFs de Ventas y Cortes)
// ==========================================
const resolverUrlImagen = (url, apiUrl) => {
    if (!url) return '';
    const baseUrl = apiUrl.replace('/api', '');
    const strUrl = String(url).trim();

    if (strUrl.includes('cloudinary.com')) {
        const match = strUrl.match(/res\.cloudinary\.com\/(.+)/);
        if (match && match[1]) return `https://res.cloudinary.com/${match[1]}`;
    }
    const lastHttp = strUrl.lastIndexOf('http');
    if (lastHttp > 0) return strUrl.substring(lastHttp);
    if (strUrl.startsWith('http')) return strUrl;
    return `${baseUrl}${strUrl.startsWith('/') ? '' : '/'}${strUrl}`;
};

const cargarImagenBase64 = (url) => {
    return new Promise((resolve) => {
        if (!url) return resolve(null);
        apiFetch(url)
            .then(res => res.blob())
            .then(blob => {
                const reader = new FileReader();
                reader.onloadend = () => resolve(reader.result);
                reader.onerror = () => resolve(null);
                reader.readAsDataURL(blob);
            })
            .catch(() => resolve(null));
    });
};

const formatearFechaLegible = () => {
    const ahora = new Date();
    return ahora.toLocaleString('es-MX', { dateStyle: 'long', timeStyle: 'short' });
};

const ETIQUETAS_PERIODO_CORTE = { dia: 'Por Día', mes: 'Por Mes', anio: 'Por Año' };

// ==========================================
// 📄 EXPORTAR PDF — Auditoría de Corte (Global + cada Caja/Turno)
// ==========================================
export const generarPDFCorte = async ({ apiUrl, fechaFiltro, periodo, formaterMoneda, datosGlobales, desglosePorTurno }) => {
    const d = datosGlobales;
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'letter' });
    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 12;
    let cursorY = margin;

    // Colores de marca (consistentes con exportadorReportes.js)
    const colorPrimario = [37, 99, 235];
    const colorTextoGris = [100, 116, 139];
    const colorTextoOscuro = [30, 41, 59];
    const colorVerde = [16, 185, 129];
    const colorRojo = [239, 68, 68];
    const colorNaranja = [249, 115, 22];
    const colorIndigo = [79, 70, 229];
    const colorAzulDigital = [37, 99, 235];

    // ==========================================
    // 1. ENCABEZADO
    // ==========================================
    let logoBase64 = null;
    let nombreNegocio = 'Auditoría de Caja';
    try {
        const confRes = await apiFetch(`${apiUrl}/configuracion`);
        const confData = await confRes.json();
        nombreNegocio = confData?.nombre_negocio || nombreNegocio;
        if (confData?.logo_url) {
            const urlResuelta = resolverUrlImagen(confData.logo_url, apiUrl);
            logoBase64 = await cargarImagenBase64(urlResuelta);
        }
    } catch (e) { /* Si falla la config, el PDF se genera igual sin logo */ }

    if (logoBase64) {
        try { doc.addImage(logoBase64, 'WEBP', margin, cursorY, 20, 20); }
        catch (e) { try { doc.addImage(logoBase64, 'JPEG', margin, cursorY, 20, 20); } catch (e2) { } }
    }

    const textX = logoBase64 ? margin + 25 : margin;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(15);
    doc.setTextColor(...colorTextoOscuro);
    doc.text(nombreNegocio, textX, cursorY + 7);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9.5);
    doc.setTextColor(...colorPrimario);
    doc.text('Auditoría Financiera de Caja', textX, cursorY + 13);

    doc.setFontSize(8);
    doc.setTextColor(...colorTextoGris);
    doc.text(`Periodo: ${ETIQUETAS_PERIODO_CORTE[periodo] || periodo}`, pageWidth - margin, cursorY + 2, { align: 'right' });
    doc.text(`Fecha de referencia: ${fechaFiltro}`, pageWidth - margin, cursorY + 7, { align: 'right' });
    doc.text(`Generado: ${formatearFechaLegible()}`, pageWidth - margin, cursorY + 12, { align: 'right' });

    cursorY += 24;
    doc.setDrawColor(...colorPrimario);
    doc.setLineWidth(0.6);
    doc.line(margin, cursorY, pageWidth - margin, cursorY);
    cursorY += 7;

    // ==========================================
    // Helper interno: dibuja una fila de tarjetas
    // ==========================================
    const dibujarTarjetas = (tarjetas, alturaCaja = 18) => {
        const gap = 3;
        const ancho = (pageWidth - margin * 2 - gap * (tarjetas.length - 1)) / tarjetas.length;
        tarjetas.forEach((t, idx) => {
            const x = margin + idx * (ancho + gap);
            doc.setDrawColor(226, 232, 240);
            doc.setFillColor(248, 250, 252);
            doc.roundedRect(x, cursorY, ancho, alturaCaja, 2, 2, 'FD');

            doc.setFont('helvetica', 'bold');
            doc.setFontSize(6);
            doc.setTextColor(...colorTextoGris);
            doc.text(t.label.toUpperCase(), x + ancho / 2, cursorY + 6, { align: 'center' });

            doc.setFontSize(9.5);
            doc.setTextColor(...t.color);
            doc.text(formaterMoneda(t.valor), x + ancho / 2, cursorY + 13, { align: 'center' });
        });
        cursorY += alturaCaja + 6;
    };

    // ==========================================
    // 2. SECCIÓN GLOBAL — 1. CAJA PRINCIPAL
    // ==========================================
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(...colorTextoOscuro);
    doc.text('1. Caja Principal (Mostrador) — Día Completo', margin, cursorY);
    cursorY += 6;

    dibujarTarjetas([
        { label: 'Ventas Brutas', valor: d.totalVentasBrutas, color: colorTextoOscuro },
        { label: 'Descuentos', valor: -(d.tDescuentos || 0), color: colorNaranja },
        { label: 'Fondo Inicial', valor: d.totalFondoGlobal, color: colorTextoOscuro },
        { label: 'Ingresos Efectivo', valor: d.totalEfectivoDia, color: colorVerde },
        { label: 'Gastos (Compras)', valor: -(d.gastosCompras || 0), color: colorRojo }
    ]);

    const colorDif = d.isPerfecto ? colorPrimario : d.isFaltante ? colorRojo : colorVerde;
    const labelDif = d.isPerfecto ? 'Cuadre Perfecto' : d.isFaltante ? 'Faltante en Caja' : 'Sobrante a Favor';
    dibujarTarjetas([
        { label: 'Efectivo Esperado', valor: d.efectivoEsperadoCaja, color: colorTextoOscuro },
        { label: 'Efectivo Declarado', valor: d.efectivoDeclaradoCaja, color: colorPrimario },
        { label: labelDif, valor: Math.abs(d.diferenciaAuditoria), color: colorDif }
    ], 20);

    // ==========================================
    // 3. SECCIÓN GLOBAL — 2. REPARTIDORES (MOTOS)
    // ==========================================
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(...colorTextoOscuro);
    doc.text('2. Repartidores (Motos)', margin, cursorY);
    cursorY += 6;

    dibujarTarjetas([
        { label: 'Ventas (Domicilio)', valor: d.dPlatillos + d.dExtras, color: colorIndigo },
        { label: 'Envíos', valor: d.dEnvio, color: colorIndigo },
        { label: 'Fondo Repartidores', valor: d.fondoRepartidor, color: colorIndigo },
        { label: 'Efectivo', valor: d.dEfectivo, color: colorVerde },
        { label: 'Tarjeta', valor: d.dTarjeta, color: colorPrimario },
        { label: 'Transf.', valor: d.dTransf, color: [147, 51, 234] }
    ]);

    dibujarTarjetas([
        { label: 'Efectivo a Entregar por Motos', valor: d.efectivoEsperadoMotos, color: colorIndigo }
    ], 18);

    // ==========================================
    // 4. SECCIÓN GLOBAL — PAGOS DIGITALES + INGRESO NETO REAL
    // ==========================================
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(...colorTextoOscuro);
    doc.text('3. Pagos Digitales y Rendimiento Neto', margin, cursorY);
    cursorY += 6;

    dibujarTarjetas([
        { label: 'Tarjetas', valor: d.totalTarjetas, color: colorAzulDigital },
        { label: 'Transferencias', valor: d.totalTransferencias, color: [147, 51, 234] },
        { label: 'Total Digital', valor: d.totalDigital, color: colorAzulDigital },
        { label: 'Ingresos Netos Totales', valor: d.totalIngresoNetoReal, color: colorVerde }
    ], 20);

    // ==========================================
    // 5. TABLA — DESGLOSE POR CAJA (TURNOS)
    // ==========================================
    if (desglosePorTurno && desglosePorTurno.length > 0) {
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(11);
        doc.setTextColor(...colorTextoOscuro);
        doc.text('4. Desglose por Caja / Turno', margin, cursorY);
        cursorY += 4;

        const filas = desglosePorTurno.map(t => [
            `Caja ${t.numeroTurno}: ${t.usuario}`,
            formaterMoneda(t.fondoInicial),
            formaterMoneda(t.ventasBrutas),
            t.descuentos > 0 ? `-${formaterMoneda(t.descuentos)}` : '$0.00',
            t.gastos > 0 ? `-${formaterMoneda(t.gastos)}` : '$0.00',
            formaterMoneda(t.efectivoEsperado),
            formaterMoneda(t.efectivoDeclarado),
            `${t.diferencia < 0 ? '+' : t.diferencia > 0 ? '-' : ''}${formaterMoneda(Math.abs(t.diferencia))}`
        ]);

        autoTable(doc, {
            startY: cursorY,
            margin: { left: margin, right: margin },
            head: [['Caja / Turno', 'Fondo Inicial', 'Ventas Brutas', 'Descuentos', 'Gastos', 'Efect. Esperado', 'Efect. Declarado', 'Diferencia']],
            body: filas,
            theme: 'striped',
            headStyles: { fillColor: colorPrimario, textColor: 255, fontStyle: 'bold', fontSize: 7.5 },
            bodyStyles: { fontSize: 7.5, textColor: colorTextoOscuro },
            alternateRowStyles: { fillColor: [248, 250, 252] },
            columnStyles: {
                1: { halign: 'right' }, 2: { halign: 'right' }, 3: { halign: 'right' },
                4: { halign: 'right' }, 5: { halign: 'right' }, 6: { halign: 'right' },
                7: { halign: 'right', fontStyle: 'bold' }
            },
            didDrawPage: () => {
                const pageCount = doc.internal.getNumberOfPages();
                doc.setFont('helvetica', 'normal');
                doc.setFontSize(7.5);
                doc.setTextColor(...colorTextoGris);
                doc.text(
                    `Página ${doc.internal.getCurrentPageInfo().pageNumber} de ${pageCount}`,
                    pageWidth - margin, doc.internal.pageSize.getHeight() - 6, { align: 'right' }
                );
                doc.text(`${nombreNegocio} · Documento generado automáticamente por el sistema POS`, margin, doc.internal.pageSize.getHeight() - 6);
            }
        });
    }

    const nombreArchivo = `Auditoria_Corte_${periodo}_${fechaFiltro}.pdf`;
    doc.save(nombreArchivo);
};

// ==========================================
// 📊 EXPORTAR CSV — Auditoría de Corte (Global + cada Caja/Turno)
// ==========================================
export const generarCSVCorte = ({ fechaFiltro, periodo, formaterMoneda, datosGlobales, desglosePorTurno }) => {
    const d = datosGlobales;

    const escaparCSV = (valor) => {
        const texto = String(valor ?? '');
        if (texto.includes(',') || texto.includes('"') || texto.includes('\n')) {
            return `"${texto.replace(/"/g, '""')}"`;
        }
        return texto;
    };

    const filas = [];
    filas.push(['AUDITORÍA FINANCIERA DE CAJA']);
    filas.push([`Periodo: ${ETIQUETAS_PERIODO_CORTE[periodo] || periodo}`, `Fecha de referencia: ${fechaFiltro}`]);
    filas.push([]);

    filas.push(['1. CAJA PRINCIPAL (MOSTRADOR) — DÍA COMPLETO']);
    filas.push(['Concepto', 'Monto']);
    filas.push(['Ventas Brutas', Number(d.totalVentasBrutas).toFixed(2)]);
    filas.push(['Descuentos', (-Number(d.tDescuentos || 0)).toFixed(2)]);
    filas.push(['Fondo Inicial', Number(d.totalFondoGlobal).toFixed(2)]);
    filas.push(['Ingresos Efectivo', Number(d.totalEfectivoDia).toFixed(2)]);
    filas.push(['Gastos (Compras)', (-Number(d.gastosCompras || 0)).toFixed(2)]);
    filas.push(['Efectivo Esperado Físico', Number(d.efectivoEsperadoCaja).toFixed(2)]);
    filas.push(['Efectivo Declarado', Number(d.efectivoDeclaradoCaja).toFixed(2)]);
    filas.push([d.isPerfecto ? 'Cuadre Perfecto' : d.isFaltante ? 'Faltante en Caja' : 'Sobrante a Favor', Number(d.diferenciaAuditoria).toFixed(2)]);
    filas.push([]);

    filas.push(['2. REPARTIDORES (MOTOS)']);
    filas.push(['Concepto', 'Monto']);
    filas.push(['Ventas (Domicilio)', (Number(d.dPlatillos) + Number(d.dExtras)).toFixed(2)]);
    filas.push(['Envíos', Number(d.dEnvio).toFixed(2)]);
    filas.push(['Fondo Repartidores', Number(d.fondoRepartidor).toFixed(2)]);
    filas.push(['Efectivo', Number(d.dEfectivo).toFixed(2)]);
    filas.push(['Tarjeta', Number(d.dTarjeta).toFixed(2)]);
    filas.push(['Transferencia', Number(d.dTransf).toFixed(2)]);
    filas.push(['Efectivo a Entregar por Motos', Number(d.efectivoEsperadoMotos).toFixed(2)]);
    filas.push([]);

    filas.push(['3. PAGOS DIGITALES Y RENDIMIENTO NETO']);
    filas.push(['Concepto', 'Monto']);
    filas.push(['Tarjetas', Number(d.totalTarjetas).toFixed(2)]);
    filas.push(['Transferencias', Number(d.totalTransferencias).toFixed(2)]);
    filas.push(['Total Digital', Number(d.totalDigital).toFixed(2)]);
    filas.push(['Ingresos Netos Totales', Number(d.totalIngresoNetoReal).toFixed(2)]);
    filas.push([]);

    if (desglosePorTurno && desglosePorTurno.length > 0) {
        filas.push(['4. DESGLOSE POR CAJA / TURNO']);
        filas.push(['Caja / Turno', 'Fondo Inicial', 'Ventas Brutas', 'Descuentos', 'Gastos', 'Efectivo Esperado', 'Efectivo Declarado', 'Diferencia']);
        desglosePorTurno.forEach(t => {
            filas.push([
                escaparCSV(`Caja ${t.numeroTurno}: ${t.usuario}`),
                Number(t.fondoInicial).toFixed(2),
                Number(t.ventasBrutas).toFixed(2),
                Number(t.descuentos).toFixed(2),
                Number(t.gastos).toFixed(2),
                Number(t.efectivoEsperado).toFixed(2),
                Number(t.efectivoDeclarado).toFixed(2),
                Number(t.diferencia).toFixed(2)
            ]);
        });
    }

    // 👇 BOM al inicio para que Excel reconozca acentos/ñ correctamente
    const contenidoCSV = '\uFEFF' + filas.map(fila => fila.join(',')).join('\n');

    const blob = new Blob([contenidoCSV], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Auditoria_Corte_${periodo}_${fechaFiltro}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
};