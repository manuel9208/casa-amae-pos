import React, { useState, useEffect } from 'react';
import MarcaIdentidad from './configuracion/MarcaIdentidad';
import PagosContacto from './configuracion/PagosContacto';
import BrandingGlobal from './configuracion/BrandingGlobal';
import PublicidadTV from './configuracion/PublicidadTV';
import TicketImpresion from './configuracion/TicketImpresion';
import CostosEnvio from './configuracion/CostosEnvio';
import NotificacionesWA from './configuracion/NotificacionesWA';
import ProgramaLealtad from './configuracion/ProgramaLealtad';
import GestorCupones from './configuracion/GestorCupones';

const AdminConfiguracion = ({
  configGlobal, setConfigGlobal, baseUrl, apiUrl, refrescarDatos, showAlert, showConfirm
}) => {
  
  const [logoBlob, setLogoBlob] = useState(null);
  const [tvBlob1, setTvBlob1] = useState(null);
  const [tvBlob2, setTvBlob2] = useState(null);
  const [tvBlob3, setTvBlob3] = useState(null);
  const [tvVideoBlob, setTvVideoBlob] = useState(null);
  const [tarifasEnvio, setTarifasEnvio] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (configGlobal.tarifas_envio) {
      try {
        const parsed = typeof configGlobal.tarifas_envio === 'string' ? JSON.parse(configGlobal.tarifas_envio) : configGlobal.tarifas_envio;
        setTarifasEnvio(Array.isArray(parsed) ? parsed : []);
      } catch (e) {
        setTarifasEnvio([]);
      }
    }
  }, [configGlobal.tarifas_envio]);

  const getImageUrl = (url) => {
    if (!url) return '';
    if (url.includes('cloudinary.com')) {
      const parts = url.split('res.cloudinary.com/');
      return `https://res.cloudinary.com/${parts[1]}`;
    }
    if (url.startsWith('http')) return url;
    return `${baseUrl}${url.startsWith('/') ? '' : '/'}${url}`;
  };

  const guardarConfiguracion = async (e) => {
    e.preventDefault();
    if(isSubmitting) return;
    setIsSubmitting(true);

    const formData = new FormData();
    Object.keys(configGlobal).forEach(key => {
      if (key !== 'tarifas_envio') formData.append(key, configGlobal[key]);
    });
    
    formData.append('tarifas_envio', JSON.stringify(tarifasEnvio));
    
    if (logoBlob) formData.append('logo', logoBlob);
    if (tvBlob1) formData.append('tv_imagen_1', tvBlob1);
    if (tvBlob2) formData.append('tv_imagen_2', tvBlob2);
    if (tvBlob3) formData.append('tv_imagen_3', tvBlob3);
    if (tvVideoBlob) formData.append('tv_video', tvVideoBlob); 

    try {
      const res = await fetch(`${apiUrl}/configuracion`, { method: 'PUT', body: formData });
      if (res.ok) { 
        showAlert("¡Éxito!", "Configuración actualizada correctamente.", "success"); 
        setLogoBlob(null); setTvBlob1(null); setTvBlob2(null); setTvBlob3(null); setTvVideoBlob(null);
        ['logo-upload', 'tv1-upload', 'tv2-upload', 'tv3-upload', 'tv-video-upload'].forEach(id => {
          const el = document.getElementById(id);
          if (el) el.value = '';
        });
        refrescarDatos(); 
      } else {
        showAlert("Error", "No se pudo guardar la configuración.", "error");
      }
    } catch (error) { 
      showAlert("Error", "Error de conexión con el servidor.", "error"); 
    }
    setIsSubmitting(false);
  };

  const restablecerBranding = () => {
    showConfirm("Restablecer Diseño", "¿Deseas borrar toda la configuración visual y volver a los valores de fábrica?", () => {
      setConfigGlobal({ 
        ...configGlobal,
        color_primario: '#2563eb', color_secundario: '#10b981', color_fondo: '#f1f5f9', 
        color_fondo_tarjetas: '#ffffff', color_texto_principal: '#1e293b', color_texto_secundario: '#64748b', 
        fuente_titulos: 'system-ui, sans-serif', fuente_textos: 'system-ui, sans-serif', 
        kiosco_mensaje: '¿Qué se te antoja hoy?', color_texto_kiosco: '#1e293b', 
        tv_msg_cola: 'EN COLA', tv_msg_progreso: 'PREPARANDO', tv_msg_listo: '¡LISTOS!', 
        tv_carrusel_activo: false, tv_carrusel_segundos: 10,
        mensaje_cierre: 'El negocio se encuentra cerrado temporalmente. Horario de atención: 8:00 AM - 10:00 PM.',
        ticket_impresion_activa: false, ticket_modo_impresion: 'pdf', ticket_domicilio: '',
        ticket_mensaje_final: '¡Gracias por su preferencia!', ticket_firma_sistema: 'Powered by MiSistemaPOS',
        mensaje_envio: 'El costo de envío se calculará según tu zona y se sumará al total de tu pedido.',
        puntos_porcentaje: 10, puntos_valor_peso: 1.00, puntos_activos: true, puntos_canje_activo: true 
      });
      setTarifasEnvio([]);
      setTvVideoBlob(null);
      showAlert("Restablecido", "Diseño vuelto a valores predeterminados. Recuerda guardar cambios.", "info");
    });
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-12 animate-in fade-in">
      <h2 className="text-3xl font-black mb-6 text-slate-800">Configuración del Restaurante</h2>
      
      <form onSubmit={guardarConfiguracion} className="bg-white p-4 md:p-8 rounded-[40px] shadow-sm border border-slate-200 space-y-8">
        <MarcaIdentidad configGlobal={configGlobal} setConfigGlobal={setConfigGlobal} logoBlob={logoBlob} setLogoBlob={setLogoBlob} isSubmitting={isSubmitting} getImageUrl={getImageUrl} />
        <PagosContacto configGlobal={configGlobal} setConfigGlobal={setConfigGlobal} isSubmitting={isSubmitting} />
        <BrandingGlobal configGlobal={configGlobal} setConfigGlobal={setConfigGlobal} isSubmitting={isSubmitting} />
        <PublicidadTV configGlobal={configGlobal} setConfigGlobal={setConfigGlobal} tvBlob1={tvBlob1} setTvBlob1={setTvBlob1} tvBlob2={tvBlob2} setTvBlob2={setTvBlob2} tvBlob3={tvBlob3} setTvBlob3={setTvBlob3} tvVideoBlob={tvVideoBlob} setTvVideoBlob={setTvVideoBlob} isSubmitting={isSubmitting} getImageUrl={getImageUrl} showAlert={showAlert} />
        <TicketImpresion configGlobal={configGlobal} setConfigGlobal={setConfigGlobal} isSubmitting={isSubmitting} />
        <CostosEnvio configGlobal={configGlobal} setConfigGlobal={setConfigGlobal} tarifasEnvio={tarifasEnvio} setTarifasEnvio={setTarifasEnvio} isSubmitting={isSubmitting} />
        <NotificacionesWA configGlobal={configGlobal} setConfigGlobal={setConfigGlobal} isSubmitting={isSubmitting} />
        <ProgramaLealtad configGlobal={configGlobal} setConfigGlobal={setConfigGlobal} isSubmitting={isSubmitting} />
        
        <div className="flex flex-col md:flex-row items-center justify-between pt-6 border-t border-slate-100 gap-4">
          <button disabled={isSubmitting} type="button" onClick={restablecerBranding} className="w-full md:w-auto px-6 py-4 rounded-2xl font-bold text-slate-500 hover:bg-slate-100 border border-slate-200 transition disabled:opacity-50">↺ Restablecer Diseño</button>
          <button disabled={isSubmitting} type="submit" className="w-full md:w-auto bg-blue-600 hover:bg-blue-700 text-white px-8 py-4 rounded-2xl font-black text-lg shadow-lg shadow-blue-500/30 transition disabled:opacity-50 active:scale-95 flex justify-center items-center gap-2">
             {isSubmitting ? 'Guardando...' : 'Guardar Configuración'}
          </button>
        </div>
      </form>

      <GestorCupones apiUrl={apiUrl} showAlert={showAlert} showConfirm={showConfirm} />
    </div>
  );
};

export default AdminConfiguracion;