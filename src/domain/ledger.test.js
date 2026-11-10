import test from 'node:test';
import assert from 'node:assert/strict';
import {
  calcStatus, registrarVenta, cancelarVenta, ajustarStock, registrarGasto,
  registrarCompra, anularCompra, pagarDeuda, registrarOrden, cancelarOrden, recibirPedido,
  definirSabores, SIN_SABOR,
} from './ledger.js';

// Estado congelado: si una función muta algo, el test revienta.
const congelar = (o) => {
  Object.values(o).forEach(v => { if (v && typeof v === 'object') congelar(v); });
  return Object.freeze(o);
};

let n = 0;
const CTX = { ahora: '2026-10-27T12:00:00.000Z', genId: () => `id${++n}`, alerta: 3 };

const base = () => congelar({
  productos: [
    { id: 'a', name: 'Creatina', stock: 10, cost: 8000,  price: 15000, status: 'ok' },
    { id: 'b', name: 'Omega 3',  stock: 4,  cost: 7000,  price: 13000, status: 'low' },
    { id: 'c', name: 'Gummy',    stock: 0,  cost: 9000,  price: 16000, status: 'out' },
  ],
  ventas: [], movimientos: [], gastos: [], pedidos: [],
  deudas: [{ id: 'd1', who: 'Benja', amt: 500_000, rate: 10 }],
  caja: 100_000,
});

const linea = (productoId, cantidad, total, extra = {}) =>
  ({ productoId, producto: productoId, cantidad, total, precioUnitario: total / cantidad, costoUnitario: 0, margen: 0, ...extra });

const stockDe = (e, id) => e.productos.find(p => p.id === id).stock;

test('calcStatus respeta el umbral de alerta', () => {
  assert.equal(calcStatus(0), 'out');
  assert.equal(calcStatus(3), 'low');
  assert.equal(calcStatus(4), 'ok');
  assert.equal(calcStatus(5, 5), 'low');
});

test('venta simple: baja stock, sube caja, deja venta y movimiento', () => {
  const e = base();
  const p = registrarVenta(e, linea('a', 2, 30_000), CTX);
  assert.equal(stockDe(p, 'a'), 8);
  assert.equal(p.caja, 130_000);
  assert.equal(p.ventas.length, 1);
  assert.equal(p.ventas[0].fecha, CTX.ahora);
  assert.equal(p.movimientos.length, 1);
  assert.deepEqual(
    [p.movimientos[0].tipo, p.movimientos[0].delta, p.movimientos[0].stockAntes, p.movimientos[0].stockDespues],
    ['venta', -2, 10, 8]);
});

test('pack: TODAS las líneas quedan en ventas, stock, caja y movimientos', () => {
  const e = base();
  const packId = 'pack-1';
  const p = registrarVenta(e, [
    linea('a', 1, 14_000, { packId }), linea('b', 2, 20_000, { packId }), linea('a', 1, 14_000, { packId }),
  ], CTX);
  assert.equal(p.ventas.length, 3);
  assert.equal(p.movimientos.length, 3);
  assert.equal(stockDe(p, 'a'), 8);          // 10 − 1 − 1: el mismo producto en dos líneas
  assert.equal(stockDe(p, 'b'), 2);
  assert.equal(p.caja, 100_000 + 48_000);
  assert.equal(new Set(p.ventas.map(v => v.id)).size, 3); // ids únicos
  assert.ok(p.ventas.every(v => v.packId === packId));
});

test('pack: el movimiento de la 2ª línea del mismo producto parte del stock ya descontado', () => {
  const p = registrarVenta(base(), [linea('a', 3, 1), linea('a', 2, 1)], CTX);
  const movs = p.movimientos.slice().reverse(); // cronológico
  assert.deepEqual(movs.map(m => [m.stockAntes, m.stockDespues]), [[10, 7], [7, 5]]);
});

test('venta inválida no cambia nada (todo o nada)', () => {
  const e = base();
  assert.throws(() => registrarVenta(e, [linea('a', 1, 10_000), linea('b', 0, 5_000)], CTX), /cantidad/);
  assert.throws(() => registrarVenta(e, [], CTX), /líneas/);
  assert.throws(() => registrarVenta(e, linea('a', 1.5, 1), CTX), /cantidad/);
  assert.throws(() => registrarVenta(e, linea('a', 1, -5), CTX), /total/);
  assert.throws(() => registrarVenta(e, { cantidad: 1, total: 1 }, CTX), /producto/);
});

test('vender más del stock deja el stock en 0, nunca negativo', () => {
  const p = registrarVenta(base(), linea('b', 9, 100), CTX);
  assert.equal(stockDe(p, 'b'), 0);
  assert.equal(p.productos.find(x => x.id === 'b').status, 'out');
  assert.equal(p.movimientos[0].delta, -4); // lo que realmente salió
});

test('venta de un producto que ya no está en catálogo se registra igual', () => {
  const p = registrarVenta(base(), linea('zzz', 1, 7_000), CTX);
  assert.equal(p.ventas.length, 1);
  assert.equal(p.caja, 107_000);
  assert.equal(p.movimientos.length, 0);
});

test('lo más nuevo queda primero', () => {
  const e1 = { ...base(), ...registrarVenta(base(), linea('a', 1, 1_000), CTX) };
  const e2 = { ...e1, ...registrarVenta(e1, linea('b', 1, 2_000), CTX) };
  assert.equal(e2.ventas[0].productoId, 'b');
});

test('cancelar venta simple deja stock y caja como estaban', () => {
  const e0 = base();
  const e1 = { ...e0, ...registrarVenta(e0, linea('a', 2, 30_000), CTX) };
  const c = cancelarVenta(e1, e1.ventas[0].id, CTX);
  assert.equal(c.ventas.length, 0);
  assert.equal(stockDe(c, 'a'), 10);
  assert.equal(c.caja, 100_000);
  assert.deepEqual(c.movimientos.map(m => m.tipo).sort(), ['anulacion', 'venta']);
  // el historial de stock cuadra: la suma de deltas es 0
  assert.equal(c.movimientos.reduce((s, m) => s + m.delta, 0), 0);
});

test('cancelar una línea de un pack anula el pack completo', () => {
  const e0 = base();
  const e1 = { ...e0, ...registrarVenta(e0, [
    linea('a', 1, 14_000, { packId: 'p' }), linea('b', 2, 20_000, { packId: 'p' }),
  ], CTX) };
  const otra = { ...e1, ...registrarVenta(e1, linea('a', 1, 15_000), CTX) };
  const idLinea = otra.ventas.find(v => v.packId === 'p' && v.productoId === 'b').id;
  const c = cancelarVenta(otra, idLinea, CTX);
  assert.equal(c.ventas.length, 1);                  // queda solo la venta suelta
  assert.equal(c.ventas[0].packId, undefined);
  assert.equal(stockDe(c, 'b'), 4);
  assert.equal(stockDe(c, 'a'), 9);
  assert.equal(c.caja, 100_000 + 15_000);
});

test('cancelar una venta que no existe no hace nada', () => {
  assert.equal(cancelarVenta(base(), 'nope', CTX), null);
});

test('ajustarStock: compra suma, baja resta, siempre con movimiento', () => {
  const e = base();
  const compra = ajustarStock(e, 'a', 5, 'compra', CTX, { proveedor: 'Grizzly' });
  assert.equal(stockDe(compra, 'a'), 15);
  assert.equal(compra.movimientos[0].proveedor, 'Grizzly');
  const baja = ajustarStock(e, 'b', -10, 'baja', CTX);
  assert.equal(stockDe(baja, 'b'), 0);
  assert.equal(baja.movimientos[0].delta, -4);
  assert.throws(() => ajustarStock(e, 'a', 0, 'baja', CTX), /inválido/);
  assert.throws(() => ajustarStock(e, 'zzz', 1, 'compra', CTX), /no encontrado/);
});

test('gasto de negocio baja la caja; otros tipos no', () => {
  const e = base();
  assert.equal(registrarGasto(e, { tipo: 'negocio', monto: 25_000, categoria: 'Meta' }, CTX).caja, 75_000);
  const otro = registrarGasto(e, { tipo: 'otro', monto: 25_000 }, CTX);
  assert.equal(otro.caja, undefined);
  assert.equal(otro.gastos.length, 1);
  assert.throws(() => registrarGasto(e, { tipo: 'negocio', monto: 0 }, CTX), /Monto/);
});

test('compra de inventario sale de caja y se puede anular', () => {
  const e0 = base();
  const c = registrarCompra(e0, { monto: 60_000, descripcion: 'Creatina x10' }, CTX);
  assert.equal(c.caja, 40_000);
  assert.equal(c.gastos[0].tipo, 'inventario');
  const e1 = { ...e0, ...c };
  const a = anularCompra(e1, c.gastoId);
  assert.equal(a.caja, 100_000);
  assert.equal(a.gastos.length, 0);
  assert.equal(anularCompra(e1, 'nope'), null);
});

test('pagar deuda baja deuda y caja; deuda en 0 desaparece', () => {
  const e = base();
  const parcial = pagarDeuda(e, 'd1', 50_000);
  assert.equal(parcial.deudas[0].amt, 450_000);
  assert.equal(parcial.caja, 50_000);
  const total = pagarDeuda(e, 'd1', 500_000);
  assert.equal(total.deudas.length, 0);
  assert.equal(total.caja, 0); // la caja no queda negativa
  assert.throws(() => pagarDeuda(e, 'd1', -1), /inválido/);
});

test('orden a proveedor con varios productos: una sola salida de caja', () => {
  const e = base();
  const o = registrarOrden(e, {
    proveedor: 'Grober', descontarCaja: true, fechaPedido: '2026-10-27',
    lineas: [
      { productoId: 'a', producto: 'Creatina', cantidad: 5, costo: 8_000 },
      { productoId: 'b', producto: 'Omega 3',  cantidad: 2, costo: 7_000 },
    ],
  }, CTX);
  assert.equal(o.caja, 100_000 - 54_000);
  assert.equal(o.gastos.length, 1);
  assert.equal(o.pedidos.length, 2);
  assert.ok(o.pedidos.every(p => p.ordenId === o.ordenId && p.gastoId === o.gastoId));
});

test('cancelar orden devuelve a la caja lo pagado; sin pago no toca la caja', () => {
  const e0 = base();
  const pagada = registrarOrden(e0, { proveedor: 'X', descontarCaja: true,
    lineas: [{ productoId: 'a', producto: 'C', cantidad: 1, costo: 10_000 }] }, CTX);
  const e1 = { ...e0, ...pagada };
  const c = cancelarOrden(e1, pagada.ordenId);
  assert.equal(c.caja, 100_000);
  assert.equal(c.gastos.length, 0);
  assert.equal(c.pedidos[0].estado, 'cancelado');

  const sinPago = registrarOrden(e0, { proveedor: 'X', descontarCaja: false,
    lineas: [{ productoId: 'a', producto: 'C', cantidad: 1, costo: 10_000 }] }, CTX);
  const c2 = cancelarOrden({ ...e0, ...sinPago }, sinPago.ordenId);
  assert.equal(c2.caja, undefined);
});

test('recibir pedido mete el stock una sola vez', () => {
  const e0 = base();
  const o = registrarOrden(e0, { proveedor: 'Grizzly', descontarCaja: false,
    lineas: [{ productoId: 'a', producto: 'Creatina', cantidad: 6, costo: 8_000 }] }, CTX);
  const e1 = { ...e0, ...o };
  const r = recibirPedido(e1, e1.pedidos[0].id, '2026-11-02', CTX);
  assert.equal(stockDe(r, 'a'), 16);
  assert.equal(r.pedidos[0].estado, 'recibido');
  assert.equal(r.pedidos[0].fechaLlegada, '2026-11-02');
  assert.equal(r.movimientos[0].tipo, 'compra');
  assert.equal(r.movimientos[0].proveedor, 'Grizzly');
  // segunda vez: no hace nada (no duplica stock)
  assert.equal(recibirPedido({ ...e1, ...r }, e1.pedidos[0].id, '2026-11-03', CTX), null);
});


// ── Sabores ──────────────────────────────────────────────────────────────────
const conSabores = () => congelar({
  productos: [
    { id: 'p', name: 'Proteína', stock: 7, cost: 23000, price: 36000, status: 'ok',
      sabores: { Chocolate: 5, Vainilla: 2, Cookies: 0 } },
    { id: 'a', name: 'Creatina', stock: 10, cost: 8000, price: 15000, status: 'ok' },
  ],
  ventas: [], movimientos: [], gastos: [], pedidos: [], deudas: [], caja: 0,
});
const saboresDe = (e, id) => e.productos.find(p => p.id === id).sabores;

test('venta con sabor: baja ese sabor y el stock total es la suma', () => {
  const r = registrarVenta(conSabores(), linea('p', 2, 60000, { sabor: 'Chocolate' }), CTX);
  assert.deepEqual(saboresDe(r, 'p'), { Chocolate: 3, Vainilla: 2, Cookies: 0 });
  assert.equal(stockDe(r, 'p'), 5);
  assert.equal(r.ventas[0].sabor, 'Chocolate');
  assert.equal(r.movimientos[0].sabor, 'Chocolate');
  assert.equal(r.movimientos[0].delta, -2);
});

test('venta de un producto con sabores sin elegir sabor falla y no cambia nada', () => {
  assert.throws(() => registrarVenta(conSabores(), linea('p', 1, 36000), CTX), /elige el sabor/i);
  assert.throws(() => registrarVenta(conSabores(), linea('p', 1, 36000, { sabor: 'Frutilla' }), CTX), /elige el sabor/i);
});

test('un pack mezcla productos con y sin sabores', () => {
  const r = registrarVenta(conSabores(), [
    linea('p', 1, 30000, { sabor: 'Vainilla' }),
    linea('a', 1, 14000),
  ], CTX);
  assert.equal(saboresDe(r, 'p').Vainilla, 1);
  assert.equal(stockDe(r, 'a'), 9);
  assert.equal('sabor' in r.ventas.find(v => v.productoId === 'a'), false);
});

test('un producto sin sabores ignora el sabor que le lleguen en la línea', () => {
  const r = registrarVenta(conSabores(), linea('a', 1, 14000, { sabor: 'Chocolate' }), CTX);
  assert.equal('sabor' in r.ventas[0], false);
  assert.equal(stockDe(r, 'a'), 9);
});

test('anular una venta devuelve el stock a su sabor', () => {
  const v = registrarVenta(conSabores(), linea('p', 2, 60000, { sabor: 'Chocolate' }), CTX);
  const r = cancelarVenta(congelar(v), v.ventas[0].id, CTX);
  assert.deepEqual(saboresDe(r, 'p'), { Chocolate: 5, Vainilla: 2, Cookies: 0 });
  assert.equal(stockDe(r, 'p'), 7);
  assert.equal(r.movimientos[0].sabor, 'Chocolate');
});

test('anular una venta vieja (sin sabor) de un producto que ahora tiene sabores va a "Sin asignar"', () => {
  const e = congelar({ ...conSabores(), ventas: [{ id: 'v1', productoId: 'p', producto: 'Proteína', cantidad: 1, total: 30000 }], caja: 30000 });
  const r = cancelarVenta(e, 'v1', CTX);
  assert.equal(saboresDe(r, 'p')[SIN_SABOR], 1);
  assert.equal(stockDe(r, 'p'), 8);
});

test('ajustarStock con sabor mueve ese sabor; sin sabor entra a "Sin asignar" y no deja sacar', () => {
  const e = conSabores();
  const compra = ajustarStock(e, 'p', 10, 'compra', CTX, { sabor: 'Cookies' });
  assert.equal(saboresDe(compra, 'p').Cookies, 10);
  assert.equal(stockDe(compra, 'p'), 17);
  const pedido = ajustarStock(e, 'p', 4, 'compra', CTX, { pedidoId: 'x' });
  assert.equal(saboresDe(pedido, 'p')[SIN_SABOR], 4);
  assert.equal(pedido.movimientos[0].pedidoId, 'x');
  assert.throws(() => ajustarStock(e, 'p', -1, 'baja', CTX), /elige el sabor/i);
});

test('definirSabores: el stock pasa a ser la suma y deja un movimiento si cambió', () => {
  const r = definirSabores(base(), 'a', { Natural: 6, Limón: 4 }, CTX);
  assert.deepEqual(saboresDe(r, 'a'), { Natural: 6, Limón: 4 });
  assert.equal(stockDe(r, 'a'), 10);
  assert.equal(r.movimientos.length, 0); // 6 + 4 = 10, no cambió
  const r2 = definirSabores(base(), 'a', { Natural: 6, Limón: 7 }, CTX);
  assert.equal(stockDe(r2, 'a'), 13);
  assert.equal(r2.movimientos[0].delta, 3);
  assert.equal(r2.movimientos[0].tipo, 'ajuste');
});

test('definirSabores vacío quita los sabores y conserva el stock; valida nombres y unidades', () => {
  const r = definirSabores(conSabores(), 'p', {}, CTX);
  assert.equal('sabores' in r.productos[0], false);
  assert.equal(stockDe(r, 'p'), 7);
  assert.throws(() => definirSabores(base(), 'a', { '  ': 1 }, CTX), /no tiene nombre/);
  assert.throws(() => definirSabores(base(), 'a', { Natural: 1, natural: 2 }, CTX), /repetido/);
  assert.throws(() => definirSabores(base(), 'a', { Natural: -1 }, CTX), /inválidas/);
  assert.throws(() => definirSabores(base(), 'zz', { Natural: 1 }, CTX), /no encontrado/);
});

test('el estado del producto (agotado/bajo) sigue la suma de sabores', () => {
  const r = registrarVenta(conSabores(), [
    linea('p', 5, 100000, { sabor: 'Chocolate' }),
    linea('p', 2, 60000, { sabor: 'Vainilla' }),
  ], CTX);
  assert.equal(stockDe(r, 'p'), 0);
  assert.equal(r.productos[0].status, 'out');
});
