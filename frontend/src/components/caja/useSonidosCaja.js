import { useRef, useEffect, useCallback } from 'react';

// =========================================================================
// 🔔 Sonidos de Caja generados con Web Audio (sin archivos mp3).
// 'pedido'  -> pedido nuevo en "Por Confirmar" (dos notas ascendentes, repetidas)
// 'mensaje' -> mensaje nuevo de WhatsApp (pop corto)
// El navegador exige un gesto del usuario antes de reproducir audio: el hook
// "desbloquea" el contexto en el primer toque o tecla.
// =========================================================================
export const useSonidosCaja = () => {
  const ctxRef = useRef(null);

  const obtenerCtx = useCallback(() => {
    if (!ctxRef.current) {
      const Ctx = window.AudioContext || window.webkitAudioContext;
      ctxRef.current = Ctx ? new Ctx() : null;
    }
    return ctxRef.current;
  }, []);

  useEffect(() => {
    const desbloquear = () => {
      const ctx = obtenerCtx();
      if (ctx && ctx.state === 'suspended') ctx.resume().catch(() => {});
    };
    window.addEventListener('pointerdown', desbloquear);
    window.addEventListener('keydown', desbloquear);
    return () => {
      window.removeEventListener('pointerdown', desbloquear);
      window.removeEventListener('keydown', desbloquear);
    };
  }, [obtenerCtx]);

  const tono = (ctx, frecuencia, inicio, duracion, volumen = 0.22, tipo = 'sine') => {
    const osc = ctx.createOscillator();
    const ganancia = ctx.createGain();
    const t0 = ctx.currentTime + inicio;
    osc.type = tipo;
    osc.frequency.setValueAtTime(frecuencia, t0);
    ganancia.gain.setValueAtTime(0.0001, t0);
    ganancia.gain.exponentialRampToValueAtTime(volumen, t0 + 0.02);
    ganancia.gain.exponentialRampToValueAtTime(0.0001, t0 + duracion);
    osc.connect(ganancia);
    ganancia.connect(ctx.destination);
    osc.start(t0);
    osc.stop(t0 + duracion + 0.05);
  };

  const sonar = useCallback((tipo) => {
    try {
      const ctx = obtenerCtx();
      if (!ctx) return;
      if (ctx.state === 'suspended') ctx.resume().catch(() => {});
      if (tipo === 'pedido') {
        tono(ctx, 880, 0, 0.25);
        tono(ctx, 1175, 0.28, 0.35);
        tono(ctx, 880, 0.9, 0.25);
        tono(ctx, 1175, 1.18, 0.35);
      } else if (tipo === 'mensaje') {
        tono(ctx, 660, 0, 0.12, 0.18, 'triangle');
        tono(ctx, 990, 0.14, 0.18, 0.18, 'triangle');
      }
    } catch (e) { /* el sonido nunca debe romper la pantalla */ }
  }, [obtenerCtx]);

  return { sonar };
};