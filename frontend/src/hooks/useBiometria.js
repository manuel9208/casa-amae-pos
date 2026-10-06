import { startRegistration, startAuthentication } from '@simplewebauthn/browser';

export const useBiometria = (apiUrl, showAlert) => {
    
    // 1. FUNCIÓN PARA DAR DE ALTA UNA HUELLA NUEVA (Enrolar)
    const registrarHuella = async (usuario_id = null, cliente_id = null) => {
        try {
            const resOpt = await fetch(`${apiUrl}/huellas/generar-registro`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ usuario_id, cliente_id })
            });
            const options = await resOpt.json();
            
            if (options.error) {
                showAlert('Error', options.error, 'error');
                return false;
            }

            let credencial;
            try {
                // Sintaxis actualizada para @simplewebauthn/browser v10
                credencial = await startRegistration({ optionsJSON: options });
            } catch (err) {
                if (err.name === 'NotAllowedError') {
                    showAlert('Cancelado', 'El registro fue cancelado por el usuario.', 'info');
                    return false;
                }
                throw err;
            }

            const resVer = await fetch(`${apiUrl}/huellas/verificar-registro`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    usuario_id,
                    cliente_id,
                    credencial,
                    dispositivo_nombre: navigator.userAgent
                })
            });
            
            const verification = await resVer.json();
            if (verification.success) {
                showAlert('¡Éxito!', 'Huella digital vinculada correctamente.', 'success');
                return true;
            } else {
                showAlert('Error', verification.error || 'No se pudo verificar la huella.', 'error');
                return false;
            }
        } catch (error) {
            console.error(error);
            showAlert('Dispositivo No Compatible', 'Tu navegador o equipo no soporta biometría avanzada.', 'error');
            return false;
        }
    };

  // 👇 FIX: Captura la ubicación del dispositivo de forma "best effort" (sin bloquear).
  // Si el usuario niega el permiso o el GPS tarda, el login CONTINÚA igual — esto solo
  // alimenta al backend para que pueda validar la geocerca/IP del auto-checado de
  // asistencia por Login, sin nunca impedir que el empleado inicie sesión.
  const obtenerUbicacionSilenciosa = () => {
    return new Promise((resolve) => {
      if (!navigator.geolocation) return resolve({ lat: null, lon: null });
      navigator.geolocation.getCurrentPosition(
        (pos) => resolve({ lat: pos.coords.latitude, lon: pos.coords.longitude }),
        () => resolve({ lat: null, lon: null }),
        { enableHighAccuracy: true, timeout: 4000 }
      );
    });
  };

    // 2. FUNCIÓN PARA HACER LOGIN (Autenticar)
    const iniciarSesionConHuella = async () => {
        try {
        // A. Pedimos el reto criptográfico genérico para login
        const resOpt = await fetch(`${apiUrl}/huellas/generar-login`, { method: 'POST' });
        const options = await resOpt.json();

        if (options.error) {
            showAlert('Error', options.error, 'error');
            return null;
        }

        // B. El navegador prende el lector de huellas
        let credencial;
        try {
            // Sintaxis actualizada para @simplewebauthn/browser v10
            credencial = await startAuthentication({ optionsJSON: options });
        } catch (err) {
            if (err.name === 'NotAllowedError') return null; // El usuario canceló o quitó el dedo
            throw err;
        }

        // C. Enviamos la huella leída al backend para que nos diga quién es
        const dispositivo_id = localStorage.getItem('pos_device_id');
        // 👇 FIX: Capturamos lat/lon (best effort) para el auto-checado de asistencia
        const { lat, lon } = await obtenerUbicacionSilenciosa();

        const resVer = await fetch(`${apiUrl}/huellas/verificar-login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ credencial, dispositivo_id, lat, lon })
        });

        const data = await resVer.json();

        if (data.success) {
            // 👇 FIX: Si el backend no pudo registrar la asistencia por ubicación,
            // avisamos suavemente sin bloquear el login (que ya fue exitoso).
            if (data.aviso_asistencia) {
            showAlert('Aviso de Asistencia', data.aviso_asistencia, 'info');
            }
            return data; // Devuelve los datos del empleado y su sesión
        } else {
            showAlert('Huella no reconocida', data.error || 'No estás registrado en esta tablet.', 'error');
            return null;
        }
        } catch (error) {
        console.error("Error al leer huella:", error);
        showAlert('Lector Ocupado', 'Intenta de nuevo.', 'error');
        return null;
        }
    };

    // Exportamos ambas funciones para usarlas en cualquier parte del sistema
    return { registrarHuella, iniciarSesionConHuella };
};