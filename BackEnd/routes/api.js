const express = require('express');
const router = express.Router();
const multer = require('multer');
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const cloudinary = require('cloudinary').v2;
const db = require('../config/db'); // Necesario para el Cron Job

// 🆕 TENANT: resuelve empresa_id por sesión (Caso 1) o por header X-Empresa-Slug (Caso 2)
const { resolveTenant } = require('../middlewares/resolveTenant');

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
const asistenciaConfigCtrl = require('../controllers/asistenciaConfigController');

// 👇 NUEVOS: Controladores MDM y Huellas
const equipoCtrl = require('../controllers/equipoController');
const huellasCtrl = require('../controllers/huellasController'); // <-- Nombre corregido
const iaCtrl = require('../controllers/iaController');

// 💡 MÓDULO AISLADO: Configuración Financiera (Factor Luz/Agua y futuros Gastos Fijos)
const configFinancieraCtrl = require('../controllers/configFinancieraController');

const configOperativaCtrl = require('../controllers/configOperativaCtrl');
const cocinaOperativaCtrl = require('../controllers/cocinaOperativaController');
const kioscoAnimacionesCtrl = require('../controllers/kioscoAnimacionesController');

// 🆕 Imports nuevos (agregar junto a los demás require() al inicio de api.js)
const { verificarAdminGlobal } = require('../middlewares/verificarAdminGlobal');
const { uploadAnimacionKiosco } = require('../middlewares/uploadAnimacionesKiosco');

const empresasController = require('../controllers/empresasController');


// 👇 Inicializar tablas en Neon.tech automáticamente al arrancar
comboCtrl.inicializarTablaCombos();
distribucionCtrl.inicializarTablas();
distClientesCtrl.inicializarTablas();
distVentasCtrl.inicializarTablas();
huellasCtrl.inicializarTablas();
insumoCtrl.inicializarTablasAuditoria();
insumoCtrl.inicializarInsumos();
asistenciaConfigCtrl.inicializarTablas();
iaCtrl.inicializarTablaIA();
recetaCtrl.inicializarTablasRecetas();
configFinancieraCtrl.inicializarTablaConfigFinanciera();
configOperativaCtrl.inicializarTablaConfigOperativa();
cocinaOperativaCtrl.inicializarTablaCocinaOperativa();
usuarioCtrl.inicializarTablaCierreAutomatico();
kioscoAnimacionesCtrl.inicializarTablas();
empresasController.inicializarTablaEmpresas();

// ==========================================
// CONFIGURACIÓN DE CLOUDINARY
// ==========================================
// 🆕 Config global: sigue siendo el FALLBACK para empresas que aún no
// configuraron su propio Cloudinary en Admin Empresas, y para procesos sin
// empresa_id en el request (ej. el cron job / borrarDeCloudinary).
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

const { resolverVariables } = require('../utils/envResolver');

const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: async (req, file) => {
    // 🆕 MULTI-TENANT: en vez de mutar cloudinary.config() globalmente (lo
    // cual causaría que dos empresas subiendo al mismo tiempo se pisen las
    // credenciales a medias), se inyectan cloud_name/api_key/api_secret
    // DIRECTO en los params de ESTA subida puntual. El SDK de Cloudinary
    // acepta estos 3 campos por-llamada, sin tocar el estado global.
    const creds = await resolverVariables(req.empresa_id, [
      'CLOUDINARY_CLOUD_NAME', 'CLOUDINARY_API_KEY', 'CLOUDINARY_API_SECRET'
    ]);
    const credencialesCloudinary = {
      cloud_name: creds.CLOUDINARY_CLOUD_NAME || process.env.CLOUDINARY_CLOUD_NAME,
      api_key: creds.CLOUDINARY_API_KEY || process.env.CLOUDINARY_API_KEY,
      api_secret: creds.CLOUDINARY_API_SECRET || process.env.CLOUDINARY_API_SECRET
    };

    if (file.mimetype.includes('video')) {
      return {
        ...credencialesCloudinary,
        folder: 'pos_uploads',
        resource_type: 'video',
        allowedFormats: ['mp4', 'webm', 'mov']
      };
    }

    // Si es imagen, forzamos formato webp para un ahorro MASIVO de ancho de banda
    // Si es PDF, Cloudinary lo maneja como 'raw' o 'image' si se autoriza.
    const isPdf = file.mimetype === 'application/pdf';
    return {
      ...credencialesCloudinary,
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
router.get('/configuracion', resolveTenant, configCtrl.obtenerConfiguracion);
router.put('/configuracion', resolveTenant, upload.any(), configCtrl.actualizarConfiguracion);
router.post('/configuracion/evidencia', resolveTenant, upload.any(), configCtrl.subirEvidenciaLimpieza);
router.post('/configuracion/eliminar-archivos', resolveTenant, configCtrl.eliminarArchivosCloudinary);

// ==========================================
// CUPONES DE DESCUENTO
// ==========================================
router.get('/cupones', resolveTenant, configCtrl.obtenerCupones);
router.post('/cupones', resolveTenant, configCtrl.crearCupon);
router.put('/cupones/:id/estado', resolveTenant, configCtrl.actualizarCuponEstado);
router.delete('/cupones/:id', resolveTenant, configCtrl.eliminarCupon);
router.post('/cupones/validar', resolveTenant, configCtrl.validarCupon);

// ==========================================
// PROMOCIONES Y UPSELLING
// ==========================================
router.get('/promociones', resolveTenant, promocionCtrl.obtenerPromociones);
router.post('/promociones', resolveTenant, promocionCtrl.crearPromocion);
router.put('/promociones/:id/estado', resolveTenant, promocionCtrl.actualizarEstadoPromocion);
router.delete('/promociones/:id', resolveTenant, promocionCtrl.eliminarPromocion);
router.put('/promociones/:id', resolveTenant, promocionCtrl.actualizarPromocion);

// ==========================================
// CONSTRUCTOR DE COMBOS
// ==========================================
router.get('/combos', resolveTenant, comboCtrl.obtenerCombos);
router.post('/combos', resolveTenant, comboCtrl.crearCombo);
router.put('/combos/:id', resolveTenant, comboCtrl.actualizarCombo);
router.put('/combos/:id/estado', resolveTenant, comboCtrl.cambiarEstadoCombo);
router.delete('/combos/:id', resolveTenant, comboCtrl.eliminarCombo);

// ==========================================
// NOTIFICACIONES PUSH
// ==========================================
router.post('/suscripciones', resolveTenant, notificacionCtrl.guardarSuscripcion);

// ==========================================
// AUTENTICACIÓN Y CLIENTES NORMALES
// ==========================================
router.post('/identificar', resolveTenant, authCtrl.identificar);
router.post('/login', resolveTenant, authCtrl.login);
router.post('/logout', resolveTenant, authCtrl.logout);
router.post('/clientes/registro', resolveTenant, clienteCtrl.registrar);
router.post('/clientes/verificar-nip', resolveTenant, clienteCtrl.verificarNip);
router.post('/clientes/solicitar-codigo-nip', resolveTenant, clienteCtrl.solicitarCodigoNip);
router.post('/clientes/cambiar-nip-codigo', resolveTenant, clienteCtrl.cambiarNipConCodigo);
router.post('/clientes/cambiar-correo-codigo', resolveTenant, clienteCtrl.cambiarCorreoConCodigo);
router.post('/clientes/recuperar-nip', resolveTenant, clienteCtrl.recuperarNip);
router.get('/clientes', resolveTenant, clienteCtrl.obtenerClientes);
router.put('/clientes/:id', resolveTenant, clienteCtrl.actualizarCliente);
router.get('/clientes/buscar', resolveTenant, clienteCtrl.buscarClientes); // 🔍 NUEVO: Búsqueda optimizada en servidor (SQL)
router.get('/clientes/reportes', resolveTenant, clienteCtrl.obtenerReportes);
router.get('/clientes/:id', resolveTenant, clienteCtrl.obtenerClientePorId); // 🆕 FIX 404: Obtener un cliente puntual por ID
router.delete('/clientes/:id', resolveTenant, clienteCtrl.eliminarCliente);

// ==========================================
// USUARIOS (EMPLEADOS) Y RECURSOS HUMANOS
// ==========================================
router.get('/usuarios', resolveTenant, usuarioCtrl.obtenerUsuarios);
router.get('/usuarios/ayudantes', resolveTenant, usuarioCtrl.obtenerAyudantesCocina);
router.get('/usuarios/rendimiento', resolveTenant, usuarioCtrl.obtenerReporteRendimiento);
router.post('/usuarios', resolveTenant, usuarioCtrl.crearUsuario);
router.delete('/usuarios/:id', resolveTenant, usuarioCtrl.eliminarUsuario);
router.put('/usuarios/:id', resolveTenant, usuarioCtrl.actualizarUsuario);
router.put('/usuarios/:id/prestaciones', resolveTenant, usuarioCtrl.actualizarPrestaciones);
router.put('/usuarios/:id/horario', resolveTenant, usuarioCtrl.actualizarHorario);
router.post('/usuarios/corte-nomina', resolveTenant, nominaCtrl.guardarNomina);
router.post('/usuarios/asistencia', resolveTenant, usuarioCtrl.registrarAsistencia);
router.post('/usuarios/asistencia-nfc', resolveTenant, usuarioCtrl.registrarAsistenciaNFC);
router.get('/usuarios/nfc-vinculados', resolveTenant, usuarioCtrl.obtenerNFCVinculados);
router.delete('/usuarios/nfc-vinculados/:id', resolveTenant, usuarioCtrl.desvincularGafeteNFC);
router.post('/usuarios/:id/forzar-logout', resolveTenant, authCtrl.forzarLogout);

// ==========================================
// MOTOR AISLADO DE NÓMINAS Y PLANTILLAS
// ==========================================
router.post('/nominas', resolveTenant, nominaCtrl.guardarNomina);
router.delete('/nominas/:id', resolveTenant, nominaCtrl.revertirNomina);
router.put('/nominas/plantilla/:id', resolveTenant, nominaCtrl.actualizarPlantillaBase);

// ==========================================
// MENSAJES INTERNOS (ENCARGOS)
// ==========================================
router.post('/mensajes', resolveTenant, mensajeCtrl.enviarMensaje);
router.get('/mensajes/admin', resolveTenant, mensajeCtrl.obtenerMensajesAdmin);
router.get('/mensajes/empleado/:id', resolveTenant, mensajeCtrl.obtenerMensajesEmpleado);
router.put('/mensajes/:id/leer', resolveTenant, mensajeCtrl.marcarComoLeido);
router.delete('/mensajes/:id', resolveTenant, mensajeCtrl.eliminarMensaje);

// ==========================================
// CATÁLOGOS (Clasificaciones e Ingredientes/Extras)
// ==========================================
router.get('/clasificaciones', resolveTenant, clasificacionCtrl.obtenerClasificaciones);
router.post('/clasificaciones', resolveTenant, upload.single('imagen'), clasificacionCtrl.crearClasificacion);
router.post('/clasificaciones/clonar', resolveTenant, clasificacionCtrl.clonarClasificacion);
router.put('/clasificaciones/:id', resolveTenant, upload.single('imagen'), clasificacionCtrl.actualizarClasificacion);
router.delete('/clasificaciones/:id', resolveTenant, clasificacionCtrl.eliminarClasificacion);
router.get('/ingredientes', resolveTenant, ingredienteCtrl.obtenerIngredientes);
router.post('/ingredientes', resolveTenant, ingredienteCtrl.crearIngrediente);
router.put('/ingredientes/:id', resolveTenant, ingredienteCtrl.actualizarIngrediente);
router.delete('/ingredientes/:id', resolveTenant, ingredienteCtrl.eliminarIngrediente);

// ==========================================
// MENÚ (PRODUCTOS)
// ==========================================
router.get('/productos', resolveTenant, productoCtrl.obtenerProductos);
router.post('/productos', resolveTenant, upload.single('imagen'), productoCtrl.crearProducto);
router.put('/productos/:id', resolveTenant, upload.single('imagen'), productoCtrl.actualizarProducto);
router.delete('/productos/:id', resolveTenant, productoCtrl.eliminarProducto);
router.put('/productos/:id/rendimiento', resolveTenant, productoCtrl.actualizarRendimiento);
router.put('/productos/:id/opciones', resolveTenant, recetaCtrl.actualizarOpcionesProducto);

// ==========================================
// PEDIDOS Y FLUJO
// ==========================================
router.get('/pedidos/historial', resolveTenant, pedidoCtrl.obtenerHistorialAuditoria);
router.get('/pedidos/hoy', resolveTenant, pedidoCtrl.obtenerPedidosHoy);
router.post('/pedidos', resolveTenant, pedidoCtrl.crearPedido);
router.put('/pedidos/:id', resolveTenant, pedidoCtrl.actualizarPedido);
router.put('/pedidos/:id/estado', resolveTenant, pedidoCtrl.actualizarEstado);
router.put('/pedidos/:id/alerta', resolveTenant, pedidoCtrl.actualizarAlerta);
router.get('/clientes/:cliente_id/pedidos', resolveTenant, pedidoCtrl.obtenerPedidosCliente);
router.post('/pedidos/:id/agregar-items', resolveTenant, pedidoCtrl.agregarItemsAPedido);

// ==========================================
// 🛵 MÓDULO DE REPARTO Y LOGÍSTICA
// ==========================================
router.get('/reparto/disponibles', resolveTenant, repartidorCtrl.obtenerPedidosDisponiblesParaReparto);
router.put('/reparto/tomar/:id', resolveTenant, repartidorCtrl.tomarPedidoRepartidor);
router.put('/reparto/entregar/:id', resolveTenant, repartidorCtrl.entregarPedidoRepartidor);
router.get('/reparto/mis-viajes/:repartidor_id', resolveTenant, repartidorCtrl.obtenerMisViajesActivos);
router.get('/reparto/historial/:repartidor_id', resolveTenant, repartidorCtrl.obtenerHistorialRepartidor);
router.get('/reparto/auditoria/repartidores', resolveTenant, repartidorCtrl.obtenerRepartidoresAuditoria);
router.get('/reparto/auditoria/pedidos/:repartidor_id', resolveTenant, repartidorCtrl.obtenerPedidosAuditoria);
router.post('/reparto/auditoria/liquidar', resolveTenant, repartidorCtrl.liquidarAuditoria);

// ==========================================
// INSUMOS Y RECETAS (Inventario)
// ==========================================
router.get('/insumos', resolveTenant, insumoCtrl.obtenerInsumos);
router.get('/insumos/compras/hoy', resolveTenant, insumoCtrl.obtenerComprasHoy);
router.get('/insumos/compras/reporte', resolveTenant, insumoCtrl.obtenerReporteCompras);
router.post('/insumos/gasto-caja', resolveTenant, insumoCtrl.registrarGastoCajaLibre);
router.post('/insumos', resolveTenant, insumoCtrl.crearInsumo);
router.put('/insumos/:id', resolveTenant, insumoCtrl.actualizarInsumo);
router.put('/insumos/:id/comprar', resolveTenant, insumoCtrl.comprarInsumo);
router.put('/insumos/:id/reiniciar', resolveTenant, insumoCtrl.reiniciarStock);
router.delete('/insumos/:id', resolveTenant, insumoCtrl.eliminarInsumo);
router.put('/insumos/:id/stock-exacto', resolveTenant, insumoCtrl.fijarStockExacto);
router.get('/insumos/auditoria/activa', resolveTenant, insumoCtrl.obtenerAuditoriaActiva); // 👈 NUEVA
router.post('/insumos/auditoria/solicitar', resolveTenant, insumoCtrl.solicitarAuditoria); // 👈 NUEVA
router.put('/insumos/auditoria/:id/guardar', resolveTenant, insumoCtrl.guardarProgresoAuditoria); // 👈 NUEVA
router.put('/insumos/auditoria/:id/resolver', resolveTenant, insumoCtrl.resolverAuditoria); // 👈 NUEVA
router.put('/insumos/:id/alerta-stock', resolveTenant, insumoCtrl.actualizarAlertaStock);
router.get('/insumos/surtido/borrador', resolveTenant, insumoCtrl.obtenerBorradorSurtido); // 👈 NUEVA
router.put('/insumos/surtido/guardar', resolveTenant, insumoCtrl.guardarBorradorSurtido); // 👈 NUEVA
router.post('/insumos/surtido/aplicar', resolveTenant, insumoCtrl.aplicarSurtido); // 👈 NUEVA
router.get('/recetas/:producto_id', resolveTenant, recetaCtrl.obtenerReceta);
router.post('/recetas', resolveTenant, recetaCtrl.agregarInsumoReceta);
router.delete('/recetas/:id', resolveTenant, recetaCtrl.eliminarInsumoReceta);
// 👇 NUEVAS RUTAS: CRUD de Sub-Recetas (Preparaciones Base)
router.get('/sub-recetas', resolveTenant, recetaCtrl.obtenerSubRecetas);
router.post('/sub-recetas', resolveTenant, recetaCtrl.crearSubReceta);
router.put('/sub-recetas/:id', resolveTenant, recetaCtrl.actualizarSubReceta);
router.delete('/sub-recetas/:id', resolveTenant, recetaCtrl.eliminarSubReceta);

// ==========================================
// 🚚 PROVEEDORES Y CONTROL DE GASTOS
// ==========================================
router.get('/proveedores/configuracion', resolveTenant, proveedorCtrl.obtenerConfiguracion);
router.put('/proveedores/configuracion', resolveTenant, proveedorCtrl.actualizarConfiguracion);
router.get('/proveedores', resolveTenant, proveedorCtrl.obtenerProveedores);
router.post('/proveedores', resolveTenant, proveedorCtrl.crearProveedor);
router.put('/proveedores/:id', resolveTenant, proveedorCtrl.actualizarProveedor);
router.delete('/proveedores/:id', resolveTenant, proveedorCtrl.eliminarProveedor);
router.put('/gastos-proveedores/bulk/estado', resolveTenant, proveedorCtrl.actualizarEstadoGastoBulk);
router.delete('/gastos-proveedores/:id', resolveTenant, proveedorCtrl.eliminarGasto);
router.get('/gastos-proveedores', resolveTenant, proveedorCtrl.obtenerGastos);
router.post('/gastos-proveedores', resolveTenant, proveedorCtrl.registrarGasto);
router.put('/gastos-proveedores/:id/estado', resolveTenant, proveedorCtrl.actualizarEstadoGasto);

// ==========================================
// 📦 DISTRIBUCIÓN Y MAYOREO (ARTÍCULOS Y PRECIOS)
// ==========================================
router.get('/distribucion/articulos', resolveTenant, distribucionCtrl.obtenerArticulos);
router.post('/distribucion/articulos', resolveTenant, upload.single('imagen'), distribucionCtrl.crearArticulo);
router.put('/distribucion/articulos/:id', resolveTenant, upload.single('imagen'), distribucionCtrl.actualizarArticulo);
router.delete('/distribucion/articulos/:id', resolveTenant, distribucionCtrl.eliminarArticulo);

// ==========================================
// 🛒 VENTAS DE MAYOREO (DISTRIBUCIÓN)
// ==========================================
router.post('/distribucion/ventas', resolveTenant, distVentasCtrl.crearVenta);
router.get('/distribucion/ventas', resolveTenant, distVentasCtrl.obtenerVentas);

// ==========================================
// 👥 DIRECTORIO DE CLIENTES B2B Y CRÉDITO
// ==========================================
router.get('/distribucion/configuracion', resolveTenant, distClientesCtrl.obtenerConfiguracion);
router.put('/distribucion/configuracion', resolveTenant, distClientesCtrl.actualizarConfiguracion);
router.post('/distribucion/clientes/enviar-codigo', resolveTenant, distClientesCtrl.enviarCodigoVerificacion);

router.get('/distribucion/clientes', resolveTenant, distClientesCtrl.obtenerClientes);
router.post('/distribucion/clientes', resolveTenant, upload.fields([
  { name: 'ine_frente', maxCount: 1 },
  { name: 'ine_reverso', maxCount: 1 },
  { name: 'comprobante_domicilio', maxCount: 1 }
]), distClientesCtrl.crearCliente);
router.put('/distribucion/clientes/:id', resolveTenant, upload.fields([
  { name: 'ine_frente', maxCount: 1 },
  { name: 'ine_reverso', maxCount: 1 },
  { name: 'comprobante_domicilio', maxCount: 1 }
]), distClientesCtrl.actualizarCliente);
router.delete('/distribucion/clientes/:id', resolveTenant, distClientesCtrl.eliminarCliente);

// ==========================================
// MERMAS Y DESPERDICIOS
// ==========================================
router.post('/mermas', resolveTenant, mermaCtrl.registrarMerma);
router.get('/mermas', resolveTenant, mermaCtrl.obtenerMermas);

// ==========================================
// REPORTES Y ESTADÍSTICAS
// ==========================================
router.get('/reportes/ventas', resolveTenant, reporteCtrl.obtenerReporteVentas);
router.get('/reportes/combustible', resolveTenant, reporteCtrl.obtenerReporteCombustible);
router.post('/reportes/combustible/config', resolveTenant, reporteCtrl.guardarConfigFlotilla);
router.get('/reportes/populares-hoy', resolveTenant, reporteCtrl.obtenerProductosPopularesHoy);

// ==========================================
// 💡 MÓDULO AISLADO: CONFIGURACIÓN FINANCIERA (Factor Luz/Agua y futuros Gastos Fijos)
// ==========================================
router.get('/configuracion-financiera/factor-luz-agua', resolveTenant, configFinancieraCtrl.obtenerFactorLuzAgua);
router.put('/configuracion-financiera/factor-luz-agua', resolveTenant, configFinancieraCtrl.actualizarFactorLuzAgua);

// ==========================================
// GESTIÓN DE MESAS (MAPEO Y QR)
// ==========================================
router.get('/mesas', resolveTenant, mesaCtrl.obtenerMesas);
router.post('/mesas', resolveTenant, mesaCtrl.crearMesa);
router.put('/mesas/posiciones', resolveTenant, mesaCtrl.guardarPosiciones);
router.put('/mesas/:id/estado', resolveTenant, mesaCtrl.actualizarEstadoMesa);
router.delete('/mesas/:id', resolveTenant, mesaCtrl.eliminarMesa);

// ==========================================
// 💰 CORTES DE CAJA (HISTÓRICO)
// ==========================================
router.post('/cortes', resolveTenant, corteCtrl.guardarCorte);
router.get('/cortes/historial', resolveTenant, corteCtrl.obtenerHistorial);

// ==========================================
// 📡 INTEGRACIÓN ZKTECO (BIOMÉTRICOS ADMS)
// ==========================================
// ⚠️ NOTA IMPORTANTE: NO se agregó resolveTenant a estas 3 rutas.
// El puente ZKTeco (ver index.js: app.use('/iclock', ...)) es un checador
// físico que habla el protocolo propietario ADMS y NO puede mandar headers
// personalizados como X-Empresa-Slug. Forzar resolveTenant aquí rompería
// la recepción de huellas. Si necesitas aislar esto por empresa en el
// futuro, se debe resolver DENTRO de biometricoCtrl (ej. por el Serial
// Number del dispositivo), no con este middleware genérico.
router.get('/iclock/cdata', biometricoCtrl.handshake);
router.post('/iclock/cdata', express.text({ type: '*/*' }), biometricoCtrl.recibirDatos);
router.get('/iclock/getrequest', biometricoCtrl.getComandos);

// ==========================================
// 🖨️ IMPRESIÓN TCP / RED (TICKETS)
// ==========================================
router.post('/imprimir', resolveTenant, impresionCtrl.imprimirTicketIP);

// RUTAS PARA EL WEBHOOK AUTOMÁTICO Y ACTUALIZACIONES
// ⚠️ NOTA: tampoco se agregó resolveTenant aquí. forzarActualizacionGlobal
// y webhookVercelDeploy emiten un socket GLOBAL a todos los clientes
// conectados (io.emit sin sala), no dependen de empresa_id.
router.post('/configuracion/actualizar-sistema', configCtrl.forzarActualizacionGlobal);
router.post('/webhook/vercel-deploy', configCtrl.webhookVercelDeploy);

// ==========================================
// 🌐 MIDDLEWARE PARA EMITIR WEBOCKETS (MAGIA EN VIVO)
// ==========================================
let globalIo = null;
let listenersInsumoAdjuntos = false; // 🆕 Guardia para adjuntar el listener una sola vez
router.use((req, res, next) => {
if (!globalIo && req.app) {
    globalIo = req.app.get('io');
    // 🆕 PEDIR INSUMO (Cocina <-> Caja): relay puro vía Socket.io, SIN tocar la BD.
    // Si no hay nadie escuchando en Caja, el mensaje simplemente se pierde (según diseño acordado).
    if (globalIo && !listenersInsumoAdjuntos) {
        listenersInsumoAdjuntos = true;
        globalIo.on('connection', (socket) => {
            socket.on('solicitud_insumo_cocina', (payload) => {
                globalIo.emit('solicitud_insumo_caja', payload);
            });
            socket.on('respuesta_insumo_caja', (payload) => {
                globalIo.emit('respuesta_insumo_cocina', payload);
            });
        });
    }
}
next();
});

// ==========================================
// MÓDULO AISLADO: BIOMETRÍA Y CONTROL DE EQUIPOS (MDM)
// ==========================================
// Configuración aislada (Engrane de SMTP y MDM Activo)
router.get('/biometria/configuracion', resolveTenant, equipoCtrl.obtenerConfiguracion);
router.put('/biometria/configuracion', resolveTenant, equipoCtrl.actualizarConfiguracion);

// Gestión de Dispositivos Permitidos
router.get('/biometria/equipos', resolveTenant, equipoCtrl.obtenerEquipos);
router.post('/biometria/equipos', resolveTenant, equipoCtrl.registrarEquipo);
router.put('/biometria/equipos/:id', resolveTenant, equipoCtrl.actualizarEquipo);
router.delete('/biometria/equipos/:id', resolveTenant, equipoCtrl.eliminarEquipo);
// Motor Biométrico (Huellas)
router.post('/huellas/generar-registro', resolveTenant, huellasCtrl.generarOpcionesRegistro);
router.post('/huellas/verificar-registro', resolveTenant, huellasCtrl.verificarRegistro);
router.post('/huellas/enviar-codigo', resolveTenant, huellasCtrl.enviarCodigoVerificacion);
router.post('/huellas/generar-login', resolveTenant, huellasCtrl.generarOpcionesAutenticacion);
router.post('/huellas/verificar-login', resolveTenant, huellasCtrl.verificarAutenticacion);
router.delete('/huellas/cliente/:id', resolveTenant, huellasCtrl.eliminarHuellaCliente);
router.delete('/huellas/empleado/:id', resolveTenant, huellasCtrl.eliminarHuellaEmpleado);

// ==========================================
// 📍 MÓDULO AISLADO: CONFIGURACIÓN DE ASISTENCIA (GPS / IPs)
// ==========================================
router.get('/asistencia/configuracion', resolveTenant, asistenciaConfigCtrl.obtenerConfiguracionCompleta);
router.put('/asistencia/configuracion', resolveTenant, asistenciaConfigCtrl.actualizarConfiguracionGeneral);
router.post('/asistencia/ips', resolveTenant, asistenciaConfigCtrl.agregarIP);
router.delete('/asistencia/ips/:id', resolveTenant, asistenciaConfigCtrl.eliminarIP);
router.post('/asistencia/ubicaciones', resolveTenant, asistenciaConfigCtrl.agregarUbicacion);
router.delete('/asistencia/ubicaciones/:id', resolveTenant, asistenciaConfigCtrl.eliminarUbicacion);

// ==========================================
// VÍNCULO DE DISPOSITIVOS DE EMPLEADOS (ANTI-TRAMPAS)
// ==========================================
router.post('/usuarios/vincular-dispositivo', resolveTenant, authCtrl.vincularDispositivo);
router.get('/usuarios/dispositivos-vinculados', resolveTenant, authCtrl.obtenerDispositivosVinculados);
router.delete('/usuarios/dispositivos-vinculados/:id', resolveTenant, authCtrl.desvincularDispositivo);

// ==========================================
// 🧠 MÓDULO AISLADO: ADMIN IA (Copiloto)
// ==========================================
router.get('/ia/configuracion', resolveTenant, iaCtrl.obtenerConfiguracionIA);
router.put('/ia/configuracion', resolveTenant, iaCtrl.actualizarConfiguracionIA);
router.post('/ia/ventas', resolveTenant, iaCtrl.analizarVentas);
router.post('/ia/empleados', resolveTenant, iaCtrl.analizarEmpleados);
router.post('/ia/chat', resolveTenant, iaCtrl.chatLibre);
router.post('/ia/imagen', resolveTenant, iaCtrl.generarImagen);
router.get('/ia/historial', resolveTenant, iaCtrl.obtenerHistorialChat);
router.post('/ia/historial', resolveTenant, iaCtrl.guardarHistorialChat);

// ==========================================
// 🧠 MÓDULO AISLADO: CONFIGURACION OPERATIVA
// ==========================================
router.get('/configuracion-operativa', resolveTenant, configOperativaCtrl.obtenerConfigOperativa);
router.put('/configuracion-operativa', resolveTenant, configOperativaCtrl.actualizarConfigOperativa);
router.get('/cocina/personal-presente', resolveTenant, cocinaOperativaCtrl.obtenerPersonalPresente);
router.get('/cocina/produccion-en-vivo', resolveTenant, cocinaOperativaCtrl.obtenerProduccionEnVivo);
router.get('/cocina/estaciones', resolveTenant, cocinaOperativaCtrl.obtenerEstaciones);
router.post('/cocina/estaciones', resolveTenant, cocinaOperativaCtrl.crearEstacion);
router.put('/cocina/estaciones/:id', resolveTenant, cocinaOperativaCtrl.actualizarEstacion);
router.put('/cocina/estaciones/:id/asignar-clasificacion', resolveTenant, cocinaOperativaCtrl.asignarClasificacion);
router.delete('/cocina/estaciones/:id', resolveTenant, cocinaOperativaCtrl.eliminarEstacion);

// ==========================================
// 🎬 MÓDULO AISLADO: ANIMACIONES DEL KIOSCO (Lottie + Video Premium)
// ==========================================
router.get('/kiosco-animaciones/biblioteca', resolveTenant, kioscoAnimacionesCtrl.obtenerBibliotecaAnimaciones);
router.get('/kiosco-animaciones/empresa', resolveTenant, kioscoAnimacionesCtrl.obtenerAnimacionesEmpresa);
router.post('/kiosco-animaciones', resolveTenant, kioscoAnimacionesCtrl.guardarAnimacionCategoria);
router.delete('/kiosco-animaciones/:id', resolveTenant, kioscoAnimacionesCtrl.eliminarAnimacionCategoria);

// 🆕 Rutas EXCLUSIVAS de súper-admin global (llave secreta, independiente del empresa_id)
router.get('/kiosco-animaciones/permisos-empresas', verificarAdminGlobal, kioscoAnimacionesCtrl.obtenerPermisosTodasEmpresas);
router.post('/kiosco-animaciones/permisos-empresas', verificarAdminGlobal, kioscoAnimacionesCtrl.actualizarPermisoEmpresa);
router.post('/kiosco-animaciones/biblioteca', verificarAdminGlobal, uploadAnimacionKiosco.any(), kioscoAnimacionesCtrl.subirAnimacionBiblioteca);
router.delete('/kiosco-animaciones/biblioteca/:id', verificarAdminGlobal, kioscoAnimacionesCtrl.eliminarAnimacionBiblioteca);
router.get('/kiosco-animaciones/biblioteca-admin', verificarAdminGlobal, kioscoAnimacionesCtrl.obtenerBibliotecaCompletaAdmin);

// === Rutas — Panel Admin Empresas (Exclusivo Admin Global) ===
router.get('/admin-global/empresas', verificarAdminGlobal, empresasController.listarEmpresas);
router.post('/admin-global/empresas', verificarAdminGlobal, empresasController.crearEmpresa);
router.get('/admin-global/empresas/:id/variables', verificarAdminGlobal, empresasController.obtenerVariablesEmpresa);
router.get('/admin-global/empresas/:id/variables/:clave/revelar', verificarAdminGlobal, empresasController.revelarVariable);
router.put('/admin-global/empresas/:id/variables', verificarAdminGlobal, empresasController.actualizarVariables);

// 🆕 Catálogo global de variables disponibles (qué CLAVES existen para todas las empresas)
router.get('/admin-global/variables-catalogo', verificarAdminGlobal, empresasController.obtenerCatalogoClaves);
router.post('/admin-global/variables-catalogo', verificarAdminGlobal, empresasController.agregarClaveCatalogo);

// ==========================================
// 🤖 CRON JOB (EL VIGILANTE CONTINUO DE HORARIOS Y STOCK)
// ==========================================
// ⚠️ NOTA IMPORTANTE: este bloque NO lleva resolveTenant porque no es una
// ruta HTTP (no tiene req/res) — es un setInterval que corre en segundo
// plano dentro del propio proceso del servidor, de forma global para TODAS
// las empresas a la vez. No se toca su lógica interna; queda pendiente como
// punto a futuro si se requiere que el cron distinga por empresa_id en sus
// UPDATE de productos/clasificaciones/configuracion (hoy corre sin filtrar).
setInterval(async () => {
  try {
    const queryTime = "SELECT EXTRACT(ISODOW FROM CURRENT_TIMESTAMP AT TIME ZONE 'America/Mazatlan') as dia, TO_CHAR(CURRENT_TIMESTAMP AT TIME ZONE 'America/Mazatlan', 'HH24:MI') as hora";
    const res = await db.query(queryTime);
    
    if (res.rows.length === 0) return;  

    const diaActual = res.rows[0].dia.toString();
    const horaActual = res.rows[0].hora;  
    let huboCambios = false;

    // 👇 FIX MAESTRO: AUTO-RESET DEL BOTÓN MANUAL DE CAJA (Inyectado sin romper tu código)
    const confRes = await db.query('SELECT horarios_semana, negocio_abierto FROM configuracion WHERE id = 1');
    if (confRes.rows.length > 0) {
      const config = confRes.rows[0];
      const estaAbiertoManual = config.negocio_abierto === true || String(config.negocio_abierto) === 'true';
      
      if (estaAbiertoManual) {
        let resetearModoManual = false;
        
        // 1. Reseteo de Medianoche (Si se les olvidó apagarlo, a las 12:00 AM se apaga solo)
        if (horaActual === '00:00') {
          resetearModoManual = true;
        } 
        else {
          // 2. Reseteo en los topes exactos de Apertura y Cierre
          const horarios = typeof config.horarios_semana === 'string' ? JSON.parse(config.horarios_semana || '{}') : (config.horarios_semana || {});
          const diasMapa = { '1': 'Lunes', '2': 'Martes', '3': 'Miércoles', '4': 'Jueves', '5': 'Viernes', '6': 'Sábado', '7': 'Domingo' };
          const diaHoyStr = diasMapa[diaActual];
          const configHoy = horarios[diaHoyStr];

          if (configHoy && configHoy.activo && configHoy.apertura && configHoy.cierre) {
            // Limpiamos el botón exactamente en el minuto que abre o cierra oficialmente el restaurante
            if (horaActual === configHoy.apertura || horaActual === configHoy.cierre) {
              resetearModoManual = true;
            }
          }
        }

        if (resetearModoManual) {
          await db.query('UPDATE configuracion SET negocio_abierto = false WHERE id = 1');
          huboCambios = true;
        }
      }
    }
    // ☝️ FIN DEL FIX MAESTRO

    // 🆕 CORTE AUTOMÁTICO DE HORAS (Fase 4): se engancha a este mismo cron
    // existente en vez de crear un setInterval nuevo (DRY). Corre cada 60s,
    // igual que el resto del vigilante. Ya filtra por empresa_id dentro de
    // la propia función (ver usuarioController.cerrarTurnosVencidos).
    if (usuarioCtrl.cerrarTurnosVencidos) {
      await usuarioCtrl.cerrarTurnosVencidos(globalIo);
    }

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

    // 👇 NUEVO: Alertas push de stock bajo configuradas por insumo (independientes de Proveedores)
    if (insumoCtrl.verificarAlertasStockPersonalizado) {
      await insumoCtrl.verificarAlertasStockPersonalizado(globalIo);
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