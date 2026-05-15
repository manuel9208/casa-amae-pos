import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import reportWebVitals from './reportWebVitals';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

// 👇 MODO OFFLINE (FASE 1): Registrar el Service Worker
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .then(registration => {
        console.log('✅ Modo Offline (Service Worker) activado exitosamente:', registration.scope);
      })
      .catch(error => {
        console.log('❌ Falló la activación del Modo Offline:', error);
      });
  });
}

reportWebVitals();