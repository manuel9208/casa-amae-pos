import React, { useState } from 'react';
import { X, BarChart3 } from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Cell
} from 'recharts';

// Paleta de colores consistente con el estilo del panel (indigo/emerald/pink/amber)
const PALETA_COLORES = ['#4f46e5', '#10b981', '#f59e0b', '#ec4899', '#0ea5e9', '#8b5cf6', '#ef4444'];

// Convierte { categorias: [...], valores: [...] } en el formato que espera Recharts: [{ nombre, valor }]
const transformarDatos = (bloque) => {
  if (!bloque || !Array.isArray(bloque.categorias) || !Array.isArray(bloque.valores)) return [];
  return bloque.categorias.map((cat, idx) => ({
    nombre: cat,
    valor: bloque.valores[idx] ?? 0
  }));
};

const GraficaBarras = ({ bloque, formatoMoneda = false }) => {
  const datos = transformarDatos(bloque);

  if (datos.length === 0) {
    return (
      <div className="flex items-center justify-center h-48 text-slate-400 text-sm">
        Sin datos suficientes para graficar este apartado.
      </div>
    );
  }

  return (
    <div className="w-full">
      <h4 className="text-sm font-black text-slate-700 mb-3">{bloque.titulo}</h4>
      <ResponsiveContainer width="100%" height={240}>
        <BarChart data={datos} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
          <XAxis
            dataKey="nombre"
            tick={{ fontSize: 11, fill: '#64748b' }}
            interval={0}
            angle={-20}
            textAnchor="end"
            height={60}
          />
          <YAxis
            tick={{ fontSize: 11, fill: '#94a3b8' }}
            tickFormatter={(v) => formatoMoneda ? `$${v}` : v}
            width={formatoMoneda ? 55 : 35}
          />
          <Tooltip
            formatter={(value) => [formatoMoneda ? `$${Number(value).toFixed(2)}` : value, '']}
            contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0', fontSize: '12px' }}
          />
          <Bar dataKey="valor" radius={[8, 8, 0, 0]} maxBarSize={48}>
            {datos.map((_, idx) => (
              <Cell key={idx} fill={PALETA_COLORES[idx % PALETA_COLORES.length]} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};

const ModalGraficas = ({ graficoData, onClose }) => {
  // Tabs internos para no saturar la vista con las 4 gráficas al mismo tiempo
  const tabsDisponibles = [
    { key: 'comparativoTemporal', label: 'Comparativo', moneda: true },
    { key: 'topPlatillos', label: 'Top Platillos', moneda: false },
    { key: 'mermasPorTipo', label: 'Mermas', moneda: true },
    { key: 'insumosMayorGasto', label: 'Insumos', moneda: true },
  ].filter(tab => graficoData?.[tab.key]); // solo mostramos tabs que sí traigan datos

  const [tabActivo, setTabActivo] = useState(tabsDisponibles[0]?.key || null);

  if (!graficoData) return null;

  const tabInfo = tabsDisponibles.find(t => t.key === tabActivo);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center">
              <BarChart3 size={18} />
            </div>
            <h3 className="text-base font-black text-slate-800">Gráficas del Análisis</h3>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-all"
          >
            <X size={18} />
          </button>
        </div>

        {/* Tabs */}
        {tabsDisponibles.length > 1 && (
          <div className="flex gap-1.5 px-5 pt-4 overflow-x-auto no-scrollbar">
            {tabsDisponibles.map(tab => (
              <button
                key={tab.key}
                onClick={() => setTabActivo(tab.key)}
                className={`px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-all shrink-0 ${tabActivo === tab.key ? 'bg-indigo-600 text-white shadow-sm' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        )}

        {/* Contenido de la gráfica activa */}
        <div className="p-5">
          {tabInfo ? (
            <GraficaBarras bloque={graficoData[tabInfo.key]} formatoMoneda={tabInfo.moneda} />
          ) : (
            <div className="text-center text-slate-400 text-sm py-10">No hay gráficas disponibles para esta respuesta.</div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ModalGraficas;