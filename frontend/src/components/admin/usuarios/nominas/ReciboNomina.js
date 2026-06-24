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
  if (!recibo) return null;

  const metadata = recibo.metadata || {};
  const ingresosBase = recibo.ingresos_base || [];
  const adicionalesIngresos = recibo.adicionales_ingresos || [];
  const egresosBase = recibo.egresos_base || [];
  const adicionalesEgresos = recibo.adicionales_egresos || [];

  const totalIngresos = recibo.total_ingresos || 0;
  const totalEgresos = recibo.total_egresos || 0;
  
  const todosIngresos = [...ingresosBase, ...adicionalesIngresos];
  const todosEgresos = [...egresosBase, ...adicionalesEgresos];
  
  const nombreNegocio = configGlobal.nombre_negocio || 'Mi Restaurante';
  
  // Fecha actual para el pie de página
  const hoy = new Date().toLocaleDateString('es-MX', { year: 'numeric', month: '2-digit', day: '2-digit' });

  return (
    <div id="seccion-a-imprimir-recibo" className="w-full max-w-4xl mx-auto p-8 bg-white text-black font-sans text-[11px] md:text-xs print:block">
       
       {/* HEADER CON LOGO A LA DERECHA */}
       <div className="flex justify-between items-start mb-8">
          <div className="flex-1">
             {/* Espacio reservado para info de la sucursal si en un futuro se requiere */}
          </div>
          <div className="flex-shrink-0 text-right">
             {configGlobal.logo_url ? (
                <img src={getImageUrl(configGlobal.logo_url)} alt="Logo" className="h-14 md:h-16 object-contain" />
             ) : (
                <h2 className="text-2xl font-black text-blue-600 tracking-tighter uppercase">{nombreNegocio}</h2>
             )}
          </div>
       </div>

       {/* INFORMACIÓN DE LA TRANSACCIÓN Y EMPLEADO */}
       <div className="mb-4 uppercase leading-relaxed">
          <p>FECHA DE EMISIÓN: {hoy}</p>
          <br/>
          <p className="mb-1">
             RECIBÍ DE <strong>{nombreNegocio}</strong> LA CANTIDAD DE <strong>{formaterMoneda(recibo.neto)}</strong> POR CONCEPTO DE MI SUELDO CORRESPONDIENTE AL PERIODO DEL <strong>{metadata.fecha_inicio}</strong> AL <strong>{metadata.fecha_fin}</strong> COMO SIGUE:
          </p>
          {recibo.datos_banco?.cuenta && <p>NUM. DE CUENTA: {recibo.datos_banco.cuenta}</p>}
          {(recibo.datos_banco?.banco || recibo.datos_banco?.institucion) && <p>BANCO: {recibo.datos_banco.banco || recibo.datos_banco.institucion}</p>}
       </div>

       {/* TABLA DE DESGLOSE ESTILO COPPEL */}
       <div className="border border-black mb-8">
          <table className="w-full text-left border-collapse">
             <thead className="border-b border-black">
                <tr>
                   <th className="p-2 font-normal w-1/2"></th>
                   <th className="p-2 font-normal text-right w-1/4">Ingresos</th>
                   <th className="p-2 font-normal text-right w-1/4">Egresos</th>
                </tr>
             </thead>
             <tbody>
                {todosIngresos.map((ing, i) => (
                   <tr key={`ing-${i}`}>
                      <td className="p-1 px-2 uppercase">{ing.concepto}</td>
                      <td className="p-1 px-2 text-right">{formaterMoneda(ing.monto)}</td>
                      <td className="p-1 px-2 text-right"></td>
                   </tr>
                ))}
                {todosEgresos.map((eg, i) => (
                   <tr key={`eg-${i}`}>
                      <td className="p-1 px-2 uppercase">- {eg.concepto}</td>
                      <td className="p-1 px-2 text-right"></td>
                      <td className="p-1 px-2 text-right">{formaterMoneda(eg.monto)}</td>
                   </tr>
                ))}
             </tbody>
             <tfoot className="border-t border-black">
                <tr>
                   <td className="p-2 uppercase">TOTALES</td>
                   <td className="p-2 text-right">{formaterMoneda(totalIngresos)}</td>
                   <td className="p-2 text-right">{formaterMoneda(totalEgresos)}</td>
                </tr>
                <tr>
                   <td className="p-2 uppercase">A PAGAR</td>
                   <td className="p-2 text-right">{formaterMoneda(recibo.neto)}</td>
                   <td className="p-2 text-right"></td>
                </tr>
             </tfoot>
          </table>
       </div>

       {/* PIE DE PÁGINA (DATOS LEGALES DEL TRABAJADOR) */}
       <div className="uppercase leading-relaxed">
          <p>CULIACÁN SIN {hoy}</p>
          <p>{recibo.nombre_completo || recibo.nombre}</p>
          {recibo.datos_banco?.nss && <p>NSS: {recibo.datos_banco.nss}</p>}
          {recibo.datos_banco?.rfc && <p>RFC: {recibo.datos_banco.rfc}</p>}
          {recibo.datos_banco?.curp && <p>CURP: {recibo.datos_banco.curp}</p>}
       </div>

    </div>
  );
};

export default ReciboNomina;