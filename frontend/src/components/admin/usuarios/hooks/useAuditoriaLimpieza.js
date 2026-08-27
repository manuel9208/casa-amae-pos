import { useState, useCallback } from 'react';

export const useAuditoriaLimpieza = (apiUrl, showAlert) => {
    // 1. Catálogo de tareas (Ej. "Baños", "Plancha", "Pisos")
    const [areasBase, setAreasBase] = useState([]);
    
    // 2. LA NUEVA MAGIA: Plantillas por Puesto y Día
    // Estructura: { "cocina": { "Lunes": ["id_plancha", "id_piso"], "Martes": [...] } }
    const [plantillaRoles, setPlantillaRoles] = useState({});
    
    // 3. Auditorías y Fotos
    const [evaluaciones, setEvaluaciones] = useState({});
    const [evidencias, setEvidencias] = useState({});
    
    // 4. Protección estricta de las reglas de nómina (Para no borrarlas al guardar)
    const [reglasNominaRestantes, setReglasNominaRestantes] = useState({});
    
    // Estados de UI
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [hayCambios, setHayCambios] = useState(false);

    // =========================================================================
    // CARGAR DATOS DESDE LA NUBE
    // =========================================================================
    const cargarDatosLimpieza = useCallback(async () => {
        try {
            const res = await fetch(`${apiUrl}/configuracion`);
            if (res.ok) {
                const data = await res.json();
                const matriz = typeof data.matriz_limpieza === 'string'
                    ? JSON.parse(data.matriz_limpieza || '{}')
                    : (data.matriz_limpieza || {});

                setAreasBase(matriz.areasBase || []);
                // Si venimos del sistema viejo, evitamos que crashee inicializando vacío
                setPlantillaRoles(matriz.plantillaRoles || {}); 
                setEvaluaciones(matriz.evaluaciones || {});
                setEvidencias(matriz.evidencias || {});
                
                // CRÍTICO: Proteger las reglas financieras que configuramos en Nóminas
                setReglasNominaRestantes(matriz.reglas_nomina || {});
            }
        } catch (error) {
            console.error("Error al cargar configuración de limpieza:", error);
            showAlert("Error", "Fallo de conexión al cargar la auditoría.", "error");
        }
    }, [apiUrl, showAlert]);

    // =========================================================================
    // GUARDADO TRANSACCIONAL EN LA NUBE
    // =========================================================================
    const guardarCambiosNube = async () => {
        setIsSubmitting(true);
        try {
            const payload = {
                areasBase,
                plantillaRoles,
                evaluaciones,
                evidencias,
                reglas_nomina: reglasNominaRestantes // Se reinyecta intacto
            };

            const formData = new FormData();
            formData.append('matriz_limpieza', JSON.stringify(payload));

            const res = await fetch(`${apiUrl}/configuracion`, {
                method: 'PUT',
                body: formData
            });

            if (res.ok) {
                showAlert("¡Guardado!", "Plantillas de limpieza y auditorías actualizadas.", "success");
                setHayCambios(false);
            } else {
                showAlert("Error", "No se pudo guardar la configuración.", "error");
            }
        } catch (error) {
            showAlert("Error", "Problema de red al guardar en la nube.", "error");
        }
        setIsSubmitting(false);
    };

    // =========================================================================
    // GESTIÓN DEL CATÁLOGO DE TAREAS
    // =========================================================================
    const agregarArea = (nombre) => {
        if (!nombre.trim()) return;
        const nueva = { id: Date.now().toString(), nombre: nombre.trim() };
        setAreasBase([...areasBase, nueva]);
        setHayCambios(true);
    };

    const eliminarArea = (idArea) => {
        setAreasBase(areasBase.filter(a => a.id !== idArea));
        // Limpiamos esa área de todas las plantillas
        setPlantillaRoles(prev => {
            const nuevo = JSON.parse(JSON.stringify(prev));
            Object.keys(nuevo).forEach(rol => {
                Object.keys(nuevo[rol]).forEach(dia => {
                    nuevo[rol][dia] = nuevo[rol][dia].filter(id => id !== idArea);
                });
            });
            return nuevo;
        });
        setHayCambios(true);
    };

    // =========================================================================
    // LA NUEVA ASIGNACIÓN: POR PUESTO Y DÍA DE LA SEMANA
    // =========================================================================
    const toggleTareaRol = (rol, dia, idArea) => {
        setPlantillaRoles(prev => {
            const nuevo = JSON.parse(JSON.stringify(prev));
            if (!nuevo[rol]) nuevo[rol] = {};
            if (!nuevo[rol][dia]) nuevo[rol][dia] = [];

            if (nuevo[rol][dia].includes(idArea)) {
                // Si la tiene, se la quitamos
                nuevo[rol][dia] = nuevo[rol][dia].filter(id => id !== idArea);
            } else {
                // Si no la tiene, se la agregamos
                nuevo[rol][dia].push(idArea);
            }
            return nuevo;
        });
        setHayCambios(true);
    };

    // =========================================================================
    // AUDITORÍA VISUAL (APROBAR O RECHAZAR FOTO)
    // =========================================================================
    const evaluarEvidencia = (fechaStr, empleadoId, idArea, status) => {
        setEvaluaciones(prev => {
            const nuevo = JSON.parse(JSON.stringify(prev));
            if (!nuevo[idArea]) nuevo[idArea] = {};
            if (!nuevo[idArea][fechaStr]) nuevo[idArea][fechaStr] = {};

            if (status === null) {
                // Botón de reversión (Reset)
                delete nuevo[idArea][fechaStr][empleadoId];
            } else {
                // 'cumplio' o 'no_cumplio'
                nuevo[idArea][fechaStr][empleadoId] = status; 
            }
            return nuevo;
        });
        setHayCambios(true);
    };

    return {
        areasBase, 
        plantillaRoles, 
        evaluaciones, 
        evidencias,
        isSubmitting, 
        hayCambios,
        cargarDatosLimpieza, 
        guardarCambiosNube,
        agregarArea, 
        eliminarArea, 
        toggleTareaRol, 
        evaluarEvidencia
    };
};