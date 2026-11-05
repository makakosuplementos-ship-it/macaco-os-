import { useState, useEffect } from 'react';
import { MACACO, clp } from '../theme.js';
import { Card, SectionTitle, Dot, Icon } from '../components/ui.jsx';
import { Screen } from '../components/Screen.jsx';
import { useApp, CANALES } from '../store.jsx';

const stepBtn = {
  width: 30, height: 30, borderRadius: 8,
  background: MACACO.cardElev, color: '#fff',
  border: `1px solid ${MACACO.border}`,
  fontSize: 18, fontWeight: 600, cursor: 'pointer',
  fontFamily: 'inherit', display: 'flex', alignItems: 'center', justifyContent: 'center',
};

// Reparte el precio total de un pack entre sus líneas en proporción a su precio de lista.
function repartirPack(lineas, totalPack) {
  const base = lineas.reduce((n, l) => n + l.price * l.qty, 0);
  let resto = totalPack;
  return lineas.map((l, i) => {
    const t = i === lineas.length - 1
      ? resto
      : Math.round(base > 0 ? (totalPack * l.price * l.qty) / base : totalPack / lineas.length);
    resto -= t;
    return t;
  });
}

export default function VentaScreen({ go }) {
  const { productos, ventas, registrarVenta, cancelarVenta } = useApp();
  const disponibles = productos.filter(p => p.stock > 0);

  const [productId, setProductId] = useState(disponibles[0]?.id || '');
  const [qty, setQty]             = useState(1);
  const [price, setPrice]         = useState(0);
  const [client, setClient]       = useState('');
  const [method, setMethod]       = useState('Transferencia');
  const [canal, setCanal]         = useState('Arica directo');
  const [openPicker, setOpenPicker] = useState(false);
  const [lineas, setLineas]       = useState([]);   // productos ya agregados al pack
  const [packTotal, setPackTotal] = useState(null); // null = suma de precios de lista
  const [sent, setSent]           = useState(false);
  const [sending, setSending]     = useState(false);

  const product = productos.find(p => p.id === productId);

  useEffect(() => {
    if (product) setPrice(product.price);
  }, [productId]);

  useEffect(() => {
    if (!productId && disponibles.length > 0) {
      setProductId(disponibles[0].id);
    }
  }, [disponibles.length]);

  if (!product) {
    return (
      <Screen>
        <div style={{ padding: '40px 0', textAlign: 'center', color: MACACO.textMuted }}>
          <div style={{ fontSize: 40, marginBottom: 16 }}>📦</div>
          <div style={{ fontSize: 15, fontWeight: 600 }}>Sin stock disponible</div>
          <div style={{ fontSize: 12, marginTop: 6 }}>Agrega productos en Inventario primero</div>
        </div>
      </Screen>
    );
  }

  const esPack   = lineas.length > 0;
  const todas    = [...lineas, { productId, qty, price }];
  const prodDe   = (id) => productos.find(p => p.id === id);
  const usadoDe  = (id) => todas.filter(l => l.productId === id).reduce((n, l) => n + l.qty, 0);
  // Cuánto se puede agregar de ESTE producto, descontando lo que ya está en el pack.
  const maxQty   = product.stock - lineas.filter(l => l.productId === productId).reduce((n, l) => n + l.qty, 0);
  const sinStock = todas.some(l => usadoDe(l.productId) > (prodDe(l.productId)?.stock ?? 0));
  const refTotal = todas.reduce((n, l) => n + l.price * l.qty, 0);
  const total    = esPack ? (packTotal ?? refTotal) : price * qty;
  const reparto  = esPack ? repartirPack(todas, total) : [total];
  const margen   = todas.reduce((n, l, i) => n + reparto[i] - (prodDe(l.productId)?.cost ?? 0) * l.qty, 0);
  const margenPct = total > 0 ? (margen / total) * 100 : 0;
  const invalido = sinStock || total <= 0 || todas.some(l => l.price <= 0);

  const agregarOtro = () => {
    const sig = disponibles.find(p => p.id !== productId) || product;
    setLineas(ls => [...ls, { productId, qty, price }]);
    setProductId(sig.id);
    setPrice(sig.price);
    setQty(1);
  };

  const quitarLinea = (idx) => {
    setLineas(ls => {
      const nl = ls.filter((_, i) => i !== idx);
      if (nl.length === 0) setPackTotal(null);
      return nl;
    });
  };

  const handleSend = async () => {
    if (sending || invalido) return;
    setSending(true);
    const packId = esPack ? 'pack-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5) : undefined;
    const ventasPack = [];
    for (let i = 0; i < todas.length; i++) {
      const l = todas[i];
      const pr = prodDe(l.productId);
      const t  = reparto[i];
      const venta = {
        productoId:     l.productId,
        producto:       pr.name,
        cantidad:       l.qty,
        precioUnitario: Math.round(t / l.qty),
        costoUnitario:  pr.cost,
        total:          t,
        margen:         t - pr.cost * l.qty,
        cliente:        client || null,
        metodoPago:     method,
        canal,
        ...(packId ? { packId } : {}),
      };
      ventasPack.push(venta);
    }
    // Todas las líneas, el stock, la caja y los movimientos se guardan juntos.
    try {
      registrarVenta(ventasPack);
    } catch (err) {
      setSending(false);
      alert('No se pudo registrar la venta: ' + err.message);
      return;
    }
    setSent(true);
    setSending(false);
    setTimeout(() => { go('cerebro'); }, 1400);
  };

  return (
    <Screen>
      <div style={{ padding: '6px 0 16px' }}>
        <div style={{ fontSize: 11, color: MACACO.primary, fontWeight: 700, letterSpacing: '0.16em', textTransform: 'uppercase' }}>
          Nueva entrada
        </div>
        <div style={{ fontSize: 26, fontWeight: 800, letterSpacing: '-0.02em', marginTop: 4 }}>
          Registrar venta
        </div>
        <div style={{ fontSize: 12.5, color: MACACO.textDim, marginTop: 4 }}>
          Queda guardada en el celular y en Supabase
        </div>
      </div>

      <SectionTitle>Producto</SectionTitle>
      <Card style={{ marginBottom: 14, padding: 0 }}>
        <button
          onClick={() => setOpenPicker(o => !o)}
          style={{
            width: '100%', background: 'transparent', border: 'none',
            padding: '14px 16px', display: 'flex', alignItems: 'center',
            justifyContent: 'space-between', cursor: 'pointer', color: '#fff',
            fontFamily: 'inherit', textAlign: 'left',
          }}
        >
          <div>
            <div style={{ fontSize: 15, fontWeight: 600 }}>{product.name}</div>
            <div style={{ fontSize: 12, color: MACACO.textMuted, marginTop: 2 }}>
              Precio sugerido {clp(product.price)} · costo {clp(product.cost)} · <span style={{ color: MACACO.cyan }}>{product.stock} en stock</span>
            </div>
          </div>
          <svg width="14" height="14" viewBox="0 0 14 14" style={{ transform: openPicker ? 'rotate(180deg)' : 'none', transition: '200ms', flexShrink: 0 }}>
            <path d="M3 5l4 4 4-4" stroke="#fff" strokeWidth="1.6" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
        {openPicker && (
          <div style={{ borderTop: `1px solid ${MACACO.borderSoft}`, maxHeight: 240, overflowY: 'auto' }}>
            {disponibles.map((p, i) => (
              <button key={p.id}
                onClick={() => { setProductId(p.id); setOpenPicker(false); setQty(1); }}
                style={{
                  width: '100%', background: p.id === productId ? 'rgba(245,197,24,0.06)' : 'transparent',
                  border: 'none', padding: '11px 16px',
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  borderBottom: i === disponibles.length - 1 ? 'none' : `1px solid ${MACACO.borderSoft}`,
                  cursor: 'pointer', color: '#fff', fontFamily: 'inherit', textAlign: 'left',
                }}
              >
                <span style={{ fontSize: 13.5 }}>{p.name}</span>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: 12, color: MACACO.textDim }}>{clp(p.price)}</div>
                  <div style={{ fontSize: 10, color: p.stock <= 3 ? MACACO.primary : MACACO.textMuted, marginTop: 2 }}>
                    {p.stock} en stock
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </Card>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.2fr', gap: 10, marginBottom: 14 }}>
        <Card padding={14}>
          <div style={{ fontSize: 10.5, color: MACACO.textDim, fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase' }}>
            Cantidad
          </div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 10 }}>
            <button onClick={() => setQty(q => Math.max(1, q - 1))} style={stepBtn}>−</button>
            <div style={{ fontSize: 22, fontWeight: 700, fontVariantNumeric: 'tabular-nums', color: qty > maxQty ? MACACO.danger : '#fff' }}>{qty}</div>
            <button onClick={() => setQty(q => Math.min(Math.max(1, maxQty), q + 1))} style={stepBtn}>+</button>
          </div>
          <div style={{ fontSize: 10, color: MACACO.textMuted, textAlign: 'center', marginTop: 6 }}>
            máx {maxQty}
          </div>
        </Card>
        <Card padding={14}>
          <div style={{ fontSize: 10.5, color: MACACO.textDim, fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase' }}>
            {esPack ? 'Precio de lista' : 'Precio unitario'}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', marginTop: 10 }}>
            <span style={{ fontSize: 18, color: MACACO.textMuted, fontWeight: 600, marginRight: 2 }}>$</span>
            <input
              type="text" inputMode="numeric"
              value={price.toLocaleString('es-CL')}
              onChange={(e) => setPrice(parseInt(e.target.value.replace(/\D/g, ''), 10) || 0)}
              style={{
                background: 'transparent', border: 'none', color: '#fff',
                fontSize: 20, fontWeight: 700, width: '100%', outline: 'none',
                fontVariantNumeric: 'tabular-nums', padding: 0, fontFamily: 'inherit',
              }}
            />
          </div>
        </Card>
      </div>

      <button onClick={agregarOtro} disabled={disponibles.length === 0} style={{
        width: '100%', padding: '12px', marginBottom: 14,
        background: 'rgba(245,197,24,0.08)', color: MACACO.primary,
        border: `1px dashed rgba(245,197,24,0.4)`, borderRadius: 12,
        fontSize: 12.5, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8,
      }}>
        <Icon.plus size={13} /> AGREGAR OTRO PRODUCTO (PACK)
      </button>

      {esPack && (
        <>
          <SectionTitle>Pack · {todas.length} productos</SectionTitle>
          <Card padding={0} style={{ marginBottom: 14 }}>
            {todas.map((l, i) => {
              const pr = prodDe(l.productId);
              const esActual = i === todas.length - 1;
              return (
                <div key={i} style={{
                  display: 'flex', alignItems: 'center', gap: 10, padding: '11px 14px',
                  borderBottom: i === todas.length - 1 ? 'none' : `1px solid ${MACACO.borderSoft}`,
                }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {pr?.name}{esActual ? ' (editando)' : ''}
                    </div>
                    <div style={{ fontSize: 11, color: MACACO.textMuted, marginTop: 1 }}>
                      ×{l.qty} · lista {clp(l.price)}
                    </div>
                  </div>
                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>{clp(reparto[i])}</div>
                    <div style={{ fontSize: 10, color: MACACO.textMuted, marginTop: 1 }}>en el pack</div>
                  </div>
                  {!esActual && (
                    <button onClick={() => quitarLinea(i)} aria-label="Quitar" style={{
                      width: 28, height: 28, borderRadius: 8, flexShrink: 0,
                      background: 'transparent', border: `1px solid ${MACACO.border}`,
                      color: MACACO.textMuted, fontSize: 16, cursor: 'pointer', fontFamily: 'inherit',
                    }}>×</button>
                  )}
                </div>
              );
            })}
          </Card>

          <Card padding={14} style={{ marginBottom: 14 }}>
            <div style={{ fontSize: 10.5, color: MACACO.textDim, fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase' }}>
              Precio total del pack
            </div>
            <div style={{ display: 'flex', alignItems: 'center', marginTop: 10 }}>
              <span style={{ fontSize: 18, color: MACACO.textMuted, fontWeight: 600, marginRight: 2 }}>$</span>
              <input
                type="text" inputMode="numeric"
                value={total.toLocaleString('es-CL')}
                onChange={(e) => setPackTotal(parseInt(e.target.value.replace(/\D/g, ''), 10) || 0)}
                style={{
                  background: 'transparent', border: 'none', color: '#fff',
                  fontSize: 20, fontWeight: 700, width: '100%', outline: 'none',
                  fontVariantNumeric: 'tabular-nums', padding: 0, fontFamily: 'inherit',
                }}
              />
            </div>
            <div style={{ fontSize: 11, color: MACACO.textMuted, marginTop: 8, lineHeight: 1.4 }}>
              Lo que cobraste por todo junto. Se reparte entre los productos según su precio de lista y se registra como una sola venta.
            </div>
          </Card>
        </>
      )}

      <SectionTitle>Cliente <span style={{ textTransform: 'none', letterSpacing: 0, fontWeight: 400, color: MACACO.textMuted }}>(opcional)</span></SectionTitle>
      <Card style={{ marginBottom: 14 }} padding={0}>
        <input
          type="text" value={client}
          onChange={(e) => setClient(e.target.value)}
          placeholder="Nombre o local"
          style={{
            width: '100%', background: 'transparent', border: 'none',
            padding: '14px 16px', color: '#fff', fontSize: 14, outline: 'none',
            fontFamily: 'inherit', boxSizing: 'border-box',
          }}
        />
      </Card>

      <SectionTitle>Canal de venta</SectionTitle>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 14 }}>
        {CANALES.map(c => {
          const active = canal === c;
          return (
            <button key={c} onClick={() => setCanal(c)}
              style={{
                padding: '12px 8px', borderRadius: 12,
                background: active ? MACACO.primary : MACACO.card,
                color: active ? '#0A0A0F' : '#fff',
                border: `1px solid ${active ? MACACO.primary : MACACO.border}`,
                fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
                boxShadow: active ? `0 0 18px ${MACACO.primary}44` : 'none',
              }}
            >{c}</button>
          );
        })}
      </div>

      <SectionTitle>Método de pago</SectionTitle>
      <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
        {['Efectivo', 'Transferencia', 'Otro'].map(m => {
          const active = method === m;
          return (
            <button key={m} onClick={() => setMethod(m)}
              style={{
                flex: 1, padding: '12px 8px', borderRadius: 12,
                background: active ? MACACO.primary : MACACO.card,
                color: active ? '#0A0A0F' : '#fff',
                border: `1px solid ${active ? MACACO.primary : MACACO.border}`,
                fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
                boxShadow: active ? `0 0 18px ${MACACO.primary}44` : 'none',
              }}
            >{m}</button>
          );
        })}
      </div>

      <Card style={{
        marginBottom: 14,
        background: 'linear-gradient(135deg, rgba(245,197,24,0.06), rgba(0,212,255,0.04))',
        borderColor: 'rgba(245,197,24,0.25)',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
          <div style={{ fontSize: 12, color: MACACO.textDim, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase' }}>{esPack ? 'Total pack' : 'Total venta'}</div>
          <div style={{ fontSize: 26, fontWeight: 800, fontVariantNumeric: 'tabular-nums' }}>{clp(total)}</div>
        </div>
        <div style={{ height: 1, background: 'rgba(255,255,255,0.08)', margin: '12px 0' }} />
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
          <div style={{ fontSize: 12, color: MACACO.textDim }}>Margen estimado</div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
            <span style={{ fontSize: 16, fontWeight: 700, color: MACACO.success }}>{clp(margen)}</span>
            <span style={{ fontSize: 12, color: MACACO.success, fontWeight: 600 }}>({margenPct.toFixed(0)}%)</span>
          </div>
        </div>
      </Card>

      {sinStock && (
        <div style={{
          marginBottom: 10, padding: '10px 14px', borderRadius: 10,
          background: 'rgba(255,77,77,0.08)', border: '1px solid rgba(255,77,77,0.3)',
          fontSize: 12, color: MACACO.danger, fontWeight: 600,
        }}>
          Stock insuficiente — revisa las cantidades del pack
        </div>
      )}

      <button
        onClick={handleSend}
        disabled={sent || sending || invalido}
        style={{
          width: '100%', padding: '16px',
          background: sent ? MACACO.success : invalido ? MACACO.cardElev : MACACO.primary,
          color: invalido ? MACACO.textMuted : '#0A0A0F',
          border: 'none', borderRadius: 12,
          fontSize: 14, fontWeight: 700, letterSpacing: '0.04em',
          cursor: sent || sending || invalido ? 'default' : 'pointer',
          fontFamily: 'inherit',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          boxShadow: `0 0 24px ${(sent ? MACACO.success : MACACO.primary)}55`,
          transition: '200ms',
        }}
      >
        {sent ? <><Icon.check size={16} /> VENTA REGISTRADA</>
          : sending ? 'ENVIANDO...'
          : <>{esPack ? 'REGISTRAR PACK' : 'REGISTRAR VENTA'} <Icon.arrowRight size={14} /></>}
      </button>
      <div style={{
        marginTop: 10, textAlign: 'center', fontSize: 11.5,
        color: MACACO.textMuted, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
      }}>
        <Dot color={MACACO.success} size={6} />
        Se guarda en el celular · se envía a Supabase aunque no haya señal
      </div>

      <UltimasVentas ventas={ventas} onCancelar={cancelarVenta} />
    </Screen>
  );
}

function UltimasVentas({ ventas, onCancelar }) {
  const [confirmId, setConfirmId] = useState(null);
  // Las líneas de un pack se muestran juntas como una sola venta.
  const grupos = [];
  const porPack = {};
  ventas.forEach(v => {
    if (v.packId && porPack[v.packId]) { porPack[v.packId].lineas.push(v); return; }
    const g = { ...v, lineas: [v] };
    if (v.packId) porPack[v.packId] = g;
    grupos.push(g);
  });
  const recientes = grupos.slice(0, 5).map(g => g.lineas.length > 1 ? {
    ...g,
    producto: g.lineas.map(l => `${l.producto} ×${l.cantidad}`).join(' + '),
    cantidad: g.lineas.reduce((n, l) => n + l.cantidad, 0),
    total:    g.lineas.reduce((n, l) => n + l.total, 0),
    esPack: true,
  } : g);
  if (recientes.length === 0) return null;

  return (
    <>
      <div style={{ height: 1, background: MACACO.borderSoft, margin: '20px 0 16px' }} />
      <SectionTitle>Últimas ventas</SectionTitle>
      <Card padding={0} style={{ marginBottom: 8 }}>
        {recientes.map((v, i) => {
          const fecha = new Date(v.fecha).toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' });
          const dia   = new Date(v.fecha).toLocaleDateString('es-CL', { day: 'numeric', month: 'short' });
          const esHoy = new Date(v.fecha).toDateString() === new Date().toDateString();
          return (
            <div key={v.id} style={{
              display: 'flex', alignItems: 'center', padding: '11px 14px', gap: 10,
              borderBottom: i === recientes.length - 1 ? 'none' : `1px solid ${MACACO.borderSoft}`,
            }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {v.producto}
                </div>
                <div style={{ fontSize: 11, color: MACACO.textMuted, marginTop: 1 }}>
                  {v.esPack ? 'Pack' : `×${v.cantidad}`} · {esHoy ? fecha : dia}
                  {v.cliente ? ` · ${v.cliente}` : ''}
                </div>
              </div>
              <div style={{ fontSize: 13.5, fontWeight: 700, fontVariantNumeric: 'tabular-nums', flexShrink: 0 }}>
                {clp(v.total)}
              </div>
              {confirmId === v.id ? (
                <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
                  <button onClick={() => { onCancelar(v.id); setConfirmId(null); }} style={{
                    padding: '5px 10px', borderRadius: 7,
                    background: 'rgba(255,77,77,0.15)', border: '1px solid rgba(255,77,77,0.4)',
                    color: MACACO.danger, fontSize: 11, fontWeight: 700,
                    cursor: 'pointer', fontFamily: 'inherit',
                  }}>Sí</button>
                  <button onClick={() => setConfirmId(null)} style={{
                    padding: '5px 8px', borderRadius: 7,
                    background: MACACO.cardElev, border: `1px solid ${MACACO.border}`,
                    color: MACACO.textMuted, fontSize: 11, fontWeight: 600,
                    cursor: 'pointer', fontFamily: 'inherit',
                  }}>No</button>
                </div>
              ) : (
                <button onClick={() => setConfirmId(v.id)} style={{
                  padding: '5px 10px', borderRadius: 7,
                  background: 'transparent', border: `1px solid ${MACACO.border}`,
                  color: MACACO.textMuted, fontSize: 10.5, fontWeight: 600,
                  cursor: 'pointer', fontFamily: 'inherit', flexShrink: 0,
                }}>Anular</button>
              )}
            </div>
          );
        })}
      </Card>
      <div style={{ fontSize: 11, color: MACACO.textMuted, textAlign: 'center', marginBottom: 8 }}>
        Anular devuelve el stock y ajusta la caja
      </div>
    </>
  );
}
