// Estado de cada KPI frente a su meta (el "semáforo").
//
//   sin_datos            — el KPI no se puede medir hoy (NO se pinta rojo)
//   pendiente_aprobacion — la meta falta, o es provisional y no tiene las 2 firmas
//   datos_incompletos    — hay meta aprobada, pero la calidad del dato no alcanza
//   en_meta / bajo_meta / sobre_meta — comparación real (solo con meta aprobada y dato confiable)
//   no_aplica            — los socios marcaron la meta como no aplicable
//
// "Menor es mejor" invierte la comparación. Mayor no siempre es mejor: un KPI
// de rango puede estar sobre la meta sin ser bueno.
import { metaAprobada } from './aprobaciones.js';

// La meta vigente de un KPI: la guardada por los socios, o la del catálogo.
export function metaEfectiva(kpi, estrategia = {}) {
  const g = estrategia[`meta:${kpi.code}`];
  if (g) {
    return {
      valor: g.valor ?? null, min: g.min ?? null, max: g.max ?? null,
      estado: metaAprobada(g) ? 'aprobada' : 'propuesta', firmas: g.firmas || {}, nota: g.nota || kpi.meta.nota,
      noAplica: !!g.noAplica, guardada: true,
    };
  }
  return { valor: kpi.meta.valor, min: null, max: null, estado: kpi.meta.estado, firmas: {}, nota: kpi.meta.nota, noAplica: false, guardada: false };
}

const cumple = (kpi, valor, meta) => {
  if (kpi.direccion === 'rango') {
    if (meta.min === null || meta.max === null) return null;
    return valor < meta.min ? 'bajo_meta' : valor > meta.max ? 'sobre_meta' : 'en_meta';
  }
  if (meta.valor === null || meta.valor === undefined) return null;
  if (kpi.direccion === 'menor') return valor <= meta.valor ? 'en_meta' : 'bajo_meta';
  return valor >= meta.valor ? 'en_meta' : 'bajo_meta';   // 'mayor' e 'hito'
};

// Comparación informativa, aunque la meta sea provisional: no cambia el estado.
export const compararConMeta = (kpi, resultado, meta) =>
  (resultado.valor === null || resultado.valor === undefined) ? null : cumple(kpi, resultado.valor, meta);

export function estadoKpi(kpi, resultado, meta) {
  if (meta.noAplica) return 'no_aplica';
  if (resultado.valor === null || resultado.valor === undefined || resultado.calidad === 'no_medible') return 'sin_datos';
  if (meta.estado !== 'aprobada') return 'pendiente_aprobacion';
  if (resultado.calidad !== 'confiable') return 'datos_incompletos';
  return cumple(kpi, resultado.valor, meta) || 'pendiente_aprobacion';
}

export function contarEstados(items) {
  return items.reduce((a, i) => { a[i.estado] = (a[i.estado] || 0) + 1; return a; }, {});
}
