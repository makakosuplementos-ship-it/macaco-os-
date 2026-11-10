import test from 'node:test';
import assert from 'node:assert/strict';
import { ventasPorSabor } from './selectors.js';

const v = (productoId, sabor, cantidad, total, margen = 0) =>
  ({ productoId, producto: productoId === 'p' ? 'Proteína' : 'Pre', sabor, cantidad, total, margen });

test('ranking de sabores: ordena por unidades y calcula el porcentaje', () => {
  const r = ventasPorSabor([
    v('p', 'Chocolate', 3, 90000, 21000), v('p', 'Vainilla', 1, 30000, 7000), v('p', 'Chocolate', 2, 60000, 14000),
  ]);
  assert.equal(r.length, 1);
  assert.equal(r[0].unidades, 6);
  assert.deepEqual(r[0].sabores.map(f => [f.sabor, f.unidades, f.total]), [['Chocolate', 5, 150000], ['Vainilla', 1, 30000]]);
  assert.equal(Math.round(r[0].sabores[0].pct), 83);
});

test('incluye sabores actuales sin ventas (0 u) con su stock, y los deja al final', () => {
  const r = ventasPorSabor([v('p', 'Chocolate', 2, 60000)], [
    { id: 'p', name: 'Proteína', stock: 7, sabores: { Chocolate: 5, Vainilla: 2, Cookies: 0 } },
  ]);
  const nombres = r[0].sabores.map(f => f.sabor);
  assert.equal(nombres[0], 'Chocolate');
  assert.deepEqual(r[0].sabores.find(f => f.sabor === 'Cookies'), { sabor: 'Cookies', unidades: 0, total: 0, margen: 0, stock: 0, pct: 0 });
  assert.equal(r[0].sabores.find(f => f.sabor === 'Vainilla').stock, 2);
});

test('ignora ventas sin sabor y productos sin sabores', () => {
  const r = ventasPorSabor([{ productoId: 'x', producto: 'Creatina', cantidad: 4, total: 1, margen: 0 }],
    [{ id: 'x', name: 'Creatina', stock: 4 }]);
  assert.deepEqual(r, []);
});

test('un sabor vendido que ya no existe en el producto igual aparece (stock null)', () => {
  const r = ventasPorSabor([v('p', 'Frutilla', 2, 60000)], [{ id: 'p', name: 'Proteína', stock: 1, sabores: { Chocolate: 1 } }]);
  assert.equal(r[0].sabores.find(f => f.sabor === 'Frutilla').stock, null);
});
