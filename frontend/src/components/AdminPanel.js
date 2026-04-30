import React, { useState, useEffect, useCallback } from 'react';
import { ShoppingCart, AlertTriangle, CheckCircle2, Menu } from 'lucide-react';
import Sidebar from './admin/Sidebar';
import Configuracion from './admin/Configuracion';
import GestionUsuarios from './admin/GestionUsuarios';
import Catalogos from './admin/Catalogos';
import Inventario from './admin/Inventario';
import GestionMenu from './admin/GestionMenu';
import GestionClientes from './admin/GestionClientes';
import ReporteVentas from './admin/ReporteVentas'; // 👇 NUEVO: Importamos el reporte

// Centralizamos datos estáticos para no re-crearlos en cada render
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
  const [menuAbierto, setMenuAbierto] = useState(false);
  
  // === 1. DATOS CENTRALES ===
  const [productos, setProductos] = useState([]);
  const [clasificaciones, setClasificaciones] = useState([]);
  const [catalogoIngredientes, setCatalogoIngredientes] = useState([]);
  const [usuariosDB, setUsuariosDB] = useState([]);
  const [insumosDB, setInsumosDB] = useState([]);
  const [configGlobal, setConfigGlobal] = useState({});

  const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:4000/api';
  const baseUrl = apiUrl.replace('/api', '');
  
  // === 2. PERMISOS (Calculados centralmente) ===
  const isGlobalAdmin = user?.usuario === 'admin';
  const canViewMenu = isGlobalAdmin || user?.permisos?.menu !== false;
  const canViewInventario = isGlobalAdmin || user?.permisos?.inventario !== false;
  const canViewCatalogos = isGlobalAdmin || user?.permisos?.catalogos !== false;
  const canViewUsuarios = isGlobalAdmin || user?.permisos?.usuarios === true;
  const canViewConfig = isGlobalAdmin || user?.permisos?.configuracion === true;
  const canViewClientes = isGlobalAdmin || user?.permisos?.usuarios === true || user?.permisos?.ventas === true;
  // 👇 Asumimos que si puede ver inventario o es admin, puede ver finanzas
  const canViewReportes = isGlobalAdmin || user?.permisos?.inventario === true; 
  
  // === 3. MODAL GLOBAL REUTILIZABLE ===
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

  // === 4. CARGA DE DATOS CENTRALIZADA ===
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

    if (canViewMenu) fetchSeguro('productos', setProductos);
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
  }, [apiUrl, canViewMenu, canViewInventario, canViewCatalogos, canViewUsuarios, canViewConfig]);

  useEffect(() => { cargarDatos(); }, [cargarDatos]);

  // Auto-refresh silencioso solo para inventario
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

  // Props comunes inyectadas a todos los hijos
  const commonProps = { apiUrl, baseUrl, refrescarDatos: cargarDatos, showAlert, showConfirm };

  return (
    <div className="flex h-screen bg-slate-50 text-slate-800 font-sans overflow-hidden">
      
      <Sidebar 
        user={user} onLogout={onLogout} onGoToKiosco={onGoToKiosco} seccion={seccion} setSeccion={setSeccion}
        menuAbierto={menuAbierto} setMenuAbierto={setMenuAbierto} canViewMenu={canViewMenu}
        canViewInventario={canViewInventario} canViewCatalogos={canViewCatalogos} canViewUsuarios={canViewUsuarios} canViewConfig={canViewConfig}
        canViewClientes={canViewClientes} canViewReportes={canViewReportes}
      />

      <div className="flex-1 flex flex-col h-screen overflow-hidden">
        {/* Encabezado Móvil */}
        <div className="lg:hidden flex items-center justify-between bg-slate-900 text-white p-4 shadow-md z-30">
          <div className="flex items-center gap-2"><ShoppingCart size={20} className="text-blue-500" /><h1 className="text-lg font-black tracking-tighter">POS ADMIN</h1></div>
          <button onClick={() => setMenuAbierto(true)} className="p-2 bg-slate-800 rounded-lg hover:bg-slate-700 transition"><Menu size={24} /></button>
        </div>

        <div className="flex-1 p-4 md:p-8 overflow-y-auto">
        
          {seccion === 'menu' && canViewMenu && (
            <GestionMenu 
              {...commonProps}
              productos={productos} clasificaciones={clasificaciones} catalogoIngredientes={catalogoIngredientes} EMOJIS_POR_GIRO={EMOJIS_POR_GIRO}
            />
          )}
          
          {seccion === 'inventario' && canViewInventario && ( 
            <Inventario 
              {...commonProps}
              insumosDB={insumosDB} productos={productos} clasificaciones={clasificaciones}
            />
          )}
          
          {seccion === 'catalogos' && canViewCatalogos && ( 
            <Catalogos 
              {...commonProps}
              clasificaciones={clasificaciones} catalogoIngredientes={catalogoIngredientes} EMOJIS_POR_GIRO={EMOJIS_POR_GIRO}
            />
          )}
          
          {seccion === 'configuracion' && canViewConfig && ( 
            <Configuracion 
              {...commonProps}
              configGlobal={configGlobal} setConfigGlobal={setConfigGlobal}
            />
          )}
          
          {seccion === 'usuarios' && canViewUsuarios && ( 
            <GestionUsuarios 
              {...commonProps}
              usuariosDB={usuariosDB}
            />
          )}

          {seccion === 'clientes' && canViewClientes && ( 
            <GestionClientes 
              apiUrl={apiUrl} 
              showAlert={showAlert} 
            />
          )}

          {/* 👇 NUEVO: Componente de Reportes Financieros */}
          {seccion === 'reportes' && canViewReportes && ( 
            <ReporteVentas 
              apiUrl={apiUrl} 
              showAlert={showAlert} 
            />
          )}

        </div>
      </div>

      {/* === MODAL GLOBAL REUTILIZABLE === */}
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
                  <button onClick={() => { modalUI.onConfirm(); closeModalUI(); }} className="flex-1 py-3 bg-red-500 text-white font-bold rounded-xl hover:bg-red-600 transition shadow-lg shadow-red-500/30">Confirmar</button>
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