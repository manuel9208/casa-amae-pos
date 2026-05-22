import React from 'react';

const ModalAperturaCaja = ({ fondoCaja, iniciarTurno, inputFondo, setInputFondo }) => {
  if (fondoCaja !== null) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-md flex items-center justify-center z-[100] p-4">
      <form onSubmit={iniciarTurno} className="bg-white p-10 rounded-[40px] shadow-2xl w-full max-w-md text-center animate-in zoom-in">
        <span className="text-6xl mb-6 block">💵</span>
        <h2 className="text-3xl font-black text-slate-800 mb-2">Apertura de Caja</h2>
        <p className="text-slate-500 font-medium mb-8">¿Con cuánta feria (efectivo) inicias tu turno hoy?</p>
        <input 
          type="number" required autoFocus min="0" step="0.5" 
          value={inputFondo} onChange={e => setInputFondo(e.target.value)} 
          className="w-full bg-slate-50 border-2 border-slate-200 rounded-2xl p-6 text-center text-4xl font-black outline-none focus:border-emerald-500 text-slate-800 mb-6" 
          placeholder="$0.00" 
        />
        <button type="submit" disabled={inputFondo===''} className="w-full bg-emerald-500 hover:bg-emerald-600 text-white py-5 rounded-2xl font-black text-xl shadow-lg transition disabled:opacity-50">
          Comenzar Turno
        </button>
      </form>
    </div>
  );
};

export default ModalAperturaCaja;