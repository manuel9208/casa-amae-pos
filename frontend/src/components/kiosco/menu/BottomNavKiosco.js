import React, { useEffect, useState, useRef } from 'react';
import { UtensilsCrossed, ShoppingCart, User } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const formaterMoneda = (num) => new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(num || 0);

// Barra de navegación inferior, exclusiva de mobile/tablet (oculta en desktop con lg:hidden).
// Sin lógica de negocio: solo cambia qué columna de MenuPrincipal.js se muestra (menu/carrito)
// y delega "Perfil" al callback que ya maneja la lógica real en Kiosco.js.
const BottomNavKiosco = ({ vistaMobile, setVistaMobile, totalCarrito, cantidadItems, onIrAPerfil }) => {
  // 👇 NUEVO: Detecta cuándo sube la cantidad de items para disparar el rebote del ícono
  const [rebote, setRebote] = useState(false);
  const cantidadPrevia = useRef(cantidadItems);

  useEffect(() => {
    if (cantidadItems > cantidadPrevia.current) {
      setRebote(true);
      const timer = setTimeout(() => setRebote(false), 600);
      return () => clearTimeout(timer);
    }
    cantidadPrevia.current = cantidadItems;
  }, [cantidadItems]);

  return (
    <div className="lg:hidden fixed bottom-4 left-4 right-4 z-50 pointer-events-none">

      {/* Barra flotante de Total (siempre visible si hay algo en el carrito) */}
      {cantidadItems > 0 && vistaMobile === 'menu' && (
        <div className="px-4 pb-2 pointer-events-auto animate-in slide-in-from-bottom-4">
          <button
            onClick={() => setVistaMobile('carrito')}
            className="w-full bg-slate-900 text-white rounded-2xl shadow-2xl px-5 py-3.5 flex items-center justify-between active:scale-95 transition"
          >
            <span className="font-bold text-sm">🛒 {cantidadItems} {cantidadItems === 1 ? 'artículo' : 'artículos'}</span>
            <span className="flex items-center gap-2">
              <span className="font-black text-lg">{formaterMoneda(totalCarrito)}</span>
              <span className="text-xs font-black uppercase tracking-widest bg-white/20 px-2 py-1 rounded-lg">Ver Carrito</span>
            </span>
          </button>
        </div>
      )}

      {/* Navegación flotante tipo isla: Menú / Carrito / Perfil (con efecto cristal esmerilado) */}
      <div className="bg-white/80 backdrop-blur-xl rounded-3xl border border-slate-200 shadow-2xl shadow-black/10 px-6 py-3 flex items-center justify-around pointer-events-auto">
        <button
          onClick={() => setVistaMobile('menu')}
          style={vistaMobile === 'menu' ? { color: 'var(--c-primario, #2563eb)' } : undefined}
          className={`flex flex-col items-center gap-1 px-4 py-1.5 rounded-xl transition ${vistaMobile === 'menu' ? '' : 'text-slate-400'}`}
        >
          <UtensilsCrossed size={22} />
          <span className="text-[10px] font-black uppercase tracking-widest">Menú</span>
        </button>

        <button
          onClick={() => setVistaMobile('carrito')}
          style={vistaMobile === 'carrito' ? { color: 'var(--c-primario, #2563eb)' } : undefined}
          className={`relative flex flex-col items-center gap-1 px-4 py-1.5 rounded-xl transition ${vistaMobile === 'carrito' ? '' : 'text-slate-400'}`}
        >
          <motion.span
            className="relative inline-block"
            animate={rebote ? { scale: [1, 1.4, 0.9, 1.1, 1] } : { scale: 1 }}
            transition={{ duration: 0.5, ease: 'easeInOut' }}
          >
            <ShoppingCart size={22} />
            <AnimatePresence>
              {cantidadItems > 0 && (
                <motion.span
                  key={cantidadItems}
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  exit={{ scale: 0 }}
                  className="absolute -top-2 -right-2 bg-red-500 text-white text-[9px] font-black w-4 h-4 rounded-full flex items-center justify-center"
                >
                  {cantidadItems > 9 ? '9+' : cantidadItems}
                </motion.span>
              )}
            </AnimatePresence>
          </motion.span>
          <span className="text-[10px] font-black uppercase tracking-widest">Carrito</span>
        </button>

        <button
          onClick={() => onIrAPerfil && onIrAPerfil()}
          className="flex flex-col items-center gap-1 px-4 py-1.5 rounded-xl transition text-slate-400 active:opacity-70"
        >
          <User size={22} />
          <span className="text-[10px] font-black uppercase tracking-widest">Perfil</span>
        </button>
      </div>
    </div>
  );
};

export default BottomNavKiosco;