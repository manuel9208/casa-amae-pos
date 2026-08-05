import React, { useState, useEffect, useCallback } from 'react';
import { 
  Receipt, CheckCircle2, Search, Filter, Calendar as CalendarIcon, 
  MessageCircle, Download, Clock, DollarSign, ArrowRight, Plus, XCircle, Save, Truck, Package, Trash2
} from 'lucide-react';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

// 👇 FIX: Aseguramos recibir configGlobal en las props
const ControlGastos = ({ apiUrl, showAlert, showConfirm, insumosDB = [], productos = [], configGlobal = {} }) => {
  const [gastos, setGastos] = useState([]);
  const [proveedoresLista, setProveedoresLista] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Filtros
  const [filtroTexto, setFiltroTexto] = useState('');
  const [filtroEstado, setFiltroEstado] = useState('Todos'); 
  const [filtroTiempo, setFiltroTiempo] = useState('mes'); 

  const [modalNuevaFactura, setModalNuevaFactura] = useState(false);
  const [formFactura, setFormFactura] = useState({
    proveedor_id: '', estado: 'Aprobado', articulos: []
  });

  const cargarGastos = useCallback(async () => {
    try {
      const res = await fetch(`${apiUrl}/gastos-proveedores`);
      if (res.ok) {
        const data = await res.json();
        setGastos(data);
      }
    } catch (e) { console.error("Error al cargar facturas:", e); }
    setCargando(false);
  }, [apiUrl]);

  const cargarProveedores = useCallback(async () => {
    try {
      const res = await fetch(`${apiUrl}/proveedores`);
      if (res.ok) {
        const data = await res.json();
        setProveedoresLista(data);
      }
    } catch (e) {}
  }, [apiUrl]);

  useEffect(() => {
    cargarGastos();
    cargarProveedores();
  }, [cargarGastos, cargarProveedores]);

  const getNombreArticulo = (art) => {
    if (art.tipo_vinculo === 'insumo') {
      const ins = insumosDB.find(i => Number(i.id) === Number(art.vinculo_id));
      return ins ? ins.nombre : 'Insumo Desconocido';
    } else {
      const prod = productos.find(p => Number(p.id) === Number(art.vinculo_id));
      return prod ? prod.nombre : 'Producto Desconocido';
    }
  };

  const handleProveedorChange = (e) => {
    const provId = e.target.value;
    const provSeleccionado = proveedoresLista.find(p => String(p.id) === String(provId));
    
    let artsAgregados = [];
    if (provSeleccionado && provSeleccionado.articulos_suministrados) {
      const parseados = typeof provSeleccionado.articulos_suministrados === 'string' ? JSON.parse(provSeleccionado.articulos_suministrados) : provSeleccionado.articulos_suministrados;
      
      artsAgregados = parseados.map(a => ({
        ...a,
        cantidad: '',
        total: ''
      }));
    }

    setFormFactura({
      ...formFactura,
      proveedor_id: provId,
      articulos: artsAgregados
    });
  };

  const handleCantidadArticulo = (index, cantidadVal) => {
    const nuevosArticulos = [...formFactura.articulos];
    nuevosArticulos[index].cantidad = cantidadVal;
    
    if (cantidadVal && Number(cantidadVal) > 0) {
      nuevosArticulos[index].total = (Number(cantidadVal) * Number(nuevosArticulos[index].precio_pactado || 0)).toFixed(2);
    } else {
      nuevosArticulos[index].total = '';
    }

    setFormFactura({ ...formFactura, articulos: nuevosArticulos });
  };

  const gastosFiltrados = gastos.filter(gasto => {
    const matchTexto = (gasto.empresa || '').toLowerCase().includes(filtroTexto.toLowerCase()) || (gasto.origen || '').toLowerCase().includes(filtroTexto.toLowerCase());
    const matchEstado = filtroEstado === 'Todos' || gasto.estado === filtroEstado;
    let matchTiempo = true;
    const fechaGasto = new Date(gasto.fecha_compra);
    const hoy = new Date();
    
    if (filtroTiempo === 'dia') matchTiempo = fechaGasto.toDateString() === hoy.toDateString();
    else if (filtroTiempo === 'semana') matchTiempo = Math.round(Math.abs((hoy - fechaGasto) / (24*60*60*1000))) <= 7;
    else if (filtroTiempo === 'mes') matchTiempo = fechaGasto.getMonth() === hoy.getMonth() && fechaGasto.getFullYear() === hoy.getFullYear();
    else if (filtroTiempo === 'anio') matchTiempo = fechaGasto.getFullYear() === hoy.getFullYear();

    return matchTexto && matchEstado && matchTiempo;
  });

  const totalPendiente = gastosFiltrados.filter(g => g.estado === 'Pendiente').reduce((sum, g) => sum + Number(g.total_pago), 0);
  const totalAprobado = gastosFiltrados.filter(g => g.estado === 'Aprobado').reduce((sum, g) => sum + Number(g.total_pago), 0);

  const aprobarFactura = (gasto) => {
    showConfirm("Aprobar Factura", `¿Estás seguro de aprobar esta factura por $${gasto.total_pago}? \n\nAl confirmar, el sistema sumará automáticamente el stock a tu inventario y enviará un correo de confirmación al proveedor.`, async () => {
      setIsSubmitting(true);
      try {
        const res = await fetch(`${apiUrl}/gastos-proveedores/${gasto.id}/estado`, {
          method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ estado: 'Aprobado' })
        });
        if (res.ok) {
          showAlert("Factura Aprobada", "El inventario ha sido actualizado con éxito.", "success");
          cargarGastos();
        } else {
          showAlert("Error", "No se pudo aprobar la factura.", "error");
        }
      } catch (error) { showAlert("Error", "Fallo de conexión.", "error"); }
      setIsSubmitting(false);
    });
  };

  // 👇 SOLUCIÓN 1: Función para ELIMINAR facturas
  const eliminarFactura = (gasto) => {
    const advExtra = gasto.estado === 'Aprobado' ? '\n\n⚠️ ATENCIÓN: Como esta factura ya estaba Aprobada, al borrarla se DESCONTARÁ automáticamente de tu inventario el stock que se había sumado.' : '';
    showConfirm("Eliminar Factura", `¿Estás seguro de borrar esta factura de ${gasto.empresa}?${advExtra}`, async () => {
      setIsSubmitting(true);
      try {
        const res = await fetch(`${apiUrl}/gastos-proveedores/${gasto.id}`, { method: 'DELETE' });
        if (res.ok) {
          showAlert("Eliminada", "La factura ha sido borrada y el stock ajustado.", "success");
          cargarGastos();
        } else {
          showAlert("Error", "No se pudo eliminar la factura.", "error");
        }
      } catch(e) {
        showAlert("Error", "Fallo de conexión.", "error");
      }
      setIsSubmitting(false);
    });
  };

  const registrarFacturaAdmin = async (e) => {
    e.preventDefault();
    if (isSubmitting) return;
    
    const articulosAComprar = formFactura.articulos.filter(a => Number(a.cantidad) > 0);
    
    if (articulosAComprar.length === 0) {
      return showAlert("Atención", "Debes ingresar la cantidad recibida en al menos un artículo.", "warning");
    }

    // 👇 SOLUCIÓN 3: Cálculo matemático en vivo justo antes del envío (Evita los 0 bultos)
    const calcBultos = articulosAComprar.reduce((sum, a) => sum + Number(a.cantidad), 0);
    const calcTotal = articulosAComprar.reduce((sum, a) => sum + Number(a.total), 0);

    // 👇 SOLUCIÓN 2: Validación de SMTP si el proveedor lo exige
    const proveedorData = proveedoresLista.find(p => String(p.id) === String(formFactura.proveedor_id));
    if (proveedorData && proveedorData.enviar_email && formFactura.estado === 'Aprobado') {
        if (!configGlobal.smtp_prov_email || !configGlobal.smtp_prov_pass) {
            return showAlert("Falta Configuración SMTP", "El proveedor exige notificación por correo, pero no has configurado la cuenta (SMTP) en el engrane de Configuración de Proveedores.", "warning");
        }
    }

    setIsSubmitting(true);
    try {
      const payload = {
        proveedor_id: formFactura.proveedor_id,
        cantidad_recibida: calcBultos, // 👈 Inyección del cálculo matemático exacto
        total_pago: calcTotal,         // 👈 Inyección del cálculo matemático exacto
        origen: 'Administración',
        estado: 'Pendiente',
        articulos_comprados: articulosAComprar.map(a => ({
           id: a.vinculo_id,
           tipo: a.tipo_vinculo,
           cantidad: Number(a.cantidad),
           total: Number(a.total),
           unidad_medida: a.unidad_medida,
           nombre: getNombreArticulo(a)
        }))
      };

      const res = await fetch(`${apiUrl}/gastos-proveedores`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload)
      });

      if (res.ok) {
        const nuevoGasto = await res.json();
        
        if (formFactura.estado === 'Aprobado') {
          await fetch(`${apiUrl}/gastos-proveedores/${nuevoGasto.id}/estado`, {
            method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ estado: 'Aprobado' })
          });
          showAlert("¡Factura Pagada!", "Compra registrada, stock sumado e email enviado (si aplica).", "success");
        } else {
          showAlert("Factura Pendiente", "Compra registrada. Queda a la espera de pago/recepción.", "info");
        }
        
        setModalNuevaFactura(false);
        setFormFactura({ proveedor_id: '', estado: 'Aprobado', articulos: [] });
        cargarGastos();
      } else {
        showAlert("Error", "No se pudo registrar la factura.", "error");
      }
    } catch (error) { showAlert("Error", "Fallo de conexión.", "error"); }
    setIsSubmitting(false);
  };

  const contactarWhatsApp = (gasto) => {
    const telefono = gasto.telefono_contacto || gasto.telefono_empresa;
    if (!telefono) return showAlert("Sin Teléfono", "Este proveedor no tiene un número de contacto registrado.", "warning");
    
    const mensaje = `Hola ${gasto.contacto || gasto.empresa}, te confirmamos que la recepción de tu mercancía de fecha ${new Date(gasto.fecha_compra).toLocaleDateString('es-MX')} por la cantidad de $${Number(gasto.total_pago).toFixed(2)} ha sido ACEPTADA y procesada en nuestro sistema. ¡Gracias!`;
    const url = `https://wa.me/52${telefono.replace(/\D/g, '')}?text=${encodeURIComponent(mensaje)}`;
    window.open(url, '_blank');
  };

  const generarPDF = () => {
    const doc = new jsPDF();
    doc.setFontSize(18); doc.setTextColor(37, 99, 235);
    doc.text('Reporte de Control de Gastos y Proveedores', 14, 22);
    doc.setFontSize(10); doc.setTextColor(100, 116, 139);
    doc.text(`Filtro aplicado: ${filtroTiempo.toUpperCase()} | Estado: ${filtroEstado}`, 14, 30);
    doc.text(`Generado el: ${new Date().toLocaleString('es-MX')}`, 14, 36);
    doc.setFontSize(12); doc.setTextColor(15, 23, 42);
    doc.text(`Total Pendiente por Pagar: $${totalPendiente.toFixed(2)}`, 14, 46);
    doc.text(`Total Pagado / Aprobado: $${totalAprobado.toFixed(2)}`, 14, 52);

    const tableColumn = ["Fecha", "Proveedor", "Origen", "Cantidad", "Total ($)", "Estado"];
    const tableRows = [];
    gastosFiltrados.forEach(gasto => {
      tableRows.push([
        new Date(gasto.fecha_compra).toLocaleDateString('es-MX'),
        gasto.empresa, gasto.origen, `${gasto.cantidad_recibida}`, `$${Number(gasto.total_pago).toFixed(2)}`, gasto.estado
      ]);
    });

    doc.autoTable({ head: [tableColumn], body: tableRows, startY: 60, theme: 'grid', headStyles: { fillColor: [37, 99, 235], textColor: [255, 255, 255] }, alternateRowStyles: { fillColor: [248, 250, 252] } });
    doc.save(`Reporte_Gastos_${filtroTiempo}.pdf`);
  };

  return (
    <div className="space-y-6 animate-in slide-in-from-bottom-4">
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-orange-50 border border-orange-200 p-6 rounded-[32px] flex items-center justify-between shadow-sm">
          <div>
            <p className="text-xs font-black text-orange-500 uppercase tracking-widest flex items-center gap-1.5 mb-1"><Clock size={14}/> Pendiente por Aprobar / Pagar</p>
            <p className="text-4xl font-black text-orange-700">${totalPendiente.toFixed(2)}</p>
          </div>
          <div className="bg-orange-200 text-orange-600 p-4 rounded-2xl"><Receipt size={32}/></div>
        </div>
        <div className="bg-emerald-50 border border-emerald-200 p-6 rounded-[32px] flex items-center justify-between shadow-sm">
          <div>
            <p className="text-xs font-black text-emerald-500 uppercase tracking-widest flex items-center gap-1.5 mb-1"><CheckCircle2 size={14}/> Total Aprobado / Pagado</p>
            <p className="text-4xl font-black text-emerald-700">${totalAprobado.toFixed(2)}</p>
          </div>
          <div className="bg-emerald-200 text-emerald-600 p-4 rounded-2xl"><DollarSign size={32}/></div>
        </div>
      </div>

      <div className="bg-white border border-slate-200 shadow-sm p-6 rounded-[32px]">
        
        <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4 mb-6 border-b border-slate-100 pb-6">
          <div className="flex flex-col sm:flex-row gap-3 w-full xl:w-auto">
            <div className="relative w-full sm:w-64 shrink-0">
              <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
              <input type="text" placeholder="Buscar factura..." value={filtroTexto} onChange={e => setFiltroTexto(e.target.value)} className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-600 outline-none focus:border-blue-500 transition-all"/>
            </div>
            <div className="relative w-full sm:w-48 shrink-0">
              <CalendarIcon size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
              <select value={filtroTiempo} onChange={e => setFiltroTiempo(e.target.value)} className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-600 outline-none focus:border-blue-500 transition-all cursor-pointer appearance-none">
                <option value="dia">Hoy</option><option value="semana">Últimos 7 días</option><option value="mes">Este Mes</option><option value="anio">Este Año</option><option value="todos">Histórico Completo</option>
              </select>
            </div>
            <div className="relative w-full sm:w-48 shrink-0">
              <Filter size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
              <select value={filtroEstado} onChange={e => setFiltroEstado(e.target.value)} className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-600 outline-none focus:border-blue-500 transition-all cursor-pointer appearance-none">
                <option value="Todos">Todos los Estados</option><option value="Pendiente">Solo Pendientes</option><option value="Aprobado">Solo Aprobados</option>
              </select>
            </div>
          </div>

          <div className="flex gap-2 w-full xl:w-auto">
            <button onClick={() => setModalNuevaFactura(true)} className="flex-1 xl:flex-none bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-500/30 px-6 py-3 rounded-xl font-black transition-all flex justify-center items-center gap-2 active:scale-95 shrink-0">
              <Plus size={18}/> Nueva Factura
            </button>
            <button onClick={generarPDF} className="flex-1 xl:flex-none bg-slate-100 text-blue-600 border border-slate-200 hover:bg-slate-200 px-6 py-3 rounded-xl font-black transition-all flex justify-center items-center gap-2 active:scale-95 shrink-0">
              <Download size={18}/> PDF
            </button>
          </div>
        </div>

        <div className="overflow-x-auto custom-scrollbar min-h-[400px]">
          {cargando ? (
            <div className="text-center py-20 text-slate-400 font-bold animate-pulse">Cargando facturas...</div>
          ) : gastosFiltrados.length === 0 ? (
            <div className="bg-slate-50 border-2 border-dashed border-slate-200 p-12 text-center rounded-3xl mt-4">
              <Receipt size={48} className="mx-auto text-slate-300 mb-4"/>
              <p className="text-slate-500 font-bold">No se encontraron facturas o gastos con estos filtros.</p>
            </div>
          ) : (
            <table className="w-full text-left min-w-[800px]">
              <thead className="bg-slate-50 text-slate-400 text-[10px] uppercase font-black tracking-widest">
                <tr>
                  <th className="p-4 rounded-tl-xl">Fecha y Origen</th>
                  <th className="p-4">Proveedor y Detalles</th>
                  <th className="p-4 text-center">Bultos Totales</th>
                  <th className="p-4 text-right">Total Facturado</th>
                  <th className="p-4 text-center">Estado</th>
                  <th className="p-4 text-center rounded-tr-xl">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {gastosFiltrados.map(g => {
                  let detallesJson = [];
                  try { detallesJson = typeof g.articulos_comprados === 'string' ? JSON.parse(g.articulos_comprados) : (g.articulos_comprados || []); } catch(e){}

                  return (
                    <tr key={g.id} className="hover:bg-slate-50/50 transition group">
                      <td className="p-4">
                        <p className="font-bold text-slate-700">{new Date(g.fecha_compra).toLocaleDateString('es-MX', {day: '2-digit', month: 'short', year: 'numeric'})}</p>
                        <p className="text-xs font-black text-slate-400 mt-0.5">{new Date(g.fecha_compra).toLocaleTimeString('es-MX', {hour: '2-digit', minute:'2-digit'})} • Por: <span className="text-blue-500">{g.origen}</span></p>
                      </td>
                      <td className="p-4">
                        <p className="font-black text-slate-800 flex items-center gap-1.5"><Truck size={14} className="text-blue-500"/> {g.empresa}</p>
                        <div className="mt-1 space-y-0.5">
                          {detallesJson.map((d, i) => (
                            <p key={i} className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                              • {d.cantidad}x {d.nombre} <span className="text-slate-300">({d.unidad_medida})</span>
                            </p>
                          ))}
                          {detallesJson.length === 0 && <p className="text-[10px] font-bold text-slate-400">Recepción global (Sin detalle)</p>}
                        </div>
                      </td>
                      <td className="p-4 text-center">
                        <span className="bg-slate-100 text-slate-600 px-3 py-1 rounded-lg font-black text-sm">{g.cantidad_recibida}</span>
                      </td>
                      <td className="p-4 text-right">
                        <span className="text-lg font-black text-slate-800">${Number(g.total_pago).toFixed(2)}</span>
                      </td>
                      <td className="p-4 text-center">
                        <span className={`px-3 py-1 rounded-lg text-xs font-black uppercase tracking-widest inline-flex items-center gap-1 ${g.estado === 'Aprobado' ? 'bg-emerald-100 text-emerald-700' : 'bg-orange-100 text-orange-600'}`}>
                          {g.estado === 'Aprobado' ? <CheckCircle2 size={12}/> : <Clock size={12}/>}
                          {g.estado}
                        </span>
                      </td>
                      <td className="p-4">
                        <div className="flex justify-center items-center gap-2">
                          
                          {g.estado === 'Pendiente' && (
                            <button disabled={isSubmitting} onClick={() => aprobarFactura(g)} className="bg-emerald-50 text-emerald-600 border border-emerald-200 hover:bg-emerald-500 hover:text-white px-3 py-2 rounded-xl font-bold text-xs transition flex items-center gap-1 shadow-sm disabled:opacity-50" title="Aprobar e Ingresar a Stock">
                              Aprobar <ArrowRight size={14}/>
                            </button>
                          )}

                          <button onClick={() => contactarWhatsApp(g)} className="bg-white border border-slate-200 text-emerald-500 hover:bg-emerald-50 p-2 rounded-xl transition shadow-sm" title="Notificar por WhatsApp">
                            <MessageCircle size={18}/>
                          </button>
                          
                          {/* 👇 NUEVO BOTÓN: Eliminar Factura */}
                          <button disabled={isSubmitting} onClick={() => eliminarFactura(g)} className="bg-white border border-slate-200 text-red-500 hover:bg-red-50 p-2 rounded-xl transition shadow-sm disabled:opacity-50" title="Eliminar Factura">
                            <Trash2 size={18}/>
                          </button>

                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </div>

      </div>

      {modalNuevaFactura && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4 animate-in fade-in">
          <form onSubmit={registrarFacturaAdmin} className="bg-white rounded-[40px] w-full max-w-2xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden animate-in zoom-in-95">
            
            <div className="bg-slate-50 p-6 border-b border-slate-100 flex justify-between items-center shrink-0">
              <div>
                <h3 className="text-2xl font-black text-slate-800 flex items-center gap-2">
                  <Receipt className="text-blue-600"/> Registrar Compra / Factura
                </h3>
                <p className="text-slate-500 font-bold text-sm mt-1">Sube el stock seleccionando lo que te entregó el proveedor.</p>
              </div>
              <button type="button" onClick={() => setModalNuevaFactura(false)} className="text-slate-400 hover:text-red-500 hover:bg-red-50 p-2 rounded-full transition">
                <XCircle size={28}/>
              </button>
            </div>

            <div className="p-6 space-y-6 overflow-y-auto custom-scrollbar flex-1">
              
              <div>
                <label className="text-xs font-black text-slate-400 uppercase tracking-widest block mb-2">Proveedor Asociado *</label>
                <select required value={formFactura.proveedor_id} onChange={handleProveedorChange} className="w-full bg-slate-50 border border-slate-200 text-slate-700 font-bold rounded-2xl p-4 outline-none focus:border-blue-500 transition-all cursor-pointer">
                  <option value="">-- Selecciona el Proveedor --</option>
                  {proveedoresLista.map(p => (
                    <option key={p.id} value={p.id}>{p.empresa} - {p.contacto || 'Sin Contacto'}</option>
                  ))}
                </select>
                {proveedoresLista.length === 0 && <p className="text-xs text-red-500 font-bold mt-2">No tienes proveedores registrados. Ve al directorio primero.</p>}
              </div>

              {formFactura.proveedor_id && (
                <div className="space-y-3 bg-blue-50 p-5 rounded-3xl border border-blue-100">
                  <h4 className="text-xs font-black text-blue-600 uppercase tracking-widest flex items-center gap-1 mb-4"><Package size={14}/> Artículos en esta Factura</h4>
                  
                  {formFactura.articulos.length === 0 ? (
                    <p className="text-xs font-bold text-red-500">Este proveedor no tiene artículos registrados en su catálogo.</p>
                  ) : (
                    formFactura.articulos.map((art, idx) => (
                      <div key={idx} className="bg-white p-4 rounded-2xl border border-blue-200 flex flex-col md:flex-row md:items-center gap-4 shadow-sm">
                        <div className="flex-1">
                          <p className="font-black text-slate-800 truncate">{getNombreArticulo(art)}</p>
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-0.5">Precio Fijo: ${Number(art.precio_pactado).toFixed(2)} / {art.unidad_medida}</p>
                        </div>
                        
                        <div className="flex items-center gap-3 shrink-0">
                          <div>
                            <label className="text-[9px] font-black text-slate-400 uppercase block mb-1">Cant. Recibida</label>
                            <input 
                               type="number" step="any" min="0" placeholder="0"
                               value={art.cantidad} onChange={(e) => handleCantidadArticulo(idx, e.target.value)}
                               className="w-24 p-3 bg-slate-50 border border-slate-200 text-slate-700 font-bold rounded-xl outline-none focus:border-blue-500 text-center" 
                            />
                          </div>
                          <div>
                            <label className="text-[9px] font-black text-slate-400 uppercase block mb-1">Total ($)</label>
                            <input 
                               type="number" step="any" placeholder="0.00"
                               value={art.total} onChange={(e) => {
                                 const nuevos = [...formFactura.articulos];
                                 nuevos[idx].total = e.target.value;
                                 setFormFactura({...formFactura, articulos: nuevos});
                               }}
                               className="w-28 p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 font-black rounded-xl outline-none focus:border-emerald-500 text-center shadow-inner" 
                            />
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                  
                  <div className="mt-4 border-t border-blue-200/50 pt-4 flex justify-between items-center">
                    <p className="text-sm font-black text-blue-800 uppercase tracking-widest">Total a Pagar / Facturar:</p>
                    <p className="text-3xl font-black text-blue-700">
                      ${formFactura.articulos.reduce((sum, a) => sum + Number(a.total || 0), 0).toFixed(2)}
                    </p>
                  </div>
                </div>
              )}

              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-3">
                <label className="text-xs font-black text-slate-400 uppercase tracking-widest block mb-2">Estado de la Factura *</label>
                <label className={`flex items-center gap-3 p-4 rounded-xl border-2 transition cursor-pointer select-none ${formFactura.estado === 'Aprobado' ? 'bg-emerald-50 border-emerald-500 text-emerald-900 shadow-sm' : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'}`}>
                  <input type="radio" name="estado_fac" value="Aprobado" checked={formFactura.estado === 'Aprobado'} onChange={() => setFormFactura({...formFactura, estado: 'Aprobado'})} className="accent-emerald-600 w-5 h-5" />
                  <div>
                    <p className="font-black text-sm">✅ Mercancía Recibida y Pagada (Aprobada)</p>
                    <p className="text-xs font-medium opacity-80 mt-0.5">Sumará el stock inmediatamente y enviará confirmación.</p>
                  </div>
                </label>
                <label className={`flex items-center gap-3 p-4 rounded-xl border-2 transition cursor-pointer select-none ${formFactura.estado === 'Pendiente' ? 'bg-orange-50 border-orange-500 text-orange-900 shadow-sm' : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'}`}>
                  <input type="radio" name="estado_fac" value="Pendiente" checked={formFactura.estado === 'Pendiente'} onChange={() => setFormFactura({...formFactura, estado: 'Pendiente'})} className="accent-orange-500 w-5 h-5" />
                  <div>
                    <p className="font-black text-sm">⏳ Pendiente de Recibir / Pagar</p>
                    <p className="text-xs font-medium opacity-80 mt-0.5">Quedará en espera. No subirá el stock todavía.</p>
                  </div>
                </label>
              </div>
            </div>

            <div className="p-6 bg-slate-50 border-t border-slate-100 flex gap-4 shrink-0">
              <button disabled={isSubmitting} type="button" onClick={() => setModalNuevaFactura(false)} className="flex-1 py-4 bg-white border border-slate-200 text-slate-600 font-bold rounded-2xl hover:bg-slate-100 transition disabled:opacity-50">Cancelar</button>
              <button disabled={isSubmitting || proveedoresLista.length === 0 || !formFactura.proveedor_id} type="submit" className="flex-[2] py-4 bg-blue-600 text-white font-black rounded-2xl hover:bg-blue-700 shadow-lg shadow-blue-500/30 transition active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2">
                {isSubmitting ? 'Guardando...' : <><Save size={20}/> Procesar Factura</>}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

export default ControlGastos;