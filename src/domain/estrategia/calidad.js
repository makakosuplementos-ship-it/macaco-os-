// Calidad y cobertura de los datos de venta. Regla: no se interpola ni se
// corrige nada; solo se mide qué tan completo está lo registrado y se avisa.
import { mesSantiago } from './fechas.js';

// Chequeos básicos sobre las líneas de venta.
export function calidadVentas(ventas = []) {
  const ids = new Map();
  let sinCanal = 0, sinCliente = 0, totalInconsistente = 0, margenInconsistente = 0;
  ventas.forEach(v => {
    ids.set(v.id, (ids.get(v.id) || 0) + 1);
    if (!(v.canal || '').trim()) sinCanal += 1;
    if (!(v.cliente || '').trim()) sinCliente += 1;
    if ((v.total || 0) !== (v.cantidad || 0) * (v.precioUnitario || 0)) totalInconsistente += 1;
    if ((v.margen || 0) !== (v.total || 0) - (v.cantidad || 0) * (v.costoUnitario || 0)) margenInconsistente += 1;
  });
  const duplicados = [...ids.values()].filter(n => n > 1).length;
  const n = ventas.length;
  return {
    lineas: n,
    idsDuplicados: duplicados,
    sinCanal, sinCliente, totalInconsistente, margenInconsistente,
    pctConCanal: n ? (n - sinCanal) / n * 100 : null,
    pctConCliente: n ? (n - sinCliente) / n * 100 : null,
  };
}

// Por mes: unidades que dicen las líneas de venta vs. unidades que dicen los
// movimientos de stock (tipo 'venta'). Si coinciden, el mes está completo.
//   completo        — líneas y movimientos cuadran
//   parcial         — hay líneas pero faltan o sobran unidades contra el stock
//   solo_movimientos — el stock muestra ventas, pero no hay líneas de venta
//   sin_actividad   — nada en ninguna fuente
export function coberturaMensual({ ventas = [], movimientos = [] } = {}) {
  const meses = {};
  const slot = (mes) => (meses[mes] ||= { mes, lineas: 0, unidadesLineas: 0, unidadesMovimientos: 0 });
  ventas.forEach(v => { const s = slot(mesSantiago(v.fecha)); s.lineas += 1; s.unidadesLineas += v.cantidad || 0; });
  movimientos.filter(m => m.tipo === 'venta').forEach(m => {
    slot(mesSantiago(m.fecha)).unidadesMovimientos += Math.abs(m.delta || 0);
  });
  return Object.values(meses).sort((a, b) => (a.mes < b.mes ? -1 : 1)).map(s => {
    let estado;
    if (!s.unidadesLineas && !s.unidadesMovimientos) estado = 'sin_actividad';
    else if (!s.lineas) estado = 'solo_movimientos';
    else if (s.unidadesLineas === s.unidadesMovimientos) estado = 'completo';
    else estado = 'parcial';
    return { ...s, diferencia: s.unidadesMovimientos - s.unidadesLineas, estado };
  });
}

// Último mes terminado cuyos datos cuadran: sirve como "mes comparable".
export function ultimoMesCompleto(cobertura, mesActual) {
  const ok = cobertura.filter(c => c.estado === 'completo' && c.mes < mesActual);
  return ok.length ? ok[ok.length - 1].mes : null;
}
