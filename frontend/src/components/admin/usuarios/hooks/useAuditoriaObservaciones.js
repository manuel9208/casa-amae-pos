import { useState, useCallback } from 'react';

export const useAuditoriaObservaciones = (apiUrl, showAlert) => {
    // 1. Catálogo de reglas (Ej. "Llevar uniforme completo", "Apagar luces")
    const [observacionesBase, setObservacionesBase] = useState([]);

    // 2. LA NUEVA MAGIA: Plantillas por Puesto y Día
    const [plantillaRoles, setPlantillaRoles] = useState({});

    // 3. Auditorías (El checklist de SÍ o NO)
    const [evaluaciones, setEvaluaciones] = useState({});

    // 4. Protección estricta de las reglas de nómina
    const [reglasNominaRestantes, setReglasNominaRestantes] = useState({});

    // Estados de UI
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [hayCambios, setHayCambios] = useState(false);

    // =========================================================================
    // CARGAR DATOS DESDE LA NUBE
    // =========================================================================
    const cargarDatos = useCallback(async () => {
        try {
            const res = await fetch(`${apiUrl}/configuracion`);
            if (res.ok) {
                const data = await res.json();
                const matriz = typeof data.matriz_observaciones === 'string'
                    ? JSON.parse(data.matriz_observaciones || '{}')
                    : (data.matriz_observaciones || {});

                setObservacionesBase(matriz.observacionesBase || []);
                setPlantillaRoles(matriz.plantillaRoles || {});
                setEvaluaciones(matriz.evaluaciones || {});

                // CRÍTICO: Proteger las reglas financieras globales
                setReglasNominaRestantes(matriz.reglas_nomina || {});
            }
        } catch (error) {
            console.error("Error al cargar configuración de observaciones:", error);
            showAlert("Error", "Fallo de conexión al cargar las reglas de conducta.", "error");
        }
    }, [apiUrl, showAlert]);

    // =========================================================================
    // GUARDADO TRANSACCIONAL EN LA NUBE
    // =========================================================================
    const guardarCambiosNube = async () => {
        setIsSubmitting(true);
        try {
            const payload = {
                observacionesBase,
                plantillaRoles,
                evaluaciones,
                reglas_nomina: reglasNominaRestantes // Se reinyecta intacto
            };

            const formData = new FormData();
            formData.append('matriz_observaciones', JSON.stringify(payload));

            const res = await fetch(`${apiUrl}/configuracion`, {
                method: 'PUT',
                body: formData
            });

            if (res.ok) {
                showAlert("¡Guardado!", "Plantillas de conducta y auditorías actualizadas.", "success");
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
    // GESTIÓN DEL CATÁLOGO DE REGLAS
    // =========================================================================
    const agregarObservacion = (nombre) => {
        if (!nombre.trim() || observacionesBase.includes(nombre.trim())) return;
        setObservacionesBase([...observacionesBase, nombre.trim()]);
        setHayCambios(true);
    };

    const eliminarObservacion = (nombre) => {
        setObservacionesBase(observacionesBase.filter(o => o !== nombre));
        // Limpiamos esa regla de todas las plantillas
        setPlantillaRoles(prev => {
            const nuevo = JSON.parse(JSON.stringify(prev));
            Object.keys(nuevo).forEach(rol => {
                Object.keys(nuevo[rol]).forEach(dia => {
                    nuevo[rol][dia] = nuevo[rol][dia].filter(obs => obs !== nombre);
                });
            });
            return nuevo;
        });
        setHayCambios(true);
    };

    // =========================================================================
    // ASIGNACIÓN INDIVIDUAL Y MASIVA (POR PUESTO Y DÍA)
    // =========================================================================
    const toggleObservacionRol = (rol, dia, obsNombre) => {
        setPlantillaRoles(prev => {
            const nuevo = JSON.parse(JSON.stringify(prev));
            if (!nuevo[rol]) nuevo[rol] = {};
            if (!nuevo[rol][dia]) nuevo[rol][dia] = [];

            if (nuevo[rol][dia].includes(obsNombre)) {
                // Si la tiene, se la quitamos
                nuevo[rol][dia] = nuevo[rol][dia].filter(o => o !== obsNombre);
            } else {
                // Si no la tiene, se la agregamos
                nuevo[rol][dia].push(obsNombre);
            }
            return nuevo;
        });
        setHayCambios(true);
    };

    // 👇 NUEVA MAGIA: Marcar o desmarcar toda la semana con un clic
    const toggleTodasObservacionesRol = (rol, dias, todasLasReglas) => {
        if (!todasLasReglas || todasLasReglas.length === 0) return;

        setPlantillaRoles(prev => {
            const nuevo = JSON.parse(JSON.stringify(prev));
            if (!nuevo[rol]) nuevo[rol] = {};

            // Analizamos si TODAS las reglas ya están marcadas en TODOS los días
            let todasSeleccionadas = true;
            for (const dia of dias) {
                const asignadas = nuevo[rol][dia] || [];
                if (asignadas.length !== todasLasReglas.length) {
                    todasSeleccionadas = false;
                    break;
                }
            }

            // Alternamos el estado
            dias.forEach(dia => {
                if (todasSeleccionadas) {
                    nuevo[rol][dia] = []; // Desmarcar todo
                } else {
                    nuevo[rol][dia] = [...todasLasReglas]; // Marcar todo
                }
            });

            return nuevo;
        });
        setHayCambios(true);
    };

    // =========================================================================
    // AUDITORÍA VISUAL (APROBAR O RECHAZAR CONDUCTA)
    // =========================================================================
    const evaluarObservacion = (fechaStr, empleadoId, obsNombre, status) => {
        setEvaluaciones(prev => {
            const nuevo = JSON.parse(JSON.stringify(prev));
            if (!nuevo[obsNombre]) nuevo[obsNombre] = {};
            if (!nuevo[obsNombre][fechaStr]) nuevo[obsNombre][fechaStr] = {};

            if (status === null) {
                // Botón de reversión (Reset)
                delete nuevo[obsNombre][fechaStr][empleadoId];
            } else {
                // 'cumplio' o 'no_cumplio'
                nuevo[obsNombre][fechaStr][empleadoId] = status;
            }
            return nuevo;
        });
        setHayCambios(true);
    };

    return {
        observacionesBase,
        plantillaRoles,
        evaluaciones,
        isSubmitting,
        hayCambios,
        cargarDatos,
        guardarCambiosNube,
        agregarObservacion,
        eliminarObservacion,
        toggleObservacionRol,
        toggleTodasObservacionesRol, // Exportamos la nueva función
        evaluarObservacion
    };
};