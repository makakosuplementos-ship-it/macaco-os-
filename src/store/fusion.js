// Fusión de tres vías para cuando dos celulares cambian lo mismo.
//
//   base   = lo último que este celular sabe que estaba en Supabase
//   local  = lo que este celular tiene ahora (con cambios sin enviar)
//   remoto = lo que hay en Supabase ahora (puede traer cambios del otro celular)
//
// Resultado = remoto + lo que cambió este celular desde la base. Así una venta
// hecha sin señal no borra la venta que el otro celular registró mientras tanto.
// Números (caja) y stock se fusionan por DIFERENCIA: si uno sumó 15.000 y el
// otro 20.000, la caja sube 35.000.

const igual = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const idDe = (x) => (x && x.id != null ? String(x.id) : null);
const fechaDe = (x) => x?.fecha || x?.creadoEn || null;

function porId(lista) {
  const m = new Map();
  (lista || []).forEach(x => { const k = idDe(x); if (k) m.set(k, x); });
  return m;
}

const esMapa = (x) => !!x && typeof x === 'object' && !Array.isArray(x);
const sumaMapa = (m) => Object.values(m).reduce((n, u) => n + u, 0);

// Sabores de un producto ({ sabor: unidades }): cada sabor se fusiona por DIFERENCIA,
// igual que el stock. Si cada celular vendió un sabor distinto, quedan las dos ventas.
function fusionarSabores(base, local, remoto) {
  const out = {};
  new Set([...Object.keys(local), ...Object.keys(remoto)]).forEach(n => {
    const enB = n in base, enL = n in local, enR = n in remoto;
    if (enB && (!enL || !enR)) return;                       // alguien lo quitó
    if (enB) out[n] = Math.max(0, remoto[n] + (local[n] - base[n]));
    else out[n] = enL ? local[n] : remoto[n];                // sabor nuevo
  });
  return out;
}

function fusionarObjeto(base, local, remoto, numericos = []) {
  const out = { ...remoto };
  Object.keys(local).forEach(k => {
    if (k === 'sabores' && esMapa(local[k]) && esMapa(base[k]) && esMapa(remoto[k])) {
      out[k] = fusionarSabores(base[k], local[k], remoto[k]);
    } else if (numericos.includes(k) && typeof local[k] === 'number' && typeof base[k] === 'number' && typeof remoto[k] === 'number') {
      out[k] = Math.max(0, remoto[k] + (local[k] - base[k]));
    } else if (!igual(local[k], base[k])) {
      out[k] = local[k];
    }
  });
  Object.keys(base).forEach(k => { if (!(k in local)) delete out[k]; });
  // Con sabores, el stock total es siempre la suma. Si por una activación de sabores
  // en un celular y una venta en el otro quedó una diferencia, se absorbe aquí: lo que
  // sobra va a "Sin asignar"; lo que falta se descuenta de "Sin asignar" y, si no
  // alcanza, del sabor con más unidades (no sabemos de cuál fue la venta).
  if (esMapa(out.sabores) && typeof out.stock === 'number') {
    const sab = { ...out.sabores };
    let falta = out.stock - sumaMapa(sab);
    if (falta > 0) sab['Sin asignar'] = (sab['Sin asignar'] ?? 0) + falta;
    while (falta < 0) {
      const [mayor] = (sab['Sin asignar'] > 0 ? ['Sin asignar'] : Object.entries(sab).sort((a, b) => b[1] - a[1])[0] || []);
      if (!mayor || sab[mayor] <= 0) break;
      const saca = Math.min(sab[mayor], -falta);
      sab[mayor] -= saca; falta += saca;
    }
    out.sabores = sab;
    out.stock = sumaMapa(sab);
  }
  return out;
}

// Listas de registros con `id` (ventas, movimientos, gastos, pedidos, deudas, productos).
export function fusionarLista(base = [], local = [], remoto = [], { numericos = [] } = {}) {
  const B = porId(base), L = porId(local), R = porId(remoto);
  const nuevosLocal = local.filter(x => { const k = idDe(x); return k && !B.has(k) && !R.has(k); });
  const out = [...nuevosLocal];
  remoto.forEach(r => {
    const k = idDe(r);
    if (!k) { out.push(r); return; }
    const b = B.get(k), l = L.get(k);
    if (b && !l) return;                         // este celular lo borró
    if (b && l && !igual(l, b)) out.push(fusionarObjeto(b, l, r, numericos)); // este celular lo editó
    else out.push(r);
  });
  // Lo más nuevo primero, si los registros tienen fecha (orden estable).
  if (out.length && out.every(fechaDe)) {
    return out.map((x, i) => [x, i])
      .sort((a, b) => (fechaDe(b[0]) > fechaDe(a[0]) ? 1 : fechaDe(b[0]) < fechaDe(a[0]) ? -1 : a[1] - b[1]))
      .map(([x]) => x);
  }
  return out;
}

export function fusionarValor(clave, base, local, remoto) {
  if (base === undefined || base === null) return local;   // sin base no hay cómo fusionar: gana lo local
  if (remoto === undefined || remoto === null) return local;
  if (igual(remoto, base)) return local;                    // nadie más cambió nada
  if (igual(local, base)) return remoto;                    // solo cambió el otro
  if (typeof local === 'number' && typeof base === 'number' && typeof remoto === 'number') {
    return remoto + (local - base);
  }
  if (Array.isArray(local) && Array.isArray(base) && Array.isArray(remoto)) {
    return fusionarLista(base, local, remoto, { numericos: clave.endsWith(':productos') ? ['stock'] : [] });
  }
  if (local && base && remoto && typeof local === 'object' && typeof base === 'object' && typeof remoto === 'object') {
    return fusionarObjeto(base, local, remoto);
  }
  return local;
}
