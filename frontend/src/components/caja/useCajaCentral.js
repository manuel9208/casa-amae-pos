import { useState, useEffect, useCallback } from 'react';

const getMazatlanDateStr = () => {
    const formatter = new Intl.DateTimeFormat('es-MX', { timeZone: 'America/Mazatlan', year: 'numeric', month: '2-digit', day: '2-digit' });
    const parts = formatter.formatToParts(new Date());
    let dDay, dMonth, dYear;
    parts.forEach(part => {
        if(part.type === 'day') dDay = part.value;
        if(part.type === 'month') dMonth = part.value;
        if(part.type === 'year') dYear = part.value;
    });
    return `${dYear}-${dMonth}-${dDay}`;
};

export const useCajaCentral = (user, onLogout, onGoToKiosco) => {
  const [vistaActiva, setVistaActiva] = useState('por_confirmar');
  const [subVistaHistorial, setSubVistaHistorial] = useState('activos');
  const [isCajaBloqueada, setIsCajaBloqueada] = useState(true);
  const [operadorActual, setOperadorActual] = useState(user);

  useEffect(() => {
    if (user) setOperadorActual(user);
  }, [user]);

  const [pedidos, setPedidos] = useState([]);
  const [mesas, setMesas] = useState([]);
  const [productos, setProductos] = useState([]);
  const [clasificaciones, setClasificaciones] = useState([]);
  const [catalogoIngredientes, setCatalogoIngredientes] = useState([]);
  const [configGlobal, setConfigGlobal] = useState(null);
  const [empleadosPOS, setEmpleadosPOS] = useState([]);
  const [insumosDB, setInsumosDB] = useState([]);
  const [gastosDia, setGastosDia] = useState([]);

  const [pedidosAuditados, setPedidosAuditados] = useState(new Set());

  const [modalPago, setModalPago] = useState(null);
  const [montoRecibido, setMontoRecibido] = useState('');
  const [modalResolver, setModalResolver] = useState(null);
  const [itemAfectadoIdx, setItemAfectadoIdx] = useState(null);
  const [accionAlerta, setAccionAlerta] = useState('');
  const [ingredienteReemplazo, setIngredienteReemplazo] = useState('');
  const [ticketImprimir, setTicketImprimir] = useState(null);
  const [modalZonaEnvio, setModalZonaEnvio] = useState(null);
  const [modalVerDetalle, setModalVerDetalle] = useState(null);
  const [modalEditarPedido, setModalEditarPedido] = useState(null);
  const [modalCompraRapida, setModalCompraRapida] = useState(false);
  const [modalMermas, setModalMermas] = useState(false);
  const [insumoComprar, setInsumoComprar] = useState(null);
  const [paquetesComprados, setPaquetesComprados] = useState('');
  const [alertaCaja, setAlertaCaja] = useState(null);
  const [modalAgregarExtra, setModalAgregarExtra] = useState(null);
  const [alertaCobroExtra, setAlertaCobroExtra] = useState(null);
  const [modalAsistencia, setModalAsistencia] = useState(null);
  const [modalIdentificar, setModalIdentificar] = useState(false);
  const [pasoIdentificar, setPasoIdentificar] = useState(1);
  const [telClienteNuevo, setTelClienteNuevo] = useState('');
  const [datosNuevoCliente, setDatosNuevoCliente] = useState({ nombre: '', apellido: '', correo: '', fecha_nacimiento: '', nip: '', direccion: '' });
  const [modalPuntoVenta, setModalPuntoVenta] = useState(false);
  const [ordenEditandoRapida, setOrdenEditandoRapida] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [modalComedor, setModalComedor] = useState(false);

  const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:4000/api';
  const hoyStr = getMazatlanDateStr(); 

  const cargarDataDinamica = useCallback(async () => {
    try {
      const t = new Date().getTime();
      const [ resPed, resMesas, resInsumos, resGastos, resProd, resClas, resIng, resUsu, resCortes ] = await Promise.all([
        fetch(`${apiUrl}/pedidos/hoy?t=${t}`),
        fetch(`${apiUrl}/mesas?t=${t}`),
        fetch(`${apiUrl}/insumos?t=${t}`),
        fetch(`${apiUrl}/insumos/compras/hoy?t=${t}`),
        fetch(`${apiUrl}/productos?t=${t}`),
        fetch(`${apiUrl}/clasificaciones?t=${t}`),
        fetch(`${apiUrl}/ingredientes?t=${t}`),
        fetch(`${apiUrl}/usuarios?t=${t}`),
        fetch(`${apiUrl}/cortes/historial?fecha=${hoyStr}&completo=true`) 
      ]);

      const dataPed = await resPed.json();
      setPedidos(Array.isArray(dataPed) ? dataPed : []);

      const dataMesas = await resMesas.json();
      setMesas(Array.isArray(dataMesas) ? dataMesas : []);

      const dataInsumos = await resInsumos.json();
      setInsumosDB(Array.isArray(dataInsumos) ? dataInsumos : []);

      const dataGastos = await resGastos.json();
      setGastosDia(Array.isArray(dataGastos) ? dataGastos : []);

      // 👇 NUEVA LÓGICA: Evaluación en tiempo real de horarios para el Cajero
      const estaDisponiblePorHorario = (item) => {
        if (item.disponible === false || item.disponible === 'false' || item.disponible === 0) return false;
        if (item.usa_horario !== true && item.usa_horario !== 'true') return true;

        try {
          const ahora = new Date();
          let diaActual = ahora.getDay();
          diaActual = diaActual === 0 ? 7 : diaActual; // Convertir Domingo (0) a 7

          let dias = item.dias_disponibles;
          if (typeof dias === 'string') dias = JSON.parse(dias);
          if (!Array.isArray(dias)) return true; // Fallback de seguridad

          if (!dias.includes(diaActual)) return false;

          const minutosActuales = ahora.getHours() * 60 + ahora.getMinutes();
          const [hIni, mIni] = (item.hora_inicio || '00:00').split(':').map(Number);
          const [hFin, mFin] = (item.hora_fin || '23:59').split(':').map(Number);

          const minIni = hIni * 60 + mIni;
          const minFin = hFin * 60 + mFin;

          if (minIni <= minFin) {
              // Horario diurno (Ej: 08:00 a 14:00)
              if (minutosActuales < minIni || minutosActuales > minFin) return false;
          } else {
              // Horario cruzado/nocturno (Ej: 20:00 a 02:00)
              if (minutosActuales < minIni && minutosActuales > minFin) return false;
          }
          return true;
        } catch (e) {
          return true; // En caso de falla técnica, no esconder el producto
        }
      };

      const dataProd = await resProd.json();
      setProductos(Array.isArray(dataProd) ? dataProd.filter(estaDisponiblePorHorario) : []);

      const dataClas = await resClas.json();
      setClasificaciones(Array.isArray(dataClas) ? dataClas.filter(estaDisponiblePorHorario) : []);

      const dataIng = await resIng.json();
      setCatalogoIngredientes(Array.isArray(dataIng) ? dataIng : []);

      const dataUsu = await resUsu.json();
      setEmpleadosPOS(Array.isArray(dataUsu) ? dataUsu : []);

      if (resCortes.ok) {
          const dataCortes = await resCortes.json();
          const cortesArr = Array.isArray(dataCortes) ? dataCortes : (dataCortes && dataCortes.id ? [dataCortes] : []);
          let auditados = new Set();
          
          cortesArr.forEach(c => {
              let inc = [];
              try { inc = typeof c.pedidos_incluidos === 'string' ? JSON.parse(c.pedidos_incluidos) : c.pedidos_incluidos; } catch(e){}
              (inc || []).forEach(id => auditados.add(id));
          });
          
          setPedidosAuditados(auditados);
      }

    } catch (error) {
      console.error("Error cargando data dinámica:", error);
    }
  }, [apiUrl, hoyStr]);

  const [fondoCaja, setFondoCaja] = useState(null);
  const [inputFondo, setInputFondo] = useState('');
  const [turnoActivo, setTurnoActivo] = useState(null);

  useEffect(() => {
    if (operadorActual && apiUrl) {
        fetch(`${apiUrl}/cortes/historial?fecha=${hoyStr}&completo=true&t=${new Date().getTime()}`)
        .then(r => r.json())
        .then(dataCortes => {
            const cortesArr = Array.isArray(dataCortes) ? dataCortes : (dataCortes && dataCortes.id ? [dataCortes] : []);
            
            const misCortesHoy = cortesArr.filter(c => Number(c.usuario_id) === Number(operadorActual.id));
            
            if (misCortesHoy.length > 0) {
                misCortesHoy.sort((a, b) => Number(a.id) - Number(b.id));
                const ultimoEvento = misCortesHoy[misCortesHoy.length - 1];

                if (ultimoEvento.turno_cerrado === false && ultimoEvento.fondo_inicial !== null) {
                    setFondoCaja(Number(ultimoEvento.fondo_inicial));
                    setTurnoActivo(ultimoEvento); // 👇 NUEVO: Guardamos el turno para leer su hora de apertura
                } else {
                    setFondoCaja(null);
                    setTurnoActivo(null);
                }
            } else {
                setFondoCaja(null); 
            }
        }).catch(()=>{});
    }
  }, [operadorActual, apiUrl, hoyStr]);

  const iniciarTurno = async (e) => {
    e.preventDefault();
    const m = Number(inputFondo);
    try {
        await fetch(`${apiUrl}/usuarios/${operadorActual.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ fondo_actual: m })
        });

        await fetch(`${apiUrl}/cortes`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                fecha: hoyStr,
                usuario_id: operadorActual.id,
                fondo_inicial: m,
                turno_cerrado: false
            })
        });
        
        setFondoCaja(m);
        await cargarDataDinamica();
    } catch(err) {}
  };

  const [fondosRepartidores, setFondosRepartidores] = useState(() => {
    const guardado = localStorage.getItem(`fondos_repartidores_${hoyStr}`);
    return guardado ? JSON.parse(guardado) : {};
  });

  const actualizarFondoRepartidor = (repartidorId, valor) => {
    const num = Number(valor);
    const newFondos = { ...fondosRepartidores, [repartidorId]: isNaN(num) ? 0 : num };
    setFondosRepartidores(newFondos);
    localStorage.setItem(`fondos_repartidores_${hoyStr}`, JSON.stringify(newFondos));
  };

  const fondoRepartidorGlobal = Object.values(fondosRepartidores).reduce((sum, val) => sum + (Number(val) || 0), 0);

  useEffect(() => {
    const cargarConfig = async () => {
      try {
        const res = await fetch(`${apiUrl}/configuracion?t=${new Date().getTime()}`);
        const data = await res.json();
        if (data && !data.error) {
          setConfigGlobal(prev => {
            if (JSON.stringify(prev) !== JSON.stringify(data)) return data;
            return prev;
          });
          if (data.bloqueo_caja_activo !== true && data.bloqueo_caja_activo !== 'true') {
            setIsCajaBloqueada(false);
          }
        }
      } catch (error) {}
    };
    cargarConfig();
    cargarDataDinamica();

    const intervaloData = setInterval(cargarDataDinamica, 3000);
    const intervaloConfig = setInterval(cargarConfig, 3000);
    return () => {
      clearInterval(intervaloData);
      clearInterval(intervaloConfig);
    };
  }, [apiUrl, cargarDataDinamica]);

  useEffect(() => {
    if (!configGlobal) return;
    const isBloqueoGlobalOn = configGlobal.bloqueo_caja_activo === true || configGlobal.bloqueo_caja_activo === 'true';
    if (!isBloqueoGlobalOn || modalPuntoVenta || modalPago || modalCompraRapida || modalResolver || modalIdentificar || modalAsistencia || modalComedor || modalMermas) return;

    let timeout;
    const segundosLimite = configGlobal.bloqueo_caja_segundos || 30;

    const reiniciarTemporizador = () => {
      clearTimeout(timeout);
      if (!isCajaBloqueada && fondoCaja !== null) {
        timeout = setTimeout(() => setIsCajaBloqueada(true), segundosLimite * 1000);
      }
    };

    window.addEventListener('mousemove', reiniciarTemporizador);
    window.addEventListener('keydown', reiniciarTemporizador);
    window.addEventListener('touchstart', reiniciarTemporizador);
    window.addEventListener('click', reiniciarTemporizador);

    reiniciarTemporizador();

    return () => {
      clearTimeout(timeout);
      window.removeEventListener('mousemove', reiniciarTemporizador);
      window.removeEventListener('keydown', reiniciarTemporizador);
      window.removeEventListener('touchstart', reiniciarTemporizador);
      window.removeEventListener('click', reiniciarTemporizador);
    };
  }, [configGlobal, isCajaBloqueada, modalPuntoVenta, modalPago, modalCompraRapida, modalResolver, modalIdentificar, modalAsistencia, modalComedor, modalMermas, fondoCaja]);

  const mostrarAlertaCaja = (titulo, mensaje, tipo = 'success') => {
    setAlertaCaja({ titulo, mensaje, tipo });
    setTimeout(() => setAlertaCaja(null), 5000);
  };

  const cerrarCajaYSalir = async () => {
    onLogout();
  };

  const lanzarImpresion = async (pedido) => {
    setTicketImprimir(pedido);
    const modoImpresion = configGlobal?.ticket_modo_impresion || 'pdf';

    // Función auxiliar para quitar emojis y dejar solo texto limpio
    const stripEmojis = (str) => {
      return String(str || '')
        .replace(/([\u2700-\u27BF]|[\uE000-\uF8FF]|\uD83C[\uDC00-\uDFFF]|\uD83D[\uDC00-\uDFFF]|[\u2011-\u26FF]|\uD83E[\uDD10-\uDDFF])/g, '')
        .replace(/[⭐🔹🔸📝❌🔄]/g, '')
        .trim();
    };

    // Función maestra que arma el texto del ticket
    const construirTextoTicket = () => {
      let receipt = "";
      
      // Ajusta el texto sin cortarlo, haciéndolo saltar de línea si pasa los 32 caracteres (tamaño impresora 58mm)
      const formatearLinea = (texto, maxLen = 32, prefijo = '') => {
        if (!texto) return '';
        const words = String(texto).split(' ');
        let result = '';
        let currentLine = prefijo;

        words.forEach(word => {
          if ((currentLine + word).length > maxLen) {
            if (currentLine.trim() !== '') result += currentLine.trim() + '\n';
            currentLine = prefijo + word + ' ';
          } else {
            currentLine += word + ' ';
          }
        });
        if (currentLine.trim() !== '') result += currentLine.trim() + '\n';
        return result;
      };

      const center = (text) => {
        const str = String(text || '');
        if (str.length > 32) {
            return formatearLinea(str, 32); // Si es muy largo, lo centra dividiéndolo en líneas
        }
        const pad = Math.floor((32 - str.length) / 2);
        return " ".repeat(Math.max(0, pad)) + str + "\n";
      };

      // 1. Cabecera del Negocio
      receipt += center(stripEmojis(configGlobal?.nombre_negocio || 'Mi Negocio'));
      if (configGlobal?.ticket_domicilio) receipt += center(stripEmojis(configGlobal.ticket_domicilio));
      if (configGlobal?.whatsapp) receipt += center(`Tel: ${configGlobal.whatsapp}`);
      receipt += `--------------------------------\n`;
      
      // 2. Datos Generales de la Orden
      receipt += `TICKET: #${pedido.numero_pedido}\n`;
      receipt += `FECHA: ${new Date().toLocaleString('es-MX')}\n`;
      receipt += formatearLinea(stripEmojis(pedido.cliente_nombre || 'Invitado'), 32, 'CLIENTE: ');
      
      if (pedido.cliente_telefono) receipt += `TEL: ${pedido.cliente_telefono}\n`;
      
      // 👇 DIRECCIÓN COMPLETA SIN CORTES
      if (pedido.direccion_entrega) {
          receipt += formatearLinea(stripEmojis(pedido.direccion_entrega), 32, 'DIR: ');
      }

      receipt += `TIPO: ${stripEmojis(pedido.tipo_consumo)}\n`;
      if (pedido.mesa) receipt += `MESA: ${pedido.mesa}\n`;
      receipt += `--------------------------------\n`;

      // 3. Desglose del Carrito (Platillos y Extras COMPLETOS)
      const items = typeof pedido.carrito === 'string' ? JSON.parse(pedido.carrito) : pedido.carrito;
      
      items.forEach(item => {
        const cant = item.cantidad || 1;
        const nombreItem = stripEmojis(item.nombre);
        const precio = Number(item.precioFinal || 0).toFixed(2);
        
        // Fila del producto principal (Ej: "2x Pizza Pepperoni   $200.00")
        // Calculamos espacios para alinear el precio a la derecha
        const itemLineStart = `${cant}x ${nombreItem}`;
        const itemLineEnd = `$${precio}`;
        
        if ((itemLineStart.length + itemLineEnd.length + 1) <= 32) {
             const spaces = 32 - (itemLineStart.length + itemLineEnd.length);
             receipt += `${itemLineStart}${" ".repeat(Math.max(0, spaces))}${itemLineEnd}\n`;
        } else {
             // Si el nombre es muy largo, pone el nombre en una línea y el precio abajo a la derecha
             receipt += formatearLinea(itemLineStart, 32);
             const spaces = 32 - itemLineEnd.length;
             receipt += `${" ".repeat(Math.max(0, spaces))}${itemLineEnd}\n`;
        }

        // 👇 EXTRAS Y NOTAS SIN LIMITAR CARACTERES
        if (item.extras && item.extras.length > 0) {
          item.extras.forEach(ex => {
            const nombreExtra = stripEmojis(ex.nombre);
            // El prefijo "  + " da indentación visual para que se note que pertenece al platillo de arriba
            receipt += formatearLinea(nombreExtra, 32, '  + '); 
          });
        }
      });
      
      receipt += `--------------------------------\n`;
      
      // 4. Totales
      const costoEnvio = Number(pedido.costo_envio || 0);
      if (costoEnvio > 0) {
          const subtotal = Number(pedido.total) - costoEnvio;
          receipt += `SUBTOTAL: $${subtotal.toFixed(2)}\n`;
          receipt += `ENVIO: $${costoEnvio.toFixed(2)}\n`;
      }

      // Si pagó con Puntos, lo mostramos
      if (Number(pedido.descuento_puntos) > 0) {
          receipt += `PAGO C/ PUNTOS: -${pedido.descuento_puntos} pts\n`;
      }

      receipt += `TOTAL: $${Number(pedido.total).toFixed(2)}\n`;
      
      // 5. Pie de página
      if (configGlobal?.ticket_mensaje_final) {
          receipt += `\n`;
          receipt += center(stripEmojis(configGlobal.ticket_mensaje_final));
      }
      
      receipt += `\n\n\n\n`; 
      return receipt;
    };

    // Ejecución de la Impresión según la configuración (Igual que antes)
    if (modoImpresion === 'bluetooth') {
      setTimeout(() => setTicketImprimir(null), 1000);
    } else if (modoImpresion === 'rawbt_nativo') {
      try {
        const receipt = construirTextoTicket();
        const base64Data = btoa(unescape(encodeURIComponent(receipt)));
        const rawbtIntent = `intent:base64,${base64Data}#Intent;scheme=rawbt;package=ru.a402d.rawbtprinter;end;`;
        window.location.href = rawbtIntent;
        mostrarAlertaCaja('Imprimiendo', 'Abriendo la app RawBT para imprimir el ticket...', 'success');
      } catch (err) {
        mostrarAlertaCaja('Error de RawBT', 'No se pudo conectar con la aplicación de impresión instalada.', 'error');
      }
      setTimeout(() => setTicketImprimir(null), 1000);

    } else if (modoImpresion === 'traductor_silencioso') {
      try {
        const receipt = construirTextoTicket();

        const iframeName = "iframe_traductor_" + Date.now();
        const iframe = document.createElement("iframe");
        iframe.name = iframeName;
        iframe.style.display = "none";
        document.body.appendChild(iframe);

        const form = document.createElement("form");
        form.target = iframeName; 
        form.method = "POST";
        form.action = "http://127.0.0.1:4000/imprimir";
        form.enctype = "text/plain"; 
        form.style.display = "none";

        const input = document.createElement("input");
        input.type = "hidden";
        input.name = "---NUEVO TICKET---"; 
        input.value = "\n\n" + receipt; 

        form.appendChild(input);
        document.body.appendChild(form);

        form.submit();

        mostrarAlertaCaja('Enviado', 'Ticket inyectado al Traductor Silencioso con éxito.', 'success');

        setTimeout(() => {
          if (document.body.contains(form)) document.body.removeChild(form);
          if (document.body.contains(iframe)) document.body.removeChild(iframe);
        }, 2000);

      } catch (err) {
        mostrarAlertaCaja('Error', 'Fallo interno al enviar el texto del ticket.', 'error');
      }
      setTimeout(() => setTicketImprimir(null), 1000);

    } else {
      setTimeout(() => {
        window.print();
        const handleAfterPrint = () => {
          setTicketImprimir(null);
          window.removeEventListener('afterprint', handleAfterPrint);
        };
        window.addEventListener('afterprint', handleAfterPrint);
        setTimeout(handleAfterPrint, 1000);
      }, 1500);
    }
  };

  const toggleEstadoNegocio = async () => {
    try {
      const nuevoEstado = !configGlobal.negocio_abierto;
      const formData = new FormData();
      formData.append('negocio_abierto', nuevoEstado ? 'true' : 'false');
      const res = await fetch(`${apiUrl}/configuracion`, { method: 'PUT', body: formData });
      if (res.ok) setConfigGlobal({ ...configGlobal, negocio_abierto: nuevoEstado });
    } catch (e) {}
  };

  const procesarPago = async (estadoRechazo = null, esPostPago = false, pagosMixtos = null, puntosUsados = 0) => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    let estadoFinal;
    let metodoPagoFinal = pagosMixtos ? 'Mixto' : modalPago.metodo_pago;

    if (estadoRechazo) {
      estadoFinal = estadoRechazo;
    } else if (esPostPago) {
      estadoFinal = 'Pagado';
      metodoPagoFinal = 'Por Cobrar';
    } else {
      if (['Entregado', 'Listo', 'En Camino'].includes(modalPago.estado_preparacion)) {
        if (modalPago.tipo_consumo === 'Local' && modalPago.mesa) {
          estadoFinal = 'Entregado';
        } else {
          estadoFinal = 'Finalizado';
        }
      } else if (['Pendiente', 'Por Confirmar'].includes(modalPago.estado_preparacion)) {
        estadoFinal = 'Pagado';
      } else {
        estadoFinal = modalPago.estado_preparacion;
      }
    }

    try {
      const payload = { estado_preparacion: estadoFinal, metodo_pago: metodoPagoFinal, cajero_id: operadorActual?.id };
      if (pagosMixtos) payload.pagos_mixtos = pagosMixtos;

      if (puntosUsados > 0) {
          payload.descuento_puntos = puntosUsados;
          payload.cliente_id = modalPago.cliente_id;
      }

      if (puntosUsados > 0 && modalPago.cliente_id) {
          try {
              await fetch(`${apiUrl}/pedidos/${modalPago.id}`, {
                  method: 'PUT',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ 
                      descuento_puntos: puntosUsados, 
                      cliente_id: modalPago.cliente_id,
                      metodo_pago: metodoPagoFinal
                  })
              });
          } catch (err) {
              console.warn("Aviso: Fallo al inyectar puntos en la ruta principal", err);
          }
      }

      const res = await fetch(`${apiUrl}/pedidos/${modalPago.id}/estado`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload)
      });

      if (res.ok) {
        if (!estadoRechazo && !esPostPago && configGlobal?.ticket_impresion_activa) lanzarImpresion(modalPago);
        
        if (puntosUsados > 0) {
            mostrarAlertaCaja('Cobro Exitoso', `Se descontaron ${puntosUsados} puntos del monedero del cliente.`, 'success');
        }

        setModalPago(null);
        setMontoRecibido('');
        await cargarDataDinamica();
      } else {
        const errData = await res.json().catch(() => ({}));
        mostrarAlertaCaja('Error de Servidor', errData.error || 'El backend rechazó el pago.', 'error');
      }
    } catch (error) {
      mostrarAlertaCaja('Error de Red', 'Problema de conexión al procesar el pago.', 'error');
    }
    setIsSubmitting(false);
  };

  const liquidarPedidoRepartidor = async (pedidoIds) => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    try {
      const idsArray = Array.isArray(pedidoIds) ? pedidoIds : [pedidoIds];
      const promesas = idsArray.map(id =>
        fetch(`${apiUrl}/pedidos/${id}/estado`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ estado_preparacion: 'Liquidado', metodo_pago: 'Efectivo', cajero_id: operadorActual?.id })
        })
      );
      const results = await Promise.all(promesas);
      const todosOk = results.every(res => res.ok);
      if (todosOk) {
        await cargarDataDinamica();
        mostrarAlertaCaja('Liquidación Exitosa', `Se ha asentado el efectivo en caja.`, 'success');
      } else {
        mostrarAlertaCaja('Error Parcial', 'Algunas órdenes no se pudieron liquidar.', 'error');
        await cargarDataDinamica();
      }
    } catch (error) {
        mostrarAlertaCaja('Error de Red', 'Problema de conexión.', 'error');
    }
    setIsSubmitting(false);
  };

  const actualizarEstadoPedido = async (pedidoOId, nuevoEstado, extraData = {}) => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    const idReal = typeof pedidoOId === 'object' ? pedidoOId.id : pedidoOId;
    const pedidoFull = typeof pedidoOId === 'object' ? pedidoOId : pedidos.find(p => p.id === idReal);
    let estadoSeguro = nuevoEstado;
    if (nuevoEstado === 'Preparando' && (!pedidoFull || !pedidoFull.chef_id)) {
      estadoSeguro = 'Pagado';
    }

    if (estadoSeguro === 'Entregado' && pedidoFull?.tipo_consumo === 'Local' && !pedidoFull?.mesa) {
        estadoSeguro = 'Finalizado';
    }
    
    try {
      let payload = { estado_preparacion: estadoSeguro, ...extraData };
      if (estadoSeguro === 'Entregado' && pedidoFull?.metodo_pago === 'Por Cobrar') {
      } else if (estadoSeguro === 'Finalizado' && pedidoFull?.metodo_pago === 'Por Cobrar') {
        payload.metodo_pago = 'Por Cobrar';
      }
      const res = await fetch(`${apiUrl}/pedidos/${idReal}/estado`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload)
      });
      if (res.ok) {
        await cargarDataDinamica();
      }
    } catch (error) {}
    setIsSubmitting(false);
  };

  const forzarLiberacionMesas = async (arrayMesasOcupadas) => {
    setIsSubmitting(true);
    try {
      const promesas = arrayMesasOcupadas.map(m =>
        fetch(`${apiUrl}/mesas/${m.id}/estado`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ estado: 'Libre' })
        })
      );
      await Promise.all(promesas);
      await cargarDataDinamica();
    } catch(e) {}
    setIsSubmitting(false);
  };

  const confirmarPedidoRecoger = async (id) => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    try {
      const pedidoRecoger = pedidos.find(p => p.id === id);
      let metodoPagoAjustado = pedidoRecoger?.metodo_pago;

      if (metodoPagoAjustado === 'Efectivo') {
          metodoPagoAjustado = 'Por Cobrar';
      }

      await fetch(`${apiUrl}/pedidos/${id}/estado`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' }, 
        body: JSON.stringify({ 
            estado_preparacion: 'Pagado', 
            metodo_pago: metodoPagoAjustado, 
            cajero_id: operadorActual?.id 
        }) 
      });
      await cargarDataDinamica();
    } catch (error) {}
    setIsSubmitting(false);
  };

  const confirmarPedidoDomicilio = async (pedidoModificado) => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    try {
      const { costo_envio } = pedidoModificado;
      const t = Number(pedidoModificado.total) + Number(costo_envio);
      
      let metodoPagoAjustado = pedidoModificado.metodo_pago;

      if (metodoPagoAjustado === 'Efectivo') {
          metodoPagoAjustado = 'Por Cobrar';
      }

      await fetch(`${apiUrl}/pedidos/${pedidoModificado.id}/estado`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' }, 
        body: JSON.stringify({ 
            estado_preparacion: 'Pagado', 
            metodo_pago: metodoPagoAjustado, 
            costo_envio, 
            total: t, 
            cajero_id: operadorActual?.id 
        }) 
      });
      setModalZonaEnvio(null);
      await cargarDataDinamica();
    } catch (error) {}
    setIsSubmitting(false);
  };

  const limpiarAlerta = async (id) => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    try {
      await fetch(`${apiUrl}/pedidos/${id}/alerta`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ alerta_cocina: null })
      });
      await cargarDataDinamica();
    } catch(e) {}
    setIsSubmitting(false);
  };

  const abrirModalResolver = (pedido) => {
    setModalResolver(pedido);
    setItemAfectadoIdx('');
    setAccionAlerta('');
    setIngredienteReemplazo('');
  };

  const confirmarAgregarExtra = async (pedidoOriginal, idxItem, extraObj) => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    try {
      const items = typeof pedidoOriginal.carrito === 'string' ? JSON.parse(pedidoOriginal.carrito) : pedidoOriginal.carrito;
      const itemReal = items[idxItem];
      itemReal.extras = itemReal.extras || [];
      itemReal.extras.push({ nombre: extraObj.nombre, precioExtra: extraObj.precio_extra || extraObj.precioExtra || 0, tipo: 'extra' });
      itemReal.precioFinal = (Number(itemReal.precioFinal) + Number(extraObj.precio_extra || extraObj.precioExtra || 0)).toFixed(2);
      const nuevoTotal = (Number(pedidoOriginal.total) + Number(extraObj.precio_extra || extraObj.precioExtra || 0)).toFixed(2);
      await fetch(`${apiUrl}/pedidos/${pedidoOriginal.id}/estado`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ carrito: items, total: nuevoTotal, estado_preparacion: pedidoOriginal.estado_preparacion })
      });
      setModalAgregarExtra(null);
      setAlertaCobroExtra({ orden: pedidoOriginal.numero_pedido, platillo: itemReal.nombre, extra: extraObj.nombre, monto: extraObj.precio_extra || extraObj.precioExtra || 0 });
      await cargarDataDinamica();
    } catch(e) {}
    setIsSubmitting(false);
  };

  const registrarCompraRapida = async (payload) => {
    if (isSubmitting) return; setIsSubmitting(true);
    
    try {  
      // 👇 NUEVO: Enrutador Inteligente (Proveedor Múltiple vs Caja Individual)
      if (payload.tipo_compra === 'proveedor_multi') {
        
        // Enviamos la factura a la nueva tabla de gastos (Quedará Pendiente para el Admin)
        await fetch(`${apiUrl}/gastos-proveedores`, {
            method: 'POST', 
            headers: { 'Content-Type': 'application/json' }, 
            body: JSON.stringify({
                proveedor_id: payload.proveedor_id,
                cantidad_recibida: payload.cantidad_recibida,
                total_pago: payload.total_pago,
                origen: 'Caja',
                estado: 'Pendiente',
                usuario_id: operadorActual?.id,
                articulos_comprados: payload.articulos_comprados
            })
        });
        mostrarAlertaCaja("Recepción Exitosa", "La factura ha sido enviada a Administración para su aprobación y pago.", "success");
        if (setModalCompraRapida) setModalCompraRapida(false);

      } else {
        // Flujo Original: Compra rápida individual descontada directamente de Caja
        const payloadConUsuario = { ...payload, usuario_id: operadorActual?.id };  
        await fetch(`${apiUrl}/insumos/${payload.insumo_id}/comprar`, {
          method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payloadConUsuario)
        });
        mostrarAlertaCaja("Compra Registrada", "El gasto se ha descontado de la caja", "success");
      }

      setInsumoComprar(null);
      setPaquetesComprados('');
      await cargarDataDinamica();

    } catch(e) {
      mostrarAlertaCaja("Error", "Fallo de conexión al registrar la operación.", "error");
    }
    setIsSubmitting(false);
  };

  const enviarRespuestaCocina = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    if (isSubmitting) return; setIsSubmitting(true);
    try {
      const items = typeof modalResolver.carrito === 'string' ? JSON.parse(modalResolver.carrito) : modalResolver.carrito;
      let payloadEstado = { carrito: items, estado_preparacion: modalResolver.estado_preparacion };
      let textoRespuesta = 'CAJA RESPONDE: Revisado.';
      if (accionAlerta === 'cancelar') {
        payloadEstado.estado_preparacion = 'Cancelado';
        textoRespuesta = 'CAJA RESPONDE: Se canceló todo el pedido.';
        if (modalResolver.mesa) {
          const tableObj = mesas.find(m => String(m.numero_mesa) === String(modalResolver.mesa));
          if (tableObj) {
            await fetch(`${apiUrl}/mesas/${tableObj.id}/estado`, {
              method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ estado: 'Libre' })
            });
          }
        }
      } else if (accionAlerta === 'quitar') {
        items[itemAfectadoIdx].extras = items[itemAfectadoIdx].extras || [];
        items[itemAfectadoIdx].extras.push({ nombre: `❌ SIN ingrediente faltante`, precioExtra: 0 });
        textoRespuesta = 'CAJA RESPONDE: El cliente aceptó quitarlo.';
      } else if (accionAlerta === 'cambiar') {
        items[itemAfectadoIdx].extras = items[itemAfectadoIdx].extras || [];
        items[itemAfectadoIdx].extras.push({ nombre: `🔄 Cambiar por: ${ingredienteReemplazo}`, precioExtra: 0 });
        textoRespuesta = `CAJA RESPONDE: Cambiar por ${ingredienteReemplazo}.`;
      } else if (accionAlerta === 'aceptar') {
        textoRespuesta = 'CAJA RESPONDE: El cliente aceptó tu propuesta.';
      }
      await fetch(`${apiUrl}/pedidos/${modalResolver.id}/estado`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payloadEstado)
      });
      await fetch(`${apiUrl}/pedidos/${modalResolver.id}/alerta`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ alerta_cocina: textoRespuesta })
      });
      setModalResolver(null); setItemAfectadoIdx(''); setAccionAlerta(''); setIngredienteReemplazo('');
      await cargarDataDinamica();
    } catch (error) {}
    setIsSubmitting(false);
  };

  const guardarEdicionPedido = async (id, nuevosDatos) => {
    setIsSubmitting(true);
    try {
      const pedidoRef = pedidos.find(p => p.id === id);
      if (pedidoRef) {
        const carritoArray = typeof pedidoRef.carrito === 'string' ? JSON.parse(pedidoRef.carrito) : (pedidoRef.carrito || []);
        
        const mergeSeguro = (nuevo, original) => {
            if (nuevo === undefined || nuevo === null) return original;
            if (typeof nuevo === 'string' && nuevo.trim() === '') {
                return (original !== null && original !== undefined && original !== '') ? original : nuevo;
            }
            return nuevo;
        };

        const paqueteCompleto = {
          cliente_id: mergeSeguro(nuevosDatos.cliente_id, pedidoRef.cliente_id),
          cliente_nombre: mergeSeguro(nuevosDatos.cliente_nombre, pedidoRef.cliente_nombre),
          cliente_telefono: mergeSeguro(nuevosDatos.cliente_telefono, pedidoRef.cliente_telefono),
          tipo_consumo: mergeSeguro(nuevosDatos.tipo_consumo, pedidoRef.tipo_consumo),
          metodo_pago: mergeSeguro(nuevosDatos.metodo_pago, pedidoRef.metodo_pago),
          origen: mergeSeguro(nuevosDatos.origen, pedidoRef.origen),
          direccion_entrega: mergeSeguro(nuevosDatos.direccion_entrega, pedidoRef.direccion_entrega),
          estado_preparacion: mergeSeguro(nuevosDatos.estado_preparacion, pedidoRef.estado_preparacion),
          mesa: mergeSeguro(nuevosDatos.mesa, pedidoRef.mesa),
          
          carrito: nuevosDatos.carrito !== undefined ? nuevosDatos.carrito : carritoArray,
          
          total: mergeSeguro(nuevosDatos.total, pedidoRef.total),
          costo_envio: mergeSeguro(nuevosDatos.costo_envio, pedidoRef.costo_envio),
          descuento_puntos: pedidoRef.descuento_puntos,
          cupon_codigo: pedidoRef.cupon_codigo
        };

        const res = await fetch(`${apiUrl}/pedidos/${id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(paqueteCompleto)
        });

        if(res.ok) {
          setModalEditarPedido(null);
          await cargarDataDinamica(); 
          mostrarAlertaCaja('Edición Exitosa', 'Los cambios se han guardado correctamente.', 'success');
        } else {
          mostrarAlertaCaja('Error', 'No se pudo guardar la edición.', 'error');
        }
      }
    } catch(e) {
      console.error("Error en guardarEdicionPedido:", e);
      mostrarAlertaCaja('Error', 'Fallo de conexión al editar.', 'error');
    }
    setIsSubmitting(false);
  };

  const onGoToKioscoLocal = (cliente, orden) => {
    setOrdenEditandoRapida(orden);
    setModalEditarPedido(null);
    setModalPuntoVenta(true);
  };

  const buscarClienteParaPedido = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const res = await fetch(`${apiUrl}/clientes`);
      const clientes = await res.json();
      const clienteEncontrado = clientes.find(c => c.telefono === telClienteNuevo);
      if (clienteEncontrado) {
        setModalIdentificar(false);
        onGoToKioscoLocal(clienteEncontrado, null);
      } else {
        setPasoIdentificar('registro');
      }
    } catch (error) {}
    setIsSubmitting(false);
  };

  const registrarClienteParaPedido = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const res = await fetch(`${apiUrl}/clientes/registro`, { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({telefono: telClienteNuevo, ...datosNuevoCliente}) });
      const data = await res.json();
      if (res.ok) {
        setModalIdentificar(false);
        onGoToKioscoLocal(data.cliente || data.data || data, null);
      }
    } catch (error) {}
    setIsSubmitting(false);
  };

  const abrirIdentificador = () => {
    setOrdenEditandoRapida(null);
    setModalPuntoVenta(true);
  };

  const pedidosPorConfirmar = pedidos.filter(p => p.estado_preparacion === 'Pendiente' && p.origen !== 'Caja');

  const pendientesDePago = pedidos.filter(p => {
    if (['Cancelado', 'Finalizado'].includes(p.estado_preparacion)) return false;
    if (p.tipo_consumo === 'Domicilio' && ['Listo', 'En Camino', 'Entregado'].includes(p.estado_preparacion)) return false;
    if (p.estado_preparacion === 'Pendiente' && p.origen !== 'Caja') return false;
    const noPagado = ['Por Cobrar', 'Pendiente'].includes(p.metodo_pago);
    if (!noPagado) return false;
    return true;
  });

  const listosParaEntregar = pedidos.filter(p => p.estado_preparacion === 'Listo');

  const mesasPagadas = pedidos.filter(p =>
    p.tipo_consumo === 'Local' &&
    p.metodo_pago !== 'Comida Personal' &&
    p.estado_preparacion === 'Entregado' &&
    p.estado_preparacion !== 'Cancelado' &&
    p.estado_preparacion !== 'Finalizado'
  );

  const pedidosPorLiquidar = pedidos.filter(p =>
    p.tipo_consumo === 'Domicilio' &&
    (
      p.estado_preparacion === 'En Camino' ||
      (p.estado_preparacion === 'Entregado' && ['Pendiente', 'Por Cobrar'].includes(p.metodo_pago))
    )
  );

  const pedidosConAlerta = pedidos.filter(p => p.alerta_cocina && !['Entregado', 'Cancelado'].includes(p.estado_preparacion));

  // 👇 NUEVO: Filtramos los gastos para aislar solo los de este cajero en su turno actual
  const gastosTurnoActivo = gastosDia.filter(g => {
      if (Number(g.usuario_id) !== Number(operadorActual?.id)) return false;
      
      // Si la base de datos devuelve timestamps, aseguramos que el gasto sea de DESPUÉS de abrir caja
      if (turnoActivo && turnoActivo.created_at && g.created_at) {
          return new Date(g.created_at).getTime() >= new Date(turnoActivo.created_at).getTime();
      }
      return true; 
  });

  return {
    vistaActiva, setVistaActiva, subVistaHistorial, setSubVistaHistorial,
    pedidos, mesas, catalogoIngredientes, configGlobal, insumosDB, gastosDia, 
    gastosTurnoActivo, turnoActivo,
    modalPago, setModalPago, montoRecibido, setMontoRecibido,
    modalResolver, setModalResolver, itemAfectadoIdx, setItemAfectadoIdx,
    accionAlerta, setAccionAlerta, ingredienteReemplazo, setIngredienteReemplazo,
    ticketImprimir, modalZonaEnvio, setModalZonaEnvio,
    modalVerDetalle, setModalVerDetalle, modalEditarPedido, setModalEditarPedido,
    modalCompraRapida, setModalCompraRapida,
    modalMermas, setModalMermas,
    insumoComprar, setInsumoComprar,
    paquetesComprados, setPaquetesComprados, alertaCaja, setAlertaCaja,
    modalAgregarExtra, setModalAgregarExtra, alertaCobroExtra, setAlertaCobroExtra,
    modalIdentificar, setModalIdentificar, pasoIdentificar, setPasoIdentificar,
    telClienteNuevo, setTelClienteNuevo, datosNuevoCliente, setDatosNuevoCliente,
    modalPuntoVenta, setModalPuntoVenta, ordenEditandoRapida, setOrdenEditandoRapida, modalComedor, setModalComedor, 
    productos, clasificaciones, empleadosPOS,
    isCajaBloqueada, setIsCajaBloqueada, operadorActual, setOperadorActual,
    isSubmitting, fondoCaja, inputFondo, setInputFondo, 
    apiUrl, cargarDataDinamica,
    fondosRepartidores, actualizarFondoRepartidor, fondoRepartidorGlobal, liquidarPedidoRepartidor,
    modalAsistencia, setModalAsistencia,
    pedidosPorConfirmar, pendientesDePago, listosParaEntregar,
    pedidosPorLiquidar, mesasPagadas, pedidosConAlerta,
    buscarClienteParaPedido, registrarClienteParaPedido,
    toggleEstadoNegocio, cerrarCajaYSalir, iniciarTurno,
    lanzarImpresion, procesarPago, confirmarPedidoRecoger,
    confirmarPedidoDomicilio, actualizarEstadoPedido, guardarEdicionPedido,
    limpiarAlerta, abrirModalResolver, enviarRespuestaCocina,
    registrarCompraRapida, confirmarAgregarExtra, abrirIdentificador,
    onGoToKiosco: onGoToKioscoLocal,
    forzarLiberacionMesas,
    pedidosAuditados 
  };
};