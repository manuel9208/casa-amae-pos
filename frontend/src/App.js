import React, { useState, useEffect } from 'react';
import AdminPanel from './components/AdminPanel';
import Kiosco from './components/Kiosco';
import Caja from './components/Caja';
import Cocina from './components/Cocina';
import Repartidor from './components/Repartidor';
import PantallaTV from './components/PantallaTV';
import Empleado from './components/Empleado';
import io from 'socket.io-client';

const App = () => {
    // ==========================================
    // ESTADOS PRINCIPALES DE SESIÓN
    // ==========================================
    const [usuarioActivo, setUsuarioActivo] = useState(null);
    const [clienteActivo, setClienteActivo] = useState(null);
    const [modoInvitado, setModoInvitado] = useState(false);
    
    const [telefono, setTelefono] = useState('');
    const [password, setPassword] = useState('');
    const [empleadoFase2, setEmpleadoFase2] = useState(null);
    const [necesitaRegistro, setNecesitaRegistro] = useState(false);
    
    const [nombreNuevo, setNombreNuevo] = useState('');
    const [apellidoNuevo, setApellidoNuevo] = useState('');
    const [correoNuevo, setCorreoNuevo] = useState('');
    const [fechaNacNuevo, setFechaNacNuevo] = useState('');
    const [nipNuevo, setNipNuevo] = useState('');
    
    const [error, setError] = useState('');
    const [vistaAdmin, setVistaAdmin] = useState('panel');
    const [vistaTV, setVistaTV] = useState(false);
    const [configGlobal, setConfigGlobal] = useState({});
    
    const [entornoActivo, setEntornoActivo] = useState(null);
    const [segundaSesionActiva, setSegundaSesionActiva] = useState(false);

    const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:4000/api';
    const baseUrl = apiUrl.replace('/api', '');

    // ==========================================
    // HELPERS VISUALES
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

    const iniciarSesionPersistente = (tipo, data, es_secundaria = false) => {
        if (tipo === 'empleado') {
            setUsuarioActivo(data);
            setSegundaSesionActiva(es_secundaria);
            if (es_secundaria || data.rol === 'ayudante_cocina') {
                setEntornoActivo('portal');
                localStorage.setItem('pos_entorno_activo', 'portal');
            } else {
                const savedEntorno = localStorage.getItem('pos_entorno_activo');
                if (savedEntorno) setEntornoActivo(savedEntorno);
            }
        } else if (tipo === 'cliente') {
            setClienteActivo(data);
        }
        localStorage.setItem('pos_sesion', JSON.stringify({ tipo, data, es_secundaria }));
    };

    // ==========================================
    // LIFECYCLE (EFECTOS DE ARRANQUE)
    // ==========================================
    useEffect(() => {
        if (!localStorage.getItem('pos_device_id')) {
            localStorage.setItem('pos_device_id', 'DEV_' + Math.random().toString(36).substring(2, 15));
        }

        const savedSession = localStorage.getItem('pos_sesion');
        if (savedSession) {
            try {
                const sessionData = JSON.parse(savedSession);
                if (sessionData.tipo === 'empleado') {
                    setUsuarioActivo(sessionData.data);
                    setSegundaSesionActiva(sessionData.es_secundaria || false);
                    const savedEntorno = localStorage.getItem('pos_entorno_activo');
                    if (savedEntorno) setEntornoActivo(savedEntorno);
                }
                else if (sessionData.tipo === 'cliente') setClienteActivo(sessionData.data);
            } catch (e) {
                localStorage.removeItem('pos_sesion');
                localStorage.removeItem('pos_entorno_activo');
            }
        }

        const cargarConfig = async () => {
            try {
                const res = await fetch(`${apiUrl}/configuracion?t=${new Date().getTime()}`);
                const data = await res.json();
                if (data && !data.error) setConfigGlobal(data);
            } catch (err) {}
        };
        
        cargarConfig();
        const intervaloConfig = setInterval(cargarConfig, 5000);
        return () => clearInterval(intervaloConfig);
    }, [apiUrl]);

    // Cronómetro Evaluador Inteligente de Horario (Se ejecuta cada minuto)
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
                if (!hHoy || !hHoy.activo) return;

                const hActualNum = hoy.getHours() * 60 + hoy.getMinutes();
                const [hApe, mApe] = hHoy.apertura.split(':').map(Number);
                const minApe = hApe * 60 + mApe;

                if (hActualNum >= minApe && hActualNum <= minApe + 2 && configGlobal.negocio_abierto === false) {
                    const formData = new FormData();
                    formData.append('negocio_abierto', 'true');
                    const res = await fetch(`${apiUrl}/configuracion`, { method: 'PUT', body: formData });
                    if (res.ok) {
                        setConfigGlobal(prev => ({...prev, negocio_abierto: true}));
                    }
                }
            } catch(e) {}
        };

        const interval = setInterval(checkHorarioCron, 60000);
        return () => clearInterval(interval);
    }, [configGlobal, apiUrl]);

    useEffect(() => {
        const socket = io(baseUrl, { transports: ['websocket', 'polling'] });
        socket.on('usuario_eliminado', (idEliminado) => {
            setUsuarioActivo(prevUsuario => {
                if (prevUsuario && Number(prevUsuario.id) === Number(idEliminado)) {
                    localStorage.removeItem('pos_sesion');
                    localStorage.removeItem('pos_entorno_activo');
                    setTimeout(() => window.location.reload(), 100);
                    return null;
                }
                return prevUsuario;
            });
        });
        return () => socket.disconnect();
    }, [baseUrl]);

    useEffect(() => {
        if (usuarioActivo) {
            if (usuarioActivo.rol === 'ayudante_cocina' || segundaSesionActiva) {
                setEntornoActivo('portal');
                localStorage.setItem('pos_entorno_activo', 'portal');
            }
        }
    }, [usuarioActivo, segundaSesionActiva]);

    // ==========================================
    // MANEJADORES DE LOGUEO Y REGISTRO
    // ==========================================
    const handleIdentificar = async (e) => {
        e.preventDefault(); setError('');
        if (telefono === '0000000000') { setVistaTV(true); return; }
        try {
            const res = await fetch(`${apiUrl}/identificar`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ telefono }) });
            const data = await res.json();
            if (res.ok) {
                const payload = data.data || data.datos || data.usuario || data.cliente;
                if (data.tipo === 'empleado') {
                    setEmpleadoFase2(payload);
                } else if (data.tipo === 'cliente') {
                    iniciarSesionPersistente('cliente', payload);
                } else {
                    setNecesitaRegistro(true);
                }
            } else {
                if (res.status === 404) setNecesitaRegistro(true);
                else setError(data.error || 'Error al identificar.');
            }
        } catch (err) { setError('Error de conexión al servidor.'); }
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

    const cerrarSesion = async () => {
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

        // 👇 FIX APLICADO: Evaluar cierre inteligente SOLO si quien cierra sesión es personal de Caja/Admin.
        // Los clientes en el Kiosco (invitados o logueados) NO deben cerrar el restaurante al terminar su orden.
        if (usuarioActivo && ['cajero', 'admin', 'gerente', 'jefe'].includes(usuarioActivo.rol)) {
            if (configGlobal && configGlobal.horarios_semana) {
                try {
                    const dias = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
                    const hoy = new Date();
                    const diaActual = dias[hoy.getDay()];
                    const horario = typeof configGlobal.horarios_semana === 'string' 
                        ? JSON.parse(configGlobal.horarios_semana) 
                        : configGlobal.horarios_semana;
                    
                    const hHoy = horario[diaActual];
                    let debeEstarCerrado = true;

                    if (hHoy && hHoy.activo) {
                        const hActualNum = hoy.getHours() * 60 + hoy.getMinutes();
                        const [hCie, mCie] = hHoy.cierre.split(':').map(Number);
                        const minCie = hCie * 60 + mCie;
                        if (hActualNum < minCie) {
                            debeEstarCerrado = false;
                        }
                    }

                    if (debeEstarCerrado && configGlobal.negocio_abierto === true) {
                        const formData = new FormData();
                        formData.append('negocio_abierto', 'false');
                        await fetch(`${apiUrl}/configuracion`, { method: 'PUT', body: formData });
                    }
                } catch(e) {}
            }
        }

        setUsuarioActivo(null); setClienteActivo(null); setModoInvitado(false);
        setTelefono(''); setPassword(''); setEmpleadoFase2(null);
        setEntornoActivo(null); setSegundaSesionActiva(false);
        
        localStorage.removeItem('pos_sesion');
        localStorage.removeItem('pos_entorno_activo');
    };

    const inyectarEstilos = () => {
        return `
            :root { --c-primario: ${configGlobal.color_primario}; --c-secundario: ${configGlobal.color_secundario}; --c-fondo: ${configGlobal.color_fondo}; --c-tarjetas: ${configGlobal.color_fondo_tarjetas}; --c-texto-prin: ${configGlobal.color_texto_principal}; --c-texto-sec: ${configGlobal.color_texto_secundario}; --c-texto-kiosco: ${configGlobal.color_texto_kiosco}; --f-titulos: ${configGlobal.fuente_titulos}; --f-textos: ${configGlobal.fuente_textos}; }
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
            .tema-cliente .text-slate-900, .tema-cliente .text-slate-800, .tema-cliente text-slate-700 { color: var(--c-texto-prin) !important; }
            .tema-cliente .text-slate-600, .tema-cliente .text-slate-500, .tema-cliente .text-slate-400 { color: var(--c-texto-sec) !important; }
            .tema-cliente .texto-destacado { color: var(--c-texto-kiosco) !important; }
            .tema-cliente input, .tema-cliente textarea { color: var(--c-texto-prin) !important; background-color: color-mix(in srgb, var(--c-tarjetas) 95%, white) !important; }
            .tema-cliente button.bg-blue-600, .tema-cliente button.bg-emerald-500, .tema-cliente button.bg-slate-900 { color: #ffffff !important; }
        `;
    };

    if (vistaTV) return <><style dangerouslySetInnerHTML={{__html: inyectarEstilos()}} /><div className="tema-cliente"><PantallaTV onLogout={() => setVistaTV(false)} /></div></>;

    if (usuarioActivo) {
        if (usuarioActivo.rol === 'tv') return <><style dangerouslySetInnerHTML={{__html: inyectarEstilos()}} /><div className="tema-cliente"><PantallaTV onLogout={cerrarSesion} /></div></>;
        
        if (usuarioActivo.usuario === 'admin') {
            if (vistaAdmin === 'kiosco') return <><style dangerouslySetInnerHTML={{__html: inyectarEstilos()}} /><div className="tema-cliente"><Kiosco user={usuarioActivo} clienteActivo={null} onVolverAdmin={() => setVistaAdmin('panel')} onLogout={cerrarSesion} /></div></>;
            return <><style dangerouslySetInnerHTML={{__html: inyectarEstilos()}} /><AdminPanel user={usuarioActivo} onLogout={cerrarSesion} onGoToKiosco={() => setVistaAdmin('kiosco')} /></>;
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
                            <button onClick={cerrarSesion} className="mt-12 px-6 py-3 rounded-full bg-slate-100 text-slate-500 hover:bg-red-50 hover:text-red-500 font-bold transition-colors">
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
                        <Empleado
                            user={usuarioActivo} apiUrl={apiUrl} onLogout={cerrarSesion}
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
            if (vistaAdmin === 'kiosco') return <><style dangerouslySetInnerHTML={{__html: inyectarEstilos()}} /><div className="tema-cliente"><Kiosco user={usuarioActivo} clienteActivo={null} onVolverAdmin={() => setVistaAdmin('panel')} onLogout={cerrarSesion} /></div></>;
            return <><style dangerouslySetInnerHTML={{__html: inyectarEstilos()}} /><AdminPanel user={usuarioActivo} onLogout={cerrarSesion} onGoToKiosco={() => setVistaAdmin('kiosco')} /></>;
        }

        if (entornoActivo === 'caja') return <><style dangerouslySetInnerHTML={{__html: inyectarEstilos()}} /><Caja user={usuarioActivo} onLogout={cerrarSesion} onGoToKiosco={() => {}} /></>;
        if (entornoActivo === 'cocina') return <><style dangerouslySetInnerHTML={{__html: inyectarEstilos()}} /><Cocina user={usuarioActivo} onLogout={cerrarSesion} /></>;
        if (entornoActivo === 'repartidor') return <><style dangerouslySetInnerHTML={{__html: inyectarEstilos()}} /><Repartidor user={usuarioActivo} onLogout={cerrarSesion} /></>;
    }

    if (clienteActivo || modoInvitado) return <><style dangerouslySetInnerHTML={{__html: inyectarEstilos()}} /><div className="tema-cliente"><Kiosco user={null} clienteActivo={clienteActivo} onLogout={cerrarSesion} /></div></>;

    return (
        <>
            <style dangerouslySetInnerHTML={{__html: inyectarEstilos()}} />
            <div className="tema-cliente min-h-screen flex items-center justify-center p-4 font-sans text-slate-800">
                <div className="bg-white p-8 md:p-12 rounded-[40px] shadow-2xl max-w-lg w-full text-center border relative overflow-hidden">
                    <div className="absolute -top-32 -left-32 w-64 h-64 bg-blue-50 rounded-full blur-3xl opacity-50 pointer-events-none"></div><div className="absolute -bottom-32 -right-32 w-64 h-64 bg-emerald-50 rounded-full blur-3xl opacity-50 pointer-events-none"></div>
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
                                    <button type="button" onClick={() => { setEmpleadoFase2(null); setPassword(''); setError(''); }} className="flex-1 bg-slate-200 hover:bg-slate-300 text-slate-700 py-5 rounded-2xl font-black text-xl transition-all">Volver</button>
                                    <button type="submit" className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-5 rounded-2xl font-black text-xl shadow-lg shadow-blue-500/30 transition-all">Entrar</button>
                                </div>
                            </form>
                        ) : necesitaRegistro ? (
                            <form onSubmit={handleRegistro} className="space-y-4 text-left animate-in slide-in-from-right">
                                <div className="grid grid-cols-2 gap-4">
                                    <input type="text" required value={nombreNuevo} onChange={(e) => setNombreNuevo(e.target.value)} className="w-full bg-slate-50 border-2 border-emerald-500 rounded-xl p-3 text-center font-bold outline-none" placeholder="Nombre *" />
                                    <input type="text" required value={apellidoNuevo} onChange={(e) => setApellidoNuevo(e.target.value)} className="w-full bg-slate-50 border-2 border-emerald-500 rounded-xl p-3 text-center font-bold outline-none" placeholder="Apellido *" />
                                </div>
                                <input type="email" value={correoNuevo} onChange={(e) => setCorreoNuevo(e.target.value)} className="w-full bg-slate-50 border-2 border-emerald-500 rounded-xl p-3 text-center font-bold outline-none" placeholder="Correo Electrónico (Opcional)" />
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="flex flex-col justify-end">
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

                        {!necesitaRegistro && !empleadoFase2 && (
                            <div className="mt-8 flex flex-col gap-4">
                                <button
                                    onClick={() => setModoInvitado(true)}
                                    className="text-slate-600 hover:text-blue-600 font-black text-sm md:text-base transition-colors underline decoration-2 underline-offset-4 inline-block mx-auto"
                                >
                                    Entrar directo como Invitado
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </>
    );
};

export default App;