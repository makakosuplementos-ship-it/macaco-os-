// Cerebro de Macaco OS — junta lo que detecta cada área y arma UNA cola
// priorizada. No sabe de stock ni de deudas: eso vive en cada área.
// Agregar un área = escribir su detectar() y sumarla a AREAS.
//
// Reglas (Corteza Prefrontal): sin datos no hay señal, no ejecuta nada y
// toda decisión requiere aprobación humana. Ver docs/CORTEZA-GUIA.md.
import { PRIORIDAD_RANGO, velocidades } from './decision.js';
import { area as finanzas } from './areas/finanzas.js';
import { area as stock } from './areas/stock.js';
import { area as catalogo } from './areas/catalogo.js';
import { area as ventas } from './areas/ventas.js';
import { area as estrategia } from './areas/estrategia.js';

export { calcPrioridad } from './decision.js';
export const AREAS = [finanzas, stock, catalogo, ventas, estrategia];

export function escanear(areas, {
  productos = [], ventas = [], gastos = [], deudas = [], caja = 0, config = {}, movimientos = [], estrategia = {}, ahora = Date.now(),
} = {}) {
  const t = typeof ahora === 'number' ? ahora : new Date(ahora).getTime();
  const datos = { productos, ventas, gastos, deudas, caja, config, movimientos, estrategia };
  const ctx = {
    ahora: t,
    vel: velocidades(ventas, t),
    tasaMax: Math.max(0, ...deudas.filter(d => d.amt > 0).map(d => d.rate || 0)),
  };

  const brutas = areas.flatMap(a => a.detectar(datos, ctx).map(d => ({ ...d, area: a.id })));

  // Las deudas se mantienen juntas y en su orden de pago (el abono va a la
  // primera): el grupo se ordena por su mayor impacto.
  const impactoDeudas = Math.max(0, ...brutas.filter(d => d.tipo === 'Deuda').map(d => d.impactoMensual || 0));
  const clave = (d) => d.tipo === 'Deuda' ? impactoDeudas : (d.impactoMensual || 0);
  const decisiones = brutas
    .map((d, i) => ({ d, i }))
    .sort((a, b) =>
      (PRIORIDAD_RANGO[a.d.prioridad] - PRIORIDAD_RANGO[b.d.prioridad]) ||
      (clave(b.d) - clave(a.d)) || (a.i - b.i))
    .map(x => x.d);

  return {
    fecha: new Date(t).toISOString(),
    fuentes: {
      ventas: ventas.length, productos: productos.length, gastos: gastos.length,
      deudas: deudas.length, diasHistorial: Math.floor(ctx.vel.diasHistorial),
    },
    decisiones,
  };
}

// Las decisiones pendientes de un área (para mostrarlas en su pantalla).
export const deArea = (decisiones, areaId) => decisiones.filter(d => d.area === areaId);
