import React, { useState, useEffect, useCallback } from 'react';
import { History, Printer, Calendar, DollarSign } from 'lucide-react';

const formaterMoneda = (num) => new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(num || 0);

// 👇 CORRECCIÓN: Agregamos la función para procesar la URL del logo
const getImageUrl = (url) => {
  if (!url) return '';
  if (url.includes('cloudinary.com')) {
    const parts = url.split('res.cloudinary.com/');
    return `https://res.cloudinary.com/${parts[1]}`;
  }
  return url;
};

const VistaNominasEmpleado = ({ user, apiUrl }) => {
  const [misRecibos, setMisRecibos] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [reciboPrint, setReciboPrint] = useState(null);
  const [configGlobal, setConfigGlobal] = useState({});

  useEffect(() => {
    fetch(`${apiUrl}/configuracion`)
      .then(res => res.json())
      .then(data => { if (data) setConfigGlobal(data); })
      .catch(() => {});
  }, [apiUrl]);

  const cargarMisRecibos = useCallback(async () => {
    setCargando(true);
    try {
      const hoyStr = new Date().toISOString().split('T')[0];
      const res = await fetch(`${apiUrl}/usuarios/rendimiento?periodo=anio&fecha=${hoyStr.substring(0,4)}-01-01`);
      if (res.ok) {
        const data = await res.json();
        const cortes = data.cortesNomina || [];
        
        const acumulado = [];
        cortes.forEach(nomina => {
          const datos = typeof nomina.datos_corte === 'string' ? JSON.parse(nomina.datos_corte) : nomina.datos_corte;
          if (datos && datos.metadata && datos.metadata.es_nomina === true) {
            const recibos = datos.recibos || [];
            const miRecibo = recibos.find(r => String(r.empleado_id) === String(user.id));
            if (miRecibo) {
              acumulado.push({
                ...miRecibo,
                metadata: datos.metadata,
                fecha_creacion: nomina.fecha_creacion
              });
            }
          }
        });
        setMisRecibos(acumulado.reverse()); 
      }
    } catch (e) {
      console.error("Error al cargar recibos del empleado", e);
    }
    setCargando(false);
  }, [apiUrl, user.id]);

  useEffect(() => {
    cargarMisRecibos();
  }, [cargarMisRecibos]);

  useEffect(() => {
    if (reciboPrint) {
      const timer = setTimeout(() => {
        window.print();
        setReciboPrint(null);
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [reciboPrint]);

  return (
    <div className="space-y-6 animate-in slide-in-from-bottom-4 w-full max-w-full">
      <div className="bg-slate-900 p-6 md:p-8 rounded-[32px] shadow-xl flex items-center gap-4 text-white print:hidden">
        <div className="bg-emerald-500/20 p-4 rounded-2xl border border-emerald-500/30 text-emerald-400"><DollarSign size={32}/></div>
        <div>
          <h3 className="text-xl md:text-2xl font-black tracking-tight">Mis Recibos de Pago</h3>
          <p className="text-[10px] md:text-xs font-black text-emerald-400 uppercase tracking-widest mt-1">Historial de Nóminas Cobradas</p>
        </div>
      </div>

      {cargando ? (
        <div className="py-20 text-center flex flex-col items-center justify-center opacity-50 print:hidden">
           <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-800 mx-auto mb-3"></div>
           <p className="font-black text-lg text-slate-500">Consultando tus archivos financieros...</p>
        </div>
      ) : misRecibos.length === 0 ? (
        <div className="py-16 text-center flex flex-col items-center justify-center print-hidden border-2 border-dashed border-slate-200 rounded-[32px] bg-white p-8">
           <History size={56} className="text-slate-300 mb-4" />
           <p className="font-black text-xl text-slate-800 mb-1">Sin recibos aún</p>
           <p className="text-sm text-slate-400 font-bold">Tus próximas nóminas aprobadas aparecerán en esta sección automáticamente.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 print:hidden">
          {misRecibos.map((r, idx) => (
            <div key={idx} className="bg-white p-6 rounded-[32px] border border-slate-200 shadow-sm hover:shadow-md transition-all flex flex-col justify-between group">
              <div className="mb-6">
                <div className="flex justify-between items-start gap-2 mb-3">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1">
                    <Calendar size={12}/> {new Date(r.fecha_creacion).toLocaleDateString('es-MX')}
                  </span>
                  <span className="text-[9px] bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-md font-black uppercase tracking-widest border border-emerald-100">
                    Pagado
                  </span>
                </div>
                <p className="text-xs font-black text-slate-400 uppercase tracking-wider">Periodo de Pago</p>
                <p className="font-black text-slate-800 text-base md:text-lg mt-0.5 leading-tight">{r.metadata?.fecha_inicio} al {r.metadata?.fecha_fin}</p>
                <div className="mt-4 pt-4 border-t border-slate-100 flex justify-between items-end">
                  <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Neto Recibido</p>
                    <p className="text-3xl font-black text-emerald-600 mt-0.5">{formaterMoneda(r.neto)}</p>
                  </div>
                </div>
              </div>
              <button 
                onClick={() => setReciboPrint(r)} 
                className="w-full bg-slate-900 hover:bg-slate-800 text-white font-black py-3.5 rounded-2xl flex justify-center items-center gap-2 transition text-sm shadow-sm active:scale-95"
              >
                <Printer size={16}/> Ver y Descargar PDF
              </button>
            </div>
          ))}
        </div>
      )}

      {/* RENDERIZADO DEL RECIBO EMBEDDED EXCLUSIVO PARA IMPRESIÓN */}
      {reciboPrint && (
        <div className="print-receipt-wrapper font-sans text-black" style={{ backgroundColor: '#fff', color: '#000', width: '100%' }}>
           <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '15px' }}>
              <div>
                 <h1 style={{ margin: 0, fontSize: '22px', fontWeight: '900', color: '#000' }}>RECIBO DE NÓMINA</h1>
                 <p style={{ margin: '2px 0 0 0', fontSize: '12px', color: '#333', fontWeight: '600' }}>Comprobante Digital de Pago</p>
              </div>
              <div>
                 {/* 👇 CORRECCIÓN: Renderizado condicional del Logo tal como en ReciboNomina.js */}
                 {configGlobal.logo_url ? (
                    <img src={getImageUrl(configGlobal.logo_url)} alt="Logo" style={{ maxHeight: '65px', objectFit: 'contain' }} />
                 ) : (
                    <h2 style={{ margin: 0, fontSize: '18px', fontWeight: '900', color: '#000', textTransform: 'uppercase' }}>{configGlobal.nombre_negocio || 'CASA AMAE'}</h2>
                 )}
              </div>
           </div>
           <hr style={{ border: 'none', borderTop: '2px solid #000', marginBottom: '15px' }} />
           <div style={{ textTransform: 'uppercase', lineHeight: '1.5', marginBottom: '20px' }}>
              <p style={{ margin: '3px 0' }}><strong>FECHA EMISIÓN:</strong> {new Date().toLocaleDateString('es-MX')}</p>
              <p style={{ margin: '3px 0' }}><strong>COLABORADOR:</strong> {reciboPrint.nombre_completo || reciboPrint.nombre}</p>
              <p style={{ margin: '3px 0' }}><strong>PUESTO / ROL:</strong> {reciboPrint.rol}</p>
              <p style={{ marginTop: '15px', textTransform: 'none', fontSize: '11px' }}>
                 Recibí de la empresa la cantidad de <b>{formaterMoneda(reciboPrint.neto)}</b> por concepto de mi sueldo correspondiente al periodo del <b>{reciboPrint.metadata?.fecha_inicio}</b> al <b>{reciboPrint.metadata?.fecha_fin}</b> desglosado de la siguiente manera:
              </p>
           </div>
           <div style={{ border: '1px solid #000', marginBottom: '25px' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                 <thead>
                    <tr style={{ borderBottom: '1px solid #000', backgroundColor: '#f5f5f5', fontWeight: 'bold' }}>
                       <th style={{ padding: '6px 8px', borderRight: '1px solid #000' }}>Descripción del Concepto</th>
                       <th style={{ padding: '6px 8px', borderRight: '1px solid #000', textAlign: 'right', width: '25%' }}>Percepciones</th>
                       <th style={{ padding: '6px 8px', textAlign: 'right', width: '25%' }}>Deducciones</th>
                    </tr>
                 </thead>
                 <tbody>
                    {[...(reciboPrint.ingresos_base || []), ...(reciboPrint.adicionales_ingresos || [])].map((ing, i) => (
                       <tr key={`ing-${i}`} style={{ borderBottom: '1px solid #000' }}>
                          <td style={{ padding: '6px 8px', borderRight: '1px solid #000', textTransform: 'uppercase' }}>{ing.concepto || 'Sueldo Base Ordinario'}</td>
                          <td style={{ padding: '6px 8px', borderRight: '1px solid #000', textAlign: 'right', fontWeight: '600' }}>{formaterMoneda(ing.monto)}</td>
                          <td style={{ padding: '6px 8px', textAlign: 'right' }}></td>
                       </tr>
                    ))}
                    {[...(reciboPrint.egresos_base || []), ...(reciboPrint.adicionales_egresos || [])].map((eg, i) => (
                       <tr key={`eg-${i}`} style={{ borderBottom: '1px solid #000' }}>
                          <td style={{ padding: '6px 8px', borderRight: '1px solid #000', textTransform: 'uppercase' }}>- {eg.concepto}</td>
                          <td style={{ padding: '6px 8px', borderRight: '1px solid #000', textAlign: 'right' }}></td>
                          <td style={{ padding: '6px 8px', textAlign: 'right', fontWeight: '600' }}>{formaterMoneda(eg.monto)}</td>
                       </tr>
                    ))}
                 </tbody>
                 <tfoot style={{ fontWeight: 'bold', borderTop: '2px solid #000' }}>
                    <tr style={{ borderBottom: '1px solid #000' }}>
                       <td style={{ padding: '6px 8px', borderRight: '1px solid #000' }}>TOTALES</td>
                       <td style={{ padding: '6px 8px', borderRight: '1px solid #000', textAlign: 'right' }}>{formaterMoneda(reciboPrint.total_ingresos || reciboPrint.neto)}</td>
                       <td style={{ padding: '6px 8px', textAlign: 'right' }}>{formaterMoneda(reciboPrint.total_egresos || 0)}</td>
                    </tr>
                    <tr style={{ backgroundColor: '#fafafa' }}>
                       <td style={{ padding: '8px', borderRight: '1px solid #000' }}><strong>NETO RECIBIDO EN EFECTIVO</strong></td>
                       <td style={{ padding: '8px', borderRight: '1px solid #000', textAlign: 'right' }}><strong>{formaterMoneda(reciboPrint.neto)}</strong></td>
                       <td style={{ padding: '8px', textAlign: 'right' }}></td>
                    </tr>
                 </tfoot>
              </table>
           </div>
           <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '50px' }}>
              <div style={{ textAlign: 'center', width: '240px', borderTop: '1px solid #000', paddingTop: '4px', fontWeight: 'bold', fontSize: '9px' }}>
                 FIRMA DE CONFORMIDAD DEL COLABORADOR
              </div>
           </div>
        </div>
      )}

      {/* 🛡️ BLINDAJE DE IMPRESIÓN MÓVIL DIRECTO */}
      <style>{`
        @media screen {
          .print-receipt-wrapper { display: none !important; }
        }
        @media print {
          .print-hidden, header, nav, aside, footer, button, .tabs-navigation {
            display: none !important;
            height: 0 !important;
            overflow: hidden !important;
          }
          html, body, #root, main, .min-h-screen, .overflow-hidden, .overflow-y-auto {
            height: auto !important;
            min-height: 100% !important;
            width: 100% !important;
            overflow: visible !important;
            position: static !important;
            display: block !important;
            background: #ffffff !important;
            margin: 0 !important;
            padding: 0 !important;
          }
          .print-receipt-wrapper {
            display: block !important;
            position: absolute !important;
            top: 0 !important;
            left: 0 !important;
            width: 100% !important;
            padding: 8mm !important;
            box-sizing: border-box !important;
            background-color: #ffffff !important;
            z-index: 9999999 !important;
          }
          .print-receipt-wrapper table {
            display: table !important;
            width: 100% !important;
            border: 1px solid #000000 !important;
            border-collapse: collapse !important;
          }
          .print-receipt-wrapper tr { display: table-row !important; }
          .print-receipt-wrapper th, .print-receipt-wrapper td {
            display: table-cell !important;
            border: 1px solid #000000 !important;
            padding: 6px 8px !important;
          }
          @page { size: auto; margin: 6mm; }
        }
      `}</style>
    </div>
  );
};

export default VistaNominasEmpleado;