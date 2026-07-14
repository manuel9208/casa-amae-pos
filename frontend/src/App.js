import React, { useState, useEffect, useCallback, useRef } from 'react';
import { io } from 'socket.io-client';
import AdminPanel from './components/AdminPanel';
import Caja from './components/Caja';
import Cocina from './components/Cocina';
import Kiosco from './components/Kiosco';
import PantallaTV from './components/PantallaTV';
import Repartidor from './components/Repartidor';
import PortalEmpleado from './components/empleado/PortalEmpleado';
import { suscribirANotificaciones } from './pushManager';

const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:4000/api';
const baseUrl = apiUrl.replace('/api', '');

const App = () => {
  // ==========================================
  // ESTADOS PRINCIPALES DE SESIÓN
  // ==========================================
  const [usuarioActivo, setUsuarioActivo] = useState(null);
  const [clienteActivo, setClienteActivo] = useState(null);
  const [modoInvitado, setModoInvitado] = useState(false);
  const [vistaAdmin, setVistaAdmin] = useState('panel');
  const [vistaTV, setVistaTV] = useState(false);

  // ESTADOS: Para control dinámico de pantallas y persistencia F5
  const [entornoActivo, setEntornoActivo] = useState(null);
  const [segundaSesionActiva, setSegundaSesionActiva] = useState(false);
  const [sesionExpirada, setSesionExpirada] = useState(false);

  // ==========================================
  // ESTADOS DE FORMULARIOS Y LOGIN
  // ==========================================
  const [telefono, setTelefono] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [necesitaRegistro, setNecesitaRegistro] = useState(false);
  const [empleadoFase2, setEmpleadoFase2] = useState(null);
  const [nombreNuevo, setNombreNuevo] = useState('');
  const [apellidoNuevo, setApellidoNuevo] = useState('');
  const [correoNuevo, setCorreoNuevo] = useState('');
  const [fechaNacNuevo, setFechaNacNuevo] = useState('');
  const [nipNuevo, setNipNuevo] = useState('');

  const [configGlobal, setConfigGlobal] = useState({
    nombre_negocio: '', logo_url: null, color_primario: '#2563eb', color_secundario: '#10b981', color_fondo: '#f1f5f9', color_fondo_tarjetas: '#ffffff', color_texto_principal: '#1e293b', color_texto_secundario: '#64748b', fuente_titulos: 'system-ui', fuente_textos: 'system-ui', kiosco_mensaje: '¿Qué se te antoja hoy?', color_texto_kiosco: '#1e293b'
  });

  // 👇 REF: Para controlar la transición inteligente del horario y no bloquear tu botón manual
  const prevDentroDeHorario = useRef(null);

  // ==========================================
  // HELPERS VISUALES Y SESIÓN
  // ==========================================
  const getImageUrl = (url) => {
    if (!url) return '';
    const strUrl = String(url).trim();
    if (strUrl.includes('cloudinary.com')) {
      const match = strUrl.match(/res\.cloudinary\.com\/(.+)/);
      if (match && match[1]) return `https://res.cloudinary.com/${match[1]}`;
    }
    const lastHttp = strUrl.lastIndexOf('http');
    if (lastHttp > 0) return strUrl.substring(lastHttp);
    if (strUrl.startsWith('http')) return strUrl;
    return `${baseUrl}${strUrl.startsWith('/') ? '' : '/'}${strUrl}`;
  };

  const cerrarSesion = useCallback(async (forzado = false) => {
    if (usuarioActivo) {
      try {
        const dispositivo_id = localStorage.getItem('pos_device_id');
        await fetch(`${apiUrl}/logout`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ usuario_id: usuarioActivo.id, dispositivo_id })
        });
      } catch (error) {}
    }
    setUsuarioActivo(null); setClienteActivo(null); setModoInvitado(false);
    setTelefono(''); setPassword(''); setEmpleadoFase2(null);
    setEntornoActivo(null); setSegundaSesionActiva(false);

    localStorage.removeItem('pos_sesion');
    localStorage.removeItem('pos_entorno_activo');
    
    if (forzado) {
        setSesionExpirada(true);
    }
  }, [usuarioActivo]);

  const iniciarSesionPersistente = (tipo, data, segundaSesion = false) => {
    const expiracion = new Date().getTime() + (9 * 60 * 60 * 1000);

    localStorage.setItem('pos_sesion', JSON.stringify({ tipo, data, expiracion, segundaSesion }));

    if (tipo === 'empleado') {
      setUsuarioActivo(data);
      setSegundaSesionActiva(segundaSesion);

      if (segundaSesion) {
        setEntornoActivo('portal');
        localStorage.setItem('pos_entorno_activo', 'portal');
      }
      suscribirANotificaciones(data.id, null);
    }
    if (tipo === 'cliente') {
      setClienteActivo(data);
      suscribirANotificaciones(null, data.id);
    }
  };

  // ==========================================
  // LIFECYCLE (EFECTOS DE ARRANQUE Y VIGILANCIA)
  // ==========================================
  
  useEffect(() => {
    const vigiaSesion = setInterval(() => {
        const sesionGuardada = localStorage.getItem('pos_sesion');
        if (sesionGuardada) {
            try {
                const { expiracion } = JSON.parse(sesionGuardada);
                if (new Date().getTime() > expiracion) {
                    cerrarSesion(true);
                }
            } catch(e) {}
        }
    }, 60000); 
    return () => clearInterval(vigiaSesion);
  }, [cerrarSesion]);

  useEffect(() => {
    if (!localStorage.getItem('pos_device_id')) {
      localStorage.setItem('pos_device_id', Math.random().toString(36).substring(2, 15));
    }

    const sesionGuardada = localStorage.getItem('pos_sesion');
    if (sesionGuardada) {
      try {
        const { tipo, data, expiracion, segundaSesion } = JSON.parse(sesionGuardada);
        if (new Date().getTime() < expiracion) {
          if (tipo === 'empleado') {
            setUsuarioActivo(data);
            setSegundaSesionActiva(segundaSesion || false);
            suscribirANotificaciones(data.id, null);
          }
          if (tipo === 'cliente') {
            setClienteActivo(data);
            suscribirANotificaciones(null, data.id);
          }
        } else {
          localStorage.removeItem('pos_sesion');
        }
      } catch(e) {}
    }

    const entornoGuardado = localStorage.getItem('pos_entorno_activo');
    if (entornoGuardado) {
      setEntornoActivo(entornoGuardado);
    }

    const cargarConfig = async () => {
      try {
        const res = await fetch(`${apiUrl}/configuracion?t=${new Date().getTime()}`);
        const data = await res.json();
        if (data && !data.error) {
          setConfigGlobal(data);
          if (data.logo_url) {
            const iconUrl = getImageUrl(data.logo_url);
            let linkFavicon = document.querySelector("link[rel~='icon']");
            if (!linkFavicon) { linkFavicon = document.createElement('link'); linkFavicon.rel = 'icon'; document.head.appendChild(linkFavicon); }
            linkFavicon.href = iconUrl;
            let linkApple = document.querySelector("link[rel='apple-touch-icon']");
            if (!linkApple) { linkApple = document.createElement('link'); linkApple.rel = 'apple-touch-icon'; document.head.appendChild(linkApple); }
            linkApple.href = iconUrl;
          }
        }
      } catch (err) {}
    };  

    cargarConfig();
    const intervaloConfig = setInterval(cargarConfig, 5000);
    return () => clearInterval(intervaloConfig);
  }, []); 

  useEffect(() => {
    const socket = io(baseUrl, { transports: ['websocket', 'polling'] });

    socket.on('usuario_actualizado', (usuarioEditado) => {
      setUsuarioActivo((prevUsuario) => {
        if (prevUsuario && prevUsuario.id === usuarioEditado.id) {
          const sesionGuardada = localStorage.getItem('pos_sesion');
          if (sesionGuardada) {
            const parsed = JSON.parse(sesionGuardada);
            parsed.data = usuarioEditado;
            localStorage.setItem('pos_sesion', JSON.stringify(parsed));
          }
          return usuarioEditado;
        }
        return prevUsuario;
      });
    });

    socket.on('usuario_eliminado', (idEliminado) => {
      setUsuarioActivo((prevUsuario) => {
        if (prevUsuario && prevUsuario.id === parseInt(idEliminado)) {
          localStorage.removeItem('pos_sesion');
          localStorage.removeItem('pos_entorno_activo');
          setTimeout(() => window.location.reload(), 100);
          return null;
        }
        return prevUsuario;
      });
    });

    return () => socket.disconnect();
  }, []);

  useEffect(() => {
    if (usuarioActivo) {
      if (usuarioActivo.rol === 'ayudante_cocina' || segundaSesionActiva) {
        setEntornoActivo('portal');
        localStorage.setItem('pos_entorno_activo', 'portal');
      }
    }
  }, [usuarioActivo, segundaSesionActiva]);

  // 👇 FIX DEL CRON: Dependencia 'apiUrl' eliminada para limpiar el Warning
  useEffect(() => {
    const checkHorarioCron = async () => {
      if (!configGlobal || !configGlobal.horarios_semana) return;
      try {
        const dias = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
        const hoy = new Date();
        const diaActual = dias[hoy.getDay()];
        const horario = typeof configGlobal.horarios_semana === 'string'
          ? JSON.parse(configGlobal.horarios_semana)
          : configGlobal.horarios_semana;

        const hHoy = horario[diaActual];
        let dentro = false;

        if (hHoy && hHoy.activo && hHoy.cierre && hHoy.apertura) {
          const hActualNum = hoy.getHours() * 60 + hoy.getMinutes();
          const [hCie, mCie] = hHoy.cierre.split(':').map(Number);
          const [hApe, mApe] = hHoy.apertura.split(':').map(Number);
          const minCie = hCie * 60 + mCie;
          const minApe = hApe * 60 + mApe;

          if (minCie <= minApe) { // Turno que cruza la medianoche
            if (hActualNum >= minApe || hActualNum < minCie) dentro = true;
          } else { // Turno de día normal
            if (hActualNum >= minApe && hActualNum < minCie) dentro = true;
          }
        }

        if (prevDentroDeHorario.current === true && dentro === false) {
          if (configGlobal.negocio_abierto === true || String(configGlobal.negocio_abierto) === 'true') {
            const formData = new FormData();
            formData.append('negocio_abierto', 'false');
            await fetch(`${apiUrl}/configuracion`, { method: 'PUT', body: formData });
          }
        }
        prevDentroDeHorario.current = dentro;

      } catch(e) {}
    }
    const interval = setInterval(checkHorarioCron, 60000);
    return () => clearInterval(interval);
  }, [configGlobal]);

  // ==========================================
  // LÓGICAS DE LOGUEO Y REGISTRO
  // ==========================================
  const handleIdentificar = async (e) => {
    e.preventDefault(); setError('');
    
    if (telefono === '0000000000') { setVistaTV(true); return; }
    
    try {
      const res = await fetch(`${apiUrl}/identificar`, { 
        method: 'POST', 
        headers: { 'Content-Type': 'application/json' }, 
        body: JSON.stringify({ telefono }) 
      });
      const data = await res.json();
      
      if (res.ok) {
        const payload = data.data || data.datos || data.usuario || data.cliente;
        
        if (data.tipo === 'empleado') {
          if (payload.rol === 'tv') {
            iniciarSesionPersistente('empleado', payload, false);
          } else {
            setEmpleadoFase2(payload);
          }
        } else if (data.tipo === 'cliente') {
          iniciarSesionPersistente('cliente', payload);
        } else {
          setNecesitaRegistro(true);
        }
      } else {
        if (res.status === 404) setNecesitaRegistro(true);
        else setError(data.error || 'Error al identificar.');
      }
    } catch (err) { 
      setError('Error de conexión al servidor.'); 
    }
  };

  const handleRegistro = async (e) => {
    e.preventDefault(); setError('');
    try {
      const res = await fetch(`${apiUrl}/clientes/registro`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ nombre: nombreNuevo, apellido: apellidoNuevo, telefono, correo: correoNuevo, fecha_nacimiento: fechaNacNuevo, nip: nipNuevo }) });
      const data = await res.json();
      if (res.ok) {
        setNecesitaRegistro(false);
        iniciarSesionPersistente('cliente', data.cliente || data.data || data);
      }
      else { setError(data.error || 'No se pudo registrar.'); }
    } catch (err) { setError('Error de conexión.'); }
  };

  const handleLoginEmpleado = async (e) => {
    e.preventDefault(); setError('');
    const dispositivo_id = localStorage.getItem('pos_device_id');
    try {
      const res = await fetch(`${apiUrl}/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ usuario: empleadoFase2.usuario, password, dispositivo_id })
      });
      const data = await res.json();
      if (res.ok) {
        setEmpleadoFase2(null);
        setPassword('');
        iniciarSesionPersistente('empleado', data.usuario || data.data || data, data.segunda_sesion || false);
      }
      else { setError(data.error || 'Contraseña incorrecta.'); }
    } catch (err) { setError('Error de conexión.'); }
  };

  const inyectarEstilos = () => {
    return `
    :root { --c-primario: ${configGlobal.color_primario || '#2563eb'}; --c-secundario: ${configGlobal.color_secundario || '#10b981'}; --c-fondo: ${configGlobal.color_fondo || '#f1f5f9'}; --c-tarjetas: ${configGlobal.color_fondo_tarjetas || '#ffffff'}; --c-texto-prin: ${configGlobal.color_texto_principal || '#1e293b'}; --c-texto-sec: ${configGlobal.color_texto_secundario || '#64748b'}; --c-texto-kiosco: ${configGlobal.color_texto_kiosco || '#1e293b'}; --f-titulos: ${configGlobal.fuente_titulos || 'system-ui, sans-serif'}; --f-textos: ${configGlobal.fuente_textos || 'system-ui, sans-serif'}; }
    body { background-color: var(--c-fondo); font-family: var(--f-textos); color: var(--c-texto-prin); margin: 0; padding: 0; }
    h1, h2, h3, h4, h5, h6 { font-family: var(--f-titulos) !important; }
    .bg-blue-600 { background-color: var(--c-primario) !important; }
    .text-blue-600 { color: var(--c-primario) !important; }
    .border-blue-600, .border-blue-500 { border-color: var(--c-primario) !important; }
    .hover\\:bg-blue-700:hover { background-color: color-mix(in srgb, var(--c-primario) 80%, black) !important; }
    .bg-blue-50, .bg-blue-100 { background-color: color-mix(in srgb, var(--c-primario) 8%, white) !important; border-color: color-mix(in srgb, var(--c-primario) 20%, white) !important;}
    .focus\\:border-blue-500:focus, .focus\\:ring-blue-500:focus { border-color: var(--c-primario) !important; --tw-ring-color: var(--tw-ring-color) !important; }
    .bg-emerald-500, .bg-emerald-600 { background-color: var(--c-secundario) !important; }
    .text-emerald-500, .text-emerald-600 { color: var(--c-secundario) !important; }
    .border-emerald-500 { border-color: var(--c-secundario) !important; }
    .hover\\:bg-emerald-600:hover { background-color: color-mix(in srgb, var(--c-secundario) 80%, black) !important; }
    .bg-emerald-50, .bg-emerald-100 { background-color: color-mix(in srgb, var(--c-secundario) 8%, white) !important; border-color: color-mix(in srgb, var(--c-secundario) 20%, white) !important;}
    .tema-cliente { background-color: var(--c-fondo) !important; min-height: 100vh; }
    .tema-cliente .bg-slate-100, .tema-cliente .bg-gray-50 { background-color: var(--c-fondo) !important; }
    .tema-cliente .bg-white { background-color: var(--c-tarjetas) !important; border-color: color-mix(in srgb, var(--c-texto-prin) 10%, transparent) !important; }
    .tema-cliente .bg-slate-50 { background-color: color-mix(in srgb, var(--c-tarjetas) 95%, black) !important; border-color: color-mix(in srgb, var(--c-texto-prin) 10%, transparent) !important; }
    `;
  };

  // ==========================================
  // RENDERIZADO PRINCIPAL
  // ==========================================

  if (vistaTV) {
    return (
      <>
        <style dangerouslySetInnerHTML={{__html: inyectarEstilos()}} />
        <div className="tema-cliente"><PantallaTV onLogout={() => { setVistaTV(false); setTelefono(''); }} /></div>
      </>
    );
  }

  // 🛡️ ESCUDO PROTECTOR
  if (usuarioActivo) {
    
    if (usuarioActivo.rol === 'tv') {
      return <><style dangerouslySetInnerHTML={{__html: inyectarEstilos()}} /><div className="tema-cliente"><PantallaTV onLogout={() => cerrarSesion()} /></div></>;
    }

    if (usuarioActivo.usuario === 'admin') {
      if (vistaAdmin === 'kiosco') return <><style dangerouslySetInnerHTML={{__html: inyectarEstilos()}} /><div className="tema-cliente"><Kiosco user={usuarioActivo} clienteActivo={null} onVolverAdmin={() => setVistaAdmin('panel')} onLogout={() => cerrarSesion()} /></div></>;
      return <><style dangerouslySetInnerHTML={{__html: inyectarEstilos()}} /><AdminPanel user={usuarioActivo} onLogout={() => cerrarSesion()} onGoToKiosco={() => setVistaAdmin('kiosco')} /></>;
    }

    if (!entornoActivo) {
      const opcionesMenu = [];
      const perms = usuarioActivo.permisos || {};  
      
      if (['admin', 'gerente'].includes(usuarioActivo.rol) && perms.pantalla_admin === true) {
        opcionesMenu.push({ id: 'admin', nombre: 'Panel de Administración', emoji: '👑', color: 'bg-purple-600 hover:bg-purple-700' });
      }
      if (usuarioActivo.rol === 'cajero' || (['admin', 'gerente', 'jefe'].includes(usuarioActivo.rol) && perms.pantalla_caja === true)) {
        opcionesMenu.push({ id: 'caja', nombre: 'Caja Principal (POS)', emoji: '💵', color: 'bg-blue-600 hover:bg-blue-700' });
      }
      if (usuarioActivo.rol === 'cocina' || (['admin', 'gerente', 'jefe'].includes(usuarioActivo.rol) && perms.pantalla_cocina === true)) {
        opcionesMenu.push({ id: 'cocina', nombre: 'Cocina (KDS)', emoji: '👨‍🍳', color: 'bg-orange-600 hover:bg-orange-700' });
      }
      if (usuarioActivo.rol === 'repartidor' || (['admin', 'gerente', 'jefe'].includes(usuarioActivo.rol) && perms.pantalla_repartidor === true)) {
        opcionesMenu.push({ id: 'repartidor', nombre: 'Logística de Reparto', emoji: '🛵', color: 'bg-indigo-500 hover:bg-indigo-600' });
      }
      
      opcionesMenu.push({ id: 'portal', nombre: 'Mi Portal (Empleado)', emoji: '👤', color: 'bg-emerald-500 hover:bg-emerald-600' });  
      
      return (
        <>
          <style dangerouslySetInnerHTML={{__html: inyectarEstilos()}} />
          <div className="tema-cliente min-h-screen flex items-center justify-center p-4">
            <div className="bg-white p-10 rounded-[40px] shadow-2xl max-w-4xl w-full text-center border relative overflow-hidden">
              <h2 className="text-4xl font-black text-slate-800 mb-2">¡Hola, {usuarioActivo.nombre}!</h2>
              <p className="text-slate-500 font-bold mb-10 text-lg">¿A dónde deseas ingresar hoy?</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {opcionesMenu.map(op => (
                  <button
                    key={op.id}
                    onClick={() => {
                      setEntornoActivo(op.id);
                      localStorage.setItem('pos_entorno_activo', op.id);
                      if (op.id === 'caja' && configGlobal && configGlobal.negocio_abierto === false) {
                        const formData = new FormData();
                        formData.append('negocio_abierto', 'true');
                        fetch(`${apiUrl}/configuracion`, { method: 'PUT', body: formData })
                          .then(r => r.json())
                          .then(d => {
                            if(!d.error) setConfigGlobal(prev => ({...prev, negocio_abierto: true}));
                          });
                      }
                    }}
                    className={`${op.color} text-white p-8 rounded-[32px] font-black text-lg shadow-xl transition active:scale-95 flex flex-col items-center justify-center gap-4 group text-center min-h-[160px]`}
                  >
                    <span className="text-5xl group-hover:scale-110 transition-transform">{op.emoji}</span>
                    {op.nombre}
                  </button>
                ))}
              </div>
              <button onClick={() => cerrarSesion()} className="mt-12 px-6 py-3 rounded-full bg-slate-100 text-slate-500 hover:bg-red-50 hover:text-red-500 font-bold transition-colors">
                Cerrar Sesión
              </button>
            </div>
          </div>
        </>
      );
    }

    if (entornoActivo === 'portal') {
      return (
        <>
          <style dangerouslySetInnerHTML={{__html: inyectarEstilos()}} />
          <div className="tema-cliente">
            <PortalEmpleado
              user={usuarioActivo} apiUrl={apiUrl} onLogout={() => cerrarSesion()}
              onVolver={(!segundaSesionActiva && usuarioActivo.rol !== 'ayudante_cocina') ? () => {
                setEntornoActivo(null);
                localStorage.removeItem('pos_entorno_activo');
              } : null}
            />
          </div>
        </>
      );
    }

    if (entornoActivo === 'admin') {
      if (vistaAdmin === 'kiosco') return <><style dangerouslySetInnerHTML={{__html: inyectarEstilos()}} /><div className="tema-cliente"><Kiosco user={usuarioActivo} clienteActivo={null} onVolverAdmin={() => setVistaAdmin('panel')} onLogout={() => cerrarSesion()} /></div></>;
      return <><style dangerouslySetInnerHTML={{__html: inyectarEstilos()}} /><AdminPanel user={usuarioActivo} onLogout={() => cerrarSesion()} onGoToKiosco={() => setVistaAdmin('kiosco')} /></>;
    }

    if (entornoActivo === 'caja') return <><style dangerouslySetInnerHTML={{__html: inyectarEstilos()}} /><Caja user={usuarioActivo} onLogout={() => cerrarSesion()} onGoToKiosco={() => {}} /></>;
    if (entornoActivo === 'cocina') return <><style dangerouslySetInnerHTML={{__html: inyectarEstilos()}} /><Cocina user={usuarioActivo} onLogout={() => cerrarSesion()} /></>;
    if (entornoActivo === 'repartidor') return <><style dangerouslySetInnerHTML={{__html: inyectarEstilos()}} /><Repartidor user={usuarioActivo} configGlobal={configGlobal} onLogout={() => cerrarSesion()} /></>;

  } // <-- FIN DEL ESCUDO PROTECTOR

  if (clienteActivo || modoInvitado) {
    return <><style dangerouslySetInnerHTML={{__html: inyectarEstilos()}} /><div className="tema-cliente"><Kiosco user={null} clienteActivo={clienteActivo} onLogout={() => cerrarSesion()} /></div></>;
  }

  return (
    <>
      <style dangerouslySetInnerHTML={{__html: inyectarEstilos()}} />
      <div className="tema-cliente min-h-screen flex items-center justify-center p-4 font-sans text-slate-800">
        <div className="bg-white p-8 md:p-12 rounded-[40px] shadow-2xl max-w-lg w-full text-center border relative overflow-hidden">
          <div className="absolute -top-32 -left-32 w-64 h-64 bg-blue-50 rounded-full blur-3xl opacity-50 pointer-events-none"></div>
          <div className="absolute -bottom-32 -right-32 w-64 h-64 bg-emerald-50 rounded-full blur-3xl opacity-50 pointer-events-none"></div>

          <div className="relative z-10">
            {configGlobal.logo_url ? (
              <div className="flex justify-center items-center h-28 md:h-36 mb-8 mt-4">
                <img src={getImageUrl(configGlobal.logo_url)} alt="Logo" className="w-full h-full object-contain drop-shadow-xl scale-[1.7] hover:scale-[1.8] transition-transform duration-300" />
              </div>
            ) : (
              <div className="bg-blue-600 text-white w-32 h-32 flex items-center justify-center rounded-[36px] mx-auto mb-8 text-6xl shadow-xl shadow-blue-500/30">🍔</div>
            )}

            <h1 className="text-4xl font-black mb-2 tracking-tight texto-destacado">{configGlobal.nombre_negocio && configGlobal.nombre_negocio !== 'Mi Restaurante' ? configGlobal.nombre_negocio : 'Bienvenido'}</h1>
            <p className="font-medium mb-8 text-lg texto-destacado">{empleadoFase2 ? 'Acceso Seguro' : (necesitaRegistro ? 'Crea tu cuenta' : 'Ingresa tu número para continuar')}</p>

            {empleadoFase2 ? (
              <form onSubmit={handleLoginEmpleado} className="space-y-6 text-left animate-in slide-in-from-right">
                <div>
                  <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-3 text-center">Hola <span className="text-blue-600">{empleadoFase2.nombre}</span>, ingresa tu contraseña</label>
                  <input type="password" required autoFocus value={password} onChange={(e) => setPassword(e.target.value)} className="w-full border-2 border-blue-500 rounded-2xl p-5 text-center text-2xl font-black outline-none transition-all" placeholder="••••••••" />
                </div>
                {error && <p className="text-red-500 text-sm font-bold text-center bg-red-50 p-3 rounded-xl border border-red-100">{error}</p>}
                <div className="flex gap-4">
                  <button type="button" onClick={() => { setEmpleadoFase2(null); setPassword(''); setError(''); }} className="flex-1 bg-slate-200 hover:bg-slate-300 text-slate-700 py-4 rounded-2xl font-black text-lg transition-all">Volver</button>
                  <button type="submit" className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-4 rounded-2xl font-black text-lg shadow-lg shadow-blue-500/30 transition-all">Entrar</button>
                </div>
              </form>
            ) : necesitaRegistro ? (
              <form onSubmit={handleRegistro} className="space-y-4 text-left animate-in slide-in-from-right">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase text-center mb-1">Nombre *</label>
                    <input type="text" required autoFocus value={nombreNuevo} onChange={(e) => setNombreNuevo(e.target.value)} className="w-full bg-slate-50 border-2 border-emerald-500 rounded-xl p-3 font-bold outline-none" placeholder="Juan" />
                  </div>
                  <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase text-center mb-1">Apellido *</label>
                    <input type="text" required value={apellidoNuevo} onChange={(e) => setApellidoNuevo(e.target.value)} className="w-full bg-slate-50 border-2 border-emerald-500 rounded-xl p-3 font-bold outline-none" placeholder="Pérez" />
                  </div>
                </div>
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase text-center mb-1">Correo Electrónico (Opcional)</label>
                  <input type="email" value={correoNuevo} onChange={(e) => setCorreoNuevo(e.target.value)} className="w-full bg-slate-50 border-2 border-emerald-500 rounded-xl p-3 font-bold outline-none" placeholder="correo@ejemplo.com" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase text-center mb-1">Fecha Nacimiento</label>
                    <input type="date" value={fechaNacNuevo} onChange={(e) => setFechaNacNuevo(e.target.value)} className="w-full bg-slate-50 border-2 border-emerald-500 rounded-xl p-3 text-center font-bold outline-none" />
                  </div>
                  <div className="flex flex-col justify-end">
                    <label className="text-[10px] font-black text-slate-400 uppercase text-center mb-1">NIP de Seguridad *</label>
                    <input type="password" maxLength="4" required value={nipNuevo} onChange={(e) => setNipNuevo(e.target.value.replace(/\D/g, ''))} className="w-full bg-slate-50 border-2 border-emerald-500 rounded-xl p-3 text-center font-black outline-none tracking-[0.5em]" placeholder="••••" />
                  </div>
                </div>
                <p className="text-[10px] text-center text-slate-400 font-bold uppercase tracking-widest mt-2">Te pediremos el NIP solo para canjear puntos.</p>
                {error && <p className="text-red-500 text-sm font-bold text-center bg-red-50 p-2 rounded-xl border border-red-100">{error}</p>}
                <div className="flex gap-4 pt-2">
                  <button type="button" onClick={() => { setNecesitaRegistro(false); setError(''); setNipNuevo(''); }} className="flex-1 bg-slate-200 hover:bg-slate-300 text-slate-700 py-4 rounded-2xl font-black text-lg transition-all">Volver</button>
                  <button type="submit" className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white py-4 rounded-2xl font-black text-lg shadow-lg shadow-emerald-500/30 transition-all">Empezar</button>
                </div>
              </form>
            ) : (
              <form onSubmit={handleIdentificar} className="space-y-6 text-left animate-in fade-in">
                <div>
                  <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-3 text-center">Celular a 10 dígitos</label>
                  <input type="tel" maxLength="10" required autoFocus value={telefono} onChange={(e) => setTelefono(e.target.value.replace(/\D/g, ''))} className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl p-5 text-center text-2xl font-black outline-none focus:border-blue-500 transition-all tracking-widest placeholder-slate-400" placeholder="000 000 0000" />
                </div>
                {error && <p className="text-red-500 text-sm font-bold text-center bg-red-50 p-3 rounded-xl border border-red-100">{error}</p>}
                <button type="submit" disabled={telefono.length !== 10} className="w-full bg-blue-600 hover:bg-blue-700 text-white py-5 rounded-2xl font-black text-xl shadow-lg shadow-blue-500/30 transition-all disabled:opacity-50 disabled:shadow-none active:scale-95">Continuar</button>
              </form>
            )}

            {!necesitaRegistro && !empleadoFase2 && (<div className="mt-8 flex flex-col gap-4"><button onClick={() => setModoInvitado(true)} className="text-slate-400 hover:text-slate-500 font-bold text-sm transition-colors underline">Entrar directo como Invitado</button></div>)}
          </div>
        </div>

        {sesionExpirada && (
            <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm z-[9999] flex items-center justify-center p-4 animate-in fade-in">
                <div className="bg-white rounded-[40px] p-8 md:p-12 max-w-sm w-full shadow-2xl text-center border border-slate-100 animate-in zoom-in-95">
                    <div className="w-24 h-24 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto mb-6 shadow-inner">
                        <span className="text-5xl">⏱️</span>
                    </div>
                    <h3 className="text-3xl font-black text-slate-800 mb-2 tracking-tight">Sesión Expirada</h3>
                    <p className="text-slate-500 font-medium mb-8">Por seguridad y protección de datos, tu sesión ha caducado tras 9 horas de inactividad.</p>
                    <button onClick={() => setSesionExpirada(false)} className="w-full bg-slate-800 hover:bg-slate-700 text-white font-black py-4 rounded-xl shadow-lg shadow-slate-800/30 active:scale-95 transition-all text-lg">
                        Entendido
                    </button>
                </div>
            </div>
        )}

      </div>
    </>
  );
};

export default App;