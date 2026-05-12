import React, { useState, useEffect, useCallback, useRef } from 'react';
import { LayoutGrid, PlusCircle, Trash2, QrCode, MapPin, CheckCircle2, XCircle, AlertTriangle, Map, Save } from 'lucide-react';

const GestionMesas = ({ apiUrl }) => {
  const [mesas, setMesas] = useState([]);
  const [nuevaMesa, setNuevaMesa] = useState('');
  const [nuevaZona, setNuevaZona] = useState('Salón Principal');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [alerta, setAlerta] = useState(null);

  const [modoPlano, setModoPlano] = useState(false);
  const [zonaPlanoActiva, setZonaPlanoActiva] = useState(''); 
  const [mesaArrastrada, setMesaArrastrada] = useState(null);
  const lienzoRef = useRef(null);

  const cargarMesas = useCallback(async () => {
    try {
      const res = await fetch(`${apiUrl}/mesas`);
      if (res.ok) {
        const data = await res.json();
        const mesasMapeadas = (Array.isArray(data) ? data : []).map(m => ({
           ...m,
           pos_x: Number(m.pos_x) || 0,
           pos_y: Number(m.pos_y) || 0
        }));
        setMesas(mesasMapeadas);
      }
    } catch (error) {
      console.error("Error al cargar mesas:", error);
    }
  }, [apiUrl]);

  useEffect(() => {
    cargarMesas();
  }, [cargarMesas]);

  const mostrarAlerta = (titulo, mensaje, tipo = 'success') => {
    setAlerta({ titulo, mensaje, tipo });
    setTimeout(() => setAlerta(null), 3000);
  };

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

  const eliminarMesa = async (id, numero) => {
    if (!window.confirm(`¿Estás seguro de eliminar la mesa ${numero}?`)) return;
    setIsSubmitting(true);
    try {
      const res = await fetch(`${apiUrl}/mesas/${id}`, { method: 'DELETE' });
      if (res.ok) {
        mostrarAlerta('Eliminada', `La mesa ${numero} fue borrada.`);
        cargarMesas();
      } else {
        mostrarAlerta('Error', 'No se pudo eliminar la mesa.', 'error');
      }
    } catch (error) {
      mostrarAlerta('Error', 'Problema de conexión con el servidor.', 'error');
    }
    setIsSubmitting(false);
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

  // ========================================================
  // LÓGICA DE DRAG AND DROP
  // ========================================================
  const iniciarArrastre = (e, id) => {
    e.target.setPointerCapture(e.pointerId);
    setMesaArrastrada(id);
  };

  const moverMesa = (e) => {
    if (!mesaArrastrada || !lienzoRef.current) return;
    const rect = lienzoRef.current.getBoundingClientRect();
    let x = ((e.clientX - rect.left) / rect.width) * 100;
    let y = ((e.clientY - rect.top) / rect.height) * 100;
    x = Math.max(0, Math.min(x, 90));
    y = Math.max(0, Math.min(y, 90));
    setMesas(prev => prev.map(m => m.id === mesaArrastrada ? { ...m, pos_x: x, pos_y: y } : m));
  };

  const soltarMesa = (e) => {
    if (mesaArrastrada) {
      e.target.releasePointerCapture(e.pointerId);
      setMesaArrastrada(null);
    }
  };

  const guardarPlanoDB = async () => {
    setIsSubmitting(true);
    try {
      const payload = mesas.map(m => ({ id: m.id, pos_x: m.pos_x, pos_y: m.pos_y }));
      const res = await fetch(`${apiUrl}/mesas/posiciones`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        mostrarAlerta('Plano Guardado', 'La nueva distribución de las mesas se ha guardado para los cajeros.');
        setModoPlano(false);
      } else {
        mostrarAlerta('Error', 'No se pudo guardar la posición de las mesas.', 'error');
      }
    } catch (error) {
      mostrarAlerta('Error', 'Problema de red al guardar el plano.', 'error');
    }
    setIsSubmitting(false);
  };

  const activarModoPlano = () => {
     setModoPlano(true);
     const zonasUnicas = [...new Set(mesas.map(m => m.zona))];
     if (zonasUnicas.length > 0) setZonaPlanoActiva(zonasUnicas[0]);
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6 animate-in fade-in pb-12">
      
      {alerta && (
        <div className="fixed top-8 left-1/2 transform -translate-x-1/2 z-[999] animate-in slide-in-from-top-4 fade-in duration-300">
          <div className={`flex items-center gap-3 px-6 py-4 rounded-2xl shadow-2xl border-2 ${
            alerta.tipo === 'success' ? 'bg-emerald-50 border-emerald-500 text-emerald-800' : 'bg-red-50 border-red-500 text-red-800'
          }`}>
            {alerta.tipo === 'success' ? <CheckCircle2 className="text-emerald-500" size={24} /> : <XCircle className="text-red-500" size={24} />}
            <div>
              <p className="font-black text-sm uppercase tracking-widest">{alerta.titulo}</p>
              <p className="font-bold text-sm opacity-80">{alerta.mensaje}</p>
            </div>
          </div>
        </div>
      )}

      {/* HEADER DINÁMICO */}
      <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-3xl font-black text-slate-800 flex items-center gap-3">
            <LayoutGrid className="text-blue-600" size={32} /> {modoPlano ? 'Diseñador de Plano' : 'Mapeo de Mesas y QR'}
          </h2>
          <p className="text-slate-500 font-medium mt-1">
            {modoPlano ? 'Arrastra las mesas para acomodarlas como están en tu restaurante real.' : 'Crea tus mesas por zonas y descarga sus códigos QR.'}
          </p>
        </div>
        
        {mesas.length > 0 && (
          <button 
            onClick={() => modoPlano ? guardarPlanoDB() : activarModoPlano()}
            disabled={isSubmitting}
            className={`px-6 py-3 rounded-xl font-black transition-all shadow-md flex items-center gap-2 ${modoPlano ? 'bg-emerald-500 hover:bg-emerald-600 text-white' : 'bg-indigo-600 hover:bg-indigo-700 text-white'}`}
          >
            {modoPlano ? <><Save size={20}/> Guardar Plano</> : <><Map size={20}/> Diseñar Plano Visual</>}
          </button>
        )}
      </div>

      {modoPlano ? (
        <div className="bg-slate-100 p-4 md:p-8 rounded-3xl border-2 border-slate-300 border-dashed animate-in zoom-in duration-300">
           
           <div className="mb-4 flex flex-col md:flex-row justify-between items-center gap-4">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">💡 Toca y arrastra las mesas</span>
              
              <div className="flex gap-2 overflow-x-auto pb-2 w-full md:w-auto">
                 {[...new Set(mesas.map(m => m.zona))].map(zona => (
                    <button
                       key={zona}
                       onClick={() => setZonaPlanoActiva(zona)}
                       className={`px-6 py-2 rounded-xl font-black text-sm transition-all whitespace-nowrap ${zonaPlanoActiva === zona ? 'bg-indigo-600 text-white shadow-md' : 'bg-white text-slate-500 border border-slate-200 hover:bg-slate-50'}`}
                    >
                       {zona}
                    </button>
                 ))}
              </div>
           </div>

           {/* EL LIENZO */}
           <div 
             ref={lienzoRef}
             onPointerMove={moverMesa}
             onPointerUp={soltarMesa}
             onPointerLeave={soltarMesa} 
             className="relative w-full h-[600px] bg-white rounded-2xl shadow-inner border border-slate-200 overflow-hidden touch-none"
             style={{ backgroundImage: 'radial-gradient(#cbd5e1 1px, transparent 1px)', backgroundSize: '30px 30px' }} 
           >
              {mesas.filter(m => m.zona === zonaPlanoActiva).map(mesa => {
                 // 👇 Solucionado el Warning, eliminamos 'isLibre' que no se usaba
                 const isOcupada = mesa.estado === 'Ocupada';
                 const isPorPagar = mesa.estado === 'Por Pagar';

                 let bgClass = 'bg-emerald-50 border-emerald-300 text-emerald-700 hover:bg-emerald-100';
                 if (isOcupada) bgClass = 'bg-orange-50 border-orange-400 text-orange-700 hover:bg-orange-100 shadow-[0_0_15px_rgba(249,115,22,0.4)]';
                 if (isPorPagar) bgClass = 'bg-red-50 border-red-400 text-red-700 hover:bg-red-100 shadow-[0_0_15px_rgba(239,68,68,0.4)] animate-pulse';

                 return (
                 <div
                   key={mesa.id}
                   onPointerDown={(e) => iniciarArrastre(e, mesa.id)}
                   className={`absolute w-20 h-20 sm:w-24 sm:h-24 rounded-2xl border-4 flex flex-col items-center justify-center cursor-grab active:cursor-grabbing shadow-lg transition-transform ${mesaArrastrada === mesa.id ? 'border-blue-500 bg-blue-100 scale-110 z-50' : `${bgClass} z-10`}`}
                   style={{ left: `${mesa.pos_x}%`, top: `${mesa.pos_y}%`, touchAction: 'none' }}
                 >
                    <span className="font-black text-slate-700 text-center select-none pointer-events-none">
                       {mesa.numero_mesa}
                    </span>
                 </div>
              )})}
           </div>
        </div>
      ) : (
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
                          <button disabled={isSubmitting} onClick={() => eliminarMesa(mesa.id, mesa.numero_mesa)} className="text-slate-300 hover:text-red-500 transition disabled:opacity-50">
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
        </>
      )}

    </div>
  );
};

export default GestionMesas;