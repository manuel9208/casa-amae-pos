import React from 'react';  

const PasoIdentificarCliente = ({
    paso,
    setPaso,
    telefonoCliente,
    setTelefonoCliente,
    errorMsg,
    setErrorMsg,
    isSubmitting,
    buscarClienteRapido,
    datosNuevoCliente,
    setDatosNuevoCliente,
    registrarClienteRapido,
    setNombreOrden,
    setClienteAsignado
}) => {  

    if (paso === 'identificar') {
        return (
            <div className="flex-1 flex flex-col items-center justify-center p-4 md:p-8 animate-in zoom-in-95 overflow-y-auto">
                <div className="bg-white p-6 md:p-10 rounded-[40px] shadow-xl w-full max-w-md text-center border border-slate-100">
                    <span className="text-5xl md:text-6xl block mb-4 md:mb-6">👤</span>
                    <h2 className="text-2xl md:text-3xl font-black text-slate-800 mb-2 tracking-tight">Levantar Pedido</h2>
                    <p className="text-sm md:text-base text-slate-500 font-medium mb-6 md:mb-8">
                        Ingresa el celular del cliente para vincular sus puntos.
                    </p>  
                    <form onSubmit={buscarClienteRapido} className="mb-4">
                        <input
                            type="tel"
                            maxLength="10"
                            autoFocus
                            disabled={isSubmitting}
                            value={telefonoCliente}
                            onChange={e => {
                                setTelefonoCliente(e.target.value.replace(/\D/g, ''));
                                setErrorMsg('');
                            }}
                            className={`w-full bg-slate-50 border-2 rounded-2xl p-4 md:p-5 text-center text-2xl md:text-3xl font-black outline-none transition-all tracking-widest placeholder-slate-300 text-slate-800 ${errorMsg ? 'border-red-400 focus:border-red-500' : 'border-slate-200 focus:border-blue-500'}`}
                            placeholder="000 000 0000"
                        />
                        {errorMsg && (
                            <p className="text-red-500 font-bold text-xs md:text-sm mt-3 bg-red-50 p-2 rounded-lg">
                                {errorMsg}
                            </p>
                        )}
                        <button
                            type="submit"
                            disabled={telefonoCliente.length !== 10 || isSubmitting}
                            className="w-full mt-4 md:mt-6 bg-blue-600 hover:bg-blue-700 text-white py-4 md:py-5 rounded-2xl font-black text-lg md:text-xl shadow-lg shadow-blue-500/30 transition-all disabled:opacity-50 disabled:shadow-none active:scale-95"
                        >
                            {isSubmitting ? 'Buscando...' : 'Buscar Cliente'}
                        </button>
                    </form>  
                    
                    <button
                        type="button"
                        onClick={(e) => { 
                            e.preventDefault();
                            if (setClienteAsignado) setClienteAsignado(null);
                            setTelefonoCliente('');
                            // 👇 FIX: Lo dejamos en blanco en lugar de 'Invitado' para obligar al cajero a escribir
                            setNombreOrden(''); 
                            setPaso('menu'); 
                        }}
                        className="text-slate-400 hover:text-slate-600 font-bold text-xs md:text-sm underline mt-2 transition-colors p-2"
                    >
                        Continuar como Invitado
                    </button>
                </div>
            </div>
        );
    }  

    if (paso === 'registro') {
        return (
            <div className="flex-1 flex flex-col items-center justify-center p-4 md:p-8 animate-in slide-in-from-right overflow-y-auto">
                <form onSubmit={registrarClienteRapido} className="bg-white p-6 md:p-10 rounded-[40px] shadow-xl w-full max-w-md border border-slate-100 space-y-3 md:space-y-4">
                    <h2 className="text-xl md:text-2xl font-black text-slate-800 mb-4 md:mb-6 text-center">Nuevo Cliente</h2>  
                    <input
                        type="text"
                        required
                        autoFocus
                        disabled={isSubmitting}
                        value={datosNuevoCliente.nombre}
                        onChange={e => setDatosNuevoCliente({...datosNuevoCliente, nombre: e.target.value})}
                        className="w-full border p-3 md:p-4 rounded-xl font-bold text-sm md:text-base outline-none focus:border-blue-500 transition-colors bg-slate-50"
                        placeholder="Nombre *"
                    />
                    <input
                        type="text"
                        required
                        disabled={isSubmitting}
                        value={datosNuevoCliente.apellido}
                        onChange={e => setDatosNuevoCliente({...datosNuevoCliente, apellido: e.target.value})}
                        className="w-full border p-3 md:p-4 rounded-xl font-bold text-sm md:text-base outline-none focus:border-blue-500 transition-colors bg-slate-50"
                        placeholder="Apellido *"
                    />
                    <input
                        type="password"
                        maxLength="4"
                        required
                        disabled={isSubmitting}
                        value={datosNuevoCliente.nip}
                        onChange={e => setDatosNuevoCliente({...datosNuevoCliente, nip: e.target.value.replace(/\D/g, '')})}
                        className="w-full border p-3 md:p-4 rounded-xl font-black tracking-[0.5em] text-center text-sm md:text-base outline-none focus:border-blue-500 transition-colors bg-slate-50"
                        placeholder="NIP (4 dígitos) *"
                    />  
                    {errorMsg && (
                        <p className="text-red-500 text-xs md:text-sm font-bold text-center bg-red-50 p-2 rounded-lg">
                            {errorMsg}
                        </p>
                    )}  
                    <div className="flex gap-3 md:gap-4 pt-3 md:pt-4">
                        <button
                            type="button"
                            disabled={isSubmitting}
                            onClick={() => { setPaso('identificar'); setErrorMsg(''); }}
                            className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-600 py-3 md:py-4 rounded-xl font-black text-sm md:text-base transition-colors disabled:opacity-50"
                        >
                            Atrás
                        </button>
                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white py-3 md:py-4 rounded-xl font-black text-sm md:text-base shadow-lg shadow-emerald-500/30 transition-all active:scale-95 disabled:opacity-50"
                        >
                            {isSubmitting ? 'Guardando...' : 'Registrar'}
                        </button>
                    </div>
                </form>
            </div>
        );
    }  

    return null;
};  

export default PasoIdentificarCliente;