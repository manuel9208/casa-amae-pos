import React, { useState, useEffect } from 'react';
import AdminPanel from './components/AdminPanel';
import Caja from './components/Caja';
import Cocina from './components/Cocina';
import Kiosco from './components/Kiosco';
import PantallaTV from './components/PantallaTV'; 

const App = () => {
  const [usuarioActivo, setUsuarioActivo] = useState(null);
  const [clienteActivo, setClienteActivo] = useState(null);
  const [modoInvitado, setModoInvitado] = useState(false);
  const [vistaAdmin, setVistaAdmin] = useState('panel'); 
  const [vistaTV, setVistaTV] = useState(false); 
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
  const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:4000/api';

  const iniciarSesionPersistente = (tipo, data) => {
    const expiracion = new Date().getTime() + (8 * 60 * 60 * 1000); 
    localStorage.setItem('pos_sesion', JSON.stringify({ tipo, data, expiracion }));
    if (tipo === 'empleado') setUsuarioActivo(data);
    if (tipo === 'cliente') setClienteActivo(data);
  };

  useEffect(() => {
    if (!localStorage.getItem('pos_device_id')) localStorage.setItem('pos_device_id', Math.random().toString(36).substring(2, 15));
    const sesionGuardada = localStorage.getItem('pos_sesion');
    if (sesionGuardada) {
      try {
        const { tipo, data, expiracion } = JSON.parse(sesionGuardada);
        if (new Date().getTime() < expiracion) {
          if (tipo === 'empleado') setUsuarioActivo(data);
          if (tipo === 'cliente') setClienteActivo(data);
        } else { localStorage.removeItem('pos_sesion'); }
      } catch(e) {}
    }
    fetch(`${apiUrl}/configuracion`).then(res => res.json()).then(data => { if(data) setConfigGlobal(data); }).catch(console.error);
  }, [apiUrl]);

  const handleIdentificar = async (e) => {
    e.preventDefault(); setError('');
    if (telefono.length !== 10) return setError('El número debe tener exactamente 10 dígitos.');
    try {
      const res = await fetch(`${apiUrl}/identificar`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ telefono }) });
      const data = await res.json();
      if (res.ok) {
        if (data.tipo === 'empleado') setEmpleadoFase2(data.data);
        else if (data.tipo === 'cliente') iniciarSesionPersistente('cliente', data.data); 
        else if (data.tipo === 'nuevo') setNecesitaRegistro(true);
        else { if (data.cliente) iniciarSesionPersistente('cliente', data.cliente); else setNecesitaRegistro(true); }
      } else setError(data.error || 'Error al acceder');
    } catch (err) { setError('Error de conexión'); }
  };

  const handleLoginEmpleado = async (e) => {
    e.preventDefault(); setError('');
    const dispositivo_id = localStorage.getItem('pos_device_id');
    try {
      const res = await fetch(`${apiUrl}/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ usuario: empleadoFase2.usuario, password, dispositivo_id }) });
      const data = await res.json();
      if (res.ok) iniciarSesionPersistente('empleado', data.usuario); else setError(data.error || 'Contraseña incorrecta');
    } catch (err) { setError('Error de conexión'); }
  };

  const handleRegistro = async (e) => {
    e.preventDefault();
    if(!nombreNuevo.trim() || !apellidoNuevo.trim() || nipNuevo.length !== 4) return setError("Nombre, Apellido y NIP (4) son obligatorios.");
    try {
      const res = await fetch(`${apiUrl}/clientes/registro`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ telefono, nombre: nombreNuevo, apellido: apellidoNuevo, correo: correoNuevo, fecha_nacimiento: fechaNacNuevo, nip: nipNuevo }) });
      const data = await res.json();
      if (res.ok) { iniciarSesionPersistente('cliente', data.cliente || data); setNecesitaRegistro(false); } else setError(data.error || 'Error al registrar');
    } catch (err) { setError('Error de conexión'); }
  };

  const cerrarSesion = async () => {
    if (usuarioActivo) { try { await fetch(`${apiUrl}/logout`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ usuario_id: usuarioActivo.id }) }); } catch (error) {} }
    localStorage.removeItem('pos_sesion'); 
    setUsuarioActivo(null); setClienteActivo(null); setModoInvitado(false); setTelefono(''); setPassword(''); setVistaAdmin('panel'); setVistaTV(false); setNecesitaRegistro(false); setEmpleadoFase2(null);
  };

  const inyectarEstilos = () => {
    const cPrimario = configGlobal.color_primario || '#2563eb';
    const cSecundario = configGlobal.color_secundario || '#10b981';
    const cFondo = configGlobal.color_fondo || '#f1f5f9';
    const cTarjetas = configGlobal.color_fondo_tarjetas || '#ffffff';
    const cTextoPrin = configGlobal.color_texto_principal || '#1e293b';
    const cTextoSec = configGlobal.color_texto_secundario || '#64748b';
    const cTextoKiosco = configGlobal.color_texto_kiosco || '#1e293b';
    const fTitulos = configGlobal.fuente_titulos || 'system-ui, sans-serif';
    const fTextos = configGlobal.fuente_textos || 'system-ui, sans-serif';

    return `
      @import url('https://fonts.googleapis.com/css2?family=Cinzel:wght@400;700;900&family=Montserrat:wght@400;500;700;900&family=Playfair+Display:wght@700;900&family=Poppins:wght@400;700;900&display=swap');
      
      :root {
        --c-primario: ${cPrimario};
        --c-secundario: ${cSecundario};
        --c-fondo: ${cFondo};
        --c-tarjetas: ${cTarjetas};
        --c-texto-prin: ${cTextoPrin};
        --c-texto-sec: ${cTextoSec};
        --c-texto-kiosco: ${cTextoKiosco};
        --f-titulos: ${fTitulos};
        --f-textos: ${fTextos};
      }

      body, .font-sans, p, span, input, button, select, textarea { font-family: var(--f-textos) !important; }
      h1, h2, h3, h4, h5, h6, .font-black { font-family: var(--f-titulos) !important; }

      .bg-blue-600 { background-color: var(--c-primario) !important; }
      .text-blue-600 { color: var(--c-primario) !important; }
      .border-blue-600, .border-blue-500 { border-color: var(--c-primario) !important; }
      .hover\\:bg-blue-700:hover { background-color: color-mix(in srgb, var(--c-primario) 80%, black) !important; }
      .bg-blue-50 { background-color: color-mix(in srgb, var(--c-primario) 8%, white) !important; border-color: color-mix(in srgb, var(--c-primario) 20%, white) !important;}
      .focus\\:border-blue-500:focus, .focus\\:ring-blue-500:focus { border-color: var(--c-primario) !important; --tw-ring-color: var(--c-primario) !important; }

      .bg-emerald-500, .bg-emerald-600 { background-color: var(--c-secundario) !important; }
      .text-emerald-500, .text-emerald-600 { color: var(--c-secundario) !important; }
      .border-emerald-500 { border-color: var(--c-secundario) !important; }
      .hover\\:bg-emerald-600:hover { background-color: color-mix(in srgb, var(--c-secundario) 80%, black) !important; }
      .bg-emerald-50, .bg-emerald-100 { background-color: color-mix(in srgb, var(--c-secundario) 8%, white) !important; border-color: color-mix(in srgb, var(--c-secundario) 20%, white) !important;}

      .tema-cliente { background-color: var(--c-fondo) !important; min-height: 100vh; }
      .tema-cliente .bg-slate-100, .tema-cliente .bg-gray-50 { background-color: var(--c-fondo) !important; }
      .tema-cliente .bg-white { background-color: var(--c-tarjetas) !important; border-color: color-mix(in srgb, var(--c-texto-prin) 10%, transparent) !important; }
      .tema-cliente .bg-slate-50 { background-color: color-mix(in srgb, var(--c-tarjetas) 95%, black) !important; border-color: color-mix(in srgb, var(--c-texto-prin) 10%, transparent) !important; }
      .tema-cliente .text-slate-900, .tema-cliente .text-slate-800, .tema-cliente .text-slate-700 { color: var(--c-texto-prin) !important; }
      .tema-cliente .text-slate-600, .tema-cliente .text-slate-500, .tema-cliente .text-slate-400 { color: var(--c-texto-sec) !important; }
      .tema-cliente .texto-destacado { color: var(--c-texto-kiosco) !important; }
      .tema-cliente input, .tema-cliente textarea { color: var(--c-texto-prin) !important; background-color: color-mix(in srgb, var(--c-tarjetas) 95%, white) !important; }
      .tema-cliente button.bg-blue-600, .tema-cliente button.bg-emerald-500, .tema-cliente button.bg-slate-900 { color: #ffffff !important; }
    `;
  };
  
  if (vistaTV) return <><style dangerouslySetInnerHTML={{__html: inyectarEstilos()}} /><div className="tema-cliente"><PantallaTV onVolver={() => setVistaTV(false)} /></div></>;

  if (usuarioActivo) {
    if (usuarioActivo.rol === 'tv') return <><style dangerouslySetInnerHTML={{__html: inyectarEstilos()}} /><div className="tema-cliente"><PantallaTV onVolver={cerrarSesion} /></div></>;
    if (usuarioActivo.rol === 'admin') {
      if (vistaAdmin === 'kiosco') return <><style dangerouslySetInnerHTML={{__html: inyectarEstilos()}} /><div className="tema-cliente"><Kiosco user={usuarioActivo} clienteActivo={null} onVolverAdmin={() => setVistaAdmin('panel')} onLogout={cerrarSesion} /></div></>;
      return <><style dangerouslySetInnerHTML={{__html: inyectarEstilos()}} /><AdminPanel user={usuarioActivo} onLogout={cerrarSesion} onGoToKiosco={() => setVistaAdmin('kiosco')} /></>;
    }
    if (usuarioActivo.rol === 'cajero') return <><style dangerouslySetInnerHTML={{__html: inyectarEstilos()}} /><Caja user={usuarioActivo} onLogout={cerrarSesion} /></>;
    if (usuarioActivo.rol === 'cocina') return <><style dangerouslySetInnerHTML={{__html: inyectarEstilos()}} /><Cocina user={usuarioActivo} onLogout={cerrarSesion} /></>;
  }

  if (clienteActivo || modoInvitado) return <><style dangerouslySetInnerHTML={{__html: inyectarEstilos()}} /><div className="tema-cliente"><Kiosco user={null} clienteActivo={clienteActivo} onLogout={cerrarSesion} /></div></>;

  return (
    <>
      <style dangerouslySetInnerHTML={{__html: inyectarEstilos()}} />
      <div className="tema-cliente min-h-screen flex items-center justify-center p-4 font-sans">
        <div className="bg-white p-8 md:p-12 rounded-[40px] shadow-2xl max-w-md w-full text-center border relative overflow-hidden">
          <div className="absolute -top-32 -left-32 w-64 h-64 bg-blue-50 rounded-full blur-3xl opacity-50 pointer-events-none"></div><div className="absolute -bottom-32 -right-32 w-64 h-64 bg-emerald-50 rounded-full blur-3xl opacity-50 pointer-events-none"></div>
          <div className="relative z-10">
            {configGlobal.logo_url ? (<img src={`http://localhost:4000${configGlobal.logo_url}`} alt="Logo" className="h-28 object-contain mx-auto mb-6 drop-shadow-sm" />) : (<div className="bg-blue-600 text-white w-24 h-24 flex items-center justify-center rounded-[28px] mx-auto mb-6 text-5xl shadow-lg shadow-blue-500/30">🍔</div>)}
            <h1 className="text-4xl font-black mb-2 tracking-tight texto-destacado">{configGlobal.nombre_negocio && configGlobal.nombre_negocio !== 'Mi Restaurante' ? configGlobal.nombre_negocio : 'Bienvenido'}</h1>
            <p className="font-medium mb-8 text-lg texto-destacado">{empleadoFase2 ? 'Acceso Seguro' : (necesitaRegistro ? 'Crea tu cuenta' : 'Ingresa tu número para continuar')}</p>

            {empleadoFase2 ? (
              <form onSubmit={handleLoginEmpleado} className="space-y-6 text-left">
                <div><label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-3 text-center">Hola <span className="text-blue-600">{empleadoFase2.nombre}</span>, ingresa tu contraseña</label><input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} className="w-full border-2 border-blue-500 rounded-2xl p-5 text-center text-2xl font-black outline-none transition-all" placeholder="••••••••" /></div>
                {error && <p className="text-red-500 text-sm font-bold text-center bg-red-50 p-3 rounded-xl border border-red-100">{error}</p>}
                <div className="flex gap-4"><button type="button" onClick={() => { setEmpleadoFase2(null); setPassword(''); setError(''); }} className="flex-1 bg-slate-200 hover:bg-slate-300 text-slate-700 py-5 rounded-2xl font-black text-lg transition-all">Volver</button><button type="submit" className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-5 rounded-2xl font-black text-lg shadow-lg shadow-blue-500/30 transition-all">Entrar</button></div>
              </form>
            ) : necesitaRegistro ? (
              <form onSubmit={handleRegistro} className="space-y-4 text-left">
                <div className="grid grid-cols-2 gap-4"><input type="text" required value={nombreNuevo} onChange={(e) => setNombreNuevo(e.target.value)} className="w-full bg-slate-50 border-2 border-emerald-500 rounded-xl p-3 text-center font-bold outline-none" placeholder="Nombre *" /><input type="text" required value={apellidoNuevo} onChange={(e) => setApellidoNuevo(e.target.value)} className="w-full bg-slate-50 border-2 border-emerald-500 rounded-xl p-3 text-center font-bold outline-none" placeholder="Apellido *" /></div>
                <input type="email" value={correoNuevo} onChange={(e) => setCorreoNuevo(e.target.value)} className="w-full bg-slate-50 border-2 border-emerald-500 rounded-xl p-3 text-center font-bold outline-none" placeholder="Correo Electrónico (Opcional)" />
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex flex-col justify-end"><label className="text-[10px] font-black text-slate-400 uppercase text-center mb-1">Fecha Nacimiento</label><input type="date" value={fechaNacNuevo} onChange={(e) => setFechaNacNuevo(e.target.value)} className="w-full bg-slate-50 border-2 border-emerald-500 rounded-xl p-3 text-center font-bold outline-none" /></div>
                  <div className="flex flex-col justify-end"><label className="text-[10px] font-black text-slate-400 uppercase text-center mb-1">NIP de Seguridad *</label><input type="password" maxLength="4" required value={nipNuevo} onChange={(e) => setNipNuevo(e.target.value.replace(/\D/g, ''))} className="w-full bg-slate-50 border-2 border-emerald-500 rounded-xl p-3 text-center font-black outline-none tracking-[0.5em]" placeholder="••••" /></div>
                </div>
                <p className="text-[10px] text-center text-slate-400 font-bold uppercase tracking-widest mt-2">Te pediremos el NIP solo para canjear puntos.</p>
                {error && <p className="text-red-500 text-sm font-bold text-center bg-red-50 p-2 rounded-xl border border-red-100">{error}</p>}
                <div className="flex gap-4 pt-2"><button type="button" onClick={() => { setNecesitaRegistro(false); setError(''); setNipNuevo(''); }} className="flex-1 bg-slate-200 hover:bg-slate-300 text-slate-700 py-4 rounded-2xl font-black text-lg transition-all">Volver</button><button type="submit" className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white py-4 rounded-2xl font-black text-lg shadow-lg shadow-emerald-500/30 transition-all">Empezar</button></div>
              </form>
            ) : (
              <form onSubmit={handleIdentificar} className="space-y-6 text-left">
                <div><label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-3 text-center">Celular a 10 dígitos</label><input type="tel" maxLength="10" required value={telefono} onChange={(e) => setTelefono(e.target.value.replace(/\D/g, ''))} className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl p-5 text-center text-2xl font-black outline-none focus:border-blue-500 transition-all tracking-widest placeholder-slate-400" placeholder="000 000 0000" /></div>
                {error && <p className="text-red-500 text-sm font-bold text-center bg-red-50 p-3 rounded-xl border border-red-100">{error}</p>}
                <button type="submit" disabled={telefono.length !== 10} className="w-full bg-blue-600 hover:bg-blue-700 text-white py-5 rounded-2xl font-black text-xl shadow-lg shadow-blue-500/30 transition-all disabled:opacity-50 disabled:shadow-none active:scale-95">Continuar</button>
              </form>
            )}
            {!necesitaRegistro && !empleadoFase2 && (<div className="mt-8 flex flex-col gap-4"><button onClick={() => setModoInvitado(true)} className="text-slate-400 hover:text-slate-500 font-bold text-sm transition-colors underline">Entrar directo como Invitado</button></div>)}
          </div>
        </div>
      </div>
    </>
  );
};
export default App;