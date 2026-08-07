import React from 'react';
import { User } from 'lucide-react';

const TurnosCaja = ({ periodo, cortesDelDia, corteSeleccionadoId, setCorteSeleccionadoId }) => {
    if (periodo !== 'dia' || cortesDelDia.length === 0) return null;

    return (
        <div className="flex gap-2 overflow-x-auto custom-scrollbar mb-6 print:hidden items-center py-1">
            <button
                onClick={() => setCorteSeleccionadoId('global')}
                className={`px-6 py-2.5 rounded-xl font-black text-sm whitespace-nowrap transition-all flex items-center gap-2 ${
                    corteSeleccionadoId === 'global'
                        ? 'bg-[#ca8a04] text-white shadow-md'
                        : 'text-slate-500 hover:bg-slate-100 hover:text-slate-700'
                }`}
            >
                Día Completo (Global)
            </button>
            {cortesDelDia.map((c, i) => (
                <button
                    key={c.id}
                    onClick={() => setCorteSeleccionadoId(c.id)}
                    className={`px-6 py-2.5 rounded-xl font-black text-sm whitespace-nowrap transition-all flex items-center gap-2 ${
                        String(corteSeleccionadoId) === String(c.id)
                            ? 'bg-[#ca8a04] text-white shadow-md'
                            : 'text-slate-500 hover:bg-slate-100 hover:text-slate-700'
                    }`}
                >
                    <User size={16} /> Turno {i + 1}: {c.usuario_nombre || 'Cajero'}
                </button>
            ))}
        </div>
    );
};

export default TurnosCaja;