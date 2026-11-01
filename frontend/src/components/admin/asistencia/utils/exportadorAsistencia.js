import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { apiFetch } from '../../../../utils/apiFetch';

// ==========================================
// 💡 HELPER: Resuelve URLs de Cloudinary o relativas del backend.
// 🔒 COPIADO intencionalmente desde exportadorReportes.js (no importado) para
// mantener este módulo 100% autocontenido y no arriesgar romper Finanzas
// si en el futuro se modifica ese archivo compartido.
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

// ==========================================
// 💡 HELPER: Convierte una imagen remota a Base64 para incrustarla en el PDF.
// 🔒 COPIADO intencionalmente (ver nota arriba).
// ==========================================
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

const ETIQUETAS_PERIODO = {
  dia: 'Día de Hoy', semana: 'Esta Semana',
  mes: 'Este Mes', anio: 'Este Año', rango: 'Rango Personalizado'
};

const formatFechaCelda = (str) => str ? new Date(str).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' }) : '---';
const formatHoraCelda = (str) => str ? new Date(str).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit', hour12: true }) : 'En turno...';

// ==========================================
// 📄 EXPORTAR PDF PROFESIONAL — Reporte de Asistencia
// ==========================================
export const generarPDFReporteAsistencia = async ({ asistencias, filtros, apiUrl, metricas }) => {
  if (!asistencias) return;

  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'letter' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 12;
  let cursorY = margin;

  // 👇 Misma paleta de marca usada en exportadorReportes.js, para consistencia visual
  const colorPrimario = [37, 99, 235];    // blue-600
  const colorTextoGris = [100, 116, 139]; // slate-500
  const colorTextoOscuro = [30, 41, 59];  // slate-800
  const colorVerde = [16, 185, 129];      // emerald-500
  const colorAmbar = [217, 119, 6];       // amber-600

  // ==========================================
  // 1. ENCABEZADO (Logo + Nombre del negocio + Título)
  // ==========================================
  let logoBase64 = null;
  let nombreNegocio = 'Reporte de Asistencia';
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
    try {
      doc.addImage(logoBase64, 'WEBP', margin, cursorY, 22, 22);
    } catch (e) {
      try { doc.addImage(logoBase64, 'JPEG', margin, cursorY, 22, 22); } catch (e2) {}
    }
  }

  const textX = logoBase64 ? margin + 28 : margin;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.setTextColor(...colorTextoOscuro);
  doc.text(nombreNegocio, textX, cursorY + 8);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(...colorPrimario);
  doc.text('Reporte de Asistencia de Empleados', textX, cursorY + 15);

  // Metadatos a la derecha
  doc.setFontSize(8.5);
  doc.setTextColor(...colorTextoGris);
  const periodoTexto = ETIQUETAS_PERIODO[filtros.periodoFiltro] || filtros.periodoFiltro;
  const rangoTexto = filtros.periodoFiltro === 'rango'
    ? `${filtros.fechaInicio} al ${filtros.fechaFin}`
    : `Fecha de referencia: ${filtros.fechaInicio}`;
  doc.text(`Periodo: ${periodoTexto}`, pageWidth - margin, cursorY + 2, { align: 'right' });
  doc.text(rangoTexto, pageWidth - margin, cursorY + 7, { align: 'right' });
  doc.text(`Generado: ${formatearFechaLegible()}`, pageWidth - margin, cursorY + 12, { align: 'right' });

  cursorY += 26;
  doc.setDrawColor(...colorPrimario);
  doc.setLineWidth(0.6);
  doc.line(margin, cursorY, pageWidth - margin, cursorY);
  cursorY += 8;

  // ==========================================
  // 2. TARJETAS DE RESUMEN (KPIs)
  // ==========================================
  const tarjetas = [
    { label: 'Checadas', valor: metricas?.totalRegistros || 0, color: colorTextoOscuro, esEntero: true },
    { label: 'Horas Acumuladas', valor: `${metricas?.totalHoras || '0.0'} hrs`, color: colorVerde },
    { label: 'Turnos Activos', valor: metricas?.turnosActivos || 0, color: colorAmbar, esEntero: true },
    { label: 'Promedio / Turno', valor: `${metricas?.promedioHoras || '0.0'} hrs`, color: colorPrimario }
  ];

  const anchoTarjeta = (pageWidth - margin * 2 - 5 * 3) / 4;
  tarjetas.forEach((t, idx) => {
    const x = margin + idx * (anchoTarjeta + 5);
    doc.setDrawColor(226, 232, 240);
    doc.setFillColor(248, 250, 252);
    doc.roundedRect(x, cursorY, anchoTarjeta, 20, 2, 2, 'FD');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7);
    doc.setTextColor(...colorTextoGris);
    doc.text(t.label.toUpperCase(), x + anchoTarjeta / 2, cursorY + 6, { align: 'center' });

    doc.setFontSize(11);
    doc.setTextColor(...t.color);
    const valorTexto = t.esEntero ? String(t.valor) : t.valor;
    doc.text(valorTexto, x + anchoTarjeta / 2, cursorY + 14, { align: 'center' });
  });

  cursorY += 28;

  // ==========================================
  // 3. TABLA DE CHECADAS (autoTable con paginación profesional)
  // ==========================================
  const filasTabla = asistencias.map(a => [
    a.nombre || '---',
    a.rol || '---',
    formatFechaCelda(a.fecha),
    formatHoraCelda(a.hora_entrada),
    !a.hora_salida ? 'En Turno' : (a.cierre_automatico ? `${formatHoraCelda(a.hora_salida)} (Auto)` : formatHoraCelda(a.hora_salida)),
    a.horas_trabajadas ? `${a.horas_trabajadas} hrs` : (!a.hora_salida ? 'Calculando...' : '0 hrs')
  ]);

  autoTable(doc, {
    startY: cursorY,
    margin: { left: margin, right: margin },
    head: [['Empleado', 'Rol', 'Fecha', 'Entrada', 'Salida', 'Horas Trab.']],
    body: filasTabla,
    theme: 'striped',
    headStyles: { fillColor: colorPrimario, textColor: 255, fontStyle: 'bold', fontSize: 8 },
    bodyStyles: { fontSize: 7.5, textColor: colorTextoOscuro },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    columnStyles: {
      3: { halign: 'center' }, 4: { halign: 'center' }, 5: { halign: 'right', fontStyle: 'bold' }
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

  const nombreArchivo = `Reporte_Asistencia_${filtros.periodoFiltro}_${filtros.fechaInicio}.pdf`;
  doc.save(nombreArchivo);
};

// ==========================================
// 📊 EXPORTAR CSV — Reporte de Asistencia
// ==========================================
export const generarCSVReporteAsistencia = (asistencias) => {
  if (!asistencias || asistencias.length === 0) return;

  const escaparCSV = (valor) => {
    const texto = String(valor ?? '');
    if (texto.includes(',') || texto.includes('"') || texto.includes('\n')) {
      return `"${texto.replace(/"/g, '""')}"`;
    }
    return texto;
  };

  const encabezados = ['Empleado', 'Rol', 'Fecha', 'Hora Entrada', 'Hora Salida', 'Cierre Automático', 'Horas Trabajadas'];

  const filas = asistencias.map(a => [
    escaparCSV(a.nombre),
    escaparCSV(a.rol),
    formatFechaCelda(a.fecha),
    formatHoraCelda(a.hora_entrada),
    !a.hora_salida ? 'En Turno' : formatHoraCelda(a.hora_salida),
    a.cierre_automatico ? 'Sí' : 'No',
    a.horas_trabajadas ? Number(a.horas_trabajadas).toFixed(2) : '0.00'
  ]);

  // 👇 BOM al inicio para que Excel reconozca acentos/ñ correctamente
  const contenidoCSV = '\uFEFF' + [encabezados, ...filas].map(fila => fila.join(',')).join('\n');

  const blob = new Blob([contenidoCSV], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  const fecha = new Date().toISOString().split('T')[0];
  link.href = url;
  link.setAttribute('download', `Reporte_Asistencia_${fecha}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};