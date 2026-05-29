import React, { useState } from 'react';
import { LayoutGrid, PlusCircle, Trash2, QrCode, MapPin, AlertTriangle } from 'lucide-react';

const ListaMesasQR = ({ mesas, apiUrl, cargarMesas, mostrarAlerta, isSubmitting, setIsSubmitting }) => {
  const [nuevaMesa, setNuevaMesa] = useState('');
  const [nuevaZona, setNuevaZona] = useState('Salón Principal');
  
  // Nuevo estado para controlar el modal de confirmación
  const [mesaAEliminar, setMesaAEliminar] = useState(null);

  const crearMesa = async (e) => {
    e.preventDefault();
    if (!nuevaMesa.trim() || isSubmitting) return;
    setIsSubmitting(true);

    try {
      const res = await fetch(`${apiUrl}/mesas`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ numero_mesa: nuevaMesa.trim(), zona: nuevaZona.trim() })
      });

      if (res.ok) {
        mostrarAlerta('Mesa Creada', `La mesa ${nuevaMesa} ha sido agregada con éxito.`);
        setNuevaMesa('');
        cargarMesas();
      } else {
        const data = await res.json();
        mostrarAlerta('Error', data.error || 'No se pudo crear la mesa.', 'error');
      }
    } catch (error) {
      mostrarAlerta('Error', 'Problema de conexión con el servidor.', 'error');
    }
    setIsSubmitting(false);
  };

  // Función que realmente ejecuta el borrado tras confirmar
  const ejecutarEliminacion = async () => {
    if (!mesaAEliminar) return;
    setIsSubmitting(true);
    try {
      const res = await fetch(`${apiUrl}/mesas/${mesaAEliminar.id}`, { method: 'DELETE' });
      if (res.ok) {
        mostrarAlerta('Eliminada', `La mesa ${mesaAEliminar.numero_mesa} fue borrada.`);
        cargarMesas();
      } else {
        mostrarAlerta('Error', 'No se pudo eliminar la mesa.', 'error');
      }
    } catch (error) {
      mostrarAlerta('Error', 'Problema de conexión con el servidor.', 'error');
    }
    setIsSubmitting(false);
    setMesaAEliminar(null); // Cierra el modal
  };

  const descargarQR = async (mesa) => {
    setIsSubmitting(true);
    try {
      const urlEscanear = `${window.location.origin}/?mesa=${encodeURIComponent(mesa.numero_mesa)}`;
      const qrApiUrl = `https://api.qrserver.com/v1/create-qr-code/?size=500x500&data=${encodeURIComponent(urlEscanear)}`;

      const response = await fetch(qrApiUrl);
      const blob = await response.blob();
      const blobUrl = URL.createObjectURL(blob);
      
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = `QR_Mesa_${mesa.numero_mesa}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(blobUrl);

      mostrarAlerta('Descarga Exitosa', `El QR de la Mesa ${mesa.numero_mesa} se ha descargado.`);
    } catch (error) {
      mostrarAlerta('Aviso', 'Bloqueo de navegador. Se abrirá el QR en una nueva pestaña para que lo guardes.', 'error');
      const urlEscanear = `${window.location.origin}/?mesa=${encodeURIComponent(mesa.numero_mesa)}`;
      window.open(`https://api.qrserver.com/v1/create-qr-code/?size=500x500&data=${encodeURIComponent(urlEscanear)}`, '_blank');
    }
    setIsSubmitting(false);
  };

  return (
    <>
      <div className="bg-blue-50 p-6 md:p-8 rounded-3xl border border-blue-100 animate-in fade-in">
        <form onSubmit={crearMesa} className="flex flex-col md:flex-row items-end gap-4">
          <div className="flex-1 w-full">
            <label className="block text-xs font-black text-blue-800 uppercase tracking-widest mb-2">Zona / Área</label>
            <div className="relative">
              <MapPin className="absolute left-4 top-4 text-blue-400" size={20} />
              <input 
                type="text" required disabled={isSubmitting}
                value={nuevaZona} onChange={e => setNuevaZona(e.target.value)}
                className="w-full bg-white border-2 border-blue-200 rounded-xl py-3 pl-12 pr-4 font-bold text-slate-700 outline-none focus:border-blue-500"
                placeholder="Ej. Terraza, Salón, Barra..."
              />
            </div>
          </div>
          <div className="flex-1 w-full">
            <label className="block text-xs font-black text-blue-800 uppercase tracking-widest mb-2">Nombre o Número de Mesa</label>
            <input 
              type="text" required disabled={isSubmitting}
              value={nuevaMesa} onChange={e => setNuevaMesa(e.target.value)}
              className="w-full bg-white border-2 border-blue-200 rounded-xl p-3 font-black text-slate-700 outline-none focus:border-blue-500"
              placeholder="Ej. Mesa 1, VIP 2, Barra 3..."
            />
          </div>
          <button type="submit" disabled={!nuevaMesa.trim() || isSubmitting} className="w-full md:w-auto bg-blue-600 text-white font-black px-8 py-3.5 rounded-xl hover:bg-blue-700 transition shadow-lg shadow-blue-500/30 flex items-center justify-center gap-2 disabled:opacity-50">
            <PlusCircle size={20}/> Agregar Mesa
          </button>
        </form>
      </div>

      <div className="space-y-8 mt-8 animate-in slide-in-from-bottom-4">
        {mesas.length === 0 ? (
          <div className="text-center p-12 bg-white rounded-3xl border border-slate-200 border-dashed">
             <LayoutGrid size={48} className="mx-auto text-slate-300 mb-4" />
             <p className="text-xl font-black text-slate-500">Aún no hay mesas registradas.</p>
             <p className="text-slate-400 font-medium">Agrega tu primera mesa en el formulario de arriba.</p>
          </div>
        ) : (
          Object.entries(
            mesas.reduce((acc, mesa) => {
              if (!acc[mesa.zona]) acc[mesa.zona] = [];
              acc[mesa.zona].push(mesa);
              return acc;
            }, {})
          ).map(([zona, mesasZona]) => (
            <div key={zona} className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200">
              <h3 className="text-xl font-black text-slate-800 uppercase tracking-widest border-b border-slate-100 pb-3 mb-6 flex items-center gap-2">
                <MapPin className="text-blue-500" size={24}/> {zona}
              </h3>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {mesasZona.map(mesa => {
                  const isLibre = mesa.estado === 'Libre';
                  const isOcupada = mesa.estado === 'Ocupada';
                  const isPorPagar = mesa.estado === 'Por Pagar';
                  
                  let bgClass = 'bg-emerald-100 text-emerald-700';
                  if (isOcupada) bgClass = 'bg-orange-100 text-orange-700';
                  if (isPorPagar) bgClass = 'bg-red-100 text-red-700';

                  return (
                  <div key={mesa.id} className="bg-slate-50 border border-slate-200 p-5 rounded-2xl flex flex-col group hover:border-blue-300 transition">
                    <div className="flex justify-between items-start mb-4">
                      <p className="text-2xl font-black text-slate-800">{mesa.numero_mesa}</p>
                      {/* Aquí reemplazamos el window.confirm por el estado del nuevo modal */}
                      <button disabled={isSubmitting} onClick={() => setMesaAEliminar(mesa)} className="text-slate-300 hover:text-red-500 transition disabled:opacity-50">
                        <Trash2 size={20}/>
                      </button>
                    </div>
                    
                    <div className="mb-4">
                      <span className={`text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-md ${bgClass}`}>
                        {isLibre ? '🟩 Libre' : isOcupada ? '🟧 Esperando' : '🟥 Comiendo'}
                      </span>
                      {!isLibre && mesa.numero_pedido && (
                        <p className="text-xs font-bold text-slate-500 mt-2 flex items-center gap-1">
                          <AlertTriangle size={12}/> Orden Activa: #{mesa.numero_pedido}
                        </p>
                      )}
                    </div>

                    <div className="mt-auto pt-4 border-t border-slate-200">
                      <button 
                        disabled={isSubmitting}
                        onClick={() => descargarQR(mesa)} 
                        className="w-full bg-slate-800 text-white font-bold py-2.5 rounded-xl text-sm flex items-center justify-center gap-2 hover:bg-slate-700 shadow-md transition disabled:opacity-50"
                      >
                        <QrCode size={16}/> Descargar QR
                      </button>
                    </div>
                  </div>
                )})}
              </div>
            </div>
          ))
        )}
      </div>

      {/* NUEVO MODAL DE CONFIRMACIÓN DE ELIMINACIÓN */}
      {mesaAEliminar && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4 animate-in fade-in">
          <div className="bg-white rounded-3xl p-8 max-w-sm w-full shadow-2xl border border-red-100">
            <div className="flex justify-center mb-5">
              <div className="bg-red-50 p-4 rounded-full text-red-500">
                <Trash2 size={40} />
              </div>
            </div>
            <h3 className="text-2xl font-black text-slate-800 text-center mb-2">¿Eliminar Mesa?</h3>
            <p className="text-slate-500 text-center font-medium mb-8">
              Estás a punto de borrar permanentemente la mesa <span className="font-black text-red-600">"{mesaAEliminar.numero_mesa}"</span> de la zona <span className="font-bold text-slate-700">{mesaAEliminar.zona}</span>. Esta acción no se puede deshacer.
            </p>
            <div className="flex gap-4">
              <button 
                disabled={isSubmitting}
                onClick={() => setMesaAEliminar(null)} 
                className="flex-1 py-3.5 bg-slate-100 text-slate-600 font-bold rounded-xl hover:bg-slate-200 transition"
              >
                Cancelar
              </button>
              <button 
                disabled={isSubmitting}
                onClick={ejecutarEliminacion} 
                className="flex-1 py-3.5 bg-red-500 text-white font-black rounded-xl hover:bg-red-600 shadow-lg shadow-red-500/30 transition active:scale-95 disabled:opacity-50"
              >
                {isSubmitting ? 'Borrando...' : 'Sí, eliminar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default ListaMesasQR;