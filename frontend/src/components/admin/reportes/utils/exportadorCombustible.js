import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { apiFetch } from '../../../../utils/apiFetch';

// ==========================================
// 💡 HELPERS (idénticos a exportadorReportes.js, para mantener consistencia visual)
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

const ETIQUETAS_PERIODO_COMBUSTIBLE = { dia: 'Por Día', semana: 'Por Semana', mes: 'Por Mes', anio: 'Por Año' };

// ==========================================
// 📄 EXPORTAR PDF — Rendimiento Logístico / Combustible
// ==========================================
export const generarPDFCombustible = async ({
    apiUrl, periodoFiltro, fechaFiltro, vistaTabla,
    totales, resumenPorConductor, viajesFiltrados,
    precioLitroGlobal, formaterMoneda
}) => {
    const esDetallado = vistaTabla === 'detallado';
    const doc = new jsPDF({ orientation: esDetallado ? 'landscape' : 'portrait', unit: 'mm', format: 'letter' });
    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 12;
    let cursorY = margin;

    const colorPrimario = [217, 119, 6];   // amber-600, tono del módulo
    const colorTextoGris = [100, 116, 139];
    const colorTextoOscuro = [30, 41, 59];
    const colorRojo = [239, 68, 68];

    // ==========================================
    // 1. ENCABEZADO
    // ==========================================
    let logoBase64 = null;
    let nombreNegocio = 'Rendimiento Logístico';
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
    doc.text('Reporte de Rendimiento Logístico y Combustible', textX, cursorY + 13);

    doc.setFontSize(8);
    doc.setTextColor(...colorTextoGris);
    doc.text(`Periodo: ${ETIQUETAS_PERIODO_COMBUSTIBLE[periodoFiltro] || periodoFiltro}`, pageWidth - margin, cursorY + 2, { align: 'right' });
    doc.text(`Fecha de referencia: ${fechaFiltro}`, pageWidth - margin, cursorY + 7, { align: 'right' });
    doc.text(`Vista: ${esDetallado ? 'Desglose por Viaje' : 'Agrupado por Conductor'}`, pageWidth - margin, cursorY + 12, { align: 'right' });
    doc.text(`Generado: ${formatearFechaLegible()}`, pageWidth - margin, cursorY + 17, { align: 'right' });

    cursorY += 24;
    doc.setDrawColor(...colorPrimario);
    doc.setLineWidth(0.6);
    doc.line(margin, cursorY, pageWidth - margin, cursorY);
    cursorY += 8;

    // ==========================================
    // 2. TARJETAS DE MÉTRICAS GLOBALES
    // ==========================================
    const tarjetas = [
        { label: 'Viajes Realizados', valor: String(totales.viajes), color: colorTextoOscuro },
        { label: 'Distancia Total Estimada', valor: `${totales.km_estimados} km`, color: colorTextoOscuro },
        { label: 'Precio Gasolina ($/L)', valor: formaterMoneda(precioLitroGlobal), color: colorTextoOscuro },
        { label: 'Gasto en Combustible', valor: formaterMoneda(totales.gasto_estimado), color: colorRojo }
    ];
    const anchoTarjeta = (pageWidth - margin * 2 - 3 * 3) / 4;
    tarjetas.forEach((t, idx) => {
        const x = margin + idx * (anchoTarjeta + 3);
        doc.setDrawColor(226, 232, 240);
        doc.setFillColor(248, 250, 252);
        doc.roundedRect(x, cursorY, anchoTarjeta, 18, 2, 2, 'FD');

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(6.5);
        doc.setTextColor(...colorTextoGris);
        doc.text(t.label.toUpperCase(), x + anchoTarjeta / 2, cursorY + 6, { align: 'center' });

        doc.setFontSize(10.5);
        doc.setTextColor(...t.color);
        doc.text(t.valor, x + anchoTarjeta / 2, cursorY + 13, { align: 'center' });
    });
    cursorY += 26;

    // ==========================================
    // 3. TABLA (según la vista activa: Resumen por Conductor o Detallado por Viaje)
    // ==========================================
    if (!esDetallado) {
        const filas = resumenPorConductor.map(rep => [
            rep.nombre,
            rep.vehiculo || 'No asignado',
            String(rep.viajes),
            `${rep.kmTotales.toFixed(1)} km`,
            formaterMoneda(rep.gastoTotal)
        ]);
        const totalViajes = resumenPorConductor.reduce((s, r) => s + r.viajes, 0);
        const totalKm = resumenPorConductor.reduce((s, r) => s + r.kmTotales, 0);
        const totalGasto = resumenPorConductor.reduce((s, r) => s + r.gastoTotal, 0);

        autoTable(doc, {
            startY: cursorY,
            margin: { left: margin, right: margin },
            head: [['Conductor', 'Vehículo', 'Viajes', 'Km Totales', 'Gasto Combustible']],
            body: filas,
            foot: [['TOTALES', '', String(totalViajes), `${totalKm.toFixed(1)} km`, formaterMoneda(totalGasto)]],
            theme: 'striped',
            headStyles: { fillColor: colorPrimario, textColor: 255, fontStyle: 'bold', fontSize: 8 },
            footStyles: { fillColor: colorTextoOscuro, textColor: 255, fontStyle: 'bold', fontSize: 8 },
            bodyStyles: { fontSize: 7.5, textColor: colorTextoOscuro },
            alternateRowStyles: { fillColor: [248, 250, 252] },
            columnStyles: { 2: { halign: 'center' }, 3: { halign: 'center' }, 4: { halign: 'right', fontStyle: 'bold' } },
            didDrawPage: () => dibujarFooter(doc, nombreNegocio, pageWidth, colorTextoGris)
        });
    } else {
        const filas = viajesFiltrados.map(v => [
            v.repartidor_nombre,
            String(v.numero_pedido),
            v.dirLimpia,
            `${v.kmRuta.toFixed(1)} km${!v.distancia_km ? ' (Est.)' : ''}`,
            v.tiempoMinutos > 0 ? `${v.tiempoMinutos} min` : '--',
            formaterMoneda(v.gastoEstimado)
        ]);

        autoTable(doc, {
            startY: cursorY,
            margin: { left: margin, right: margin },
            head: [['Conductor', 'Orden #', 'Destino / Ruta', 'Distancia', 'Duración', 'Gasto Estimado']],
            body: filas,
            foot: [['TOTALES', '', '', `${totales.km_estimados} km`, '', formaterMoneda(totales.gasto_estimado)]],
            theme: 'striped',
            headStyles: { fillColor: colorPrimario, textColor: 255, fontStyle: 'bold', fontSize: 8 },
            footStyles: { fillColor: colorTextoOscuro, textColor: 255, fontStyle: 'bold', fontSize: 8 },
            bodyStyles: { fontSize: 7.5, textColor: colorTextoOscuro },
            alternateRowStyles: { fillColor: [248, 250, 252] },
            columnStyles: { 1: { halign: 'center' }, 3: { halign: 'center' }, 4: { halign: 'center' }, 5: { halign: 'right', fontStyle: 'bold' } },
            didDrawPage: () => dibujarFooter(doc, nombreNegocio, pageWidth, colorTextoGris)
        });
    }

    const nombreArchivo = `Reporte_Combustible_${periodoFiltro}_${fechaFiltro}.pdf`;
    doc.save(nombreArchivo);
};

// Pie de página reutilizado en ambas tablas
function dibujarFooter(doc, nombreNegocio, pageWidth, colorTextoGris) {
    const pageCount = doc.internal.getNumberOfPages();
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(...colorTextoGris);
    doc.text(
        `Página ${doc.internal.getCurrentPageInfo().pageNumber} de ${pageCount}`,
        pageWidth - 12, doc.internal.pageSize.getHeight() - 6, { align: 'right' }
    );
    doc.text(`${nombreNegocio} · Documento generado automáticamente por el sistema POS`, 12, doc.internal.pageSize.getHeight() - 6);
}

// ==========================================
// 📊 EXPORTAR CSV — respeta la misma vista activa que el PDF
// ==========================================
export const generarCSVCombustible = ({ periodoFiltro, fechaFiltro, vistaTabla, resumenPorConductor, viajesFiltrados, formaterMoneda }) => {
    const esDetallado = vistaTabla === 'detallado';

    const escaparCSV = (valor) => {
        const texto = String(valor ?? '');
        if (texto.includes(',') || texto.includes('"') || texto.includes('\n')) {
            return `"${texto.replace(/"/g, '""')}"`;
        }
        return texto;
    };

    let filas = [];

    if (!esDetallado) {
        filas.push(['Conductor', 'Vehículo', 'Viajes', 'Km Totales', 'Gasto Combustible']);
        resumenPorConductor.forEach(rep => {
            filas.push([
                escaparCSV(rep.nombre),
                escaparCSV(rep.vehiculo || 'No asignado'),
                rep.viajes,
                rep.kmTotales.toFixed(1),
                Number(rep.gastoTotal).toFixed(2)
            ]);
        });
    } else {
        filas.push(['Conductor', 'Orden #', 'Destino / Ruta', 'Distancia (km)', 'Duración (min)', 'Gasto Estimado']);
        viajesFiltrados.forEach(v => {
            filas.push([
                escaparCSV(v.repartidor_nombre),
                v.numero_pedido,
                escaparCSV(v.dirLimpia),
                v.kmRuta.toFixed(1),
                v.tiempoMinutos || 0,
                Number(v.gastoEstimado).toFixed(2)
            ]);
        });
    }

    // 👇 BOM al inicio para que Excel reconozca acentos/ñ correctamente
    const contenidoCSV = '\uFEFF' + filas.map(fila => fila.join(',')).join('\n');

    const blob = new Blob([contenidoCSV], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Reporte_Combustible_${periodoFiltro}_${fechaFiltro}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
};