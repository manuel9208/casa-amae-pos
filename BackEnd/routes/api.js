const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');

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

// Configuración de Multer para subida de imágenes
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/');
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + path.extname(file.originalname));
  }
});
const upload = multer({ storage: storage });

// RUTAS DE CONFIGURACIÓN Y MARCA BLANCA
router.get('/configuracion', configCtrl.obtenerConfiguracion);
router.put('/configuracion', upload.single('logo'), configCtrl.actualizarConfiguracion);

// AUTENTICACIÓN Y CLIENTES
router.post('/identificar', authCtrl.identificar);
router.post('/login', authCtrl.login);
router.post('/logout', authCtrl.logout);
router.post('/clientes/registro', clienteCtrl.registrar);
router.post('/clientes/verificar-nip', clienteCtrl.verificarNip);

// USUARIOS (EMPLEADOS)
router.get('/usuarios', usuarioCtrl.obtenerUsuarios);
router.post('/usuarios', usuarioCtrl.crearUsuario);
router.delete('/usuarios/:id', usuarioCtrl.eliminarUsuario);

// CATÁLOGOS (Clasificaciones e Ingredientes/Extras)
router.get('/clasificaciones', clasificacionCtrl.obtenerClasificaciones);
router.post('/clasificaciones', upload.single('imagen'), clasificacionCtrl.crearClasificacion);
router.put('/clasificaciones/:id', upload.single('imagen'), clasificacionCtrl.actualizarClasificacion);
router.delete('/clasificaciones/:id', clasificacionCtrl.eliminarClasificacion);

router.get('/ingredientes', ingredienteCtrl.obtenerIngredientes);
router.post('/ingredientes', ingredienteCtrl.crearIngrediente);
router.put('/ingredientes/:id', ingredienteCtrl.actualizarIngrediente);
router.delete('/ingredientes/:id', ingredienteCtrl.eliminarIngrediente);

// MENÚ (PRODUCTOS)
router.get('/productos', productoCtrl.obtenerProductos);
router.post('/productos', upload.single('imagen'), productoCtrl.crearProducto);
router.put('/productos/:id', upload.single('imagen'), productoCtrl.actualizarProducto);
router.delete('/productos/:id', productoCtrl.eliminarProducto);
router.put('/productos/:id/rendimiento', productoCtrl.actualizarRendimiento);

// PEDIDOS Y FLUJO
router.get('/pedidos/hoy', pedidoCtrl.obtenerPedidosHoy);
router.post('/pedidos', pedidoCtrl.crearPedido);
router.put('/pedidos/:id', pedidoCtrl.actualizarPedido); 
router.put('/pedidos/:id/estado', pedidoCtrl.actualizarEstado);
router.put('/pedidos/:id/alerta', pedidoCtrl.actualizarAlerta);
router.get('/clientes/:cliente_id/pedidos', pedidoCtrl.obtenerPedidosCliente);

// INSUMOS Y RECETAS (Inventario)
router.get('/insumos', insumoCtrl.obtenerInsumos);
router.post('/insumos', insumoCtrl.crearInsumo);
router.put('/insumos/:id', insumoCtrl.actualizarInsumo); 
router.put('/insumos/:id/comprar', insumoCtrl.comprarInsumo);
router.put('/insumos/:id/reiniciar', insumoCtrl.reiniciarStock); // NUEVA RUTA PARA MERMAS (REINICIAR A 0)
router.delete('/insumos/:id', insumoCtrl.eliminarInsumo);

router.get('/recetas/:producto_id', recetaCtrl.obtenerReceta);
router.post('/recetas', recetaCtrl.agregarInsumoReceta);
router.delete('/recetas/:id', recetaCtrl.eliminarInsumoReceta);

module.exports = router;