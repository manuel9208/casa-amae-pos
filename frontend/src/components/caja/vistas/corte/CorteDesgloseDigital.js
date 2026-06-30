import React from 'react';
import { Smartphone, CreditCard, Banknote } from 'lucide-react';

const CorteDesgloseDigital = ({ mathHoy }) => {
  // Aislamos la suma matemática de mostrador + domicilio para cada método digital
  const totalTarjetas = mathHoy.lTarjeta + mathHoy.dTarjeta;
  const totalTransferencias = mathHoy.lTransf + mathHoy.dTransf;

  return (
    <div className="bg-blue-50/50 p-6 md:p-8 rounded-[32px] border border-blue-100 transition-all hover:shadow-md">
      <div className="flex items-center gap-3 mb-6">
        <div className="bg-blue-600 text-white p-2 md:p-3 rounded-xl shadow-md shadow-blue-600/20">
          <Smartphone size={24} />
        </div>
        <div>
          <h3 className="text-xl font-black text-blue-900 uppercase tracking-widest leading-tight">
            3. Pagos Digitales
          </h3>
          <p className="text-xs font-bold text-blue-500 uppercase tracking-widest mt-0.5">
            Ingresos Directos a Banco
          </p>
        </div>
      </div>
      
      <div className="grid grid-cols-2 gap-4">
        {/* Tarjetas Bancarias */}
        <div className="bg-white p-5 rounded-2xl border border-blue-100 shadow-sm group hover:border-blue-300 hover:shadow-md transition-all duration-300 flex flex-col justify-between">
          <p className="text-[10px] font-black text-blue-500 uppercase tracking-widest mb-2 flex items-center gap-1.5">
            <CreditCard size={14} className="text-blue-400 group-hover:scale-110 transition-transform" /> 
            Total Tarjetas
          </p>
          <p className="text-3xl font-black text-blue-900">
            ${totalTarjetas.toFixed(2)}
          </p>
        </div>
        
        {/* Transferencias / SPEI */}
        <div className="bg-white p-5 rounded-2xl border border-purple-100 shadow-sm group hover:border-purple-300 hover:shadow-md transition-all duration-300 flex flex-col justify-between">
          <p className="text-[10px] font-black text-purple-500 uppercase tracking-widest mb-2 flex items-center gap-1.5">
            <Banknote size={14} className="text-purple-400 group-hover:scale-110 transition-transform" /> 
            Transferencias
          </p>
          <p className="text-3xl font-black text-purple-900">
            ${totalTransferencias.toFixed(2)}
          </p>
        </div>
      </div>
    </div>
  );
};

export default CorteDesgloseDigital;