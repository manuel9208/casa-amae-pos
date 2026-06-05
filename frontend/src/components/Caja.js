import React from 'react';
import TopNavCaja from './caja/TopNavCaja';
import VistasCaja from './caja/VistasCaja';
import ModalesCaja from './caja/ModalesCaja';
import TicketImpresion from './caja/TicketImpresion';
import PantallaBloqueo from './caja/PantallaBloqueo';
import { useCajaCentral } from './caja/useCajaCentral';  

const Caja = ({ user, onLogout, onGoToKiosco }) => {
  const c = useCajaCentral(user, onLogout, onGoToKiosco);  

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
          user={c.operadorActual} onLogout={c.cerrarCajaYSalir} configGlobal={c.configGlobal} toggleEstadoNegocio={c.toggleEstadoNegocio}
          vistaActiva={c.vistaActiva} setVistaActiva={c.setVistaActiva} pedidosPorConfirmar={c.pedidosPorConfirmar}
          pendientesDePago={c.pendientesDePago} listosParaEntregar={c.listosParaEntregar} mesasPagadas={c.mesasPagadas}
          setModalCompraRapida={c.setModalCompraRapida} abrirIdentificador={c.abrirIdentificador}
          pedidosEnReparto={c.pedidosEnReparto}
          setModalAsistencia={c.setModalAsistencia}
        />  

        <main className="flex-1 overflow-y-auto">
          <VistasCaja
            user={c.operadorActual}
            empleadosPOS={c.empleadosPOS}
            vistaActiva={c.vistaActiva} subVistaHistorial={c.subVistaHistorial} setSubVistaHistorial={c.setSubVistaHistorial}
            pedidos={c.pedidos} mesas={c.mesas} pedidosConAlerta={c.pedidosConAlerta} pedidosPorConfirmar={c.pedidosPorConfirmar}
            pendientesDePago={c.pendientesDePago} listosParaEntregar={c.listosParaEntregar} mesasPagadas={c.mesasPagadas}
            pedidosEnReparto={c.pedidosEnReparto}
            fondoCaja={c.fondoCaja} configGlobal={c.configGlobal} gastosDia={c.gastosDia} abrirModalResolver={c.abrirModalResolver}
            limpiarAlerta={c.limpiarAlerta} setModalPago={c.setModalPago} setMontoRecibido={c.setMontoRecibido}
            actualizarEstadoPedido={c.actualizarEstadoPedido} confirmarPedidoRecoger={c.confirmarPedidoRecoger}
            lanzarImpresion={c.lanzarImpresion} setModalZonaEnvio={c.setModalZonaEnvio} setModalAgregarExtra={c.setModalAgregarExtra}
            setModalEditarPedido={c.setModalEditarPedido} isSubmitting={c.isSubmitting} setModalVerDetalle={c.setModalVerDetalle}
          />
        </main>  

        <ModalesCaja
          user={c.operadorActual} cargarDataDinamica={c.cargarDataDinamica} modalPuntoVenta={c.modalPuntoVenta} setModalPuntoVenta={c.setModalPuntoVenta}
          ordenEditandoRapida={c.ordenEditandoRapida} productos={c.productos} clasificaciones={c.clasificaciones}
          apiUrl={c.apiUrl} lanzarImpresion={c.lanzarImpresion}  
          empleadosPOS={c.empleadosPOS} 
          mesas={c.mesas}               
          fondoCaja={c.fondoCaja} iniciarTurno={c.iniciarTurno} inputFondo={c.inputFondo} setInputFondo={c.setInputFondo}
          modalResolver={c.modalResolver} setModalResolver={c.setModalResolver} itemAfectadoIdx={c.itemAfectadoIdx}
          setItemAfectadoIdx={c.setItemAfectadoIdx} accionAlerta={c.accionAlerta} setAccionAlerta={c.setAccionAlerta}
          ingredienteReemplazo={c.ingredienteReemplazo} setIngredienteReemplazo={c.setIngredienteReemplazo}
          enviarRespuestaCocina={c.enviarRespuestaCocina} catalogoIngredientes={c.catalogoIngredientes}
          modalPago={c.modalPago} setModalPago={c.setModalPago} montoRecibido={c.montoRecibido} setMontoRecibido={c.setMontoRecibido}
          procesarPago={c.procesarPago} configGlobal={c.configGlobal} modalZonaEnvio={c.modalZonaEnvio}
          setModalZonaEnvio={c.setModalZonaEnvio} confirmarPedidoDomicilio={c.confirmarPedidoDomicilio}
          modalCompraRapida={c.modalCompraRapida} setModalCompraRapida={c.setModalCompraRapida} insumosDB={c.insumosDB}
          insumoComprar={c.insumoComprar} setInsumoComprar={c.setInsumoComprar} paquetesComprados={c.paquetesComprados}
          setPaquetesComprados={c.setPaquetesComprados} registrarCompraRapida={c.registrarCompraRapida}
          alertaCaja={c.alertaCaja} setAlertaCaja={c.setAlertaCaja} modalAgregarExtra={c.modalAgregarExtra}
          setModalAgregarExtra={c.setModalAgregarExtra} confirmarAgregarExtra={c.confirmarAgregarExtra}
          modalEditarPedido={c.modalEditarPedido} setModalEditarPedido={c.setModalEditarPedido}
          guardarEdicionPedido={c.guardarEdicionPedido} alertaCobroExtra={c.alertaCobroExtra}
          setAlertaCobroExtra={c.setAlertaCobroExtra} isSubmitting={c.isSubmitting} modalVerDetalle={c.modalVerDetalle}
          setModalVerDetalle={c.setModalVerDetalle} modalIdentificar={c.modalIdentificar} setModalIdentificar={c.setModalIdentificar}
          pasoIdentificar={c.pasoIdentificar} setPasoIdentificar={c.setPasoIdentificar} telClienteNuevo={c.telClienteNuevo}
          setTelClienteNuevo={c.setTelClienteNuevo} datosNuevoCliente={c.datosNuevoCliente} setDatosNuevoCliente={c.setDatosNuevoCliente}
          buscarClienteParaPedido={c.buscarClienteParaPedido} registrarClienteParaPedido={c.registrarClienteParaPedido}
          onGoToKiosco={c.onGoToKiosco} /* 👈 AQUÍ ESTÁ LA CORRECCIÓN CLAVE */
          modalAsistencia={c.modalAsistencia} 
          setModalAsistencia={c.setModalAsistencia} 
        />
      </div>  

      <TicketImpresion ticketImprimir={c.ticketImprimir} configGlobal={c.configGlobal} apiUrl={c.apiUrl} />
    </>
  );
};  

export default Caja;