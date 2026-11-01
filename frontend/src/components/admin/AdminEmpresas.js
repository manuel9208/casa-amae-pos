import React, { useState, useEffect, useCallback } from 'react';
import { Building2, PlusCircle, KeyRound, Eye, EyeOff, Loader2, Save, ShieldCheck, Tag } from 'lucide-react';
import { apiFetch } from '../../utils/apiFetch';

const AdminEmpresas = ({ apiUrl, showAlert, showConfirm }) => {
  // --- Candado de súper-admin (mismo patrón que AnimacionesKiosco.js) ---
  const [isGlobalAdmin, setIsGlobalAdmin] = useState(false);
  const [keyInput, setKeyInput] = useState('');
  const [superadminKey, setSuperadminKey] = useState('');
  const [keyValidada, setKeyValidada] = useState(false);
  const [cargandoLlave, setCargandoLlave] = useState(false);

  // --- Datos del panel ---
  const [empresas, setEmpresas] = useState([]);
  const [empresaSeleccionada, setEmpresaSeleccionada] = useState('');
  const [catalogoClaves, setCatalogoClaves] = useState([]); // 🆕 dinámico, ya no es un arreglo fijo
  const [variablesData, setVariablesData] = useState({});
  const [valoresCampos, setValoresCampos] = useState({});
  const [mostrarClaro, setMostrarClaro] = useState({});
  const [cargandoVariables, setCargandoVariables] = useState(false);
  const [guardando, setGuardando] = useState(false);

  // --- Modal de alta de empresa ---
  const [modalNuevaEmpresa, setModalNuevaEmpresa] = useState(false);
  const [nombreNuevaEmpresa, setNombreNuevaEmpresa] = useState('');
  const [creandoEmpresa, setCreandoEmpresa] = useState(false);

  // --- 🆕 Modal de alta de variable nueva en el catálogo global ---
  const [modalNuevaVariable, setModalNuevaVariable] = useState(false);
  const [nombreNuevaVariable, setNombreNuevaVariable] = useState('');
  const [creandoVariable, setCreandoVariable] = useState(false);

  // ==========================================
  // VALIDACIÓN DE LLAVE SÚPER-ADMIN
  // ==========================================
  const cargarEmpresas = useCallback(async (key) => {
    try {
      const res = await apiFetch(`${apiUrl}/admin-global/empresas`, {
        headers: { 'X-Superadmin-Key': key }
      });
      if (res.ok) {
        const data = await res.json();
        setEmpresas(Array.isArray(data) ? data : []);
        return true;
      }
      return false;
    } catch (e) {
      return false;
    }
  }, [apiUrl]);

  // 🆕 Carga el catálogo global de claves disponibles
  const cargarCatalogo = useCallback(async (key) => {
    try {
      const res = await apiFetch(`${apiUrl}/admin-global/variables-catalogo`, {
        headers: { 'X-Superadmin-Key': key }
      });
      if (res.ok) {
        const data = await res.json();
        setCatalogoClaves(Array.isArray(data.claves) ? data.claves : []);
      }
    } catch (e) {
      showAlert('Error de conexión', 'No se pudo cargar el catálogo de variables.', 'error');
    }
  }, [apiUrl, showAlert]);

  const validarLlave = async () => {
    if (!keyInput.trim()) {
      showAlert('Falta la llave', 'Escribe la llave secreta de súper-admin.', 'error');
      return;
    }
    setCargandoLlave(true);
    const ok = await cargarEmpresas(keyInput.trim());
    if (ok) {
      localStorage.setItem('pos_superadmin_key', keyInput.trim());
      setSuperadminKey(keyInput.trim());
      setKeyValidada(true);
      cargarCatalogo(keyInput.trim());
      showAlert('¡Acceso concedido!', 'Llave de súper-admin validada correctamente.', 'success');
    } else {
      showAlert('Acceso denegado', 'La llave ingresada es incorrecta.', 'error');
    }
    setCargandoLlave(false);
  };

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
            setCargandoLlave(true);
            const ok = await cargarEmpresas(keyGuardada);
            if (ok) {
              setSuperadminKey(keyGuardada);
              setKeyValidada(true);
              cargarCatalogo(keyGuardada);
            } else {
              localStorage.removeItem('pos_superadmin_key');
            }
            setCargandoLlave(false);
          })();
        }
      }
    } catch (e) { /* sesión corrupta, se ignora */ }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [apiUrl]);

  // ==========================================
  // GESTIÓN DE EMPRESAS Y VARIABLES
  // ==========================================
  const cargarVariables = useCallback(async (empresaId, key) => {
    if (!empresaId) return;
    setCargandoVariables(true);
    try {
      const res = await apiFetch(`${apiUrl}/admin-global/empresas/${empresaId}/variables`, {
        headers: { 'X-Superadmin-Key': key }
      });
      if (res.ok) {
        const data = await res.json();
        setVariablesData(data);
        setValoresCampos({});
        setMostrarClaro({});
      }
    } catch (e) {
      showAlert('Error de conexión', 'No se pudieron cargar las variables.', 'error');
    }
    setCargandoVariables(false);
  }, [apiUrl, showAlert]);

  useEffect(() => {
    if (empresaSeleccionada && keyValidada) {
      cargarVariables(empresaSeleccionada, superadminKey);
    }
  }, [empresaSeleccionada, keyValidada, superadminKey, cargarVariables]);

  const revelarCampo = async (clave) => {
    if (mostrarClaro[clave]) {
      setMostrarClaro(prev => ({ ...prev, [clave]: false }));
      return;
    }
    try {
      const res = await apiFetch(`${apiUrl}/admin-global/empresas/${empresaSeleccionada}/variables/${clave}/revelar`, {
        headers: { 'X-Superadmin-Key': superadminKey }
      });
      if (res.ok) {
        const data = await res.json();
        setValoresCampos(prev => ({ ...prev, [clave]: data.valor || '' }));
        setMostrarClaro(prev => ({ ...prev, [clave]: true }));
      } else {
        showAlert('Error', 'No se pudo revelar el valor.', 'error');
      }
    } catch (e) {
      showAlert('Error de conexión', 'No se pudo revelar el valor.', 'error');
    }
  };

  const handleCambioCampo = (clave, valor) => {
    setValoresCampos(prev => ({ ...prev, [clave]: valor }));
  };

  const guardarVariables = async () => {
    const cambiosReales = Object.keys(valoresCampos).filter(k => valoresCampos[k] !== undefined && valoresCampos[k] !== '');
    if (cambiosReales.length === 0) {
      showAlert('Sin cambios', 'No hay valores nuevos para guardar.', 'info');
      return;
    }
    setGuardando(true);
    try {
      const res = await apiFetch(`${apiUrl}/admin-global/empresas/${empresaSeleccionada}/variables`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'X-Superadmin-Key': superadminKey },
        body: JSON.stringify({ variables: valoresCampos })
      });
      if (res.ok) {
        showAlert('¡Guardado!', 'Las variables se actualizaron correctamente.', 'success');
        cargarVariables(empresaSeleccionada, superadminKey);
      } else {
        const data = await res.json().catch(() => ({}));
        showAlert('Error', data.error || 'No se pudieron guardar las variables.', 'error');
      }
    } catch (e) {
      showAlert('Error de conexión', 'No se pudo conectar con el servidor.', 'error');
    }
    setGuardando(false);
  };

  const crearEmpresa = async (e) => {
    e.preventDefault();
    if (!nombreNuevaEmpresa.trim()) return;
    setCreandoEmpresa(true);
    try {
      const res = await apiFetch(`${apiUrl}/admin-global/empresas`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Superadmin-Key': superadminKey },
        body: JSON.stringify({ nombre: nombreNuevaEmpresa.trim() })
      });
      const data = await res.json();
      if (res.ok) {
        showAlert('¡Empresa creada!', `"${data.nombre}" se agregó correctamente (slug: ${data.slug}).`, 'success');
        setModalNuevaEmpresa(false);
        setNombreNuevaEmpresa('');
        cargarEmpresas(superadminKey);
      } else {
        showAlert('Error', data.error || 'No se pudo crear la empresa.', 'error');
      }
    } catch (e) {
      showAlert('Error de conexión', 'No se pudo crear la empresa.', 'error');
    }
    setCreandoEmpresa(false);
  };

  // 🆕 Agrega una variable nueva al catálogo GLOBAL (disponible para todas las empresas)
  const agregarVariable = async (e) => {
    e.preventDefault();
    if (!nombreNuevaVariable.trim()) return;
    setCreandoVariable(true);
    try {
      const res = await apiFetch(`${apiUrl}/admin-global/variables-catalogo`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Superadmin-Key': superadminKey },
        body: JSON.stringify({ clave: nombreNuevaVariable.trim() })
      });
      const data = await res.json();
      if (res.ok) {
        showAlert('¡Variable agregada!', 'Ya está disponible para todas las empresas.', 'success');
        setModalNuevaVariable(false);
        setNombreNuevaVariable('');
        setCatalogoClaves(data.claves || []);
        if (empresaSeleccionada) cargarVariables(empresaSeleccionada, superadminKey);
      } else {
        showAlert('Error', data.error || 'No se pudo agregar la variable.', 'error');
      }
    } catch (e) {
      showAlert('Error de conexión', 'No se pudo agregar la variable.', 'error');
    }
    setCreandoVariable(false);
  };

  // ==========================================
  // RENDER
  // ==========================================
  if (!isGlobalAdmin) {
    return (
      <div className="bg-white rounded-[32px] border border-slate-200 p-10 text-center">
        <ShieldCheck size={48} className="mx-auto text-slate-300 mb-4" />
        <p className="font-black text-slate-500">Esta sección es exclusiva del Administrador Global.</p>
      </div>
    );
  }

  if (!keyValidada) {
    return (
      <div className="bg-slate-900 text-white rounded-[32px] p-8 md:p-10 max-w-lg mx-auto space-y-6">
        <div className="flex items-center gap-3">
          <div className="bg-gradient-to-br from-amber-400 to-orange-500 p-3 rounded-2xl text-slate-900 shrink-0">
            <KeyRound size={20} />
          </div>
          <div>
            <h3 className="text-lg font-black">Acceso Restringido</h3>
            <p className="text-xs text-slate-400 font-medium">Ingresa la llave secreta de súper-admin para continuar.</p>
          </div>
        </div>
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
            disabled={cargandoLlave}
            className="bg-amber-400 hover:bg-amber-300 text-slate-900 font-black px-6 py-3 rounded-xl transition disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {cargandoLlave ? <Loader2 size={18} className="animate-spin" /> : <KeyRound size={18} />}
            {cargandoLlave ? 'Verificando...' : 'Desbloquear'}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-[32px] border border-slate-200 p-6 md:p-8 space-y-8 max-w-4xl mx-auto">
      <div className="flex items-center gap-3">
        <div className="bg-gradient-to-br from-amber-400 to-orange-500 p-3 rounded-2xl text-slate-900 shrink-0">
          <Building2 size={22} />
        </div>
        <div>
          <h3 className="text-xl font-black text-slate-800">Admin Empresas</h3>
          <p className="text-sm text-slate-500 font-medium">Gestiona las empresas y sus variables de entorno (Cloudinary, VAPID, etc.)</p>
        </div>
      </div>

      {/* Selector + Alta de empresa */}
      <div className="flex flex-col sm:flex-row gap-3">
        <select
          value={empresaSeleccionada}
          onChange={(e) => setEmpresaSeleccionada(e.target.value)}
          className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 font-bold text-slate-700 outline-none focus:border-amber-400"
        >
          <option value="">-- Selecciona una empresa --</option>
          {empresas.map(emp => (
            <option key={emp.id} value={emp.id}>{emp.nombre} ({emp.slug}){!emp.activo ? ' — Inactiva' : ''}</option>
          ))}
        </select>
        <button
          onClick={() => setModalNuevaEmpresa(true)}
          className="bg-slate-900 hover:bg-slate-800 text-white font-black px-6 py-3 rounded-xl transition flex items-center justify-center gap-2"
        >
          <PlusCircle size={18} /> Agregar Empresa
        </button>
      </div>

      {/* Variables de la empresa seleccionada */}
      {empresaSeleccionada && (
        cargandoVariables ? (
          <div className="flex items-center gap-2 text-slate-400 text-sm font-medium py-10 justify-center">
            <Loader2 size={18} className="animate-spin" /> Cargando variables...
          </div>
        ) : (
          <div className="space-y-4 animate-in fade-in">
            {/* 🆕 Cabecera del catálogo con botón para agregar variable nueva (global) */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <p className="text-xs font-black text-slate-400 uppercase tracking-widest">Variables disponibles (catálogo global)</p>
              <button
                type="button"
                onClick={() => setModalNuevaVariable(true)}
                className="flex items-center gap-1.5 bg-amber-50 hover:bg-amber-100 text-amber-700 font-black text-xs px-3 py-2 rounded-lg transition"
              >
                <Tag size={14} /> Nueva Variable
              </button>
            </div>

            {catalogoClaves.length === 0 && (
              <p className="text-sm text-slate-400 font-medium text-center py-6">Aún no hay variables en el catálogo. Agrega la primera.</p>
            )}

            {catalogoClaves.map((clave) => {
              const info = variablesData[clave] || { configurada: false, mascara: '' };
              const visible = mostrarClaro[clave];
              return (
                <div key={clave}>
                  <label className="text-xs font-black text-slate-500 uppercase tracking-widest mb-1 block">
                    {clave.replace(/_/g, ' ')} {info.configurada && <span className="text-emerald-500 normal-case font-bold">· configurada</span>}
                  </label>
                  <div className="flex gap-2">
                    <input
                      type={visible ? 'text' : 'password'}
                      value={valoresCampos[clave] !== undefined ? valoresCampos[clave] : ''}
                      onChange={(e) => handleCambioCampo(clave, e.target.value)}
                      placeholder={info.configurada ? info.mascara : 'No configurada aún'}
                      className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 font-mono text-sm outline-none focus:border-amber-400"
                    />
                    <button
                      type="button"
                      onClick={() => revelarCampo(clave)}
                      disabled={!info.configurada}
                      title={info.configurada ? 'Ver valor real' : 'No hay valor guardado todavía'}
                      className="bg-slate-100 hover:bg-slate-200 text-slate-600 px-4 rounded-xl transition disabled:opacity-40"
                    >
                      {visible ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>
              );
            })}

            {catalogoClaves.length > 0 && (
              <button
                onClick={guardarVariables}
                disabled={guardando}
                className="w-full bg-amber-400 hover:bg-amber-300 text-slate-900 font-black py-4 rounded-2xl transition disabled:opacity-50 flex items-center justify-center gap-2 mt-4"
              >
                {guardando ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
                {guardando ? 'Guardando...' : 'Guardar Variables'}
              </button>
            )}
          </div>
        )
      )}

      {/* Modal: Agregar Empresa (custom, sin prompt() nativo) */}
      {modalNuevaEmpresa && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm z-[999] flex items-center justify-center p-4 animate-in fade-in">
          <form onSubmit={crearEmpresa} className="bg-white rounded-[32px] p-8 w-full max-w-sm shadow-2xl border border-slate-100 animate-in zoom-in-95">
            <h3 className="text-xl font-black text-slate-800 mb-1">Nueva Empresa</h3>
            <p className="text-sm text-slate-500 font-medium mb-6">El identificador (slug) se genera automáticamente a partir del nombre.</p>
            <input
              type="text"
              required
              autoFocus
              value={nombreNuevaEmpresa}
              onChange={(e) => setNombreNuevaEmpresa(e.target.value)}
              placeholder="Nombre del negocio"
              className="w-full bg-slate-50 border-2 border-slate-200 rounded-2xl p-4 font-bold outline-none focus:border-amber-400 mb-6"
            />
            <div className="flex gap-3">
              <button type="button" onClick={() => setModalNuevaEmpresa(false)} className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-600 font-black rounded-xl transition">
                Cancelar
              </button>
              <button type="submit" disabled={creandoEmpresa} className="flex-1 py-3 bg-slate-900 hover:bg-slate-800 text-white font-black rounded-xl transition disabled:opacity-50">
                {creandoEmpresa ? 'Creando...' : 'Crear'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* 🆕 Modal: Agregar Variable al catálogo GLOBAL (custom, sin prompt() nativo) */}
      {modalNuevaVariable && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm z-[999] flex items-center justify-center p-4 animate-in fade-in">
          <form onSubmit={agregarVariable} className="bg-white rounded-[32px] p-8 w-full max-w-sm shadow-2xl border border-slate-100 animate-in zoom-in-95">
            <h3 className="text-xl font-black text-slate-800 mb-1">Nueva Variable</h3>
            <p className="text-sm text-slate-500 font-medium mb-6">Se agregará al catálogo y estará disponible para <strong>todas las empresas</strong>, no solo la seleccionada.</p>
            <input
              type="text"
              required
              autoFocus
              value={nombreNuevaVariable}
              onChange={(e) => setNombreNuevaVariable(e.target.value.toUpperCase())}
              placeholder="Ej. STRIPE_SECRET_KEY"
              className="w-full bg-slate-50 border-2 border-slate-200 rounded-2xl p-4 font-mono font-bold outline-none focus:border-amber-400 mb-6"
            />
            <div className="flex gap-3">
              <button type="button" onClick={() => setModalNuevaVariable(false)} className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-600 font-black rounded-xl transition">
                Cancelar
              </button>
              <button type="submit" disabled={creandoVariable} className="flex-1 py-3 bg-amber-400 hover:bg-amber-300 text-slate-900 font-black rounded-xl transition disabled:opacity-50">
                {creandoVariable ? 'Agregando...' : 'Agregar'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

export default AdminEmpresas;