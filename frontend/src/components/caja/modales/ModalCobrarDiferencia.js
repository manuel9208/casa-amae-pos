import React, { useState } from 'react';
import { DollarSign, CreditCard, Landmark, AlertTriangle, X } from 'lucide-react';

// ==========================================
// 🍽️ MODAL: Cobrar Diferencia al Agregar Platillo (Escenario 1)
// Solo aparece cuando el pedido YA estaba pagado y se le agrega un platillo nuevo.
// Aplica la matriz de pago acordada:
//  - Mismo método que el original -> se suma (lo resuelve el backend, aquí solo se informa).
//  - Método distinto -> pasa a 'Mixto' con desglose exacto (lo resuelve el backend).
// Este modal SOLO recolecta la decisión del cajero; el cálculo real de inventario,
// total y método final vive en agregarItemsAPedido (backend).
// ==========================================

const ModalCobrarDiferencia = ({ modalCobrarDiferencia, setModalCobrarDiferencia, confirmarCobroDiferenciaPlatillo, isSubmitting }) => {
  const [metodoSeleccionado, setMetodoSeleccionado] = useState(null);

  if (!modalCobrarDiferencia) return null;

  const { pedido, itemsNuevos } = modalCobrarDiferencia;

  // Calculamos la diferencia localmente solo para mostrarla — el backend
  // recalcula el monto real al procesar (fuente única de verdad).
  const diferencia = (itemsNuevos || []).reduce(
    (sum, item) => sum + (Number(item.precioFinal || 0) * (Number(item.cantidad) || 1)),
    0
  );

  const metodoOriginal = pedido?.metodo_pago;
  const esMetodoMixtoOriginal = metodoOriginal === 'Mixto';

  const opcionesMetodo = [
    { id: 'Efectivo', label: 'Efectivo', icon: DollarSign },
    { id: 'Tarjeta', label: 'Tarjeta', icon: CreditCard },
    { id: 'Transferencia', label: 'Transferencia', icon: Landmark }
  ];

  const handleCerrar = () => {
    setMetodoSeleccionado(null);
    setModalCobrarDiferencia(null);
  };

  const handleConfirmar = () => {
    if (!metodoSeleccionado || isSubmitting) return;
    confirmarCobroDiferenciaPlatillo(metodoSeleccionado);
    setMetodoSeleccionado(null);
  };

  return (
    <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-sm flex items-center justify-center z-[200] p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-[40px] shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden animate-in zoom-in-95">

        {/* ENCABEZADO */}
        <div className="p-6 md:p-8 border-b border-slate-100 relative">
          <button
            onClick={handleCerrar}
            className="absolute top-5 right-5 text-slate-400 hover:text-red-500 bg-slate-50 p-2 rounded-full transition-all"
          >
            <X size={20} />
          </button>
          <div className="flex items-center gap-3 mb-1">
            <div className="bg-emerald-100 text-emerald-600 p-3 rounded-2xl">
              <DollarSign size={28} />
            </div>
            <div>
              <h2 className="text-xl md:text-2xl font-black text-slate-800">Cobrar Diferencia</h2>
              <p className="text-xs md:text-sm font-bold text-slate-500">Orden #{pedido?.numero_pedido}</p>
            </div>
          </div>
        </div>

        {/* CUERPO */}
        <div className="p-6 md:p-8 space-y-6">

          <div className="bg-amber-50 border border-amber-200 text-amber-700 p-4 rounded-2xl flex items-start gap-3">
            <AlertTriangle size={20} className="shrink-0 mt-0.5" />
            <p className="text-xs md:text-sm font-medium leading-relaxed">
              Esta orden ya fue pagada con <strong>{metodoOriginal}</strong>. Los platillos nuevos generan una diferencia
              que debe cobrarse ahora.
            </p>
          </div>

          <div className="text-center bg-slate-50 border border-slate-200 rounded-3xl p-6">
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Monto a Cobrar</p>
            <p className="text-4xl md:text-5xl font-black text-emerald-600">${diferencia.toFixed(2)}</p>
            <p className="text-[11px] font-bold text-slate-400 mt-2">
              {(itemsNuevos || []).length} platillo(s) nuevo(s) agregado(s)
            </p>
          </div>

          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-3">
              ¿Con qué método pagará el cliente la diferencia?
            </p>
            <div className="grid grid-cols-3 gap-3">
              {opcionesMetodo.map(({ id, label, icon: Icon }) => {
                const activo = metodoSeleccionado === id;
                return (
                  <button
                    key={id}
                    type="button"
                    onClick={() => setMetodoSeleccionado(id)}
                    className={`p-4 rounded-2xl border-2 font-black flex flex-col items-center justify-center gap-2 transition-all ${
                      activo
                        ? 'bg-emerald-600 text-white border-emerald-600 shadow-lg scale-105'
                        : 'bg-slate-50 text-slate-500 border-slate-100 hover:border-emerald-300 hover:shadow-sm'
                    }`}
                  >
                    <Icon size={20} />
                    <span className="text-[10px] md:text-xs uppercase tracking-widest">{label}</span>
                  </button>
                );
              })}
            </div>

            {/* Aviso de desglose: solo informativo, el backend ya sabe resolverlo */}
            {metodoSeleccionado && (
              <div className="mt-4 bg-indigo-50 border border-indigo-100 rounded-xl p-3 text-[11px] font-bold text-indigo-700 animate-in fade-in slide-in-from-top-1">
                {metodoSeleccionado === metodoOriginal && !esMetodoMixtoOriginal ? (
                  <>✅ Mismo método que el pago original — se sumará ${diferencia.toFixed(2)} a {metodoOriginal}.</>
                ) : (
                  <>
                    🔀 Se registrará como <strong>Pago Mixto</strong>: {metodoOriginal} (pago original) + {metodoSeleccionado} (${diferencia.toFixed(2)} de diferencia).
                  </>
                )}
              </div>
            )}
          </div>
        </div>

        {/* PIE - ACCIONES */}
        <div className="p-6 md:p-8 border-t border-slate-100 flex gap-3">
          <button
            onClick={handleCerrar}
            disabled={isSubmitting}
            className="flex-1 py-4 bg-slate-100 text-slate-600 font-black rounded-2xl hover:bg-slate-200 transition active:scale-95 disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            onClick={handleConfirmar}
            disabled={!metodoSeleccionado || isSubmitting}
            className="flex-[2] py-4 bg-emerald-500 hover:bg-emerald-600 text-white font-black rounded-2xl shadow-lg shadow-emerald-500/30 transition active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2"
          >
            <DollarSign size={20} /> {isSubmitting ? 'Procesando...' : `Cobrar $${diferencia.toFixed(2)}`}
          </button>
        </div>

      </div>
    </div>
  );
};

export default ModalCobrarDiferencia;