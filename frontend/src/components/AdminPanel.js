import React, { useState, useEffect, useCallback } from 'react';
import { AlertTriangle, CheckCircle2 } from 'lucide-react';
import io from 'socket.io-client';
import TopNavAdmin from './admin/TopNavAdmin';
import AdminConfiguracion from './admin/AdminConfiguracion';
import AdminUsuarios from './admin/AdminUsuarios';
import AdminCatalogos from './admin/AdminCatalogos';
import AdminInventario from './admin/AdminInventario';
import AdminMenu from './admin/AdminMenu';
import AdminClientes from './admin/AdminClientes';
import AdminReportes from './admin/AdminReportes';
import AdminPromociones from './admin/AdminPromociones';
import AdminMesas from './admin/AdminMesas';  

const EMOJIS_POR_GIRO = {
  "☕ Cafetería & Bebidas": ["☕", "🍵", "🥤", "🧋", "🧃", "🧉", "🥛", "🍺", "🍷", "🥂", "🍹", "🍸", "🍶", "🧊"],
  "🍔 Comida Rápida": ["🍔", "🍟", "🍕", "🌭", "🥪", "🌮", "🌯", "🥙", "🍖", "🍗", "🥓"],
  "🥐 Desayunos & Pan": ["🥐", "🥯", "🍞", "🥖", "🥨", "🥞", "🧇", "🍳"],
  "🍰 Postres & Dulces": ["🍦", "🍧", "🍨", "🍩", "🍪", "🎂", "🍰", "🧁", "🥧", "🍫", "🍬", "🍮", "🍯"],
  "🍣 Asiática & Mariscos": ["🍣", "🍱", "🍚", "🍙", "🍜", "🍲", "🦐", "🍤", "🦀", "🦑", "🥡", "🥢"],
  "🥗 Saludable & Verde": ["🥗", "🥣", "🥑", "🥦", "🥬", "🥒", "🥕", "🌽", "🍅"],
  "🍽️ Restaurante General": ["🍽️", "🍴", "🥄", "🔥", "⭐", "🌶️", "🧀", "🧅", "🍄", "🥩"]
};  

const AdminPanel = ({ user, onLogout, onGoToKiosco }) => {
  const [seccion, setSeccion] = useState('menu');  

  const [productos, setProductos] = useState([]);
  const [clasificaciones, setClasificaciones] = useState([]);
  const [catalogoIngredientes, setCatalogoIngredientes] = useState([]);
  const [usuariosDB, setUsuariosDB] = useState([]);
  const [insumosDB, setInsumosDB] = useState([]);
  const [configGlobal, setConfigGlobal] = useState({});  

  const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:4000/api';
  const baseUrl = apiUrl.replace('/api', '');  

  const isGlobalAdmin = user?.usuario === 'admin';
  const canViewMenu = isGlobalAdmin || user?.permisos?.menu !== false;
  const canViewInventario = isGlobalAdmin || user?.permisos?.inventario !== false;
  const canViewCatalogos = isGlobalAdmin || user?.permisos?.catalogos !== false;
  const canViewUsuarios = isGlobalAdmin || user?.permisos?.usuarios === true;
  const canViewConfig = isGlobalAdmin || user?.permisos?.configuracion === true;
  const canViewClientes = isGlobalAdmin || user?.permisos?.clientes === true;
  const canViewReportes = isGlobalAdmin || user?.permisos?.finanzas === true;
  const canViewPromociones = isGlobalAdmin || user?.permisos?.promociones === true;
  const canViewMesas = isGlobalAdmin || user?.permisos?.mesas === true;  

  const [modalUI, setModalUI] = useState({ isOpen: false, tipo: 'info', titulo: '', mensaje: '', onConfirm: null });  

  const showAlert = useCallback((titulo, mensaje, tipo = 'info') => {
    setModalUI({ isOpen: true, tipo, titulo, mensaje, onConfirm: null });
  }, []);  

  const showConfirm = useCallback((titulo, mensaje, onConfirmCallback) => {
    setModalUI({ isOpen: true, tipo: 'confirm', titulo, mensaje, onConfirm: onConfirmCallback });
  }, []);  

  const closeModalUI = useCallback(() => {
    setModalUI(prev => ({ ...prev, isOpen: false }));
  }, []);  

  const cargarDatos = useCallback(async () => {
    const fetchSeguro = async (ruta, setter) => {
      try {
        const res = await fetch(`${apiUrl}/${ruta}`);
        if (res.ok) {
          const data = await res.json();
          setter(Array.isArray(data) ? data : []);
        }
      } catch (e) { console.error(`Error al cargar ${ruta}:`, e); }
    };  

    if (canViewMenu || canViewPromociones) fetchSeguro('productos', setProductos);
    if (canViewCatalogos || canViewMenu) fetchSeguro('clasificaciones', setClasificaciones);
    if (canViewCatalogos || canViewMenu) fetchSeguro('ingredientes', setCatalogoIngredientes);
    if (canViewInventario) fetchSeguro('insumos', setInsumosDB);
    if (canViewUsuarios) fetchSeguro('usuarios', setUsuariosDB);  

    if (canViewConfig || canViewMenu) {
      try {
        const resConf = await fetch(`${apiUrl}/configuracion`);
        if (resConf.ok) {
          const dataConf = await resConf.json();
          if (dataConf && !dataConf.error) setConfigGlobal(dataConf);
        }
      } catch (e) {}
    }
  }, [apiUrl, canViewMenu, canViewInventario, canViewCatalogos, canViewUsuarios, canViewConfig, canViewPromociones]);  

  useEffect(() => { cargarDatos(); }, [cargarDatos]);  

  useEffect(() => {
    if (!baseUrl) return;
    const socket = io(baseUrl, { transports: ['websocket', 'polling'] });
    
    const actualizarPantalla = () => {
      cargarDatos();
    };

    socket.on('nuevo_pedido', actualizarPantalla);
    socket.on('pedido_actualizado', actualizarPantalla);
    socket.on('pedido_eliminado', actualizarPantalla);
    socket.on('catalogo_actualizado', actualizarPantalla);

    return () => socket.disconnect();
  }, [baseUrl, cargarDatos]);

  useEffect(() => {
    let intervalo;
    if (seccion === 'inventario' && canViewInventario) {
      intervalo = setInterval(() => {
        fetch(`${apiUrl}/insumos`)
          .then(r => r.json())
          .then(data => setInsumosDB(Array.isArray(data) ? data : []))
          .catch(e => console.error("Error silenciado auto-refresh inventario", e));
          }, 5000);
    }
    return () => clearInterval(intervalo);
  }, [seccion, apiUrl, canViewInventario]);  

  // 👇 NUEVO: FUNCIÓN PARA FORZAR ACTUALIZACIÓN
  const lanzarActualizacionGlobal = () => {
    showConfirm(
      '¿Actualizar Dispositivos?',
      'Esto forzará a que todos los dispositivos (Cajas, Cocinas, TV) recarguen la aplicación instantáneamente para obtener la última versión de Vercel.',
      async () => {
        try {
          const res = await fetch(`${apiUrl}/configuracion/actualizar-sistema`, { method: 'POST' });
          if (res.ok) {
            showAlert('¡Enviado!', 'Orden de actualización enviada a todos los dispositivos.', 'success');
          } else {
            showAlert('Error', 'No se pudo enviar la orden de actualización.', 'error');
          }
        } catch (e) {
          showAlert('Error de Red', 'Asegúrate de estar conectado.', 'error');
        }
      }
    );
  };

  const commonProps = { apiUrl, baseUrl, refrescarDatos: cargarDatos, showAlert, showConfirm };  

  return (
    <div className="flex flex-col h-screen bg-slate-50 text-slate-800 font-sans overflow-hidden relative">
      <TopNavAdmin
        user={user}
        onLogout={onLogout}
        onGoToKiosco={onGoToKiosco}
        seccion={seccion}
        setSeccion={setSeccion}
        canViewMenu={canViewMenu}
        canViewInventario={canViewInventario}
        canViewCatalogos={canViewCatalogos}
        canViewUsuarios={canViewUsuarios}
        canViewConfig={canViewConfig}
        canViewClientes={canViewClientes}
        canViewReportes={canViewReportes}
        canViewPromociones={canViewPromociones}
        canViewMesas={canViewMesas}
      />  
      <main className="flex-1 p-4 md:p-8 overflow-y-auto">
        {seccion === 'menu' && canViewMenu && (
          <AdminMenu
            {...commonProps}
            productos={productos}
            clasificaciones={clasificaciones}
            catalogoIngredientes={catalogoIngredientes}
            EMOJIS_POR_GIRO={EMOJIS_POR_GIRO}
          />
        )}  
        {seccion === 'inventario' && canViewInventario && (
          <AdminInventario
            {...commonProps}
            insumosDB={insumosDB}
            productos={productos}
            clasificaciones={clasificaciones}
          />
        )}  
        {seccion === 'catalogos' && canViewCatalogos && (
          <AdminCatalogos
            {...commonProps}
            clasificaciones={clasificaciones}
            catalogoIngredientes={catalogoIngredientes}
            EMOJIS_POR_GIRO={EMOJIS_POR_GIRO}
          />
        )}  
        {seccion === 'configuracion' && canViewConfig && (
          <AdminConfiguracion
            {...commonProps}
            configGlobal={configGlobal}
            setConfigGlobal={setConfigGlobal}
          />
        )}  
        {seccion === 'usuarios' && canViewUsuarios && (
          <AdminUsuarios
            {...commonProps}
            usuariosDB={usuariosDB}
            user={user}
          />
        )}  
        {seccion === 'clientes' && canViewClientes && (
          <AdminClientes
            apiUrl={apiUrl}
            showAlert={showAlert}
          />
        )}  
        {seccion === 'reportes' && canViewReportes && (
          <AdminReportes
            apiUrl={apiUrl}
            showAlert={showAlert}
          />
        )}  
        {seccion === 'promociones' && canViewPromociones && (
          <AdminPromociones
            {...commonProps}
            productos={productos}
            configGlobal={configGlobal}
            setConfigGlobal={setConfigGlobal}
          />
        )}  
        {seccion === 'mesas' && canViewMesas && (
          <AdminMesas
            apiUrl={apiUrl}
          />
        )}
      </main>  

      {/* 👇 NUEVO: BOTÓN FLOTANTE PARA ADMINISTRADORES */}
      {isGlobalAdmin && (
        <button
          onClick={lanzarActualizacionGlobal}
          className="fixed bottom-6 right-6 bg-slate-900 text-white p-4 rounded-full shadow-2xl hover:scale-105 active:scale-95 transition-all z-40 flex items-center gap-2 group"
          title="Forzar actualización en todos los dispositivos"
        >
          <span className="text-xl">🚀</span>
          <span className="max-w-0 overflow-hidden whitespace-nowrap group-hover:max-w-xs transition-all duration-500 ease-in-out font-black text-sm pr-2">
            Forzar Actualización
          </span>
        </button>
      )}

      {modalUI.isOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl flex flex-col items-center text-center">
            {modalUI.tipo === 'error' && <AlertTriangle className="text-red-500 w-16 h-16 mb-4" />}
            {modalUI.tipo === 'success' && <CheckCircle2 className="text-emerald-500 w-16 h-16 mb-4" />}
            {modalUI.tipo === 'confirm' && <AlertTriangle className="text-orange-500 w-16 h-16 mb-4" />}
            {modalUI.tipo === 'info' && <AlertTriangle className="text-blue-500 w-16 h-16 mb-4" />}  
            <h3 className="text-2xl font-black text-slate-800 mb-2">{modalUI.titulo}</h3>
            <p className="text-slate-500 font-medium mb-8 whitespace-pre-line">{modalUI.mensaje}</p>  
            <div className="flex flex-col sm:flex-row gap-4 w-full">
              {modalUI.tipo === 'confirm' ? (
                <>
                  <button onClick={closeModalUI} className="flex-1 py-3 bg-slate-100 text-slate-700 font-bold rounded-xl hover:bg-slate-200 transition">Cancelar</button>
                  <button onClick={() => { modalUI.onConfirm(); closeModalUI(); }} className="flex-1 py-3 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 transition shadow-lg shadow-blue-500/30">Confirmar</button>
                </>
              ) : (
                <button onClick={closeModalUI} className="w-full py-3 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 transition shadow-lg shadow-blue-500/30">Entendido</button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};  

export default AdminPanel;