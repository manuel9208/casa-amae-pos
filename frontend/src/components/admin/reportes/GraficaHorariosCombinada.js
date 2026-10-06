import React from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend
} from 'recharts';

// Misma paleta ya usada en ModalGraficas.js, para mantener consistencia visual
const PALETA_COLORES = ['#4f46e5', '#10b981', '#f59e0b', '#ec4899', '#0ea5e9'];

// Combina las series de cada comparativa (ya alineadas a la misma ventana
// horaria gracias al fix de horaAperturaDB/horaCierreDB) en un solo arreglo
// apto para Recharts: [{ hora, 'Hace 1 Semana': n, 'Hace 1 Mes': n, ... }]
const combinarSeries = (comparativas) => {
  const base = comparativas.find(c => Array.isArray(c.serieHoras) && c.serieHoras.length > 0);
  if (!base) return [];

  return base.serieHoras.map((punto, idx) => {
    const fila = { hora: punto.hora };
    comparativas.forEach(comp => {
      if (Array.isArray(comp.serieHoras) && comp.serieHoras[idx]) {
        fila[comp.label] = comp.serieHoras[idx].cantidad;
      }
    });
    return fila;
  });
};

const GraficaHorariosCombinada = ({ comparativas }) => {
  const datos = combinarSeries(comparativas || []);

  if (datos.length === 0) {
    return (
      <div className="flex items-center justify-center h-48 text-slate-400 text-sm">
        Sin datos suficientes para graficar el horario.
      </div>
    );
  }

  return (
    <div className="w-full">
      <ResponsiveContainer width="100%" height={280}>
        <BarChart data={datos} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
          <XAxis
            dataKey="hora"
            tick={{ fontSize: 10, fill: '#64748b' }}
            interval={0}
            angle={-35}
            textAnchor="end"
            height={60}
          />
          <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} allowDecimals={false} width={35} />
          <Tooltip
            contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0', fontSize: '12px' }}
          />
          <Legend wrapperStyle={{ fontSize: '11px', fontWeight: 'bold' }} />
          {(comparativas || []).map((comp, idx) => (
            <Bar
              key={comp.label}
              dataKey={comp.label}
              fill={PALETA_COLORES[idx % PALETA_COLORES.length]}
              radius={[6, 6, 0, 0]}
              maxBarSize={28}
            />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};

export default GraficaHorariosCombinada;