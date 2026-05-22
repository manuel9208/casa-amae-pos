import React from 'react';

const PagosContacto = ({ configGlobal, setConfigGlobal, isSubmitting }) => {
  return (
    <div>
      <h3 className="text-xl font-bold mb-4 border-b pb-2 text-slate-700">2. Transferencias y Contacto</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div><label className="block text-sm font-bold text-slate-600 mb-1">WhatsApp Pagos</label><input required type="tel" value={configGlobal.whatsapp || ''} onChange={e => setConfigGlobal({...configGlobal, whatsapp: e.target.value.replace(/\D/g, '')})} className="w-full p-3 bg-slate-50 border rounded-xl outline-none focus:ring-2 ring-blue-500 font-bold" disabled={isSubmitting}/></div>
        <div><label className="block text-sm font-bold text-slate-600 mb-1">Banco</label><input required value={configGlobal.banco || ''} onChange={e => setConfigGlobal({...configGlobal, banco: e.target.value})} className="w-full p-3 bg-slate-50 border rounded-xl outline-none focus:ring-2 ring-blue-500 font-bold" disabled={isSubmitting}/></div>
        <div className="md:col-span-2"><label className="block text-sm font-bold text-slate-600 mb-1">CLABE o Cuenta</label><input required value={configGlobal.cuenta || ''} onChange={e => setConfigGlobal({...configGlobal, cuenta: e.target.value.replace(/\D/g, '')})} className="w-full p-3 bg-slate-50 border rounded-xl outline-none focus:ring-2 ring-blue-500 font-black text-blue-600 tracking-widest text-lg" disabled={isSubmitting}/></div>
        <div className="md:col-span-2"><label className="block text-sm font-bold text-slate-600 mb-1">Titular</label><input required value={configGlobal.titular || ''} onChange={e => setConfigGlobal({...configGlobal, titular: e.target.value})} className="w-full p-3 bg-slate-50 border rounded-xl outline-none focus:ring-2 ring-blue-500 font-bold" disabled={isSubmitting}/></div>
      </div>
    </div>
  );
};

export default PagosContacto;