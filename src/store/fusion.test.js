import test from 'node:test';
import assert from 'node:assert/strict';
import { fusionarValor, fusionarLista } from './fusion.js';

test('números: suma las dos diferencias', () => {
  assert.equal(fusionarValor('macaco:caja', 100, 115, 120), 135);
  assert.equal(fusionarValor('macaco:caja', 100, 100, 120), 120);
  assert.equal(fusionarValor('macaco:caja', 100, 90, 100), 90);
});

test('sin base gana lo local', () => {
  assert.deepEqual(fusionarValor('macaco:ventas', undefined, [1], [2]), [1]);
});

test('listas: agrega lo nuevo de ambos, respeta borrados y ediciones', () => {
  const base   = [{ id: 1, n: 'a' }, { id: 2, n: 'b' }, { id: 3, n: 'c' }];
  const local  = [{ id: 4, n: 'nuevo-local' }, { id: 1, n: 'a-editado' }, { id: 3, n: 'c' }]; // borró 2
  const remoto = [{ id: 5, n: 'nuevo-remoto' }, { id: 1, n: 'a' }, { id: 2, n: 'b' }];        // borró 3
  const r = fusionarLista(base, local, remoto);
  assert.deepEqual(r.map(x => x.id).sort(), [1, 4, 5]);
  assert.equal(r.find(x => x.id === 1).n, 'a-editado');
});

test('listas con fecha quedan de la más nueva a la más vieja', () => {
  const r = fusionarLista([], [{ id: 'l', fecha: '2026-10-27T09:00' }], [{ id: 'r', fecha: '2026-10-27T10:00' }]);
  assert.deepEqual(r.map(x => x.id), ['r', 'l']);
});

test('productos: el stock se fusiona por diferencia, el resto por campo', () => {
  const base   = [{ id: 'a', stock: 10, price: 15000 }];
  const local  = [{ id: 'a', stock: 8,  price: 15000 }];
  const remoto = [{ id: 'a', stock: 9,  price: 16000 }];
  const [p] = fusionarValor('macaco:productos', base, local, remoto);
  assert.equal(p.stock, 7);
  assert.equal(p.price, 16000);
});

test('objetos (config, corteza): cada campo cambiado gana', () => {
  const r = fusionarValor('macaco:corteza', { a: 1 }, { a: 1, b: 2 }, { a: 1, c: 3 });
  assert.deepEqual(r, { a: 1, b: 2, c: 3 });
  const borrado = fusionarValor('macaco:corteza', { a: 1, b: 2 }, { a: 1 }, { a: 1, b: 2, c: 3 });
  assert.deepEqual(borrado, { a: 1, c: 3 });
});

// ── Sabores ──────────────────────────────────────────────────────────────────
const prod = (sabores) => ({ id: 'p', name: 'Proteína', cost: 23000, price: 36000,
  sabores, stock: Object.values(sabores).reduce((n, u) => n + u, 0) });

test('sabores: cada celular vende un sabor distinto y se suman las dos ventas', () => {
  const base   = [prod({ Chocolate: 5, Vainilla: 5 })];
  const local  = [prod({ Chocolate: 3, Vainilla: 5 })];   // vendió 2 de chocolate
  const remoto = [prod({ Chocolate: 5, Vainilla: 4 })];   // el otro vendió 1 de vainilla
  const [p] = fusionarValor('macaco:productos', base, local, remoto);
  assert.deepEqual(p.sabores, { Chocolate: 3, Vainilla: 4 });
  assert.equal(p.stock, 7);
});

test('sabores: los dos venden el mismo sabor y se descuentan ambas', () => {
  const base   = [prod({ Chocolate: 10 })];
  const [p] = fusionarValor('macaco:productos', base, [prod({ Chocolate: 8 })], [prod({ Chocolate: 7 })]);
  assert.deepEqual(p.sabores, { Chocolate: 5 });
  assert.equal(p.stock, 5);
});

test('sabores: un sabor nuevo de un celular se conserva y el stock cuadra', () => {
  const base   = [prod({ Chocolate: 5 })];
  const local  = [prod({ Chocolate: 5, Cookies: 12 })];
  const remoto = [prod({ Chocolate: 4 })];
  const [p] = fusionarValor('macaco:productos', base, local, remoto);
  assert.deepEqual(p.sabores, { Chocolate: 4, Cookies: 12 });
  assert.equal(p.stock, 16);
});

test('sabores: activar sabores en un celular mientras el otro vende no pierde la venta', () => {
  const base   = [{ id: 'p', name: 'Proteína', cost: 1, price: 2, stock: 10 }];
  const local  = [prod({ Chocolate: 6, Vainilla: 4 })];                        // repartió 10 en sabores
  const remoto = [{ id: 'p', name: 'Proteína', cost: 1, price: 2, stock: 9 }]; // el otro vendió 1
  const [p] = fusionarValor('macaco:productos', base, local, remoto);
  assert.equal(p.stock, 9);
  assert.equal(Object.values(p.sabores).reduce((n, u) => n + u, 0), 9);
});

test('sabores: si falta stock y hay "Sin asignar", se descuenta de ahí primero', () => {
  const base   = [{ id: 'p', name: 'P', cost: 1, price: 2, stock: 10, sabores: { 'Sin asignar': 10 } }];
  const local  = [{ id: 'p', name: 'P', cost: 1, price: 2, stock: 10, sabores: { 'Sin asignar': 4, Chocolate: 6 } }];
  const remoto = [{ id: 'p', name: 'P', cost: 1, price: 2, stock: 9,  sabores: { 'Sin asignar': 9 } }];
  const [p] = fusionarValor('macaco:productos', base, local, remoto);
  assert.equal(p.stock, 9);
  assert.deepEqual(p.sabores, { 'Sin asignar': 3, Chocolate: 6 });
});
