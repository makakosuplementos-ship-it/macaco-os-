import { useMemo, useState } from 'react';
import { MACACO, clp } from '../theme.js';
import { Icon } from '../components/ui.jsx';
import { Screen } from '../components/Screen.jsx';
import { CerebroArea } from '../components/CerebroArea.jsx';
import { Asesores } from '../components/Asesores.jsx';
import { publicarCatalogo } from '../services/supabase.js';
import { useApp } from '../store.jsx';
import PedidosTab from './PedidosTab.jsx';
import { subirFoto } from '../services/fotos.js';
import { useFichasCatalogo } from '../services/catalogoLocal.js';
import { idCatalogo } from '../domain/catalogoWeb.js';
import { fichaProducto } from '../domain/fichaProducto.js';
import { Capa } from '../components/Capa.jsx';

const stepBtn = {
  width: 34, height: 34, borderRadius: 8,
  background: MACACO.cardElev, color: '#fff',
  border: `1px solid ${MACACO.border}`,
  fontSize: 18, fontWeight: 600, cursor: 'pointer',
  fontFamily: 'inherit', display: 'flex', alignItems: 'center', justifyContent: 'center',
};

export default function InventarioScreen({ go }) {
  const { productos, caja, config, ventas, movimientos, pedidos, agregarProducto, moverStock, editarProducto, registrarCompra } = useApp();
  const fichasWeb = useFichasCatalogo();
  // Foto del catálogo web para los productos que no tienen una propia (solo se muestra).
  const webDe = (p) => fichasWeb[idCatalogo(p)] || null;
  const [vista, setVista]       = useState('stock'); // stock | pedidos
  const [q, setQ]               = useState('');
  const [showAdd, setShowAdd]   = useState(false);
  const [stockSheet, setStockSheet] = useState(null);
  const [editSheet, setEditSheet]   = useState(null);
  const [pubStatus, setPubStatus]   = useState(null); // null | 'loading' | 'ok' | 'error'
  const [filtro, setFiltro]         = useState('todos'); // todos | disponible | pocos | agotado
  const [ficha, setFicha]           = useState(null);    // id del producto abierto

  const alerta = config?.alertaStockBajo ?? 3;
  const estado = (p) => estadoCatalogo(p.stock, alerta).id;
  const cuenta = { todos: productos.length };
  productos.forEach(p => { cuenta[estado(p)] = (cuenta[estado(p)] || 0) + 1; });
  const filtered = productos
    .filter(i => i.name.toLowerCase().includes(q.toLowerCase()))
    .filter(i => filtro === 'todos' || estado(i) === filtro)
    .sort((a, b) => ORDEN[estado(a)] - ORDEN[estado(b)] || a.name.localeCompare(b.name));
  const totalCost = productos.reduce((s, i) => s + i.stock * i.cost, 0);
  const totalSale = productos.reduce((s, i) => s + i.stock * i.price, 0);
  const abierto = productos.find(p => p.id === ficha);

  const handleAdd = (p) => {
    agregarProducto(p);
    setShowAdd(false);
  };

  const handleEdit = (id, cambios) => {
    editarProducto(id, cambios);
    setEditSheet(null);
  };

  const handlePublicar = async () => {
    setPubStatus('loading');
    try {
      await publicarCatalogo(productos);
      setPubStatus('ok');
      setTimeout(() => setPubStatus(null), 3000);
    } catch {
      setPubStatus('error');
      setTimeout(() => setPubStatus(null), 4000);
    }
  };

  const handleMoverStock = (id, delta, tipo, montoCaja = 0) => {
    const producto = productos.find(p => p.id === id);
    if (!producto) return;
    try {
      moverStock(id, delta, tipo); // deja su movimiento
      if (montoCaja > 0) registrarCompra({ monto: montoCaja, descripcion: `${producto.name} ×${delta}` });
    } catch (err) {
      alert('No se pudo mover el stock: ' + err.message);
      return;
    }
    setStockSheet(null);
  };

  return (
    <Screen>
      <div style={{ padding: '6px 0 14px' }}>
        <div style={{ fontSize: 34, fontWeight: 400, letterSpacing: '-0.04em', lineHeight: 1.05 }}>Productos</div>
        <div style={{ fontSize: 15, fontWeight: 300, color: '#bdbdbd', marginTop: 8 }}>
          {productos.length} productos{cuenta.agotado ? <> · <span style={{ color: MACACO.danger }}>{cuenta.agotado} agotado{cuenta.agotado > 1 ? 's' : ''}</span></> : null}
          {cuenta.pocos ? <> · <span style={{ color: MACACO.ambar }}>{cuenta.pocos} con pocas unidades</span></> : null}
        </div>
      </div>

      <CerebroArea areas={['stock', 'catalogo']} go={go} />

      <div style={{
        display: 'flex', background: MACACO.card,
        border: `1px solid ${MACACO.border}`, borderRadius: 12, padding: 4, marginBottom: 14,
      }}>
        {[['stock', 'Productos'], ['pedidos', 'Pedidos']].map(([id, label]) => {
          const active = vista === id;
          return (
            <button key={id} onClick={() => setVista(id)} style={{
              flex: 1, padding: '9px 4px',
              background: active ? MACACO.cardElev : 'transparent',
              color: active ? '#fff' : MACACO.textDim,
              border: 'none', borderRadius: 9,
              fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
              boxShadow: active ? `inset 0 0 0 1px ${MACACO.border}` : 'none',
              transition: '150ms',
            }}>{label}</button>
          );
        })}
      </div>

      {vista === 'pedidos' ? <PedidosTab /> : (
      <>
      <div style={{
        display: 'flex', alignItems: 'center', gap: 10,
        background: MACACO.card, border: `1px solid ${MACACO.border}`,
        borderRadius: 12, padding: '10px 14px', marginBottom: 14,
      }}>
        <span style={{ color: MACACO.textMuted, display: 'flex' }}><Icon.search /></span>
        <input
          value={q} onChange={e => setQ(e.target.value)}
          placeholder="Buscar producto..."
          style={{
            flex: 1, background: 'transparent', border: 'none', color: '#fff',
            outline: 'none', fontSize: 14, fontFamily: 'inherit',
          }}
        />
      </div>

      {/* Filtros: el mismo estado que ve el cliente en el catálogo */}
      <div style={{ display: 'flex', gap: 6, overflowX: 'auto', margin: '0 -16px 14px', padding: '0 16px', scrollbarWidth: 'none' }}>
        {[['todos', 'Todos'], ['disponible', 'Disponibles'], ['pocos', 'Quedan pocos'], ['agotado', 'Agotados']].map(([id, label]) => {
          const on = filtro === id;
          return (
            <button key={id} onClick={() => setFiltro(id)} style={{
              flexShrink: 0, padding: '7px 12px', borderRadius: 999, cursor: 'pointer', fontFamily: 'inherit', fontSize: 12, fontWeight: 600,
              background: on ? 'rgba(153,132,216,0.16)' : 'transparent', color: on ? MACACO.lavanda : MACACO.textDim,
              border: `1px solid ${on ? 'rgba(153,132,216,0.5)' : MACACO.border}`,
            }}>{label} <span style={{ opacity: 0.7 }}>{cuenta[id] || 0}</span></button>
          );
        })}
      </div>

      {filtered.length === 0 && (
        <div style={{ textAlign: 'center', color: MACACO.textMuted, fontSize: 13, padding: '30px 0' }}>Nada por aquí.</div>
      )}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 18 }}>
        {filtered.map(p => <ProductoCard key={p.id} p={p} web={webDe(p)} alerta={alerta} onClick={() => setFicha(p.id)} />)}
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: MACACO.textDim, padding: '0 4px 6px' }}>
        <span>Stock a costo</span>
        <b style={{ color: MACACO.text, fontVariantNumeric: 'tabular-nums' }}>{clp(totalCost)}</b>
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: MACACO.textDim, padding: '0 4px 16px' }}>
        <span>Stock a precio de venta (aprox.)</span>
        <b style={{ color: MACACO.cyan, fontVariantNumeric: 'tabular-nums' }}>~{clp(totalSale)}</b>
      </div>

      <button onClick={() => setShowAdd(true)} style={{
        width: '100%', padding: '14px', background: MACACO.lavanda, color: '#0A0A0F', border: 'none', borderRadius: 24,
        fontSize: 13, fontWeight: 700, letterSpacing: '0.03em', textTransform: 'uppercase', cursor: 'pointer', fontFamily: 'inherit',
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8,
      }}>
        <Icon.plus size={15}/> Agregar producto
      </button>

      {/* El catálogo se actualiza solo con cada venta o movimiento; esto fuerza un reenvío completo. */}
      <button onClick={handlePublicar} disabled={pubStatus === 'loading'} style={{
        width: '100%', marginTop: 12, padding: '8px', background: 'transparent', border: 'none', cursor: 'pointer', fontFamily: 'inherit',
        fontSize: 12.5, textDecoration: 'underline', textUnderlineOffset: 4,
        color: pubStatus === 'ok' ? MACACO.verde : pubStatus === 'error' ? MACACO.danger : MACACO.textDim,
      }}>
        {pubStatus === 'loading' ? 'Enviando al catálogo…'
          : pubStatus === 'ok' ? '✓ Catálogo al día'
          : pubStatus === 'error' ? 'No se pudo enviar. Reintentar'
          : 'El catálogo se actualiza solo · reenviar todo ahora'}
      </button>

      <div style={{ marginTop: 22 }}>
        <Asesores ids={['productos', 'comercio-online']} titulo="Quién te ayuda aquí" />
      </div>

      {abierto && (
        <ProductoSheet
          p={abierto} alerta={alerta} web={webDe(abierto)}
          datos={{ ventas, movimientos, pedidos }}
          onClose={() => setFicha(null)}
          onFoto={(imagen) => editarProducto(abierto.id, { imagen })}
          onMover={() => { setStockSheet(abierto); setFicha(null); }}
          onEditar={() => { setEditSheet(abierto); setFicha(null); }}
        />
      )}
      {editSheet && (
        <EditProductSheet
          producto={editSheet}
          onClose={() => setEditSheet(null)}
          onSave={(cambios) => handleEdit(editSheet.id, cambios)}
        />
      )}
      {stockSheet && (
        <StockMoveSheet
          producto={stockSheet}
          onClose={() => setStockSheet(null)}
          caja={caja}
          onMove={(delta, tipo, montoCaja) => handleMoverStock(stockSheet.id, delta, tipo, montoCaja)}
        />
      )}
      </>
      )}
    </Screen>
  );
}

// El mismo criterio que usa el catálogo web para mostrar el producto.
const ORDEN = { agotado: 0, pocos: 1, disponible: 2 };
export function estadoCatalogo(stock, alerta = 3) {
  if (stock <= 0) return { id: 'agotado', label: 'Agotado', color: MACACO.danger };
  if (stock <= alerta) return { id: 'pocos', label: 'Quedan pocos', color: MACACO.ambar };
  return { id: 'disponible', label: 'Disponible', color: MACACO.verde };
}

function Foto({ p, web, radio = 16, alto }) {
  const iniciales = p.name.split(/\s+/).slice(0, 2).map(w => w[0]).join('').toUpperCase();
  const src = p.imagen || web?.foto;
  return src ? (
    <img src={src} alt={p.name} loading="lazy" style={{
      width: '100%', height: alto || 'auto', aspectRatio: alto ? undefined : '1 / 1', objectFit: 'cover',
      borderRadius: radio, display: 'block', background: '#111',
    }} />
  ) : (
    <div style={{
      width: '100%', height: alto || 'auto', aspectRatio: alto ? undefined : '1 / 1', borderRadius: radio,
      background: 'radial-gradient(120% 90% at 30% 20%, rgba(153,132,216,0.22), rgba(20,20,28,1) 65%)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 4,
    }}>
      <span style={{ fontSize: 26, fontWeight: 300, letterSpacing: '-0.02em', color: 'rgba(255,255,255,0.75)' }}>{iniciales}</span>
      <span style={{ fontSize: 10, color: MACACO.textMuted }}>sin foto</span>
    </div>
  );
}

function ProductoCard({ p, web, alerta, onClick }) {
  const e = estadoCatalogo(p.stock, alerta);
  const margen = p.price > 0 && p.cost > 0 ? Math.round((p.price - p.cost) / p.price * 100) : null;
  return (
    <button onClick={onClick} aria-label={`${p.name}, ${e.label}`} style={{
      textAlign: 'left', background: 'transparent', border: 'none', padding: 0, cursor: 'pointer', fontFamily: 'inherit', color: MACACO.text,
      opacity: e.id === 'agotado' ? 0.6 : 1, minWidth: 0,
    }}>
      <div style={{ position: 'relative' }}>
        <Foto p={p} web={web} />
        <span style={{
          position: 'absolute', left: 8, bottom: 8, padding: '3px 8px', borderRadius: 999, fontSize: 10.5, fontWeight: 700,
          background: 'rgba(0,0,0,0.72)', color: e.color, backdropFilter: 'blur(6px)',
        }}>{e.label}</span>
      </div>
      <div style={{ fontSize: 13.5, fontWeight: 500, lineHeight: 1.3, marginTop: 9, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{p.name}</div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginTop: 4 }}>
        <span style={{ fontSize: 16, fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>{clp(p.price)}</span>
        <span style={{ fontSize: 11, color: MACACO.textMuted, fontVariantNumeric: 'tabular-nums' }}>
          {p.stock} u{margen != null && <> · {margen}%</>}
        </span>
      </div>
    </button>
  );
}

const TIPO_MOV = { venta: 'Venta', anulacion: 'Venta anulada', compra: 'Ingreso', baja: 'Baja', auspicio: 'Auspicio', correccion: 'Corrección', ajuste: 'Ajuste' };
const fechaCorta = (f) => {
  const d = new Date(f);
  return Number.isNaN(d.getTime()) ? '' : d.toLocaleDateString('es-CL', { day: 'numeric', month: 'short' });
};

function ProductoSheet({ p, web, datos, alerta, onClose, onFoto, onMover, onEditar }) {
  const [subiendo, setSubiendo] = useState(false);
  const [error, setError] = useState(null);
  const e = estadoCatalogo(p.stock, alerta);
  const f = useMemo(() => fichaProducto(p, datos), [p, datos]);

  const elegir = async (ev) => {
    const archivo = ev.target.files?.[0];
    ev.target.value = '';
    if (!archivo) return;
    setSubiendo(true); setError(null);
    try { onFoto(await subirFoto(p, archivo)); }
    catch (err) { setError(err.message); }
    finally { setSubiendo(false); }
  };

  const enCatalogo = !!idCatalogo(p);
  const fotoCatalogo = !p.imagen && web?.foto;

  return (
    <SheetBase onClose={onClose}>
      <div style={{ position: 'relative' }}>
        <Foto p={p} web={web} radio={20} alto={300} />
        {fotoCatalogo && (
          <span style={{
            position: 'absolute', left: 10, top: 10, padding: '4px 10px', borderRadius: 999, fontSize: 10.5, fontWeight: 700,
            background: 'rgba(0,0,0,0.72)', color: MACACO.textDim,
          }}>Foto del catálogo</span>
        )}
        <label style={{
          position: 'absolute', right: 10, bottom: 10, padding: '9px 14px', borderRadius: 999, cursor: 'pointer',
          background: MACACO.lavanda, color: '#0A0A0F', fontSize: 12, fontWeight: 700, opacity: subiendo ? 0.7 : 1,
        }}>
          {subiendo ? 'Subiendo…' : p.imagen || fotoCatalogo ? 'Cambiar foto' : '＋ Agregar foto'}
          <input type="file" accept="image/*" onChange={elegir} disabled={subiendo} style={{ display: 'none' }} />
        </label>
      </div>
      {error && <div style={{ fontSize: 12, color: MACACO.danger, marginTop: 10 }}>{error}</div>}

      {web?.marca && <div style={{ fontSize: 11, color: MACACO.primary, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', marginTop: 16 }}>{web.marca}{web.categoria ? ` · ${web.categoria}` : ''}</div>}
      <div style={{ fontSize: 24, fontWeight: 400, letterSpacing: '-0.03em', marginTop: web?.marca ? 4 : 16, lineHeight: 1.15 }}>{p.name}</div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: 10, marginTop: 14 }}>
        <Dato label="Costo" valor={clp(p.cost)} />
        <Dato label="Precio" valor={clp(p.price)} />
        <Dato label="Stock" valor={`${p.stock} u`} color={e.color} />
        <Dato label="Margen" valor={f.margen != null ? `${f.margen}%` : '—'} />
      </div>

      <Bloque titulo="Plata">
        <Linea label="Ganas por unidad" valor={clp(f.gananciaUnidad)} color={f.gananciaUnidad >= 0 ? MACACO.success : MACACO.danger} />
        <Linea label="Stock a costo" valor={clp(f.valorCosto)} />
        <Linea label="Stock a precio de venta (aprox.)" valor={`~${clp(f.valorVenta)}`} color={MACACO.cyan} />
      </Bloque>

      <Bloque titulo="Ventas">
        {f.vendidas ? (
          <>
            <Linea label="Unidades vendidas" valor={`${f.vendidas} u`} />
            <Linea label="Últimos 30 días" valor={`${f.vendidas30} u`} />
            <Linea label="Total cobrado" valor={clp(f.ingresos)} />
            <Linea label="Ganancia aprox. (al costo actual)" valor={clp(f.gananciaVendida)} color={f.gananciaVendida >= 0 ? MACACO.success : MACACO.danger} />
            {f.ultimaVenta && <Linea label="Última venta" valor={fechaCorta(f.ultimaVenta)} />}
          </>
        ) : <div style={{ fontSize: 12.5, color: MACACO.textMuted, padding: '4px 0' }}>Todavía no tiene ventas registradas.</div>}
        {f.enCamino > 0 && <Linea label="En camino (pedido)" valor={`${f.enCamino} u${f.llegaEl ? ` · llega ${fechaCorta(f.llegaEl + 'T12:00:00')}` : ''}`} color={MACACO.lavanda} />}
      </Bloque>

      {f.movimientos.length > 0 && (
        <Bloque titulo="Últimos movimientos">
          {f.movimientos.map(m => (
            <Linea key={m.id || m.fecha} label={`${fechaCorta(m.fecha)} · ${TIPO_MOV[m.tipo] || m.tipo}`}
              valor={`${m.delta > 0 ? '+' : ''}${m.delta} u${m.stockDespues != null ? ` → ${m.stockDespues}` : ''}`}
              color={m.delta > 0 ? MACACO.success : MACACO.text} />
          ))}
        </Bloque>
      )}

      <Bloque titulo="Catálogo web">
        <div style={{ fontSize: 12.5, color: MACACO.textDim, lineHeight: 1.5 }}>
          {enCatalogo ? (
            <>Se ve como <b style={{ color: e.color }}>{e.label}</b>, a {clp(p.price)}
              {p.imagen ? ', con tu foto.' : web?.foto ? ', con la foto del catálogo.' : ', sin foto.'}
              {' '}Cambia solo cuando vendes o mueves stock.</>
          ) : <>Este producto no está en el catálogo web.</>}
        </div>
        {web?.presentacion && <Linea label="Presentación" valor={web.presentacion} />}
        {web?.sabores?.length > 0 && <Linea label={web.sabores.length > 1 ? 'Sabores' : 'Sabor'} valor={web.sabores.join(' · ')} />}
        {web?.descripcion && <div style={{ fontSize: 12.5, color: MACACO.textDim, lineHeight: 1.5, marginTop: 8 }}>{web.descripcion}</div>}
        {web?.beneficios?.length > 0 && (
          <ul style={{ margin: '8px 0 0', paddingLeft: 18, fontSize: 12.5, color: MACACO.textDim, lineHeight: 1.5 }}>
            {web.beneficios.map(b => <li key={b}>{b}</li>)}
          </ul>
        )}
        {enCatalogo && (
          <a href="/catalogo/#catalogo" target="_blank" rel="noopener" style={{ display: 'inline-block', marginTop: 10, fontSize: 12.5, color: MACACO.lavanda }}>Ver el catálogo ↗</a>
        )}
      </Bloque>

      <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
        <button onClick={onMover} style={botonSec}>Mover stock</button>
        <button onClick={onEditar} style={botonSec}>Editar precio</button>
      </div>
    </SheetBase>
  );
}

function Bloque({ titulo, children }) {
  return (
    <div style={{ marginTop: 14, padding: '12px 14px', borderRadius: 14, background: MACACO.card }}>
      <div style={{ fontSize: 10.5, color: MACACO.textMuted, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', marginBottom: 6 }}>{titulo}</div>
      {children}
    </div>
  );
}

function Linea({ label, valor, color }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, padding: '5px 0', fontSize: 12.5 }}>
      <span style={{ color: MACACO.textDim }}>{label}</span>
      <span style={{ fontWeight: 700, color: color || MACACO.text, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{valor}</span>
    </div>
  );
}

const botonSec = {
  flex: 1, padding: '13px', borderRadius: 12, cursor: 'pointer', fontFamily: 'inherit', fontSize: 13, fontWeight: 700,
  background: 'transparent', color: MACACO.text, border: `1px solid ${MACACO.border}`,
};

function Dato({ label, valor, color }) {
  return (
    <div>
      <div style={{ fontSize: 10.5, color: MACACO.textMuted, fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase' }}>{label}</div>
      <div style={{ fontSize: 17, fontWeight: 700, marginTop: 3, color: color || MACACO.text, fontVariantNumeric: 'tabular-nums' }}>{valor}</div>
    </div>
  );
}

function SheetBase({ onClose, children }) {
  return (<Capa>
    <div style={{ position: 'absolute', inset: 0, zIndex: 100, animation: 'fadeUp 220ms cubic-bezier(.2,.7,.2,1)' }}>
      <div onClick={onClose} style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }} />
      <div style={{
        position: 'absolute', left: 0, right: 0, bottom: 0,
        background: MACACO.bg,
        borderTopLeftRadius: 24, borderTopRightRadius: 24,
        border: `1px solid ${MACACO.border}`, borderBottom: 'none',
        padding: '14px 18px 32px',
        maxHeight: '90%', overflowY: 'auto',
        animation: 'sheetUp 320ms cubic-bezier(.2,.7,.2,1)',
        boxShadow: '0 -20px 50px rgba(0,0,0,0.6)',
      }}>
        <div style={{ width: 36, height: 4, borderRadius: 999, background: 'rgba(255,255,255,0.18)', margin: '0 auto 16px' }}/>
        {children}
      </div>
    </div></Capa>
  );
}

function StockMoveSheet({ producto, caja, onClose, onMove }) {
  const [delta, setDelta] = useState(1);
  const [descontar, setDescontar] = useState(true);
  const [tipo, setTipo]   = useState('compra'); // compra | baja | auspicio

  const signo   = tipo === 'compra' ? +1 : -1;
  const nuevoStock = Math.max(0, producto.stock + signo * delta);

  const colorMap = { compra: MACACO.success, baja: MACACO.danger, auspicio: MACACO.cyan };

  return (
    <SheetBase onClose={onClose}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
        <div>
          <div style={{ fontSize: 10.5, color: MACACO.primary, fontWeight: 700, letterSpacing: '0.16em', textTransform: 'uppercase' }}>Mover stock</div>
          <div style={{ fontSize: 20, fontWeight: 800, marginTop: 4 }}>{producto.name}</div>
        </div>
        <button onClick={onClose} style={{
          width: 32, height: 32, borderRadius: 999,
          background: MACACO.cardElev, border: `1px solid ${MACACO.border}`,
          color: '#fff', fontSize: 18, cursor: 'pointer', fontFamily: 'inherit',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>×</button>
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 18 }}>
        {[
          { id: 'compra',   label: 'Compra',   desc: 'Ingreso de mercadería' },
          { id: 'baja',     label: 'Baja',      desc: 'Merma o pérdida' },
          { id: 'auspicio', label: 'Auspicio',  desc: 'Entregado gratis' },
        ].map(t => {
          const active = tipo === t.id;
          return (
            <button key={t.id} onClick={() => setTipo(t.id)} style={{
              flex: 1, padding: '10px 6px', borderRadius: 10,
              background: active ? colorMap[t.id] + '18' : MACACO.cardElev,
              border: `1px solid ${active ? colorMap[t.id] + '55' : MACACO.border}`,
              color: active ? colorMap[t.id] : MACACO.textDim,
              fontFamily: 'inherit', cursor: 'pointer', textAlign: 'center',
            }}>
              <div style={{ fontSize: 12, fontWeight: 700 }}>{t.label}</div>
              <div style={{ fontSize: 9.5, marginTop: 2, opacity: 0.7 }}>{t.desc}</div>
            </button>
          );
        })}
      </div>

      <div style={{ marginBottom: 18 }}>
        <div style={{ fontSize: 11, color: MACACO.textDim, fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 10 }}>Unidades</div>
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          background: MACACO.cardElev, border: `1px solid ${MACACO.border}`,
          borderRadius: 10, padding: '8px 12px',
        }}>
          <button onClick={() => setDelta(d => Math.max(1, d - 1))} style={stepBtn}>−</button>
          <input
            type="text" inputMode="numeric"
            value={delta === 0 ? '' : String(delta)}
            placeholder="0"
            onFocus={e => e.target.select()}
            onChange={e => {
              const digits = e.target.value.replace(/\D/g, '');
              setDelta(digits === '' ? 0 : parseInt(digits, 10));
            }}
            onBlur={() => setDelta(d => Math.max(1, d))}
            style={{
              width: 70, textAlign: 'center', background: 'transparent', border: 'none',
              color: '#fff', fontSize: 28, fontWeight: 800, outline: 'none',
              fontFamily: 'inherit', fontVariantNumeric: 'tabular-nums', padding: 0,
            }}
          />
          <button onClick={() => setDelta(d => d + 1)} style={stepBtn}>+</button>
        </div>
      </div>

      <div style={{
        padding: '12px 14px', borderRadius: 12, marginBottom: 18,
        background: 'rgba(255,255,255,0.03)', border: `1px solid ${MACACO.border}`,
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      }}>
        <div>
          <div style={{ fontSize: 11, color: MACACO.textMuted }}>Stock actual</div>
          <div style={{ fontSize: 22, fontWeight: 800 }}>{producto.stock}</div>
        </div>
        <div style={{ fontSize: 28, color: MACACO.textMuted }}>→</div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: 11, color: MACACO.textMuted }}>Stock después</div>
          <div style={{ fontSize: 22, fontWeight: 800, color: colorMap[tipo] }}>{nuevoStock}</div>
        </div>
      </div>

      {tipo === 'compra' && producto.cost > 0 && (
        <div
          onClick={() => setDescontar(d => !d)}
          style={{
            display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', marginBottom: 14,
            borderRadius: 12, cursor: 'pointer',
            background: descontar ? 'rgba(245,197,24,0.07)' : MACACO.card,
            border: `1px solid ${descontar ? 'rgba(245,197,24,0.35)' : MACACO.border}`,
          }}
        >
          <div style={{
            width: 22, height: 22, borderRadius: 6, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: descontar ? MACACO.primary : 'transparent', border: `1px solid ${descontar ? MACACO.primary : MACACO.border}`,
            color: '#0A0A0F', fontSize: 14, fontWeight: 800,
          }}>{descontar ? '✓' : ''}</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 13, fontWeight: 700 }}>Descontar {clp(producto.cost * delta)} de la caja</div>
            <div style={{ fontSize: 11, color: MACACO.textMuted, marginTop: 2 }}>
              Costo {clp(producto.cost)} × {delta} · caja actual {clp(caja)}
            </div>
          </div>
        </div>
      )}

      <button
        onClick={() => onMove(signo * delta, tipo, tipo === 'compra' && descontar ? producto.cost * delta : 0)}
        style={{
          width: '100%', padding: '15px',
          background: colorMap[tipo], color: '#0A0A0F',
          border: 'none', borderRadius: 12,
          fontSize: 13.5, fontWeight: 800, letterSpacing: '0.04em',
          cursor: 'pointer', fontFamily: 'inherit',
          boxShadow: `0 0 20px ${colorMap[tipo]}44`,
        }}
      >
        {tipo === 'compra' ? `INGRESAR +${delta}` : tipo === 'baja' ? `REGISTRAR BAJA −${delta}` : `REGISTRAR AUSPICIO −${delta}`}
      </button>
    </SheetBase>
  );
}

function EditProductSheet({ producto, onClose, onSave }) {
  const [cost,  setCost]  = useState(producto.cost);
  const [price, setPrice] = useState(producto.price);

  const margin   = price > 0 ? ((price - cost) / price * 100) : 0;
  const changed  = cost !== producto.cost || price !== producto.price;
  const canSave  = cost > 0 && price > 0 && changed;

  const numInput = (val, setVal) => (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 4,
      background: MACACO.cardElev, border: `1px solid ${MACACO.border}`,
      borderRadius: 10, padding: '10px 12px',
    }}>
      <span style={{ color: MACACO.textMuted, fontSize: 15, fontWeight: 600 }}>$</span>
      <input
        type="text" inputMode="numeric"
        value={val === 0 ? '' : val.toLocaleString('es-CL')}
        placeholder="0"
        onChange={e => setVal(parseInt(e.target.value.replace(/\D/g, ''), 10) || 0)}
        style={{
          flex: 1, background: 'transparent', border: 'none', color: '#fff',
          fontSize: 16, fontWeight: 700, outline: 'none',
          padding: 0, fontFamily: 'inherit', minWidth: 0, width: '100%',
        }}
      />
    </div>
  );

  return (
    <SheetBase onClose={onClose}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
        <div>
          <div style={{ fontSize: 10.5, color: MACACO.cyan, fontWeight: 700, letterSpacing: '0.16em', textTransform: 'uppercase' }}>Editar precios</div>
          <div style={{ fontSize: 20, fontWeight: 800, marginTop: 4 }}>{producto.name}</div>
        </div>
        <button onClick={onClose} style={{
          width: 32, height: 32, borderRadius: 999,
          background: MACACO.cardElev, border: `1px solid ${MACACO.border}`,
          color: '#fff', fontSize: 18, cursor: 'pointer', fontFamily: 'inherit',
          display: 'flex', alignItems: 'center', justifyContent: 'center', lineHeight: 1,
        }}>×</button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 14 }}>
        <div>
          <label style={{ fontSize: 11, color: MACACO.textDim, fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', display: 'block', marginBottom: 6 }}>Costo unitario</label>
          {numInput(cost, setCost)}
        </div>
        <div>
          <label style={{ fontSize: 11, color: MACACO.textDim, fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', display: 'block', marginBottom: 6 }}>Precio venta</label>
          {numInput(price, setPrice)}
        </div>
      </div>

      <div style={{
        background: 'linear-gradient(135deg, rgba(0,212,255,0.06), rgba(245,197,24,0.04))',
        border: '1px solid rgba(0,212,255,0.2)',
        borderRadius: 12, padding: 12, marginBottom: 18,
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
          <span style={{ fontSize: 11, color: MACACO.textDim, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase' }}>Margen</span>
          <span style={{ fontSize: 16, fontWeight: 800, color: margin > 0 ? MACACO.success : MACACO.textMuted }}>
            {margin > 0 ? margin.toFixed(0) + '%' : '—'}
          </span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span style={{ fontSize: 11.5, color: MACACO.textDim }}>Valor stock (costo)</span>
          <span style={{ fontSize: 13, fontWeight: 700 }}>{clp(cost * producto.stock)}</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
          <span style={{ fontSize: 11.5, color: MACACO.textDim }}>Valor stock (venta)</span>
          <span style={{ fontSize: 13, fontWeight: 700, color: MACACO.cyan }}>{clp(price * producto.stock)}</span>
        </div>
      </div>

      <button
        onClick={() => canSave && onSave({ cost, price })}
        disabled={!canSave}
        style={{
          width: '100%', padding: '15px',
          background: canSave ? MACACO.cyan : MACACO.cardElev,
          color: canSave ? '#0A0A0F' : MACACO.textMuted,
          border: canSave ? 'none' : `1px solid ${MACACO.border}`,
          borderRadius: 12,
          fontSize: 13.5, fontWeight: 800, letterSpacing: '0.04em',
          cursor: canSave ? 'pointer' : 'not-allowed',
          fontFamily: 'inherit',
          boxShadow: canSave ? `0 0 20px ${MACACO.cyan}44` : 'none',
        }}
      >
        {canSave ? 'ACTUALIZAR PRECIOS' : 'SIN CAMBIOS'}
      </button>
    </SheetBase>
  );
}

function AddProductSheet({ onClose, onSave }) {
  const [name,  setName]  = useState('');
  const [cost,  setCost]  = useState(0);
  const [price, setPrice] = useState(0);
  const [stock, setStock] = useState(1);

  const margin  = price > 0 ? ((price - cost) / price * 100) : 0;
  const canSave = name.trim() && cost > 0 && price > 0;

  const numInput = (val, setVal, prefix) => (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 4,
      background: MACACO.cardElev, border: `1px solid ${MACACO.border}`,
      borderRadius: 10, padding: '10px 12px',
    }}>
      {prefix && <span style={{ color: MACACO.textMuted, fontSize: 15, fontWeight: 600 }}>{prefix}</span>}
      <input
        type="text" inputMode="numeric"
        value={val === 0 ? '' : val.toLocaleString('es-CL')}
        placeholder="0"
        onChange={e => setVal(parseInt(e.target.value.replace(/\D/g, ''), 10) || 0)}
        style={{
          flex: 1, background: 'transparent', border: 'none', color: '#fff',
          fontSize: 16, fontWeight: 700, outline: 'none',
          padding: 0, fontFamily: 'inherit', minWidth: 0, width: '100%',
        }}
      />
    </div>
  );

  return (
    <SheetBase onClose={onClose}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
        <div>
          <div style={{ fontSize: 10.5, color: MACACO.primary, fontWeight: 700, letterSpacing: '0.16em', textTransform: 'uppercase' }}>Nuevo producto</div>
          <div style={{ fontSize: 20, fontWeight: 800, marginTop: 4 }}>Agregar al inventario</div>
        </div>
        <button onClick={onClose} style={{
          width: 32, height: 32, borderRadius: 999,
          background: MACACO.cardElev, border: `1px solid ${MACACO.border}`,
          color: '#fff', fontSize: 18, cursor: 'pointer', fontFamily: 'inherit',
          display: 'flex', alignItems: 'center', justifyContent: 'center', lineHeight: 1,
        }}>×</button>
      </div>

      <div style={{ marginBottom: 14 }}>
        <label style={{ fontSize: 11, color: MACACO.textDim, fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', display: 'block', marginBottom: 6 }}>Nombre del producto</label>
        <input
          value={name} onChange={e => setName(e.target.value)}
          placeholder="Ej. BCAA Premium"
          style={{
            width: '100%', boxSizing: 'border-box',
            background: MACACO.cardElev, border: `1px solid ${MACACO.border}`,
            borderRadius: 10, padding: '12px 14px',
            color: '#fff', fontSize: 15, fontWeight: 500,
            outline: 'none', fontFamily: 'inherit',
          }}
        />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 14 }}>
        <div>
          <label style={{ fontSize: 11, color: MACACO.textDim, fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', display: 'block', marginBottom: 6 }}>Costo unitario</label>
          {numInput(cost, setCost, '$')}
        </div>
        <div>
          <label style={{ fontSize: 11, color: MACACO.textDim, fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', display: 'block', marginBottom: 6 }}>Precio venta</label>
          {numInput(price, setPrice, '$')}
        </div>
      </div>

      <div style={{ marginBottom: 14 }}>
        <label style={{ fontSize: 11, color: MACACO.textDim, fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', display: 'block', marginBottom: 6 }}>Cantidad inicial</label>
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          background: MACACO.cardElev, border: `1px solid ${MACACO.border}`,
          borderRadius: 10, padding: '8px 12px',
        }}>
          <button onClick={() => setStock(s => Math.max(0, s - 1))} style={stepBtn}>−</button>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
            <input
              type="text" inputMode="numeric"
              value={stock === 0 ? '' : String(stock)}
              placeholder="0"
              onFocus={e => e.target.select()}
              onChange={e => {
                const digits = e.target.value.replace(/\D/g, '');
                setStock(digits === '' ? 0 : parseInt(digits, 10));
              }}
              style={{
                width: 56, textAlign: 'center', background: 'transparent', border: 'none',
                color: '#fff', fontSize: 22, fontWeight: 800, outline: 'none',
                fontFamily: 'inherit', padding: 0,
              }}
            />
            <span style={{ fontSize: 11, color: MACACO.textMuted, fontWeight: 500 }}>UND</span>
          </div>
          <button onClick={() => setStock(s => s + 1)} style={stepBtn}>+</button>
        </div>
      </div>

      <div style={{
        background: 'linear-gradient(135deg, rgba(245,197,24,0.06), rgba(0,212,255,0.04))',
        border: '1px solid rgba(245,197,24,0.2)',
        borderRadius: 12, padding: 12, marginBottom: 18,
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
          <span style={{ fontSize: 11, color: MACACO.textDim, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase' }}>Margen</span>
          <span style={{ fontSize: 16, fontWeight: 800, color: margin > 0 ? MACACO.success : MACACO.textMuted }}>
            {margin > 0 ? margin.toFixed(0) + '%' : '—'}
          </span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span style={{ fontSize: 11.5, color: MACACO.textDim }}>Inversión inicial</span>
          <span style={{ fontSize: 13, fontWeight: 700 }}>{clp(cost * stock)}</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
          <span style={{ fontSize: 11.5, color: MACACO.textDim }}>Valor potencial</span>
          <span style={{ fontSize: 13, fontWeight: 700, color: MACACO.cyan }}>{clp(price * stock)}</span>
        </div>
      </div>

      <button
        onClick={() => canSave && onSave({ name: name.trim(), cost, price, stock })}
        disabled={!canSave}
        style={{
          width: '100%', padding: '15px',
          background: canSave ? MACACO.primary : MACACO.cardElev,
          color: canSave ? '#0A0A0F' : MACACO.textMuted,
          border: canSave ? 'none' : `1px solid ${MACACO.border}`,
          borderRadius: 12,
          fontSize: 13.5, fontWeight: 800, letterSpacing: '0.04em',
          cursor: canSave ? 'pointer' : 'not-allowed',
          fontFamily: 'inherit',
          boxShadow: canSave ? `0 0 20px ${MACACO.primary}44` : 'none',
        }}
      >
        {canSave ? 'GUARDAR PRODUCTO' : 'COMPLETA LOS CAMPOS'}
      </button>
    </SheetBase>
  );
}
