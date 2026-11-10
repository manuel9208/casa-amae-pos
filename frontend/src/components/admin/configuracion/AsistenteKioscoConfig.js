import React, { useState, useEffect, useCallback } from 'react';
import { Player } from '@lottiefiles/react-lottie-player';
import { Bot, Crown, Trash2, UploadCloud, Loader2, RotateCcw } from 'lucide-react';
import { apiFetch } from '../../../utils/apiFetch';

// =========================================================================
// 🤖 PERSONAJE ASISTENTE IA DEL KIOSCO — Componente 100% autónomo
// -------------------------------------------------------------------------
// Hermano directo de AnimacionesKiosco.js (mismo patrón visual, mismo
// candado de permisos vía kiosco_animaciones_permisos), pero mantenido
// como archivo 100% independiente para poder modificarse sin riesgo de
// romper la configuración de animaciones del menú.
//
// A diferencia de AnimacionesKiosco.js, este componente NO repite el panel
// de "Planes por Empresa": ese nivel (ninguno/lottie/premium) se define UNA
// sola vez en el panel de Animaciones y gobierna ambos módulos por diseño.
// =========================================================================

const AsistenteKioscoConfig = ({ apiUrl, showAlert, showConfirm }) => {
  const [isGlobalAdmin, setIsGlobalAdmin] = useState(false);
  const [superadminKey, setSuperadminKey] = useState('');
  const [keyValidada, setKeyValidada] = useState(false);

  // --- Biblioteca maestra (súper-admin) ---
  const [bibliotecaAdmin, setBibliotecaAdmin] = useState([]);
  const [nuevoId, setNuevoId] = useState('');
  const [nuevoNombre, setNuevoNombre] = useState('');
  const [nuevoEmoji, setNuevoEmoji] = useState('');
  const [nuevoTipo, setNuevoTipo] = useState('imagen');
  const [archivoFile, setArchivoFile] = useState(null);
  const [previewFile, setPreviewFile] = useState(null);
  const [subiendo, setSubiendo] = useState(false);

  // --- Sección cliente ---
  const [bibliotecaCliente, setBibliotecaCliente] = useState([]);
  const [asistenteActual, setAsistenteActual] = useState({ fuente: 'default' });
  const [cargandoCliente, setCargandoCliente] = useState(true);

  const [nombreAsistenteInput, setNombreAsistenteInput] = useState('Asistente');
  const [mensajeSaludoInput, setMensajeSaludoInput] = useState('¡Hola! ¿En qué te puedo ayudar hoy?');
  const [modoSeleccion, setModoSeleccion] = useState('biblioteca'); // 'biblioteca' | 'personalizado'
  const [bibliotecaIdElegida, setBibliotecaIdElegida] = useState('');
  const [tipoPersonalizado, setTipoPersonalizado] = useState('imagen');
  const [archivoPersonalizado, setArchivoPersonalizado] = useState(null);
  const [previewPersonalizado, setPreviewPersonalizado] = useState(null);
  const [guardandoCliente, setGuardandoCliente] = useState(false);

  // ==========================================
  // CARGA DE DATOS — SECCIÓN CLIENTE
  // ==========================================
  const cargarDatosCliente = useCallback(async () => {
    setCargandoCliente(true);
    try {
      const [resBiblio, resActual] = await Promise.all([
        apiFetch(`${apiUrl}/kiosco-asistente/biblioteca`),
        apiFetch(`${apiUrl}/kiosco-asistente/empresa`)
      ]);

      const biblio = resBiblio.ok ? await resBiblio.json() : [];
      const actualData = resActual.ok ? await resActual.json() : { asistente: { fuente: 'default' } };

      setBibliotecaCliente(Array.isArray(biblio) ? biblio : []);
      const actual = actualData.asistente || { fuente: 'default' };
      setAsistenteActual(actual);
      setNombreAsistenteInput(actual.nombre_asistente || 'Asistente');
      setMensajeSaludoInput(actual.mensaje_saludo || '¡Hola! ¿En qué te puedo ayudar hoy?');
      if (actual.fuente === 'biblioteca' && actual.biblioteca_id) {
        setModoSeleccion('biblioteca');
        setBibliotecaIdElegida(actual.biblioteca_id);
      } else if (actual.fuente === 'personalizado') {
        setModoSeleccion('personalizado');
      }
    } catch (e) {
      console.error('Error al cargar el asistente del Kiosco:', e);
    }
    setCargandoCliente(false);
  }, [apiUrl]);

  const guardarDesdeBiblioteca = async () => {
    if (!bibliotecaIdElegida) {
      showAlert('Falta seleccionar', 'Elige un personaje de la biblioteca.', 'error');
      return;
    }
    setGuardandoCliente(true);
    try {
      const res = await apiFetch(`${apiUrl}/kiosco-asistente/seleccionar`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fuente: 'biblioteca', biblioteca_id: bibliotecaIdElegida, nombre_asistente: nombreAsistenteInput, mensaje_saludo: mensajeSaludoInput })
      });
      const data = await res.json();
      if (res.ok) {
        showAlert('¡Guardado!', 'El personaje del asistente se actualizó correctamente.', 'success');
        cargarDatosCliente();
      } else {
        showAlert('No disponible', data.error || 'No se pudo guardar el personaje.', 'error');
      }
    } catch (e) {
      showAlert('Error de conexión', 'No se pudo conectar con el servidor.', 'error');
    }
    setGuardandoCliente(false);
  };

  const guardarPersonalizado = async () => {
    if (!archivoPersonalizado) {
      showAlert('Falta el archivo', 'Selecciona el archivo de tu personaje (imagen, Lottie JSON o video).', 'error');
      return;
    }
    setGuardandoCliente(true);
    const formData = new FormData();
    formData.append('fuente', 'personalizado');
    formData.append('tipo_personalizado', tipoPersonalizado);
    formData.append('nombre_asistente', nombreAsistenteInput);
    formData.append('mensaje_saludo', mensajeSaludoInput);
    formData.append('archivo', archivoPersonalizado);
    if (previewPersonalizado) formData.append('preview', previewPersonalizado);

    try {
      const res = await apiFetch(`${apiUrl}/kiosco-asistente/personalizado`, {
        method: 'POST',
        body: formData
      });
      const data = await res.json();
      if (res.ok) {
        showAlert('¡Guardado!', 'Tu personaje personalizado se subió correctamente.', 'success');
        setArchivoPersonalizado(null);
        setPreviewPersonalizado(null);
        cargarDatosCliente();
      } else {
        showAlert('No disponible', data.error || 'No se pudo subir tu personaje.', 'error');
      }
    } catch (e) {
      showAlert('Error de conexión', 'No se pudo conectar con el servidor.', 'error');
    }
    setGuardandoCliente(false);
  };

  const restablecerDefault = () => {
    showConfirm(
      '¿Volver al asistente por defecto?',
      'Se eliminará tu personaje actual (de biblioteca o personalizado) y el Kiosco usará el asistente incluido por el sistema.',
      async () => {
        try {
          const res = await apiFetch(`${apiUrl}/kiosco-asistente`, { method: 'DELETE' });
          if (res.ok) {
            showAlert('Restablecido', 'El Kiosco usará el asistente por defecto.', 'success');
            setBibliotecaIdElegida('');
            setModoSeleccion('biblioteca');
            cargarDatosCliente();
          } else {
            showAlert('Error', 'No se pudo restablecer el asistente.', 'error');
          }
        } catch (e) {
          showAlert('Error de conexión', 'No se pudo conectar con el servidor.', 'error');
        }
      }
    );
  };

  // ==========================================
  // SÚPER-ADMIN: Biblioteca completa (sin filtrar)
  // ==========================================
  const cargarBibliotecaAdmin = useCallback(async (key) => {
    try {
      const res = await apiFetch(`${apiUrl}/kiosco-asistente/biblioteca-admin`, {
        headers: { 'X-Superadmin-Key': key }
      });
      if (res.ok) {
        const data = await res.json();
        setBibliotecaAdmin(Array.isArray(data) ? data : []);
      }
    } catch (e) {
      console.error('Error al cargar biblioteca admin de personajes:', e);
    }
  }, [apiUrl]);

  const subirPersonajeBiblioteca = async (e) => {
    e.preventDefault();
    if (!nuevoId.trim() || !nuevoNombre.trim() || !archivoFile) {
      showAlert('Faltan datos', 'Completa el ID, el nombre y selecciona el archivo principal.', 'error');
      return;
    }
    setSubiendo(true);
    const formData = new FormData();
    formData.append('id', nuevoId.trim());
    formData.append('nombre', nuevoNombre.trim());
    formData.append('emoji', nuevoEmoji.trim());
    formData.append('tipo', nuevoTipo);
    formData.append('archivo', archivoFile);
    if (previewFile) formData.append('preview', previewFile);

    try {
      const res = await apiFetch(`${apiUrl}/kiosco-asistente/biblioteca`, {
        method: 'POST',
        headers: { 'X-Superadmin-Key': superadminKey },
        body: formData
      });
      const data = await res.json();
      if (res.ok) {
        showAlert('¡Subido!', `El personaje "${nuevoNombre}" se agregó a la biblioteca.`, 'success');
        setNuevoId(''); setNuevoNombre(''); setNuevoEmoji(''); setNuevoTipo('imagen');
        setArchivoFile(null); setPreviewFile(null);
        cargarBibliotecaAdmin(superadminKey);
        cargarDatosCliente();
      } else {
        showAlert('Error al subir', data.error || 'No se pudo subir el personaje.', 'error');
      }
    } catch (e) {
      showAlert('Error de conexión', 'No se pudo subir el archivo.', 'error');
    }
    setSubiendo(false);
  };

  const eliminarDeBiblioteca = (item) => {
    showConfirm(
      '¿Eliminar personaje?',
      `Esto eliminará "${item.nombre}" de la biblioteca para todos los negocios. Las empresas que lo tengan asignado volverán al asistente por defecto.`,
      async () => {
        try {
          const res = await apiFetch(`${apiUrl}/kiosco-asistente/biblioteca/${item.id}`, {
            method: 'DELETE',
            headers: { 'X-Superadmin-Key': superadminKey }
          });
          if (res.ok) {
            showAlert('Eliminado', 'El personaje se eliminó correctamente.', 'success');
            cargarBibliotecaAdmin(superadminKey);
            cargarDatosCliente();
          } else {
            const data = await res.json().catch(() => ({}));
            showAlert('Error', data.error || 'No se pudo eliminar.', 'error');
          }
        } catch (e) {
          showAlert('Error de conexión', 'No se pudo eliminar.', 'error');
        }
      }
    );
  };

  // ==========================================
  // EFECTOS DE ARRANQUE (mismo patrón que AnimacionesKiosco.js)
  // ==========================================
  useEffect(() => {
    cargarDatosCliente();
  }, [cargarDatosCliente]);

  useEffect(() => {
    const sesionRaw = localStorage.getItem('pos_sesion');
    if (!sesionRaw) return;
    try {
      const sesion = JSON.parse(sesionRaw);
      if (sesion?.tipo === 'empleado' && sesion?.data?.usuario === 'admin') {
        setIsGlobalAdmin(true);
        const keyGuardada = localStorage.getItem('pos_superadmin_key');
        if (keyGuardada) {
          (async () => {
            try {
              const res = await apiFetch(`${apiUrl}/kiosco-asistente/biblioteca-admin`, {
                headers: { 'X-Superadmin-Key': keyGuardada }
              });
              if (res.ok) {
                setSuperadminKey(keyGuardada);
                setKeyValidada(true);
                cargarBibliotecaAdmin(keyGuardada);
              }
            } catch (e) { /* silencioso */ }
          })();
        }
      }
    } catch (e) { /* sesión corrupta, se ignora */ }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [apiUrl]);

  const renderMiniPreview = (tipo, url) => {
    if (!url) return <Bot size={24} className="text-slate-400" />;
    if (tipo === 'video') return <video src={url} muted loop autoPlay playsInline className="w-full h-full object-cover" />;
    if (tipo === 'lottie') return <Player autoplay loop src={url} style={{ width: '100%', height: '100%' }} />;
    return <img src={url} alt="Personaje" className="w-full h-full object-cover" />;
  };

  return (
    <div className="bg-white rounded-[32px] border border-slate-200 p-6 md:p-8 space-y-8">
      <div className="flex items-center gap-3">
        <div className="bg-gradient-to-br from-sky-500 to-indigo-600 p-3 rounded-2xl text-white shrink-0">
          <Bot size={22} />
        </div>
        <div>
          <h3 className="text-xl font-black text-slate-800">Personaje Asistente IA del Kiosco</h3>
          <p className="text-sm text-slate-500 font-medium">Elige quién saluda y resuelve dudas de tus clientes en el Kiosco.</p>
        </div>
      </div>

      {/* ============================================ */}
      {/* PANEL SÚPER-ADMIN — SOLO VISIBLE PARA ADMIN GLOBAL */}
      {/* ============================================ */}
      {isGlobalAdmin && keyValidada && (
        <div className="bg-slate-900 text-white rounded-[28px] p-6 md:p-8 space-y-6">
          <div className="flex items-center gap-3">
            <div className="bg-gradient-to-br from-amber-400 to-orange-500 p-3 rounded-2xl text-slate-900 shrink-0">
              <Crown size={20} />
            </div>
            <div>
              <h4 className="text-lg font-black">Panel Súper-Admin — Biblioteca de Personajes</h4>
              <p className="text-xs text-slate-400 font-medium">
                El plan de cada negocio (Ninguno / Lottie / Premium) ya se configura en la sección "Animaciones del Kiosco" — aplica igual aquí.
              </p>
            </div>
          </div>

          <div>
            <h5 className="font-black text-sm uppercase tracking-wide text-slate-400 mb-3">Biblioteca Maestra</h5>
            <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-3 mb-5">
              {bibliotecaAdmin.map(item => (
                <div key={item.id} className="bg-slate-800 rounded-xl p-3 flex items-center gap-3">
                  <div className="w-12 h-12 rounded-lg overflow-hidden bg-slate-700 shrink-0 flex items-center justify-center">
                    {renderMiniPreview(item.tipo, item.url_media)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold truncate">{item.emoji} {item.nombre}</p>
                    <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full ${item.tipo === 'video' ? 'bg-rose-500/20 text-rose-300' : item.tipo === 'lottie' ? 'bg-indigo-500/20 text-indigo-300' : 'bg-emerald-500/20 text-emerald-300'}`}>
                      {item.tipo}
                    </span>
                  </div>
                  <button onClick={() => eliminarDeBiblioteca(item)} className="text-slate-500 hover:text-red-400 transition shrink-0">
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
              {bibliotecaAdmin.length === 0 && (
                <p className="text-sm text-slate-500 col-span-full">Aún no hay personajes en la biblioteca.</p>
              )}
            </div>

            <form onSubmit={subirPersonajeBiblioteca} className="bg-slate-800 rounded-2xl p-5 space-y-3">
              <p className="text-xs font-black uppercase text-slate-400 mb-1">Subir nuevo personaje</p>
              <div className="grid sm:grid-cols-2 gap-3">
                <input value={nuevoId} onChange={e => setNuevoId(e.target.value)} placeholder="ID único (ej. robot_01)" className="bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-amber-400" />
                <input value={nuevoNombre} onChange={e => setNuevoNombre(e.target.value)} placeholder="Nombre (ej. Robi el Robot)" className="bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-amber-400" />
                <input value={nuevoEmoji} onChange={e => setNuevoEmoji(e.target.value)} placeholder="Emoji (opcional, ej. 🤖)" className="bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-amber-400" />
                <select value={nuevoTipo} onChange={e => setNuevoTipo(e.target.value)} className="bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-amber-400">
                  <option value="imagen">🖼️ Imagen</option>
                  <option value="lottie">✨ Lottie (JSON)</option>
                  <option value="video">🎬 Video (MP4)</option>
                </select>
              </div>
              <div className="grid sm:grid-cols-2 gap-3">
                <label className="flex items-center justify-center gap-2 bg-slate-700 border border-dashed border-slate-500 rounded-lg px-3 py-3 text-xs font-bold cursor-pointer hover:bg-slate-600 transition text-center">
                  <UploadCloud size={16} className="shrink-0" />
                  <span className="truncate">{archivoFile ? archivoFile.name : 'Archivo principal (imagen/.json/.mp4)'}</span>
                  <input type="file" accept="image/*,.json,video/*" className="hidden" onChange={e => setArchivoFile(e.target.files[0])} />
                </label>
                <label className="flex items-center justify-center gap-2 bg-slate-700 border border-dashed border-slate-500 rounded-lg px-3 py-3 text-xs font-bold cursor-pointer hover:bg-slate-600 transition text-center">
                  <UploadCloud size={16} className="shrink-0" />
                  <span className="truncate">{previewFile ? previewFile.name : 'Miniatura (opcional)'}</span>
                  <input type="file" accept="image/*" className="hidden" onChange={e => setPreviewFile(e.target.files[0])} />
                </label>
              </div>
              <button type="submit" disabled={subiendo} className="w-full bg-amber-400 hover:bg-amber-300 text-slate-900 font-black py-3 rounded-xl transition disabled:opacity-50">
                {subiendo ? 'Subiendo...' : '⬆️ Subir a la Biblioteca'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ============================================ */}
      {/* SELECCIÓN DEL NEGOCIO — VISIBLE PARA CUALQUIER ADMIN */}
      {/* ============================================ */}
      <div className="space-y-5">
        {cargandoCliente ? (
          <div className="flex items-center gap-2 text-slate-400 text-sm font-medium py-6 justify-center">
            <Loader2 size={18} className="animate-spin" /> Cargando personajes disponibles...
          </div>
        ) : (
          <>
            {/* Vista previa actual */}
            <div className="flex items-center gap-4 bg-slate-50 border border-slate-200 rounded-2xl p-4">
              <div className="w-16 h-16 rounded-xl overflow-hidden bg-white border border-slate-200 flex items-center justify-center shrink-0">
                {asistenteActual.fuente === 'personalizado'
                  ? renderMiniPreview(asistenteActual.tipo_personalizado, asistenteActual.url_personalizado)
                  : asistenteActual.fuente === 'biblioteca'
                    ? renderMiniPreview(asistenteActual.biblioteca_tipo, asistenteActual.biblioteca_url_media)
                    : <Bot size={28} className="text-slate-400" />}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-black uppercase text-slate-400">Personaje actual</p>
                <p className="font-bold text-slate-800 truncate">
                  {asistenteActual.fuente === 'default' ? 'Asistente por defecto del sistema' : (asistenteActual.nombre_asistente || 'Asistente')}
                </p>
              </div>
              {asistenteActual.fuente !== 'default' && (
                <button onClick={restablecerDefault} className="text-slate-500 hover:text-red-500 transition shrink-0 flex items-center gap-1 text-xs font-bold">
                  <RotateCcw size={14} /> Restablecer
                </button>
              )}
            </div>

            {bibliotecaCliente.length === 0 && (
              <div className="bg-amber-50 border border-amber-200 text-amber-700 rounded-2xl p-4 text-sm font-medium">
                🔒 Tu plan actual no incluye personalizar el asistente, o no hay personajes en la biblioteca todavía. Puedes seguir usando el asistente por defecto.
              </div>
            )}

            <div>
              <label className="text-xs font-black uppercase text-slate-400 mb-1 block">Nombre del asistente</label>
              <input
                value={nombreAsistenteInput}
                onChange={e => setNombreAsistenteInput(e.target.value)}
                placeholder="Ej. Toni, Chef Max..."
                className="w-full border border-slate-300 rounded-xl px-4 py-2.5 text-sm font-medium outline-none focus:ring-2 focus:ring-indigo-400"
              />
            </div>

            <div>
              <label className="text-xs font-black uppercase text-slate-400 mb-1 block">Mensaje de saludo</label>
              <textarea
                value={mensajeSaludoInput}
                onChange={e => setMensajeSaludoInput(e.target.value)}
                placeholder="¡Hola! ¿En qué te puedo ayudar hoy?"
                rows={2}
                maxLength={200}
                className="w-full border border-slate-300 rounded-xl px-4 py-2.5 text-sm font-medium outline-none focus:ring-2 focus:ring-indigo-400 resize-none"
              />
              <p className="text-[11px] text-slate-400 font-medium mt-1">Este es el primer mensaje que verá el cliente al abrir el chat del Kiosco.</p>
            </div>

            {/* Selector de modo */}
            <div className="flex gap-2">
              <button
                onClick={() => setModoSeleccion('biblioteca')}
                className={`flex-1 py-2.5 rounded-xl font-bold text-sm transition ${modoSeleccion === 'biblioteca' ? 'bg-indigo-600 text-white shadow-md' : 'bg-slate-100 text-slate-600'}`}
              >
                Elegir de la biblioteca
              </button>
              <button
                onClick={() => setModoSeleccion('personalizado')}
                className={`flex-1 py-2.5 rounded-xl font-bold text-sm transition ${modoSeleccion === 'personalizado' ? 'bg-indigo-600 text-white shadow-md' : 'bg-slate-100 text-slate-600'}`}
              >
                Subir mi propio personaje
              </button>
            </div>

            {modoSeleccion === 'biblioteca' ? (
              <div className="space-y-3">
                <select
                  value={bibliotecaIdElegida}
                  onChange={e => setBibliotecaIdElegida(e.target.value)}
                  className="w-full border border-slate-300 rounded-xl px-4 py-2.5 text-sm font-medium outline-none focus:ring-2 focus:ring-indigo-400"
                  disabled={bibliotecaCliente.length === 0}
                >
                  <option value="">Selecciona un personaje...</option>
                  {bibliotecaCliente.map(a => (
                    <option key={a.id} value={a.id}>{a.emoji} {a.nombre} ({a.tipo})</option>
                  ))}
                </select>
                <button
                  onClick={guardarDesdeBiblioteca}
                  disabled={guardandoCliente || !bibliotecaIdElegida}
                  className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-black py-3 rounded-xl transition disabled:opacity-50"
                >
                  {guardandoCliente ? 'Guardando...' : 'Usar este personaje'}
                </button>
              </div>
            ) : (
              <div className="space-y-3 bg-slate-50 border border-slate-200 rounded-2xl p-5">
                <select
                  value={tipoPersonalizado}
                  onChange={e => setTipoPersonalizado(e.target.value)}
                  className="w-full border border-slate-300 rounded-xl px-4 py-2.5 text-sm font-medium outline-none focus:ring-2 focus:ring-indigo-400"
                >
                  <option value="imagen">🖼️ Imagen</option>
                  <option value="lottie">✨ Lottie (JSON)</option>
                  <option value="video">🎬 Video (MP4)</option>
                </select>
                <label className="flex items-center justify-center gap-2 bg-white border border-dashed border-slate-300 rounded-xl px-3 py-4 text-xs font-bold cursor-pointer hover:bg-slate-100 transition text-center">
                  <UploadCloud size={16} className="shrink-0" />
                  <span className="truncate">{archivoPersonalizado ? archivoPersonalizado.name : 'Archivo del personaje (imagen/.json/.mp4)'}</span>
                  <input type="file" accept="image/*,.json,video/*" className="hidden" onChange={e => setArchivoPersonalizado(e.target.files[0])} />
                </label>
                <label className="flex items-center justify-center gap-2 bg-white border border-dashed border-slate-300 rounded-xl px-3 py-4 text-xs font-bold cursor-pointer hover:bg-slate-100 transition text-center">
                  <UploadCloud size={16} className="shrink-0" />
                  <span className="truncate">{previewPersonalizado ? previewPersonalizado.name : 'Miniatura (opcional)'}</span>
                  <input type="file" accept="image/*" className="hidden" onChange={e => setPreviewPersonalizado(e.target.files[0])} />
                </label>
                <button
                  onClick={guardarPersonalizado}
                  disabled={guardandoCliente || !archivoPersonalizado}
                  className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-black py-3 rounded-xl transition disabled:opacity-50"
                >
                  {guardandoCliente ? 'Subiendo...' : 'Usar mi personaje personalizado'}
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default AsistenteKioscoConfig;