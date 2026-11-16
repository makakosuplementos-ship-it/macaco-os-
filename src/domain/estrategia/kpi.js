// Calculadoras de KPI. Funciones puras: mismos datos → mismo resultado.
//
// Cada KPI devuelve { valor, periodo, calidad, nota, evidencia, detalle }.
//   calidad: 'confiable' | 'parcial' | 'pendiente_validacion' | 'no_medible'
// Regla "fuente o silencio": si faltan datos el valor es null y la calidad es
// 'no_medible'. Nunca se rellena con 0, ni se interpola, ni se asume.
import { KPIS } from './plan.js';
import { mesSantiago, mesAnterior, fechaSantiago, diasEntre } from './fechas.js';
import { calidadVentas, coberturaMensual, ultimoMesCompleto } from './calidad.js';
import { canalTransaccion, ventasPorCanalTransaccion, SIN_CANAL, NO_MAPEADO } from './canales.js';

const suma = (lista, campo) => lista.reduce((s, v) => s + (v[campo] || 0), 0);
const lineasDe = (ventas, mes) => ventas.filter(v => mesSantiago(v.fecha) === mes);
const redondear = (n, d = 1) => Math.round(n * 10 ** d) / 10 ** d;
const ESTADO_COBERTURA = {
  completo: 'datos cuadrados con el stock', parcial: 'las ventas no cuadran con el stock',
  solo_movimientos: 'sin líneas de venta', sin_actividad: 'sin actividad',
};

function resultado(kpi, extra = {}) {
  return {
    code: kpi.code, oe: kpi.oe, unidad: kpi.unidad, formulaVersion: kpi.formulaVersion,
    valor: null, periodo: null, calidad: 'no_medible', nota: null, evidencia: [], detalle: null,
    ...extra,
  };
}

const sinDatos = (kpi, nota) => resultado(kpi, { nota });

const CALCULOS = {
  'FIN-01': (k, c) => {
    if (!c.mesCompleto) return sinDatos(k, 'Aún no hay un mes completo con los datos cuadrados contra el stock.');
    const previo = mesAnterior(c.mesCompleto);
    const covPrevio = c.cobertura.find(x => x.mes === previo);
    if (!covPrevio || covPrevio.estado !== 'completo') {
      return sinDatos(k, `${c.mesCompleto} es el primer mes comparable: ${previo} ${covPrevio ? `no lo es (${ESTADO_COBERTURA[covPrevio.estado]})` : 'no tiene datos'}, y ${c.mesActual} está en curso. No se compara un mes parcial con uno completo.`);
    }
    const actual = suma(lineasDe(c.ventas, c.mesCompleto), 'total');
    const anterior = suma(lineasDe(c.ventas, previo), 'total');
    if (!anterior) return sinDatos(k, `Sin ventas registradas en ${previo}.`);
    return resultado(k, {
      valor: redondear((actual / anterior - 1) * 100), periodo: `${previo} → ${c.mesCompleto}`, calidad: 'parcial',
      nota: 'Solo ventas de la app; Mercado Libre y Shopify aún no están conciliados.',
      evidencia: [`${c.mesCompleto}: ${actual} · ${previo}: ${anterior}`],
    });
  },

  'FIN-02': (k, c) => {
    const mes = c.mesCompleto || c.mesActual;
    const l = lineasDe(c.ventas, mes);
    if (!l.length) return sinDatos(k, `Sin ventas registradas en ${mes}.`);
    const total = suma(l, 'total');
    return resultado(k, {
      valor: total ? redondear(suma(l, 'margen') / total * 100) : null, periodo: mes, calidad: 'parcial',
      nota: 'Sin descuentos ni devoluciones, y con la convención tributaria por confirmar.',
      evidencia: [`${l.length} líneas · ventas ${total} · margen ${suma(l, 'margen')}`],
      detalle: { periodoCompleto: mes === c.mesCompleto },
    });
  },

  'COM-01': (k, c) => {
    const mes = c.mesCompleto || c.mesActual;
    const l = lineasDe(c.ventas, mes);
    if (!l.length) return sinDatos(k, `Sin ventas registradas en ${mes}.`);
    const porCanal = ventasPorCanalTransaccion(l);
    const q = calidadVentas(l);
    const sinCanal = porCanal.find(x => x.canal === SIN_CANAL);
    return resultado(k, {
      valor: suma(l, 'total'), periodo: mes,
      calidad: q.idsDuplicados ? 'pendiente_validacion' : 'parcial',
      nota: q.idsDuplicados
        ? `Hay ${q.idsDuplicados} id de venta repetido(s): revisar duplicados antes de usar la cifra.`
        : 'Mercado Libre y Shopify se suman solo tras conciliar contra la app.',
      evidencia: sinCanal ? [`${sinCanal.lineas} línea(s) sin canal registrado: no se les asigna origen.`] : [],
      detalle: { porCanal, periodoCompleto: mes === c.mesCompleto },
    });
  },

  'COM-02': (k, c) => {
    const mes = c.mesCompleto || c.mesActual;
    const l = lineasDe(c.ventas, mes);
    const total = suma(l, 'total');
    if (!l.length || !total) return sinDatos(k, `Sin ventas registradas en ${mes}.`);
    const porProducto = {};
    l.forEach(v => {
      const id = v.productoId || v.producto;
      porProducto[id] ||= { nombre: v.producto, total: 0, unidades: 0 };
      porProducto[id].total += v.total || 0;
      porProducto[id].unidades += v.cantidad || 0;
    });
    const lider = Object.values(porProducto).sort((a, b) => b.total - a.total)[0];
    const cobMes = c.cobertura.find(x => x.mes === mes);
    return resultado(k, {
      valor: redondear(lider.total / total * 100), periodo: mes,
      calidad: cobMes?.estado === 'completo' ? 'confiable' : 'parcial',
      detalle: { lider: lider.nombre, unidades: lider.unidades },
    });
  },

  'CLI-02': (k, c) => {
    const l = lineasDe(c.ventas, c.mesActual);
    if (!l.length) return sinDatos(k, `Sin ventas registradas en ${c.mesActual}.`);
    const q = calidadVentas(l);
    return resultado(k, {
      valor: redondear(q.pctConCliente), periodo: c.mesActual, calidad: 'confiable',
      evidencia: [`${l.length - q.sinCliente} de ${l.length} líneas con cliente`],
    });
  },

  'DAT-01': (k, c) => {
    const l = lineasDe(c.ventas, c.mesActual);
    if (!l.length) return sinDatos(k, `Sin ventas registradas en ${c.mesActual}.`);
    const validas = l.filter(v => ![SIN_CANAL, NO_MAPEADO].includes(canalTransaccion(v))).length;
    return resultado(k, {
      valor: redondear(validas / l.length * 100), periodo: c.mesActual, calidad: 'confiable',
      evidencia: [`${validas} de ${l.length} líneas con canal válido`],
    });
  },

  'OPS-01': (k, c) => {
    const hoy = fechaSantiago(c.ahora);
    const recientes = c.ventas.filter(v => diasEntre(fechaSantiago(v.fecha), hoy) <= 60);
    if (!recientes.length) return sinDatos(k, 'Sin ventas en los últimos 60 días para definir qué SKU son prioritarios.');
    const ids = [...new Set(recientes.map(v => v.productoId))];
    const quiebres = ids.map(id => c.productos.find(p => p.id === id)).filter(p => p && (p.stock || 0) <= 0);
    return resultado(k, {
      valor: quiebres.length, periodo: `hoy · últimos 60 días`, calidad: 'parcial',
      nota: 'Prioritario = se vendió en los últimos 60 días. Provisional hasta tener clasificación ABC.',
      evidencia: quiebres.map(p => `${p.name}: stock 0`),
      detalle: { prioritarios: ids.length, quiebres: quiebres.map(p => ({ id: p.id, nombre: p.name })) },
    });
  },

  'OPS-02': (k, c) => {
    if (!c.ventas.length) return sinDatos(k, 'Sin ventas registradas.');
    const hoy = fechaSantiago(c.ahora);
    const primera = c.ventas.map(v => fechaSantiago(v.fecha)).sort()[0];
    const dias = Math.min(30, Math.max(7, diasEntre(primera, hoy) + 1));
    const ventana = c.ventas.filter(v => diasEntre(fechaSantiago(v.fecha), hoy) < dias);
    const costoVendido = ventana.reduce((s, v) => s + (v.costoUnitario || 0) * (v.cantidad || 0), 0);
    const inventario = c.productos.reduce((s, p) => s + Math.max(0, p.stock || 0) * (p.cost || 0), 0);
    if (!costoVendido) return sinDatos(k, 'Sin costo de ventas en la ventana para calcular la cobertura.');
    return resultado(k, {
      valor: Math.round(inventario / (costoVendido / dias)), periodo: `hoy · últimos ${dias} días`, calidad: 'parcial',
      nota: 'Cobertura de todo el inventario al ritmo de venta reciente; el detalle por SKU está en Inventario.',
      detalle: { inventarioCosto: inventario, costoVendido, diasVentana: dias, rotacion: redondear(costoVendido / inventario, 2) },
    });
  },
};

// Calcula todos los KPI del catálogo. `estrategia` trae los registros manuales
// (man:<code>) y las validaciones de calidad (cal:<code>) de los socios.
export function calcularKpis({ ventas = [], productos = [], movimientos = [], estrategia = {}, ahora = Date.now() } = {}) {
  const mesActual = mesSantiago(new Date(ahora).toISOString());
  const cobertura = coberturaMensual({ ventas, movimientos });
  const ctx = { ventas, productos, movimientos, ahora, mesActual, cobertura, mesCompleto: ultimoMesCompleto(cobertura, mesActual) };

  return KPIS.map(k => {
    let r;
    if (k.calculo === 'auto') {
      r = CALCULOS[k.code](k, ctx);
    } else if (k.calculo === 'manual') {
      const m = estrategia[`man:${k.code}`];
      r = (m && typeof m.valor === 'number')
        ? resultado(k, { valor: m.valor, periodo: (m.fecha || '').slice(0, 7) || null, calidad: 'pendiente_validacion',
            nota: m.nota || 'Registrado a mano por un socio.', evidencia: m.evidencia ? [m.evidencia] : [] })
        : sinDatos(k, 'Sin registro manual todavía.');
    } else {
      r = sinDatos(k, k.razon);
    }
    // Un socio puede validar la calidad de un KPI ya calculado.
    const val = estrategia[`cal:${k.code}`];
    if (val?.calidad && r.valor !== null) r = { ...r, calidad: val.calidad, nota: val.nota || r.nota };
    return r;
  });
}

export const contextoDatos = ({ ventas = [], movimientos = [], ahora = Date.now() } = {}) => {
  const mesActual = mesSantiago(new Date(ahora).toISOString());
  const cobertura = coberturaMensual({ ventas, movimientos });
  return { mesActual, cobertura, mesCompleto: ultimoMesCompleto(cobertura, mesActual), calidad: calidadVentas(ventas) };
};
