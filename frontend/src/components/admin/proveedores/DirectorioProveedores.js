import React, { useState, useEffect, useCallback } from 'react';
import { 
  Truck, Edit, Trash2, Phone, Mail, User, Building2, Package, 
  AlertTriangle, Search, CheckCircle2, Save, XCircle, PlusCircle
} from 'lucide-react';

const DirectorioProveedores = ({ insumosDB, productos, apiUrl, showAlert, showConfirm }) => {
  const [proveedores, setProveedores] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [busqueda, setBusqueda] = useState('');
  
  const [editandoId, setEditandoId] = useState(null);
  
  // Estructura Inicial soportando Múltiples Artículos y Stock Individual
  const initialState = {
    empresa: '', telefono_empresa: '', correo: '', 
    contacto: '', telefono_contacto: '', rfc: '',
    merma_esperada: 0, 
    enviar_email: false, enviar_wa: false,
    articulos_suministrados: [
      { id_interno: Date.now(), tipo_vinculo: 'insumo', vinculo_id: '', unidad_medida: 'PZ', precio_pactado: '', stock_minimo: 0 }
    ]
  };
  
  const [formData, setFormData] = useState(initialState);

  const cargarProveedores = useCallback(async () => {
    try {
      const res = await fetch(`${apiUrl}/proveedores`);
      if (res.ok) {
        const data = await res.json();
        setProveedores(data);
      }
    } catch (e) {
      console.error("Error al cargar proveedores:", e);
    }
    setCargando(false);
  }, [apiUrl]);

  useEffect(() => {
    cargarProveedores();
  }, [cargarProveedores]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const agregarArticulo = () => {
    setFormData(prev => ({
      ...prev,
      articulos_suministrados: [
        ...prev.articulos_suministrados, 
        { id_interno: Date.now(), tipo_vinculo: 'insumo', vinculo_id: '', unidad_medida: 'PZ', precio_pactado: '', stock_minimo: 0 }
      ]
    }));
  };

  const removerArticulo = (id_interno) => {
    setFormData(prev => ({
      ...prev,
      articulos_suministrados: prev.articulos_suministrados.filter(art => art.id_interno !== id_interno)
    }));
  };

  const handleArticuloChange = (id_interno, field, value) => {
    setFormData(prev => ({
      ...prev,
      articulos_suministrados: prev.articulos_suministrados.map(art => 
        art.id_interno === id_interno ? { ...art, [field]: value } : art
      )
    }));
  };

  const prepararEdicion = (prov) => {
    setEditandoId(prov.id);
    
    let articulosParseados = [];
    try {
      if (prov.articulos_suministrados) {
        articulosParseados = typeof prov.articulos_suministrados === 'string' ? JSON.parse(prov.articulos_suministrados) : prov.articulos_suministrados;
      }
      
      // Adaptador para datos legacy
      if (articulosParseados.length === 0 && (prov.insumo_id || prov.producto_id)) {
        articulosParseados = [{
          id_interno: Date.now(),
          tipo_vinculo: prov.producto_id ? 'producto' : 'insumo',
          vinculo_id: prov.producto_id || prov.insumo_id,
          unidad_medida: prov.unidad_medida || 'PZ',
          precio_pactado: prov.precio_pactado || '',
          stock_minimo: prov.stock_minimo_alerta || 0 // Hereda el viejo stock global
        }];
      }
    } catch(e) {
      articulosParseados = [];
    }

    if(articulosParseados.length === 0) {
      articulosParseados = [{ id_interno: Date.now(), tipo_vinculo: 'insumo', vinculo_id: '', unidad_medida: 'PZ', precio_pactado: '', stock_minimo: 0 }];
    }

    setFormData({
      empresa: prov.empresa || '',
      telefono_empresa: prov.telefono_empresa || '',
      correo: prov.correo || '',
      contacto: prov.contacto || '',
      telefono_contacto: prov.telefono_contacto || '',
      rfc: prov.rfc || '',
      merma_esperada: prov.merma_esperada || 0,
      enviar_email: prov.enviar_email || false,
      enviar_wa: prov.enviar_wa || false,
      articulos_suministrados: articulosParseados
    });
  };

  const cancelarEdicion = () => {
    setEditandoId(null);
    setFormData(initialState);
  };

  const guardarProveedor = async (e) => {
    e.preventDefault();
    if (isSubmitting) return;
    setIsSubmitting(true);

    const articulosValidos = formData.articulos_suministrados.filter(a => a.vinculo_id !== '');
    if (articulosValidos.length === 0) {
        setIsSubmitting(false);
        return showAlert("Atención", "Debes vincular al menos un Insumo o Producto a este proveedor.", "warning");
    }

    // Limpiamos los campos legacy a 0 para no romper la BD, la magia ahora vive en articulos_suministrados
    const payload = {
      ...formData,
      stock_minimo_alerta: 0,
      insumo_id: null,
      producto_id: null,
      articulos_suministrados: articulosValidos
    };

    try {
      const url = editandoId ? `${apiUrl}/proveedores/${editandoId}` : `${apiUrl}/proveedores`;
      const method = editandoId ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        showAlert("¡Éxito!", editandoId ? "Proveedor actualizado." : "Proveedor registrado.", "success");
        cancelarEdicion();
        cargarProveedores();
      } else {
        showAlert("Error", "No se pudo guardar el proveedor.", "error");
      }
    } catch (e) {
      showAlert("Error", "Fallo de conexión al servidor.", "error");
    }
    setIsSubmitting(false);
  };

  const eliminarProveedor = (id) => {
    showConfirm("Eliminar Proveedor", "¿Estás seguro de borrar este proveedor? Perderás su configuración de alertas automáticas.", async () => {
      try {
        const res = await fetch(`${apiUrl}/proveedores/${id}`, { method: 'DELETE' });
        if (res.ok) {
          showAlert("Eliminado", "Proveedor borrado con éxito.", "success");
          cargarProveedores();
        } else {
          showAlert("Error", "No se pudo eliminar. Revisa que no tenga facturas pendientes.", "error");
        }
      } catch (error) {
        showAlert("Error", "Fallo de conexión.", "error");
      }
    });
  };

  const proveedoresFiltrados = proveedores.filter(p => 
    p.empresa.toLowerCase().includes(busqueda.toLowerCase()) || 
    (p.contacto && p.contacto.toLowerCase().includes(busqueda.toLowerCase()))
  );

  return (
    <div className="grid grid-cols-1 xl:grid-cols-3 gap-8 animate-in slide-in-from-bottom-4">
      
      {/* ========================================================= */}
      {/* COLUMNA IZQUIERDA: FORMULARIO */}
      {/* ========================================================= */}
      <div className="xl:col-span-1 bg-white p-6 rounded-[32px] shadow-sm border border-slate-200 self-start sticky top-6 max-h-[85vh] overflow-y-auto custom-scrollbar">
        <div className="flex justify-between items-center mb-6 border-b border-slate-100 pb-4 shrink-0">
          <h3 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            {editandoId ? <Edit className="text-orange-500"/> : <Truck className="text-blue-600"/>}
            {editandoId ? 'Editar Proveedor' : 'Nuevo Proveedor'}
          </h3>
          {editandoId && (
            <button type="button" onClick={cancelarEdicion} className="text-slate-400 hover:text-red-500 transition"><XCircle/></button>
          )}
        </div>

        <form onSubmit={guardarProveedor} className="space-y-5">
          
          <div className="space-y-4">
            <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-1"><Building2 size={14}/> Datos de Empresa</h4>
            
            <input required type="text" name="empresa" value={formData.empresa} onChange={handleChange} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-blue-500 font-bold text-slate-700" placeholder="Nombre de la Empresa *" />
            
            <div className="grid grid-cols-2 gap-3">
              <input type="text" name="rfc" value={formData.rfc} onChange={handleChange} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-blue-500 font-bold text-slate-700" placeholder="RFC" />
              <input type="tel" name="telefono_empresa" value={formData.telefono_empresa} onChange={handleChange} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-blue-500 font-bold text-slate-700" placeholder="Tel. Empresa" />
            </div>
            
            <input type="email" name="correo" value={formData.correo} onChange={handleChange} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-blue-500 font-bold text-slate-700" placeholder="Correo Electrónico de Pagos" />
          </div>

          <div className="border-t border-slate-100 my-2"></div>

          <div className="space-y-4">
            <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-1"><User size={14}/> Agente de Ventas (Opcional)</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-1 gap-3">
              <input type="text" name="contacto" value={formData.contacto} onChange={handleChange} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-blue-500 font-bold text-slate-700" placeholder="Nombre del Agente" />
              <input type="tel" name="telefono_contacto" value={formData.telefono_contacto} onChange={handleChange} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-blue-500 font-bold text-slate-700" placeholder="WhatsApp del Agente" />
            </div>
          </div>

          <div className="border-t border-slate-100 my-2"></div>

          <div className="space-y-3 bg-blue-50 p-4 rounded-2xl border border-blue-100">
            <div className="flex justify-between items-center">
                <h4 className="text-xs font-black text-blue-600 uppercase tracking-widest flex items-center gap-1"><Package size={14}/> Catálogo del Proveedor</h4>
            </div>
            
            {formData.articulos_suministrados.map((articulo) => (
                <div key={articulo.id_interno} className="bg-white p-3 rounded-xl border border-blue-200 shadow-sm relative group">
                    {formData.articulos_suministrados.length > 1 && (
                        <button type="button" onClick={() => removerArticulo(articulo.id_interno)} className="absolute -top-2 -right-2 bg-red-100 text-red-500 hover:bg-red-500 hover:text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition shadow-sm">
                            <XCircle size={16}/>
                        </button>
                    )}
                    
                    <div className="flex gap-4 mb-2">
                        <label className="flex items-center gap-1.5 cursor-pointer font-bold text-slate-700 text-xs">
                            <input type="radio" name={`tipo_vinculo_${articulo.id_interno}`} value="insumo" checked={articulo.tipo_vinculo === 'insumo'} onChange={(e) => handleArticuloChange(articulo.id_interno, 'tipo_vinculo', e.target.value)} className="accent-blue-600 w-3 h-3"/>
                            Insumo
                        </label>
                        <label className="flex items-center gap-1.5 cursor-pointer font-bold text-slate-700 text-xs">
                            <input type="radio" name={`tipo_vinculo_${articulo.id_interno}`} value="producto" checked={articulo.tipo_vinculo === 'producto'} onChange={(e) => handleArticuloChange(articulo.id_interno, 'tipo_vinculo', e.target.value)} className="accent-blue-600 w-3 h-3"/>
                            Producto
                        </label>
                    </div>

                    <select required value={articulo.vinculo_id} onChange={(e) => handleArticuloChange(articulo.id_interno, 'vinculo_id', e.target.value)} className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg outline-none font-bold text-slate-700 cursor-pointer text-sm mb-2">
                        <option value="">-- Selecciona el Artículo --</option>
                        {articulo.tipo_vinculo === 'insumo' ? (
                            insumosDB.map(i => <option key={i.id} value={i.id}>{i.nombre} ({i.unidad_medida})</option>)
                        ) : (
                            productos.filter(p => !p.nombre.includes('(Base)')).map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)
                        )}
                    </select>

                    {/* 👇 AQUÍ SE MOVIO EL STOCK MÍNIMO PARA QUE SEA INDIVIDUAL */}
                    <div className="grid grid-cols-3 gap-2">
                        <div>
                            <label className="text-[9px] font-black text-slate-400 uppercase">Unidad Fac.</label>
                            <select value={articulo.unidad_medida} onChange={(e) => handleArticuloChange(articulo.id_interno, 'unidad_medida', e.target.value)} className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg outline-none font-bold text-slate-700 cursor-pointer text-sm mt-1">
                                <option value="PZ">Pieza</option>
                                <option value="KL">Kilos</option>
                                <option value="GR">Gramos</option>
                                <option value="LT">Litros</option>
                                <option value="ML">Mililitros</option>
                                <option value="Caja">Caja</option>
                            </select>
                        </div>
                        <div>
                            <label className="text-[9px] font-black text-slate-400 uppercase">Precio ($)</label>
                            <input type="number" step="any" value={articulo.precio_pactado} onChange={(e) => handleArticuloChange(articulo.id_interno, 'precio_pactado', e.target.value)} className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg outline-none font-bold text-slate-700 mt-1 text-sm" placeholder="0.00" />
                        </div>
                        <div>
                            <label className="text-[9px] font-black text-orange-500 uppercase">Alerta Mínima</label>
                            <input type="number" step="any" value={articulo.stock_minimo} onChange={(e) => handleArticuloChange(articulo.id_interno, 'stock_minimo', e.target.value)} className="w-full p-2.5 bg-orange-50 border border-orange-200 rounded-lg outline-none font-bold text-orange-700 mt-1 text-sm focus:border-orange-500" placeholder="Ej. 5" />
                        </div>
                    </div>
                </div>
            ))}
            
            <button type="button" onClick={agregarArticulo} className="w-full py-2 bg-blue-100 hover:bg-blue-600 text-blue-600 hover:text-white rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition shadow-sm">
                <PlusCircle size={14}/> Agregar otro artículo
            </button>
          </div>

          <div className="space-y-4 bg-orange-50 p-4 rounded-2xl border border-orange-100">
            <h4 className="text-xs font-black text-orange-600 uppercase tracking-widest flex items-center gap-1"><AlertTriangle size={14}/> Método de Alertas de Stock</h4>
            <p className="text-[10px] font-bold text-slate-500 mb-2">Las alertas se enviarán automáticamente cuando el inventario alcance el "Stock Mínimo" de cada artículo.</p>
            
            <div className="flex flex-col gap-2 pt-2 border-t border-orange-200/50">
              <label className="flex items-center gap-3 font-bold text-slate-700 text-sm cursor-pointer">
                <input type="checkbox" name="enviar_email" checked={formData.enviar_email} onChange={handleChange} className="accent-orange-500 w-5 h-5"/>
                Enviar recordatorio por Correo
              </label>
              <label className="flex items-center gap-3 font-bold text-slate-700 text-sm cursor-pointer">
                <input type="checkbox" name="enviar_wa" checked={formData.enviar_wa} onChange={handleChange} className="accent-green-500 w-5 h-5"/>
                Enviar recordatorio por WhatsApp
              </label>
            </div>
          </div>

          <div className="pt-4 pb-12">
            <button disabled={isSubmitting} type="submit" className={`w-full py-4 rounded-2xl font-black text-white text-lg transition active:scale-95 shadow-lg disabled:opacity-50 flex justify-center items-center gap-2 ${editandoId ? 'bg-orange-500 hover:bg-orange-600 shadow-orange-500/30' : 'bg-blue-600 hover:bg-blue-700 shadow-blue-500/30'}`}>
              {isSubmitting ? 'Guardando...' : (editandoId ? 'Actualizar Proveedor' : <><Save size={20}/> Registrar Proveedor</>)}
            </button>
            {editandoId && (
              <button type="button" onClick={cancelarEdicion} className="w-full py-3 mt-3 bg-slate-100 text-slate-600 hover:bg-slate-200 rounded-xl font-bold transition">Cancelar</button>
            )}
          </div>
        </form>
      </div>

      {/* ========================================================= */}
      {/* COLUMNA DERECHA: DIRECTORIO (LISTA) */}
      {/* ========================================================= */}
      <div className="xl:col-span-2">
        <div className="bg-white p-6 rounded-[32px] shadow-sm border border-slate-200 h-full min-h-[600px] flex flex-col">
          
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4 border-b border-slate-100 pb-4 shrink-0">
            <h3 className="text-xl font-black text-slate-800">Proveedores Registrados</h3>
            
            <div className="relative w-full md:w-64">
              <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Buscar empresa o contacto..."
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-blue-500 font-bold text-sm text-slate-600 transition"
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
            {cargando ? (
              <div className="text-center py-20 text-slate-400 font-bold animate-pulse">Cargando directorio...</div>
            ) : proveedoresFiltrados.length === 0 ? (
              <div className="bg-slate-50 border-2 border-dashed border-slate-200 p-12 text-center rounded-3xl mt-4">
                <Truck size={48} className="mx-auto text-slate-300 mb-4"/>
                <p className="text-slate-500 font-bold">No se encontraron proveedores registrados.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {proveedoresFiltrados.map(prov => {
                  
                  let articulosList = [];
                  try {
                      if (prov.articulos_suministrados) {
                          articulosList = typeof prov.articulos_suministrados === 'string' ? JSON.parse(prov.articulos_suministrados) : prov.articulos_suministrados;
                      } else if (prov.insumo_id || prov.producto_id) {
                          articulosList = [{
                              tipo_vinculo: prov.producto_id ? 'producto' : 'insumo',
                              vinculo_id: prov.producto_id || prov.insumo_id,
                              unidad_medida: prov.unidad_medida || 'PZ',
                              precio_pactado: prov.precio_pactado || 0,
                              stock_minimo: prov.stock_minimo_alerta || 0
                          }];
                      }
                  } catch(e) {}

                  return (
                    <div key={prov.id} className={`bg-slate-50 border transition-all rounded-3xl p-5 flex flex-col justify-between ${editandoId === prov.id ? 'border-orange-300 shadow-md bg-orange-50/30' : 'border-slate-200 hover:border-blue-200 hover:shadow-sm'}`}>
                      
                      <div>
                        <div className="flex justify-between items-start mb-2">
                          <h4 className="font-black text-lg text-slate-800 leading-tight pr-2">{prov.empresa}</h4>
                        </div>
                        
                        <div className="mb-4 bg-white p-3 rounded-xl border border-slate-200 shadow-sm space-y-1">
                            <p className="text-[9px] font-black text-blue-500 uppercase tracking-widest mb-1.5 border-b pb-1">Artículos que suministra</p>
                            {articulosList.length === 0 && <p className="text-xs text-slate-400 font-bold">No hay artículos vinculados.</p>}
                            {articulosList.map((art, idx) => {
                                let nombreItem = "Desconocido";
                                if (art.tipo_vinculo === 'insumo') {
                                    const ins = insumosDB.find(i => Number(i.id) === Number(art.vinculo_id));
                                    if (ins) nombreItem = ins.nombre;
                                } else {
                                    const prod = productos.find(p => Number(p.id) === Number(art.vinculo_id));
                                    if (prod) nombreItem = prod.nombre;
                                }
                                return (
                                    <div key={idx} className="flex justify-between items-center py-0.5">
                                        <p className="text-xs font-bold text-slate-700 flex items-center gap-1.5 truncate pr-2">
                                            <Package size={12} className="text-slate-400 shrink-0"/> {nombreItem} <span className="text-[9px] text-slate-400">({art.unidad_medida})</span>
                                        </p>
                                        <div className="text-right shrink-0">
                                            <span className="text-xs font-black text-emerald-600 block leading-none">${Number(art.precio_pactado || 0).toFixed(2)}</span>
                                            {Number(art.stock_minimo) > 0 && <span className="text-[9px] font-black text-orange-500 uppercase tracking-widest">Min: {art.stock_minimo}</span>}
                                        </div>
                                    </div>
                                )
                            })}
                        </div>

                        <div className="space-y-2 mb-4">
                          {prov.contacto && (
                            <p className="text-sm font-bold text-slate-600 flex items-center gap-2">
                              <User size={16} className="text-slate-400"/> {prov.contacto}
                            </p>
                          )}
                          {(prov.telefono_empresa || prov.telefono_contacto) && (
                            <p className="text-sm font-bold text-slate-600 flex items-center gap-2">
                              <Phone size={16} className="text-slate-400"/> {prov.telefono_contacto || prov.telefono_empresa}
                            </p>
                          )}
                          {prov.correo && (
                            <p className="text-sm font-bold text-slate-600 flex items-center gap-2 truncate">
                              <Mail size={16} className="text-slate-400 shrink-0"/> {prov.correo}
                            </p>
                          )}
                        </div>

                        <div className="flex flex-wrap gap-2 mb-4">
                          {prov.enviar_email && <span className="bg-orange-100 text-orange-700 px-2 py-0.5 rounded text-[10px] font-black uppercase flex items-center gap-1"><CheckCircle2 size={10}/> Email Alerta</span>}
                          {prov.enviar_wa && <span className="bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded text-[10px] font-black uppercase flex items-center gap-1"><CheckCircle2 size={10}/> WA Alerta</span>}
                        </div>
                      </div>

                      <div className="flex gap-2 border-t border-slate-200/60 pt-4 mt-auto">
                        <button onClick={() => prepararEdicion(prov)} className="flex-1 bg-white border border-slate-200 text-blue-600 hover:bg-blue-50 hover:border-blue-200 py-2.5 rounded-xl font-bold transition flex justify-center items-center gap-2 text-sm shadow-sm">
                          <Edit size={16}/> Editar
                        </button>
                        <button onClick={() => eliminarProveedor(prov.id)} className="bg-white border border-slate-200 text-red-500 hover:bg-red-50 hover:border-red-200 p-2.5 rounded-xl transition shadow-sm" title="Eliminar Proveedor">
                          <Trash2 size={18}/>
                        </button>
                      </div>

                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default DirectorioProveedores;