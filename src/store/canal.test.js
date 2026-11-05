import test from 'node:test';
import assert from 'node:assert/strict';
import { ventasPorCanal, CANALES, SIN_CANAL } from './selectors.js';
import { registrarVenta } from '../domain/ledger.js';

const CTX = { ahora: '2026-11-05T12:00:00.000Z', genId: (() => { let n = 0; return () => `id${++n}`; })(), alerta: 3 };

test('el canal elegido queda guardado en la venta', () => {
  const estado = {
    productos: [{ id: 'a', name: 'Creatina', stock: 10, cost: 8000, price: 15000, status: 'ok' }],
    ventas: [], movimientos: [], caja: 0,
  };
  const r = registrarVenta(estado, {
    productoId: 'a', producto: 'Creatina', cantidad: 1, total: 15000,
    precioUnitario: 15000, costoUnitario: 8000, margen: 7000, canal: 'Kiosco',
  }, CTX);
  assert.equal(r.ventas[0].canal, 'Kiosco');
});

test('ventasPorCanal suma por canal, cuenta un pack como 1 venta y agrupa lo viejo en "Sin canal"', () => {
  const ventas = [
    { id: '1', total: 30000, margen: 10000, canal: 'Kiosco' },
    { id: '2', total: 20000, margen: 6000,  canal: 'Kiosco', packId: 'p1' },
    { id: '3', total: 10000, margen: 3000,  canal: 'Kiosco', packId: 'p1' },
    { id: '4', total: 50000, margen: 15000, canal: 'Shopify' },
    { id: '5', total: 8000,  margen: 2000 },
  ];
  const r = ventasPorCanal(ventas);
  const kiosco = r.find(c => c.canal === 'Kiosco');
  assert.equal(kiosco.total, 60000);
  assert.equal(kiosco.transacciones, 2);
  assert.equal(r.find(c => c.canal === 'Shopify').total, 50000);
  assert.equal(r.find(c => c.canal === SIN_CANAL).total, 8000);
  assert.equal(r[0].canal, 'Kiosco'); // ordenado de mayor a menor
});

test('los canales disponibles incluyen los 4 del negocio', () => {
  assert.deepEqual(CANALES, ['Arica directo', 'Kiosco', 'Shopify', 'Mercado Libre']);
});
