import React from 'react';

const formaterMoneda = (num) => new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(num || 0);

const ReciboNomina = ({ recibo }) => {
  if (!recibo) return null;

  const metadata = recibo.metadata || {};
  const ingresosBase = recibo.ingresos_base || [];
  const adicionalesIngresos = recibo.adicionales_ingresos || [];
  const egresosBase = recibo.egresos_base || [];
  const adicionalesEgresos = recibo.adicionales_egresos || [];

  const totalIngresos = recibo.total_ingresos || 0;
  const totalEgresos = recibo.total_egresos || 0;

  return (
    <div id="seccion-a-imprimir-recibo" className="w-[320px] p-4 bg-white text-black font-mono text-sm leading-tight mx-auto print:block">
      
      {/* CABECERA DEL RECIBO */}
      <div className="text-center mb-4">
        {/* Aquí puedes inyectar un <img src={logo} /> en el futuro si lo deseas */}
        <h2 className="font-black text-xl mb-1 uppercase tracking-widest">Recibo de Nómina</h2>
        <p className="text-xs font-bold border-b border-dashed border-black pb-2 mb-2">Comprobante de Pago</p>
        <p className="text-[10px] font-bold tracking-widest uppercase">Periodo de Pago:</p>
        <p className="text-xs font-black">{metadata.fecha_inicio} al {metadata.fecha_fin}</p>
      </div>

      {/* DATOS DEL EMPLEADO */}
      <div className="mb-4 text-xs border-b border-dashed border-black pb-3 space-y-1">
        <p><strong className="uppercase">Empleado:</strong> {recibo.nombre_completo || recibo.nombre}</p>
        <p><strong className="uppercase">Puesto:</strong> <span className="uppercase">{recibo.rol}</span></p>
        {recibo.datos_banco?.rfc && <p><strong className="uppercase">RFC:</strong> {recibo.datos_banco.rfc}</p>}
        {recibo.datos_banco?.nss && <p><strong className="uppercase">NSS:</strong> {recibo.datos_banco.nss}</p>}
      </div>

      {/* SECCIÓN DE INGRESOS */}
      <div className="mb-2">
        <p className="font-black uppercase tracking-wider mb-2 text-[11px]">Percepciones (+)</p>
        {ingresosBase.map((ing, i) => (
          <div key={`ing-${i}`} className="flex justify-between text-xs mb-1">
            <span className="w-2/3 pr-2 uppercase text-[10px] leading-snug">{ing.concepto}</span>
            <span className="w-1/3 text-right font-bold">{formaterMoneda(ing.monto)}</span>
          </div>
        ))}
        {adicionalesIngresos.map((ing, i) => (
          <div key={`adin-${i}`} className="flex justify-between text-xs mb-1">
            <span className="w-2/3 pr-2 uppercase text-[10px] leading-snug">{ing.concepto}</span>
            <span className="w-1/3 text-right font-bold">{formaterMoneda(ing.monto)}</span>
          </div>
        ))}
      </div>

      {/* SECCIÓN DE DEDUCCIONES */}
      {(egresosBase.length > 0 || adicionalesEgresos.length > 0) && (
        <div className="mb-4 mt-3 border-t border-dotted border-gray-400 pt-2">
          <p className="font-black uppercase tracking-wider mb-2 text-[11px]">Deducciones (-)</p>
          {egresosBase.map((eg, i) => (
            <div key={`eg-${i}`} className="flex justify-between text-xs mb-1">
              <span className="w-2/3 pr-2 uppercase text-[10px] leading-snug">{eg.concepto}</span>
              <span className="w-1/3 text-right font-bold">{formaterMoneda(eg.monto)}</span>
            </div>
          ))}
          {adicionalesEgresos.map((eg, i) => (
            <div key={`adeg-${i}`} className="flex justify-between text-xs mb-1">
              <span className="w-2/3 pr-2 uppercase text-[10px] leading-snug">{eg.concepto}</span>
              <span className="w-1/3 text-right font-bold">{formaterMoneda(eg.monto)}</span>
            </div>
          ))}
        </div>
      )}

      {/* TOTALES */}
      <div className="border-t-2 border-black pt-2 mb-6 mt-4">
        <div className="flex justify-between text-xs mb-1 text-gray-700">
          <span className="uppercase text-[10px]">Suma Percepciones:</span>
          <span>{formaterMoneda(totalIngresos)}</span>
        </div>
        <div className="flex justify-between text-xs mb-2 pb-2 border-b border-dotted border-gray-400 text-gray-700">
          <span className="uppercase text-[10px]">Suma Deducciones:</span>
          <span>{formaterMoneda(totalEgresos)}</span>
        </div>
        <div className="flex justify-between font-black text-lg items-end mt-2">
          <span className="uppercase text-sm">Neto a Pagar:</span>
          <span>{formaterMoneda(recibo.neto)}</span>
        </div>
      </div>

      {/* INFORMACIÓN DE PAGO */}
      {recibo.datos_banco?.banco && (
        <div className="mt-2 text-[10px] text-center bg-gray-100 p-3 rounded-lg border border-gray-300">
          <p className="uppercase font-black mb-1 tracking-widest text-[9px]">Método: Transferencia / Depósito</p>
          <p><strong>Banco:</strong> {recibo.datos_banco.banco}</p>
          <p><strong>Cuenta/CLABE:</strong> {recibo.datos_banco.cuenta}</p>
        </div>
      )}

      {/* FIRMA DE CONFORMIDAD */}
      <div className="text-center mt-20 mb-4">
        <div className="border-t border-black w-4/5 mx-auto mb-1"></div>
        <p className="text-[10px] font-black uppercase tracking-widest">Firma del Empleado</p>
        <p className="text-[8px] mt-2 leading-tight text-gray-600 text-justify px-2">
          Recibí a mi entera satisfacción la cantidad arriba mencionada, cubriendo el pago de mis servicios durante el periodo indicado. No reservándome acción ni derecho alguno que ejercer en contra de la empresa.
        </p>
      </div>
      
      <p className="text-[9px] text-center italic mt-4 text-gray-500">
        Generado el {new Date().toLocaleString('es-MX', { timeZone: 'America/Mazatlan' })}
      </p>
    </div>
  );
};

export default ReciboNomina;