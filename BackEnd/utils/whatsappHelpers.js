// BackEnd/utils/whatsappHelpers.js
// =========================================================================
// 🧰 Helpers compartidos de WhatsApp — usados por whatsappController.js
// (webhook) y whatsappHerramientasController.js (function calling de la IA).
// Extraído a archivo propio para que ambos lo reutilicen sin duplicar código.
// =========================================================================

const normalizarTelefonoMX = (waId) => {
    let tel = String(waId || '').replace(/\D/g, '');
    if (tel.startsWith('52')) tel = tel.slice(2);
    if (tel.length === 11 && tel.startsWith('1')) tel = tel.slice(1);
    return tel;
};

const mensajePorEstado = (pedido) => {
    const map = {
        'Pendiente': `Tu pedido #${pedido.numero_pedido} está en espera de confirmación. 🕒`,
        'Por Confirmar': `Tu pedido #${pedido.numero_pedido} está en espera de confirmación. 🕒`,
        'Pagado': `Tu pedido #${pedido.numero_pedido} fue confirmado y ya va hacia cocina. ✅`,
        'Preparando': `¡Tu pedido #${pedido.numero_pedido} se está preparando ahora mismo! 🔥`,
        'Listo': pedido.tipo_consumo === 'Domicilio'
            ? `¡Tu pedido #${pedido.numero_pedido} ya está listo, en breve sale con el repartidor! 🛵`
            : `¡Tu pedido #${pedido.numero_pedido} ya está listo para recoger/entregar! 🍔`,
        'En Camino': `¡Tu pedido #${pedido.numero_pedido} va en camino hacia tu domicilio! 🛵`,
        'Entregado': `Tu pedido #${pedido.numero_pedido} ya fue entregado. ¡Gracias por tu compra! 🙌`,
        'Finalizado': `Tu pedido #${pedido.numero_pedido} ya fue entregado. ¡Gracias por tu compra! 🙌`,
        'Cancelado': `Tu pedido #${pedido.numero_pedido} fue cancelado. Si tienes dudas, contáctanos directamente.`,
        'Liquidado': `Tu pedido #${pedido.numero_pedido} ya fue entregado y liquidado. ¡Gracias por tu compra! 🙌`
    };
    return map[pedido.estado_preparacion] || `Tu pedido #${pedido.numero_pedido} está en estado: ${pedido.estado_preparacion}.`;
};

const enviarTextoLibreWhatsApp = async (waPhoneId, waApiToken, telefonoDestinoE164, texto) => {
    try {
        const payload = {
            messaging_product: 'whatsapp',
            recipient_type: 'individual',
            to: telefonoDestinoE164,
            type: 'text',
            text: { body: texto }
        };
        const resp = await fetch(`https://graph.facebook.com/${process.env.META_GRAPH_VERSION || 'v17.0'}/${waPhoneId}/messages`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${waApiToken}`, 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        const data = await resp.json();
        if (data.error) {
            console.error('⚠️ Meta rechazó el mensaje de texto libre:', data.error.message);
            return false;
        }
        return true;
    } catch (e) {
        console.error('Error de red al enviar texto libre de WhatsApp:', e.message);
        return false;
    }
};

// 🆕 FASE 4 — Envío por 360dialog (Cloud API v2: mismo payload que Meta, distinto host y header)
const enviarTextoLibre360Dialog = async (dialogApiKey, telefonoDestino, texto) => {
    try {
        const resp = await fetch('https://waba-v2.360dialog.io/messages', {
            method: 'POST',
            headers: { 'D360-API-KEY': dialogApiKey, 'Content-Type': 'application/json' },
            body: JSON.stringify({
                messaging_product: 'whatsapp',
                recipient_type: 'individual',
                to: telefonoDestino,
                type: 'text',
                text: { body: texto }
            })
        });
        const data = await resp.json();
        if (data.error || data.errors) {
            console.error('⚠️ 360dialog rechazó el mensaje:', JSON.stringify(data.error || data.errors));
            return false;
        }
        return true;
    } catch (e) {
        console.error('Error de red al enviar texto por 360dialog:', e.message);
        return false;
    }
};

// 🆕 FASE 4 — Despachador: `config` es la fila de whatsapp_configuraciones de ESA empresa.
// Baileys no se envía desde aquí: lo gestiona su propio gestor de sesión (Fase 4b).
const enviarTextoPorProveedor = async (config, telefonoDestino, texto) => {
    if (!config) return false;
    if (config.proveedor === 'meta') {
        return enviarTextoLibreWhatsApp(config.meta_phone_id, config.meta_api_token, telefonoDestino, texto);
    }
    if (config.proveedor === '360dialog') {
        return enviarTextoLibre360Dialog(config.dialog360_token, telefonoDestino, texto);
    }
    if (config.proveedor === 'baileys') {
        // carga perezosa: evita dependencia circular (manager -> router -> helpers)
        return require('./whatsappBaileysManager').enviarTexto(config.empresa_id, telefonoDestino, texto);
    }
    return false;
};

module.exports = {
    normalizarTelefonoMX,
    mensajePorEstado,
    enviarTextoLibreWhatsApp,
    enviarTextoLibre360Dialog,
    enviarTextoPorProveedor
};