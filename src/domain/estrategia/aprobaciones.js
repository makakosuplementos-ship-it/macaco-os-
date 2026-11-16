// Aprobación de metas por AMBOS socios.
//
// Importante: Macako 2 usa una sola cuenta compartida, así que no se puede
// comprobar QUIÉN toca el botón. Cada firma es DECLARADA ("Firmar como Felipe",
// "Firmar como Papá") y queda con fecha. Una meta cuenta como aprobada solo si
// tiene las dos firmas y un valor; cambiar el valor borra las firmas.
import { SOCIOS } from './plan.js';

export const metaAprobada = (m) =>
  !!m && m.estado === 'aprobada' && m.valor !== null && m.valor !== undefined && SOCIOS.every(s => !!m.firmas?.[s]);

export const faltanFirmas = (m) => SOCIOS.filter(s => !m?.firmas?.[s]);

// Meta propuesta: parte de lo que dice el catálogo; aún sin firmas.
export const metaPropuesta = (valor, nota = '', ahora = new Date().toISOString()) =>
  ({ valor, estado: 'propuesta', firmas: {}, nota, actualizada: ahora });

export function firmar(meta, socio, ahora = new Date().toISOString()) {
  if (!SOCIOS.includes(socio)) throw new Error(`Socio desconocido: ${socio}`);
  if (meta.valor === null || meta.valor === undefined) throw new Error('No se puede firmar una meta sin valor.');
  const firmas = { ...(meta.firmas || {}), [socio]: ahora };
  const completa = SOCIOS.every(s => !!firmas[s]);
  return { ...meta, firmas, estado: completa ? 'aprobada' : 'propuesta', aprobadaEl: completa ? ahora : null, actualizada: ahora };
}

export function quitarFirma(meta, socio, ahora = new Date().toISOString()) {
  const firmas = { ...(meta.firmas || {}) };
  delete firmas[socio];
  return { ...meta, firmas, estado: 'propuesta', aprobadaEl: null, actualizada: ahora };
}

// Cambiar el valor de una meta invalida lo aprobado antes.
export const cambiarValor = (meta, valor, ahora = new Date().toISOString()) =>
  ({ ...meta, valor, estado: 'propuesta', firmas: {}, aprobadaEl: null, actualizada: ahora });
