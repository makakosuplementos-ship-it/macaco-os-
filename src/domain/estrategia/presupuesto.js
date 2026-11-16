// Presupuesto. Los montos NO viven en el código (repositorio público): se
// guardan en macaco:estrategia como `pre:<id>`. Acá solo está la lista de
// partidas y las reglas.
//
// Reglas:
// - monto null = pendiente. Nunca se trata como 0. El 0 solo existe si alguien
//   lo confirmó (por ejemplo, el sueldo del socio operador al inicio).
// - lo anualizado es ilustrativo (mensual × 12), no un presupuesto validado, y
//   no incluye partidas con vigencia limitada (anualizable: false).
// - el punto de equilibrio es PARCIAL: usa el margen bruto, no el de
//   contribución, y solo los gastos conocidos.

export const PLANTILLA_PRESUPUESTO = [
  { id: 'arriendo-gimnasio',     categoria: 'Arriendo tienda gimnasio',                tipo: 'fijo',     centro: 'gimnasio' },
  { id: 'contador',              categoria: 'Contador / administración',               tipo: 'fijo',     centro: 'corporativo' },
  { id: 'servicios-internet',    categoria: 'Servicios e internet',                    tipo: 'fijo',     centro: 'corporativo' },
  { id: 'shopify-suscripciones', categoria: 'Shopify, aplicaciones y suscripciones',   tipo: 'fijo',     centro: 'corporativo' },
  { id: 'publicidad',            categoria: 'Publicidad mensual prevista',             tipo: 'variable', centro: 'corporativo' },
  { id: 'sueldo-socio',          categoria: 'Sueldo fijo del socio operador',          tipo: 'fijo',     centro: 'corporativo', anualizable: false },
  // Pendientes de definir (el monto queda en null hasta que se confirme):
  { id: 'otros-fijos',           categoria: 'Otros gastos fijos',                      tipo: 'fijo',     centro: 'corporativo' },
  { id: 'habilitacion',          categoria: 'Costo único de habilitación',             tipo: 'inversion', centro: 'gimnasio' },
  { id: 'comisiones-canal',      categoria: 'Comisiones por canal',                    tipo: 'variable', centro: 'corporativo' },
  { id: 'envios-canal',          categoria: 'Envíos por canal',                        tipo: 'variable', centro: 'corporativo' },
  { id: 'devoluciones',          categoria: 'Devoluciones',                            tipo: 'variable', centro: 'corporativo' },
  { id: 'pasarelas-pago',        categoria: 'Pasarelas de pago',                       tipo: 'variable', centro: 'corporativo' },
  { id: 'impuestos',             categoria: 'Impuestos',                               tipo: 'variable', centro: 'corporativo' },
  { id: 'deuda-vencimientos',    categoria: 'Deuda y vencimientos',                    tipo: 'fijo',     centro: 'corporativo' },
  { id: 'remuneraciones-futuras', categoria: 'Remuneraciones futuras',                 tipo: 'fijo',     centro: 'corporativo' },
  { id: 'capital-trabajo',       categoria: 'Capital de trabajo',                      tipo: 'inversion', centro: 'corporativo' },
  { id: 'presupuesto-compras',   categoria: 'Presupuesto de compras',                  tipo: 'inversion', centro: 'corporativo' },
];

// Plantilla + lo guardado. Una partida guardada pisa solo los campos que trae.
export function lineasPresupuesto(estrategia = {}) {
  const guardadas = Object.entries(estrategia)
    .filter(([k]) => k.startsWith('pre:'))
    .map(([k, v]) => [k.slice(4), v]);
  const porId = Object.fromEntries(guardadas);
  const base = PLANTILLA_PRESUPUESTO.map(p => ({
    anualizable: true, mensual: null, estado: 'pendiente', nota: '', ...p, ...(porId[p.id] || {}),
    mensual: porId[p.id]?.mensual ?? null,
  }));
  const propias = guardadas
    .filter(([id]) => !PLANTILLA_PRESUPUESTO.some(p => p.id === id))
    .map(([id, v]) => ({ id, anualizable: true, mensual: null, estado: 'pendiente', nota: '', tipo: 'fijo', centro: 'corporativo', ...v }));
  return [...base, ...propias];
}

const conocida = (l) => l.estado === 'confirmado' && typeof l.mensual === 'number' && l.tipo !== 'inversion';

export function resumenPresupuesto(lineas) {
  const conocidas = lineas.filter(conocida);
  const subtotalMensual = conocidas.reduce((s, l) => s + l.mensual, 0);
  return {
    subtotalMensual,
    conocidas: conocidas.length,
    pendientes: lineas.filter(l => l.mensual === null).length,
    // Ilustrativo: ignora las partidas con vigencia limitada (p. ej. sueldo en 0 solo al inicio).
    anualizadoIlustrativo: conocidas.filter(l => l.anualizable !== false).reduce((s, l) => s + l.mensual, 0) * 12,
  };
}

// Ventas mensuales en las que el margen bruto cubre solo los gastos conocidos.
export function puntoEquilibrioParcial(subtotalMensual, margenPct) {
  if (!(subtotalMensual > 0) || !(margenPct > 0)) return null;
  return {
    ventasMensuales: Math.round(subtotalMensual / (margenPct / 100)),
    margenPctUsado: margenPct,
    parcial: true,
    advertencia: 'Parcial: usa el margen bruto histórico (no el de contribución) y solo los gastos conocidos. Aún faltan comisiones, envíos, impuestos y otros costos.',
  };
}
