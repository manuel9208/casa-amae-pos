import React, { useState } from 'react';
import { PackagePlus, CheckCircle2 } from 'lucide-react';

const ModalSolicitarInsumo = ({ setModalInsumo, catalogoIngredientes, enviarSolicitudInsumo }) => {
  const [insumoSelect, setInsumoSelect] = useState('');
  const [cantidad, setCantidad] = useState('');
  const [enviado, setEnviado] = useState(false);

  const nombresUnicos = [...new Set(catalogoIngredientes.map(i => i.nombre))].sort();

  const enviarSolicitud = (e) => {
    e.preventDefault();
    if (!insumoSelect.trim() || !cantidad.trim()) return;

    // 🆕 100% Socket.io en vivo — cero registro en BD, cero dependencia de pedidos activos.
    enviarSolicitudInsumo(insumoSelect.trim(), cantidad.trim());

    setEnviado(true);
    setTimeout(() => setModalInsumo(false), 1400);
  };

  if (enviado) {
    return (
      <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in">
        <div className="bg-slate-800 p-10 rounded-[40px] shadow-2xl w-full max-w-md border border-slate-700 text-center animate-in zoom-in-95">
          <CheckCircle2 size={56} className="text-emerald-500 mx-auto mb-4" />
          <p className="text-xl font-black text-white">Solicitud enviada a Caja</p>
          <p className="text-slate-400 font-bold text-sm mt-1">Te avisaremos aquí mismo si la aceptan o rechazan.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in">
      <form onSubmit={enviarSolicitud} className="bg-slate-800 p-8 rounded-[40px] shadow-2xl w-full max-w-md border border-slate-700 text-left">
        <h3 className="text-2xl font-black text-white mb-2 flex items-center gap-2"><PackagePlus className="text-blue-500"/> Solicitar Insumo</h3>
        <p className="text-slate-400 font-bold text-xs uppercase tracking-widest mb-6">Notificar a Caja / Almacén (no afecta tu inventario)</p>
        <div className="space-y-4 mb-6">
          <div>
            <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Artículo (elige del catálogo o escribe uno nuevo)</label>
            <input
              required
              list="lista-insumos-catalogo"
              type="text"
              placeholder="Ej. Aderezo Chipotle"
              value={insumoSelect}
              onChange={e => setInsumoSelect(e.target.value)}
              className="w-full p-4 bg-slate-900 border border-slate-700 rounded-xl outline-none text-white font-bold focus:border-blue-500"
            />
            <datalist id="lista-insumos-catalogo">
              {nombresUnicos.map(nombre => (
                <option key={nombre} value={nombre} />
              ))}
            </datalist>
          </div>
          <div>
            <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Cantidad Necesaria</label>
            <input required type="text" placeholder="Ej: 2 Kilos, 3 Cajas, 5 Piezas" value={cantidad} onChange={e=>setCantidad(e.target.value)} className="w-full p-4 bg-slate-900 border border-slate-700 rounded-xl outline-none text-white font-bold focus:border-blue-500" />
          </div>
        </div>
        <div className="flex gap-4">
          <button type="button" onClick={() => setModalInsumo(false)} className="flex-1 py-4 bg-slate-700 text-white font-black rounded-2xl hover:bg-slate-600 transition active:scale-95">Cancelar</button>
          <button type="submit" className="flex-1 py-4 bg-blue-600 text-white font-black rounded-2xl hover:bg-blue-500 shadow-lg shadow-blue-500/20 transition active:scale-95">Enviar Pedido</button>
        </div>
      </form>
    </div>
  );
};

export default ModalSolicitarInsumo;