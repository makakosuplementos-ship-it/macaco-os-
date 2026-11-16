import test from 'node:test';
import assert from 'node:assert/strict';
import { escanear, AREAS, deArea } from './index.js';

const AHORA = new Date('2026-10-27T15:00:00').getTime();

test('cada decisión sale marcada con su área', () => {
  const r = escanear(AREAS, {
    caja: 50_000, config: { colchonMinimo: 300_000 },
    deudas: [{ id: 'd1', who: 'B', amt: 500_000, rate: 10 }], ahora: AHORA,
  });
  assert.ok(r.decisiones.length >= 2);
  assert.ok(r.decisiones.every(d => d.area === 'finanzas'));
  assert.equal(deArea(r.decisiones, 'stock').length, 0);
});

test('sumar un área nueva no toca al cerebro', () => {
  const nueva = { id: 'redes', nombre: 'Redes', detectar: () => [{ id: 'x', tipo: 'Redes', prioridad: 'alta', senal: 'x', evidencia: [] }] };
  const r = escanear([...AREAS, nueva], { ahora: AHORA });
  assert.deepEqual(r.decisiones.map(d => [d.id, d.area]), [['x', 'redes']]);
});

test('las áreas conocidas son finanzas, stock, catálogo, ventas y estrategia', () => {
  assert.deepEqual(AREAS.map(a => a.id), ['finanzas', 'stock', 'catalogo', 'ventas', 'estrategia']);
});
