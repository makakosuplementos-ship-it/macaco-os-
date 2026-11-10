// Macaco OS — estado global.
//
// - Las reglas de plata y stock están en domain/ledger.js (puras, con tests).
// - El guardado está en store/persist.js: copia local + bandeja de salida que
//   reintenta hasta que Supabase confirma, y fusiona con lo del otro celular.
// - Este provider solo junta las dos cosas: cada acción calcula el parche con
//   el ledger y lo pasa por commit(), que actualiza la pantalla y lo guarda
//   (vía pushDB → bandeja → proxy /api/db → Supabase).
import { createContext, useContext, useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { selectAll, selectClaves, upsertRows, pushInventarioRows } from './services/supabase.js';
import { supabase } from './services/supabaseAuth.js';
import * as ledger from './domain/ledger.js';
import { calcStatus, nuevoId } from './domain/ledger.js';
import { crearPersistencia, resolverCarga } from './store/persist.js';
import { CLAVES, SEMILLAS } from './store/semillas.js';
import { catalogoPublico } from './domain/catalogoWeb.js';

const CLAVE_CATALOGO = 'macaco:catalogo';

export * from './store/selectors.js';
export { calcStatus };

// Sync por producto a la tabla `inventario` (catálogo público). No es la fuente
// de verdad: si falla, se reintenta con el próximo cambio de ese producto.
function pushInv(productos) {
  if (!productos.length) return;
  pushInventarioRows(productos)
    .then(() => console.log('[inv] ✅', productos.map(p => p.name).join(', ')))
    .catch(err => console.error('[inv] ❌', err.message));
}

const conStatus = (productos, alerta) =>
  (productos || []).map(p => ({ ...p, status: calcStatus(p.stock, alerta) }));

const AppContext = createContext(null);

export function AppProvider({ children }) {
  const [sync, setSync] = useState({ pendientes: 0, enviando: false, error: null, ultimoOk: null });

  // Estado en un solo objeto + ref síncrona: dos acciones seguidas (ej. recibir
  // varias líneas de un pedido) siempre parten del estado ya actualizado.
  const ref = useRef(null);
  const [estado, setEstadoRaw] = useState(() => {
    const e = {};
    Object.entries(CLAVES).forEach(([k, clave]) => {
      try {
        const v = localStorage.getItem(clave);
        e[k] = v !== null ? JSON.parse(v) : SEMILLAS[k];
      } catch { e[k] = SEMILLAS[k]; }
    });
    e.productos = conStatus(e.productos, e.config?.alertaStockBajo ?? 3);
    ref.current = e;
    return e;
  });
  const setEstado = useCallback((parcial) => {
    ref.current = { ...ref.current, ...parcial };
    setEstadoRaw(ref.current);
  }, []);

  const [cargandoDB, setCargandoDB] = useState(true);
  const [errorDB, setErrorDB]       = useState(null);

  // Valores que llegan de Supabase (fusión con el otro celular) → a la pantalla.
  const desdeClaves = useCallback((porClave) => {
    const parcial = {};
    Object.entries(CLAVES).forEach(([k, clave]) => { if (clave in porClave) parcial[k] = porClave[clave]; });
    if (parcial.productos) parcial.productos = conStatus(parcial.productos, (parcial.config || ref.current.config)?.alertaStockBajo ?? 3);
    if (Object.keys(parcial).length) setEstado(parcial);
  }, [setEstado]);

  const persistRef = useRef(null);
  if (!persistRef.current) {
    persistRef.current = crearPersistencia({
      upsert: (filas) => upsertRows('app_data', filas),
      leerRemoto: (claves) => selectClaves(claves),
      alCambiar: setSync,
      alFusionar: (v) => desdeClaves(v),
    });
  }
  const persist = persistRef.current;

  // pushDB: TODA escritura pasa por aquí. Varias claves en una llamada = un envío.
  const pushDB = useCallback((porClave) => persist.guardar(porClave), [persist]);

  // Aplica un parche del ledger: pantalla + guardado, todo junto.
  const commit = useCallback((parche) => {
    if (!parche) return null;
    const { cambiaronProductos, ...resto } = parche;
    const parcial = {};
    const porClave = {};
    Object.keys(CLAVES).forEach(k => {
      if (k in resto) { parcial[k] = resto[k]; porClave[CLAVES[k]] = resto[k]; }
    });
    if (!Object.keys(parcial).length) return parche;
    // El catálogo web lee de acá si está agotado y su foto (sin costos).
    if (parcial.productos) porClave[CLAVE_CATALOGO] = catalogoPublico(parcial.productos);
    setEstado(parcial);
    pushDB(porClave);
    if (cambiaronProductos?.length) pushInv(ref.current.productos.filter(p => cambiaronProductos.includes(p.id)));
    return parche;
  }, [setEstado, pushDB]);

  const ctx = () => ({ alerta: ref.current.config?.alertaStockBajo ?? 3 });

  // ── Cargar desde Supabase al iniciar ──────────────────────────────────────
  useEffect(() => {
    const intentarCargar = async (intentos = 3) => {
      for (let i = 1; i <= intentos; i++) {
        try {
          return await selectAll('app_data');
        } catch (err) {
          console.warn(`[db] intento ${i}/${intentos} falló:`, err.message);
          if (i < intentos) await new Promise(r => setTimeout(r, 2000));
          else throw err;
        }
      }
    };

    intentarCargar().then((data) => {
      const remoto = data ? Object.fromEntries(data.map(r => [r.clave, r.valor])) : {};
      // Solo usamos Supabase si tiene productos reales: evita tomar filas de
      // prueba o datos parciales como fuente de verdad.
      const tieneRealData = Array.isArray(remoto[CLAVES.productos]) && remoto[CLAVES.productos].length > 0;

      if (tieneRealData) {
        const porClave = resolverCarga(Object.values(CLAVES), remoto, persist,
          Object.fromEntries(Object.entries(CLAVES).map(([k, c]) => [c, SEMILLAS[k]])));
        desdeClaves(porClave);
        persist.reintentar(); // lo que haya quedado pendiente de la última vez
        // Deja al catálogo web al día con lo que hay ahora (agotados y fotos).
        const pub = catalogoPublico(porClave[CLAVES.productos]);
        if (JSON.stringify(pub) !== JSON.stringify(remoto[CLAVE_CATALOGO])) pushDB({ [CLAVE_CATALOGO]: pub });
        console.log('[db] ✅ datos restaurados desde Supabase');
      } else {
        // Supabase vacío: subir lo que hay en este celular.
        pushDB(Object.fromEntries(Object.entries(CLAVES).map(([k, c]) => [c, ref.current[k]])));
        console.log('[db] ⬆️ push inicial encolado');
      }
      setCargandoDB(false);
    }).catch(err => {
      const msg = err?.message || String(err);
      console.error('[db] error:', msg);
      setErrorDB(msg);
      setCargandoDB(false);
    });
  }, []); // eslint-disable-line

  // ── Reintentos: al volver la señal y al volver a la app ───────────────────
  useEffect(() => {
    const alVolver = () => { if (document.visibilityState === 'visible') persist.reintentar(); };
    const online = () => persist.reintentar();
    window.addEventListener('online', online);
    document.addEventListener('visibilitychange', alVolver);
    return () => {
      window.removeEventListener('online', online);
      document.removeEventListener('visibilitychange', alVolver);
    };
  }, [persist]);

  // ── Realtime: refleja en vivo lo que registre el otro dispositivo ─────────
  useEffect(() => {
    if (cargandoDB) return;
    const channel = supabase
      .channel('app_data-sync')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'app_data' }, (payload) => {
        const row = payload.new;
        if (!row || row.valor === undefined) return;
        if (!Object.values(CLAVES).includes(row.clave)) return;
        // Si este celular tiene cambios sin enviar de esa clave, se fusiona al enviar.
        if (persist.recibirRemoto(row.clave, row.valor)) desdeClaves({ [row.clave]: row.valor });
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [cargandoDB, persist, desdeClaves]);

  // ── Acciones de plata y stock (reglas en domain/ledger.js) ────────────────
  // Lanzan error si la entrada es inválida y en ese caso no cambian nada.

  // Una venta o un pack (array de líneas): ventas + stock + caja + movimientos
  // se guardan juntos en un solo envío.
  const registrarVenta = useCallback((lineas) =>
    commit(ledger.registrarVenta(ref.current, lineas, ctx())), [commit]);

  const cancelarVenta = useCallback((ventaId) =>
    commit(ledger.cancelarVenta(ref.current, ventaId, ctx())), [commit]);

  // Ajuste manual de stock; siempre deja su movimiento (tipo: compra, baja, auspicio, ajuste).
  const moverStock = useCallback((id, delta, tipo = 'ajuste', extra = {}) =>
    commit(ledger.ajustarStock(ref.current, id, delta, tipo, ctx(), extra)), [commit]);

  const registrarGasto = useCallback((gasto) =>
    commit(ledger.registrarGasto(ref.current, gasto, ctx())), [commit]);

  const registrarCompra = useCallback((compra) =>
    commit(ledger.registrarCompra(ref.current, compra, ctx()))?.gastoId, [commit]);

  const anularCompra = useCallback((gastoId) =>
    commit(ledger.anularCompra(ref.current, gastoId)), [commit]);

  // Reparte el stock de un producto en sabores ({ sabor: unidades }); vacío = sin sabores.
  const definirSabores = useCallback((id, sabores) =>
    commit(ledger.definirSabores(ref.current, id, sabores, ctx())), [commit]);

  const ajustarCaja = useCallback((valor) =>
    commit(ledger.ajustarCaja(ref.current, valor)), [commit]);

  const pagarDeuda = useCallback((id, monto) =>
    commit(ledger.pagarDeuda(ref.current, id, monto)), [commit]);

  const registrarOrden = useCallback((orden) =>
    commit(ledger.registrarOrden(ref.current, orden, ctx())), [commit]);

  const cancelarOrden = useCallback((ordenId) =>
    commit(ledger.cancelarOrden(ref.current, ordenId)), [commit]);

  const recibirPedido = useCallback((id, fechaLlegada) =>
    commit(ledger.recibirPedido(ref.current, id, fechaLlegada, ctx())), [commit]);

  // ── Catálogo, deudas, config, pedidos, corteza ────────────────────────────

  const agregarProducto = useCallback((p) => {
    const nuevo = { ...p, id: nuevoId(), status: calcStatus(p.stock, ctx().alerta) };
    commit({ productos: [nuevo, ...ref.current.productos], cambiaronProductos: [nuevo.id] });
  }, [commit]);

  const editarProducto = useCallback((id, cambios) => {
    const productos = ref.current.productos.map(p => {
      if (p.id !== id) return p;
      const u = { ...p, ...cambios };
      return { ...u, status: calcStatus(u.stock, ctx().alerta) };
    });
    commit({ productos, cambiaronProductos: [id] });
  }, [commit]);

  const agregarDeuda = useCallback((deuda) => {
    const nueva = {
      id: nuevoId(), who: deuda.who, amt: deuda.amt, rate: deuda.rate || 0,
      level: deuda.level || 'low', label: deuda.label || '',
    };
    commit({ deudas: [...ref.current.deudas, nueva] });
  }, [commit]);

  const editarDeuda = useCallback((id, cambios) =>
    commit({ deudas: ref.current.deudas.map(x => x.id !== id ? x : { ...x, ...cambios }) }), [commit]);

  const eliminarDeuda = useCallback((id) =>
    commit({ deudas: ref.current.deudas.filter(x => x.id !== id) }), [commit]);

  const setConfig = useCallback((cambios) => {
    const config = { ...ref.current.config, ...cambios };
    const parche = { config };
    // si cambió el umbral de alerta, el estado de cada producto cambia con él
    if ('alertaStockBajo' in cambios) parche.productos = conStatus(ref.current.productos, config.alertaStockBajo);
    commit(parche);
  }, [commit]);

  const actualizarPedido = useCallback((id, cambios) =>
    commit({ pedidos: ref.current.pedidos.map(p => p.id !== id ? p : { ...p, ...cambios }) }), [commit]);

  const eliminarPedido = useCallback((id) =>
    commit({ pedidos: ref.current.pedidos.filter(p => p.id !== id) }), [commit]);

  // Corteza solo registra la decisión humana sobre una señal (aprobada /
  // descartada). No ejecuta nada. `estado: null` la devuelve a pendientes.
  const decidirCorteza = useCallback((id, estadoDecision, resumen = {}) => {
    const v = { ...ref.current.corteza };
    if (estadoDecision) v[id] = { estado: estadoDecision, fecha: new Date().toISOString(), senal: resumen.senal || '', accion: resumen.accion || '' };
    else delete v[id];
    commit({ corteza: v });
  }, [commit]);

  const reintentarSync = useCallback(() => persist.reintentar(), [persist]);

  const valor = useMemo(() => ({
    ...estado,
    cargandoDB, errorDB, sync, reintentarSync,
    registrarVenta, cancelarVenta, moverStock, definirSabores, registrarGasto, registrarCompra, anularCompra,
    ajustarCaja, pagarDeuda, registrarOrden, cancelarOrden, recibirPedido,
    agregarProducto, editarProducto, agregarDeuda, editarDeuda, eliminarDeuda, setConfig,
    actualizarPedido, eliminarPedido, decidirCorteza,
  }), [estado, cargandoDB, errorDB, sync]); // eslint-disable-line

  return <AppContext.Provider value={valor}>{children}</AppContext.Provider>;
}

export const useApp = () => useContext(AppContext);
