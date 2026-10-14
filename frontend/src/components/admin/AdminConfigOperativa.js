import React from 'react';
import { Workflow, ChefHat, PackageCheck, Info, Loader2, MapPin, Users, Factory } from 'lucide-react';
import { useConfigOperativa } from '../../hooks/useConfigOperativa';
import GestionEstacionesCocina from './operacion/GestionEstacionesCocina';

// ==========================================
// 🍳 VISTA AISLADA: FLUJO OPERATIVO (Cocina Sí/No + Mesa Obligatoria)
// 100% independiente de configGlobal / tabla "configuracion".
// Consume únicamente useConfigOperativa -> tabla "configuracion_operativa".
// ==========================================

const AdminConfigOperativa = ({ apiUrl, showAlert }) => {
  const { usaCocina, mesaObligatoria, criterioPresencia, cargandoConfigOperativa, actualizarUsaCocina, actualizarMesaObligatoria, actualizarCriterioPresencia } = useConfigOperativa(apiUrl);

  const handleToggle = async () => {
    const nuevoValor = !usaCocina;
    const ok = await actualizarUsaCocina(nuevoValor);
    if (ok && showAlert) {
      showAlert(
        '¡Actualizado!',
        nuevoValor
          ? 'La Cocina (KDS) vuelve a estar activa. Los pedidos nuevos pasarán por Preparando/Listo como antes.'
          : 'Modo Mostrador activado. Los pedidos nuevos ya no pasarán por Cocina: irán directo a Entregas/Cobrar.',
        'success'
      );
    } else if (!ok && showAlert) {
      showAlert('Error', 'No se pudo actualizar la configuración. Verifica tu conexión.', 'error');
    }
  };

    // 🪑 NUEVA BANDERA: Mesa Obligatoria
    const handleToggleMesa = async () => {
    const nuevoValor = !mesaObligatoria;
    const ok = await actualizarMesaObligatoria(nuevoValor);
        if (ok && showAlert) {
            showAlert(
            '¡Actualizado!',
            nuevoValor
                ? 'Ahora la mesa es obligatoria en consumo Local.'
                : 'Ahora la mesa es opcional en consumo Local (Asignación Libre / Barra).',
            'success'
            );
        } else if (!ok && showAlert) {
            showAlert('Error', 'No se pudo actualizar la configuración. Verifica tu conexión.', 'error');
        }
    };

    // 🧑‍🍳 NUEVO: Criterio de Presencia en Cocina
    const handleCambiarCriterio = async (nuevoCriterio) => {
    const ok = await actualizarCriterioPresencia(nuevoCriterio);
        if (ok && showAlert) {
            showAlert('¡Actualizado!', 'El criterio de presencia en Cocina se actualizó correctamente.', 'success');
        } else if (!ok && showAlert) {
            showAlert('Error', 'No se pudo actualizar el criterio. Verifica tu conexión.', 'error');
        }
    };

  return (
    <div className="max-w-[1200px] mx-auto space-y-8 pb-12 animate-in fade-in px-4">
      <div className="flex items-center gap-3 mb-6">
        <div className="bg-orange-100 text-orange-600 p-3 rounded-2xl">
          <Workflow size={28} />
        </div>
        <div>
          <h2 className="text-3xl font-black text-slate-800">Flujo Operativo</h2>
          <p className="text-slate-500 font-medium text-sm">Define cómo viajan los pedidos dentro de tu negocio.</p>
        </div>
      </div>

      <div className="bg-white p-6 md:p-8 rounded-[40px] shadow-sm border border-slate-200 space-y-6">

        <div className="bg-blue-50 border border-blue-200 text-blue-700 p-4 rounded-2xl flex items-start gap-3">
          <Info size={20} className="shrink-0 mt-0.5" />
          <p className="text-sm font-medium leading-relaxed">
            Este ajuste es <strong>independiente</strong> de la Configuración general del restaurante y se aplica de inmediato,
            sin necesidad de guardar nada más.
          </p>
        </div>

        {cargandoConfigOperativa ? (
          <div className="flex items-center justify-center py-16 text-slate-400 gap-3">
            <Loader2 size={24} className="animate-spin" />
            <span className="font-bold">Cargando configuración...</span>
          </div>
        ) : (
          <div className="border-2 border-slate-100 rounded-3xl p-6 md:p-8 flex flex-col md:flex-row items-center justify-between gap-6">

            <div className="flex items-center gap-4">
              <div className={`p-4 rounded-2xl transition-colors ${usaCocina ? 'bg-orange-100 text-orange-600' : 'bg-emerald-100 text-emerald-600'}`}>
                {usaCocina ? <ChefHat size={32} /> : <PackageCheck size={32} />}
              </div>
              <div>
                <p className="text-lg font-black text-slate-800">
                  {usaCocina ? 'Flujo Normal (Con Cocina)' : 'Modo Mostrador (Sin Cocina)'}
                </p>
                <p className="text-sm font-medium text-slate-500 max-w-md mt-1">
                  {usaCocina
                    ? 'Los pedidos pasan por la pantalla de Cocina (KDS) antes de poder cobrarse o entregarse.'
                    : 'Los pedidos saltan directo a Entregas/Cobrar. Ideal para cafeterías o barras donde el mismo cajero prepara y entrega.'}
                </p>
              </div>
            </div>

            <button
              onClick={handleToggle}
              role="switch"
              aria-checked={usaCocina}
              className={`relative w-20 h-11 rounded-full transition-colors shrink-0 shadow-inner ${usaCocina ? 'bg-orange-500' : 'bg-emerald-500'}`}
            >
              <span
                className={`absolute top-1 left-1 w-9 h-9 bg-white rounded-full shadow-md transition-transform flex items-center justify-center text-xs font-black ${usaCocina ? 'translate-x-9 text-orange-500' : 'translate-x-0 text-emerald-500'}`}
              >
                {usaCocina ? 'ON' : 'OFF'}
              </span>
            </button>
          </div>
        )}

        {/* 🪑 NUEVA TARJETA: Mesa Obligatoria (Consumo Local) */}
        {!cargandoConfigOperativa && (
          <div className="border-2 border-slate-100 rounded-3xl p-6 md:p-8 flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-4">
              <div className={`p-4 rounded-2xl transition-colors ${mesaObligatoria ? 'bg-indigo-100 text-indigo-600' : 'bg-slate-100 text-slate-500'}`}>
                <MapPin size={32} />
              </div>
              <div>
                <p className="text-lg font-black text-slate-800">Mesa Obligatoria (Consumo Local)</p>
                <p className="text-sm font-medium text-slate-500 max-w-md mt-1">
                  {mesaObligatoria
                    ? 'El cajero no podrá levantar un pedido "Local" sin asignar primero una mesa.'
                    : 'El cajero puede dejar la orden "Local" sin mesa asignada (Barra/Libre).'}
                </p>
              </div>
            </div>
            <button
              onClick={handleToggleMesa}
              role="switch"
              aria-checked={mesaObligatoria}
              className={`relative w-20 h-11 rounded-full transition-colors shrink-0 shadow-inner ${mesaObligatoria ? 'bg-indigo-500' : 'bg-slate-300'}`}
            >
              <span
                className={`absolute top-1 left-1 w-9 h-9 bg-white rounded-full shadow-md transition-transform flex items-center justify-center text-xs font-black ${mesaObligatoria ? 'translate-x-9 text-indigo-500' : 'translate-x-0 text-slate-500'}`}
              >
                {mesaObligatoria ? 'ON' : 'OFF'}
              </span>
            </button>
        </div>
      )}

      {/* 🧑‍🍳 NUEVA TARJETA: Criterio de Presencia en Cocina */}
      {!cargandoConfigOperativa && (
        <div className="border-2 border-slate-100 rounded-3xl p-6 md:p-8 space-y-4">
          <div className="flex items-center gap-4">
            <div className="p-4 rounded-2xl bg-cyan-100 text-cyan-600">
              <Users size={32} />
            </div>
            <div>
              <p className="text-lg font-black text-slate-800">Criterio de Presencia en Cocina</p>
              <p className="text-sm font-medium text-slate-500 max-w-md mt-1">
                Define cómo el sistema decide qué empleados aparecen como "disponibles" en la pantalla de Cocina (KDS).
              </p>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {[
              { id: 'asistencia', label: 'Solo Asistencia', desc: 'Debe tener checada su entrada hoy.' },
              { id: 'horario', label: 'Solo Horario', desc: 'Debe tener turno asignado ahora mismo.' },
              { id: 'ambos', label: 'Ambos', desc: 'Debe cumplir las dos condiciones.' }
            ].map(op => (
              <button
                key={op.id}
                onClick={() => handleCambiarCriterio(op.id)}
                className={`text-left p-4 rounded-2xl border-2 transition-all ${criterioPresencia === op.id ? 'border-cyan-500 bg-cyan-50' : 'border-slate-100 bg-slate-50 hover:border-slate-200'}`}
              >
                <p className={`font-black text-sm ${criterioPresencia === op.id ? 'text-cyan-700' : 'text-slate-700'}`}>{op.label}</p>
                <p className="text-xs font-medium text-slate-500 mt-1">{op.desc}</p>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* 🏭 NUEVA TARJETA: Capacidad de Producción (Estaciones de Cocina) */}
      {!cargandoConfigOperativa && (
        <div className="border-2 border-slate-100 rounded-3xl p-6 md:p-8 space-y-5">
          <div className="flex items-center gap-4">
            <div className="p-4 rounded-2xl bg-orange-100 text-orange-600">
              <Factory size={32} />
            </div>
            <div>
              <p className="text-lg font-black text-slate-800">Capacidad de Producción</p>
              <p className="text-sm font-medium text-slate-500 max-w-md mt-1">
                Define cuántos platillos de cada estación (horno, parrilla, freidora...) puede
                preparar Cocina en paralelo. Esto permite calcular tiempos de espera reales en el KDS.
              </p>
            </div>
          </div>
          <GestionEstacionesCocina apiUrl={apiUrl} showAlert={showAlert} />
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
          <div className={`p-5 rounded-2xl border-2 transition-all ${usaCocina ? 'border-orange-300 bg-orange-50/50' : 'border-slate-100 bg-slate-50 opacity-60'}`}>
            <p className="text-xs font-black uppercase tracking-widest text-orange-600 mb-2 flex items-center gap-2">
              <ChefHat size={14} /> Con Cocina (Default)
            </p>
            <ul className="text-xs font-medium text-slate-600 space-y-1 list-disc list-inside">
              <li>Pedido confirmado → Cocina (KDS)</li>
              <li>Cocina lo marca "Listo"</li>
              <li>Pasa a Entregas / Cobrar</li>
            </ul>
          </div>
          <div className={`p-5 rounded-2xl border-2 transition-all ${!usaCocina ? 'border-emerald-300 bg-emerald-50/50' : 'border-slate-100 bg-slate-50 opacity-60'}`}>
            <p className="text-xs font-black uppercase tracking-widest text-emerald-600 mb-2 flex items-center gap-2">
              <PackageCheck size={14} /> Modo Mostrador
            </p>
            <ul className="text-xs font-medium text-slate-600 space-y-1 list-disc list-inside">
              <li>Pedido confirmado → directo a Entregas / Cobrar</li>
              <li>Cocina (KDS) nunca lo recibe</li>
              <li>Funciona igual para Mostrador, Cuenta Abierta y Domicilio</li>
            </ul>
          </div>
        </div>

      </div>
    </div>
  );
};

export default AdminConfigOperativa;