import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

// ==========================================
// 💡 HELPER: Resuelve URLs de Cloudinary o relativas del backend,
// replicando la misma lógica que ya usa Login.js para el logo [21]
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
// 💡 HELPER: Convierte una imagen remota a Base64 para poder
// incrustarla dentro del PDF (jsPDF requiere Base64, no URLs directas)
// ==========================================
const cargarImagenBase64 = (url) => {
  return new Promise((resolve) => {
    if (!url) return resolve(null);
    fetch(url)
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
  dia: 'Hoy', historico: 'Día Específico', semana: 'Esta Semana',
  mes: 'Este Mes', anio: 'Este Año', rango: 'Rango de Fechas'
};

// ==========================================
// 📄 EXPORTAR PDF PROFESIONAL
// ==========================================
export const generarPDFReporte = async ({ reporte, filtros, apiUrl, formaterMoneda }) => {
  if (!reporte) return;

  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'letter' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 12;
  let cursorY = margin;

  // 👇 COLORES DE MARCA (consistentes con la paleta del sistema)
  const colorPrimario = [37, 99, 235];   // blue-600
  const colorTextoGris = [100, 116, 139]; // slate-500
  const colorTextoOscuro = [30, 41, 59];  // slate-800
  const colorVerde = [16, 185, 129];      // emerald-500
  const colorRojo = [239, 68, 68];        // red-500
  const colorNaranja = [249, 115, 22];    // orange-500

  // ==========================================
  // 1. ENCABEZADO (Logo + Nombre del negocio + Título)
  // ==========================================
  let logoBase64 = null;
  let nombreNegocio = 'Reporte Financiero';
  try {
    const confRes = await fetch(`${apiUrl}/configuracion`);
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
  doc.text('Reporte Financiero de Ventas', textX, cursorY + 15);

  // Metadatos a la derecha
  doc.setFontSize(8.5);
  doc.setTextColor(...colorTextoGris);
  const periodoTexto = ETIQUETAS_PERIODO[filtros.filtroActivo] || filtros.filtroActivo;
  const rangoTexto = filtros.filtroActivo === 'rango'
    ? `${filtros.fechaCustom} al ${filtros.fechaFin}`
    : `Fecha de referencia: ${filtros.fechaCustom}`;
  doc.text(`Periodo: ${periodoTexto}`, pageWidth - margin, cursorY + 2, { align: 'right' });
  doc.text(rangoTexto, pageWidth - margin, cursorY + 7, { align: 'right' });
  doc.text(`Categoría: ${filtros.filtroClasificacion} | Consumo: ${filtros.filtroConsumo}`, pageWidth - margin, cursorY + 12, { align: 'right' });
  doc.text(`Generado: ${formatearFechaLegible()}`, pageWidth - margin, cursorY + 17, { align: 'right' });

  cursorY += 26;
  doc.setDrawColor(...colorPrimario);
  doc.setLineWidth(0.6);
  doc.line(margin, cursorY, pageWidth - margin, cursorY);
  cursorY += 8;

  // ==========================================
  // 2. TARJETAS DE RESUMEN FINANCIERO
  // ==========================================
  const r = reporte.resumen || {};
  const tarjetas = [
    { label: 'Ingresos Brutos', valor: r.ventas_totales, color: colorTextoOscuro },
    { label: 'Descuentos', valor: -(r.descuentos_otorgados || 0), color: colorNaranja },
    { label: 'Ingresos Netos', valor: r.ingreso_neto_real, color: colorVerde },
    { label: 'Costo Inversión', valor: -(r.inversion_total || 0), color: colorRojo },
    { label: 'Ganancia Neta', valor: r.ganancia_total, color: colorVerde },
    { label: 'Artículos Vendidos', valor: r.productos_vendidos, color: colorTextoOscuro, esEntero: true }
  ];

  const anchoTarjeta = (pageWidth - margin * 2 - 5 * 3) / 6;
  tarjetas.forEach((t, idx) => {
    const x = margin + idx * (anchoTarjeta + 3);
    doc.setDrawColor(226, 232, 240);
    doc.setFillColor(248, 250, 252);
    doc.roundedRect(x, cursorY, anchoTarjeta, 20, 2, 2, 'FD');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.5);
    doc.setTextColor(...colorTextoGris);
    doc.text(t.label.toUpperCase(), x + anchoTarjeta / 2, cursorY + 6, { align: 'center' });

    doc.setFontSize(10.5);
    doc.setTextColor(...t.color);
    const valorTexto = t.esEntero ? String(t.valor || 0) : formaterMoneda(t.valor);
    doc.text(valorTexto, x + anchoTarjeta / 2, cursorY + 14, { align: 'center' });
  });

  cursorY += 28;

  // ==========================================
  // 3. INSIGHTS (texto plano, si existen)
  // ==========================================
  const ins = reporte.insights;
  if (ins && (ins.productoMasVendido || ins.productoMenosVendido)) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(...colorTextoOscuro);
    doc.text('Análisis Inteligente del Periodo', margin, cursorY);
    cursorY += 5;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(...colorTextoGris);
    const lineasInsight = [];
    if (ins.productoMasVendido) lineasInsight.push(`Más vendido: ${ins.productoMasVendido.producto_nombre} (${ins.productoMasVendido.cantidad_vendida} uds.)`);
    if (ins.productoMenosVendido) lineasInsight.push(`Menos vendido: ${ins.productoMenosVendido.producto_nombre} (${ins.productoMenosVendido.cantidad_vendida} uds.)`);
    if (ins.mejorDia) lineasInsight.push(`Mejor día: ${ins.mejorDia.fecha_str} (${formaterMoneda(ins.mejorDia.total_dia)})`);
    if (ins.peorDia) lineasInsight.push(`Peor día: ${ins.peorDia.fecha_str} (${formaterMoneda(ins.peorDia.total_dia)})`);

    lineasInsight.forEach(linea => {
      doc.text(`• ${linea}`, margin, cursorY);
      cursorY += 4.5;
    });
    cursorY += 4;
  }

  // ==========================================
  // 4. TABLA DE DESGLOSE (autoTable con paginación profesional)
  // ==========================================
  const detallesNormales = (reporte.detalles || []).filter(d => d.categoria !== 'Comedor');

  // 💡 FIX: jsPDF usa la fuente Helvetica estándar, que no tiene glifos para emojis
  // (🔸, 🔹, etc.). Sin este limpiador, esos emojis se ven como caracteres corruptos
  // tipo "Ø=Ý8" en el PDF. El CSV y la pantalla NO se tocan, solo el texto que entra
  // a la tabla del PDF.
  const limpiarEmojisParaPDF = (texto) => {
    if (!texto) return texto;
    return String(texto)
      .replace(/[\u{1F300}-\u{1FAFF}]/gu, '')   // Emojis modernos (incluye 🔸🔹)
      .replace(/[\u{2600}-\u{27BF}]/gu, '')      // Símbolos/dingbats (★ ✓ ❌ etc.)
      .replace(/\s{2,}/g, ' ')                   // Colapsa espacios dobles que deja el emoji removido
      .trim();
  };

  const filasTabla = detallesNormales.map(p => [
    limpiarEmojisParaPDF(p.producto_nombre),
    p.categoria,
    String(p.cantidad_vendida),
    formaterMoneda(p.precio_venta),
    formaterMoneda(p.costo_unitario),
    p.descuentos_aplicados > 0 ? `-${formaterMoneda(p.descuentos_aplicados)}` : '$0.00',
    formaterMoneda(p.precio_venta - p.costo_unitario),
    formaterMoneda(p.ganancia_neta)
  ]);

  const totalVendidos = detallesNormales.reduce((s, d) => s + Number(d.cantidad_vendida || 0), 0);
  const totalCosto = detallesNormales.reduce((s, d) => s + Number(d.subtotal_inversion || 0), 0);
  const totalDescuentos = detallesNormales.reduce((s, d) => s + Number(d.descuentos_aplicados || 0), 0);
  const totalGanancia = detallesNormales.reduce((s, d) => s + Number(d.ganancia_neta || 0), 0);

  autoTable(doc, {
    startY: cursorY,
    margin: { left: margin, right: margin },
    head: [['Producto', 'Categoría', 'Vendidos', 'Precio Pub.', 'Costo Unit.', 'Desc/Promo', 'Ganancia x U.', 'Ganancia Total']],
    body: filasTabla,
    foot: [['TOTALES GLOBALES', '', String(totalVendidos), '', formaterMoneda(totalCosto), formaterMoneda(totalDescuentos), '', formaterMoneda(totalGanancia)]],
    theme: 'striped',
    headStyles: { fillColor: colorPrimario, textColor: 255, fontStyle: 'bold', fontSize: 8 },
    footStyles: { fillColor: colorTextoOscuro, textColor: 255, fontStyle: 'bold', fontSize: 8 },
    bodyStyles: { fontSize: 7.5, textColor: colorTextoOscuro },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    columnStyles: {
      2: { halign: 'center' }, 3: { halign: 'right' }, 4: { halign: 'right' },
      5: { halign: 'right' }, 6: { halign: 'right' }, 7: { halign: 'right', fontStyle: 'bold' }
    },
    didDrawPage: (data) => {
      // Pie de página profesional en cada hoja
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

  const nombreArchivo = `Reporte_Financiero_${filtros.filtroActivo}_${filtros.fechaCustom}.pdf`;
  doc.save(nombreArchivo);
};

// ==========================================
// 📊 EXPORTAR CSV (solo tabla de detalles, sin encabezado de resumen)
// ==========================================
export const generarCSVReporte = (detalles) => {
  if (!detalles || detalles.length === 0) return;

  const detallesNormales = detalles.filter(d => d.categoria !== 'Comedor');

  const escaparCSV = (valor) => {
    const texto = String(valor ?? '');
    if (texto.includes(',') || texto.includes('"') || texto.includes('\n')) {
      return `"${texto.replace(/"/g, '""')}"`;
    }
    return texto;
  };

  const encabezados = ['Producto', 'Categoría', 'Vendidos', 'Precio Venta', 'Costo Unitario', 'Descuento Aplicado', 'Ganancia x Unidad', 'Ganancia Total'];

  const filas = detallesNormales.map(p => [
    escaparCSV(p.producto_nombre),
    escaparCSV(p.categoria),
    p.cantidad_vendida,
    Number(p.precio_venta).toFixed(2),
    Number(p.costo_unitario).toFixed(2),
    Number(p.descuentos_aplicados || 0).toFixed(2),
    (Number(p.precio_venta) - Number(p.costo_unitario)).toFixed(2),
    Number(p.ganancia_neta).toFixed(2)
  ]);

  // 👇 BOM al inicio para que Excel reconozca acentos/ñ correctamente
  const contenidoCSV = '\uFEFF' + [encabezados, ...filas].map(fila => fila.join(',')).join('\n');

  const blob = new Blob([contenidoCSV], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  const fecha = new Date().toISOString().split('T')[0];
  link.href = url;
  link.setAttribute('download', `Reporte_Ventas_${fecha}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};