import React, { useState, useEffect } from 'react';

const Configuracion = ({
  // Props recibidas desde AdminPanel
  configGlobal, setConfigGlobal, baseUrl, apiUrl, refrescarDatos, showAlert, showConfirm
}) => {
  
  // === ESTADOS LOCALES PARA MANEJO DE ARCHIVOS (BLOBS) Y TARIFAS ===
  const [logoBlob, setLogoBlob] = useState(null);
  const [tvBlob1, setTvBlob1] = useState(null);
  const [tvBlob2, setTvBlob2] = useState(null);
  const [tvBlob3, setTvBlob3] = useState(null);
  const [tarifasEnvio, setTarifasEnvio] = useState([]);

  // Cargar las tarifas de envío desde configGlobal al iniciar
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

  // Helper para las URLs de Cloudinary
  const getImageUrl = (url) => {
    if (!url) return '';
    if (url.includes('cloudinary.com')) {
      const parts = url.split('res.cloudinary.com/');
      return `https://res.cloudinary.com/${parts[1]}`;
    }
    if (url.startsWith('http')) return url;
    return `${baseUrl}${url.startsWith('/') ? '' : '/'}${url}`;
  };

  // === LÓGICA DE GUARDADO ===
  const guardarConfiguracion = async (e) => {
    e.preventDefault();
    const formData = new FormData();
    
    // Agregamos los textos y configuraciones
    Object.keys(configGlobal).forEach(key => {
      // Excluimos las tarifas porque las manejaremos desde el estado local
      if (key !== 'tarifas_envio') {
        formData.append(key, configGlobal[key]);
      }
    });
    
    // Agregamos las tarifas de envío
    formData.append('tarifas_envio', JSON.stringify(tarifasEnvio));
    
    // Agregamos los archivos si existen
    if (logoBlob) formData.append('logo', logoBlob);
    if (tvBlob1) formData.append('tv_imagen_1', tvBlob1);
    if (tvBlob2) formData.append('tv_imagen_2', tvBlob2);
    if (tvBlob3) formData.append('tv_imagen_3', tvBlob3);

    try {
      const res = await fetch(`${apiUrl}/configuracion`, { method: 'PUT', body: formData });
      if (res.ok) { 
        showAlert("¡Éxito!", "Configuración actualizada correctamente.", "success"); 
        
        // Limpiamos los inputs de archivos
        setLogoBlob(null); setTvBlob1(null); setTvBlob2(null); setTvBlob3(null);
        ['logo-upload', 'tv1-upload', 'tv2-upload', 'tv3-upload'].forEach(id => {
          const el = document.getElementById(id);
          if (el) el.value = '';
        });
        
        refrescarDatos(); // Actualiza los datos globales en el AdminPanel
      } else {
        showAlert("Error", "No se pudo guardar la configuración.", "error");
      }
    } catch (error) { 
      showAlert("Error", "Error de conexión con el servidor.", "error"); 
    }
  };

  // === LÓGICA DE RESTABLECIMIENTO ===
  const restablecerBranding = () => {
    showConfirm("Restablecer Diseño", "¿Deseas borrar toda la configuración visual y volver a los valores de fábrica?", () => {
      setConfigGlobal({ 
        ...configGlobal, // Mantenemos datos de cuenta pero reseteamos visuales
        color_primario: '#2563eb', color_secundario: '#10b981', color_fondo: '#f1f5f9', 
        color_fondo_tarjetas: '#ffffff', color_texto_principal: '#1e293b', color_texto_secundario: '#64748b', 
        fuente_titulos: 'system-ui, sans-serif', fuente_textos: 'system-ui, sans-serif', 
        kiosco_mensaje: '¿Qué se te antoja hoy?', color_texto_kiosco: '#1e293b', 
        tv_msg_cola: 'EN COLA', tv_msg_progreso: 'PREPARANDO', tv_msg_listo: '¡LISTOS!', 
        tv_carrusel_activo: false, tv_carrusel_segundos: 10,
        mensaje_cierre: 'El negocio se encuentra cerrado temporalmente. Horario de atención: 8:00 AM - 10:00 PM.',
        ticket_impresion_activa: false,
        ticket_modo_impresion: 'pdf',
        ticket_domicilio: '',
        ticket_mensaje_final: '¡Gracias por su preferencia!',
        ticket_firma_sistema: 'Powered by MiSistemaPOS',
        mensaje_envio: 'El costo de envío se calculará según tu zona y se sumará al total de tu pedido.'
      });
      setTarifasEnvio([]);
      showAlert("Restablecido", "Diseño vuelto a valores predeterminados. Recuerda guardar cambios.", "info");
    });
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-12 animate-in fade-in">
      <h2 className="text-3xl font-black mb-6 text-slate-800">Configuración del Restaurante</h2>
      <form onSubmit={guardarConfiguracion} className="bg-white p-4 md:p-8 rounded-[40px] shadow-sm border border-slate-200 space-y-8">
        
        {/* 1. MARCA */}
        <div>
          <h3 className="text-xl font-bold mb-4 border-b pb-2 text-slate-700">1. Marca e Identidad</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
            <div>
              <label className="block text-sm font-bold text-slate-600 mb-2">Nombre del Negocio</label>
              <input required value={configGlobal.nombre_negocio || ''} onChange={e => setConfigGlobal({...configGlobal, nombre_negocio: e.target.value})} className="w-full p-3 bg-slate-50 border rounded-xl outline-none focus:ring-2 ring-blue-500 font-bold text-lg" />
            </div>
            <div className="flex flex-col items-center justify-center bg-slate-50 border border-dashed rounded-2xl p-4 border-slate-300">
              <label className="text-sm font-bold text-slate-600 block mb-2">Logo Principal</label>
              {configGlobal.logo_url && !logoBlob && (<img src={getImageUrl(configGlobal.logo_url)} alt="Logo" className="h-16 object-contain mb-3" />)}
              <input id="logo-upload" type="file" accept="image/png, image/jpeg" onChange={e => setLogoBlob(e.target.files[0])} className="w-full text-xs text-slate-500 file:rounded-xl file:border-0 file:font-bold file:bg-white file:text-slate-700 file:shadow-sm" />
            </div>
          </div>
        </div>

        {/* 2. PAGOS */}
        <div>
          <h3 className="text-xl font-bold mb-4 border-b pb-2 text-slate-700">2. Transferencias y Contacto</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div><label className="block text-sm font-bold text-slate-600 mb-1">WhatsApp Pagos</label><input required type="tel" value={configGlobal.whatsapp || ''} onChange={e => setConfigGlobal({...configGlobal, whatsapp: e.target.value.replace(/\D/g, '')})} className="w-full p-3 bg-slate-50 border rounded-xl outline-none focus:ring-2 ring-blue-500 font-bold" /></div>
            <div><label className="block text-sm font-bold text-slate-600 mb-1">Banco</label><input required value={configGlobal.banco || ''} onChange={e => setConfigGlobal({...configGlobal, banco: e.target.value})} className="w-full p-3 bg-slate-50 border rounded-xl outline-none focus:ring-2 ring-blue-500 font-bold" /></div>
            <div className="md:col-span-2"><label className="block text-sm font-bold text-slate-600 mb-1">CLABE o Cuenta</label><input required value={configGlobal.cuenta || ''} onChange={e => setConfigGlobal({...configGlobal, cuenta: e.target.value.replace(/\D/g, '')})} className="w-full p-3 bg-slate-50 border rounded-xl outline-none focus:ring-2 ring-blue-500 font-black text-blue-600 tracking-widest text-lg" /></div>
            <div className="md:col-span-2"><label className="block text-sm font-bold text-slate-600 mb-1">Titular</label><input required value={configGlobal.titular || ''} onChange={e => setConfigGlobal({...configGlobal, titular: e.target.value})} className="w-full p-3 bg-slate-50 border rounded-xl outline-none focus:ring-2 ring-blue-500 font-bold" /></div>
          </div>
        </div>

        {/* 3. BRANDING */}
        <div>
          <h3 className="text-xl font-bold mb-4 border-b pb-2 text-blue-600">🎨 3. Branding del Kiosco y TV</h3>
          <div className="space-y-6 bg-blue-50/30 p-6 rounded-3xl border border-blue-100">
            
            {/* TEXTOS */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <p className="text-xs font-black text-blue-600 uppercase tracking-widest">Contenido Kiosco</p>
                <input type="text" value={configGlobal.kiosco_mensaje || ''} onChange={e => setConfigGlobal({...configGlobal, kiosco_mensaje: e.target.value})} className="w-full p-3 bg-white border rounded-xl outline-none font-bold" placeholder="Mensaje en Kiosco..." />
                
                <p className="text-xs font-black text-blue-600 uppercase tracking-widest mt-4">Mensaje de Negocio Cerrado</p>
                <textarea 
                  value={configGlobal.mensaje_cierre || ''} 
                  onChange={e => setConfigGlobal({...configGlobal, mensaje_cierre: e.target.value})} 
                  className="w-full p-3 bg-white border rounded-xl outline-none font-medium h-24 resize-none" 
                  placeholder="Ej. Abierto de 8:00 AM a 10:00 PM..." 
                />
              </div>
              <div className="space-y-3">
                <p className="text-xs font-black text-blue-600 uppercase tracking-widest">Títulos Pantalla TV</p>
                <input type="text" value={configGlobal.tv_msg_cola || ''} onChange={e => setConfigGlobal({...configGlobal, tv_msg_cola: e.target.value})} className="w-full p-2 bg-white border rounded-lg text-sm font-bold" placeholder="Columna 1" />
                <input type="text" value={configGlobal.tv_msg_progreso || ''} onChange={e => setConfigGlobal({...configGlobal, tv_msg_progreso: e.target.value})} className="w-full p-2 bg-white border rounded-lg text-sm font-bold" placeholder="Columna 2" />
                <input type="text" value={configGlobal.tv_msg_listo || ''} onChange={e => setConfigGlobal({...configGlobal, tv_msg_listo: e.target.value})} className="w-full p-2 bg-white border rounded-lg text-sm font-bold" placeholder="Columna 3" />
              </div>
            </div>

            <div className="border-t border-blue-100 pt-4"></div>

            {/* COLORES Y FUENTES */}
            <div>
              <p className="text-xs font-black text-blue-600 uppercase tracking-widest mb-4">Colores y Tipografía (Apariencia visual)</p>
              
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">Color Primario</label>
                  <div className="flex items-center gap-2 bg-white p-2 rounded-xl border border-slate-200 shadow-sm hover:border-blue-300 transition">
                    <input type="color" value={configGlobal.color_primario || '#2563eb'} onChange={e => setConfigGlobal({...configGlobal, color_primario: e.target.value})} className="w-8 h-8 rounded cursor-pointer border-0" />
                    <span className="text-xs font-bold text-slate-500 uppercase">{configGlobal.color_primario}</span>
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">Color Fondo</label>
                  <div className="flex items-center gap-2 bg-white p-2 rounded-xl border border-slate-200 shadow-sm hover:border-blue-300 transition">
                    <input type="color" value={configGlobal.color_fondo || '#f1f5f9'} onChange={e => setConfigGlobal({...configGlobal, color_fondo: e.target.value})} className="w-8 h-8 rounded cursor-pointer border-0" />
                    <span className="text-xs font-bold text-slate-500 uppercase">{configGlobal.color_fondo}</span>
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">Texto Principal</label>
                  <div className="flex items-center gap-2 bg-white p-2 rounded-xl border border-slate-200 shadow-sm hover:border-blue-300 transition">
                    <input type="color" value={configGlobal.color_texto_principal || '#1e293b'} onChange={e => setConfigGlobal({...configGlobal, color_texto_principal: e.target.value})} className="w-8 h-8 rounded cursor-pointer border-0" />
                    <span className="text-xs font-bold text-slate-500 uppercase">{configGlobal.color_texto_principal}</span>
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">Texto Secundario</label>
                  <div className="flex items-center gap-2 bg-white p-2 rounded-xl border border-slate-200 shadow-sm hover:border-blue-300 transition">
                    <input type="color" value={configGlobal.color_texto_secundario || '#64748b'} onChange={e => setConfigGlobal({...configGlobal, color_texto_secundario: e.target.value})} className="w-8 h-8 rounded cursor-pointer border-0" />
                    <span className="text-xs font-bold text-slate-500 uppercase">{configGlobal.color_texto_secundario}</span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">Fuente para Títulos</label>
                  <select value={configGlobal.fuente_titulos || 'system-ui, sans-serif'} onChange={e => setConfigGlobal({...configGlobal, fuente_titulos: e.target.value})} className="w-full p-3 bg-white border border-slate-200 rounded-xl outline-none font-bold text-sm text-slate-700 shadow-sm hover:border-blue-300 transition">
                    <option value="system-ui, sans-serif">Predeterminada (System)</option>
                    <option value="'Arial', sans-serif">Arial</option>
                    <option value="'Verdana', sans-serif">Verdana</option>
                    <option value="'Tahoma', sans-serif">Tahoma</option>
                    <option value="'Trebuchet MS', sans-serif">Trebuchet MS</option>
                    <option value="'Georgia', serif">Georgia</option>
                    <option value="'Times New Roman', serif">Times New Roman</option>
                    <option value="'Courier New', monospace">Courier New</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">Fuente para Textos</label>
                  <select value={configGlobal.fuente_textos || 'system-ui, sans-serif'} onChange={e => setConfigGlobal({...configGlobal, fuente_textos: e.target.value})} className="w-full p-3 bg-white border border-slate-200 rounded-xl outline-none font-bold text-sm text-slate-700 shadow-sm hover:border-blue-300 transition">
                    <option value="system-ui, sans-serif">Predeterminada (System)</option>
                    <option value="'Arial', sans-serif">Arial</option>
                    <option value="'Verdana', sans-serif">Verdana</option>
                    <option value="'Tahoma', sans-serif">Tahoma</option>
                    <option value="'Trebuchet MS', sans-serif">Trebuchet MS</option>
                    <option value="'Georgia', serif">Georgia</option>
                    <option value="'Times New Roman', serif">Times New Roman</option>
                    <option value="'Courier New', monospace">Courier New</option>
                  </select>
                </div>
              </div>
            </div>
            
          </div>
        </div>

        {/* 4. PUBLICIDAD TV */}
        <div className="bg-emerald-50/30 p-6 rounded-3xl border border-emerald-100 space-y-6">
          <h3 className="text-xl font-bold text-emerald-800 flex items-center gap-2">📺 4. Publicidad en Pantalla TV</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <label className="flex items-center gap-3 font-bold text-slate-700 cursor-pointer bg-white p-4 rounded-2xl border border-emerald-200">
              <input type="checkbox" checked={configGlobal.tv_carrusel_activo === true || configGlobal.tv_carrusel_activo === 'true'} onChange={e => setConfigGlobal({...configGlobal, tv_carrusel_activo: e.target.checked})} className="w-6 h-6 accent-emerald-500" /> 
              Activar Carrusel de Imágenes
            </label>
            <div>
              <label className="block text-xs font-black text-emerald-600 uppercase mb-1">Segundos por Imagen</label>
              <input type="number" min="3" value={configGlobal.tv_carrusel_segundos || 10} onChange={e => setConfigGlobal({...configGlobal, tv_carrusel_segundos: e.target.value})} className="w-full p-4 bg-white border border-emerald-200 rounded-2xl outline-none font-bold" />
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t border-emerald-100">
            <div className="bg-white p-4 rounded-2xl border border-emerald-100 flex flex-col items-center text-center">
              <span className="text-xs font-black text-emerald-700 mb-2 uppercase">Imagen Promocional 1</span>
              {configGlobal.tv_imagen_1 && <img src={getImageUrl(configGlobal.tv_imagen_1)} className="h-12 object-contain mb-2" alt="promo1" />}
              <input id="tv1-upload" type="file" accept="image/*" onChange={e => setTvBlob1(e.target.files[0])} className="w-full text-[10px] text-slate-500 file:rounded-md file:border-0 file:bg-emerald-50 file:text-emerald-700" />
            </div>
            <div className="bg-white p-4 rounded-2xl border border-emerald-100 flex flex-col items-center text-center">
              <span className="text-xs font-black text-emerald-700 mb-2 uppercase">Imagen Promocional 2</span>
              {configGlobal.tv_imagen_2 && <img src={getImageUrl(configGlobal.tv_imagen_2)} className="h-12 object-contain mb-2" alt="promo2" />}
              <input id="tv2-upload" type="file" accept="image/*" onChange={e => setTvBlob2(e.target.files[0])} className="w-full text-[10px] text-slate-500 file:rounded-md file:border-0 file:bg-emerald-50 file:text-emerald-700" />
            </div>
            <div className="bg-white p-4 rounded-2xl border border-emerald-100 flex flex-col items-center text-center">
              <span className="text-xs font-black text-emerald-700 mb-2 uppercase">Imagen Promocional 3</span>
              {configGlobal.tv_imagen_3 && <img src={getImageUrl(configGlobal.tv_imagen_3)} className="h-12 object-contain mb-2" alt="promo3" />}
              <input id="tv3-upload" type="file" accept="image/*" onChange={e => setTvBlob3(e.target.files[0])} className="w-full text-[10px] text-slate-500 file:rounded-md file:border-0 file:bg-emerald-50 file:text-emerald-700" />
            </div>
          </div>
        </div>

        {/* 5. CONFIGURACIÓN DE TICKET */}
        <div className="bg-orange-50/30 p-6 rounded-3xl border border-orange-100 space-y-6">
          <h3 className="text-xl font-bold text-orange-800 flex items-center gap-2">🧾 5. Configuración de Ticket</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <label className="flex items-center gap-3 font-bold text-slate-700 cursor-pointer bg-white p-4 rounded-2xl border border-orange-200">
              <input type="checkbox" checked={configGlobal.ticket_impresion_activa === true || configGlobal.ticket_impresion_activa === 'true'} onChange={e => setConfigGlobal({...configGlobal, ticket_impresion_activa: e.target.checked})} className="w-6 h-6 accent-orange-500" /> 
              Activar Impresión de Tickets
            </label>

            {configGlobal.ticket_impresion_activa && (
              <div>
                <label className="block text-xs font-black text-orange-600 uppercase mb-1">Modo de Impresión</label>
                <select value={configGlobal.ticket_modo_impresion || 'pdf'} onChange={e => setConfigGlobal({...configGlobal, ticket_modo_impresion: e.target.value})} className="w-full p-4 bg-white border border-orange-200 rounded-2xl outline-none font-bold text-slate-700">
                  <option value="pdf">Guardar como PDF (Pruebas/Manual)</option>
                  <option value="impresora">Impresora Térmica Directa</option>
                </select>
              </div>
            )}
          </div>

          {configGlobal.ticket_impresion_activa && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-orange-100">
              <div>
                <label className="block text-xs font-black text-orange-600 uppercase mb-1">Domicilio del Local</label>
                <textarea value={configGlobal.ticket_domicilio || ''} onChange={e => setConfigGlobal({...configGlobal, ticket_domicilio: e.target.value})} className="w-full p-3 bg-white border border-orange-200 rounded-xl outline-none font-medium resize-none h-32" placeholder="Ej. Av. Principal #123, Col. Centro" />
              </div>
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-black text-orange-600 uppercase mb-1">Mensaje de Despedida</label>
                  <input type="text" value={configGlobal.ticket_mensaje_final || ''} onChange={e => setConfigGlobal({...configGlobal, ticket_mensaje_final: e.target.value})} className="w-full p-3 bg-white border border-orange-200 rounded-xl outline-none font-medium" placeholder="Ej. ¡Gracias por su compra!" />
                </div>
                <div>
                  <label className="block text-xs font-black text-orange-600 uppercase mb-1">Firma del Sistema (Opcional)</label>
                  <input type="text" value={configGlobal.ticket_firma_sistema !== undefined ? configGlobal.ticket_firma_sistema : 'Powered by MiSistemaPOS'} onChange={e => setConfigGlobal({...configGlobal, ticket_firma_sistema: e.target.value})} className="w-full p-3 bg-white border border-orange-200 rounded-xl outline-none font-medium text-slate-500" placeholder="Ej. Desarrollado por..." />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* 👇 6. NUEVA CONFIGURACIÓN DE ENVÍOS A DOMICILIO */}
        <div className="bg-purple-50/30 p-6 rounded-3xl border border-purple-100 space-y-6">
          <h3 className="text-xl font-bold text-purple-800 flex items-center gap-2">🛵 6. Costos de Envío a Domicilio</h3>
          
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-black text-purple-600 uppercase mb-1">Aviso para el Cliente (Kiosco)</label>
              <textarea 
                value={configGlobal.mensaje_envio !== undefined ? configGlobal.mensaje_envio : 'El costo de envío se calculará según tu zona y se sumará al total de tu pedido.'} 
                onChange={e => setConfigGlobal({...configGlobal, mensaje_envio: e.target.value})} 
                className="w-full p-3 bg-white border border-purple-200 rounded-xl outline-none font-medium resize-none h-20 text-slate-700" 
                placeholder="Ej. El costo de envío varía entre $10 y $25..." 
              />
            </div>

            <div className="pt-4 border-t border-purple-100">
              <label className="block text-xs font-black text-purple-600 uppercase mb-3">Zonas y Tarifas de Envío</label>
              
              <div className="space-y-3 mb-4">
                {tarifasEnvio.length === 0 && <p className="text-sm font-bold text-slate-400">No hay zonas configuradas. El envío a domicilio no tendrá costo extra.</p>}
                
                {tarifasEnvio.map((tarifa, index) => (
                  <div key={index} className="flex flex-col md:flex-row gap-2 items-center bg-white p-3 rounded-xl border border-purple-100">
                    <input 
                      type="text" 
                      placeholder="Nombre de Zona (Ej. Mismo Fraccionamiento)" 
                      value={tarifa.zona} 
                      onChange={(e) => {
                        const nuevas = [...tarifasEnvio];
                        nuevas[index].zona = e.target.value;
                        setTarifasEnvio(nuevas);
                      }} 
                      className="flex-1 w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none font-bold text-slate-700" 
                    />
                    
                    <div className="relative w-full md:w-32 shrink-0">
                      <span className="absolute left-3 top-3 text-slate-400 font-bold">$</span>
                      <input 
                        type="number" 
                        min="0"
                        placeholder="Costo" 
                        value={tarifa.costo} 
                        onChange={(e) => {
                          const nuevas = [...tarifasEnvio];
                          nuevas[index].costo = Number(e.target.value);
                          setTarifasEnvio(nuevas);
                        }} 
                        className="w-full p-3 pl-8 bg-slate-50 border border-slate-200 rounded-xl outline-none font-bold text-slate-700" 
                      />
                    </div>
                    
                    <button 
                      type="button" 
                      onClick={() => setTarifasEnvio(tarifasEnvio.filter((_, i) => i !== index))} 
                      className="w-full md:w-auto p-3 bg-red-50 text-red-500 rounded-xl hover:bg-red-100 font-bold transition flex justify-center shrink-0"
                    >
                      Eliminar
                    </button>
                  </div>
                ))}
              </div>

              <button 
                type="button" 
                onClick={() => setTarifasEnvio([...tarifasEnvio, { zona: '', costo: 0 }])} 
                className="bg-purple-100 text-purple-700 font-bold px-4 py-3 rounded-xl text-sm hover:bg-purple-200 transition flex items-center gap-2"
              >
                ➕ Agregar Nueva Zona
              </button>
            </div>
          </div>
        </div>

        <div className="flex flex-col md:flex-row items-center justify-between pt-6 border-t border-slate-100 gap-4">
          <button type="button" onClick={restablecerBranding} className="w-full md:w-auto px-6 py-4 rounded-2xl font-bold text-slate-500 hover:bg-slate-100 border border-slate-200 transition">↺ Restablecer Diseño</button>
          <button type="submit" className="w-full md:w-auto bg-blue-600 hover:bg-blue-700 text-white px-8 py-4 rounded-2xl font-black text-lg shadow-lg shadow-blue-500/30 transition">Guardar Configuración</button>
        </div>
      </form>
    </div>
  );
};

export default Configuracion;