import React, { useState, useEffect, useCallback } from 'react';
import { Gift, AlertCircle, Zap, Ticket, Star, Package } from 'lucide-react';
import FormularioPromocion from './promociones/FormularioPromocion';
import ListaPromociones from './promociones/ListaPromociones';
import GestorCupones from './promociones/GestorCupones';
import ProgramaLealtad from './promociones/ProgramaLealtad';
import GestorCombos from './promociones/GestorCombos'; 

const AdminPromociones = ({ apiUrl, baseUrl, showAlert, showConfirm, productos, configGlobal, setConfigGlobal }) => {
    const [promociones, setPromociones] = useState([]);
    const [clasificaciones, setClasificaciones] = useState([]);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [promoAEditar, setPromoAEditar] = useState(null);
    
    const [pestañaActiva, setPestañaActiva] = useState('promociones'); 

    const cargarDatos = useCallback(async () => {
        try {
            const [resPromo, resClasif] = await Promise.all([
                fetch(`${apiUrl}/promociones`),
                fetch(`${apiUrl}/clasificaciones`)
            ]);
            if (resPromo.ok) {
                const data = await resPromo.json();
                setPromociones(Array.isArray(data) ? data : []);
            }
            if (resClasif.ok) {
                const dataC = await resClasif.json();
                setClasificaciones(Array.isArray(dataC) ? dataC : []);
            }
        } catch (error) {
            console.error("Error al cargar datos de marketing:", error);
        }
    }, [apiUrl]);

    useEffect(() => {
        cargarDatos();
    }, [cargarDatos]);

    return (
        <div className="max-w-[1400px] mx-auto space-y-8 animate-in fade-in pb-12 px-4">
            <div className="flex items-center gap-3 mb-6">
                <div className="bg-orange-100 text-orange-600 p-3 rounded-2xl shadow-sm"><Gift size={28}/></div>
                <div>
                    <h2 className="text-3xl font-black text-slate-800">Marketing, Combos y Promociones</h2>
                    <p className="text-slate-500 font-medium">Configura reglas automáticas, combos y fidelización para aumentar tu ticket promedio.</p>
                </div>
            </div>

            {(!productos || productos.length === 0) && (
                <div className="bg-red-50 border-l-4 border-red-500 p-6 rounded-2xl flex items-center gap-4 shadow-sm">
                    <AlertCircle className="text-red-500" size={32} />
                    <div>
                        <h3 className="font-black text-red-800 text-lg">No hay productos en tu menú</h3>
                        <p className="text-red-600 font-medium text-sm">Necesitas registrar platillos en la sección de "Gestión Menú" antes de poder crear combos o promociones.</p>
                    </div>
                </div>
            )}

            <div className="flex flex-wrap bg-slate-200 p-1.5 rounded-2xl w-fit gap-1 shadow-inner">
                <button 
                    onClick={() => setPestañaActiva('promociones')}
                    className={`flex items-center gap-2 px-6 py-3 rounded-xl font-black text-sm transition-all ${pestañaActiva === 'promociones' ? 'bg-white shadow-sm text-orange-600' : 'text-slate-500 hover:text-slate-700'}`}
                >
                    <Zap size={18}/> Reglas Automáticas
                </button>
                <button 
                    onClick={() => setPestañaActiva('combos')}
                    className={`flex items-center gap-2 px-6 py-3 rounded-xl font-black text-sm transition-all ${pestañaActiva === 'combos' ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-500 hover:text-slate-700'}`}
                >
                    <Package size={18}/> Constructor Combos
                </button>
                <button 
                    onClick={() => setPestañaActiva('cupones')}
                    className={`flex items-center gap-2 px-6 py-3 rounded-xl font-black text-sm transition-all ${pestañaActiva === 'cupones' ? 'bg-white shadow-sm text-rose-600' : 'text-slate-500 hover:text-slate-700'}`}
                >
                    <Ticket size={18}/> Cupones
                </button>
                <button 
                    onClick={() => setPestañaActiva('lealtad')}
                    className={`flex items-center gap-2 px-6 py-3 rounded-xl font-black text-sm transition-all ${pestañaActiva === 'lealtad' ? 'bg-white shadow-sm text-yellow-600' : 'text-slate-500 hover:text-slate-700'}`}
                >
                    <Star size={18}/> Puntos y Lealtad
                </button>
            </div>

            <div className="mt-8">
                {pestañaActiva === 'promociones' && (
                    <div className="space-y-8">
                        <FormularioPromocion
                            productos={productos}
                            clasificaciones={clasificaciones}
                            apiUrl={apiUrl}
                            showAlert={showAlert}
                            refrescarDatos={cargarDatos}
                            isSubmitting={isSubmitting}
                            setIsSubmitting={setIsSubmitting}
                            promoAEditar={promoAEditar}
                            setPromoAEditar={setPromoAEditar}
                        />
                        <ListaPromociones
                            promociones={promociones}
                            productos={productos}
                            apiUrl={apiUrl}
                            showAlert={showAlert}
                            showConfirm={showConfirm}
                            refrescarDatos={cargarDatos}
                            isSubmitting={isSubmitting}
                            setPromoAEditar={setPromoAEditar}
                        />
                    </div>
                )}

                {pestañaActiva === 'combos' && (
                    <GestorCombos 
                        productos={productos}
                        clasificaciones={clasificaciones}
                        promociones={promociones} // 👈 INYECCIÓN PARA FILTRAR
                        apiUrl={apiUrl}
                        showAlert={showAlert}
                        showConfirm={showConfirm}
                    />
                )}

                {pestañaActiva === 'cupones' && (
                    <GestorCupones
                        apiUrl={apiUrl}
                        showAlert={showAlert}
                        showConfirm={showConfirm}
                    />
                )}

                {pestañaActiva === 'lealtad' && (
                    <ProgramaLealtad
                        configGlobal={configGlobal}
                        setConfigGlobal={setConfigGlobal}
                        apiUrl={apiUrl}
                        showAlert={showAlert}
                    />
                )}
            </div>
        </div>
    );
};

export default AdminPromociones;