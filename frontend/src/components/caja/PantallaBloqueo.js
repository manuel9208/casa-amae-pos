import React, { useState, useEffect } from 'react';
import { Lock, Delete, LogOut } from 'lucide-react';

const PantallaBloqueo = ({ 
  isCajaBloqueada, setIsCajaBloqueada, empleadosPOS, 
  setOperadorActual, configGlobal, onLogout 
}) => {
  const [pinInput, setPinInput] = useState('');
  const [errorAnim, setErrorAnim] = useState(false);

  // Evaluar el PIN automáticamente al llegar a 4 dígitos
  useEffect(() => {
    if (pinInput.length === 4) {
      const empleadoValido = empleadosPOS.find(emp => emp.pin === pinInput);
      
      // El Admin Global pasa con su password o si le asignas un PIN manual, pero como el admin no tiene PIN en nuestra lógica, 
      // le permitiremos usar un PIN maestro temporal '0000' si no tiene uno, o mejor, que el admin use el Kiosco libremente.
      // Buscamos si coincide.
      
      if (empleadoValido) {
        setOperadorActual(empleadoValido);
        setIsCajaBloqueada(false);
        setPinInput(''); // Limpiamos para la próxima vez
      } else {
        // PIN Incorrecto: Animación de vibración y borrar
        setErrorAnim(true);
        setTimeout(() => {
          setErrorAnim(false);
          setPinInput('');
        }, 500);
      }
    }
  }, [pinInput, empleadosPOS, setIsCajaBloqueada, setOperadorActual]);

  if (!isCajaBloqueada) return null;

  const handleKeypad = (num) => {
    if (pinInput.length < 4) setPinInput(prev => prev + num);
  };

  const handleDelete = () => {
    setPinInput(prev => prev.slice(0, -1));
  };

  return (
    <div className="fixed inset-0 bg-slate-900/95 backdrop-blur-md z-[9999] flex flex-col items-center justify-center animate-in fade-in duration-300">
      
      <button onClick={onLogout} className="absolute top-6 right-6 text-slate-400 hover:text-red-500 flex items-center gap-2 font-bold bg-slate-800/50 p-3 rounded-2xl transition">
        <LogOut size={20}/> Salir del Sistema
      </button>

      <div className="text-center mb-8">
        <div className="bg-slate-800 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6 shadow-[0_0_30px_rgba(59,130,246,0.3)] border border-slate-700">
          <Lock size={40} className="text-blue-500" />
        </div>
        <h1 className="text-4xl font-black text-white tracking-tight mb-2">
          {configGlobal?.nombre_negocio || 'Terminal POS'}
        </h1>
        <p className="text-slate-400 font-medium text-lg">Ingresa tu PIN de seguridad para operar</p>
      </div>

      {/* Círculos del PIN */}
      <div className={`flex gap-4 mb-10 ${errorAnim ? 'animate-bounce text-red-500' : ''}`}>
        {[0, 1, 2, 3].map(index => (
          <div 
            key={index} 
            className={`w-5 h-5 rounded-full transition-all duration-200 ${
              pinInput.length > index ? 'bg-blue-500 shadow-[0_0_15px_rgba(59,130,246,0.8)] scale-110' : 'bg-slate-700'
            }`}
          />
        ))}
      </div>

      {/* Teclado Numérico Gigante */}
      <div className="grid grid-cols-3 gap-4 md:gap-6 w-full max-w-sm px-6">
        {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(num => (
          <button 
            key={num} 
            onClick={() => handleKeypad(num.toString())}
            className="bg-slate-800/80 hover:bg-slate-700 text-white text-4xl font-black p-6 rounded-3xl border border-slate-700/50 shadow-lg active:scale-95 transition-all"
          >
            {num}
          </button>
        ))}
        
        <div className="bg-transparent pointer-events-none"></div>
        
        <button 
          onClick={() => handleKeypad('0')}
          className="bg-slate-800/80 hover:bg-slate-700 text-white text-4xl font-black p-6 rounded-3xl border border-slate-700/50 shadow-lg active:scale-95 transition-all"
        >
          0
        </button>
        
        <button 
          onClick={handleDelete}
          className="bg-slate-800/50 hover:bg-red-500/20 text-slate-400 hover:text-red-400 flex items-center justify-center p-6 rounded-3xl border border-slate-700/50 shadow-lg active:scale-95 transition-all"
        >
          <Delete size={36} />
        </button>
      </div>
      
      {errorAnim && <p className="text-red-400 font-bold mt-8 animate-pulse">PIN Incorrecto</p>}
    </div>
  );
};

export default PantallaBloqueo;