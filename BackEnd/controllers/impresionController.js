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

        // Función para limpiar emojis (node-thermal-printer puede fallar si procesa emojis nativos)
        const stripEmojis = (str) => {
            return String(str || '')
                .replace(/([\u2700-\u27BF]|[\uE000-\uF8FF]|\uD83C[\uDC00-\uDFFF]|\uD83D[\uDC00-\uDFFF]|[\u2011-\u26FF]|\uD83E[\uDD10-\uDDFF])/g, '')
                .replace(/[⭐🔹🔸📝❌🔄]/g, '')
                .trim();
        };

        // 3. Armar el Ticket (Diseño ESC/POS)
        printer.alignCenter();
        printer.bold(true);
        printer.setTextSize(1, 1);
        printer.println(stripEmojis(configGlobal.nombre_negocio || 'TICKET DE VENTA'));
        printer.bold(false);
        printer.setTextNormal();  

        if (configGlobal.ticket_domicilio) {
            printer.println(stripEmojis(configGlobal.ticket_domicilio));
        }
        if (configGlobal.whatsapp) {
            printer.println(`Tel: ${stripEmojis(configGlobal.whatsapp)}`);
        }  
        printer.drawLine(); // ------------------------  

        printer.alignLeft();
        printer.println(`Ticket: #${pedido.numero_pedido}`);
        printer.println(`Fecha: ${new Date().toLocaleString('es-MX')}`);
        printer.println(`Cliente: ${stripEmojis(pedido.cliente_nombre || 'Invitado')}`);
        printer.println(`Tipo: ${stripEmojis(pedido.tipo_consumo)}`);
        
        if (pedido.mesa) {
            printer.println(`Mesa: ${stripEmojis(pedido.mesa)}`);  
        }

        // 👇 FIX CRÍTICO: INYECCIÓN DE LA DIRECCIÓN FALTANTE
        if (pedido.direccion_entrega) {
            printer.println(`DIR: ${stripEmojis(pedido.direccion_entrega)}`);
        }

        printer.drawLine();  

        // Lista de Platillos
        printer.tableCustom([
            { text:"Cant", align:"LEFT", width:0.15 },
            { text:"Desc", align:"LEFT", width:0.60 },
            { text:"Imp", align:"RIGHT", width:0.25 }
        ]);  

        const items = typeof pedido.carrito === 'string' ? JSON.parse(pedido.carrito) : (pedido.carrito || []);  

        items.forEach(item => {
            printer.tableCustom([
                { text: `${item.cantidad || 1}`, align:"LEFT", width:0.15 },
                { text: stripEmojis(item.nombre), align:"LEFT", width:0.60 },
                { text: `$${(item.precioFinal * (item.cantidad || 1)).toFixed(2)}`, align:"RIGHT", width:0.25 }
            ]);  

            // Imprimir extras del platillo si tiene
            if (item.extras && item.extras.length > 0) {
                item.extras.forEach(e => {
                    printer.println(`  + ${stripEmojis(e.nombre)}`);
                });
            }
        });  

        printer.drawLine();  

        // Totales y Pago
        printer.alignRight();
        printer.bold(true);
        printer.println(`TOTAL: $${Number(pedido.total).toFixed(2)}`);
        printer.bold(false);
        printer.println(`Pago: ${stripEmojis(pedido.metodo_pago)}`);  

        // 👇 MEJORA: Agregar desglose si el pago es Mixto
        if (pedido.metodo_pago === 'Mixto' && pedido.pagos_mixtos) {
            const pm = typeof pedido.pagos_mixtos === 'string' ? JSON.parse(pedido.pagos_mixtos) : pedido.pagos_mixtos;
            pm.forEach(x => {
                printer.println(` - ${stripEmojis(x.metodo)}: $${Number(x.monto).toFixed(2)}`);
            });
        }

        printer.alignCenter();
        printer.println(" ");
        printer.println(stripEmojis(configGlobal.ticket_mensaje_final || '¡Gracias por su compra!'));  

        if (configGlobal.ticket_firma_sistema) {
            printer.println(stripEmojis(configGlobal.ticket_firma_sistema));
        }  

        printer.cut();  

        // 4. Enviar los bytes a la impresora por red
        await printer.execute();
        printer.clear();  

        res.json({ success: true, message: 'Impresión exitosa' });  
    } catch (error) {
        console.error("Error crítico en impresión TCP:", error);
        res.status(500).json({ error: 'Fallo al procesar la impresión TCP' });
    }
};