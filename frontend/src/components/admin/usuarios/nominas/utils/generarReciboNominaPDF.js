import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { apiFetch } from '../../../../../utils/apiFetch';

// 👇 Helpers copiados de exportadorReportes.js (mismo patrón ya usado en Reportes)
// para evitar una ruta relativa frágil entre carpetas distintas del proyecto.
const resolverUrlImagen = (url, apiUrlBase) => {
    if (!url) return '';
    const baseUrl = apiUrlBase.replace('/api', '');
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
const formaterMoneda = (num) => new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(num || 0);

export const generarPDFReciboNomina = async (recibo, configGlobal, apiUrl) => {
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'letter' });
    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 15;
    let cursorY = margin;

    const colorPrimario = [30, 41, 59];
    const colorGris = [100, 116, 139];

    let logoBase64 = null;
    if (configGlobal?.logo_url) {
        try {
            const urlResuelta = resolverUrlImagen(configGlobal.logo_url, apiUrl);
            logoBase64 = await cargarImagenBase64(urlResuelta);
        } catch (e) {}
    }

    if (logoBase64) {
        try { doc.addImage(logoBase64, 'WEBP', pageWidth - margin - 22, cursorY, 22, 22); }
        catch (e) { try { doc.addImage(logoBase64, 'JPEG', pageWidth - margin - 22, cursorY, 22, 22); } catch (e2) {} }
    }

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(20);
    doc.setTextColor(...colorPrimario);
    doc.text('RECIBO DE NÓMINA', margin, cursorY + 8);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(...colorGris);
    doc.text('Comprobante de Pago', margin, cursorY + 14);

    cursorY += 22;
    doc.setDrawColor(...colorPrimario);
    doc.setLineWidth(0.6);
    doc.line(margin, cursorY, pageWidth - margin, cursorY);
    cursorY += 8;

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(...colorPrimario);
    doc.text(`FECHA DE EMISIÓN: ${new Date().toLocaleDateString('es-MX')}`, margin, cursorY);
    cursorY += 6;
    doc.text(`COLABORADOR: ${(recibo.nombre_completo || recibo.nombre || '').toUpperCase()}`, margin, cursorY);
    cursorY += 6;
    doc.text(`PUESTO: ${(recibo.rol || '').toUpperCase()}`, margin, cursorY);
    cursorY += 8;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9.5);
    doc.setTextColor(60, 60, 60);
    const parrafo = `Recibí de ${configGlobal?.nombre_negocio || 'la empresa'} la cantidad de ${formaterMoneda(recibo.neto)} por concepto de mi sueldo correspondiente al periodo del ${recibo.metadata?.fecha_inicio} al ${recibo.metadata?.fecha_fin} como sigue:`;
    const lineas = doc.splitTextToSize(parrafo, pageWidth - margin * 2);
    doc.text(lineas, margin, cursorY);
    cursorY += lineas.length * 5 + 6;

    const filas = [];
    [...(recibo.ingresos_base || []), ...(recibo.adicionales_ingresos || [])].forEach(ing => {
        filas.push([ing.concepto, formaterMoneda(ing.monto), '']);
    });
    [...(recibo.egresos_base || []), ...(recibo.adicionales_egresos || [])].forEach(eg => {
        filas.push([eg.concepto, '', formaterMoneda(eg.monto)]);
    });

    autoTable(doc, {
        startY: cursorY,
        margin: { left: margin, right: margin },
        head: [['Concepto Descripción', 'Ingresos', 'Egresos']],
        body: filas,
        foot: [
            ['TOTALES DESGLOSADOS', formaterMoneda(recibo.total_ingresos), formaterMoneda(recibo.total_egresos)],
            ['NETO EFECTIVO A PAGAR', formaterMoneda(recibo.neto), '']
        ],
        theme: 'grid',
        headStyles: { fillColor: colorPrimario, textColor: 255, fontStyle: 'bold', fontSize: 9 },
        footStyles: { fillColor: [241, 245, 249], textColor: colorPrimario, fontStyle: 'bold', fontSize: 9.5 },
        bodyStyles: { fontSize: 9, textColor: [51, 65, 85] },
        columnStyles: { 1: { halign: 'right' }, 2: { halign: 'right' } }
    });

    const finalY = doc.lastAutoTable.finalY + 30;
    doc.setDrawColor(150, 150, 150);
    doc.line(pageWidth - margin - 70, finalY, pageWidth - margin, finalY);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(...colorGris);
    doc.text('FIRMA DE CONFORMIDAD', pageWidth - margin - 35, finalY + 5, { align: 'center' });

    doc.save(`Recibo_Nomina_${(recibo.nombre_completo || recibo.nombre || '').replace(/\s+/g,'_')}_${recibo.metadata?.fecha_fin}.pdf`);
};