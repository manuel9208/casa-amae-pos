import React, { useState, useEffect, useCallback } from 'react';
import { Player } from '@lottiefiles/react-lottie-player';
import { Sparkles, Crown, KeyRound, Trash2, UploadCloud, Palette, Loader2, Smile } from 'lucide-react';
import { apiFetch } from '../../../utils/apiFetch';

// 🆕 Paleta fija de emojis, reutilizando el mismo banco que ya existe en
// AdminPanel.js (EMOJIS_POR_GIRO) — principio DRY, cero lista nueva inventada.
const EMOJIS_KIOSCO = {
  "☕ Cafetería & Bebidas": ["☕", "🍵", "🥤", "🧋", "🧃", "🧉", "🥛", "🍺", "🍷", "🥂", "🍹", "🍸", "🍶", "🧊"],
  "🍔 Comida Rápida": ["🍔", "🍟", "🍕", "🌭", "🥪", "🌮", "🌯", "🥙", "🍖", "🍗", "🥓"],
  "🥐 Desayunos & Pan": ["🥐", "🥯", "🍞", "🥖", "🥨", "🥞", "🧇", "🍳"],
  "🍰 Postres & Dulces": ["🍦", "🍧", "🍨", "🍩", "🍪", "🎂", "🍰", "🧁", "🥧", "🍫", "🍬", "🍮", "🍯"],
  "🍣 Asiática & Mariscos": ["🍣", "🍱", "🍚", "🍙", "🍜", "🍲", "🦐", "🍤", "🦀", "🦑", "🥡", "🥢"],
  "🥗 Saludable & Verde": ["🥗", "🥣", "🥑", "🥦", "🥬", "🥒", "🥕", "🌽", "🍅"],
  "🍽️ General": ["🍽️", "🍴", "🥄", "🔥", "⭐", "🌶️", "🧀", "🧅", "🍄", "🥩"]
};

// =========================================================================
// 🎬 ANIMACIONES DEL KIOSCO — Componente 100% autónomo ("nueva sesión")
// -------------------------------------------------------------------------
// NO depende de configGlobal ni de guardarConfiguracion() de AdminConfiguracion.js.
// Tiene sus propias llamadas, su propio estado y su propio feedback (showAlert).
//
// Dos secciones:
//   1) Panel Súper-Admin (solo visible si el usuario logueado es "admin" global):
//      gestiona la biblioteca maestra y el plan (nivel) de cada empresa.
//   2) Personalización por Categoría (visible para cualquier admin con acceso
//      a Configuración): elige qué animación/video usa cada categoría del Kiosco.
// =========================================================================

const AnimacionesKiosco = ({ apiUrl, showAlert, showConfirm }) => {
  // --- Identidad del súper-admin (leída de la sesión ya guardada por App.js) ---
  const [isGlobalAdmin, setIsGlobalAdmin] = useState(false);

  // --- Llave secreta de súper-admin ---
  const [keyInput, setKeyInput] = useState('');
  const [superadminKey, setSuperadminKey] = useState('');
  const [keyValidada, setKeyValidada] = useState(false);
  const [cargandoAdmin, setCargandoAdmin] = useState(false);

  // --- Datos del panel súper-admin ---
  const [empresasPermisos, setEmpresasPermisos] = useState([]);
  const [bibliotecaAdmin, setBibliotecaAdmin] = useState([]);

  // --- Formulario de subida de nueva animación ---
  const [nuevoId, setNuevoId] = useState('');
  const [nuevoNombre, setNuevoNombre] = useState('');
  const [nuevoEmoji, setNuevoEmoji] = useState('');
  const [nuevoTipo, setNuevoTipo] = useState('lottie');
  const [mostrarSelectorEmoji, setMostrarSelectorEmoji] = useState(false); // 🆕
  const [archivoFile, setArchivoFile] = useState(null);
  const [previewFile, setPreviewFile] = useState(null);
  const [subiendo, setSubiendo] = useState(false);

  // --- Sección cliente: personalización por categoría ---
  const [categorias, setCategorias] = useState([]);
  const [bibliotecaCliente, setBibliotecaCliente] = useState([]);
  const [asignaciones, setAsignaciones] = useState({});
  const [cargandoCliente, setCargandoCliente] = useState(true);

  // ==========================================
  // CARGA DE DATOS — SECCIÓN CLIENTE
  // ==========================================
  const cargarDatosCliente = useCallback(async () => {
    setCargandoCliente(true);
    try {
      const [resCats, resBiblio, resAsign] = await Promise.all([
        apiFetch(`${apiUrl}/clasificaciones`),
        apiFetch(`${apiUrl}/kiosco-animaciones/biblioteca`),
        apiFetch(`${apiUrl}/kiosco-animaciones/empresa`)
      ]);

      const cats = resCats.ok ? await resCats.json() : [];
      const biblio = resBiblio.ok ? await resBiblio.json() : [];
      const asignData = resAsign.ok ? await resAsign.json() : { animaciones: [] };

      setCategorias(Array.isArray(cats) ? cats : []);
      setBibliotecaCliente(Array.isArray(biblio) ? biblio : []);

      const mapa = {};
      (asignData.animaciones || []).forEach(a => {
        mapa[a.nombre_categoria_kiosco] = a.animacion_id;
      });
      setAsignaciones(mapa);
    } catch (e) {
      console.error('Error al cargar animaciones del Kiosco:', e);
    }
    setCargandoCliente(false);
  }, [apiUrl]);

  const guardarSeleccion = async (nombreCategoria, animacionId) => {
    try {
      const res = await apiFetch(`${apiUrl}/kiosco-animaciones`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nombre_categoria_kiosco: nombreCategoria, animacion_id: animacionId || null })
      });
      const data = await res.json();
      if (res.ok) {
        setAsignaciones(prev => ({ ...prev, [nombreCategoria]: animacionId || null }));
        showAlert('¡Guardado!', `La animación de "${nombreCategoria}" se actualizó correctamente.`, 'success');
      } else {
        showAlert('No disponible', data.error || 'No se pudo guardar la animación.', 'error');
      }
    } catch (e) {
      showAlert('Error de conexión', 'No se pudo conectar con el servidor.', 'error');
    }
  };

  // ==========================================
  // SÚPER-ADMIN: Biblioteca completa (sin filtrar)
  // ==========================================
  const cargarBibliotecaAdmin = useCallback(async (key) => {
    try {
      const res = await apiFetch(`${apiUrl}/kiosco-animaciones/biblioteca-admin`, {
        headers: { 'X-Superadmin-Key': key }
      });
      if (res.ok) {
        const data = await res.json();
        setBibliotecaAdmin(Array.isArray(data) ? data : []);
      }
    } catch (e) {
      console.error('Error al cargar biblioteca admin:', e);
    }
  }, [apiUrl]);

  const validarLlave = async () => {
    if (!keyInput.trim()) {
      showAlert('Falta la llave', 'Escribe la llave secreta de súper-admin.', 'error');
      return;
    }
    setCargandoAdmin(true);
    try {
      const res = await apiFetch(`${apiUrl}/kiosco-animaciones/permisos-empresas`, {
        headers: { 'X-Superadmin-Key': keyInput.trim() }
      });
      if (res.ok) {
        const data = await res.json();
        localStorage.setItem('pos_superadmin_key', keyInput.trim());
        setSuperadminKey(keyInput.trim());
        setKeyValidada(true);
        setEmpresasPermisos(data.empresas || []);
        cargarBibliotecaAdmin(keyInput.trim());
        showAlert('¡Acceso concedido!', 'Llave de súper-admin validada correctamente.', 'success');
      } else {
        showAlert('Acceso denegado', 'La llave ingresada es incorrecta.', 'error');
      }
    } catch (e) {
      showAlert('Error de conexión', 'No se pudo validar la llave.', 'error');
    }
    setCargandoAdmin(false);
  };

  const actualizarNivelEmpresa = async (empresaId, nuevoNivel) => {
    try {
      const res = await apiFetch(`${apiUrl}/kiosco-animaciones/permisos-empresas`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Superadmin-Key': superadminKey },
        body: JSON.stringify({ empresa_id: empresaId, nivel: nuevoNivel })
      });
      if (res.ok) {
        setEmpresasPermisos(prev => prev.map(e => e.empresa_id === empresaId ? { ...e, nivel: nuevoNivel } : e));
        showAlert('Actualizado', 'El plan de la empresa se actualizó correctamente.', 'success');
      } else {
        showAlert('Error', 'No se pudo actualizar el permiso.', 'error');
      }
    } catch (e) {
      showAlert('Error de conexión', 'No se pudo actualizar.', 'error');
    }
  };

  const subirAnimacion = async (e) => {
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
      const res = await apiFetch(`${apiUrl}/kiosco-animaciones/biblioteca`, {
        method: 'POST',
        headers: { 'X-Superadmin-Key': superadminKey },
        body: formData
      });
      const data = await res.json();
      if (res.ok) {
        showAlert('¡Subido!', `La animación "${nuevoNombre}" se agregó a la biblioteca.`, 'success');
        setNuevoId(''); setNuevoNombre(''); setNuevoEmoji(''); setNuevoTipo('lottie');
        setArchivoFile(null); setPreviewFile(null);
        cargarBibliotecaAdmin(superadminKey);
        cargarDatosCliente(); // 🆕 Refresca también el selector de "Personaliza cada categoría"
      } else {
        showAlert('Error al subir', data.error || 'No se pudo subir la animación.', 'error');
      }
    } catch (e) {
      showAlert('Error de conexión', 'No se pudo subir el archivo.', 'error');
    }
    setSubiendo(false);
  };

  const eliminarDeBiblioteca = (item) => {
    showConfirm(
      '¿Eliminar animación?',
      `Esto eliminará "${item.nombre}" de la biblioteca para todos los negocios. Las categorías que la tengan asignada volverán al tinte de color por defecto.`,
      async () => {
        try {
          const res = await apiFetch(`${apiUrl}/kiosco-animaciones/biblioteca/${item.id}`, {
            method: 'DELETE',
            headers: { 'X-Superadmin-Key': superadminKey }
          });
          if (res.ok) {
            showAlert('Eliminado', 'La animación se eliminó correctamente.', 'success');
            cargarBibliotecaAdmin(superadminKey);
            cargarDatosCliente(); // 🆕 Refresca también el selector de "Personaliza cada categoría"
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
  // EFECTOS DE ARRANQUE
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
          setKeyInput(keyGuardada);
          (async () => {
            setCargandoAdmin(true);
            try {
              const res = await apiFetch(`${apiUrl}/kiosco-animaciones/permisos-empresas`, {
                headers: { 'X-Superadmin-Key': keyGuardada }
              });
              if (res.ok) {
                const data = await res.json();
                setSuperadminKey(keyGuardada);
                setKeyValidada(true);
                setEmpresasPermisos(data.empresas || []);
                cargarBibliotecaAdmin(keyGuardada);
              } else {
                localStorage.removeItem('pos_superadmin_key');
              }
            } catch (e) { /* silencioso */ }
            setCargandoAdmin(false);
          })();
        }
      }
    } catch (e) { /* sesión corrupta, se ignora */ }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [apiUrl]);

  const animacionesLottie = bibliotecaCliente.filter(a => a.tipo === 'lottie');
  const animacionesVideo = bibliotecaCliente.filter(a => a.tipo === 'video');

  return (
    <div className="bg-white rounded-[32px] border border-slate-200 p-6 md:p-8 space-y-8">
      <div className="flex items-center gap-3">
        <div className="bg-gradient-to-br from-fuchsia-500 to-indigo-600 p-3 rounded-2xl text-white shrink-0">
          <Sparkles size={22} />
        </div>
        <div>
          <h3 className="text-xl font-black text-slate-800">Animaciones del Kiosco</h3>
          <p className="text-sm text-slate-500 font-medium">Dale vida al menú de tus clientes con animaciones y videos ambientales por categoría.</p>
        </div>
      </div>

      {/* ============================================ */}
      {/* PANEL SÚPER-ADMIN — SOLO VISIBLE PARA ADMIN GLOBAL */}
      {/* ============================================ */}
      {isGlobalAdmin && (
        <div className="bg-slate-900 text-white rounded-[28px] p-6 md:p-8 space-y-6">
          <div className="flex items-center gap-3">
            <div className="bg-gradient-to-br from-amber-400 to-orange-500 p-3 rounded-2xl text-slate-900 shrink-0">
              <Crown size={20} />
            </div>
            <div>
              <h4 className="text-lg font-black">Panel Súper-Admin — Gestión Global</h4>
              <p className="text-xs text-slate-400 font-medium">Solo visible para ti. Gestiona la biblioteca maestra y los planes de cada negocio.</p>
            </div>
          </div>

          {!keyValidada ? (
            <div className="flex flex-col sm:flex-row gap-3">
              <input
                type="password"
                value={keyInput}
                onChange={(e) => setKeyInput(e.target.value)}
                placeholder="Llave secreta de súper-admin"
                className="flex-1 bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-sm font-medium outline-none focus:ring-2 focus:ring-amber-400"
              />
              <button
                onClick={validarLlave}
                disabled={cargandoAdmin}
                className="bg-amber-400 hover:bg-amber-300 text-slate-900 font-black px-6 py-3 rounded-xl transition disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {cargandoAdmin ? <Loader2 size={18} className="animate-spin" /> : <KeyRound size={18} />}
                {cargandoAdmin ? 'Verificando...' : 'Desbloquear'}
              </button>
            </div>
          ) : (
            <div className="space-y-8">
              {/* Planes por empresa */}
              <div>
                <h5 className="font-black text-sm uppercase tracking-wide text-slate-400 mb-3">Planes por Empresa</h5>
                <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                  {empresasPermisos.map(emp => (
                    <div key={emp.empresa_id} className="flex items-center justify-between bg-slate-800 rounded-xl px-4 py-3 gap-3">
                      <span className="font-bold text-sm truncate">{emp.empresa_nombre}</span>
                      <select
                        value={emp.nivel}
                        onChange={(e) => actualizarNivelEmpresa(emp.empresa_id, e.target.value)}
                        className="bg-slate-700 border border-slate-600 rounded-lg px-3 py-1.5 text-sm font-bold outline-none shrink-0"
                      >
                        <option value="ninguno">🔒 Ninguno</option>
                        <option value="lottie">✨ Básico (Lottie)</option>
                        <option value="premium">🎬 Premium (Lottie + Video)</option>
                      </select>
                    </div>
                  ))}
                  {empresasPermisos.length === 0 && (
                    <p className="text-sm text-slate-500">No hay empresas registradas.</p>
                  )}
                </div>
              </div>

              {/* Biblioteca maestra */}
              <div>
                <h5 className="font-black text-sm uppercase tracking-wide text-slate-400 mb-3">Biblioteca Maestra</h5>
                <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-3 mb-5">
                  {bibliotecaAdmin.map(item => (
                    <div key={item.id} className="bg-slate-800 rounded-xl p-3 flex items-center gap-3">
                      <div className="w-12 h-12 rounded-lg overflow-hidden bg-slate-700 shrink-0 flex items-center justify-center">
                        {item.tipo === 'video' ? (
                          <video src={item.url_json} muted loop autoPlay playsInline className="w-full h-full object-cover" />
                        ) : (
                          <Player autoplay loop src={item.url_json} style={{ width: '100%', height: '100%' }} />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold truncate">{item.emoji} {item.nombre}</p>
                        <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full ${item.tipo === 'video' ? 'bg-rose-500/20 text-rose-300' : 'bg-indigo-500/20 text-indigo-300'}`}>
                          {item.tipo}
                        </span>
                      </div>
                      <button onClick={() => eliminarDeBiblioteca(item)} className="text-slate-500 hover:text-red-400 transition shrink-0">
                        <Trash2 size={16} />
                      </button>
                    </div>
                  ))}
                  {bibliotecaAdmin.length === 0 && (
                    <p className="text-sm text-slate-500 col-span-full">Aún no hay animaciones en la biblioteca.</p>
                  )}
                </div>

                <form onSubmit={subirAnimacion} className="bg-slate-800 rounded-2xl p-5 space-y-3">
                  <p className="text-xs font-black uppercase text-slate-400 mb-1">Subir nueva animación</p>
                  <div className="grid sm:grid-cols-2 gap-3">
                    <input value={nuevoId} onChange={e => setNuevoId(e.target.value)} placeholder="ID único (ej. cafe_01)" className="bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-amber-400" />
                    <input value={nuevoNombre} onChange={e => setNuevoNombre(e.target.value)} placeholder="Nombre (ej. Café Humeante)" className="bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-amber-400" />
                    <div className="relative">
                      <button
                        type="button"
                        onClick={() => setMostrarSelectorEmoji(prev => !prev)}
                        className="w-full flex items-center gap-2 bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-amber-400 hover:bg-slate-600 transition"
                      >
                        {nuevoEmoji ? (
                          <span className="text-lg">{nuevoEmoji}</span>
                        ) : (
                          <Smile size={16} className="text-slate-400" />
                        )}
                        <span className={nuevoEmoji ? 'text-white' : 'text-slate-400'}>
                          {nuevoEmoji || 'Elegir emoji'}
                        </span>
                      </button>

                      {mostrarSelectorEmoji && (
                        <div className="absolute z-20 top-full mt-2 left-0 w-72 max-h-64 overflow-y-auto bg-slate-800 border border-slate-600 rounded-xl p-3 shadow-2xl space-y-3">
                          {Object.entries(EMOJIS_KIOSCO).map(([grupo, lista]) => (
                            <div key={grupo}>
                              <p className="text-[10px] font-black uppercase text-slate-400 mb-1">{grupo}</p>
                              <div className="grid grid-cols-8 gap-1">
                                {lista.map(emo => (
                                  <button
                                    key={emo}
                                    type="button"
                                    onClick={() => { setNuevoEmoji(emo); setMostrarSelectorEmoji(false); }}
                                    className="text-xl hover:bg-slate-700 rounded-lg p-1 transition"
                                  >
                                    {emo}
                                  </button>
                                ))}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                    <select value={nuevoTipo} onChange={e => setNuevoTipo(e.target.value)} className="bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-amber-400">
                      <option value="lottie">✨ Lottie (JSON)</option>
                      <option value="video">🎬 Video (MP4)</option>
                    </select>
                  </div>
                  <div className="grid sm:grid-cols-2 gap-3">
                    <label className="flex items-center justify-center gap-2 bg-slate-700 border border-dashed border-slate-500 rounded-lg px-3 py-3 text-xs font-bold cursor-pointer hover:bg-slate-600 transition text-center">
                      <UploadCloud size={16} className="shrink-0" />
                      <span className="truncate">{archivoFile ? archivoFile.name : 'Archivo principal (.json o .mp4)'}</span>
                      <input type="file" accept=".json,video/*" className="hidden" onChange={e => setArchivoFile(e.target.files[0])} />
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
        </div>
      )}

      {/* ============================================ */}
      {/* PERSONALIZACIÓN POR CATEGORÍA — VISIBLE PARA CUALQUIER ADMIN */}
      {/* ============================================ */}
      <div className="space-y-4">
        <h4 className="font-black text-slate-700 flex items-center gap-2">
          <Palette size={18} /> Personaliza cada categoría
        </h4>

        {cargandoCliente ? (
          <div className="flex items-center gap-2 text-slate-400 text-sm font-medium py-6 justify-center">
            <Loader2 size={18} className="animate-spin" /> Cargando animaciones disponibles...
          </div>
        ) : bibliotecaCliente.length === 0 ? (
          <div className="bg-amber-50 border border-amber-200 text-amber-700 rounded-2xl p-5 text-sm font-medium">
            🔒 Esta función no está activa en tu plan actual. Contacta a soporte para desbloquear animaciones y videos premium para tu Kiosco.
          </div>
        ) : categorias.length === 0 ? (
          <p className="text-sm text-slate-500">Aún no tienes categorías creadas en Catálogos.</p>
        ) : (
          <div className="grid md:grid-cols-2 gap-4">
            {/* 🆕 "Inicio" es una categoría virtual (no existe en Catálogos): permite
                asignar una animación de fondo a la pantalla principal del Kiosco,
                reutilizando el mismo mecanismo (nombre_categoria_kiosco = '__inicio__'). */}
            {[{ id: '__inicio__', nombre: '__inicio__', emoji: '🏠' }, ...categorias].map(cat => {
              const esInicio = cat.nombre === '__inicio__';
              const animId = asignaciones[cat.nombre] || '';
              const animItem = bibliotecaCliente.find(a => a.id === animId);
              return (
                <div key={cat.id} className={`border rounded-2xl p-4 flex items-center gap-4 ${esInicio ? 'bg-indigo-50 border-indigo-200' : 'bg-slate-50 border-slate-200'}`}>
                  <div className="w-16 h-16 rounded-xl overflow-hidden bg-white border border-slate-200 flex items-center justify-center shrink-0">
                    {animItem ? (
                      animItem.tipo === 'video' ? (
                        <video src={animItem.url_json} autoPlay loop muted playsInline className="w-full h-full object-cover" />
                      ) : (
                        <Player autoplay loop src={animItem.url_json} style={{ width: '100%', height: '100%' }} />
                      )
                    ) : (
                      <span className="text-2xl">{cat.emoji || '🎨'}</span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-slate-800 truncate">{esInicio ? '🏠 Inicio (Pantalla principal)' : cat.nombre}</p>
                    <select
                      value={animId}
                      onChange={(e) => guardarSeleccion(cat.nombre, e.target.value)}
                      className="mt-1 w-full text-sm font-medium border border-slate-300 rounded-xl px-3 py-2 bg-white focus:ring-2 focus:ring-indigo-400 outline-none"
                    >
                      <option value="">🎨 Tinte de color (predeterminado)</option>
                      {animacionesLottie.length > 0 && (
                        <optgroup label="✨ Animaciones">
                          {animacionesLottie.map(a => (
                            <option key={a.id} value={a.id}>{a.emoji} {a.nombre}</option>
                          ))}
                        </optgroup>
                      )}
                      {animacionesVideo.length > 0 && (
                        <optgroup label="🎬 Videos Premium">
                          {animacionesVideo.map(a => (
                            <option key={a.id} value={a.id}>{a.emoji} {a.nombre}</option>
                          ))}
                        </optgroup>
                      )}
                    </select>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default AnimacionesKiosco;