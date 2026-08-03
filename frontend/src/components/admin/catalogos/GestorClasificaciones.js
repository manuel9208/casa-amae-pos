import React, { useState } from 'react';
import { Edit, Trash2, Star, Image as ImageIcon, Gift, Clock, CalendarDays, Copy, ChevronRight, ChevronLeft } from 'lucide-react';  

const GestorClasificaciones = ({
  clasificaciones, catalogoIngredientes = [], productos = [],
  EMOJIS_POR_GIRO, baseUrl, apiUrl, refrescarDatos, showAlert, showConfirm
}) => {
  const [editandoClasifId, setEditandoClasifId] = useState(null);
  const [nuevaClasif, setNuevaClasif] = useState('');
  const [nuevaClasifDestino, setNuevaClasifDestino] = useState('Cocina');
  const [nuevaClasifEmoji, setNuevaClasifEmoji] = useState('🍽️');
  const [generaPuntos, setGeneraPuntos] = useState(true);
  const [permiteCanje, setPermiteCanje] = useState(true); 
  const [imagenBlob, setImagenBlob] = useState(null);
  const [imagenPrevio, setImagenPrevio] = useState(null);

  // Estados de Control de Horario
  const [usaHorario, setUsaHorario] = useState(false);
  const [diasDisponibles, setDiasDisponibles] = useState([1, 2, 3, 4, 5, 6, 7]);
  const [horaInicio, setHoraInicio] = useState('00:00');
  const [horaFin, setHoraFin] = useState('23:59');

  // ========================================================
  // 🚀 ESTADOS DEL WIZARD DE CLONACIÓN
  // ========================================================
  const [modalClonar, setModalClonar] = useState(false);
  const [pasoClon, setPasoClon] = useState(1);
  const [clasifOrigen, setClasifOrigen] = useState(null);
  const [clonando, setClonando] = useState(false);
  
  const [clonForm, setClonForm] = useState({
    nombre: '', destino: 'Cocina', emoji: '🍽️', genera_puntos: true, permite_canje: true, usa_horario: false, dias_disponibles: [1,2,3,4,5,6,7], hora_inicio: '00:00', hora_fin: '23:59'
  });
  const [prodsOrigen, setProdsOrigen] = useState([]);
  const [ingsOrigen, setIngsOrigen] = useState([]);
  const [prodsSeleccionados, setProdsSeleccionados] = useState([]);
  const [ingsSeleccionados, setIngsSeleccionados] = useState([]);
  const [modoClon, setModoClon] = useState('exacto'); // 'exacto' o 'limpio'

  const abrirModalClonar = (c) => {
    setClasifOrigen(c);
    setClonForm({
      nombre: `${c.nombre} (Copia)`,
      destino: c.destino || 'Cocina',
      emoji: c.emoji || '🍽️',
      genera_puntos: c.genera_puntos !== false,
      permite_canje: c.permite_canje !== false,
      usa_horario: c.usa_horario === true,
      dias_disponibles: typeof c.dias_disponibles === 'string' ? JSON.parse(c.dias_disponibles) : (c.dias_disponibles || [1,2,3,4,5,6,7]),
      hora_inicio: c.hora_inicio || '00:00',
      hora_fin: c.hora_fin || '23:59'
    });

    const pOrig = productos.filter(p => p.categoria === c.nombre);
    const iOrig = catalogoIngredientes.filter(i => Number(i.clasificacion_id) === Number(c.id));
    setProdsOrigen(pOrig);
    setIngsOrigen(iOrig);
    
    // Por defecto marcamos todo para copiar
    setProdsSeleccionados(pOrig.map(p => p.id));
    setIngsSeleccionados(iOrig.map(i => i.id));
    
    setPasoClon(1);
    setModoClon('exacto');
    setModalClonar(true);
  };

  const ejecutarClonacion = async () => {
    if (!clonForm.nombre.trim()) return showAlert("Error", "El nombre de la nueva categoría es obligatorio.", "warning");
    
    setClonando(true);
    try {
      const payload = {
        origen_id: clasifOrigen.id,
        nueva_clasificacion: clonForm,
        ingredientes_ids: ingsSeleccionados,
        productos_ids: prodsSeleccionados,
        modo_clon: modoClon,
        imagen_url_previa: clasifOrigen.imagen_url
      };

      const res = await fetch(`${apiUrl}/clasificaciones/clonar`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        showAlert("¡Clonación Exitosa!", `La categoría se clonó correctamente con ${prodsSeleccionados.length} platillos.`, "success");
        setModalClonar(false);
        refrescarDatos();
      } else {
        const err = await res.json();
        showAlert("Error", err.error || "No se pudo clonar la categoría.", "error");
      }
    } catch(e) {
      showAlert("Error de Red", "No se pudo conectar con el servidor.", "error");
    }
    setClonando(false);
  };
  // ========================================================

  const prepararEdicionClasif = (c) => {
    setEditandoClasifId(c.id);
    setNuevaClasif(c.nombre);
    setNuevaClasifDestino(c.destino || 'Cocina');
    setNuevaClasifEmoji(c.emoji || '🍽️');
    setGeneraPuntos(c.genera_puntos === false || c.genera_puntos === 'false' ? false : true);
    setPermiteCanje(c.permite_canje === false || c.permite_canje === 'false' ? false : true); 
    setImagenBlob(null);
    setImagenPrevio(c.imagen_url || null); 

    setUsaHorario(c.usa_horario === true || c.usa_horario === 'true');
    try {
      setDiasDisponibles(typeof c.dias_disponibles === 'string' ? JSON.parse(c.dias_disponibles) : (c.dias_disponibles || [1,2,3,4,5,6,7]));
    } catch (e) { setDiasDisponibles([1,2,3,4,5,6,7]); }
    setHoraInicio(c.hora_inicio || '00:00');
    setHoraFin(c.hora_fin || '23:59');
  };  

  const cancelarEdicionClasif = () => {
    setEditandoClasifId(null);
    setNuevaClasif('');
    setNuevaClasifDestino('Cocina');
    setNuevaClasifEmoji('🍽️');
    setGeneraPuntos(true);
    setPermiteCanje(true); 
    setImagenBlob(null);
    setImagenPrevio(null);

    setUsaHorario(false);
    setDiasDisponibles([1, 2, 3, 4, 5, 6, 7]);
    setHoraInicio('00:00');
    setHoraFin('23:59');
  };  

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setImagenBlob(file);
      setImagenPrevio(URL.createObjectURL(file));
    }
  };  

  const guardarClasificacion = async (e) => {
    e.preventDefault();
    const formData = new FormData();
    formData.append('nombre', nuevaClasif);
    formData.append('destino', nuevaClasifDestino);
    formData.append('emoji', nuevaClasifEmoji);
    formData.append('genera_puntos', generaPuntos);
    formData.append('permite_canje', permiteCanje); 
    formData.append('usa_horario', usaHorario);
    formData.append('dias_disponibles', JSON.stringify(diasDisponibles));
    formData.append('hora_inicio', horaInicio);
    formData.append('hora_fin', horaFin);

    if (imagenBlob) formData.append('imagen', imagenBlob);  

    try {
      const url = editandoClasifId ? `${apiUrl}/clasificaciones/${editandoClasifId}` : `${apiUrl}/clasificaciones`;
      const res = await fetch(url, { method: editandoClasifId ? 'PUT' : 'POST', body: formData });
      if (res.ok) {
        showAlert("¡Éxito!", editandoClasifId ? "Clasificación actualizada." : "Clasificación guardada.", "success");
        cancelarEdicionClasif();
        refrescarDatos();
      } else {
        showAlert("Error", "No se pudo guardar la clasificación.", "error");
      }
    } catch(e) {
      showAlert("Error", "Error de conexión al servidor.", "error");
    }
  };  

  const eliminarClasif = (id) => {
    showConfirm("Eliminar Clasificación", "¿Estás seguro que deseas borrar esta clasificación? Sus platillos pasarán a quedar 'Sin Categoría'.", async () => {
      try {
        const res = await fetch(`${apiUrl}/clasificaciones/${id}`, { method: 'DELETE' });
        if (res.ok) {
          showAlert("Eliminada", "La clasificación fue borrada y los platillos ajustados.", "success");
          refrescarDatos();
        } else {
          const data = await res.json();
          showAlert("Error", data.error || "No se pudo eliminar.", "error");
        }
      } catch (error) {
        showAlert("Error", "No se pudo conectar con el servidor.", "error");
      }
    });
  };  

  return (
    <div className="bg-white p-6 md:p-8 rounded-[30px] shadow-sm border border-slate-200 relative animate-in fade-in slide-in-from-bottom-4">
      
      {/* ========================================================== */}
      {/* WIZARD MODAL DE CLONACIÓN */}
      {/* ========================================================== */}
      {modalClonar && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4 animate-in fade-in">
          <div className="bg-white rounded-[40px] w-full max-w-2xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden">
            <div className="bg-slate-50 p-6 border-b border-slate-100 shrink-0">
              <h3 className="text-2xl font-black text-slate-800 flex items-center gap-2">
                <Copy className="text-purple-600"/> Clonar: {clasifOrigen?.nombre}
              </h3>
              <p className="text-slate-500 font-medium text-sm mt-1">Paso {pasoClon} de 4</p>
              
              {/* Barra de progreso */}
              <div className="w-full bg-slate-200 h-2 rounded-full mt-4 overflow-hidden">
                <div className="bg-purple-600 h-full transition-all duration-300" style={{width: `${(pasoClon/4)*100}%`}}></div>
              </div>
            </div>

            <div className="p-6 flex-1 overflow-y-auto custom-scrollbar">
              
              {/* PASO 1: DATOS GENERALES */}
              {pasoClon === 1 && (
                <div className="space-y-4 animate-in slide-in-from-right duration-300">
                  <div>
                    <label className="text-xs font-black text-slate-400 uppercase tracking-widest block mb-2">Nuevo Nombre de la Categoría *</label>
                    <input autoFocus type="text" value={clonForm.nombre} onChange={e => setClonForm({...clonForm, nombre: e.target.value})} className="w-full bg-slate-50 border border-slate-200 text-slate-700 font-bold rounded-2xl p-4 outline-none focus:border-purple-500 transition-all" />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs font-black text-slate-400 uppercase tracking-widest block mb-2">Destino de Comanda</label>
                      <select value={clonForm.destino} onChange={e => setClonForm({...clonForm, destino: e.target.value})} className="w-full bg-slate-50 border border-slate-200 text-slate-700 font-bold rounded-2xl p-4 outline-none focus:border-purple-500 transition-all">
                        <option value="Cocina">Cocina</option>
                        <option value="Barra">Barra</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-xs font-black text-slate-400 uppercase tracking-widest block mb-2">Icono / Emoji</label>
                      <select value={clonForm.emoji} onChange={e => setClonForm({...clonForm, emoji: e.target.value})} className="w-full bg-slate-50 border border-slate-200 text-slate-700 font-bold rounded-2xl p-4 outline-none focus:border-purple-500 transition-all text-2xl text-center">
                        {Object.entries(EMOJIS_POR_GIRO).map(([giro, emojis]) => (
                          <optgroup key={giro} label={giro}>
                            {emojis.map(em => <option key={em} value={em}>{em}</option>)}
                          </optgroup>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>
              )}

              {/* PASO 2: PLATILLOS */}
              {pasoClon === 2 && (
                <div className="animate-in slide-in-from-right duration-300">
                  <div className="flex justify-between items-center mb-4">
                    <p className="text-sm font-black text-slate-700">Selecciona los Platillos a copiar</p>
                    <button type="button" onClick={() => setProdsSeleccionados(prodsSeleccionados.length === prodsOrigen.length ? [] : prodsOrigen.map(p=>p.id))} className="text-xs font-black text-purple-600 hover:text-purple-800 bg-purple-50 px-3 py-1.5 rounded-lg transition">
                      {prodsSeleccionados.length === prodsOrigen.length ? 'Desmarcar Todos' : 'Marcar Todos'}
                    </button>
                  </div>
                  {prodsOrigen.length === 0 ? (
                    <div className="p-8 text-center text-slate-400 font-bold bg-slate-50 rounded-2xl border border-slate-100">No hay platillos en esta categoría.</div>
                  ) : (
                    <div className="space-y-2">
                      {prodsOrigen.map(p => (
                        <label key={p.id} className={`flex items-center gap-3 p-4 rounded-xl border-2 transition cursor-pointer select-none ${prodsSeleccionados.includes(p.id) ? 'bg-purple-50 border-purple-500 text-purple-900' : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'}`}>
                          <input type="checkbox" className="w-5 h-5 accent-purple-600" checked={prodsSeleccionados.includes(p.id)} onChange={(e) => {
                            if(e.target.checked) setProdsSeleccionados([...prodsSeleccionados, p.id]);
                            else setProdsSeleccionados(prodsSeleccionados.filter(id => id !== p.id));
                          }}/>
                          <span className="font-bold">{p.nombre}</span>
                        </label>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* PASO 3: INGREDIENTES Y EXTRAS */}
              {pasoClon === 3 && (
                <div className="animate-in slide-in-from-right duration-300">
                  <div className="flex justify-between items-center mb-4">
                    <p className="text-sm font-black text-slate-700">Selecciona Ingredientes y Extras a copiar</p>
                    <button type="button" onClick={() => setIngsSeleccionados(ingsSeleccionados.length === ingsOrigen.length ? [] : ingsOrigen.map(i=>i.id))} className="text-xs font-black text-purple-600 hover:text-purple-800 bg-purple-50 px-3 py-1.5 rounded-lg transition">
                      {ingsSeleccionados.length === ingsOrigen.length ? 'Desmarcar Todos' : 'Marcar Todos'}
                    </button>
                  </div>
                  {ingsOrigen.length === 0 ? (
                    <div className="p-8 text-center text-slate-400 font-bold bg-slate-50 rounded-2xl border border-slate-100">No hay ingredientes en esta categoría.</div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      {ingsOrigen.map(ing => (
                        <label key={ing.id} className={`flex items-center gap-3 p-3 rounded-xl border-2 transition cursor-pointer select-none ${ingsSeleccionados.includes(ing.id) ? 'bg-purple-50 border-purple-500 text-purple-900' : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'}`}>
                          <input type="checkbox" className="w-5 h-5 accent-purple-600" checked={ingsSeleccionados.includes(ing.id)} onChange={(e) => {
                            if(e.target.checked) setIngsSeleccionados([...ingsSeleccionados, ing.id]);
                            else setIngsSeleccionados(ingsSeleccionados.filter(id => id !== ing.id));
                          }}/>
                          <span className="font-bold text-sm truncate">{ing.nombre}</span>
                        </label>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* PASO 4: CONFIGURACIÓN MODO CLON */}
              {pasoClon === 4 && (
                <div className="animate-in slide-in-from-right duration-300 space-y-4">
                  <h4 className="text-lg font-black text-slate-800 text-center mb-6">Elige el Modo de Copiado</h4>
                  
                  <label className={`block p-6 rounded-3xl border-2 cursor-pointer transition-all ${modoClon === 'exacto' ? 'bg-purple-50 border-purple-600 shadow-md' : 'bg-white border-slate-200 hover:border-purple-300'}`}>
                    <div className="flex items-start gap-4">
                      <input type="radio" name="modo_clon" value="exacto" checked={modoClon === 'exacto'} onChange={() => setModoClon('exacto')} className="w-6 h-6 accent-purple-600 mt-1"/>
                      <div>
                        <p className={`text-xl font-black mb-1 ${modoClon === 'exacto' ? 'text-purple-800' : 'text-slate-700'}`}>Copia Exacta (Recomendado)</p>
                        <p className="text-sm text-slate-500 font-medium">Mantiene la foto, los precios, grupos opcionales, control de stock y reglas de horario idénticas al original.</p>
                      </div>
                    </div>
                  </label>

                  <label className={`block p-6 rounded-3xl border-2 cursor-pointer transition-all ${modoClon === 'limpio' ? 'bg-orange-50 border-orange-500 shadow-md' : 'bg-white border-slate-200 hover:border-orange-300'}`}>
                    <div className="flex items-start gap-4">
                      <input type="radio" name="modo_clon" value="limpio" checked={modoClon === 'limpio'} onChange={() => setModoClon('limpio')} className="w-6 h-6 accent-orange-500 mt-1"/>
                      <div>
                        <p className={`text-xl font-black mb-1 ${modoClon === 'limpio' ? 'text-orange-800' : 'text-slate-700'}`}>Copia Limpia</p>
                        <p className="text-sm text-slate-500 font-medium">Solo copia el nombre, foto y precio base. Elimina recetas, horarios, stock y modificadores para empezar en blanco.</p>
                      </div>
                    </div>
                  </label>
                </div>
              )}

            </div>

            <div className="p-6 bg-slate-50 border-t border-slate-100 flex justify-between gap-4 shrink-0">
              <button disabled={clonando} onClick={() => pasoClon === 1 ? setModalClonar(false) : setPasoClon(p => p - 1)} className="px-6 py-4 rounded-2xl font-black text-slate-600 bg-white border border-slate-200 hover:bg-slate-100 transition active:scale-95 disabled:opacity-50 flex items-center gap-2">
                {pasoClon === 1 ? 'Cancelar' : <><ChevronLeft size={20}/> Atrás</>}
              </button>
              
              {pasoClon < 4 ? (
                <button disabled={clonando} onClick={() => setPasoClon(p => p + 1)} className="flex-1 px-6 py-4 rounded-2xl font-black text-white bg-purple-600 hover:bg-purple-700 transition shadow-lg shadow-purple-500/30 active:scale-95 flex items-center justify-center gap-2">
                  Siguiente <ChevronRight size={20}/>
                </button>
              ) : (
                <button disabled={clonando} onClick={ejecutarClonacion} className="flex-1 px-6 py-4 rounded-2xl font-black text-white bg-purple-600 hover:bg-purple-700 transition shadow-lg shadow-purple-500/30 active:scale-95 flex items-center justify-center gap-2 disabled:opacity-50">
                  {clonando ? 'Clonando...' : <><Copy size={20}/> Finalizar Copiado</>}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
      {/* ========================================================== */}

      {editandoClasifId && (<div className="absolute -top-3 left-6 bg-orange-500 text-white px-4 py-1 rounded-full text-xs font-black shadow-md uppercase tracking-widest">Editando Clasificación</div>)}
      <h3 className="text-xl font-bold mb-6 text-slate-800">Clasificaciones Principales</h3>  
      
      <form onSubmit={guardarClasificacion} className={`flex flex-col gap-4 mb-8 p-6 rounded-3xl border ${editandoClasifId ? 'bg-orange-50 border-orange-200' : 'bg-slate-50 border-slate-100'}`}>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <input required placeholder="Nombre (Ej. Sushis)" value={nuevaClasif} onChange={e => setNuevaClasif(e.target.value)} className="w-full p-4 bg-white border rounded-xl outline-none focus:ring-2 ring-blue-500 font-bold text-slate-700" />
          <select required value={nuevaClasifDestino} onChange={e => setNuevaClasifDestino(e.target.value)} className="w-full p-4 bg-white border rounded-xl outline-none font-bold text-slate-600">
            <option value="Cocina">A Cocina</option>
            <option value="Barra">A Barra</option>
          </select>
          <select required value={nuevaClasifEmoji} onChange={e => setNuevaClasifEmoji(e.target.value)} className="w-full p-4 bg-white border rounded-xl text-center text-2xl outline-none cursor-pointer">
            {Object.entries(EMOJIS_POR_GIRO).map(([giro, emojis]) => (
              <optgroup key={giro} label={giro}>
                {emojis.map(em => <option key={em} value={em}>{em}</option>)}
              </optgroup>
            ))}
          </select>
        </div>  

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="flex items-center gap-4 bg-white p-4 rounded-xl border border-slate-200">
            <label className="flex items-center gap-3 cursor-pointer w-full">
              <div className={`w-12 h-6 rounded-full transition-colors flex items-center px-1 ${generaPuntos ? 'bg-emerald-500' : 'bg-slate-300'}`}>
                <div className={`w-4 h-4 bg-white rounded-full transition-transform ${generaPuntos ? 'translate-x-6' : 'translate-x-0'}`}></div>
              </div>
              <input type="checkbox" className="hidden" checked={generaPuntos} onChange={(e) => setGeneraPuntos(e.target.checked)} />
              <div>
                <p className={`font-black uppercase tracking-widest text-xs flex items-center gap-1.5 ${generaPuntos ? 'text-emerald-600' : 'text-slate-400'}`}>
                  <Star size={14}/> {generaPuntos ? 'Genera Puntos' : 'No da puntos'}
                </p>
                <p className="text-[10px] text-slate-500 font-bold mt-0.5">Acumulan puntos en su compra.</p>
              </div>
            </label>
          </div>

          <div className="flex items-center gap-4 bg-white p-4 rounded-xl border border-slate-200">
            <label className="flex items-center gap-3 cursor-pointer w-full">
              <div className={`w-12 h-6 rounded-full transition-colors flex items-center px-1 ${permiteCanje ? 'bg-indigo-500' : 'bg-slate-300'}`}>
                <div className={`w-4 h-4 bg-white rounded-full transition-transform ${permiteCanje ? 'translate-x-6' : 'translate-x-0'}`}></div>
              </div>
              <input type="checkbox" className="hidden" checked={permiteCanje} onChange={(e) => setPermiteCanje(e.target.checked)} />
              <div>
                <p className={`font-black uppercase tracking-widest text-xs flex items-center gap-1.5 ${permiteCanje ? 'text-indigo-600' : 'text-slate-400'}`}>
                  <Gift size={14}/> {permiteCanje ? 'Canjeable c/ Puntos' : 'Pago Efectivo Obligatorio'}
                </p>
                <p className="text-[10px] text-slate-500 font-bold mt-0.5">El cliente puede pagar esto con puntos.</p>
              </div>
            </label>
          </div>
        </div>

        {/* HORARIO ESPECIAL PARA LA CLASIFICACIÓN COMPLETA */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 transition-all shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-sm font-black text-slate-700 flex items-center gap-2">
                <Clock size={16} className={usaHorario ? "text-blue-600" : "text-slate-400"}/>
                Habilitar Horario Especial
              </p>
              <p className="text-[10px] font-bold text-slate-400">Limita la venta de toda esta categoría a días y horas específicas.</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" className="sr-only peer" checked={usaHorario} onChange={e => setUsaHorario(e.target.checked)} />
              <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
            </label>
          </div>

          {usaHorario && (
            <div className="pt-4 border-t border-slate-100 animate-in fade-in slide-in-from-top-2">
              <div className="mb-4">
                <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 flex items-center gap-1.5"><CalendarDays size={12}/> Días Disponibles</p>
                <div className="flex flex-wrap gap-2">
                  {[
                    { id: 1, label: 'L', name: 'Lunes' }, { id: 2, label: 'M', name: 'Martes' },
                    { id: 3, label: 'M', name: 'Miércoles' }, { id: 4, label: 'J', name: 'Jueves' },
                    { id: 5, label: 'V', name: 'Viernes' }, { id: 6, label: 'S', name: 'Sábado' },
                    { id: 7, label: 'D', name: 'Domingo' }
                  ].map(dia => {
                    const isSelected = diasDisponibles.includes(dia.id);
                    return (
                      <button
                        key={dia.id}
                        type="button"
                        onClick={() => {
                          if (isSelected && diasDisponibles.length === 1) return; // No dejar 0 días
                          setDiasDisponibles(prev => isSelected ? prev.filter(d => d !== dia.id) : [...prev, dia.id].sort());
                        }}
                        className={`w-8 h-8 rounded-full font-black text-xs transition-all shadow-sm ${isSelected ? 'bg-blue-600 text-white shadow-blue-500/30' : 'bg-slate-100 text-slate-400 border border-slate-200 hover:bg-slate-200'}`}
                        title={dia.name}
                      >
                        {dia.label}
                      </button>
                    )
                  })}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Hora Inicio</label>
                  <input type="time" value={horaInicio} onChange={e => setHoraInicio(e.target.value)} className="w-full bg-slate-50 border border-slate-200 text-slate-700 font-bold rounded-xl p-3 outline-none focus:border-blue-500 transition-all" required={usaHorario}/>
                </div>
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Hora Fin</label>
                  <input type="time" value={horaFin} onChange={e => setHoraFin(e.target.value)} className="w-full bg-slate-50 border border-slate-200 text-slate-700 font-bold rounded-xl p-3 outline-none focus:border-blue-500 transition-all" required={usaHorario}/>
                </div>
              </div>
            </div>
          )}
        </div>
        
        <div className="flex flex-col md:flex-row gap-4 items-center mt-2 p-4 bg-white rounded-xl border border-slate-200">
          {imagenPrevio ? (
            <img src={imagenPrevio.startsWith('blob:') || imagenPrevio.startsWith('http') ? imagenPrevio : `${baseUrl}${imagenPrevio}`} alt="Preview" className="w-16 h-16 object-cover rounded-xl shadow-sm shrink-0 border border-slate-200" />
          ) : (
            <div className="w-16 h-16 bg-slate-100 flex items-center justify-center rounded-xl border border-slate-200 shrink-0 text-slate-300">
              <ImageIcon size={24} />
            </div>
          )}  
          <div className="flex-1 w-full">
            <input type="file" accept="image/png, image/jpeg" onChange={handleFileChange} className="w-full text-sm text-slate-500 file:mr-4 file:py-3 file:px-4 file:rounded-xl file:border-0 file:font-bold file:bg-slate-100 file:text-blue-600 file:shadow-sm hover:file:bg-blue-50 transition cursor-pointer" />
            <p className="text-[10px] text-slate-400 font-bold mt-2 ml-1">Sube una imagen si deseas que aparezca en el menú del Kiosco.</p>
          </div>
        </div>  

        <div className="flex flex-col md:flex-row gap-3 mt-2">
          <button type="submit" className={`w-full flex-[2] py-4 rounded-xl font-black transition shadow-sm text-white ${editandoClasifId ? 'bg-orange-500 hover:bg-orange-600' : 'bg-blue-600 hover:bg-blue-700'}`}>
            {editandoClasifId ? 'Guardar Cambios' : 'Agregar Clasificación'}
          </button>
          {editandoClasifId && (
            <button type="button" onClick={cancelarEdicionClasif} className="w-full flex-1 bg-slate-200 text-slate-700 py-4 rounded-xl hover:bg-slate-300 font-black transition">
              Cancelar
            </button>
          )}
        </div>
      </form>  

      <div className="space-y-3 max-h-96 overflow-y-auto pr-2 custom-scrollbar">
        {(clasificaciones || []).map(c => {
          const daPuntos = c.genera_puntos === false || c.genera_puntos === 'false' ? false : true;
          const seCanjea = c.permite_canje === false || c.permite_canje === 'false' ? false : true; 
          const tieneHorario = c.usa_horario === true || c.usa_horario === 'true';

          return (
            <div key={c.id} className={`flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-slate-50 p-4 rounded-2xl border transition hover:border-slate-300 ${editandoClasifId === c.id ? 'border-orange-300 bg-orange-50 shadow-sm' : 'border-slate-100'}`}>
              <div className="flex items-center gap-4 w-full sm:w-auto">
                {c.imagen_url ? (
                  <img src={c.imagen_url?.startsWith('http') ? c.imagen_url : `${baseUrl}${c.imagen_url}`} alt={c.nombre} className="w-16 h-16 object-cover rounded-xl shadow-sm bg-white" />
                ) : (
                  <span className="text-3xl bg-white w-16 h-16 flex items-center justify-center rounded-xl shadow-sm shrink-0">{c.emoji || '🍽️'}</span>
                )}
                <div>
                  <span className="font-black text-xl text-slate-800 block mb-1">{c.nombre}</span>
                  <div className="flex flex-wrap gap-2">
                    <span className={`text-[10px] px-2 py-1 rounded-md font-black uppercase tracking-widest ${c.destino === 'Barra' ? 'bg-blue-100 text-blue-600' : 'bg-orange-100 text-orange-600'}`}>
                      Destino: {c.destino || 'Cocina'}
                    </span>
                    <span className={`text-[10px] px-2 py-1 rounded-md font-black uppercase tracking-widest flex items-center gap-1 ${daPuntos ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-200 text-slate-500'}`}>
                      <Star size={12}/> {daPuntos ? '+ Puntos' : 'Sin Puntos'}
                    </span>
                    <span className={`text-[10px] px-2 py-1 rounded-md font-black uppercase tracking-widest flex items-center gap-1 ${seCanjea ? 'bg-indigo-100 text-indigo-600' : 'bg-slate-200 text-slate-500'}`}>
                      <Gift size={12}/> {seCanjea ? 'Permite Canje' : 'No Canjeable'}
                    </span>
                    {tieneHorario && (
                      <span className="text-[10px] px-2 py-1 rounded-md font-black uppercase tracking-widest flex items-center gap-1 bg-blue-100 text-blue-600">
                        <Clock size={12}/> Horario Especial
                      </span>
                    )}
                  </div>
                </div>
              </div>  
              <div className="flex gap-2 w-full sm:w-auto justify-end mt-2 sm:mt-0">
                
                {/* 👇 NUEVO BOTÓN DE CLONADO */}
                <button onClick={() => abrirModalClonar(c)} className="text-purple-600 hover:text-white bg-purple-50 hover:bg-purple-600 p-3 rounded-xl transition shadow-sm border border-purple-100 hover:border-purple-500" title="Clonar Categoría y Platillos">
                  <Copy size={20}/>
                </button>
                
                <button onClick={() => prepararEdicionClasif(c)} className="text-blue-500 hover:text-white bg-blue-50 hover:bg-blue-500 p-3 rounded-xl transition shadow-sm border border-blue-100 hover:border-blue-500" title="Editar">
                  <Edit size={20}/>
                </button>
                <button onClick={() => eliminarClasif(c.id)} className="text-red-500 hover:text-white bg-red-50 hover:bg-red-500 p-3 rounded-xl transition shadow-sm border border-red-100 hover:border-red-500" title="Eliminar">
                  <Trash2 size={20}/>
                </button>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  );
};  

export default GestorClasificaciones;