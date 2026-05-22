import React from 'react';

const PantallaRegistro = ({
  pasoTelefono, setPasoTelefono, tipoConsumo, isSubmitting, telefonoRecoger, setTelefonoRecoger, 
  setPantallaActual, seleccionarPago, nombreOrden, setNombreOrden, continuarDesdeNombre
}) => {
  
  if (pasoTelefono) {
    return (
        <div className="max-w-xl mx-auto mt-10 text-center animate-in zoom-in">
            <span className="text-6xl block mb-6">📱</span>
            <h2 className="text-3xl font-black mb-2 texto-destacado">Datos de Contacto</h2>
            <p className="text-slate-500 font-medium mb-8">
              {tipoConsumo === 'Domicilio' 
                ? 'Ingresa un celular para que el repartidor pueda contactarte.'
                : 'Ingresa un celular para confirmar tu pedido.'}
            </p>
            <input 
                type="tel" maxLength="10" required autoFocus disabled={isSubmitting}
                value={telefonoRecoger} 
                onChange={(e) => setTelefonoRecoger(e.target.value.replace(/\D/g, ''))}
                className="w-full bg-white border-2 border-slate-200 rounded-3xl p-6 text-center text-3xl font-black outline-none focus:border-blue-500 shadow-sm text-slate-800 disabled:opacity-50"
                placeholder="6721234567"
            />
            <div className="flex gap-4 mt-8">
                <button 
                    disabled={isSubmitting} 
                    onClick={() => { 
                        setPasoTelefono(false); 
                        if (tipoConsumo === 'Domicilio') setPantallaActual('direccion');
                        else setPantallaActual('consumo'); 
                    }} 
                    className="flex-1 bg-slate-100 text-slate-600 py-4 rounded-2xl font-bold hover:bg-slate-200 transition disabled:opacity-50"
                >
                    Atrás
                </button>
                <button 
                    disabled={telefonoRecoger.length !== 10 || isSubmitting} 
                    onClick={() => {
                        if (tipoConsumo === 'Domicilio') {
                            setPasoTelefono(false);
                            setPantallaActual('pago');
                        } else {
                            seleccionarPago('Pendiente');
                        }
                    }}
                    className="flex-[2] bg-blue-600 text-white py-4 rounded-2xl font-black text-lg shadow-lg hover:bg-blue-700 disabled:opacity-50 transition active:scale-95"
                >
                    {isSubmitting ? 'Procesando...' : (tipoConsumo === 'Domicilio' ? 'Continuar al Pago' : 'Confirmar Pedido')}
                </button>
            </div>
        </div>
    );
  }

  // Si no es paso telefono, es pedir_nombre
  return (
    <div className="max-w-xl mx-auto mt-10 text-center animate-in slide-in-from-bottom-4">
      <div className="flex justify-start mb-6">
         <button 
             onClick={() => setPantallaActual('consumo')} 
             className="bg-white px-6 py-3 rounded-full shadow-sm font-bold text-slate-500 hover:text-slate-800 border border-slate-200 transition"
         >
             ⬅ Volver
         </button>
      </div>
      <span className="text-6xl block mb-6">👤</span>
      <h2 className="text-3xl font-black mb-2 texto-destacado">¿A nombre de quién es el pedido?</h2>
      <p className="text-slate-500 font-medium mb-8">Para identificarte fácilmente y llamarte cuando esté listo.</p>

      <input
          type="text" required autoFocus disabled={isSubmitting}
          value={nombreOrden} onChange={(e) => setNombreOrden(e.target.value)}
          className="w-full bg-white border-2 border-slate-200 rounded-3xl p-6 text-center text-3xl font-black outline-none focus:border-blue-500 shadow-sm text-slate-800 disabled:opacity-50"
          placeholder="Ej. Juan Pérez"
      />

      <div className="flex gap-4 mt-8">
          <button 
              disabled={!nombreOrden.trim() || isSubmitting} 
              onClick={continuarDesdeNombre} 
              className="w-full bg-blue-600 text-white py-4 rounded-2xl font-black text-lg shadow-lg hover:bg-blue-700 disabled:opacity-50 transition active:scale-95"
          >
              Continuar
          </button>
      </div>
    </div>
  );
};

export default PantallaRegistro;