import test from 'node:test';
import assert from 'node:assert/strict';
import { fechaSantiago, mesSantiago, mesAnterior, diasDelMes } from './fechas.js';
import { canalTransaccion, ventasPorCanalTransaccion, SIN_CANAL, NO_MAPEADO } from './canales.js';
import { calidadVentas, coberturaMensual, ultimoMesCompleto } from './calidad.js';

const linea = (id, fecha, o = {}) => ({
  id, fecha, producto: 'X', productoId: 'x', cantidad: 1, precioUnitario: 10_000, costoUnitario: 7_000,
  total: 10_000, margen: 3_000, ...o,
});

test('fechas: la venta de las 22:30 del 31-oct en Santiago es octubre, no noviembre', () => {
  assert.equal(fechaSantiago('2026-11-01T01:30:00Z'), '2026-10-31');
  assert.equal(mesSantiago('2026-11-01T01:30:00Z'), '2026-10');
  // En UTC sería noviembre: es justo el error que este módulo evita.
  assert.equal(new Date('2026-11-01T01:30:00Z').toISOString().slice(0, 7), '2026-11');
});

test('fechas: mes anterior y días del mes', () => {
  assert.equal(mesAnterior('2026-01'), '2025-12');
  assert.equal(mesAnterior('2026-11'), '2026-10');
  assert.equal(diasDelMes('2026-02'), 28);
  assert.equal(diasDelMes('2026-11'), 30);
});

test('canales: sin canal no se inventa y lo desconocido queda sin mapear', () => {
  assert.equal(canalTransaccion({}), SIN_CANAL);
  assert.equal(canalTransaccion({ canal: '  ' }), SIN_CANAL);
  assert.equal(canalTransaccion({ canal: 'Instagram DM' }), NO_MAPEADO);
  assert.equal(canalTransaccion({ canal: 'Mercado Libre' }), 'mercado_libre');
  assert.equal(canalTransaccion({ canal: 'Arica directo' }), 'venta_directa');
});

test('canales: un pack cuenta como una transacción y no se atribuye dos veces', () => {
  const r = ventasPorCanalTransaccion([
    linea('a', '2026-11-06T15:00:00Z', { canal: 'Arica directo', packId: 'p1' }),
    linea('b', '2026-11-06T15:00:00Z', { canal: 'Arica directo', packId: 'p1' }),
    linea('c', '2026-11-07T15:00:00Z'),
  ]);
  const directa = r.find(c => c.canal === 'venta_directa');
  assert.equal(directa.lineas, 2);
  assert.equal(directa.transacciones, 1);
  assert.equal(directa.total, 20_000);
  assert.equal(r.find(c => c.canal === SIN_CANAL).total, 10_000);
});

test('calidad: detecta duplicados, sin canal, sin cliente e inconsistencias', () => {
  const q = calidadVentas([
    linea('a', '2026-10-01T15:00:00Z', { canal: 'Shopify' }),
    linea('a', '2026-10-01T15:00:00Z'),                          // id repetido
    linea('b', '2026-10-02T15:00:00Z', { total: 9_999 }),        // total ≠ cantidad × precio
    linea('c', '2026-10-03T15:00:00Z', { margen: 1 }),           // margen ≠ total − costo
  ]);
  assert.equal(q.lineas, 4);
  assert.equal(q.idsDuplicados, 1);
  assert.equal(q.sinCanal, 3);
  assert.equal(q.sinCliente, 4);
  assert.equal(q.totalInconsistente, 1);
  assert.equal(q.margenInconsistente, 2);   // la línea con total alterado también rompe el margen
  assert.equal(q.pctConCliente, 0);
});

test('calidad: sin ventas no hay porcentajes inventados', () => {
  const q = calidadVentas([]);
  assert.equal(q.pctConCanal, null);
  assert.equal(q.pctConCliente, null);
});

test('cobertura: mes completo, parcial y solo con movimientos de stock', () => {
  const ventas = [
    linea('o1', '2026-10-05T15:00:00Z', { cantidad: 2, total: 20_000, margen: 6_000 }),
    linea('o2', '2026-10-06T15:00:00Z'),
    linea('s1', '2026-09-20T15:00:00Z'),
  ];
  const mov = [
    { tipo: 'venta', fecha: '2026-10-05T15:00:00Z', delta: -2 },
    { tipo: 'venta', fecha: '2026-10-06T15:00:00Z', delta: -1 },
    { tipo: 'venta', fecha: '2026-09-02T15:00:00Z', delta: -1 },   // antes de la primera línea
    { tipo: 'venta', fecha: '2026-09-20T15:00:00Z', delta: -1 },
    { tipo: 'venta', fecha: '2026-07-10T15:00:00Z', delta: -3 },   // julio: solo stock
    { tipo: 'compra', fecha: '2026-10-01T15:00:00Z', delta: 10 },  // no es venta
  ];
  const c = coberturaMensual({ ventas, movimientos: mov });
  const por = Object.fromEntries(c.map(x => [x.mes, x]));
  assert.equal(por['2026-10'].estado, 'completo');
  assert.equal(por['2026-09'].estado, 'parcial');
  assert.equal(por['2026-09'].diferencia, 1);
  assert.equal(por['2026-07'].estado, 'solo_movimientos');
  assert.equal(por['2026-07'].unidadesMovimientos, 3);
  assert.equal(ultimoMesCompleto(c, '2026-11'), '2026-10');
  assert.equal(ultimoMesCompleto(c, '2026-10'), null);   // el mes en curso nunca cuenta
});
