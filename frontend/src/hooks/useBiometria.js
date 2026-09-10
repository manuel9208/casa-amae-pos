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

    // 👇 2. NUEVA FUNCIÓN: PARA HACER LOGIN (Autenticar)
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
            const resVer = await fetch(`${apiUrl}/huellas/verificar-login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ credencial, dispositivo_id })
            });

            const data = await resVer.json();
            
            if (data.success) {
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