import React, { useState, useEffect, useCallback } from 'react';
import { apiFetch } from '../../../utils/apiFetch';

// =========================================================================
// 🏢 DATOS DE LA EMPRESA — Sucursales, contactos e información extra.
// Sección independiente (guarda por registro, NO forma parte del <form> de
// AdminConfiguracion). Alimenta a la IA del Kiosco y de WhatsApp.
// =========================================================================

const TIPOS_CONTACTO = [
  { v: 'telefono', l: '📞 Teléfono' }, { v: 'whatsapp', l: '💬 WhatsApp' }, { v: 'correo', l: '✉️ Correo' },
  { v: 'fax', l: '📠 Fax' }, { v: 'web', l: '🌐 Sitio web' }, { v: 'facebook', l: 'Facebook' },
  { v: 'instagram', l: 'Instagram' }, { v: 'tiktok', l: 'TikTok' }, { v: 'otro', l: 'Otro' }
];
const PROPOSITOS = [
  { v: 'pedidos', l: 'Pedidos' }, { v: 'atencion', l: 'Atención a clientes' }, { v: 'pagos', l: 'Pagos y comprobantes' },
  { v: 'facturacion', l: 'Facturación' }, { v: 'reservaciones', l: 'Reservaciones' }, { v: 'quejas', l: 'Quejas y sugerencias' },
  { v: 'general', l: 'General' }, { v: 'otro', l: 'Otro' }
];
const CATEGORIAS = [{ v: 'pagos', l: 'Pagos' }, { v: 'servicios', l: 'Servicios' }, { v: 'politicas', l: 'Políticas' }, { v: 'general', l: 'General' }];
const SUGERENCIAS = ['Métodos de pago aceptados', 'Zona de entrega a domicilio', 'Estacionamiento', 'Propinas', 'Facturación', 'Mascotas', 'Accesibilidad', 'WiFi para clientes'];

const etiqueta = (lista, v) => (lista.find(x => x.v === v) || {}).l || v;

const ENTIDADES = {
  sucursales: {
    titulo: 'Sucursales', icono: '📍', btn: 'Agregar sucursal',
    vacio: 'Aún no hay sucursales. Agrega tu local principal para que la IA pueda dar la dirección.',
    nuevo: { nombre: '', direccion: '', referencias: '', ciudad_estado: '', latitud: '', longitud: '', url_mapa: '', horario_texto: '', es_principal: false, visible_ia: true, activo: true },
    campos: [
      { n: 'nombre', l: 'Nombre de la sucursal', t: 'text', req: true, ph: 'Ej. Sucursal Centro' },
      { n: 'direccion', l: 'Dirección', t: 'textarea', ph: 'Calle, número y colonia' },
      { n: 'referencias', l: 'Referencias', t: 'text', ph: 'Frente a la plaza, junto a...' },
      { n: 'ciudad_estado', l: 'Ciudad y estado', t: 'text', ph: 'Ej. Culiacán, Sinaloa' },
      { n: 'latitud', l: 'Latitud (GPS)', t: 'number', ph: '24.809065', mitad: true },
      { n: 'longitud', l: 'Longitud (GPS)', t: 'number', ph: '-107.394017', mitad: true },
      { n: 'url_mapa', l: 'Enlace de Google Maps', t: 'text', ph: 'https://maps.google.com/...' },
      { n: 'horario_texto', l: 'Horario de esta sucursal', t: 'text', ph: 'Déjalo vacío para usar el horario general' },
      { n: 'es_principal', l: 'Es la sucursal principal', t: 'toggle' },
      { n: 'visible_ia', l: 'La IA puede compartir estos datos con clientes', t: 'toggle' },
      { n: 'activo', l: 'Activa', t: 'toggle' }
    ]
  },
  contactos: {
    titulo: 'Contactos', icono: '☎️', btn: 'Agregar contacto',
    vacio: 'Aún no hay contactos. Agrega los teléfonos y correos indicando para qué sirve cada uno.',
    nuevo: { tipo: 'telefono', proposito: 'pedidos', etiqueta: '', valor: '', notas: '', sucursal_id: '', visible_ia: true, activo: true },
    campos: [
      { n: 'tipo', l: '¿Qué es?', t: 'select', opciones: TIPOS_CONTACTO, req: true },
      { n: 'proposito', l: '¿Para qué sirve?', t: 'select', opciones: PROPOSITOS, req: true },
      { n: 'valor', l: 'Número, correo o enlace', t: 'text', req: true, ph: 'Ej. 6671234567' },
      { n: 'etiqueta', l: 'Nombre corto (opcional)', t: 'text', ph: 'Ej. Línea de pedidos' },
      { n: 'sucursal_id', l: 'Sucursal', t: 'sucursal' },
      { n: 'notas', l: 'Notas (opcional)', t: 'text', ph: 'Ej. Solo atiende de 9 a 5' },
      { n: 'visible_ia', l: 'La IA puede compartir este dato con clientes', t: 'toggle' },
      { n: 'activo', l: 'Activo', t: 'toggle' }
    ]
  },
  extras: {
    titulo: 'Información adicional', icono: '📝', btn: 'Agregar información',
    vacio: 'Agrega lo que los clientes suelen preguntar: pagos aceptados, zona de entrega, estacionamiento, etc.',
    nuevo: { categoria: 'general', titulo: '', contenido: '', visible_ia: true, activo: true },
    campos: [
      { n: 'categoria', l: 'Categoría', t: 'select', opciones: CATEGORIAS, req: true },
      { n: 'titulo', l: 'Título', t: 'text', req: true, ph: 'Ej. Zona de entrega' },
      { n: 'contenido', l: 'Contenido', t: 'textarea', req: true, ph: 'Escribe la información tal como quieres que se la den al cliente' },
      { n: 'visible_ia', l: 'La IA puede compartir esta información con clientes', t: 'toggle' },
      { n: 'activo', l: 'Activa', t: 'toggle' }
    ]
  }
};

const inputCls = 'w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-sm font-bold text-slate-800 outline-none focus:border-blue-500 transition';

const Interruptor = ({ activo, onChange }) => (
  <button type="button" role="switch" aria-checked={activo} onClick={() => onChange(!activo)}
    className={`relative w-12 h-7 rounded-full transition shrink-0 ${activo ? 'bg-emerald-500' : 'bg-slate-300'}`}>
    <span className={`absolute top-0.5 left-0.5 w-6 h-6 bg-white rounded-full shadow transition-transform ${activo ? 'translate-x-5' : ''}`} />
  </button>
);

const GestorDatosEmpresa = ({ apiUrl, showAlert, showConfirm }) => {
  const [datos, setDatos] = useState({ sucursales: [], contactos: [], extras: [] });
  const [puedeEditar, setPuedeEditar] = useState(false);
  const [cargando, setCargando] = useState(true);
  const [errorCarga, setErrorCarga] = useState('');
  const [pestana, setPestana] = useState('sucursales');
  const [editor, setEditor] = useState(null); // { entidad, id, valores }
  const [guardando, setGuardando] = useState(false);

  const cargar = useCallback(async () => {
    try {
      const res = await apiFetch(`${apiUrl}/datos-empresa`);
      const data = await res.json();
      if (res.ok && data.success) {
        setDatos({ sucursales: data.sucursales || [], contactos: data.contactos || [], extras: data.extras || [] });
        setPuedeEditar(!!data.puede_editar);
        setErrorCarga('');
      } else {
        setErrorCarga(data.error || 'No se pudieron cargar los datos de la empresa.');
      }
    } catch (e) {
      setErrorCarga('Error de conexión con el servidor.');
    }
    setCargando(false);
  }, [apiUrl]);

  useEffect(() => { cargar(); }, [cargar]);

  const abrirEditor = (entidad, item = null, prellenado = {}) => {
    const base = ENTIDADES[entidad].nuevo;
    const valores = {};
    Object.keys(base).forEach(k => { valores[k] = item && item[k] !== null && item[k] !== undefined ? item[k] : base[k]; });
    setEditor({ entidad, id: item ? item.id : null, valores: { ...valores, ...prellenado } });
  };

  const cambiar = (campo, valor) => setEditor(prev => ({ ...prev, valores: { ...prev.valores, [campo]: valor } }));

  const usarMiUbicacion = () => {
    if (!navigator.geolocation) return showAlert('Ubicación no disponible', 'Tu navegador no permite obtener la ubicación.', 'error');
    navigator.geolocation.getCurrentPosition(
      (pos) => setEditor(prev => ({ ...prev, valores: { ...prev.valores, latitud: pos.coords.latitude.toFixed(6), longitud: pos.coords.longitude.toFixed(6) } })),
      () => showAlert('No se pudo obtener la ubicación', 'Revisa el permiso de ubicación del navegador.', 'error'),
      { enableHighAccuracy: true, timeout: 8000 }
    );
  };

  const guardar = async () => {
    if (guardando || !editor) return;
    const cfg = ENTIDADES[editor.entidad];
    const faltante = cfg.campos.find(c => c.req && String(editor.valores[c.n] ?? '').trim() === '');
    if (faltante) return showAlert('Falta información', `Completa el campo "${faltante.l}".`, 'error');

    setGuardando(true);
    try {
      const url = `${apiUrl}/datos-empresa/${editor.entidad}${editor.id ? `/${editor.id}` : ''}`;
      const res = await apiFetch(url, {
        method: editor.id ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editor.valores)
      });
      const data = await res.json();
      if (res.ok && data.success) {
        showAlert('¡Guardado!', 'Los datos se actualizaron. La IA ya los usará.', 'success');
        setEditor(null);
        cargar();
      } else {
        showAlert('No se pudo guardar', data.error || 'Revisa los datos e intenta de nuevo.', 'error');
      }
    } catch (e) {
      showAlert('Error de conexión', 'No se pudo contactar al servidor.', 'error');
    }
    setGuardando(false);
  };

  const eliminar = (entidad, item) => {
    const nombre = item.nombre || item.valor || item.titulo || 'este registro';
    showConfirm('Eliminar registro', `¿Eliminar "${nombre}"? Esta acción no se puede deshacer.`, async () => {
      try {
        const res = await apiFetch(`${apiUrl}/datos-empresa/${entidad}/${item.id}`, { method: 'DELETE' });
        const data = await res.json();
        if (res.ok && data.success) { showAlert('Eliminado', 'El registro fue eliminado.', 'success'); cargar(); }
        else showAlert('No se pudo eliminar', data.error || 'Intenta de nuevo.', 'error');
      } catch (e) {
        showAlert('Error de conexión', 'No se pudo contactar al servidor.', 'error');
      }
    });
  };

  const nombreSucursal = (id) => (datos.sucursales.find(s => s.id === id) || {}).nombre;

  const resumen = (entidad, it) => {
    if (entidad === 'sucursales') {
      return {
        titulo: it.nombre,
        lineas: [[it.direccion, it.ciudad_estado].filter(Boolean).join(', '), it.referencias, it.horario_texto && `🕒 ${it.horario_texto}`,
          it.latitud !== null && it.longitud !== null ? `GPS ${Number(it.latitud)}, ${Number(it.longitud)}` : null].filter(Boolean),
        insignias: it.es_principal ? ['Principal'] : []
      };
    }
    if (entidad === 'contactos') {
      return {
        titulo: `${etiqueta(TIPOS_CONTACTO, it.tipo)} · ${it.valor}`,
        lineas: [`Para: ${etiqueta(PROPOSITOS, it.proposito)}${it.etiqueta ? ` (${it.etiqueta})` : ''}`,
          it.sucursal_id && nombreSucursal(it.sucursal_id) ? `Sucursal: ${nombreSucursal(it.sucursal_id)}` : null, it.notas].filter(Boolean),
        insignias: []
      };
    }
    return { titulo: it.titulo, lineas: [it.contenido], insignias: [etiqueta(CATEGORIAS, it.categoria)] };
  };

  const cfgActual = ENTIDADES[pestana];
  const lista = datos[pestana];

  return (
    <div className="bg-white p-4 md:p-8 rounded-[40px] shadow-sm border border-slate-200 space-y-6">
      <div>
        <h3 className="text-2xl font-black text-slate-800">🏢 Datos de la Empresa</h3>
        <p className="text-sm font-medium text-slate-500 mt-1 leading-relaxed">
          Teléfonos, ubicaciones y datos que la IA del Kiosco y de WhatsApp compartirá con tus clientes.
          El horario general y los datos de transferencia se siguen editando en las secciones de arriba.
        </p>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1">
        {Object.entries(ENTIDADES).map(([clave, c]) => (
          <button key={clave} type="button" onClick={() => setPestana(clave)}
            className={`px-4 py-2.5 rounded-2xl text-sm font-black whitespace-nowrap transition active:scale-95 ${pestana === clave ? 'bg-blue-600 text-white shadow-md' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>
            {c.icono} {c.titulo} ({datos[clave].length})
          </button>
        ))}
      </div>

      {cargando && <p className="text-sm font-bold text-slate-400">Cargando…</p>}
      {errorCarga && <p className="text-sm font-bold text-red-600 bg-red-50 border border-red-100 rounded-2xl p-4">{errorCarga}</p>}

      {!cargando && !errorCarga && (
        <>
          {puedeEditar && (
            <button type="button" onClick={() => abrirEditor(pestana)} className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-2xl font-black text-sm shadow-lg shadow-blue-500/20 transition active:scale-95">
              ＋ {cfgActual.btn}
            </button>
          )}
          {!puedeEditar && <p className="text-xs font-bold text-slate-400">Solo un administrador o gerente puede modificar estos datos.</p>}

          {pestana === 'extras' && puedeEditar && (
            <div className="flex flex-wrap gap-2">
              {SUGERENCIAS.map(s => (
                <button key={s} type="button" onClick={() => abrirEditor('extras', null, { titulo: s })}
                  className="text-xs font-bold bg-slate-50 border border-slate-200 text-slate-500 px-3 py-1.5 rounded-full hover:bg-slate-100 transition">+ {s}</button>
              ))}
            </div>
          )}

          {lista.length === 0 && <p className="text-sm font-medium text-slate-400 bg-slate-50 border border-dashed border-slate-200 rounded-2xl p-6 text-center">{cfgActual.vacio}</p>}

          <div className="grid gap-3 md:grid-cols-2">
            {lista.map(it => {
              const r = resumen(pestana, it);
              return (
                <div key={it.id} className={`border rounded-3xl p-4 bg-white ${it.activo ? 'border-slate-200' : 'border-slate-100 opacity-60'}`}>
                  <div className="flex items-start justify-between gap-3">
                    <p className="font-black text-slate-800 break-words min-w-0">{r.titulo}</p>
                    <div className="flex flex-wrap gap-1 justify-end shrink-0">
                      {r.insignias.map(b => <span key={b} className="text-[10px] font-black uppercase tracking-wider bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full">{b}</span>)}
                      <span className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full ${it.visible_ia ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-500'}`}>{it.visible_ia ? 'IA ✓' : 'Interno'}</span>
                      {!it.activo && <span className="text-[10px] font-black uppercase tracking-wider bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full">Inactivo</span>}
                    </div>
                  </div>
                  {r.lineas.map((l, i) => <p key={i} className="text-xs font-medium text-slate-500 mt-1 break-words">{l}</p>)}
                  {puedeEditar && (
                    <div className="flex gap-2 mt-3">
                      <button type="button" onClick={() => abrirEditor(pestana, it)} className="text-xs font-black bg-slate-100 hover:bg-slate-200 text-slate-600 px-4 py-2 rounded-xl transition active:scale-95">Editar</button>
                      <button type="button" onClick={() => eliminar(pestana, it)} className="text-xs font-black bg-red-50 hover:bg-red-100 text-red-600 px-4 py-2 rounded-xl transition active:scale-95">Eliminar</button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </>
      )}

      {editor && (
        <div className="fixed inset-0 z-[80] flex items-end sm:items-center justify-center bg-slate-900/60 backdrop-blur-sm sm:p-4" onClick={() => !guardando && setEditor(null)}>
          <div className="bg-white w-full sm:max-w-xl max-h-[92vh] overflow-y-auto rounded-t-[32px] sm:rounded-[32px] p-6 shadow-2xl" onClick={e => e.stopPropagation()}>
            <h4 className="text-xl font-black text-slate-800 mb-5">{ENTIDADES[editor.entidad].icono} {editor.id ? 'Editar' : 'Nuevo'} · {ENTIDADES[editor.entidad].titulo}</h4>

            <div className="grid grid-cols-2 gap-4">
              {ENTIDADES[editor.entidad].campos.map(c => {
                const v = editor.valores[c.n];
                if (c.t === 'toggle') {
                  return (
                    <div key={c.n} className="col-span-2 flex items-center justify-between gap-4 bg-slate-50 border border-slate-100 rounded-2xl px-4 py-3">
                      <span className="text-sm font-bold text-slate-600">{c.l}</span>
                      <Interruptor activo={!!v} onChange={(x) => cambiar(c.n, x)} />
                    </div>
                  );
                }
                return (
                  <div key={c.n} className={c.mitad ? 'col-span-1' : 'col-span-2'}>
                    <label className="block text-xs font-black text-slate-500 uppercase tracking-wider mb-1.5">{c.l}{c.req && ' *'}</label>
                    {c.t === 'textarea' && <textarea rows={3} className={inputCls} placeholder={c.ph} value={v} onChange={e => cambiar(c.n, e.target.value)} />}
                    {(c.t === 'text' || c.t === 'number') && (
                      <input type={c.t === 'number' ? 'number' : 'text'} step={c.t === 'number' ? 'any' : undefined} className={inputCls} placeholder={c.ph} value={v} onChange={e => cambiar(c.n, e.target.value)} />
                    )}
                    {c.t === 'select' && (
                      <select className={inputCls} value={v} onChange={e => cambiar(c.n, e.target.value)}>
                        {c.opciones.map(o => <option key={o.v} value={o.v}>{o.l}</option>)}
                      </select>
                    )}
                    {c.t === 'sucursal' && (
                      <select className={inputCls} value={v ?? ''} onChange={e => cambiar(c.n, e.target.value)}>
                        <option value="">Todas / general</option>
                        {datos.sucursales.map(s => <option key={s.id} value={s.id}>{s.nombre}</option>)}
                      </select>
                    )}
                  </div>
                );
              })}
            </div>

            {editor.entidad === 'sucursales' && (
              <button type="button" onClick={usarMiUbicacion} className="mt-3 text-xs font-black bg-emerald-50 hover:bg-emerald-100 text-emerald-600 px-4 py-2.5 rounded-xl transition active:scale-95">
                📍 Usar mi ubicación actual (estando en el local)
              </button>
            )}

            <div className="flex gap-3 mt-6">
              <button type="button" disabled={guardando} onClick={() => setEditor(null)} className="flex-1 py-3.5 rounded-2xl font-black text-slate-600 bg-slate-100 hover:bg-slate-200 transition disabled:opacity-50">Cancelar</button>
              <button type="button" disabled={guardando} onClick={guardar} className="flex-1 py-3.5 rounded-2xl font-black text-white bg-blue-600 hover:bg-blue-700 transition active:scale-95 disabled:opacity-50">{guardando ? 'Guardando…' : 'Guardar'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default GestorDatosEmpresa;