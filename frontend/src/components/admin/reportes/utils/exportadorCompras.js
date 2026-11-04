import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { apiFetch } from '../../../../utils/apiFetch';

// ==========================================
// 💡 HELPERS (idénticos al resto de exportadores, para mantener consistencia visual)
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

const ETIQUETAS_PERIODO_COMPRAS = { dia: 'Por Día', semana: 'Por Semana', mes: 'Por Mes', anio: 'Por Año' };

// ==========================================
// 📄 EXPORTAR PDF — Historial de Compras de Insumos
// ==========================================
export const generarPDFCompras = async ({ apiUrl, filtroPeriodo, fechaFiltro, compras, totalGasto, formaterMoneda }) => {
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'letter' });
    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 12;
    let cursorY = margin;

    const colorPrimario = [5, 150, 105];   // emerald-600, tono del módulo
    const colorTextoGris = [100, 116, 139];
    const colorTextoOscuro = [30, 41, 59];
    const colorMorado = [147, 51, 234];

    // ==========================================
    // 1. ENCABEZADO
    // ==========================================
    let logoBase64 = null;
    let nombreNegocio = 'Historial de Compras';
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
    doc.text('Reporte de Compras de Insumos', textX, cursorY + 13);

    doc.setFontSize(8);
    doc.setTextColor(...colorTextoGris);
    doc.text(`Periodo: ${ETIQUETAS_PERIODO_COMPRAS[filtroPeriodo] || filtroPeriodo}`, pageWidth - margin, cursorY + 2, { align: 'right' });
    doc.text(`Fecha de referencia: ${fechaFiltro}`, pageWidth - margin, cursorY + 7, { align: 'right' });
    doc.text(`Generado: ${formatearFechaLegible()}`, pageWidth - margin, cursorY + 12, { align: 'right' });

    cursorY += 22;
    doc.setDrawColor(...colorPrimario);
    doc.setLineWidth(0.6);
    doc.line(margin, cursorY, pageWidth - margin, cursorY);
    cursorY += 8;

    // ==========================================
    // 2. TARJETAS DE RESUMEN
    // ==========================================
    const totalCompras = compras.length;
    const totalPaquetes = compras.reduce((s, c) => s + (Number(c.paquetes) || 0), 0);
    const comprasCaja = compras.filter(c => c.origen === 'Caja').length;
    const comprasOtras = totalCompras - comprasCaja;

    const tarjetas = [
        { label: 'Compras Registradas', valor: String(totalCompras), color: colorTextoOscuro },
        { label: 'Paquetes Totales', valor: String(totalPaquetes), color: colorTextoOscuro },
        { label: 'Origen Caja / Otro', valor: `${comprasCaja} / ${comprasOtras}`, color: colorMorado },
        { label: 'Gasto Total Invertido', valor: formaterMoneda(totalGasto), color: colorPrimario }
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
    // 3. TABLA DE COMPRAS
    // ==========================================
    const filas = compras.map(c => [
        new Date(c.fecha_compra).toLocaleString('es-MX', { dateStyle: 'short', timeStyle: 'short' }),
        c.insumo_nombre,
        c.origen,
        String(c.paquetes),
        formaterMoneda(c.costo_unitario),
        formaterMoneda(c.costo_total)
    ]);

    autoTable(doc, {
        startY: cursorY,
        margin: { left: margin, right: margin },
        head: [['Fecha y Hora', 'Insumo Comprado', 'Origen', 'Cant. Paquetes', 'Costo Fijo', 'Total Pagado']],
        body: filas,
        foot: [['', '', '', '', 'Gasto Total Invertido:', formaterMoneda(totalGasto)]],
        theme: 'striped',
        headStyles: { fillColor: colorPrimario, textColor: 255, fontStyle: 'bold', fontSize: 8 },
        footStyles: { fillColor: colorTextoOscuro, textColor: 255, fontStyle: 'bold', fontSize: 8 },
        bodyStyles: { fontSize: 7.5, textColor: colorTextoOscuro },
        alternateRowStyles: { fillColor: [248, 250, 252] },
        columnStyles: {
            2: { halign: 'center' }, 3: { halign: 'center' },
            4: { halign: 'right' }, 5: { halign: 'right', fontStyle: 'bold' }
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

    const nombreArchivo = `Reporte_Compras_${filtroPeriodo}_${fechaFiltro}.pdf`;
    doc.save(nombreArchivo);
};

// ==========================================
// 📊 EXPORTAR CSV — Historial de Compras de Insumos
// ==========================================
export const generarCSVCompras = ({ filtroPeriodo, fechaFiltro, compras, totalGasto }) => {
    const escaparCSV = (valor) => {
        const texto = String(valor ?? '');
        if (texto.includes(',') || texto.includes('"') || texto.includes('\n')) {
            return `"${texto.replace(/"/g, '""')}"`;
        }
        return texto;
    };

    const encabezados = ['Fecha y Hora', 'Insumo Comprado', 'Origen', 'Cant. Paquetes', 'Costo Unitario', 'Total Pagado'];

    const filas = compras.map(c => [
        new Date(c.fecha_compra).toLocaleString('es-MX', { dateStyle: 'short', timeStyle: 'short' }),
        escaparCSV(c.insumo_nombre),
        escaparCSV(c.origen),
        c.paquetes,
        Number(c.costo_unitario).toFixed(2),
        Number(c.costo_total).toFixed(2)
    ]);

    filas.push([]);
    filas.push(['', '', '', '', 'GASTO TOTAL INVERTIDO:', Number(totalGasto).toFixed(2)]);

    // 👇 BOM al inicio para que Excel reconozca acentos/ñ correctamente
    const contenidoCSV = '\uFEFF' + [encabezados, ...filas].map(fila => fila.join(',')).join('\n');

    const blob = new Blob([contenidoCSV], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Reporte_Compras_${filtroPeriodo}_${fechaFiltro}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
};