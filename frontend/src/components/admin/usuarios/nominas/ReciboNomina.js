import React from 'react';

const formaterMoneda = (num) => new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(num || 0);

const getImageUrl = (url) => {
  if (!url) return '';
  if (url.includes('cloudinary.com')) {
    const parts = url.split('res.cloudinary.com/');
    return `https://res.cloudinary.com/${parts[1]}`;
  }
  return url;
};

const ReciboNomina = ({ recibo, configGlobal = {} }) => {
  if (!recibo) return <div style={{ color: '#000', padding: '20px', fontFamily: 'monospace' }}>Cargando datos del recibo...</div>;

  const fechaInicio = recibo.metadata?.fecha_inicio || recibo.fecha_inicio || 'N/A';
  const fechaFin = recibo.metadata?.fecha_fin || recibo.fecha_fin || 'N/A';

  const ingresosBase = recibo.ingresos_base || recibo.ingresos || [];
  const adicionalesIngresos = recibo.adicionales_ingresos || recibo.nuevos_ingresos || [];
  const egresosBase = recibo.egresos_base || recibo.egresos || [];
  const adicionalesEgresos = recibo.adicionales_egresos || recibo.nuevos_egresos || [];

  const todosIngresos = [...(Array.isArray(ingresosBase) ? ingresosBase : []), ...(Array.isArray(adicionalesIngresos) ? adicionalesIngresos : [])];
  const todosEgresos = [...(Array.isArray(egresosBase) ? egresosBase : []), ...(Array.isArray(adicionalesEgresos) ? adicionalesEgresos : [])];

  const totalIngresos = todosIngresos.reduce((acc, curr) => acc + (Number(curr.monto) || 0), 0);
  const totalEgresos = todosEgresos.reduce((acc, curr) => acc + (Number(curr.monto) || 0), 0);
  const netoPagar = recibo.neto || (totalIngresos - totalEgresos);
  
  const nombreNegocio = configGlobal.nombre_negocio || 'Casa Amae';
  const hoy = new Date().toLocaleDateString('es-MX', { year: 'numeric', month: '2-digit', day: '2-digit' });

  return (
    <div id="seccion-a-imprimir-recibo" className="w-full max-w-4xl mx-auto p-8 bg-white text-black font-sans text-[11px] md:text-xs" style={{ backgroundColor: '#fff', color: '#000' }}>
       
       {/* HEADER CON LOGO A LA DERECHA */}
       <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '15px' }}>
          <div>
             <h1 style={{ margin: 0, fontSize: '24px', fontWeight: '900', color: '#000', letterSpacing: '-0.5px' }}>RECIBO DE NÓMINA</h1>
             <p style={{ margin: '2px 0 0 0', fontSize: '13px', color: '#333', fontWeight: '600' }}>Comprobante de Pago</p>
          </div>
          <div>
             {configGlobal.logo_url ? (
                <img src={getImageUrl(configGlobal.logo_url)} alt="Logo" style={{ maxHeight: '65px', objectFit: 'contain' }} />
             ) : (
                <h2 style={{ margin: 0, fontSize: '20px', fontWeight: '900', color: '#000' }}>{nombreNegocio}</h2>
             )}
          </div>
       </div>

       <hr style={{ border: 'none', borderTop: '2px solid #000', marginBottom: '20px' }} />

       {/* INFORMACIÓN DEL TRABAJADOR */}
       <div style={{ textTransform: 'uppercase', lineHeight: '1.6', marginBottom: '25px', color: '#000' }}>
          <p style={{ margin: '3px 0' }}><strong>FECHA DE EMISIÓN:</strong> {hoy}</p>
          <p style={{ margin: '3px 0' }}><strong>COLABORADOR:</strong> {recibo.nombre_completo || recibo.nombre || 'N/A'}</p>
          {recibo.rol && <p style={{ margin: '3px 0' }}><strong>PUESTO:</strong> {recibo.rol}</p>}
          
          <p style={{ marginTop: '20px', marginBottom: '20px', textTransform: 'none', fontSize: '11px', color: '#000' }}>
             Recibí de <strong>{nombreNegocio}</strong> la cantidad de <strong>{formaterMoneda(netoPagar)}</strong> por concepto de mi sueldo correspondiente al periodo del <strong>{fechaInicio}</strong> al <strong>{fechaFin}</strong> como sigue:
          </p>
       </div>

       {/* CUADRÍCULA ESTILO COPPEL */}
       <div style={{ border: '1px solid #000', marginBottom: '30px' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', color: '#000' }}>
             <thead>
                <tr style={{ borderBottom: '1px solid #000', backgroundColor: '#f9f9f9' }}>
                   <th style={{ padding: '8px', borderRight: '1px solid #000', fontWeight: 'bold' }}>Concepto Descripción</th>
                   <th style={{ padding: '8px', borderRight: '1px solid #000', textAlign: 'right', fontWeight: 'bold', width: '25%' }}>Ingresos</th>
                   <th style={{ padding: '8px', textAlign: 'right', fontWeight: 'bold', width: '25%' }}>Egresos</th>
                </tr>
             </thead>
             <tbody>
                {todosIngresos.map((ing, i) => (
                   <tr key={`ing-${i}`} style={{ borderBottom: '1px solid #000' }}>
                      <td style={{ padding: '7px 8px', borderRight: '1px solid #000', textTransform: 'uppercase' }}>{ing.concepto || 'Sueldo Base u Ordinario'}</td>
                      <td style={{ padding: '7px 8px', borderRight: '1px solid #000', textAlign: 'right', fontWeight: '600' }}>{formaterMoneda(ing.monto)}</td>
                      <td style={{ padding: '7px 8px', textAlign: 'right' }}></td>
                   </tr>
                ))}
                {todosEgresos.map((eg, i) => (
                   <tr key={`eg-${i}`} style={{ borderBottom: '1px solid #000' }}>
                      <td style={{ padding: '7px 8px', borderRight: '1px solid #000', textTransform: 'uppercase' }}>- {eg.concepto}</td>
                      <td style={{ padding: '7px 8px', borderRight: '1px solid #000', textAlign: 'right' }}></td>
                      <td style={{ padding: '7px 8px', textAlign: 'right', fontWeight: '600' }}>{formaterMoneda(eg.monto)}</td>
                   </tr>
                ))}
             </tbody>
             <tfoot style={{ fontWeight: 'bold', backgroundColor: '#ffffff' }}>
                <tr style={{ borderBottom: '1px solid #000' }}>
                   <td style={{ padding: '8px', borderRight: '1px solid #000', textTransform: 'uppercase' }}>TOTALES DESGLOSADOS</td>
                   <td style={{ padding: '8px', borderRight: '1px solid #000', textAlign: 'right' }}>{formaterMoneda(totalIngresos || netoPagar)}</td>
                   <td style={{ padding: '8px', textAlign: 'right' }}>{formaterMoneda(totalEgresos)}</td>
                </tr>
                <tr style={{ backgroundColor: '#ffffff' }}>
                   <td style={{ padding: '8px', borderRight: '1px solid #000', textTransform: 'uppercase' }}><strong>NETO EFECTIVO A PAGAR</strong></td>
                   <td style={{ padding: '8px', borderRight: '1px solid #000', textAlign: 'right', color: '#000' }}><strong>{formaterMoneda(netoPagar)}</strong></td>
                   <td style={{ padding: '8px', textAlign: 'right' }}></td>
                </tr>
             </tfoot>
          </table>
       </div>

       {/* PIE DE PÁGINA: ÚNICAMENTE FIRMA A LA DERECHA */}
       <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '60px' }}>
          <div style={{ textAlign: 'center', width: '280px', borderTop: '1px solid #000', paddingTop: '6px' }}>
             <p style={{ fontSize: '9px', margin: 0, color: '#000', fontWeight: 'bold', letterSpacing: '0.5px' }}>FIRMA DE CONFORMIDAD</p>
          </div>
       </div>

    </div>
  );
};

export default ReciboNomina;