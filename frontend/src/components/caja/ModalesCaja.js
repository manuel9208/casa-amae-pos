import React from 'react';
import { DollarSign, CheckCircle2, XCircle, BellRing } from 'lucide-react';
import ModalPago from './modales/ModalPago';
import ModalEditarPedido from './modales/ModalEditarPedido';
import ModalIdentificar from './modales/ModalIdentificar';
import ModalCompraRapida from './modales/ModalCompraRapida';
import ModalResolver from './modales/ModalResolver';
import ModalAgregarExtra from './modales/ModalAgregarExtra';
import ModalZonaEnvio from './modales/ModalZonaEnvio';
import ModalVerDetalle from './modales/ModalVerDetalle';
import ModalAperturaCaja from './modales/ModalAperturaCaja';
import ModalPuntoVenta from './modales/ModalPuntoVenta';  
import ModalAsistencia from './modales/ModalAsistencia'; // 👈 NUEVO IMPORT

const ModalesCaja = ({
  user, cargarDataDinamica, modalPuntoVenta, setModalPuntoVenta, ordenEditandoRapida, productos, clasificaciones,
  fondoCaja, iniciarTurno, inputFondo, setInputFondo, modalResolver, setModalResolver, itemAfectadoIdx, setItemAfectadoIdx,
  accionAlerta, setAccionAlerta, ingredienteReemplazo, setIngredienteReemplazo, enviarRespuestaCocina, catalogoIngredientes,
  modalPago, setModalPago, montoRecibido, setMontoRecibido, procesarPago, configGlobal, modalZonaEnvio, setModalZonaEnvio,
  confirmarPedidoDomicilio, modalCompraRapida, setModalCompraRapida, insumosDB, insumoComprar, setInsumoComprar,
  paquetesComprados, setPaquetesComprados, registrarCompraRapida, alertaCaja, setAlertaCaja, modalAgregarExtra, setModalAgregarExtra,
  confirmarAgregarExtra, alertaCobroExtra, setAlertaCobroExtra, apiUrl, lanzarImpresion, modalEditarPedido, setModalEditarPedido,
  guardarEdicionPedido, isSubmitting, modalVerDetalle, setModalVerDetalle, modalIdentificar, setModalIdentificar, pasoIdentificar,
  setPasoIdentificar, telClienteNuevo, setTelClienteNuevo, datosNuevoCliente, setDatosNuevoCliente, buscarClienteParaPedido,
  registrarClienteParaPedido, onGoToKiosco, empleadosPOS, mesas,
  modalAsistencia, setModalAsistencia // 👈 NUEVOS PROPS RECIBIDOS
}) => {
  return (
    <>
      {alertaCaja && (
        <div className="fixed top-8 left-1/2 transform -translate-x-1/2 z-[999] animate-in slide-in-from-top-4 fade-in duration-300">
          <div className={`flex items-center gap-3 px-6 py-4 rounded-2xl shadow-2xl border-2 ${
            alertaCaja.tipo === 'success' ? 'bg-emerald-50 border-emerald-500 text-emerald-800' :
            alertaCaja.tipo === 'error' ? 'bg-red-50 border-red-500 text-red-800' :
            'bg-blue-50 border-blue-500 text-blue-800'
          }`}>
            {alertaCaja.tipo === 'success' && <CheckCircle2 className="text-emerald-500" size={24} />}
            {alertaCaja.tipo === 'error' && <XCircle className="text-red-500" size={24} />}
            {alertaCaja.tipo !== 'success' && alertaCaja.tipo !== 'error' && <BellRing className="text-blue-500" size={24} />}
            <div>
              <p className="font-black text-sm uppercase tracking-widest">{alertaCaja.titulo}</p>
              <p className="font-bold text-sm opacity-80">{alertaCaja.mensaje}</p>
            </div>
            <button onClick={() => setAlertaCaja(null)} className="ml-4 opacity-50 hover:opacity-100 transition"><XCircle size={20}/></button>
          </div>
        </div>
      )}  

      {alertaCobroExtra && (
        <div className="fixed inset-0 bg-slate-900/90 backdrop-blur-md flex items-center justify-center z-[999] p-4">
          <div className="bg-white p-10 rounded-[40px] shadow-2xl w-full max-w-lg text-center animate-in zoom-in duration-300 border-4 border-orange-500">
            <div className="mx-auto bg-orange-100 text-orange-600 w-24 h-24 rounded-full flex items-center justify-center mb-6 animate-pulse shadow-lg shadow-orange-500/30">
              <DollarSign size={64} />
            </div>
            <h2 className="text-5xl font-black text-slate-800 mb-2 uppercase tracking-tight">¡Cobrar Ahora!</h2>
            <p className="text-xl font-bold text-slate-500 mb-8">El cliente ha solicitado un ingrediente extra de último minuto.</p>
            <div className="bg-slate-50 border border-slate-200 rounded-3xl p-6 mb-8 text-left">
              <div className="flex justify-between items-center mb-4 border-b border-slate-200 pb-4">
                <p className="font-black text-slate-400 uppercase tracking-widest text-xs">Orden</p>
                <p className="font-black text-xl text-slate-800">#{alertaCobroExtra.orden}</p>
              </div>
              <div className="mb-4">
                <p className="font-black text-slate-400 uppercase tracking-widest text-xs mb-1">Platillo modificado</p>
                <p className="font-bold text-lg text-slate-700">{alertaCobroExtra.platillo}</p>
              </div>
              <div>
                <p className="font-black text-emerald-600 uppercase tracking-widest text-xs mb-1">Extra Agregado</p>
                <div className="flex justify-between items-center">
                  <p className="font-black text-2xl text-emerald-700">{alertaCobroExtra.extra}</p>
                  <p className="font-black text-3xl text-emerald-600">+ ${Number(alertaCobroExtra.monto).toFixed(2)}</p>
                </div>
              </div>
            </div>
            <button onClick={() => setAlertaCobroExtra(null)} className="w-full bg-orange-500 hover:bg-orange-600 text-white py-6 rounded-3xl font-black text-2xl shadow-xl shadow-orange-500/30 transition active:scale-95 flex items-center justify-center gap-3">
              <CheckCircle2 size={32} /> ¡Entendido, ya lo cobré!
            </button>
          </div>
        </div>
      )}  

      <ModalAperturaCaja fondoCaja={fondoCaja} iniciarTurno={iniciarTurno} inputFondo={inputFondo} setInputFondo={setInputFondo} />  
      <ModalPuntoVenta modalPuntoVenta={modalPuntoVenta} setModalPuntoVenta={setModalPuntoVenta} ordenEditandoRapida={ordenEditandoRapida} user={user} configGlobal={configGlobal} productos={productos} clasificaciones={clasificaciones} catalogoIngredientes={catalogoIngredientes} apiUrl={apiUrl} lanzarImpresion={lanzarImpresion} setModalPago={setModalPago} refrescarDatosCaja={cargarDataDinamica} onClose={() => setModalPuntoVenta(false)} empleadosPOS={empleadosPOS} mesas={mesas} />  
      <ModalIdentificar modalIdentificar={modalIdentificar} setModalIdentificar={setModalIdentificar} pasoIdentificar={pasoIdentificar} setPasoIdentificar={setPasoIdentificar} telClienteNuevo={telClienteNuevo} setTelClienteNuevo={setTelClienteNuevo} datosNuevoCliente={datosNuevoCliente} setDatosNuevoCliente={setDatosNuevoCliente} buscarClienteParaPedido={buscarClienteParaPedido} registrarClienteParaPedido={registrarClienteParaPedido} isSubmitting={isSubmitting} onGoToKiosco={onGoToKiosco} />  
      <ModalCompraRapida modalCompraRapida={modalCompraRapida} setModalCompraRapida={setModalCompraRapida} insumosDB={insumosDB} insumoComprar={insumoComprar} setInsumoComprar={setInsumoComprar} paquetesComprados={paquetesComprados} setPaquetesComprados={setPaquetesComprados} registrarCompraRapida={registrarCompraRapida} isSubmitting={isSubmitting} />
      <ModalAgregarExtra modalAgregarExtra={modalAgregarExtra} setModalAgregarExtra={setModalAgregarExtra} confirmarAgregarExtra={confirmarAgregarExtra} catalogoIngredientes={catalogoIngredientes} isSubmitting={isSubmitting} />
      <ModalZonaEnvio modalZonaEnvio={modalZonaEnvio} setModalZonaEnvio={setModalZonaEnvio} confirmarPedidoDomicilio={confirmarPedidoDomicilio} configGlobal={configGlobal} isSubmitting={isSubmitting} />
      <ModalResolver modalResolver={modalResolver} setModalResolver={setModalResolver} itemAfectadoIdx={itemAfectadoIdx} setItemAfectadoIdx={setItemAfectadoIdx} accionAlerta={accionAlerta} setAccionAlerta={setAccionAlerta} ingredienteReemplazo={ingredienteReemplazo} setIngredienteReemplazo={setIngredienteReemplazo} enviarRespuestaCocina={enviarRespuestaCocina} catalogoIngredientes={catalogoIngredientes} isSubmitting={isSubmitting} />
      <ModalPago modalPago={modalPago} setModalPago={setModalPago} procesarPago={procesarPago} isSubmitting={isSubmitting} />
      <ModalEditarPedido modalEditarPedido={modalEditarPedido} setModalEditarPedido={setModalEditarPedido} guardarEdicionPedido={guardarEdicionPedido} onGoToKiosco={onGoToKiosco} isSubmitting={isSubmitting} />
      <ModalVerDetalle modalVerDetalle={modalVerDetalle} setModalVerDetalle={setModalVerDetalle} />
      
      {/* 👇 NUEVO MODAL RENDERIZADO */}
      <ModalAsistencia modalAsistencia={modalAsistencia} setModalAsistencia={setModalAsistencia} apiUrl={apiUrl} setAlertaCaja={setAlertaCaja} />
    </>
  );
};  

export default ModalesCaja;