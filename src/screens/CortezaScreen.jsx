import { useState, useMemo } from 'react';
import { MACACO, clp, clpCompact } from '../theme.js';
import { Card, SectionTitle, Icon } from '../components/ui.jsx';
import { Screen } from '../components/Screen.jsx';
import { useApp } from '../store.jsx';
import { escanearCorteza, AREAS } from '../corteza.js';
import { timonel } from '../domain/kairos.js';

const PRIORIDAD = {
  alta:  { label: 'Alta',  color: MACACO.danger,  bg: 'rgba(255,77,77,0.12)' },
  media: { label: 'Media', color: MACACO.orange,  bg: 'rgba(255,159,64,0.12)' },
  baja:  { label: 'Baja',  color: MACACO.cyan,    bg: 'rgba(0,212,255,0.10)' },
};

const RIESGO = { alto: MACACO.danger, medio: MACACO.orange, bajo: MACACO.success };

const DESTINOS = {
  finanzas: 'Finanzas', inventario: 'Stock',
  reportes: 'Reportes', venta: 'Venta',
};

const FILTROS = [
  { id: 'pendiente', label: 'Pendientes' },
  { id: 'aprobada',  label: 'Aprobadas' },
  { id: 'descartada', label: 'Descartadas' },
];

export default function CortezaScreen({ go, areaInicial = null }) {
  const app = useApp();
  const { corteza, decidirCorteza } = app;

  const correr = () => {
    const { productos, ventas, gastos, deudas, caja, config, movimientos, estrategia } = app;
    return escanearCorteza({ productos, ventas, gastos, deudas, caja, config, movimientos, estrategia });
  };

  const [escaneo, setEscaneo]       = useState(correr);
  const [escaneando, setEscaneando] = useState(false);
  const [filtro, setFiltro]         = useState('pendiente');
  const [area, setArea]             = useState(areaInicial); // null = todas

  const reEscanear = () => {
    setEscaneando(true);
    setTimeout(() => { setEscaneo(correr()); setEscaneando(false); }, 450);
  };

  const estadoDe = (id) => corteza[id]?.estado || 'pendiente';

  const grupos = useMemo(() => {
    const g = { pendiente: [], aprobada: [], descartada: [] };
    escaneo.decisiones.forEach(d => g[estadoDe(d.id)].push(d));
    // Decisiones ya tomadas cuya señal desapareció del escaneo actual.
    const vivos = new Set(escaneo.decisiones.map(d => d.id));
    Object.entries(corteza).forEach(([id, c]) => {
      if (!vivos.has(id) && g[c.estado]) g[c.estado].push({ id, resuelta: true, senal: c.senal, accion: c.accion, fecha: c.fecha });
    });
    return g;
  }, [escaneo, corteza]); // eslint-disable-line

  const pendientes = grupos.pendiente;
  const impactoTotal = pendientes.reduce((s, d) => s + (d.impactoMensual || 0), 0);
  const ahorroTotal  = pendientes.reduce((s, d) => s + (d.ahorroMensual || 0), 0);
  const artefactos   = new Set(pendientes.map(d => d.artefacto).filter(Boolean)).size;
  const hora = new Date(escaneo.fecha).toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' });
  const f = escaneo.fuentes;
  const lista = area ? grupos[filtro].filter(d => d.area === area) : grupos[filtro];
  const pendArea = (id) => pendientes.filter(d => d.area === id).length;

  return (
    <Screen>
      <div style={{ padding: '6px 0 14px' }}>
        <button onClick={() => go('cerebro')} style={{
          background: 'transparent', border: 'none', color: MACACO.textMuted,
          padding: 0, cursor: 'pointer', fontFamily: 'inherit', fontSize: 11,
          fontWeight: 700, letterSpacing: '0.16em', textTransform: 'uppercase',
          display: 'inline-flex', alignItems: 'center', gap: 5,
        }}>
          <span style={{ display: 'inline-block', transform: 'rotate(180deg)', lineHeight: 0 }}>
            <Icon.arrowRight size={11} />
          </span>
          Cerebro
        </button>
        <div style={{ fontSize: 11, color: MACACO.primary, fontWeight: 700, letterSpacing: '0.16em', textTransform: 'uppercase', marginTop: 10 }}>
          Motor agéntico
        </div>
        <div style={{ fontSize: 26, fontWeight: 800, letterSpacing: '-0.02em', marginTop: 4 }}>Corteza prefrontal</div>
        <div style={{ fontSize: 12.5, color: MACACO.textDim, marginTop: 6, lineHeight: 1.45 }}>
          Detecta señales reales, mide impacto y propone la próxima mejora del negocio.
        </div>
      </div>

      {/* Barra de escaneo */}
      <Card style={{ marginBottom: 12 }} padding={14}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 12, fontWeight: 700 }}>Último escaneo · {hora}</div>
            <div style={{ fontSize: 10.5, color: MACACO.textMuted, marginTop: 3, lineHeight: 1.4 }}>
              {f.ventas} ventas · {f.productos} productos · {f.gastos} gastos · {f.deudas} deudas
              {f.ventas > 0 && <> · {f.diasHistorial} días de historial</>}
            </div>
          </div>
          <BotonEscanear onClick={reEscanear} escaneando={escaneando} compacto />
        </div>
      </Card>

      {/* Radar · ROI · Skill Miner */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginBottom: 18 }}>
        <Pilar titulo="Radar" valor={pendientes.length} sub="señales" color={MACACO.cyan} />
        <Pilar titulo="ROI" valor={impactoTotal ? clpCompact(impactoTotal) : '—'} sub={ahorroTotal ? `ahorro ${clpCompact(ahorroTotal)}/mes` : 'impacto/mes'} color={MACACO.primary} />
        <Pilar titulo="Skill Miner" valor={artefactos} sub={artefactos === 1 ? 'artefacto' : 'artefactos'} color={MACACO.success} />
      </div>

      {/* Áreas del cerebro */}
      <div style={{ display: 'flex', gap: 6, overflowX: 'auto', margin: '0 -16px 12px', padding: '0 16px', scrollbarWidth: 'none' }}>
        {[{ id: null, nombre: 'Todas' }, ...AREAS].map(a => {
          const on = area === a.id;
          const n = a.id ? pendArea(a.id) : pendientes.length;
          return (
            <button key={a.nombre} onClick={() => setArea(a.id)} style={{
              flexShrink: 0, padding: '7px 12px', borderRadius: 999, cursor: 'pointer', fontFamily: 'inherit',
              fontSize: 11.5, fontWeight: 700,
              background: on ? 'rgba(245,197,24,0.14)' : 'transparent',
              color: on ? MACACO.primary : MACACO.textDim,
              border: `1px solid ${on ? 'rgba(245,197,24,0.45)' : MACACO.border}`,
            }}>
              {a.nombre}{n > 0 && <span style={{ marginLeft: 6, color: on ? MACACO.primary : MACACO.textMuted }}>{n}</span>}
            </button>
          );
        })}
      </div>

      {(area === null || area === 'stock') && <Timonel productos={app.productos} ventas={app.ventas} />}

      {escaneo.decisiones.length === 0 && Object.keys(corteza).length === 0 ? (
        <EstadoVacio onClick={reEscanear} escaneando={escaneando} />
      ) : (
        <>
          <div style={{
            display: 'flex', gap: 4, padding: 4, marginBottom: 14,
            background: MACACO.card, border: `1px solid ${MACACO.border}`, borderRadius: 12,
          }}>
            {FILTROS.map(t => {
              const on = filtro === t.id;
              return (
                <button key={t.id} onClick={() => setFiltro(t.id)} style={{
                  flex: 1, padding: '8px 4px', borderRadius: 9, border: 'none', cursor: 'pointer',
                  fontFamily: 'inherit', fontSize: 11.5, fontWeight: on ? 800 : 600,
                  background: on ? MACACO.primary : 'transparent',
                  color: on ? '#0A0A0F' : MACACO.textDim,
                }}>
                  {t.label} · {grupos[t.id].length}
                </button>
              );
            })}
          </div>

          <SectionTitle right={filtro === 'pendiente' ? 'ordenado por prioridad' : null}>Cola de evolución</SectionTitle>

          {lista.length === 0 && (
            <div style={{ padding: '26px 10px', textAlign: 'center', color: MACACO.textMuted, fontSize: 12.5 }}>
              {filtro === 'pendiente' ? 'Todo decidido. Re-escanea cuando registres más datos.' : 'Nada por aquí todavía.'}
            </div>
          )}

          {lista.map(d => d.resuelta
            ? <DecisionResuelta key={d.id} d={d} estado={filtro} onReabrir={() => decidirCorteza(d.id, null)} />
            : <DecisionCard
                key={d.id} d={d} estado={estadoDe(d.id)} go={go}
                onDecidir={(estado) => decidirCorteza(d.id, estado, { senal: d.senal, accion: d.accion })}
              />
          )}
        </>
      )}

      <div style={{
        marginTop: 18, padding: '12px 14px', borderRadius: 12,
        border: `1px dashed ${MACACO.border}`, fontSize: 11, color: MACACO.textMuted, lineHeight: 1.5,
      }}>
        La corteza ordena el criterio; tú decides. No ejecuta acciones, no mueve plata ni
        stock y no muestra datos de ejemplo: todo sale de tus ventas, stock, deudas, gastos y cobros.
      </div>
    </Screen>
  );
}

const CLASES = {
  escalar:    { label: '▲ Escalar',  color: MACACO.success },
  mantener:   { label: '= Mantener', color: MACACO.textDim },
  vigilar:    { label: '⚠ Vigilar',  color: MACACO.orange },
  recortar:   { label: '▼ Recortar', color: MACACO.danger },
  'sin-datos': { label: '· Sin datos', color: MACACO.textMuted },
};

// Timonel (de Kairos): dónde poner el próximo peso de compra.
function Timonel({ productos, ventas }) {
  const [abierto, setAbierto] = useState(false);
  const t = useMemo(() => timonel({ productos, ventas }), [productos, ventas]);
  const filas = t.ranking.filter(r => r.clase !== 'sin-datos');
  const visibles = abierto ? filas : filas.slice(0, 5);
  return (
    <>
      <SectionTitle right={t.listo ? `últimos ${t.ventanaDias} días` : null}>🧭 Timonel · próximo peso</SectionTitle>
      <Card padding={0} style={{ marginBottom: 18 }}>
        {!t.listo ? (
          <div style={{ padding: 16, fontSize: 12, color: MACACO.textMuted, lineHeight: 1.5 }}>
            El Timonel necesita 14 días de ventas para opinar (llevas {t.historialDias}). Fuente o silencio.
          </div>
        ) : (
          <>
            {t.jugada && (
              <div style={{ padding: '12px 14px', borderBottom: `1px solid ${MACACO.borderSoft}`, background: 'rgba(245,197,24,0.06)' }}>
                <div style={{ fontSize: 9.5, fontWeight: 800, letterSpacing: '0.16em', color: MACACO.primary }}>JUGADA MAESTRA</div>
                <div style={{ fontSize: 14, fontWeight: 700, marginTop: 4, lineHeight: 1.35 }}>{t.jugada.titulo}</div>
                {t.jugada.porque.map((p, i) => (
                  <div key={i} style={{ fontSize: 11.5, color: MACACO.textDim, marginTop: 3 }}>· {p}</div>
                ))}
              </div>
            )}
            {visibles.map((r, i) => {
              const c = CLASES[r.clase];
              return (
                <div key={r.id} style={{
                  display: 'grid', gridTemplateColumns: '1fr auto', gap: 4, padding: '10px 14px',
                  borderBottom: i === visibles.length - 1 ? 'none' : `1px solid ${MACACO.borderSoft}`,
                }}>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{r.nombre}</div>
                    <div style={{ fontSize: 10.5, color: MACACO.textMuted, marginTop: 2, fontVariantNumeric: 'tabular-nums' }}>
                      {r.unidades > 0
                        ? <>ROI {Math.round(r.roi * 100)}% · {r.rotacion.toFixed(2)} u/día · {r.tendencia > 0 ? '+' : ''}{Math.round(r.tendencia * 100)}% sem.</>
                        : <>Sin ventas · {clp(r.capital)} parados</>}
                      {r.cobertura != null && <> · stock {Math.floor(r.cobertura)} d</>}
                    </div>
                  </div>
                  <div style={{ fontSize: 10.5, fontWeight: 800, color: c.color, alignSelf: 'center', whiteSpace: 'nowrap' }}>{c.label}</div>
                </div>
              );
            })}
            {filas.length > 5 && (
              <button onClick={() => setAbierto(a => !a)} style={{
                width: '100%', padding: 10, background: 'transparent', border: 'none',
                borderTop: `1px solid ${MACACO.borderSoft}`, color: MACACO.textDim,
                fontSize: 11.5, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
              }}>{abierto ? 'Ver menos' : `Ver los ${filas.length} productos`}</button>
            )}
          </>
        )}
      </Card>
    </>
  );
}

function Pilar({ titulo, valor, sub, color }) {
  return (
    <div style={{
      background: MACACO.card, border: `1px solid ${MACACO.border}`, borderRadius: 14,
      padding: '12px 10px', minWidth: 0,
    }}>
      <div style={{ fontSize: 9.5, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color }}>{titulo}</div>
      <div style={{ fontSize: 19, fontWeight: 800, marginTop: 6, letterSpacing: '-0.02em', fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{valor}</div>
      <div style={{ fontSize: 10, color: MACACO.textMuted, marginTop: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{sub}</div>
    </div>
  );
}

function BotonEscanear({ onClick, escaneando, compacto }) {
  return (
    <button onClick={onClick} disabled={escaneando} style={{
      display: 'inline-flex', alignItems: 'center', gap: 6, flexShrink: 0,
      padding: compacto ? '8px 12px' : '12px 18px', borderRadius: 999,
      background: compacto ? 'rgba(245,197,24,0.12)' : MACACO.primary,
      color: compacto ? MACACO.primary : '#0A0A0F',
      border: compacto ? `1px solid rgba(245,197,24,0.35)` : 'none',
      fontFamily: 'inherit', fontSize: compacto ? 11 : 12.5, fontWeight: 800,
      cursor: escaneando ? 'default' : 'pointer', opacity: escaneando ? 0.7 : 1,
    }}>
      <span style={{ display: 'inline-flex', animation: escaneando ? 'spin 700ms linear infinite' : 'none' }}>
        <Icon.refresh size={compacto ? 13 : 15} />
      </span>
      {escaneando ? 'Escaneando…' : 'Re-escanear ahora'}
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </button>
  );
}

function EstadoVacio({ onClick, escaneando }) {
  return (
    <Card padding={24} style={{ textAlign: 'center' }}>
      <div style={{ fontSize: 34, marginBottom: 10 }}>🧠</div>
      <div style={{ fontSize: 15, fontWeight: 700 }}>Sin señales reales todavía</div>
      <div style={{ fontSize: 12, color: MACACO.textDim, marginTop: 8, lineHeight: 1.5 }}>
        La corteza no inventa recomendaciones. Registra ventas, gastos y cobros y vuelve a escanear.
      </div>
      <div style={{ marginTop: 16 }}>
        <BotonEscanear onClick={onClick} escaneando={escaneando} />
      </div>
    </Card>
  );
}

function Metrica({ label, valor, color }) {
  return (
    <div style={{ minWidth: 0 }}>
      <div style={{ fontSize: 9.5, color: MACACO.textMuted, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase' }}>{label}</div>
      <div style={{ fontSize: 12.5, fontWeight: 700, marginTop: 3, color: color || '#fff', fontVariantNumeric: 'tabular-nums', lineHeight: 1.3 }}>{valor}</div>
    </div>
  );
}

function DecisionCard({ d, estado, go, onDecidir }) {
  const p = PRIORIDAD[d.prioridad];
  const pendiente = estado === 'pendiente';
  return (
    <Card style={{ marginBottom: 12, opacity: estado === 'descartada' ? 0.6 : 1 }} padding={14}
          accent={pendiente && d.prioridad === 'alta' ? 'rgba(255,77,77,0.28)' : undefined}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
        <span style={{
          fontSize: 9.5, fontWeight: 800, letterSpacing: '0.1em', textTransform: 'uppercase',
          color: p.color, background: p.bg, padding: '3px 8px', borderRadius: 999,
        }}>{p.label}</span>
        <span style={{ fontSize: 10, color: MACACO.textMuted, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase' }}>{d.tipo}</span>
        {estado === 'aprobada' && (
          <span style={{ marginLeft: 'auto', fontSize: 10, color: MACACO.success, fontWeight: 800, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
            <Icon.check size={11} /> APROBADA
          </span>
        )}
      </div>

      <div style={{ fontSize: 14.5, fontWeight: 700, lineHeight: 1.35 }}>{d.senal}</div>

      {d.evidencia.length > 0 && (
        <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 3 }}>
          {d.evidencia.map((e, i) => (
            <div key={i} style={{ fontSize: 11.5, color: MACACO.textDim, lineHeight: 1.4, display: 'flex', gap: 6 }}>
              <span style={{ color: MACACO.textMuted }}>·</span><span>{e}</span>
            </div>
          ))}
        </div>
      )}

      <div style={{
        display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 12,
        padding: '10px 12px', borderRadius: 10, background: MACACO.cardElev,
      }}>
        <Metrica label="Impacto/mes" valor={d.impactoMensual ? clp(d.impactoMensual) : '—'} color={d.impactoMensual ? MACACO.primary : MACACO.textMuted} />
        <Metrica label="Ahorro/mes" valor={d.ahorroMensual ? clp(d.ahorroMensual) : '—'} color={d.ahorroMensual ? MACACO.success : MACACO.textMuted} />
        <Metrica label="ROI" valor={d.roi || 'Sin datos suficientes'} color={d.roi ? '#fff' : MACACO.textMuted} />
        <Metrica label="Riesgo" valor={d.riesgo[0].toUpperCase() + d.riesgo.slice(1)} color={RIESGO[d.riesgo]} />
      </div>

      <div style={{ marginTop: 12 }}>
        <div style={{ fontSize: 9.5, color: MACACO.textMuted, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase' }}>Acción sugerida</div>
        {d.acciones ? (
          <ol style={{ margin: '4px 0 0', paddingLeft: 18, display: 'flex', flexDirection: 'column', gap: 4 }}>
            {d.acciones.map((a, i) => <li key={i} style={{ fontSize: 13, fontWeight: 600, lineHeight: 1.4 }}>{a}</li>)}
          </ol>
        ) : (
          <div style={{ fontSize: 13, fontWeight: 600, marginTop: 4, lineHeight: 1.4 }}>{d.accion}</div>
        )}
        <div style={{ fontSize: 11, color: MACACO.cyan, marginTop: 6 }}>Artefacto: {d.artefacto}</div>
      </div>

      <div style={{ display: 'flex', gap: 8, marginTop: 14, flexWrap: 'wrap' }}>
        {pendiente ? (
          <>
            <Boton onClick={() => onDecidir('aprobada')} fill={MACACO.primary}>Aprobar</Boton>
            <Boton onClick={() => onDecidir('descartada')}>Descartar</Boton>
          </>
        ) : (
          <Boton onClick={() => onDecidir(null)}>Volver a pendientes</Boton>
        )}
        {d.destino && DESTINOS[d.destino] && (
          <Boton onClick={() => go(d.destino)}>
            Ir a {DESTINOS[d.destino]} <Icon.arrowRight size={11} />
          </Boton>
        )}
      </div>
      {pendiente && (
        <div style={{ fontSize: 10, color: MACACO.textMuted, marginTop: 8 }}>{d.aprobacion}</div>
      )}
    </Card>
  );
}

function DecisionResuelta({ d, estado, onReabrir }) {
  const dia = d.fecha ? new Date(d.fecha).toLocaleDateString('es-CL', { day: 'numeric', month: 'short' }) : '';
  return (
    <Card style={{ marginBottom: 10, opacity: 0.75 }} padding={14}>
      <div style={{ fontSize: 10, color: MACACO.success, fontWeight: 800, letterSpacing: '0.1em', textTransform: 'uppercase' }}>
        Señal ya no aparece · {estado === 'aprobada' ? 'aprobada' : 'descartada'} {dia}
      </div>
      <div style={{ fontSize: 13.5, fontWeight: 700, marginTop: 6 }}>{d.senal || d.id}</div>
      {d.accion && <div style={{ fontSize: 11.5, color: MACACO.textDim, marginTop: 4 }}>{d.accion}</div>}
      <div style={{ marginTop: 10 }}>
        <Boton onClick={onReabrir}>Quitar de la lista</Boton>
      </div>
    </Card>
  );
}

function Boton({ children, onClick, fill }) {
  return (
    <button onClick={onClick} style={{
      display: 'inline-flex', alignItems: 'center', gap: 5,
      padding: '8px 14px', borderRadius: 999, cursor: 'pointer', fontFamily: 'inherit',
      fontSize: 11.5, fontWeight: 700,
      background: fill || 'transparent', color: fill ? '#0A0A0F' : MACACO.textDim,
      border: fill ? 'none' : `1px solid ${MACACO.border}`,
    }}>
      {children}
    </button>
  );
}
