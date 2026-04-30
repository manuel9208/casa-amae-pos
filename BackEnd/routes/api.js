const express = require('express');
const router = express.Router();
const multer = require('multer');
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const cloudinary = require('cloudinary').v2;

// Controladores
const configCtrl = require('../controllers/configController');
const authCtrl = require('../controllers/authController');
const clienteCtrl = require('../controllers/clienteController');
const usuarioCtrl = require('../controllers/usuarioController');
const productoCtrl = require('../controllers/productoController');
const pedidoCtrl = require('../controllers/pedidoController');
const clasificacionCtrl = require('../controllers/clasificacionController');
const ingredienteCtrl = require('../controllers/ingredienteController');
const insumoCtrl = require('../controllers/insumoController');
const recetaCtrl = require('../controllers/recetaController');
const reporteCtrl = require('../controllers/reporteController'); // 👇 NUEVO: Controlador de reportes

// ==========================================
// CONFIGURACIÓN DE CLOUDINARY (MODIFICADA PARA VIDEOS)
// ==========================================
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'pos_uploads', 
    resource_type: 'auto', // Esto le dice a Cloudinary que acepte imágenes Y videos
    allowedFormats: ['jpeg', 'png', 'jpg', 'webp', 'mp4', 'webm', 'mov'] // Añadimos formatos de video
  }
});
const upload = multer({ storage: storage });

// ==========================================
// RUTAS DE CONFIGURACIÓN Y MARCA BLANCA
// ==========================================
router.get('/configuracion', configCtrl.obtenerConfiguracion);
router.put('/configuracion', upload.any(), configCtrl.actualizarConfiguracion);

// ==========================================
// AUTENTICACIÓN Y CLIENTES
// ==========================================
router.post('/identificar', authCtrl.identificar);
router.post('/login', authCtrl.login);
router.post('/logout', authCtrl.logout);
router.post('/clientes/registro', clienteCtrl.registrar);
router.post('/clientes/verificar-nip', clienteCtrl.verificarNip);
router.get('/clientes', clienteCtrl.obtenerClientes);
router.put('/clientes/:id', clienteCtrl.actualizarCliente);
router.get('/clientes/reportes', clienteCtrl.obtenerReportes);

// ==========================================
// USUARIOS (EMPLEADOS)
// ==========================================
router.get('/usuarios', usuarioCtrl.obtenerUsuarios);
router.get('/usuarios/rendimiento', usuarioCtrl.obtenerReporteRendimiento); 
router.post('/usuarios', usuarioCtrl.crearUsuario);
router.delete('/usuarios/:id', usuarioCtrl.eliminarUsuario);
router.put('/usuarios/:id', usuarioCtrl.actualizarUsuario);

// ==========================================
// CATÁLOGOS (Clasificaciones e Ingredientes/Extras)
// ==========================================
router.get('/clasificaciones', clasificacionCtrl.obtenerClasificaciones);
router.post('/clasificaciones', upload.single('imagen'), clasificacionCtrl.crearClasificacion);
router.put('/clasificaciones/:id', upload.single('imagen'), clasificacionCtrl.actualizarClasificacion);
router.delete('/clasificaciones/:id', clasificacionCtrl.eliminarClasificacion);

router.get('/ingredientes', ingredienteCtrl.obtenerIngredientes);
router.post('/ingredientes', ingredienteCtrl.crearIngrediente);
router.put('/ingredientes/:id', ingredienteCtrl.actualizarIngrediente);
router.delete('/ingredientes/:id', ingredienteCtrl.eliminarIngrediente);

// ==========================================
// MENÚ (PRODUCTOS)
// ==========================================
router.get('/productos', productoCtrl.obtenerProductos);
router.post('/productos', upload.single('imagen'), productoCtrl.crearProducto);
router.put('/productos/:id', upload.single('imagen'), productoCtrl.actualizarProducto);
router.delete('/productos/:id', productoCtrl.eliminarProducto);
router.put('/productos/:id/rendimiento', productoCtrl.actualizarRendimiento);

// ==========================================
// PEDIDOS Y FLUJO
// ==========================================
router.get('/pedidos/hoy', pedidoCtrl.obtenerPedidosHoy);
router.post('/pedidos', pedidoCtrl.crearPedido);
router.put('/pedidos/:id', pedidoCtrl.actualizarPedido); 
router.put('/pedidos/:id/estado', pedidoCtrl.actualizarEstado);
router.put('/pedidos/:id/alerta', pedidoCtrl.actualizarAlerta);
router.get('/clientes/:cliente_id/pedidos', pedidoCtrl.obtenerPedidosCliente);

// ==========================================
// INSUMOS Y RECETAS (Inventario)
// ==========================================
router.get('/insumos', insumoCtrl.obtenerInsumos);
router.post('/insumos', insumoCtrl.crearInsumo);
router.put('/insumos/:id', insumoCtrl.actualizarInsumo); 
router.put('/insumos/:id/comprar', insumoCtrl.comprarInsumo);
router.put('/insumos/:id/reiniciar', insumoCtrl.reiniciarStock);
router.delete('/insumos/:id', insumoCtrl.eliminarInsumo);

router.get('/recetas/:producto_id', recetaCtrl.obtenerReceta);
router.post('/recetas', recetaCtrl.agregarInsumoReceta);
router.delete('/recetas/:id', recetaCtrl.eliminarInsumoReceta);

// ==========================================
// REPORTES Y ESTADÍSTICAS (NUEVO)
// ==========================================
router.get('/reportes/ventas', reporteCtrl.obtenerReporteVentas);

module.exports = router;