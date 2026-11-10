import React, { useEffect, useState, useRef } from 'react';
import { PackagePlus } from 'lucide-react';
import io from 'socket.io-client';
import TopNavCaja from './caja/TopNavCaja';
import VistasCaja from './caja/VistasCaja';
import ModalesCaja from './caja/ModalesCaja';
import TicketImpresion from './caja/TicketImpresion';
import PantallaBloqueo from './caja/PantallaBloqueo';
import { useCajaCentral } from './caja/useCajaCentral';
import ModalPagoMayoreo from './caja/modales/ModalPagoMayoreo';
// 👇 IMPORTACIÓN DEL NUEVO MODAL DE AUDITORÍA EN CAJA
import ModalInventarioCaja from './caja/modales/ModalInventarioCaja';
import { apiFetch } from '../utils/apiFetch';
import { useSonidosCaja } from './caja/useSonidosCaja'; // 🔔 sonidos de pedido nuevo y mensaje de WhatsApp
import ChatWhatsAppCaja from './caja/ChatWhatsAppCaja'; // 🆕 Chat de WhatsApp (Human Handoff)

const Caja = ({ user, onLogout, onGoToKiosco }) => {
  const c = useCajaCentral(user, onLogout, onGoToKiosco);
  const { apiUrl, cargarDataDinamica } = c;  
  
  // 👇 NUEVOS ESTADOS DE AUDITORÍA
  const [auditoriaActiva, setAuditoriaActiva] = useState(null);
  const [modalInventarioCaja, setModalInventarioCaja] = useState(false);
  const [solicitudInsumoCocina, setSolicitudInsumoCocina] = useState(null); // 🆕 Pedir Insumo
  const [mostrandoMotivoRechazo, setMostrandoMotivoRechazo] = useState(false); // 🆕 Mini-form de motivo
  const [motivoRechazo, setMotivoRechazo] = useState(''); // 🆕 Texto que escribe el cajero
  const socketRef = useRef(null); // 🆕 Para poder emitir la respuesta a Cocina

  // 🔔 Sonidos de Caja
  const { sonar } = useSonidosCaja();
  const idsPorConfirmarRef = useRef(new Set());
  const montadoEnRef = useRef(Date.now());
  useEffect(() => {
    const lista = Array.isArray(c.pedidosPorConfirmar) ? c.pedidosPorConfirmar : [];
    const hayNuevo = lista.some(p => !idsPorConfirmarRef.current.has(p.id));
    // La guarda de 6 s evita que suene con los pedidos que ya existían al abrir Caja
    if (hayNuevo && Date.now() - montadoEnRef.current > 6000) sonar('pedido');
    idsPorConfirmarRef.current = new Set(lista.map(p => p.id));
  }, [c.pedidosPorConfirmar, sonar]);

  useEffect(() => {
    if (!apiUrl) return;

    // Función para cargar si hay una auditoría activa
    const cargarAuditoria = async () => {
      try {
        const res = await apiFetch(`${apiUrl}/insumos/auditoria/activa`);
        if (res.ok) setAuditoriaActiva(await res.json());
      } catch (error) {}
    };
    cargarAuditoria(); // Carga inicial al montar la caja

    const socket = io(apiUrl.replace('/api', ''), {
      transports: ['websocket', 'polling'],
      auth: { empresa_slug: process.env.REACT_APP_EMPRESA_SLUG } // 🆕 identifica la empresa dueña del socket
    });
    socketRef.current = socket; // 🆕 Referencia para responder la solicitud de insumo
    const actualizarPantalla = () => {
      if (cargarDataDinamica) cargarDataDinamica();
    };

    socket.on('nuevo_pedido', actualizarPantalla);
    socket.on('pedido_actualizado', actualizarPantalla);
    socket.on('pedido_eliminado', actualizarPantalla);

    // Socket actualizados
    socket.on('usuario_actualizado', actualizarPantalla);
    socket.on('config_actualizada', actualizarPantalla);
    socket.on('catalogo_actualizado', actualizarPantalla);

    // 👇 ESCUCHAMOS EL EVENTO DE AUDITORÍA PARA MOSTRAR/OCULTAR EL BOTÓN
    socket.on('auditoria_actualizada', cargarAuditoria);

    // 🆕 Omnicanal: reenvía el evento (ya filtrado por la sala de la empresa) al chat de WhatsApp
    socket.on('omnichannel_actualizado', (payload) => {
      window.dispatchEvent(new CustomEvent('omnichannel_actualizado', { detail: payload }));
    });

    // 🆕 PEDIR INSUMO: Cocina solicita algo. Alerta flotante NO bloqueante — Caja
    // sigue operando normal, y responde cuando la operación se lo permita.
    socket.on('solicitud_insumo_caja', (payload) => {
      setSolicitudInsumoCocina(payload);
    });

    return () => socket.disconnect();
    }, [apiUrl, cargarDataDinamica]);

    // 🆕 PEDIR INSUMO: responde a Cocina (Aceptar/Rechazar). Cero registro en BD.
    // Aceptar sigue siendo inmediato. Rechazar ahora abre un mini-formulario
    // para capturar el motivo (ej. "No hay pan, tiendas cerradas"), crítico
    // para que Cocina sepa que debe detener producción de ese platillo.
    const responderSolicitudInsumo = (aceptado) => {
      if (!aceptado) {
        setMostrandoMotivoRechazo(true);
        return;
      }
      if (socketRef.current && solicitudInsumoCocina) {
        socketRef.current.emit('respuesta_insumo_caja', { ...solicitudInsumoCocina, aceptado: true });
      }
      setSolicitudInsumoCocina(null);
    };

    // 🆕 Confirma el rechazo ya con el motivo capturado
    const confirmarRechazoConMotivo = () => {
      if (socketRef.current && solicitudInsumoCocina) {
        socketRef.current.emit('respuesta_insumo_caja', {
          ...solicitudInsumoCocina,
          aceptado: false,
          motivo: motivoRechazo.trim()
        });
      }
      setSolicitudInsumoCocina(null);
      setMostrandoMotivoRechazo(false);
      setMotivoRechazo('');
    };

  return (
    <>
      <PantallaBloqueo
        isCajaBloqueada={c.isCajaBloqueada}
        setIsCajaBloqueada={c.setIsCajaBloqueada}
        empleadosPOS={c.empleadosPOS}
        setOperadorActual={c.setOperadorActual}
        configGlobal={c.configGlobal}
        onLogout={onLogout}
      />  
      <div className="flex flex-col h-screen bg-slate-50 font-sans text-slate-800 relative print:hidden overflow-hidden">
        <TopNavCaja
          user={c.operadorActual}
          onLogout={c.cerrarCajaYSalir}
          configGlobal={c.configGlobal}
          toggleEstadoNegocio={c.toggleEstadoNegocio}
          vistaActiva={c.vistaActiva}
          setVistaActiva={c.setVistaActiva}
          pedidosPorConfirmar={c.pedidosPorConfirmar}
          pendientesDePago={c.pendientesDePago}
          listosParaEntregar={c.listosParaEntregar}
          mesasPagadas={c.mesasPagadas}
          setModalCompraRapida={c.setModalCompraRapida}
          abrirIdentificador={c.abrirIdentificador}
          pedidosEnReparto={c.pedidosPorLiquidar}
          setModalAsistencia={c.setModalAsistencia}
          setModalComedor={c.setModalComedor}
          setModalMermas={c.setModalMermas}
          // 👇 PROPS NUEVOS PASADOS AL NAVBAR
          auditoriaActiva={auditoriaActiva}
          setModalInventarioCaja={setModalInventarioCaja}
          usaCocina={c.usaCocina}
        />  
        <main className="flex-1 overflow-y-auto">
          <VistasCaja
            user={c.operadorActual}
            empleadosPOS={c.empleadosPOS}
            vistaActiva={c.vistaActiva}
            setVistaActiva={c.setVistaActiva}
            subVistaHistorial={c.subVistaHistorial}
            setSubVistaHistorial={c.setSubVistaHistorial}
            pedidos={c.pedidos}
            mesas={c.mesas}
            pedidosConAlerta={c.pedidosConAlerta}
            pedidosPorConfirmar={c.pedidosPorConfirmar}
            pendientesDePago={c.pendientesDePago}
            listosParaEntregar={c.listosParaEntregar}
            mesasPagadas={c.mesasPagadas}
            pedidosEnReparto={c.pedidosPorLiquidar}
            fondosRepartidores={c.fondosRepartidores}
            actualizarFondoRepartidor={c.actualizarFondoRepartidor}
            fondoRepartidorGlobal={c.fondoRepartidorGlobal}
            liquidarPedidoRepartidor={c.liquidarPedidoRepartidor}
            fondoCaja={c.fondoCaja}
            configGlobal={c.configGlobal}
            gastosDia={c.gastosDia}
            gastosTurnoActivo={c.gastosTurnoActivo}
            turnoActivo={c.turnoActivo}
            abrirModalResolver={c.abrirModalResolver}
            limpiarAlerta={c.limpiarAlerta}
            setModalPago={c.setModalPago}
            setMontoRecibido={c.setMontoRecibido}
            actualizarEstadoPedido={c.actualizarEstadoPedido}
            confirmarPedidoRecoger={c.confirmarPedidoRecoger}
            lanzarImpresion={c.lanzarImpresion}
            setModalZonaEnvio={c.setModalZonaEnvio}
            setModalAgregarExtra={c.setModalAgregarExtra}
            setModalEditarPedido={c.setModalEditarPedido}
            isSubmitting={c.isSubmitting}
            setModalVerDetalle={c.setModalVerDetalle}
            onLogout={c.cerrarCajaYSalir}
            forzarLiberacionMesas={c.forzarLiberacionMesas}
            pedidosAuditados={c.pedidosAuditados}
            apiUrl={c.apiUrl}
            usaCocina={c.usaCocina}
            abrirModalAgregarPlatillo={c.abrirModalAgregarPlatillo}
            puedeAgregarPlatillo={c.puedeAgregarPlatillo}
          />
        </main>  
        <ModalesCaja
          user={c.operadorActual}
          cargarDataDinamica={c.cargarDataDinamica}
          modalPuntoVenta={c.modalPuntoVenta}
          setModalPuntoVenta={c.setModalPuntoVenta}
          ordenEditandoRapida={c.ordenEditandoRapida}
          productos={c.productos}
          clasificaciones={c.clasificaciones}
          apiUrl={c.apiUrl}
          lanzarImpresion={c.lanzarImpresion}
          empleadosPOS={c.empleadosPOS}
          mesas={c.mesas}
          mesaObligatoria={c.mesaObligatoria}
          modalCobrarDiferencia={c.modalCobrarDiferencia}
          setModalCobrarDiferencia={c.setModalCobrarDiferencia}
          confirmarCobroDiferenciaPlatillo={c.confirmarCobroDiferenciaPlatillo}
          modalAgregarPlatillo={c.modalAgregarPlatillo}
          setModalAgregarPlatillo={c.setModalAgregarPlatillo}
          confirmarItemsAgregarPlatillo={c.confirmarItemsAgregarPlatillo}
          fondoCaja={c.fondoCaja}
          iniciarTurno={c.iniciarTurno}
          inputFondo={c.inputFondo}
          setInputFondo={c.setInputFondo}
          modalResolver={c.modalResolver}
          setModalResolver={c.setModalResolver}
          itemAfectadoIdx={c.itemAfectadoIdx}
          setItemAfectadoIdx={c.setItemAfectadoIdx}
          accionAlerta={c.accionAlerta}
          setAccionAlerta={c.setAccionAlerta}
          ingredienteReemplazo={c.ingredienteReemplazo}
          setIngredienteReemplazo={c.setIngredienteReemplazo}
          enviarRespuestaCocina={c.enviarRespuestaCocina}
          catalogoIngredientes={c.catalogoIngredientes}  
          // FIX: ESCUDO PARA OCULTAR EL MODAL NORMAL SI LA ETIQUETA _esB2B ESTÁ PRESENTE
          modalPago={c.modalPago && !c.modalPago._esB2B ? c.modalPago : null}  
          setModalPago={c.setModalPago}
          montoRecibido={c.montoRecibido}
          setMontoRecibido={c.setMontoRecibido}
          procesarPago={c.procesarPago}
          configGlobal={c.configGlobal}
          modalZonaEnvio={c.modalZonaEnvio}
          setModalZonaEnvio={c.setModalZonaEnvio}
          confirmarPedidoDomicilio={c.confirmarPedidoDomicilio}
          modalCompraRapida={c.modalCompraRapida}
          setModalCompraRapida={c.setModalCompraRapida}
          insumosDB={c.insumosDB}
          insumoComprar={c.insumoComprar}
          setInsumoComprar={c.setInsumoComprar}
          paquetesComprados={c.paquetesComprados}
          setPaquetesComprados={c.setPaquetesComprados}
          registrarCompraRapida={c.registrarCompraRapida}
          registrarGastoCajaLibre={c.registrarGastoCajaLibre}
          alertaCaja={c.alertaCaja}
          setAlertaCaja={c.setAlertaCaja}
          modalAgregarExtra={c.modalAgregarExtra}
          setModalAgregarExtra={c.setModalAgregarExtra}
          confirmarAgregarExtra={c.confirmarAgregarExtra}
          modalEditarPedido={c.modalEditarPedido}
          setModalEditarPedido={c.setModalEditarPedido}
          guardarEdicionPedido={c.guardarEdicionPedido}
          alertaCobroExtra={c.alertaCobroExtra}
          setAlertaCobroExtra={c.setAlertaCobroExtra}
          isSubmitting={c.isSubmitting}
          modalVerDetalle={c.modalVerDetalle}
          setModalVerDetalle={c.setModalVerDetalle}
          modalIdentificar={c.modalIdentificar}
          setModalIdentificar={c.setModalIdentificar}
          pasoIdentificar={c.pasoIdentificar}
          setPasoIdentificar={c.setPasoIdentificar}
          telClienteNuevo={c.telClienteNuevo}
          setTelClienteNuevo={c.setTelClienteNuevo}
          datosNuevoCliente={c.datosNuevoCliente}
          setDatosNuevoCliente={c.setDatosNuevoCliente}
          buscarClienteParaPedido={c.buscarClienteParaPedido}
          registrarClienteParaPedido={c.registrarClienteParaPedido}
          onGoToKiosco={c.onGoToKiosco}
          modalAsistencia={c.modalAsistencia}
          setModalAsistencia={c.setModalAsistencia}
          modalComedor={c.modalComedor}
          setModalComedor={c.setModalComedor}
          pedidos={c.pedidos}
          modalMermas={c.modalMermas}
          setModalMermas={c.setModalMermas}
          combosActivos={c.combosActivos}
        />  
        
        {/* MODAL EXCLUSIVO PARA MAYOREO (B2B) */}
        {c.modalPago && c.modalPago._esB2B && (
          <ModalPagoMayoreo
            modalPago={c.modalPago}
            setModalPago={c.setModalPago}
            isSubmitting={c.isSubmitting}
            setIsSubmitting={c.setIsSubmitting} 
            configGlobal={c.configGlobal}
            apiUrl={c.apiUrl}
            showAlert={(titulo, mensaje, tipo) => {
              c.setAlertaCaja({ titulo, mensaje, tipo });
              setTimeout(() => c.setAlertaCaja(null), 5000);
            }}
          />
        )}  

        {/* 🆕 CHAT DE WHATSAPP: oculto con la caja bloqueada y si el negocio no tiene el canal listo */}
        {!c.isCajaBloqueada && (
          <ChatWhatsAppCaja
            sonar={sonar}
            apiUrl={c.apiUrl}
            showAlert={(titulo, mensaje, tipo) => {
              c.setAlertaCaja({ titulo, mensaje, tipo });
              setTimeout(() => c.setAlertaCaja(null), 5000);
            }}
          />
        )}

        {/* 👇 RENDERIZADO CONDICIONAL DEL MODAL DE AUDITORÍA */}
        {modalInventarioCaja && auditoriaActiva && (
          <ModalInventarioCaja 
            apiUrl={apiUrl}
            insumosDB={c.insumosDB} // Usa los insumos cargados en la caja
            auditoriaActiva={auditoriaActiva}
            cerrarModal={() => setModalInventarioCaja(false)}
            showAlert={(t, m, tip) => c.setAlertaCaja({titulo: t, mensaje: m, tipo: tip})}
          />
        )}

        {/* 🆕 PEDIR INSUMO: tarjeta flotante NO bloqueante — Caja sigue trabajando normal */}
        {solicitudInsumoCocina && !mostrandoMotivoRechazo && (
          <div className="fixed bottom-6 right-6 z-[9999] animate-in slide-in-from-bottom-4 fade-in duration-300 max-w-sm">
            <div className="bg-white rounded-3xl shadow-2xl border-2 border-blue-500 p-5">
              <div className="flex items-center gap-3 mb-3">
                <div className="bg-blue-100 text-blue-600 p-2.5 rounded-2xl shrink-0">
                  <PackagePlus size={22} />
                </div>
                <div>
                  <p className="font-black text-slate-800 text-sm uppercase tracking-widest">Cocina Solicita Insumo</p>
                  <p className="text-[10px] font-bold text-slate-400">{solicitudInsumoCocina.solicitante}</p>
                </div>
              </div>
              <p className="font-bold text-slate-700 text-sm mb-4">
                {solicitudInsumoCocina.cantidad} de <span className="text-blue-600">{solicitudInsumoCocina.insumo}</span>
              </p>
              <div className="flex gap-2">
                <button onClick={() => responderSolicitudInsumo(false)} className="flex-1 py-2.5 bg-slate-100 hover:bg-red-100 text-slate-600 hover:text-red-600 font-black text-xs rounded-xl transition active:scale-95">Rechazar</button>
                <button onClick={() => responderSolicitudInsumo(true)} className="flex-1 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white font-black text-xs rounded-xl transition active:scale-95">Aceptar</button>
              </div>
            </div>
          </div>
        )}

        {/* 🆕 PEDIR INSUMO: mini-formulario de motivo de rechazo (no bloqueante, aparece
            en el mismo lugar que la tarjeta original) — el motivo es información
            operativa crítica para que Cocina sepa si debe parar producción. */}
        {solicitudInsumoCocina && mostrandoMotivoRechazo && (
          <div className="fixed bottom-6 right-6 z-[9999] animate-in slide-in-from-bottom-4 fade-in duration-300 max-w-sm">
            <div className="bg-white rounded-3xl shadow-2xl border-2 border-red-400 p-5">
              <div className="flex items-center gap-3 mb-3">
                <div className="bg-red-100 text-red-600 p-2.5 rounded-2xl shrink-0">
                  <PackagePlus size={22} />
                </div>
                <div>
                  <p className="font-black text-slate-800 text-sm uppercase tracking-widest">Motivo del Rechazo</p>
                  <p className="text-[10px] font-bold text-slate-400">
                    {solicitudInsumoCocina.cantidad} de {solicitudInsumoCocina.insumo}
                  </p>
                </div>
              </div>
              <textarea
                autoFocus
                value={motivoRechazo}
                onChange={(e) => setMotivoRechazo(e.target.value)}
                placeholder="Ej. No hay pan, tiendas cerradas por el momento..."
                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-700 outline-none focus:border-red-400 resize-none mb-4"
                rows={3}
              />
              <div className="flex gap-2">
                <button
                  onClick={() => { setMostrandoMotivoRechazo(false); setMotivoRechazo(''); }}
                  className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 font-black text-xs rounded-xl transition active:scale-95"
                >
                  Volver
                </button>
                <button
                  onClick={confirmarRechazoConMotivo}
                  disabled={!motivoRechazo.trim()}
                  className="flex-1 py-2.5 bg-red-500 hover:bg-red-600 text-white font-black text-xs rounded-xl transition active:scale-95 disabled:opacity-50"
                >
                  Enviar Rechazo
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
      <TicketImpresion ticketImprimir={c.ticketImprimir} configGlobal={c.configGlobal} apiUrl={c.apiUrl} />
    </>
  );
};  

export default Caja;