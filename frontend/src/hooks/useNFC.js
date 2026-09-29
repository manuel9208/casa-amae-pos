import { useState, useEffect, useCallback } from 'react';

export const useNFC = () => {
    const [isListening, setIsListening] = useState(false);
    const [nfcData, setNfcData] = useState(null);

    const startNFC = useCallback(async () => {
        setNfcData(null);
        setIsListening(true);

        // 1. INTENTO DE WEB NFC API (Tablets Android con Chrome)
        if ('NDEFReader' in window) {
            try {
                const ndef = new window.NDEFReader();
                await ndef.scan();
                
                ndef.onreading = event => {
                    const serialNumber = event.serialNumber;
                    if (serialNumber) {
                        setNfcData(serialNumber.replace(/:/g, '').toUpperCase());
                        setIsListening(false);
                    }
                };
            } catch (error) {
                console.log("Web NFC no disponible o denegado, cayendo a modo USB.");
            }
        }
    }, []);

    const stopNFC = useCallback(() => {
        setIsListening(false);
    }, []);

    // 2. MODO LECTOR USB (Teclado Fantasma)
    useEffect(() => {
        if (!isListening) return;

        let buffer = '';
        let timer = null;

        const handleKeyDown = (e) => {
            // Ignorar teclas de control
            if (e.key === 'Shift' || e.key === 'Control' || e.key === 'Alt') return;

            // El lector USB siempre manda un "Enter" al final de la lectura
            if (e.key === 'Enter') {
                if (buffer.length > 4) {
                    setNfcData(buffer.toUpperCase());
                    setIsListening(false);
                }
                buffer = '';
                return;
            }

            buffer += e.key;

            // Si pasa mucho tiempo entre teclas, no es el lector USB (es un humano tecleando)
            clearTimeout(timer);
            timer = setTimeout(() => {
                buffer = '';
            }, 100); 
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => {
            window.removeEventListener('keydown', handleKeyDown);
            clearTimeout(timer);
        };
    }, [isListening]);

    return { isListening, nfcData, startNFC, stopNFC };
};