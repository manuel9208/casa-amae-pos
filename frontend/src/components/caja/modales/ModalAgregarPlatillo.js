import React, { useState, useEffect } from 'react';
import { ShoppingBag, XCircle, Trash2, Edit, PlusCircle, CheckCircle2 } from 'lucide-react';
import MenuCategoriasYProductos from './PuntoDeVenta/MenuCategoriasYProductos';
import AsistentePersonalizacion from './PuntoDeVenta/AsistentePersonalizacion';

// ==========================================
// 🍽️ MODAL: Agregar Platillo a Pedido Existente (Escenario 1)
// Reutiliza MenuCategoriasYProductos + AsistentePersonalizacion (sin modificarlos).
// Arma un carrito TEMPORAL local; al confirmar, entrega los ítems nuevos
// a confirmarItemsAgregarPlatillo (useCajaCentral), que decide si hay que
// cobrar diferencia o solo sumar al total.
// ==========================================

const ModalAgregarPlatillo = ({
  modalAgregarPlatillo, setModalAgregarPlatillo,
  confirmarItemsAgregarPlatillo,
  productos, clasificaciones, catalogoIngredientes, configGlobal, combosActivos = [],
  isSubmitting
}) => {
  const [categoriaActiva, setCategoriaActiva] = useState(null);
  const [carritoTemporal, setCarritoTemporal] = useState([]);

  // Estados del wizard de personalización (mismo patrón que PuntoDeVentaPrincipal.js)
  const [productoEnEspera, setProductoEnEspera] = useState(null);
  const [itemEditandoId, setItemEditandoId] = useState(null);
  const [pasoPersonalizacion, setPasoPersonalizacion] = useState(0);
  const [opcionSeleccionada, setOpcionSeleccionada] = useState(null);
  const [saborSeleccionado, setSaborSeleccionado] = useState(null);
  const [gruposSeleccionados, setGruposSeleccionados] = useState({});
  const [gruposOpcionalesSeleccionados, setGruposOpcionalesSeleccionados] = useState({});
  const [ingredientesBase, setIngredientesBase] = useState([]);
  const [ingredientesSustituidos, setIngredientesSustituidos] = useState({});
  const [ingredienteDesplegado, setIngredienteDesplegado] = useState(null);
  const [extrasSeleccionados, setExtrasSeleccionados] = useState([]);
  const [notaProducto, setNotaProducto] = useState('');
  const [cantidadProducto, setCantidadProducto] = useState(1);

  const queue = Array.isArray(productoEnEspera) ? productoEnEspera : (productoEnEspera ? [productoEnEspera] : []);
  const currentItem = queue.length > 0 ? queue[0] : null;

  // 🛠️ FIX: resetWizard debe declararse ANTES del useEffect que lo usa y
  // ANTES del "return null" condicional. Si no, cuando modalAgregarPlatillo
  // es null en el primer render, el componente se corta antes de llegar a
  // esta declaración, y el efecto (que sí queda registrado) truena con
  // "Cannot access 'resetWizard' before initialization" al montarse.
  const resetWizard = () => {
    setProductoEnEspera(null); setItemEditandoId(null); setPasoPersonalizacion(0);
    setOpcionSeleccionada(null); setSaborSeleccionado(null);
    setGruposSeleccionados({}); setGruposOpcionalesSeleccionados({});
    setIngredientesBase([]); setIngredientesSustituidos({});
    setIngredienteDesplegado(null); setExtrasSeleccionados([]);
    setNotaProducto(''); setCantidadProducto(1);
  };

  useEffect(() => {
    if (!modalAgregarPlatillo) {
      setCarritoTemporal([]);
      setCategoriaActiva(null);
      resetWizard();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [modalAgregarPlatillo]);

  if (!modalAgregarPlatillo) return null;

  const nombresClasificacionesActivas = (clasificaciones || []).map(c => c.nombre);
  const productosDisponibles = (productos || []).filter(p => {
    const catName = p.categoria || 'General';
    return catName === 'General' || nombresClasificacionesActivas.includes(catName);
  });
  const categoriasUnicas = [...new Set(productosDisponibles.map(p => p.categoria || 'General'))];
  const productosFiltrados = productosDisponibles.filter(p => (p.categoria || 'General') === categoriaActiva);

  const getPortadaCategoria = (catName) => {
    const clasifDB = (clasificaciones || []).find(c => c.nombre === catName);
    return { imagen_url: clasifDB?.imagen_url || null, emoji: clasifDB?.emoji || '🍽️' };
  };

  const abrirModalProducto = (p) => {
    resetWizard();
    setItemEditandoId(null);
    const productoLimpio = JSON.parse(JSON.stringify(p));
    delete productoLimpio._esPromo;
    delete productoLimpio._esComboBuilder;
    delete productoLimpio._configuracionCombo;
    delete productoLimpio._esCombo;
    delete productoLimpio._comboId;

    const comboMatch = combosActivos.find(c => String(c.producto_base_id) === String(productoLimpio.id));
    if (comboMatch) {
      productoLimpio._esComboBuilder = true;
      productoLimpio._configuracionCombo = comboMatch;
    }
    setProductoEnEspera([productoLimpio]);
  };

  const iniciarEdicion = (item) => {
    resetWizard();
    const idOriginal = item.producto_id || item.id;
    const productoOriginal = (productos || []).find(p => String(p.id) === String(idOriginal));
    if (!productoOriginal) return;
    const productoClonado = JSON.parse(JSON.stringify(productoOriginal));
    setItemEditandoId(item.idTicket);
    setProductoEnEspera([productoClonado]);
  };

  const handleTerminarPersonalizacion = (nuevoItem) => {
    if (itemEditandoId) {
      setCarritoTemporal(prev => prev.map(i => i.idTicket === itemEditandoId ? { ...nuevoItem, idTicket: i.idTicket } : i));
    } else {
      setCarritoTemporal(prev => [...prev, nuevoItem]);
    }
    resetWizard();
  };

  const cambiarCantidad = (idTicket, delta) => {
    setCarritoTemporal(prev => prev.map(item => {
      if (item.idTicket !== idTicket) return item;
      const newQty = (item.cantidad || 1) + delta;
      if (newQty <= 0) return item;
      return { ...item, cantidad: newQty };
    }));
  };

  const quitarDelCarrito = (idTicket) => setCarritoTemporal(prev => prev.filter(item => item.idTicket !== idTicket));

  const totalTemporal = carritoTemporal.reduce((sum, i) => sum + (Number(i.precioFinal || 0) * (Number(i.cantidad) || 1)), 0);

  const handleCerrar = () => {
    setModalAgregarPlatillo(null);
  };

  const handleConfirmar = () => {
    if (carritoTemporal.length === 0 || isSubmitting) return;
    // Expandimos igual que hace PuntoDeVentaPrincipal.js: 1 unidad por idTicket
    const carritoExpandido = [];
    carritoTemporal.forEach(item => {
      const qty = item.cantidad || 1;
      for (let i = 0; i < qty; i++) {
        carritoExpandido.push({ ...item, cantidad: 1, idTicket: item.idTicket + '_' + i });
      }
    });
    confirmarItemsAgregarPlatillo(carritoExpandido);
  };

  return (
    <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-md flex items-center justify-center z-[150] p-4 sm:p-6 animate-in fade-in duration-200">
      <div className="bg-slate-50 w-full max-w-4xl h-[90vh] rounded-[40px] shadow-2xl overflow-hidden flex flex-col relative border border-slate-300">

        {/* ENCABEZADO */}
        <div className="p-4 md:p-6 bg-white border-b border-slate-200 shrink-0 flex justify-between items-center z-10 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="p-2 md:p-3 rounded-2xl bg-emerald-100 text-emerald-600">
              <PlusCircle size={24} />
            </div>
            <div>
              <h3 className="text-xl md:text-2xl font-black text-slate-800 tracking-tight">Agregar Platillo</h3>
              <p className="text-xs md:text-sm font-bold text-slate-500 mt-0.5">
                Orden #{modalAgregarPlatillo.numero_pedido} {modalAgregarPlatillo.mesa ? `· Mesa ${modalAgregarPlatillo.mesa}` : ''}
              </p>
            </div>
          </div>
          <button onClick={handleCerrar} className="bg-slate-100 hover:bg-red-100 text-slate-500 hover:text-red-500 p-2 md:p-3 rounded-full transition shadow-sm shrink-0">
            <XCircle size={24} />
          </button>
        </div>

        {/* CUERPO: MENÚ + CARRITO TEMPORAL LADO A LADO EN DESKTOP, APILADO EN MOBILE */}
        <div className="flex-1 overflow-hidden flex flex-col md:flex-row">

          {/* MENÚ */}
          <div className="flex-1 overflow-y-auto custom-scrollbar bg-slate-50/50">
            <MenuCategoriasYProductos
              categoriaActiva={categoriaActiva} setCategoriaActiva={setCategoriaActiva}
              categoriasUnicas={categoriasUnicas} productosFiltrados={productosFiltrados}
              getPortadaCategoria={getPortadaCategoria}
              promociones={[]}
              abrirModalProducto={abrirModalProducto}
            />
          </div>

          {/* CARRITO TEMPORAL */}
          <div className="w-full md:w-[360px] shrink-0 bg-white border-t md:border-t-0 md:border-l border-slate-200 flex flex-col">
            <div className="p-4 border-b border-slate-100">
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Platillos a Agregar</p>
            </div>
            <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-3">
              {carritoTemporal.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-10 opacity-50">
                  <ShoppingBag size={48} className="mb-3 text-slate-300" />
                  <p className="text-sm font-bold text-slate-400 text-center">Selecciona platillos del menú</p>
                </div>
              ) : (
                carritoTemporal.map(item => (
                  <div key={item.idTicket} className="bg-slate-50 p-3 rounded-2xl border border-slate-200">
                    <p className="font-black text-sm text-slate-800 leading-tight">{item.nombre}</p>
                    {item.extras && item.extras.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-1.5">
                        {item.extras.map((e, idx) => (
                          <span key={idx} className="bg-white text-slate-500 px-1.5 py-0.5 rounded text-[9px] font-bold border border-slate-200">{e.nombre}</span>
                        ))}
                      </div>
                    )}
                    <div className="flex justify-between items-center mt-2">
                      <div className="flex items-center gap-1.5 bg-white rounded-lg border border-slate-200">
                        <button onClick={() => cambiarCantidad(item.idTicket, -1)} className="w-7 h-7 text-slate-500 hover:text-red-500 font-black flex items-center justify-center">−</button>
                        <span className="w-6 text-center font-black text-sm">{item.cantidad || 1}</span>
                        <button onClick={() => cambiarCantidad(item.idTicket, 1)} className="w-7 h-7 text-slate-500 hover:text-emerald-600 font-black flex items-center justify-center">+</button>
                      </div>
                      <p className="font-black text-emerald-600 text-sm">${(item.precioFinal * (item.cantidad || 1)).toFixed(2)}</p>
                      <div className="flex gap-1">
                        <button onClick={() => iniciarEdicion(item)} className="w-7 h-7 bg-blue-50 rounded-lg text-blue-600 hover:bg-blue-600 hover:text-white flex items-center justify-center transition"><Edit size={14}/></button>
                        <button onClick={() => quitarDelCarrito(item.idTicket)} className="w-7 h-7 bg-red-50 rounded-lg text-red-500 hover:bg-red-500 hover:text-white flex items-center justify-center transition"><Trash2 size={14}/></button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* TOTAL Y CONFIRMAR */}
            <div className="p-4 border-t border-slate-100 bg-slate-50">
              <div className="flex justify-between items-center mb-3">
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Total a Agregar</p>
                <p className="text-2xl font-black text-emerald-600">${totalTemporal.toFixed(2)}</p>
              </div>
              <button
                disabled={carritoTemporal.length === 0 || isSubmitting}
                onClick={handleConfirmar}
                className="w-full bg-emerald-500 hover:bg-emerald-600 text-white py-4 rounded-2xl font-black text-sm uppercase tracking-widest shadow-lg shadow-emerald-500/30 transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                <CheckCircle2 size={20}/> {isSubmitting ? 'Procesando...' : 'Confirmar y Agregar'}
              </button>
            </div>
          </div>
        </div>

        {/* WIZARD DE PERSONALIZACIÓN (reutilizado, sin modificar) */}
        <AsistentePersonalizacion
          productoEnEspera={currentItem}
          itemEditando={itemEditandoId ? carritoTemporal.find(i => i.idTicket === itemEditandoId) : null}
          pasoPersonalizacion={pasoPersonalizacion}
          setPasoPersonalizacion={setPasoPersonalizacion}
          opcionSeleccionada={opcionSeleccionada}
          setOpcionSeleccionada={setOpcionSeleccionada}
          saborSeleccionado={saborSeleccionado}
          setSaborSeleccionado={setSaborSeleccionado}
          gruposSeleccionados={gruposSeleccionados}
          setGruposSeleccionados={setGruposSeleccionados}
          gruposOpcionalesSeleccionados={gruposOpcionalesSeleccionados}
          setGruposOpcionalesSeleccionados={setGruposOpcionalesSeleccionados}
          ingredientesBase={ingredientesBase}
          setIngredientesBase={setIngredientesBase}
          ingredientesSustituidos={ingredientesSustituidos}
          setIngredientesSustituidos={setIngredientesSustituidos}
          ingredienteDesplegado={ingredienteDesplegado}
          setIngredienteDesplegado={setIngredienteDesplegado}
          extrasSeleccionados={extrasSeleccionados}
          setExtrasSeleccionados={setExtrasSeleccionados}
          notaProducto={notaProducto}
          setNotaProducto={setNotaProducto}
          cantidadProducto={cantidadProducto}
          setCantidadProducto={setCantidadProducto}
          catalogoIngredientes={catalogoIngredientes}
          clasificaciones={clasificaciones}
          politicasSustUI={{}}
          calcularPrecioSustitucion={() => 0}
          resetWizard={resetWizard}
          onTerminarPersonalizacion={handleTerminarPersonalizacion}
          queueLength={queue.length}
          onCancelarPersonalizacion={resetWizard}
          configGlobal={configGlobal}
          promociones={[]}
        />
      </div>
    </div>
  );
};

export default ModalAgregarPlatillo;