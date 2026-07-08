const ThermalPrinter = require("node-thermal-printer").printer;
const PrinterTypes = require("node-thermal-printer").types;

exports.imprimirTicketIP = async (req, res) => {
  const { pedido, configGlobal } = req.body;

  if (!pedido || !configGlobal) {
    return res.status(400).json({ error: 'Faltan datos para imprimir.' });
  }

  try {
    // 1. Configurar conexión TCP hacia la IP de la impresora
    let printer = new ThermalPrinter({
      type: PrinterTypes.EPSON, // Compatible con el 95% de impresoras térmicas chinas y Epson
      interface: `tcp://${configGlobal.ticket_impresora_ip}:${configGlobal.ticket_impresora_puerto}`,
      characterSet: 'SLOVENIA', // Ideal para acentos en español
      removeSpecialCharacters: false
    });

    // 2. Verificar conexión en vivo
    const isConnected = await printer.isPrinterConnected();
    if (!isConnected) {
      console.error("Impresora no responde en la IP:", configGlobal.ticket_impresora_ip);
      return res.status(500).json({ error: 'Impresora IP inalcanzable.' });
    }

    // 3. Armar el Ticket (Diseño ESC/POS)
    printer.alignCenter();
    printer.bold(true);
    printer.setTextSize(1, 1);
    printer.println(configGlobal.nombre_negocio || 'TICKET DE VENTA');
    printer.bold(false);
    printer.setTextNormal();

    if (configGlobal.ticket_domicilio) {
      printer.println(configGlobal.ticket_domicilio);
    }
    if (configGlobal.whatsapp) {
      printer.println(`Tel: ${configGlobal.whatsapp}`);
    }

    printer.drawLine(); // ------------------------
    
    printer.alignLeft();
    printer.println(`Ticket: #${pedido.numero_pedido}`);
    printer.println(`Fecha: ${new Date().toLocaleString()}`);
    printer.println(`Cliente: ${pedido.cliente_nombre || 'Invitado'}`);
    printer.println(`Tipo: ${pedido.tipo_consumo}`);
    if (pedido.mesa) printer.println(`Mesa: ${pedido.mesa}`);
    
    printer.drawLine();
    
    // Lista de Platillos
    printer.tableCustom([
      { text:"Cant", align:"LEFT", width:0.15 },
      { text:"Desc", align:"LEFT", width:0.60 },
      { text:"Imp", align:"RIGHT", width:0.25 }
    ]);
    
    const items = typeof pedido.carrito === 'string' ? JSON.parse(pedido.carrito) : pedido.carrito;
    
    items.forEach(item => {
      printer.tableCustom([
        { text: `${item.cantidad || 1}`, align:"LEFT", width:0.15 },
        { text: item.nombre, align:"LEFT", width:0.60 },
        { text: `$${(item.precioFinal * (item.cantidad || 1)).toFixed(2)}`, align:"RIGHT", width:0.25 }
      ]);
      
      // Imprimir extras del platillo si tiene
      if (item.extras && item.extras.length > 0) {
        const extrasStr = item.extras.map(e => e.nombre).join(', ');
        printer.println(`  + ${extrasStr}`);
      }
    });

    printer.drawLine();
    
    // Totales
    printer.alignRight();
    printer.bold(true);
    printer.println(`TOTAL: $${Number(pedido.total).toFixed(2)}`);
    printer.bold(false);
    printer.println(`Pago: ${pedido.metodo_pago}`);
    
    printer.alignCenter();
    printer.println(" ");
    printer.println(configGlobal.ticket_mensaje_final || '¡Gracias por su compra!');
    
    if (configGlobal.ticket_firma_sistema) {
      printer.println(configGlobal.ticket_firma_sistema);
    }

    printer.cut();

    // 4. Enviar los bytes a la impresora por red
    await printer.execute();
    printer.clear();

    res.json({ success: true, message: 'Impresión exitosa' });

  } catch (error) {
    console.error("Error crítico en impresión:", error);
    res.status(500).json({ error: 'Fallo al procesar la impresión TCP' });
  }
};