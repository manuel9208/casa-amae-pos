require('dotenv').config();

// 👇 SOLUCIÓN ZONA HORARIA NODE.JS: Obligamos al servidor a usar tu hora local
process.env.TZ = 'America/Mazatlan';

const express = require('express');
const cors = require('cors');
const path = require('path');
const webpush = require('web-push'); // 👈 NUEVO: Importar web-push
const apiRoutes = require('./routes/api');

const app = express();

// 👇 NUEVO: Configuración de llaves VAPID para notificaciones Push
if (process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
  webpush.setVapidDetails(
    process.env.VAPID_EMAIL || 'mailto:soporte@tudominio.com',
    process.env.VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY
  );
} else {
  console.warn("⚠️ Faltan las llaves VAPID en el archivo .env. Las notificaciones Push no funcionarán.");
}

// --- CONFIGURACIÓN DE CORS MEJORADA ---
// Esto permite que cualquier dispositivo (PC, Celular, Tablet) se conecte
app.use(cors({
  origin: '*', 
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());

// Tus rutas de API
app.use('/api', apiRoutes);

// Para que las imágenes se puedan ver en internet
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// El puerto ahora es dinámico para la nube (Render) o 4000 en local
const PORT = process.env.PORT || 4000;

app.listen(PORT, () => {
  console.log(`🚀 Servidor corriendo en puerto ${PORT}`);
});