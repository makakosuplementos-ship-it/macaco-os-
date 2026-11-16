import test from 'node:test';
import assert from 'node:assert/strict';
import { escanear, AREAS } from '../index.js';
import { firmar } from '../../domain/estrategia/aprobaciones.js';
import { metaPropuesta } from '../../domain/estrategia/aprobaciones.js';

const AHORA = Date.parse('2026-11-16T15:00:00Z');
const v = (id, fecha, extra = {}) => ({ id, fecha, productoId: 'p', producto: 'X', cantidad: 1, total: 10000, margen: 2000, costoUnitario: 8000, cliente: 'A', canal: 'Shopify', ...extra });
const solo = (datos) => escanear(AREAS.filter(a => a.id === 'estrategia'), { ahora: AHORA, ...datos }).decisiones;

test('estrategia: sin ventas no hay señales', () => {
  assert.deepEqual(solo({}), []);
});

test('estrategia: una meta provisional nunca dispara "bajo la meta"', () => {
  const d = solo({ ventas: [v('a', '2026-11-03T15:00:00Z')] });
  assert.equal(d.some(x => x.id.startsWith('kpi-bajo-meta')), false);
});

test('estrategia: meta aprobada por ambos y dato bajo → señal con aprobación requerida', () => {
  const meta = firmar(firmar(metaPropuesta(50), 'Felipe'), 'Papá');
  const d = solo({ ventas: [v('a', '2026-11-03T15:00:00Z')], estrategia: { 'meta:FIN-02': meta, 'cal:FIN-02': { calidad: 'confiable' } } });
  const s = d.find(x => x.id.startsWith('kpi-bajo-meta:FIN-02'));
  assert.ok(s);
  assert.match(s.aprobacion, /aprobación/);
});

test('estrategia: meta aprobada pero dato parcial no se compara', () => {
  const meta = firmar(firmar(metaPropuesta(50), 'Felipe'), 'Papá');
  const d = solo({ ventas: [v('a', '2026-11-03T15:00:00Z')], estrategia: { 'meta:FIN-02': meta } });
  assert.equal(d.some(x => x.id.startsWith('kpi-bajo-meta')), false);
});

test('estrategia: con una sola firma la meta no cuenta como aprobada', () => {
  const meta = firmar(metaPropuesta(50), 'Felipe');
  const d = solo({ ventas: [v('a', '2026-11-03T15:00:00Z')], estrategia: { 'meta:FIN-02': meta } });
  assert.equal(d.some(x => x.id.startsWith('kpi-bajo-meta')), false);
});
