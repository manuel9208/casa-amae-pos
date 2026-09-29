import React, { useState, useEffect } from 'react';
import { PackagePlus, XCircle, CheckCircle2, Search, Wallet, Truck, Package, Clock, DollarSign } from 'lucide-react';  

const ModalCompraRapida = ({
  modalCompraRapida, setModalCompraRapida, insumosDB, insumoComprar, setInsumoComprar,
  paquetesComprados, setPaquetesComprados, registrarCompraRapida, isSubmitting
}) => {
  const apiUrlLocal = process.env.REACT_APP_API_URL || (window.location.origin.includes('localhost') ? 'http://localhost:4000/api' : '/api');

  const [tab, setTab] = useState('insumos'); 
  const [busqueda, setBusqueda] = useState('');  

  const [proveedores, setProveedores] = useState([]);
  const [productosLocal, setProductosLocal] = useState([]);
  const [provSeleccionadoId, setProvSeleccionadoId] = useState('');
  const [articulosProv, setArticulosProv] = useState([]);  

  // NUEVOS ESTADOS PARA HISTORIAL DEL DÍA
  const [historialHoy, setHistorialHoy] = useState([]);
  const [cargandoHistorial, setCargandoHistorial] = useState(false);

  // Cargar Catálogos o Historial dependiendo de la pestaña activa
  useEffect(() => {
    if (!modalCompraRapida) return;

    if (tab === 'proveedores') {
      fetch(`${apiUrlLocal}/proveedores`).then(r => r.json()).then(d => setProveedores(d)).catch(() => {});
      fetch(`${apiUrlLocal}/productos`).then(r => r.json()).then(d => setProductosLocal(d)).catch(() => {});
    } 
    else if (tab === 'historial') {
      setCargandoHistorial(true);
      Promise.all([
        fetch(`${apiUrlLocal}/insumos/compras/hoy`).then(r => r.json()),
        fetch(`${apiUrlLocal}/gastos-proveedores`).then(r => r.json())
      ])
      .then(([compras, gastos]) => {
         const hoyIso = new Date().toISOString().split('T')[0];
         // Filtramos únicamente los gastos realizados hoy en la Caja
         const gastosHoy = (gastos || []).filter(g => g.fecha_gasto && g.fecha_gasto.startsWith(hoyIso) && g.origen === 'Caja');

         const historialUnificado = [
           ...compras.map(c => ({ id: `compra_${c.id}`, tipo: 'Insumo', concepto: c.nombre, monto: c.costo_total, hora: c.created_at })),
           ...gastosHoy.map(g => ({ id: `gasto_${g.id}`, tipo: 'Gasto / Envío', concepto: g.concepto, monto: g.monto, hora: g.fecha_gasto }))
         ].sort((a, b) => new Date(b.hora) - new Date(a.hora)); // Más reciente arriba

         setHistorialHoy(historialUnificado);
      })
      .catch(() => {})
      .finally(() => setCargandoHistorial(false));
    }
  }, [modalCompraRapida, tab, apiUrlLocal]);

  if (!modalCompraRapida && !insumoComprar) return null;  

  const insumosFiltrados = (insumosDB || []).filter(insumo =>
    insumo.nombre.toLowerCase().includes(busqueda.toLowerCase())
  );  

  const handleProvChange = (e) => {
    const pId = e.target.value;
    setProvSeleccionadoId(pId);  
    const prov = proveedores.find(p => String(p.id) === String(pId));
    if (prov && prov.articulos_suministrados) {
      const parseados = typeof prov.articulos_suministrados === 'string' ? JSON.parse(prov.articulos_suministrados) : prov.articulos_suministrados;  
      const artsConNombre = parseados.map(a => {
        let nom = 'Desconocido';
        if (a.tipo_vinculo === 'insumo') {
          nom = insumosDB.find(i => Number(i.id) === Number(a.vinculo_id))?.nombre || 'Insumo Eliminado';
        } else {
          nom = productosLocal.find(p => Number(p.id) === Number(a.vinculo_id))?.nombre || 'Producto Eliminado';
        }
        return { ...a, cantidad: '', total: '', nombre_local: nom };
      });
      setArticulosProv(artsConNombre);
    } else {
      setArticulosProv([]);
    }
  };  

  const handleArtCantidad = (idx, val) => {
    const nuevos = [...articulosProv];
    nuevos[idx].cantidad = val;
    if (val && Number(val) > 0) {
      nuevos[idx].total = (Number(val) * Number(nuevos[idx].precio_pactado || 0)).toFixed(2);
    } else {
      nuevos[idx].total = '';
    }
    setArticulosProv(nuevos);
  };  

  const granTotal = articulosProv.reduce((s, a) => s + Number(a.total || 0), 0);
  const totalBultos = articulosProv.reduce((s, a) => s + Number(a.cantidad || 0), 0);  

  const submitProveedor = (e) => {
    e.preventDefault();
    const aComprar = articulosProv.filter(a => Number(a.cantidad) > 0);
    if (aComprar.length === 0) return;  

    registrarCompraRapida({
      tipo_compra: 'proveedor_multi',
      proveedor_id: provSeleccionadoId,
      cantidad_recibida: totalBultos,
      total_pago: granTotal,
      articulos_comprados: aComprar.map(a => ({
        id: a.vinculo_id,
        tipo: a.tipo_vinculo,
        cantidad: Number(a.cantidad),
        total: Number(a.total),
        unidad_medida: a.unidad_medida,
        nombre: a.nombre_local
      }))
    });
  };  

  const cerrarModalSeguro = () => {
    setModalCompraRapida(false);
    setInsumoComprar(null);
    setPaquetesComprados('');
    setTab('insumos');
    setProvSeleccionadoId('');
    setArticulosProv([]);
  };  

  return (
    <>
      {modalCompraRapida && !insumoComprar && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white p-6 md:p-8 rounded-[40px] shadow-2xl border border-slate-200 w-full max-w-4xl h-[85vh] flex flex-col animate-in zoom-in duration-200 overflow-hidden">  
            <div className="flex justify-between items-center border-b pb-4 mb-4 shrink-0">
              <div>
                <h2 className="text-2xl md:text-3xl font-black text-slate-800 flex items-center gap-3">
                  <PackagePlus className="text-emerald-500" size={32} /> Compras y Recepciones
                </h2>
                <p className="text-slate-500 font-bold mt-1 text-sm md:text-base">Registra gastos de caja o recibe mercancía de proveedores.</p>
              </div>
              <button onClick={cerrarModalSeguro} className="bg-slate-100 hover:bg-red-100 text-slate-500 hover:text-red-500 p-3 rounded-full transition shrink-0">
                <XCircle size={28} />
              </button>
            </div>  

            {/* 👇 TABS DE NAVEGACIÓN */}
            <div className="flex bg-slate-100 p-1.5 rounded-2xl mb-6 shrink-0">
              <button onClick={() => { setTab('insumos'); setProvSeleccionadoId(''); }} className={`flex-1 flex flex-col sm:flex-row items-center justify-center gap-2 py-3 rounded-xl font-black text-xs md:text-sm transition-all ${tab === 'insumos' ? 'bg-white shadow-sm text-emerald-600' : 'text-slate-500 hover:text-slate-700'}`}>
                <Wallet size={18}/> <span className="text-center leading-tight">Compra Libre <span className="hidden sm:inline">(Caja)</span></span>
              </button>
              <button onClick={() => setTab('proveedores')} className={`flex-1 flex flex-col sm:flex-row items-center justify-center gap-2 py-3 rounded-xl font-black text-xs md:text-sm transition-all ${tab === 'proveedores' ? 'bg-blue-600 shadow-md text-white' : 'text-slate-500 hover:text-slate-700'}`}>
                <Truck size={18}/> <span className="text-center leading-tight">Recepción <span className="hidden sm:inline">Proveedor</span></span>
              </button>
              <button onClick={() => setTab('historial')} className={`flex-1 flex flex-col sm:flex-row items-center justify-center gap-2 py-3 rounded-xl font-black text-xs md:text-sm transition-all ${tab === 'historial' ? 'bg-slate-800 shadow-md text-white' : 'text-slate-500 hover:text-slate-700'}`}>
                <Clock size={18}/> <span className="text-center leading-tight">Historial <span className="hidden sm:inline">de Hoy</span></span>
              </button>
            </div>  

            {/* =============================================================== */}
            {/* PESTAÑA 1: INSUMOS SUELTOS (CAJA) */}
            {/* =============================================================== */}
            {tab === 'insumos' && (
              <div className="flex flex-col h-full overflow-hidden animate-in slide-in-from-left-4">
                <div className="mb-4 shrink-0 relative">
                  <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input type="text" placeholder="Buscar insumo por nombre..." value={busqueda} onChange={(e) => setBusqueda(e.target.value)} className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-700 outline-none focus:border-emerald-500 transition-all" />
                </div>  
                <div className="flex-1 overflow-y-auto pr-2 bg-slate-50 rounded-2xl border border-slate-100 relative custom-scrollbar">
                  {insumosDB.length === 0 ? (
                    <div className="p-8 text-center text-slate-400 font-bold mt-10">No hay insumos en el catálogo.</div>
                  ) : (
                    <table className="w-full text-left border-collapse">
                      <thead className="sticky top-0 bg-slate-100 z-10 shadow-sm">
                        <tr className="text-[10px] uppercase tracking-widest text-slate-400">
                          <th className="p-4 font-black">Insumo</th>
                          <th className="p-4 font-black text-center">Stock Actual</th>
                          <th className="p-4 font-black text-center">Costo Unit.</th>
                          <th className="p-4 font-black text-right">Acción</th>
                        </tr>
                      </thead>
                      <tbody className="text-sm font-medium text-slate-700 divide-y divide-slate-100 bg-white">
                        {insumosFiltrados.map((insumo) => (
                          <tr key={insumo.id} className="hover:bg-emerald-50/50 transition">
                            <td className="p-4">
                              <p className="font-black text-slate-800 leading-tight">{insumo.nombre}</p>
                              <p className="text-[10px] text-slate-400 font-black tracking-widest mt-0.5">{insumo.cantidad_presentacion} {insumo.unidad_medida}</p>
                            </td>
                            <td className="p-4 text-center">
                              <span className={`font-black px-2.5 py-1 rounded-lg text-[10px] uppercase tracking-widest ${insumo.stock_actual <= 0 ? 'bg-red-100 text-red-600' : 'bg-slate-100 text-slate-600'}`}>
                                {Number(insumo.stock_actual).toFixed(2)} {insumo.unidad_medida === 'PZ' || insumo.unidad_medida === 'Unidad' ? 'PZ' : insumo.unidad_medida === 'KG' || insumo.unidad_medida === 'Kilo' ? 'KL' : 'LT'}
                              </span>
                            </td>
                            <td className="p-4 text-center font-black text-slate-800">
                              ${Number(insumo.costo_presentacion).toFixed(2)}
                            </td>
                            <td className="p-4 text-right">
                              <button onClick={() => { setInsumoComprar(insumo); setPaquetesComprados(''); setBusqueda(''); }} className="bg-emerald-100 text-emerald-700 hover:bg-emerald-500 hover:text-white px-3 py-2 md:px-4 md:py-2 rounded-xl font-black text-xs md:text-sm transition shadow-sm whitespace-nowrap">
                                Registrar
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              </div>
            )}  

            {/* =============================================================== */}
            {/* PESTAÑA 2: RECEPCIÓN DE PROVEEDORES */}
            {/* =============================================================== */}
            {tab === 'proveedores' && (
              <div className="flex flex-col h-full overflow-hidden animate-in slide-in-from-right-4">  
                <div className="mb-4 shrink-0">
                  <label className="text-xs font-black text-slate-400 uppercase tracking-widest block mb-2">Selecciona el Proveedor que llegó</label>
                  <select value={provSeleccionadoId} onChange={handleProvChange} className="w-full bg-blue-50 border border-blue-200 text-blue-800 font-bold rounded-2xl p-4 outline-none focus:border-blue-500 transition-all cursor-pointer">
                    <option value="">-- Selecciona el Proveedor --</option>
                    {proveedores.map(p => <option key={p.id} value={p.id}>{p.empresa} - {p.contacto || 'Sin Contacto'}</option>)}
                  </select>
                </div>  
                <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
                  {provSeleccionadoId && articulosProv.length === 0 && (
                    <div className="p-8 text-center text-red-500 font-bold bg-red-50 rounded-2xl border border-red-100">Este proveedor no tiene artículos en su catálogo. Pide al Administrador que los agregue.</div>
                  )}  
                  {provSeleccionadoId && articulosProv.length > 0 && (
                    <div className="space-y-3">
                      {articulosProv.map((art, idx) => (
                        <div key={idx} className="bg-white p-4 rounded-2xl border border-blue-100 flex flex-col lg:flex-row lg:items-center gap-4 shadow-sm hover:border-blue-300 transition">
                          <div className="flex-1">
                            <p className="font-black text-slate-800 text-lg flex items-center gap-2"><Package size={16} className="text-blue-500"/> {art.nombre_local}</p>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Precio Pactado: <span className="text-slate-600">${Number(art.precio_pactado).toFixed(2)} / {art.unidad_medida}</span></p>
                          </div>  
                          <div className="flex items-center gap-3 shrink-0 bg-slate-50 p-2 rounded-xl border border-slate-100">
                            <div>
                              <label className="text-[9px] font-black text-slate-400 uppercase block mb-1 text-center">Cant. Recibida</label>
                              <input type="number" step="any" min="0" placeholder="0" value={art.cantidad} onChange={e => handleArtCantidad(idx, e.target.value)} className="w-20 md:w-24 p-2.5 bg-white border border-slate-200 text-blue-700 font-black rounded-xl outline-none focus:border-blue-500 text-center shadow-inner" />
                            </div>
                            <div className="text-center font-black text-slate-300 mt-4">=</div>
                            <div>
                              <label className="text-[9px] font-black text-slate-400 uppercase block mb-1 text-center">Total ($)</label>
                              <div className="w-24 md:w-28 p-2.5 bg-slate-100 border border-slate-200 text-slate-500 font-black rounded-xl text-center">
                                ${art.total ? Number(art.total).toFixed(2) : '0.00'}
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>  
                {provSeleccionadoId && articulosProv.length > 0 && (
                  <div className="shrink-0 mt-4 pt-4 border-t border-slate-200 bg-white">
                    <div className="flex justify-between items-center bg-blue-50 p-4 md:p-5 rounded-2xl border border-blue-100 mb-4">
                      <p className="text-sm font-black text-blue-800 uppercase tracking-widest">Gran Total Factura:</p>
                      <p className="text-2xl md:text-4xl font-black text-blue-700">${granTotal.toFixed(2)}</p>
                    </div>
                    <button disabled={isSubmitting || granTotal <= 0} onClick={submitProveedor} className="w-full py-4 bg-blue-600 text-white font-black text-lg rounded-2xl hover:bg-blue-700 shadow-lg shadow-blue-500/30 transition active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2">
                      {isSubmitting ? 'Enviando...' : <><Truck size={20}/> Enviar a Administración</>}
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* =============================================================== */}
            {/* PESTAÑA 3: HISTORIAL DE COMPRAS Y GASTOS DE CAJA DE HOY         */}
            {/* =============================================================== */}
            {tab === 'historial' && (
              <div className="flex flex-col h-full overflow-hidden animate-in slide-in-from-right-4">
                <div className="flex justify-between items-center bg-slate-50 p-4 md:p-5 rounded-2xl border border-slate-200 mb-4 shrink-0">
                   <div>
                      <p className="text-sm md:text-base font-black text-slate-800">Operaciones de Hoy</p>
                      <p className="text-xs font-bold text-slate-500 mt-1">Insumos y Gastos externos retirados de la Caja.</p>
                   </div>
                   <div className="text-right">
                      <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1">Total Extraído</p>
                      <p className="text-2xl font-black text-red-500">
                        ${historialHoy.reduce((acc, curr) => acc + Number(curr.monto || 0), 0).toFixed(2)}
                      </p>
                   </div>
                </div>

                <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
                  {cargandoHistorial ? (
                    <div className="p-8 text-center text-slate-400 font-bold mt-10 animate-pulse flex flex-col items-center gap-2">
                      <Clock size={32} className="animate-spin text-slate-300" />
                      Buscando movimientos del día...
                    </div>
                  ) : historialHoy.length === 0 ? (
                    <div className="p-8 text-center text-slate-400 font-bold mt-10">No se han registrado compras ni gastos el día de hoy.</div>
                  ) : (
                    <div className="space-y-3">
                      {historialHoy.map((mov, idx) => (
                        <div key={idx} className="bg-white p-4 md:p-5 rounded-2xl border border-slate-100 shadow-sm flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 hover:border-slate-300 transition">
                          <div className="flex items-center gap-4">
                            <div className={`p-3 rounded-xl shrink-0 shadow-inner ${mov.tipo === 'Insumo' ? 'bg-emerald-100 text-emerald-600' : 'bg-orange-100 text-orange-600'}`}>
                              {mov.tipo === 'Insumo' ? <Package size={24} /> : <DollarSign size={24} />}
                            </div>
                            <div>
                              <p className="font-black text-slate-800 text-base leading-tight">{mov.concepto}</p>
                              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mt-1.5 flex items-center gap-1.5">
                                 <Clock size={12}/> {new Date(mov.hora).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} 
                                 <span className="opacity-50">•</span> 
                                 <span className={mov.tipo === 'Insumo' ? 'text-emerald-500' : 'text-orange-500'}>{mov.tipo}</span>
                              </p>
                            </div>
                          </div>
                          <div className="text-right sm:text-right shrink-0">
                            <p className="font-black text-slate-700 text-lg">
                               ${Number(mov.monto).toFixed(2)}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}  

      {/* MODAL ORIGINAL DE CANTIDAD PARA INSUMO SUELTO (PAGO DIRECTO EN CAJA) */}
      {insumoComprar && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-[60] p-4">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              registrarCompraRapida({
                insumo_id: insumoComprar.id,
                paquetes_comprados: paquetesComprados,
                nuevo_costo_paquete: insumoComprar.costo_presentacion,
                origen: 'Caja'
              });
            }}
            className="bg-white p-6 md:p-8 rounded-[40px] shadow-2xl border border-slate-200 w-full max-w-md animate-in slide-in-from-bottom-4"
          >
            <h2 className="text-2xl font-black text-slate-800 mb-1">Pago Directo de Caja</h2>
            <p className="text-slate-500 font-bold mb-6 pb-4 border-b">
              Insumo: <span className="text-emerald-600">{insumoComprar.nombre}</span> ({insumoComprar.cantidad_presentacion} {insumoComprar.unidad_medida})
            </p>  
            <div className="space-y-6 mb-8">
              <div>
                <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Paquetes / Cajas Compradas</label>
                <input
                  type="number" min="0.1" step="0.1" required autoFocus disabled={isSubmitting}
                  value={paquetesComprados} onChange={(e) => setPaquetesComprados(e.target.value)}
                  className="w-full bg-slate-50 border-2 border-slate-200 rounded-2xl p-4 text-center text-3xl font-black outline-none focus:border-emerald-500 text-slate-800 disabled:opacity-50"
                  placeholder="Ej. 2"
                />
              </div>
              <div>
                <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Costo Fijo del Paquete ($)</label>
                <div className="w-full bg-slate-100 border border-slate-200 rounded-2xl p-4 text-center text-2xl font-black text-slate-500 cursor-not-allowed">
                  ${Number(insumoComprar.costo_presentacion) ? Number(insumoComprar.costo_presentacion).toFixed(2) : '0.00'}
                </div>
              </div>
              <div className="bg-emerald-50 border border-emerald-100 p-6 rounded-3xl text-center">
                <p className="text-xs font-black text-emerald-600 uppercase tracking-widest mb-1">Se descontará de caja:</p>
                <p className="text-5xl font-black text-emerald-700">
                  ${paquetesComprados && Number(insumoComprar.costo_presentacion) ? (Number(paquetesComprados) * Number(insumoComprar.costo_presentacion)).toFixed(2) : '0.00'}
                </p>
              </div>
            </div>  
            <div className="flex gap-4">
              <button disabled={isSubmitting} type="button" onClick={cerrarModalSeguro} className="flex-1 py-5 bg-slate-100 text-slate-600 font-black rounded-2xl hover:bg-slate-200 transition disabled:opacity-50">Cancelar</button>
              <button type="submit" disabled={!paquetesComprados || Number(paquetesComprados) <= 0 || isSubmitting} className="flex-[2] py-5 bg-emerald-500 text-white font-black text-xl rounded-2xl disabled:opacity-50 hover:bg-emerald-600 shadow-lg shadow-emerald-500/30 transition flex justify-center items-center gap-2"><CheckCircle2 size={24}/> {isSubmitting ? 'Guardando...' : 'Confirmar'}</button>
            </div>
          </form>
        </div>
      )}
    </>
  );
};  

export default ModalCompraRapida;