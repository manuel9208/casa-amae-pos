import React, { useState, useEffect } from 'react';
import { Delete, X, Clock, Fingerprint, MapPin } from 'lucide-react';  
import { useBiometria } from '../../hooks/useBiometria';
// 👇 FIX: Ruta calculada para la carpeta Cocina (Sube 1 nivel -> admin -> asistencia)
import { useValidadorAsistencia } from '../admin/asistencia/useValidadorAsistencia';

const ModalAsistencia = ({ modalAsistencia, setModalAsistencia, apiUrl, setAlertaCaja, onSuccess }) => {
  const [pinInput, setPinInput] = useState('');
  const [errorAnim, setErrorAnim] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);  

  // Leer la configuración de asistencia
  const [metodoAsistencia, setMetodoAsistencia] = useState('ambos'); 

  // 👇 INICIALIZAMOS EL VALIDADOR
  const { validarAcceso, validandoGPS } = useValidadorAsistencia(apiUrl);

  // HOOK DE BIOMETRÍA CON ALERTAS CUSTOMIZADAS
  const customShowAlert = (titulo, mensaje, tipo) => {
      setAlertaCaja({ titulo, mensaje, tipo: tipo === 'error' ? 'error' : 'success' });
  };
  const { iniciarSesionConHuella } = useBiometria(apiUrl, customShowAlert);

  // Cargar la configuración de biometría al abrir el modal
  useEffect(() => {
    if (modalAsistencia) {
      fetch(`${apiUrl}/biometria/configuracion`)
        .then(r => r.json())
        .then(data => setMetodoAsistencia(data.metodo_asistencia || 'ambos'))
        .catch(() => setMetodoAsistencia('ambos'));
    }
  }, [modalAsistencia, apiUrl]);

  // Limpiar el PIN si se cierra el modal manualmente
  useEffect(() => {
    if (!modalAsistencia) {
      setPinInput('');
      setErrorAnim(false);
      setIsSubmitting(false);
    }
  }, [modalAsistencia]);  

  // =========================================================
  // FUNCIÓN 1: ASISTENCIA POR HUELLA DIGITAL
  // =========================================================
  const handleAsistenciaHuella = async () => {
    setIsSubmitting(true);

    // 🛡️ REGLA 1: Validar IP y GPS antes de leer la huella
    const validacion = await validarAcceso();
    if (!validacion.success) {
        setAlertaCaja({ titulo: 'ACCESO DENEGADO', mensaje: validacion.error, tipo: 'error' });
        setTimeout(() => setAlertaCaja(null), 6000);
        setIsSubmitting(false);
        return; 
    }

    const data = await iniciarSesionConHuella();
    
    if (data && data.success && data.tipo === 'empleado') {
      const userPin = data.usuario.pin;
      
      if (!userPin) {
        setAlertaCaja({ titulo: 'ATENCIÓN', mensaje: 'No tienes un PIN asignado para registrar asistencia.', tipo: 'error' });
        setTimeout(() => setAlertaCaja(null), 4000);
        setIsSubmitting(false);
        return;
      }

      // Enviamos su PIN invisiblemente al reloj checador original
      try {
        const res = await fetch(`${apiUrl}/usuarios/asistencia`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ pin: userPin, tipo: modalAsistencia })
        });
        const resultado = await res.json();

        if (res.ok) {
          setAlertaCaja({ titulo: 'RELOJ CHECADOR', mensaje: resultado.mensaje, tipo: 'success' });
          setTimeout(() => setAlertaCaja(null), 4000);
          setModalAsistencia(null);
          // Avisamos a la pantalla principal
          if (onSuccess) onSuccess(); 
        } else {
          setAlertaCaja({ titulo: 'ATENCIÓN', mensaje: resultado.error, tipo: 'error' });
          setTimeout(() => setAlertaCaja(null), 4000);
        }
      } catch (error) {
        setAlertaCaja({ titulo: 'ERROR', mensaje: 'Error de red.', tipo: 'error' });
        setTimeout(() => setAlertaCaja(null), 4000);
      }
    }
    setIsSubmitting(false);
  };

  // =========================================================
  // FUNCIÓN 2: ASISTENCIA TRADICIONAL POR PIN
  // =========================================================
  useEffect(() => {
    const procesarChecada = async () => {
      // Evita múltiples envíos y espera a que el GPS termine de calcular
      if (pinInput.length === 4 && !isSubmitting && !validandoGPS) {
        setIsSubmitting(true);

        // 🛡️ REGLA 1: Validar IP y GPS (El cerebro actúa primero)
        const validacion = await validarAcceso();
        if (!validacion.success) {
            setAlertaCaja({ titulo: 'ACCESO DENEGADO', mensaje: validacion.error, tipo: 'error' });
            setTimeout(() => setAlertaCaja(null), 6000);
            setErrorAnim(true);
            setTimeout(() => { setErrorAnim(false); setPinInput(''); setIsSubmitting(false); }, 600);
            return;
        }

        try {
          const res = await fetch(`${apiUrl}/usuarios/asistencia`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ pin: pinInput, tipo: modalAsistencia })
          });  
          
          const data = await res.json();  
          
          if (res.ok) {
            setAlertaCaja({ titulo: 'RELOJ CHECADOR', mensaje: data.mensaje, tipo: 'success' });
            setTimeout(() => setAlertaCaja(null), 4000);
            setPinInput(''); 
            setIsSubmitting(false);
            setModalAsistencia(null); 
            // Avisamos a la pantalla principal
            if (onSuccess) onSuccess();
          } else {
            setAlertaCaja({ titulo: 'ATENCIÓN', mensaje: data.error, tipo: 'error' });
            setTimeout(() => setAlertaCaja(null), 4000);
            setErrorAnim(true);
            setTimeout(() => { 
              setErrorAnim(false); 
              setPinInput(''); 
              setIsSubmitting(false); 
            }, 600);
          }
        } catch (error) {
          setAlertaCaja({ titulo: 'ERROR', mensaje: 'No hay conexión con el servidor.', tipo: 'error' });
          setTimeout(() => setAlertaCaja(null), 4000);
          setErrorAnim(true);
          setTimeout(() => { 
            setErrorAnim(false); 
            setPinInput(''); 
            setIsSubmitting(false); 
          }, 600);
        }
      }
    };  

    procesarChecada();
  }, [pinInput, isSubmitting, validandoGPS, modalAsistencia, apiUrl, setAlertaCaja, setModalAsistencia, onSuccess, validarAcceso]);  

  if (!modalAsistencia) return null;  

  // Variable maestra para desactivar la interacción mientras trabaja la red o el GPS
  const bloqueado = isSubmitting || validandoGPS;

  const handleKeypad = (num) => {
    if (pinInput.length < 4 && !bloqueado) setPinInput(prev => prev + num);
  };  

  const handleDelete = () => {
    if (!bloqueado) setPinInput(prev => prev.slice(0, -1));
  };  

  const esEntrada = modalAsistencia === 'Entrada';  

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[999] flex flex-col items-center justify-center p-4 animate-in fade-in duration-200">  
      <div className="bg-white p-8 md:p-10 rounded-[40px] shadow-2xl w-full max-w-sm relative flex flex-col items-center border border-slate-100">  
        
        <button onClick={() => setModalAsistencia(null)} disabled={bloqueado} className="absolute top-6 right-6 text-slate-400 hover:text-slate-700 bg-slate-100 p-2 rounded-full transition disabled:opacity-50">
          <X size={20}/>
        </button>  

        <div className="text-center mb-6 mt-2">
          <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 ${esEntrada ? 'bg-emerald-100 text-emerald-600' : 'bg-rose-100 text-rose-600'}`}>
            {validandoGPS ? <MapPin size={32} className="animate-bounce" /> : <Clock size={32} />}
          </div>
          <h2 className="text-2xl font-black text-slate-800 tracking-tight">
            {validandoGPS ? 'Ubicando...' : `Checar ${modalAsistencia}`}
          </h2>
          {metodoAsistencia !== 'biometria' && (
             <p className="text-slate-500 font-medium text-sm mt-1">Ingresa tu PIN de 4 dígitos</p>
          )}
        </div>  

        {/* 👇 BOTÓN INTELIGENTE DE HUELLA DIGITAL */}
        {(metodoAsistencia === 'ambos' || metodoAsistencia === 'biometria') && (
            <div className="w-full flex flex-col items-center mb-6 animate-in zoom-in duration-300">
              <button 
                disabled={bloqueado}
                onClick={handleAsistenciaHuella}
                className={`w-full py-4 rounded-2xl font-black flex items-center justify-center gap-3 shadow-lg transition-all active:scale-95 disabled:opacity-50 ${esEntrada ? 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-500/30 text-white' : 'bg-rose-600 hover:bg-rose-700 shadow-rose-500/30 text-white'}`}
              >
                <Fingerprint size={24} /> 
                {validandoGPS ? 'Verificando GPS/IP...' : isSubmitting ? 'Escaneando...' : 'Escanear Huella'}
              </button>
            </div>
        )}

        {/* SEPARADOR VISUAL SI TIENE AMBOS */}
        {metodoAsistencia === 'ambos' && (
            <div className="w-full flex items-center gap-4 mb-6 opacity-60">
                <div className="h-px bg-slate-300 flex-1"></div>
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">O usa tu PIN</span>
                <div className="h-px bg-slate-300 flex-1"></div>
            </div>
        )}

        {/* 👇 TECLADO CLÁSICO Y CÍRCULOS DEL PIN */}
        {(metodoAsistencia === 'ambos' || metodoAsistencia === 'botones') && (
            <div className="w-full flex flex-col items-center animate-in slide-in-from-bottom-4">
                <div className={`flex gap-3 mb-8 ${errorAnim ? 'animate-bounce text-red-500' : ''}`}>
                {[0, 1, 2, 3].map(index => (
                    <div
                    key={index}
                    className={`w-4 h-4 rounded-full transition-all duration-200 ${
                        pinInput.length > index
                        ? (esEntrada ? 'bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)] scale-110' : 'bg-rose-500 shadow-[0_0_10px_rgba(244,63,94,0.5)] scale-110')
                        : 'bg-slate-200'
                    }`}
                    />
                ))}
                </div>  

                {/* Teclado Numérico */}
                <div className="grid grid-cols-3 gap-3 w-full">
                {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(num => (
                    <button
                    key={num}
                    disabled={bloqueado}
                    onClick={() => handleKeypad(num.toString())}
                    className="bg-slate-50 hover:bg-slate-100 text-slate-700 text-3xl font-black py-4 rounded-2xl border border-slate-200 active:scale-95 transition-all disabled:opacity-50"
                    >
                    {num}
                    </button>
                ))}
                
                <div className="pointer-events-none"></div>  
                
                <button
                    disabled={bloqueado}
                    onClick={() => handleKeypad('0')}
                    className="bg-slate-50 hover:bg-slate-100 text-slate-700 text-3xl font-black py-4 rounded-2xl border border-slate-200 active:scale-95 transition-all disabled:opacity-50"
                >
                    0
                </button>  
                
                <button
                    disabled={bloqueado}
                    onClick={handleDelete}
                    className="bg-slate-50 hover:bg-red-50 text-slate-400 hover:text-red-500 flex items-center justify-center py-4 rounded-2xl border border-slate-200 active:scale-95 transition-all disabled:opacity-50"
                >
                    <Delete size={28} />
                </button>
                </div>
            </div>
        )}
      </div>
    </div>
  );
};  

export default ModalAsistencia;