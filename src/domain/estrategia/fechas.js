// Fechas en hora de Chile. Supabase guarda las fechas en UTC: agrupar por mes
// o por día SIN convertir mueve ventas de un mes a otro (la venta de las 22:30
// del 31-oct en Santiago ya es 1-nov en UTC). Todo el módulo de estrategia usa
// estas funciones y nunca getMonth()/getDate() del dispositivo.

const TZ = 'America/Santiago';
const formato = new Intl.DateTimeFormat('en-CA', { timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit' });

// '2026-11-01T01:30:00Z' → '2026-10-31'
export const fechaSantiago = (iso) => formato.format(new Date(iso));

// → '2026-10'
export const mesSantiago = (iso) => fechaSantiago(iso).slice(0, 7);

export const diaDelMes = (iso) => Number(fechaSantiago(iso).slice(8, 10));

export function mesAnterior(mes) {
  const [a, m] = mes.split('-').map(Number);
  return new Date(Date.UTC(a, m - 2, 1)).toISOString().slice(0, 7);
}

export function diasDelMes(mes) {
  const [a, m] = mes.split('-').map(Number);
  return new Date(Date.UTC(a, m, 0)).getUTCDate();
}

// Diferencia en días entre dos fechas 'YYYY-MM-DD'.
export const diasEntre = (a, b) => Math.round((Date.parse(b) - Date.parse(a)) / 86_400_000);
