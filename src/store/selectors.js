// Macaco OS — cálculos de lectura (KPIs, reportes, reposición). Funciones puras.

// ── Helpers de KPI ────────────────────────────────────────────────────────────
export const MESES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];

export function ventasDelDia(ventas, fecha = new Date()) {
  const ref = fecha.toDateString();
  return ventas.filter(v => new Date(v.fecha).toDateString() === ref);
}
export function ventasDelMes(ventas, fecha = new Date()) {
  const mes = fecha.getMonth(), año = fecha.getFullYear();
  return ventas.filter(v => { const d = new Date(v.fecha); return d.getMonth() === mes && d.getFullYear() === año; });
}
export function ventasUltimos7Dias(ventas) {
  const desde = new Date(); desde.setDate(desde.getDate() - 6); desde.setHours(0,0,0,0);
  return ventas.filter(v => new Date(v.fecha) >= desde);
}
export function sumarTotal(lista)  { return lista.reduce((s, v) => s + v.total,  0); }
export function sumarMargen(lista) { return lista.reduce((s, v) => s + v.margen, 0); }
// Un pack son varias líneas con el mismo packId: cuenta como una sola transacción.
export function contarTransacciones(lista) { return new Set(lista.map(v => v.packId || v.id)).size; }

// Meses ('YYYY-MM') con ventas o gastos, del más reciente al más antiguo. Siempre incluye el actual.
export function mesesConDatos(ventas, gastos = []) {
  const keys = new Set([mesKey(new Date())]);
  ventas.forEach(v => keys.add(mesKey(new Date(v.fecha))));
  gastos.forEach(g => keys.add(mesKey(new Date(g.fecha))));
  return [...keys].sort().reverse();
}

// Resumen de un mes: ventas, COGS, gastos de negocio y resultado neto.
export function resumenMes(ventas, gastos, fecha) {
  const vMes   = ventasDelMes(ventas, fecha);
  const total  = sumarTotal(vMes);
  const cogs   = vMes.reduce((n, v) => n + v.costoUnitario * v.cantidad, 0);
  const gNeg   = gastosDelMes(gastos, fecha).filter(g => g.tipo === 'negocio').reduce((n, g) => n + g.monto, 0);
  const top = ventasPorProducto(vMes).sort((a, b) => b.unidades - a.unidades)[0] || null;
  return { total, margen: sumarMargen(vMes), cogs, gastos: gNeg, neto: total - cogs - gNeg, transacciones: contarTransacciones(vMes), top };
}

// Ventas por producto en una lista de ventas, con unidades, total y margen.
export function ventasPorProducto(lista) {
  const m = {};
  lista.forEach(v => {
    const k = v.productoId || v.producto;
    if (!m[k]) m[k] = { id: v.productoId, nombre: v.producto, unidades: 0, total: 0, margen: 0 };
    m[k].unidades += v.cantidad; m[k].total += v.total; m[k].margen += v.margen;
  });
  return Object.values(m).sort((a, b) => b.total - a.total);
}

// Canales de venta que se pueden elegir al registrar. Las ventas viejas no traen canal.
export const CANALES = ['Arica directo', 'Kiosco', 'Shopify', 'Mercado Libre'];
export const SIN_CANAL = 'Sin canal';

// Ventas por canal en una lista de ventas: total, margen y transacciones (un pack = 1).
export function ventasPorCanal(lista) {
  const m = {};
  const vistos = new Set();
  lista.forEach(v => {
    const k = v.canal || SIN_CANAL;
    if (!m[k]) m[k] = { canal: k, total: 0, margen: 0, transacciones: 0 };
    m[k].total += v.total; m[k].margen += v.margen;
    const tx = v.packId || v.id;
    if (!vistos.has(tx)) { vistos.add(tx); m[k].transacciones += 1; }
  });
  return Object.values(m)
    .map(c => ({ ...c, margenPct: c.total > 0 ? (c.margen / c.total) * 100 : 0 }))
    .sort((a, b) => b.total - a.total);
}

export function getDiasDelMes(ventas, fecha = new Date()) {
  const año = fecha.getFullYear(), mes = fecha.getMonth();
  const hoyStr = fecha.toDateString();
  const diasEnMes = new Date(año, mes + 1, 0).getDate();
  const DIAS = ['Dom','Lun','Mar','Mié','Jue','Vie','Sáb'];
  return Array.from({ length: diasEnMes }, (_, i) => {
    const d = new Date(año, mes, i + 1);
    const s = ventas.filter(v => { const vd = new Date(v.fecha); return vd.getFullYear()===año && vd.getMonth()===mes && vd.getDate()===i+1; }).reduce((a,v)=>a+v.total,0);
    return { d: i+1, dow: DIAS[d.getDay()], s, today: d.toDateString()===hoyStr, isFuture: d > fecha };
  });
}
export function getDiasGraficoSemanal(ventas) {
  const DIAS = ['Dom','Lun','Mar','Mié','Jue','Vie','Sáb'];
  return Array.from({ length: 7 }, (_, i) => {
    const desde = new Date(); desde.setDate(desde.getDate()-(6-i)); desde.setHours(0,0,0,0);
    const hasta = new Date(desde); hasta.setDate(hasta.getDate()+1);
    return { d: DIAS[desde.getDay()], v: ventas.filter(v=>{const d=new Date(v.fecha);return d>=desde&&d<hasta;}).reduce((a,v)=>a+v.total,0), isToday: i===6 };
  });
}
export function getTopProductos(ventas, n = 3) {
  const m = {};
  ventas.forEach(v => { if (!m[v.producto]) m[v.producto]={n:v.producto,q:0,v:0}; m[v.producto].q+=v.cantidad; m[v.producto].v+=v.total; });
  return Object.values(m).sort((a,b)=>b.v-a.v).slice(0,n);
}

// ── Módulo de Gastos ──────────────────────────────────────────────────────────
export function gastosDelMes(gastos, fecha = new Date()) {
  const mes = fecha.getMonth(), año = fecha.getFullYear();
  return gastos.filter(g => { const d = new Date(g.fecha); return d.getMonth()===mes && d.getFullYear()===año; });
}
export function sumarGastos(lista) { return lista.reduce((s, g) => s + g.monto, 0); }

// ── Métricas Fase 2 ───────────────────────────────────────────────────────────
export function calcMetricasInventario(ventas, movimientos, productos, fecha = new Date()) {
  const mes = fecha.getMonth(), año = fecha.getFullYear();
  const vMes = ventas.filter(v=>{const d=new Date(v.fecha);return d.getMonth()===mes&&d.getFullYear()===año;});
  const cogsMes = vMes.reduce((s,v)=>s+v.costoUnitario*v.cantidad,0);
  const unidadesVendidas = vMes.reduce((s,v)=>s+v.cantidad,0);
  const comprasMes = movimientos.filter(m=>{const d=new Date(m.fecha);return m.tipo==='compra'&&d.getMonth()===mes&&d.getFullYear()===año;});
  const unidadesRecibidas = comprasMes.reduce((s,m)=>s+Math.abs(m.delta),0);
  const inventarioActual = productos.reduce((s,p)=>s+p.stock*p.cost,0);
  const str = unidadesRecibidas>0?(unidadesVendidas/unidadesRecibidas)*100:null;
  const rotacion = inventarioActual>0?cogsMes/inventarioActual:null;
  const dsi = rotacion>0?Math.round(30/rotacion):null;
  return { cogsMes, unidadesVendidas, unidadesRecibidas, inventarioActual, str, rotacion, dsi };
}

// ── Módulo de Clientes ────────────────────────────────────────────────────────
export function getResumenClientes(ventas) {
  const m = {};
  ventas.forEach(v => {
    const key = (v.cliente||'').trim(); if (!key) return;
    if (!m[key]) m[key]={nombre:key,ltv:0,compras:0,margen:0,ultima:v.fecha,productos:{}};
    m[key].ltv+=v.total; m[key].margen+=v.margen; m[key].compras++;
    if(v.fecha>m[key].ultima) m[key].ultima=v.fecha;
    if(!m[key].productos[v.producto]) m[key].productos[v.producto]=0;
    m[key].productos[v.producto]+=v.cantidad;
  });
  return Object.values(m).map(c=>({...c, ticketPromedio:c.ltv/c.compras, margenPct:c.ltv>0?(c.margen/c.ltv)*100:0, topProducto:Object.entries(c.productos).sort((a,b)=>b[1]-a[1])[0]?.[0]||'—'})).sort((a,b)=>b.ltv-a.ltv);
}

// Rotación por producto en un mes. El stock al inicio/fin se reconstruye restando al
// stock actual los movimientos posteriores. Rotación = unidades vendidas / stock promedio
// (promedio entre inicio, disponible tras compras y fin de mes);
// días = cada cuánto se renueva ese stock al ritmo del mes.
export function rotacionProductosMes(ventas, movimientos, productos, fecha, diasTranscurridos) {
  const ini = new Date(fecha.getFullYear(), fecha.getMonth(), 1);
  const fin = new Date(fecha.getFullYear(), fecha.getMonth() + 1, 1);
  const diasMes = diasTranscurridos || new Date(fecha.getFullYear(), fecha.getMonth() + 1, 0).getDate();
  const vMes = ventasDelMes(ventas, fecha);
  const porProd = {};
  ventasPorProducto(vMes).forEach(f => { porProd[f.id || f.nombre] = f; });

  const filas = productos.map(p => {
    const v = porProd[p.id] || { unidades: 0, total: 0, margen: 0 };
    let despuesFin = 0, desdeIni = 0, compras = 0;
    movimientos.forEach(m => {
      if (m.productoId !== p.id) return;
      const t = new Date(m.fecha);
      if (t >= fin) despuesFin += m.delta;
      if (t >= ini) desdeIni += m.delta;
      if (t >= ini && t < fin && m.tipo === 'compra') compras += m.delta;
    });
    const stockFin = Math.max(0, p.stock - despuesFin);
    const stockIni = Math.max(0, p.stock - desdeIni);
    const disponible = stockIni + compras;
    const promedio = (stockIni + disponible + stockFin) / 3;
    const rotacion = promedio > 0 && v.unidades > 0 ? v.unidades / promedio : null;
    return {
      id: p.id, nombre: p.name, unidades: v.unidades, total: v.total, margen: v.margen,
      stockIni, stockFin, compras, promedio, rotacion,
      diasRotacion: rotacion ? Math.round(diasMes / rotacion) : null,
      vendidoPct: disponible > 0 ? Math.min(100, (v.unidades / disponible) * 100) : null,
    };
  });
  // Productos que ya no están en el catálogo pero se vendieron ese mes
  Object.values(porProd).forEach(f => {
    if (!productos.some(p => p.id === f.id)) {
      filas.push({ id: f.id, nombre: f.nombre, unidades: f.unidades, total: f.total, margen: f.margen,
        stockIni: 0, stockFin: 0, compras: 0, promedio: 0, rotacion: null, diasRotacion: null, vendidoPct: null });
    }
  });
  return filas
    .filter(f => f.unidades > 0 || f.stockIni > 0 || f.stockFin > 0)
    .sort((a, b) => b.total - a.total || b.stockFin - a.stockFin);
}

// ── Pedidos a proveedores ─────────────────────────────────────────────────────
// Fechas como 'YYYY-MM-DD' (hora local) para que los días de demora sean exactos.
export const hoyISO = (d = new Date()) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

export function diasEntre(a, b) {
  const [ya, ma, da] = a.split('-').map(Number);
  const [yb, mb, db] = b.split('-').map(Number);
  return Math.round((Date.UTC(yb, mb - 1, db) - Date.UTC(ya, ma - 1, da)) / 86400000);
}

export function sumarDias(iso, n) {
  const [y, m, d] = iso.split('-').map(Number);
  return hoyISO(new Date(y, m - 1, d + n));
}

// Proveedores habituales: aparecen siempre como opción al registrar un pedido.
export const PROVEEDORES_BASE = ['Grizzly', 'Grober', 'Distribuidora Raw', 'HNS', 'SNS'];

// Por proveedor: demora promedio real (pedido → llegada), cuánto se ha invertido y qué está en camino.
export function resumenProveedores(pedidos) {
  const m = {};
  pedidos.filter(p => p.estado !== 'cancelado' && (p.proveedor || '').trim()).forEach(p => {
    const k = p.proveedor.trim();
    if (!m[k]) m[k] = { proveedor: k, tiempos: [], pedidos: 0, invertido: 0, enCamino: 0, ultimo: null, vistos: new Set() };
    const g = m[k];
    g.invertido += (p.costoUnitario || 0) * p.cantidad;
    // Las líneas de un mismo pedido (ordenId) cuentan como una sola entrega.
    const orden = p.ordenId || p.id;
    if (!g.vistos.has(orden)) {
      g.vistos.add(orden);
      g.pedidos++;
      if (p.estado === 'recibido' && p.fechaLlegada) g.tiempos.push(diasEntre(p.fechaPedido, p.fechaLlegada));
      else g.enCamino++;
    }
    if (!g.ultimo || p.fechaPedido > g.ultimo) g.ultimo = p.fechaPedido;
  });
  return Object.values(m).map(({ vistos, ...g }) => ({
    ...g,
    recibidos: g.tiempos.length,
    promedio:  g.tiempos.length ? Math.round(g.tiempos.reduce((a, b) => a + b, 0) / g.tiempos.length * 10) / 10 : null,
    min:       g.tiempos.length ? Math.min(...g.tiempos) : null,
    max:       g.tiempos.length ? Math.max(...g.tiempos) : null,
  })).sort((a, b) => b.invertido - a.invertido);
}

// Cuándo y cuánto pedir de cada producto, según su ritmo de venta y la demora
// promedio del proveedor con el que se compró por última vez.
export function sugerenciasReposicion({ productos, ventas, pedidos, hoy = new Date(), colchon = 5, cobertura = 30, leadDefecto = 7 }) {
  if (ventas.length === 0) return [];
  const hoyStr  = hoyISO(hoy);
  const primera = ventas.reduce((min, v) => { const d = hoyISO(new Date(v.fecha)); return d < min ? d : min; }, hoyStr);
  const ventana = Math.min(30, Math.max(7, diasEntre(primera, hoyStr) + 1));
  const desde   = sumarDias(hoyStr, -(ventana - 1));
  const unidades = {};
  ventas.forEach(v => {
    if (hoyISO(new Date(v.fecha)) >= desde) unidades[v.productoId] = (unidades[v.productoId] || 0) + v.cantidad;
  });
  const provs = resumenProveedores(pedidos);

  return productos.map(p => {
    const ritmo = (unidades[p.id] || 0) / ventana;
    if (ritmo <= 0) return null;
    const delProd  = pedidos.filter(x => x.productoId === p.id && x.estado !== 'cancelado')
                            .sort((a, b) => b.fechaPedido.localeCompare(a.fechaPedido));
    const proveedor = delProd[0]?.proveedor || null;
    const leadReal  = provs.find(g => g.proveedor === proveedor)?.promedio ?? null;
    const lead      = Math.ceil(leadReal ?? leadDefecto);
    const enCamino  = delProd.filter(x => x.estado === 'pedido' || x.estado === 'en_camino').reduce((n, x) => n + x.cantidad, 0);
    const diasStock = p.stock / ritmo;
    const cantidad  = Math.max(0, Math.ceil(ritmo * (lead + colchon + cobertura) - p.stock - enCamino));
    if (cantidad === 0) return null;
    // Lo que ya viene en camino cuenta como cobertura: evita pedir de nuevo lo que ya se pidió.
    const diasParaPedir = Math.floor((p.stock + enCamino) / ritmo - (lead + colchon));
    return {
      id: p.id, nombre: p.name, stock: p.stock, costo: p.cost, ritmo, diasStock: Math.floor(diasStock),
      proveedor, lead, leadEstimado: leadReal === null, enCamino,
      diasParaPedir, fechaPedir: sumarDias(hoyStr, Math.max(0, diasParaPedir)),
      cantidad, inversion: cantidad * p.cost,
    };
  }).filter(Boolean).sort((a, b) => a.diasParaPedir - b.diasParaPedir);
}

// ── Meses ─────────────────────────────────────────────────────────────────────
// Clave de mes 'YYYY-MM' — se comparan como strings, sin líos de zona horaria.
export const mesKey = (fecha = new Date()) =>
  `${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(2, '0')}`;

export function mesLabel(key) {
  const [a, m] = (key || '').split('-');
  const i = parseInt(m, 10) - 1;
  return MESES[i] ? `${MESES[i]} ${a}` : key;
}

export function mesSiguiente(key) {
  const [a, m] = key.split('-').map(Number);
  return m === 12 ? `${a + 1}-01` : `${a}-${String(m + 1).padStart(2, '0')}`;
}

// Interés de los tramos ya cumplidos a la fecha. Tasa fija sobre el capital
// (no compuesta): oct 10% + nov 5% + dic 5% sobre $2.000.000 = $400.000.
