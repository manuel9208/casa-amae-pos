import React, { useState, useEffect, useCallback } from 'react';
import FormularioCombo from './FormularioCombo';
import ListaCombos from './ListaCombos';

const GestorCombos = ({ productos, clasificaciones, promociones, apiUrl, showAlert, showConfirm }) => {
    const [combos, setCombos] = useState([]);
    const [comboAEditar, setComboAEditar] = useState(null); // 👈 NUEVO: Estado de edición

    const cargarCombos = useCallback(async () => {
        try {
            const res = await fetch(`${apiUrl}/combos`);
            if (res.ok) {
                const data = await res.json();
                setCombos(Array.isArray(data) ? data : []);
            }
        } catch (error) {
            console.error("Error cargando combos:", error);
        }
    }, [apiUrl]);

    useEffect(() => {
        cargarCombos();
    }, [cargarCombos]);

    return (
        <div className="animate-in fade-in slide-in-from-bottom-4">
            <FormularioCombo 
                productos={productos} 
                clasificaciones={clasificaciones} 
                promociones={promociones}
                apiUrl={apiUrl} 
                showAlert={showAlert} 
                refrescarCombos={cargarCombos} 
                comboAEditar={comboAEditar} // 👈 INYECTADO
                setComboAEditar={setComboAEditar} // 👈 INYECTADO
            />
            
            <ListaCombos 
                combos={combos} 
                productos={productos} // 👈 INYECTADO PARA LEER LOS NOMBRES
                apiUrl={apiUrl} 
                showAlert={showAlert} 
                showConfirm={showConfirm} 
                refrescarCombos={cargarCombos} 
                setComboAEditar={setComboAEditar} // 👈 INYECTADO
            />
        </div>
    );
};

export default GestorCombos;