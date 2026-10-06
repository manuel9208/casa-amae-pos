// Única fuente de verdad para interpretar si un pedido está PAGADO.
// Nunca se infiere el pago desde estado_preparacion — siempre desde metodo_pago.
export const esPedidoPagado = (pedido) => {
  if (!pedido) return false;
  const metodosPagados = ['Efectivo', 'Tarjeta', 'Transferencia', 'Mixto', 'Puntos'];
  return metodosPagados.includes(pedido.metodo_pago);
};