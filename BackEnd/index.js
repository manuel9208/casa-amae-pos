require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const apiRoutes = require('./routes/api');

const app = express();

// Habilitar CORS para que el frontend pueda comunicarse sin bloqueos
app.use(cors());
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