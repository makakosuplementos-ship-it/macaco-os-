// Área ESTRATEGIA — conecta Corteza con los KPI del Plan Estratégico.
//
// Reglas (iguales al resto del cerebro): fuente o silencio, nada se ejecuta,
// toda decisión requiere aprobación. Además:
// - una meta provisional NUNCA genera alerta de "bajo la meta": solo se
//   puede pedir que los socios la aprueben;
// - un KPI sin dato no es una señal roja: es una brecha de información.
import { decision, clp } from '../decision.js';
import { calcularKpis, contextoDatos } from '../../domain/estrategia/kpi.js';
import { KPIS } from '../../domain/estrategia/plan.js';
import { metaEfectiva, estadoKpi } from '../../domain/estrategia/estado.js';
import { lineasPresupuesto, resumenPresupuesto, puntoEquilibrioParcial } from '../../domain/estrategia/presupuesto.js';
import { mesSantiago } from '../../domain/estrategia/fechas.js';

const evaluar = ({ ventas, productos, movimientos, estrategia, ahora }) => {
  const resultados = calcularKpis({ ventas, productos, movimientos, estrategia, ahora });
  return KPIS.map(k => {
    const r = resultados.find(x => x.code === k.code);
    const meta = metaEfectiva(k, estrategia);
    return { kpi: k, r, meta, estado: estadoKpi(k, r, meta) };
  });
};

function senalesKpi(items) {
  return items.filter(i => i.estado === 'bajo_meta').map(({ kpi, r, meta }) => decision({
    id: `kpi-bajo-meta:${kpi.code}:${r.periodo}`,
    tipo: 'Estrategia',
    senal: `${kpi.nombre} está bajo la meta aprobada`,
    evidencia: [
      `${kpi.code} · ${r.periodo}: ${r.valor}${kpi.unidad === '%' ? '%' : ''} frente a una meta de ${meta.valor}${kpi.unidad === '%' ? '%' : ''}`,
      `Meta aprobada por ambos socios · ${r.nota || 'dato confiable'}`,
    ],
    riesgo: 'medio', prioridad: 'media',
    accion: `Revisar ${kpi.nombre.toLowerCase()} con tu socio y decidir qué se ajusta`,
    artefacto: `Iniciativa ligada a ${kpi.oe}`,
    destino: 'estrategia',
  }));
}

function senalMetasPendientes(items) {
  // Solo las metas que ya tienen un dato real que comparar: pedir firma de una
  // meta que ni siquiera se puede medir sería ruido.
  const esperando = items.filter(i => i.estado === 'pendiente_aprobacion' && i.kpi.calculo !== 'no_medible');
  if (!esperando.length) return [];
  return [decision({
    id: 'metas-por-aprobar',
    tipo: 'Estrategia',
    senal: `${esperando.length} meta${esperando.length > 1 ? 's' : ''} esperan la aprobación de ambos socios`,
    evidencia: esperando.slice(0, 6).map(i => `${i.kpi.code} ${i.kpi.nombre}: ${i.meta.valor === null ? 'sin meta definida' : `propuesta ${i.meta.valor}${i.kpi.unidad === '%' ? '%' : ''}`}`),
    riesgo: 'bajo', prioridad: 'baja',
    accion: 'Revisar las metas y firmar (Felipe y Papá) o ajustar el valor',
    artefacto: 'Metas aprobadas del Plan Estratégico',
    destino: 'estrategia',
  })];
}

function senalCalidad({ ventas, movimientos, ahora }) {
  const ctx = contextoDatos({ ventas, movimientos, ahora });
  const parciales = ctx.cobertura.filter(c => c.estado === 'parcial' && c.mes < ctx.mesActual).slice(-6);
  if (!parciales.length) return [];
  return [decision({
    id: `datos-parciales:${parciales.map(p => p.mes).join(',')}`,
    tipo: 'Estrategia',
    senal: `${parciales.length} mes${parciales.length > 1 ? 'es' : ''} con ventas que no cuadran con el stock`,
    evidencia: parciales.map(p => `${p.mes}: ${p.unidadesLineas} u. en ventas vs ${p.unidadesMovimientos} u. que salieron de stock`),
    riesgo: 'medio', prioridad: 'media',
    accion: 'Decidir qué hacer con las ventas sin registrar de esos meses (completar, o dejarlas fuera de los KPI)',
    artefacto: 'Conciliación de ventas vs inventario',
    destino: 'estrategia',
  })];
}

function senalEquilibrio({ ventas, estrategia }, items, ctxDatos) {
  const l = lineasPresupuesto(estrategia);
  const { subtotalMensual } = resumenPresupuesto(l);
  const margen = items.find(i => i.kpi.code === 'FIN-02')?.r;
  const mes = ctxDatos.mesCompleto;
  if (!subtotalMensual || !margen || margen.valor === null || !mes) return [];
  const pe = puntoEquilibrioParcial(subtotalMensual, margen.valor);
  const vendido = ventas.filter(v => mesSantiago(v.fecha) === mes).reduce((s, v) => s + (v.total || 0), 0);
  if (!pe || vendido >= pe.ventasMensuales) return [];
  return [decision({
    id: `equilibrio-parcial:${mes}`,
    tipo: 'Estrategia',
    senal: `En ${mes} las ventas quedaron bajo el punto de equilibrio parcial`,
    evidencia: [
      `Vendido ${clp(vendido)} · equilibrio parcial ${clp(pe.ventasMensuales)} (gastos conocidos ${clp(subtotalMensual)} ÷ margen ${pe.margenPctUsado}%)`,
      pe.advertencia,
    ],
    riesgo: 'medio', prioridad: 'media',
    accion: 'Confirmar las partidas de presupuesto que faltan antes de decidir recortes',
    artefacto: 'Presupuesto 2027 completo',
    destino: 'estrategia',
  })];
}

export const area = {
  id: 'estrategia',
  nombre: 'Estrategia',
  detectar: (datos, ctx) => {
    const { ventas = [], productos = [], movimientos = [], estrategia = {} } = datos;
    // Sin ventas no hay nada que medir: silencio.
    if (!ventas.length) return [];
    const base = { ventas, productos, movimientos, estrategia, ahora: ctx.ahora };
    const items = evaluar(base);
    const ctxDatos = contextoDatos(base);
    return [
      ...senalesKpi(items),
      ...senalCalidad(base),
      ...senalEquilibrio(base, items, ctxDatos),
      ...senalMetasPendientes(items),
    ];
  },
};
