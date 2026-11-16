// Canales. La app guarda el canal con el que se registró la venta; el plan
// estratégico habla de "canal de transacción" (gimnasio, venta directa,
// Mercado Libre, Shopify). Acá se traduce, sin inventar: una venta sin canal
// queda como 'sin_canal' y un canal desconocido como 'no_mapeado'.
//
// El mapeo es una PROPUESTA hasta que los socios la confirmen. Es distinto del
// origen de adquisición (Instagram, referido…), que no existe aún en la app.

export const SIN_CANAL = 'sin_canal';
export const NO_MAPEADO = 'no_mapeado';

export const MAPEO_CANALES = {
  'Arica directo': { codigo: 'venta_directa', estado: 'propuesta' },
  'Kiosco':        { codigo: 'gimnasio',      estado: 'propuesta' },
  'Shopify':       { codigo: 'shopify',       estado: 'confirmado' },
  'Mercado Libre': { codigo: 'mercado_libre', estado: 'confirmado' },
};

export const NOMBRE_CANAL = {
  gimnasio: 'Tienda gimnasio', venta_directa: 'Venta directa', mercado_libre: 'Mercado Libre',
  shopify: 'Shopify', sin_canal: 'Sin canal registrado', no_mapeado: 'Canal sin mapear',
};

export function canalTransaccion(linea, mapeo = MAPEO_CANALES) {
  const c = (linea?.canal || '').trim();
  if (!c) return SIN_CANAL;
  return mapeo[c]?.codigo || NO_MAPEADO;
}

// Ventas por canal de transacción: total, margen, líneas y transacciones
// (un pack = una transacción).
export function ventasPorCanalTransaccion(lineas, mapeo = MAPEO_CANALES) {
  const m = {};
  const vistos = new Set();
  lineas.forEach(v => {
    const k = canalTransaccion(v, mapeo);
    if (!m[k]) m[k] = { canal: k, nombre: NOMBRE_CANAL[k] || k, total: 0, margen: 0, lineas: 0, transacciones: 0 };
    m[k].total += v.total || 0;
    m[k].margen += v.margen || 0;
    m[k].lineas += 1;
    const tx = v.packId || v.id;
    if (!vistos.has(tx)) { vistos.add(tx); m[k].transacciones += 1; }
  });
  return Object.values(m).sort((a, b) => b.total - a.total);
}
