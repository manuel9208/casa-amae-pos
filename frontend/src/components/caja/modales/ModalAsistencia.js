import React, { useState, useEffect } from 'react';
import { Delete, X, Clock, Fingerprint } from 'lucide-react';  
// 👇 FIX: Ruta corregida (Sube 3 niveles: modales -> caja -> components -> src/hooks)
import { useBiometria } from '../../../hooks/useBiometria';

const ModalAsistencia = ({ modalAsistencia, setModalAsistencia, apiUrl, setAlertaCaja, onSuccess }) => {
  const [pinInput, setPinInput] = useState('');
  const [errorAnim, setErrorAnim] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);  

  // 👇 ESTADO NUEVO: Leer la configuración de asistencia
  const [metodoAsistencia, setMetodoAsistencia] = useState('ambos'); 

  // 👇 HOOK DE BIOMETRÍA CON ALERTAS CUSTOMIZADAS
  const customShowAlert = (titulo, mensaje, tipo) => {
      setAlertaCaja({ titulo, mensaje, tipo: tipo === 'error' ? 'error' : 'success' });
      // Se quita sola a los 5 segundos pero no bloquea el modal
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
  // FUNCIÓN 2: ASISTENCIA TRADICIONAL POR PIN (TU ORIGINAL)
  // =========================================================
  useEffect(() => {
    const procesarChecada = async () => {
      // Evita múltiples envíos mientras ya está procesando
      if (pinInput.length === 4 && !isSubmitting) {
        setIsSubmitting(true);
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
            setPinInput(''); // Limpiamos preventivamente
            setIsSubmitting(false);
            setModalAsistencia(null); // Cerramos el modal
            if (onSuccess) onSuccess();
          } else {
            // PIN Incorrecto o no ha checado entrada
            setAlertaCaja({ titulo: 'ATENCIÓN', mensaje: data.error, tipo: 'error' });
            setTimeout(() => setAlertaCaja(null), 4000);
            setErrorAnim(true);
            // Liberar el isSubmitting hasta que el PIN se haya borrado
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
  }, [pinInput, isSubmitting, modalAsistencia, apiUrl, setAlertaCaja, setModalAsistencia, onSuccess]);  

  if (!modalAsistencia) return null;  

  const handleKeypad = (num) => {
    if (pinInput.length < 4 && !isSubmitting) setPinInput(prev => prev + num);
  };  

  const handleDelete = () => {
    if (!isSubmitting) setPinInput(prev => prev.slice(0, -1));
  };  

  const esEntrada = modalAsistencia === 'Entrada';  

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[999] flex flex-col items-center justify-center animate-in fade-in duration-200 p-4">  
      <div className="bg-white p-8 md:p-10 rounded-[40px] shadow-2xl w-full max-w-sm relative flex flex-col items-center border border-slate-100">  
        
        <button onClick={() => setModalAsistencia(null)} disabled={isSubmitting} className="absolute top-6 right-6 text-slate-400 hover:text-slate-700 bg-slate-100 p-2 rounded-full transition disabled:opacity-50">
          <X size={20}/>
        </button>  

        <div className="text-center mb-6 mt-2">
          <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 ${esEntrada ? 'bg-emerald-100 text-emerald-600' : 'bg-rose-100 text-rose-600'}`}>
            <Clock size={32} />
          </div>
          <h2 className="text-2xl font-black text-slate-800 tracking-tight">
            Checar {modalAsistencia}
          </h2>
          {metodoAsistencia !== 'biometria' && (
             <p className="text-slate-500 font-medium text-sm mt-1">Ingresa tu PIN de 4 dígitos</p>
          )}
        </div>  

        {/* 👇 BOTÓN INTELIGENTE DE HUELLA DIGITAL */}
        {(metodoAsistencia === 'ambos' || metodoAsistencia === 'biometria') && (
            <div className="w-full flex flex-col items-center mb-6 animate-in zoom-in duration-300">
              <button 
                disabled={isSubmitting}
                onClick={handleAsistenciaHuella}
                className={`w-full py-4 rounded-2xl font-black flex items-center justify-center gap-3 shadow-lg transition-all active:scale-95 disabled:opacity-50 ${esEntrada ? 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-500/30 text-white' : 'bg-rose-600 hover:bg-rose-700 shadow-rose-500/30 text-white'}`}
              >
                <Fingerprint size={24} /> 
                {isSubmitting ? 'Escaneando...' : 'Escanear Huella'}
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
                    disabled={isSubmitting}
                    onClick={() => handleKeypad(num.toString())}
                    className="bg-slate-50 hover:bg-slate-100 text-slate-700 text-3xl font-black py-4 rounded-2xl border border-slate-200 active:scale-95 transition-all disabled:opacity-50"
                    >
                    {num}
                    </button>
                ))}
                
                <div className="pointer-events-none"></div>  
                
                <button
                    disabled={isSubmitting}
                    onClick={() => handleKeypad('0')}
                    className="bg-slate-50 hover:bg-slate-100 text-slate-700 text-3xl font-black py-4 rounded-2xl border border-slate-200 active:scale-95 transition-all disabled:opacity-50"
                >
                    0
                </button>  
                
                <button
                    disabled={isSubmitting}
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