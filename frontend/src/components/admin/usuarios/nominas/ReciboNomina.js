import React from 'react';

const formaterMoneda = (num) => new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(num || 0);

const ReciboNomina = ({ recibo }) => {
  if (!recibo) return null;

  const metadata = recibo.metadata || {};
  const ingresosBase = recibo.ingresos_base || [];
  const adicionalesIngresos = recibo.adicionales_ingresos || [];
  const egresosBase = recibo.egresos_base || [];
  const adicionalesEgresos = recibo.adicionales_egresos || [];

  return (
    <div id="seccion-a-imprimir-recibo" className="w-[300px] p-4 bg-white text-black font-mono text-sm leading-tight mx-auto print:block">
      <div className="text-center mb-4">
        <h2 className="font-black text-xl mb-1 uppercase tracking-widest">Recibo de Nómina</h2>
        <p className="text-xs font-bold border-b border-black pb-2 mb-2">Comprobante de Pago</p>
        <p className="text-xs font-bold">{metadata.fecha_inicio} al {metadata.fecha_fin}</p>
      </div>

      <div className="mb-4 text-xs">
        <p><strong>Empleado:</strong> {recibo.nombre}</p>
        <p><strong>Puesto:</strong> <span className="uppercase">{recibo.rol}</span></p>
        {recibo.datos_banco?.rfc && <p><strong>RFC:</strong> {recibo.datos_banco.rfc}</p>}
      </div>

      <div className="mb-4">
        <p className="font-black border-b border-dashed border-black pb-1 mb-2">Ingresos (+)</p>
        {ingresosBase.map((ing, i) => (
          <div key={i} className="flex justify-between text-xs mb-1">
            <span className="w-2/3 break-words">{ing.concepto}</span>
            <span className="w-1/3 text-right">{formaterMoneda(ing.monto)}</span>
          </div>
        ))}
        {adicionalesIngresos.map((ing, i) => (
          <div key={`adin-${i}`} className="flex justify-between text-xs mb-1">
            <span className="w-2/3 break-words">{ing.concepto}</span>
            <span className="w-1/3 text-right">{formaterMoneda(ing.monto)}</span>
          </div>
        ))}
      </div>

      {(egresosBase.length > 0 || adicionalesEgresos.length > 0) && (
        <div className="mb-4">
          <p className="font-black border-b border-dashed border-black pb-1 mb-2">Deducciones (-)</p>
          {egresosBase.map((eg, i) => (
            <div key={i} className="flex justify-between text-xs mb-1">
              <span className="w-2/3 break-words">{eg.concepto}</span>
              <span className="w-1/3 text-right">{formaterMoneda(eg.monto)}</span>
            </div>
          ))}
          {adicionalesEgresos.map((eg, i) => (
            <div key={`adeg-${i}`} className="flex justify-between text-xs mb-1">
              <span className="w-2/3 break-words">{eg.concepto}</span>
              <span className="w-1/3 text-right">{formaterMoneda(eg.monto)}</span>
            </div>
          ))}
        </div>
      )}

      <div className="border-t-2 border-black pt-2 mb-8">
        <div className="flex justify-between font-black text-lg">
          <span>Neto a Pagar:</span>
          <span>{formaterMoneda(recibo.neto)}</span>
        </div>
        {recibo.datos_banco?.banco && (
          <div className="mt-2 text-[10px] text-center bg-gray-100 p-2 rounded">
            <p><strong>Depósito a:</strong> {recibo.datos_banco.banco}</p>
            <p><strong>Cuenta/CLABE:</strong> {recibo.datos_banco.cuenta}</p>
          </div>
        )}
      </div>

      <div className="text-center mt-12 mb-4">
        <div className="border-t border-black w-3/4 mx-auto mb-1"></div>
        <p className="text-[10px]">Firma de conformidad</p>
      </div>
      
      <p className="text-[10px] text-center italic mt-4">Generado el {new Date().toLocaleString()}</p>
    </div>
  );
};

export default ReciboNomina;