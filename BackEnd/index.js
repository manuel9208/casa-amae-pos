require('dotenv').config();

// 👇 SOLUCIÓN ZONA HORARIA NODE.JS: Obligamos al servidor a usar tu hora local
process.env.TZ = 'America/Mazatlan';

const express = require('express');
const cors = require('cors');
const path = require('path');
const webpush = require('web-push'); // Importar web-push para notificaciones
const http = require('http'); // 🆕 Requerido para envolver express y acoplar sockets
const { Server } = require('socket.io'); // 🆕 Motor WebSockets de alto rendimiento
const apiRoutes = require('./routes/api');

const app = express();
const server = http.createServer(app); // 🆕 Envoltura HTTP nativa sobre express

// 🆕 Configuración e inicialización blindada de Socket.io
const io = new Server(server, {
  cors: {
    origin: '*', // Permite conexiones descentralizadas de marcas blancas
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization']
  }
});

// ⚡ GATEWAY Y SALAS DE COMUNICACIÓN EN TIEMPO REAL
io.on('connection', (socket) => {
  console.log(`📡 Dispositivo POS en línea (Socket ID): ${socket.id}`);

  // Canal operativo general (Caja, Cocina, TV)
  socket.on('join_canal', (canal) => {
    socket.join(canal);
    console.log(`👤 Dispositivo unido al canal operativo: ${canal}`);
  });

  // Canal privado de tracking para repartidores
  socket.on('reparto:registrar_repartidor', (repartidorId) => {
    socket.join(`repartidor_${repartidorId}`);
    console.log(`Driver #${repartidorId} suscrito al feed de operaciones.`);
  });

  自由.on('disconnect', () => {
    console.log(`❌ Conexión finalizada con el dispositivo: ${socket.id}`);
  });
});

// 🌟 TRUCO ARQUITECTÓNICO: Exponemos 'io' globalmente dentro del contexto de Express
app.set('io', io);

// --- CONFIGURACIÓN DE CORS GENERAL ---
app.use(cors({
  origin: '*', 
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());

// Configuración de llaves VAPID para notificaciones Push
if (process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
  webpush.setVapidDetails(
    process.env.VAPID_EMAIL || 'mailto:soporte@tudominio.com',
    process.env.VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY
  );
} else {
  console.warn("⚠️ Faltan las llaves VAPID en el archivo .env. Las notificaciones Push no funcionarán.");
}

// Tus rutas de API
app.use('/api', apiRoutes);

// Para que las imágenes se puedan ver en internet
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

const PORT = process.env.PORT || 4000;

// 🌟 CORRECCIÓN CRÍTICA: Arrancamos con server.listen en lugar de app.listen para levantar Sockets e HTTP juntos
server.listen(PORT, () => {
  console.log(`🚀 Servidor e hilos de Socket.io corriendo en puerto ${PORT}`);
});