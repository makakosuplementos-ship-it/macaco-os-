import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { calcularKpis } from './kpi.js';
import { KPIS } from './plan.js';
import { estadoKpi, metaEfectiva } from './estado.js';
import { firmar, cambiarValor, metaAprobada, metaPropuesta, quitarFirma } from './aprobaciones.js';
import { lineasPresupuesto, resumenPresupuesto, puntoEquilibrioParcial } from './presupuesto.js';

const venta = (id, fecha, extra = {}) => ({
  id, fecha, productoId: 'p1', producto: 'Whey', cantidad: 1, total: 10000, margen: 3000,
  costoUnitario: 7000, cliente: 'Ana', canal: 'Shopify', ...extra,
});
const AHORA = Date.parse('2026-11-16T15:00:00Z');
const kpi = (code) => KPIS.find(k => k.code === code);

describe('calcularKpis', () => {
  it('devuelve un resultado por KPI del catálogo', () => {
    assert.equal(calcularKpis({ ahora: AHORA }).length, KPIS.length);
  });

  it('sin datos: valor null y calidad no_medible, nunca 0', () => {
    const r = calcularKpis({ ahora: AHORA }).filter(x => ['FIN-02', 'COM-01', 'CLI-02', 'DAT-01'].includes(x.code));
    r.forEach(x => { assert.equal(x.valor, null); assert.equal(x.calidad, 'no_medible'); });
  });

  it('los KPI no_medible conservan su razón y no tienen valor', () => {
    const r = calcularKpis({ ahora: AHORA });
    KPIS.filter(k => k.calculo === 'no_medible').forEach(k => {
      const x = r.find(y => y.code === k.code);
      assert.equal(x.valor, null);
      assert.equal(x.nota, k.razon);
    });
  });

  it('CLI-02 y DAT-01 miden el mes en curso', () => {
    const ventas = [
      venta('a', '2026-11-03T15:00:00Z'),
      venta('b', '2026-11-04T15:00:00Z', { cliente: '', canal: '' }),
    ];
    const r = calcularKpis({ ventas, ahora: AHORA });
    assert.equal(r.find(x => x.code === 'CLI-02').valor, 50);
    assert.equal(r.find(x => x.code === 'DAT-01').valor, 50);
  });

  it('FIN-02 calcula margen sobre ventas', () => {
    const ventas = [venta('a', '2026-11-03T15:00:00Z'), venta('b', '2026-11-04T15:00:00Z')];
    assert.equal(calcularKpis({ ventas, ahora: AHORA }).find(x => x.code === 'FIN-02').valor, 30);
  });

  it('FIN-01 no compara si no hay dos meses completos comparables', () => {
    const ventas = [venta('a', '2026-10-10T15:00:00Z'), venta('b', '2026-11-03T15:00:00Z')];
    const f = calcularKpis({ ventas, ahora: AHORA }).find(x => x.code === 'FIN-01');
    assert.equal(f.valor, null);
  });

  it('un valor manual queda pendiente de validación', () => {
    const man = KPIS.find(k => k.calculo === 'manual');
    const r = calcularKpis({ ahora: AHORA, estrategia: { [`man:${man.code}`]: { valor: 5, fecha: '2026-11-10' } } });
    const x = r.find(y => y.code === man.code);
    assert.equal(x.valor, 5);
    assert.equal(x.calidad, 'pendiente_validacion');
  });

  it('es determinista', () => {
    const ventas = [venta('a', '2026-11-03T15:00:00Z')];
    assert.deepEqual(calcularKpis({ ventas, ahora: AHORA }), calcularKpis({ ventas, ahora: AHORA }));
  });
});

describe('aprobaciones', () => {
  it('una meta necesita las dos firmas', () => {
    let m = metaPropuesta(31);
    m = firmar(m, 'Felipe');
    assert.equal(metaAprobada(m), false);
    m = firmar(m, 'Papá');
    assert.equal(metaAprobada(m), true);
  });
  it('cambiar el valor borra las firmas', () => {
    let m = firmar(firmar(metaPropuesta(31), 'Felipe'), 'Papá');
    m = cambiarValor(m, 35);
    assert.equal(metaAprobada(m), false);
    assert.deepEqual(m.firmas, {});
  });
  it('quitar una firma des-aprueba', () => {
    const m = quitarFirma(firmar(firmar(metaPropuesta(31), 'Felipe'), 'Papá'), 'Papá');
    assert.equal(metaAprobada(m), false);
  });
  it('no se firma sin valor ni con un socio desconocido', () => {
    assert.throws(() => firmar(metaPropuesta(null), 'Felipe'));
    assert.throws(() => firmar(metaPropuesta(1), 'Pedro'));
  });
});

describe('estado (semáforo)', () => {
  const k = kpi('FIN-02');
  const ok = { valor: 33, calidad: 'confiable' };
  it('sin dato → sin_datos, no rojo', () => {
    assert.equal(estadoKpi(k, { valor: null, calidad: 'no_medible' }, metaEfectiva(k, {})), 'sin_datos');
  });
  it('meta provisional → pendiente_aprobacion aunque haya dato', () => {
    assert.equal(estadoKpi(k, ok, metaEfectiva(k, {})), 'pendiente_aprobacion');
  });
  it('meta aprobada + dato confiable compara de verdad', () => {
    const g = firmar(firmar(metaPropuesta(31), 'Felipe'), 'Papá');
    const meta = metaEfectiva(k, { 'meta:FIN-02': g });
    assert.equal(estadoKpi(k, ok, meta), 'en_meta');
    assert.equal(estadoKpi(k, { valor: 20, calidad: 'confiable' }, meta), 'bajo_meta');
  });
  it('meta aprobada pero dato parcial → datos_incompletos', () => {
    const g = firmar(firmar(metaPropuesta(31), 'Felipe'), 'Papá');
    assert.equal(estadoKpi(k, { valor: 20, calidad: 'parcial' }, metaEfectiva(k, { 'meta:FIN-02': g })), 'datos_incompletos');
  });
});

describe('presupuesto', () => {
  it('monto null no es 0 y no suma', () => {
    const l = lineasPresupuesto({});
    assert.equal(l.every(x => x.mensual === null), true);
    assert.equal(resumenPresupuesto(l).subtotalMensual, 0);
  });
  it('solo cuentan las partidas confirmadas; el sueldo en 0 no se anualiza', () => {
    const l = lineasPresupuesto({
      'pre:contador': { mensual: 100, estado: 'confirmado' },
      'pre:sueldo-socio': { mensual: 0, estado: 'confirmado' },
      'pre:publicidad': { mensual: 50, estado: 'propuesto' },
    });
    const r = resumenPresupuesto(l);
    assert.equal(r.subtotalMensual, 100);
    assert.equal(r.anualizadoIlustrativo, 1200);
  });
  it('punto de equilibrio parcial y marcado como parcial', () => {
    const p = puntoEquilibrioParcial(313, 31.3);
    assert.equal(p.ventasMensuales, 1000);
    assert.equal(p.parcial, true);
    assert.equal(puntoEquilibrioParcial(0, 30), null);
  });
});
