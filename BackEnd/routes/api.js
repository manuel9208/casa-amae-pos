const express = require('express');
const router = express.Router();
const multer = require('multer');
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const cloudinary = require('cloudinary').v2;
const db = require('../config/db'); // Necesario para el Cron Job  

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
const reporteCtrl = require('../controllers/reporteController');
const promocionCtrl = require('../controllers/promocionController');
const mesaCtrl = require('../controllers/mesaController');
const notificacionCtrl = require('../controllers/notificacionController');
const repartidorCtrl = require('../controllers/repartidorController');
const corteCtrl = require('../controllers/corteController');
const mensajeCtrl = require('../controllers/mensajeController');
const biometricoCtrl = require('../controllers/biometricoController');
const mermaCtrl = require('../controllers/mermaController');
const impresionCtrl = require('../controllers/impresionController'); 
const proveedorCtrl = require('../controllers/proveedorController'); // Controlador de proveedores
const comboCtrl = require('../controllers/comboController'); 
const nominaCtrl = require('../controllers/nominaController');

// 👇 NUEVOS: Controladores del Módulo de Distribución (B2B)
const distribucionCtrl = require('../controllers/distribucionController');
const distClientesCtrl = require('../controllers/distClientesController');
const distVentasCtrl = require('../controllers/distVentasController');

// 👇 NUEVOS: Controladores MDM y Huellas
const equipoCtrl = require('../controllers/equipoController');
const huellasCtrl = require('../controllers/huellasController'); // <-- Nombre corregido

// 👇 Inicializar tablas en Neon.tech automáticamente al arrancar
comboCtrl.inicializarTablaCombos();
distribucionCtrl.inicializarTablas();
distClientesCtrl.inicializarTablas(); // 👈 Inicializa tablas de CRM B2B y Configuración SMTP
distVentasCtrl.inicializarTablas(); 
huellasCtrl.inicializarTablas();

// ==========================================
// CONFIGURACIÓN DE CLOUDINARY
// ==========================================
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});  

const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: async (req, file) => {
    if (file.mimetype.includes('video')) {
      return {
        folder: 'pos_uploads',
        resource_type: 'video',
        allowedFormats: ['mp4', 'webm', 'mov']
      };
    }
    
    // Si es imagen, forzamos formato webp para un ahorro MASIVO de ancho de banda
    // Si es PDF, Cloudinary lo maneja como 'raw' o 'image' si se autoriza.
    const isPdf = file.mimetype === 'application/pdf';
    return {
      folder: 'pos_uploads',
      resource_type: isPdf ? 'raw' : 'image',
      allowedFormats: isPdf ? ['pdf'] : ['jpeg', 'png', 'jpg', 'webp'],
      format: isPdf ? undefined : 'webp',
      transformation: isPdf ? [] : [{ width: 800, crop: "scale" }] 
    };
  }
});

const upload = multer({ storage: storage });  

// ==========================================
// RUTAS DE CONFIGURACIÓN Y MARCA BLANCA
// ==========================================
router.get('/configuracion', configCtrl.obtenerConfiguracion);
router.put('/configuracion', upload.any(), configCtrl.actualizarConfiguracion);
router.post('/configuracion/evidencia', upload.any(), configCtrl.subirEvidenciaLimpieza);
router.post('/configuracion/eliminar-archivos', configCtrl.eliminarArchivosCloudinary);  

// ==========================================
// CUPONES DE DESCUENTO
// ==========================================
router.get('/cupones', configCtrl.obtenerCupones);
router.post('/cupones', configCtrl.crearCupon);
router.put('/cupones/:id/estado', configCtrl.actualizarCuponEstado);
router.delete('/cupones/:id', configCtrl.eliminarCupon);
router.post('/cupones/validar', configCtrl.validarCupon);  

// ==========================================
// PROMOCIONES Y UPSELLING
// ==========================================
router.get('/promociones', promocionCtrl.obtenerPromociones);
router.post('/promociones', promocionCtrl.crearPromocion);
router.put('/promociones/:id/estado', promocionCtrl.actualizarEstadoPromocion);
router.delete('/promociones/:id', promocionCtrl.eliminarPromocion);
router.put('/promociones/:id', promocionCtrl.actualizarPromocion);  

// ==========================================
// CONSTRUCTOR DE COMBOS
// ==========================================
router.get('/combos', comboCtrl.obtenerCombos);
router.post('/combos', comboCtrl.crearCombo);
router.put('/combos/:id', comboCtrl.actualizarCombo);
router.put('/combos/:id/estado', comboCtrl.cambiarEstadoCombo);
router.delete('/combos/:id', comboCtrl.eliminarCombo);

// ==========================================
// NOTIFICACIONES PUSH
// ==========================================
router.post('/suscripciones', notificacionCtrl.guardarSuscripcion);  

// ==========================================
// AUTENTICACIÓN Y CLIENTES NORMALES
// ==========================================
router.post('/identificar', authCtrl.identificar);
router.post('/login', authCtrl.login);
router.post('/logout', authCtrl.logout);
router.post('/clientes/registro', clienteCtrl.registrar);
router.post('/clientes/verificar-nip', clienteCtrl.verificarNip);
router.post('/clientes/solicitar-codigo-nip', clienteCtrl.solicitarCodigoNip);
router.post('/clientes/cambiar-nip-codigo', clienteCtrl.cambiarNipConCodigo);
router.post('/clientes/cambiar-correo-codigo', clienteCtrl.cambiarCorreoConCodigo);
router.post('/clientes/recuperar-nip', clienteCtrl.recuperarNip);
router.get('/clientes', clienteCtrl.obtenerClientes);
router.put('/clientes/:id', clienteCtrl.actualizarCliente);
router.get('/clientes/reportes', clienteCtrl.obtenerReportes);  

// ==========================================
// USUARIOS (EMPLEADOS) Y RECURSOS HUMANOS
// ==========================================
router.get('/usuarios', usuarioCtrl.obtenerUsuarios);
router.get('/usuarios/ayudantes', usuarioCtrl.obtenerAyudantesCocina);
router.get('/usuarios/rendimiento', usuarioCtrl.obtenerReporteRendimiento);
router.post('/usuarios', usuarioCtrl.crearUsuario);
router.delete('/usuarios/:id', usuarioCtrl.eliminarUsuario);
router.put('/usuarios/:id', usuarioCtrl.actualizarUsuario);
router.put('/usuarios/:id/prestaciones', usuarioCtrl.actualizarPrestaciones);
router.put('/usuarios/:id/horario', usuarioCtrl.actualizarHorario);
router.post('/usuarios/corte-nomina', nominaCtrl.guardarNomina);
router.post('/usuarios/asistencia', usuarioCtrl.registrarAsistencia);
router.post('/usuarios/:id/forzar-logout', authCtrl.forzarLogout);  

// ==========================================
// MOTOR AISLADO DE NÓMINAS Y PLANTILLAS
// ==========================================
router.post('/nominas', nominaCtrl.guardarNomina);
router.delete('/nominas/:id', nominaCtrl.revertirNomina);
router.put('/nominas/plantilla/:id', nominaCtrl.actualizarPlantillaBase);

// ==========================================
// MENSAJES INTERNOS (ENCARGOS)
// ==========================================
router.post('/mensajes', mensajeCtrl.enviarMensaje);
router.get('/mensajes/admin', mensajeCtrl.obtenerMensajesAdmin);
router.get('/mensajes/empleado/:id', mensajeCtrl.obtenerMensajesEmpleado);
router.put('/mensajes/:id/leer', mensajeCtrl.marcarComoLeido);
router.delete('/mensajes/:id', mensajeCtrl.eliminarMensaje);  

// ==========================================
// CATÁLOGOS (Clasificaciones e Ingredientes/Extras)
// ==========================================
router.get('/clasificaciones', clasificacionCtrl.obtenerClasificaciones);
router.post('/clasificaciones', upload.single('imagen'), clasificacionCtrl.crearClasificacion);
router.post('/clasificaciones/clonar', clasificacionCtrl.clonarClasificacion);
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
router.put('/productos/:id/opciones', recetaCtrl.actualizarOpcionesProducto);  

// ==========================================
// PEDIDOS Y FLUJO
// ==========================================
router.get('/pedidos/historial', pedidoCtrl.obtenerHistorialAuditoria);
router.get('/pedidos/hoy', pedidoCtrl.obtenerPedidosHoy);
router.post('/pedidos', pedidoCtrl.crearPedido);
router.put('/pedidos/:id', pedidoCtrl.actualizarPedido);
router.put('/pedidos/:id/estado', pedidoCtrl.actualizarEstado);
router.put('/pedidos/:id/alerta', pedidoCtrl.actualizarAlerta);
router.get('/clientes/:cliente_id/pedidos', pedidoCtrl.obtenerPedidosCliente);  

// ==========================================
// 🛵 MÓDULO DE REPARTO Y LOGÍSTICA
// ==========================================
router.get('/reparto/disponibles', repartidorCtrl.obtenerPedidosDisponiblesParaReparto);
router.put('/reparto/tomar/:id', repartidorCtrl.tomarPedidoRepartidor);
router.put('/reparto/entregar/:id', repartidorCtrl.entregarPedidoRepartidor);
router.get('/reparto/mis-viajes/:repartidor_id', repartidorCtrl.obtenerMisViajesActivos);
router.get('/reparto/historial/:repartidor_id', repartidorCtrl.obtenerHistorialRepartidor);
router.get('/reparto/auditoria/repartidores', repartidorCtrl.obtenerRepartidoresAuditoria);
router.get('/reparto/auditoria/pedidos/:repartidor_id', repartidorCtrl.obtenerPedidosAuditoria);
router.post('/reparto/auditoria/liquidar', repartidorCtrl.liquidarAuditoria);  

// ==========================================
// INSUMOS Y RECETAS (Inventario)
// ==========================================
router.get('/insumos', insumoCtrl.obtenerInsumos);
router.get('/insumos/compras/hoy', insumoCtrl.obtenerComprasHoy);
router.get('/insumos/compras/reporte', insumoCtrl.obtenerReporteCompras);
router.post('/insumos', insumoCtrl.crearInsumo);
router.put('/insumos/:id', insumoCtrl.actualizarInsumo);
router.put('/insumos/:id/comprar', insumoCtrl.comprarInsumo);
router.put('/insumos/:id/reiniciar', insumoCtrl.reiniciarStock);
router.delete('/insumos/:id', insumoCtrl.eliminarInsumo);
router.get('/recetas/:producto_id', recetaCtrl.obtenerReceta);
router.post('/recetas', recetaCtrl.agregarInsumoReceta);
router.delete('/recetas/:id', recetaCtrl.eliminarInsumoReceta);  

// ==========================================
// 🚚 PROVEEDORES Y CONTROL DE GASTOS
// ==========================================
router.get('/proveedores/configuracion', proveedorCtrl.obtenerConfiguracion); 
router.put('/proveedores/configuracion', proveedorCtrl.actualizarConfiguracion); 
router.get('/proveedores', proveedorCtrl.obtenerProveedores);
router.post('/proveedores', proveedorCtrl.crearProveedor);
router.put('/proveedores/:id', proveedorCtrl.actualizarProveedor);
router.delete('/proveedores/:id', proveedorCtrl.eliminarProveedor);
router.put('/gastos-proveedores/bulk/estado', proveedorCtrl.actualizarEstadoGastoBulk);
router.delete('/gastos-proveedores/:id', proveedorCtrl.eliminarGasto);
router.get('/gastos-proveedores', proveedorCtrl.obtenerGastos);
router.post('/gastos-proveedores', proveedorCtrl.registrarGasto);
router.put('/gastos-proveedores/:id/estado', proveedorCtrl.actualizarEstadoGasto);

// ==========================================
// 📦 DISTRIBUCIÓN Y MAYOREO (ARTÍCULOS Y PRECIOS)
// ==========================================
router.get('/distribucion/articulos', distribucionCtrl.obtenerArticulos);
router.post('/distribucion/articulos', upload.single('imagen'), distribucionCtrl.crearArticulo);
router.put('/distribucion/articulos/:id', upload.single('imagen'), distribucionCtrl.actualizarArticulo);
router.delete('/distribucion/articulos/:id', distribucionCtrl.eliminarArticulo);

// ==========================================
// 🛒 VENTAS DE MAYOREO (DISTRIBUCIÓN)
// ==========================================
router.post('/distribucion/ventas', distVentasCtrl.crearVenta);
router.get('/distribucion/ventas', distVentasCtrl.obtenerVentas);

// ==========================================
// 👥 DIRECTORIO DE CLIENTES B2B Y CRÉDITO
// ==========================================
router.get('/distribucion/configuracion', distClientesCtrl.obtenerConfiguracion);
router.put('/distribucion/configuracion', distClientesCtrl.actualizarConfiguracion);
router.post('/distribucion/clientes/enviar-codigo', distClientesCtrl.enviarCodigoVerificacion);

router.get('/distribucion/clientes', distClientesCtrl.obtenerClientes);
router.post('/distribucion/clientes', upload.fields([
  { name: 'ine_frente', maxCount: 1 },
  { name: 'ine_reverso', maxCount: 1 },
  { name: 'comprobante_domicilio', maxCount: 1 }
]), distClientesCtrl.crearCliente);
router.put('/distribucion/clientes/:id', upload.fields([
  { name: 'ine_frente', maxCount: 1 },
  { name: 'ine_reverso', maxCount: 1 },
  { name: 'comprobante_domicilio', maxCount: 1 }
]), distClientesCtrl.actualizarCliente);
router.delete('/distribucion/clientes/:id', distClientesCtrl.eliminarCliente);

// ==========================================
// MERMAS Y DESPERDICIOS
// ==========================================
router.post('/mermas', mermaCtrl.registrarMerma);
router.get('/mermas', mermaCtrl.obtenerMermas);  

// ==========================================
// REPORTES Y ESTADÍSTICAS
// ==========================================
router.get('/reportes/ventas', reporteCtrl.obtenerReporteVentas);
router.get('/reportes/combustible', reporteCtrl.obtenerReporteCombustible);
router.post('/reportes/combustible/config', reporteCtrl.guardarConfigFlotilla);  

// ==========================================
// GESTIÓN DE MESAS (MAPEO Y QR)
// ==========================================
router.get('/mesas', mesaCtrl.obtenerMesas);
router.post('/mesas', mesaCtrl.crearMesa);
router.put('/mesas/posiciones', mesaCtrl.guardarPosiciones);
router.put('/mesas/:id/estado', mesaCtrl.actualizarEstadoMesa);
router.delete('/mesas/:id', mesaCtrl.eliminarMesa);  

// ==========================================
// 💰 CORTES DE CAJA (HISTÓRICO)
// ==========================================
router.post('/cortes', corteCtrl.guardarCorte);
router.get('/cortes/historial', corteCtrl.obtenerHistorial);  

// ==========================================
// 📡 INTEGRACIÓN ZKTECO (BIOMÉTRICOS ADMS)
// ==========================================
router.get('/iclock/cdata', biometricoCtrl.handshake);
router.post('/iclock/cdata', express.text({ type: '*/*' }), biometricoCtrl.recibirDatos);
router.get('/iclock/getrequest', biometricoCtrl.getComandos);  

// ==========================================
// 🖨️ IMPRESIÓN TCP / RED (TICKETS)
// ==========================================
router.post('/imprimir', impresionCtrl.imprimirTicketIP); 

// RUTAS PARA EL WEBHOOK AUTOMÁTICO Y ACTUALIZACIONES
router.post('/configuracion/actualizar-sistema', configCtrl.forzarActualizacionGlobal);  
router.post('/webhook/vercel-deploy', configCtrl.webhookVercelDeploy);  

// ==========================================
// 🌐 MIDDLEWARE PARA EMITIR WEBOCKETS (MAGIA EN VIVO)
// ==========================================
let globalIo = null;
router.use((req, res, next) => {
  if (!globalIo && req.app) globalIo = req.app.get('io');
  next();
});

// ==========================================
// MÓDULO AISLADO: BIOMETRÍA Y CONTROL DE EQUIPOS (MDM)
// ==========================================
// Configuración aislada (Engrane de SMTP y MDM Activo)
router.get('/biometria/configuracion', equipoCtrl.obtenerConfiguracion);
router.put('/biometria/configuracion', equipoCtrl.actualizarConfiguracion);

// Gestión de Dispositivos Permitidos
router.get('/biometria/equipos', equipoCtrl.obtenerEquipos);
router.post('/biometria/equipos', equipoCtrl.registrarEquipo);
router.put('/biometria/equipos/:id', equipoCtrl.actualizarEquipo);
router.delete('/biometria/equipos/:id', equipoCtrl.eliminarEquipo);

// Motor Biométrico (Huellas)
router.post('/huellas/generar-registro', huellasCtrl.generarOpcionesRegistro);
router.post('/huellas/verificar-registro', huellasCtrl.verificarRegistro);
router.post('/huellas/enviar-codigo', huellasCtrl.enviarCodigoVerificacion);
router.post('/huellas/generar-login', huellasCtrl.generarOpcionesAutenticacion);
router.post('/huellas/verificar-login', huellasCtrl.verificarAutenticacion);

// ==========================================
// 🤖 CRON JOB (EL VIGILANTE CONTINUO DE HORARIOS Y STOCK)
// ==========================================
setInterval(async () => {
  try {
    const queryTime = "SELECT EXTRACT(ISODOW FROM CURRENT_TIMESTAMP AT TIME ZONE 'America/Mazatlan') as dia, TO_CHAR(CURRENT_TIMESTAMP AT TIME ZONE 'America/Mazatlan', 'HH24:MI') as hora";
    const res = await db.query(queryTime);
    
    if (res.rows.length === 0) return;  

    const diaActual = res.rows[0].dia.toString();
    const horaActual = res.rows[0].hora;  
    let huboCambios = false;

    // 1. FORZAR APAGADO SI ESTÁ FUERA DE SU HORARIO ESTRICTO
    const apagarProd = await db.query(`
      UPDATE productos SET disponible = false
      WHERE usa_horario = true AND disponible = true
      AND (
        dias_disponibles NOT LIKE '%' || $1 || '%'
        OR (hora_inicio <= hora_fin AND ( $2 < TO_CHAR(hora_inicio, 'HH24:MI') OR $2 > TO_CHAR(hora_fin, 'HH24:MI') ))
        OR (hora_inicio > hora_fin AND ( $2 < TO_CHAR(hora_inicio, 'HH24:MI') AND $2 > TO_CHAR(hora_fin, 'HH24:MI') ))
      )
    `, [diaActual, horaActual]);
    if (apagarProd.rowCount > 0) huboCambios = true;

    const apagarClas = await db.query(`
      UPDATE clasificaciones SET disponible = false
      WHERE usa_horario = true AND disponible = true
      AND (
        dias_disponibles NOT LIKE '%' || $1 || '%'
        OR (hora_inicio <= hora_fin AND ( $2 < TO_CHAR(hora_inicio, 'HH24:MI') OR $2 > TO_CHAR(hora_fin, 'HH24:MI') ))
        OR (hora_inicio > hora_fin AND ( $2 < TO_CHAR(hora_inicio, 'HH24:MI') AND $2 > TO_CHAR(hora_fin, 'HH24:MI') ))
      )
    `, [diaActual, horaActual]);
    if (apagarClas.rowCount > 0) huboCambios = true;

    // 2. ENCENDER
    const prenderProd = await db.query(`
      UPDATE productos SET disponible = true
      WHERE usa_horario = true AND disponible = false
      AND dias_disponibles LIKE '%' || $1 || '%'
      AND (
        (hora_inicio <= hora_fin AND $2 >= TO_CHAR(hora_inicio, 'HH24:MI') AND $2 <= TO_CHAR(hora_fin, 'HH24:MI'))
        OR (hora_inicio > hora_fin AND ($2 >= TO_CHAR(hora_inicio, 'HH24:MI') OR $2 <= TO_CHAR(hora_fin, 'HH24:MI')))
      )
      AND (usa_stock = false OR stock_preparado > 0)
    `, [diaActual, horaActual]);
    if (prenderProd.rowCount > 0) huboCambios = true;

    const prenderClas = await db.query(`
      UPDATE clasificaciones SET disponible = true
      WHERE usa_horario = true AND disponible = false
      AND dias_disponibles LIKE '%' || $1 || '%'
      AND (
        (hora_inicio <= hora_fin AND $2 >= TO_CHAR(hora_inicio, 'HH24:MI') AND $2 <= TO_CHAR(hora_fin, 'HH24:MI'))
        OR (hora_inicio > hora_fin AND ($2 >= TO_CHAR(hora_inicio, 'HH24:MI') OR $2 <= TO_CHAR(hora_fin, 'HH24:MI')))
      )
    `, [diaActual, horaActual]);
    if (prenderClas.rowCount > 0) huboCambios = true;

    if (huboCambios && globalIo) {
      globalIo.emit('catalogo_actualizado');
    }

    if (proveedorCtrl.verificarAlertasStock) {
        await proveedorCtrl.verificarAlertasStock(globalIo);
    }

  } catch (error) {
    console.error("Error en el Vigilante de Horarios/Stock (Cron):", error);
  }
}, 60000); 

router.use((err, req, res, next) => {
  console.error("🚨 Error de subida a Cloudinary:", JSON.stringify(err, null, 2));
  res.status(500).json({ error: "Error al procesar la imagen en el servidor." });
});

module.exports = router;