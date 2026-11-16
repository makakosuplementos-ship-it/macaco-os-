import { useState, useMemo } from 'react';
import { MACACO, clp, clpCompact } from '../theme.js';
import { Card, SectionTitle, Progress, Trend, Dot, Icon } from '../components/ui.jsx';
import { Screen, GreetingHeader } from '../components/Screen.jsx';
import { useApp } from '../store.jsx';
import { ventasDelDia, ventasDelMes, getDiasDelMes, sumarTotal, sumarMargen, MESES } from '../store.jsx';
import { escanearCorteza } from '../corteza.js';
import { saludNegocio, telemetria, vigias, timonel } from '../domain/kairos.js';
import { Cabina } from '../components/Cabina.jsx';
import { DEMO } from '../demo.js';
import { Asesores } from '../components/Asesores.jsx';
import { ASESORES } from '../asesores/asesores.js';
import { resumenInicio } from '../domain/inicio.js';
import { ResumenInicio } from '../components/ResumenInicio.jsx';

export default function HomeScreen({ go }) {
  const { ventas, productos, deudas, caja, config, gastos, corteza, sync, pedidos, movimientos, estrategia } = useApp();
  const resumen = useMemo(() => resumenInicio({ ventas, config, pedidos }), [ventas, config, pedidos]);

  const cortezaPendientes = useMemo(() => escanearCorteza({
    productos, ventas, gastos, deudas, caja, config, movimientos, estrategia,
  }).decisiones.filter(d => !corteza[d.id]), [productos, ventas, gastos, deudas, caja, config, movimientos, estrategia, corteza]);
  const cortezaAltas = cortezaPendientes.filter(d => d.prioridad === 'alta').length;

  // Kairos: salud, telemetría, vigía y jugada — todo calculado de los datos reales.
  const kairos = useMemo(() => ({
    salud: saludNegocio({ productos, ventas, deudas, caja, config }),
    serie: telemetria(ventas, { dias: 30 }),
    vigia: vigias({ ventas, productos }),
    jugada: timonel({ productos, ventas }).jugada,
  }), [productos, ventas, deudas, caja, config]);

  const hoy        = new Date();
  const deudaConInteres = deudas.filter(d => d.rate > 0);
  const totalDeudaInt   = deudaConInteres.reduce((s, d) => s + d.amt, 0);
  const interesTotal    = deudaConInteres.reduce((s, d) => s + d.amt * d.rate / 100, 0);

  const h = hoy.getHours();
  const saludo = h < 12 ? 'Buenos días' : h < 20 ? 'Buenas tardes' : 'Buenas noches';
  const syncColor = sync.pendientes > 0 ? MACACO.primary : MACACO.success;
  const syncTexto = sync.pendientes > 0 ? `${sync.pendientes} por enviar` : 'Guardado';

  const fechaStr = hoy.toLocaleDateString('es-CL', { weekday: 'short', day: 'numeric', month: 'short' })
    .replace(/^\w/, c => c.toUpperCase());

  return (
    <Screen>
      <GreetingHeader
        title="Macaco OS"
        subtitle={DEMO ? `${saludo} · demo de revisión` : saludo}
        right={
          <>
            <div style={{ fontSize: 12, color: MACACO.textMuted, fontWeight: 500 }}>{fechaStr}</div>
            <div style={{ fontSize: 11, color: syncColor, fontWeight: 600, marginTop: 2, display: 'flex', alignItems: 'center', gap: 4, justifyContent: 'flex-end' }}>
              <Dot color={syncColor} size={6} /> {syncTexto}
            </div>
          </>
        }
      />

      <ResumenInicio r={resumen} caja={caja} colchon={config.colchonMinimo} go={go} />

      <Cabina {...kairos} pendientes={cortezaPendientes.length} altas={cortezaAltas} go={go} />

      <Asesores ids={['jefe-gabinete', 'contador', 'abogado', 'marketing']} titulo="Tu equipo" />
      <button onClick={() => go('equipo')} style={{
        width: '100%', margin: '-6px 0 16px', padding: '10px', background: 'transparent', border: `1px dashed ${MACACO.border}`,
        borderRadius: 12, color: MACACO.textDim, fontFamily: 'inherit', fontSize: 12, fontWeight: 700, cursor: 'pointer',
      }}>Ver los {ASESORES.length} asesores</button>

      {/* Alerta deuda con interés */}
      {deudaConInteres.length > 0 && (
        <Card
          accent={'rgba(255,77,77,0.3)'}
          style={{ marginBottom: 14, background: 'linear-gradient(135deg, rgba(255,77,77,0.08), rgba(255,77,77,0.02))' }}
        >
          <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
            <div style={{
              width: 32, height: 32, borderRadius: 10, flexShrink: 0,
              background: 'rgba(255,77,77,0.15)', color: MACACO.danger,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <Icon.warn size={18} />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 10.5, color: MACACO.danger, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', marginBottom: 4 }}>
                Deuda con interés · Prioridad 1
              </div>
              <div style={{ fontSize: 13.5, lineHeight: 1.45, color: '#fff' }}>
                <b style={{ fontVariantNumeric: 'tabular-nums' }}>{clp(totalDeudaInt)}</b> destruyendo{' '}
                <b style={{ color: MACACO.danger, fontVariantNumeric: 'tabular-nums' }}>{clp(interesTotal)}/mes</b> en interés.
              </div>
              <button
                onClick={() => go('finanzas')}
                style={{
                  marginTop: 10, background: 'transparent',
                  border: `1px solid rgba(255,77,77,0.4)`,
                  color: MACACO.danger, fontSize: 11.5, fontWeight: 600,
                  padding: '6px 12px', borderRadius: 999, cursor: 'pointer',
                  display: 'inline-flex', alignItems: 'center', gap: 6, fontFamily: 'inherit',
                }}
              >
                Ver plan de pago <Icon.arrowRight size={12} />
              </button>
            </div>
          </div>
        </Card>
      )}

      <DiaADia ventas={ventas} config={config} />
    </Screen>
  );
}

function DiaADia({ ventas, config }) {
  const [tab, setTab] = useState('pasados');
  const hoy           = new Date();
  const diasDelMes    = getDiasDelMes(ventas, hoy);
  const pasados       = diasDelMes.filter(d => !d.isFuture);
  const proximos      = diasDelMes.filter(d => d.isFuture);
  const totalSoFar    = pasados.reduce((s, d) => s + d.s, 0);
  const bestDay       = Math.max(0, ...pasados.map(d => d.s));
  const promedio      = pasados.length > 0 ? totalSoFar / pasados.length : 0;
  const hitDays       = pasados.filter(d => d.s >= config.metaDiaria).length;

  return (
    <>
      <SectionTitle right={`acum ${clpCompact(totalSoFar)}`}>Día a día · {MESES[hoy.getMonth()]}</SectionTitle>
      <Card style={{ marginBottom: 14 }} padding={16}>
        {/* Gráfico barras */}
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 2, height: 56, marginBottom: 6 }}>
          {diasDelMes.map((d, i) => {
            const ratio  = config.metaDiaria > 0 ? Math.min(1, d.s / config.metaDiaria) : 0;
            let color, h, dashed = false;
            if (d.today) {
              color = MACACO.primary; h = Math.max(8, ratio * 50);
            } else if (!d.isFuture) {
              color = d.s === 0 ? 'rgba(255,77,77,0.35)'
                : d.s >= config.metaDiaria ? MACACO.success
                : ratio > 0.15 ? MACACO.cyan
                : 'rgba(0,212,255,0.35)';
              h = d.s === 0 ? 6 : Math.max(8, ratio * 50);
            } else {
              color = 'rgba(245,197,24,0.10)'; h = 50; dashed = true;
            }
            return (
              <div key={i} style={{ flex: 1, height: 50, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
                <div style={{
                  width: '100%', height: h, background: color, borderRadius: 2,
                  border: dashed ? '1px dashed rgba(245,197,24,0.4)' : 'none',
                  boxSizing: 'border-box',
                  boxShadow: d.today ? `0 0 8px ${MACACO.primary}aa` : 'none',
                }} />
              </div>
            );
          })}
        </div>

        {/* Eje x compacto */}
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 9, color: MACACO.textMuted, fontFamily: 'JetBrains Mono, monospace', marginBottom: 12, letterSpacing: '0.04em' }}>
          <span>01</span>
          <span>08</span>
          <span>15</span>
          <span>22</span>
          <span style={{ color: MACACO.primary, fontWeight: 700 }}>{String(hoy.getDate()).padStart(2,'0')}·HOY</span>
          <span>{diasDelMes.length}</span>
        </div>

        {/* Mini stats */}
        <div style={{
          display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8,
          padding: '10px 0', borderTop: `1px solid ${MACACO.borderSoft}`, borderBottom: `1px solid ${MACACO.borderSoft}`,
          marginBottom: 12,
        }}>
          <MiniStat label="Mejor día"   value={clpCompact(bestDay)}  accent={MACACO.success} />
          <MiniStat label="Promedio"    value={clpCompact(promedio)} accent={MACACO.cyan} />
          <MiniStat label="Meta lograda" value={`${hitDays} / ${pasados.length}`} accent={hitDays > 0 ? MACACO.success : MACACO.danger} />
        </div>

        {/* Tabs pasados / próximos */}
        <div style={{ display: 'flex', gap: 4, padding: 3, marginBottom: 12, background: 'rgba(255,255,255,0.04)', borderRadius: 10 }}>
          {[['pasados', 'Pasados', pasados.length], ['proximos', 'Próximos', proximos.length]].map(([id, label, n]) => {
            const active = tab === id;
            return (
              <button key={id} onClick={() => setTab(id)} style={{
                flex: 1, padding: '8px',
                background: active ? MACACO.cardElev : 'transparent',
                border: 'none', borderRadius: 7,
                color: active ? '#fff' : MACACO.textDim,
                fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                boxShadow: active ? `inset 0 0 0 1px ${MACACO.border}` : 'none',
                transition: '150ms',
              }}>
                {label}
                <span style={{
                  background: active ? 'rgba(245,197,24,0.16)' : 'rgba(255,255,255,0.05)',
                  color: active ? MACACO.primary : MACACO.textMuted,
                  padding: '1px 7px', borderRadius: 999, fontSize: 10, fontWeight: 700,
                }}>{n}</span>
              </button>
            );
          })}
        </div>

        {tab === 'pasados'
          ? <PasadosList past={[...pasados].reverse()} metaDiaria={config.metaDiaria} />
          : <ProximosList upcoming={proximos} totalSoFar={totalSoFar} metaDiaria={config.metaDiaria} metaMensual={config.metaMensual} />
        }
      </Card>
    </>
  );
}

function MiniStat({ label, value, accent }) {
  return (
    <div style={{ textAlign: 'center' }}>
      <div style={{ fontSize: 9.5, color: MACACO.textMuted, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase' }}>{label}</div>
      <div style={{ fontSize: 14, fontWeight: 700, color: accent || '#fff', marginTop: 3, fontVariantNumeric: 'tabular-nums' }}>{value}</div>
    </div>
  );
}

function PasadosList({ past, metaDiaria }) {
  const [expanded, setExpanded] = useState(false);
  const visible = expanded ? past : past.slice(0, 6);

  return (
    <>
      <div style={{ display: 'flex', flexDirection: 'column' }}>
        {visible.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '16px 0', color: MACACO.textMuted, fontSize: 12 }}>
            Sin ventas registradas este mes
          </div>
        ) : (
          visible.map((p, idx) => {
            const pct  = metaDiaria > 0 ? Math.min(100, (p.s / metaDiaria) * 100) : 0;
            const hit  = p.s >= metaDiaria && metaDiaria > 0;
            const zero = p.s === 0;
            return (
              <div key={p.d} style={{
                display: 'flex', alignItems: 'center', gap: 12,
                padding: '10px 0',
                borderBottom: idx === visible.length - 1 ? 'none' : `1px solid ${MACACO.borderSoft}`,
              }}>
                <div style={{
                  width: 38, textAlign: 'center',
                  background: p.today ? 'rgba(245,197,24,0.12)' : 'rgba(255,255,255,0.03)',
                  borderRadius: 8, padding: '4px 0',
                  border: p.today ? '1px solid rgba(245,197,24,0.3)' : '1px solid transparent',
                }}>
                  <div style={{ fontSize: 9, color: p.today ? MACACO.primary : MACACO.textMuted, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
                    {p.dow}
                  </div>
                  <div style={{ fontSize: 14, fontWeight: 800, color: p.today ? MACACO.primary : '#fff', fontVariantNumeric: 'tabular-nums', lineHeight: 1 }}>
                    {String(p.d).padStart(2, '0')}
                  </div>
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ height: 5, background: 'rgba(255,255,255,0.05)', borderRadius: 999, overflow: 'hidden', position: 'relative' }}>
                    {!zero && (
                      <div style={{
                        width: pct + '%', height: '100%',
                        background: p.today ? MACACO.primary : hit ? MACACO.success : MACACO.cyan,
                        borderRadius: 999,
                        boxShadow: p.today ? `0 0 8px ${MACACO.primary}88` : 'none',
                      }} />
                    )}
                  </div>
                  <div style={{ fontSize: 10, color: MACACO.textMuted, marginTop: 4, fontFamily: 'JetBrains Mono, monospace' }}>
                    {zero ? 'Sin ventas' : hit ? '✓ superó la meta' : metaDiaria > 0 ? `${pct.toFixed(0)}% de meta diaria` : clp(p.s)}
                  </div>
                </div>
                <div style={{ textAlign: 'right', minWidth: 78 }}>
                  <div style={{ fontSize: 13.5, fontWeight: 700, fontVariantNumeric: 'tabular-nums', color: zero ? MACACO.textMuted : hit ? MACACO.success : '#fff' }}>
                    {clp(p.s)}
                  </div>
                  {metaDiaria > 0 && !zero && (
                    <div style={{ fontSize: 10, fontWeight: 600, marginTop: 2, fontVariantNumeric: 'tabular-nums', color: hit ? MACACO.success : MACACO.textMuted }}>
                      {hit ? `+${clpCompact(p.s - metaDiaria)}` : `-${clpCompact(metaDiaria - p.s)}`}
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
      {past.length > 6 && (
        <button onClick={() => setExpanded(e => !e)} style={{
          marginTop: 12, width: '100%', padding: '10px',
          background: 'transparent', border: `1px solid ${MACACO.border}`,
          borderRadius: 10, color: MACACO.textDim,
          fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6,
        }}>
          {expanded ? 'Ver menos' : `Ver los ${past.length} días`}
        </button>
      )}
    </>
  );
}

function ProximosList({ upcoming, totalSoFar, metaDiaria, metaMensual }) {
  let cum = totalSoFar;
  const cards = upcoming.map(u => {
    cum += metaDiaria;
    return { ...u, cum, pct: metaMensual > 0 ? (cum / metaMensual) * 100 : 0 };
  });

  return (
    <>
      {metaDiaria > 0 && cards.length > 0 && (
        <div style={{
          padding: '10px 12px', borderRadius: 10, marginBottom: 10,
          background: 'rgba(0,212,255,0.06)', border: '1px solid rgba(0,212,255,0.18)',
        }}>
          <div style={{ fontSize: 11.5, color: MACACO.textDim, lineHeight: 1.45 }}>
            Si vendés <b style={{ color: '#fff' }}>{clp(metaDiaria)}</b> cada día, terminarías en{' '}
            <b style={{ color: MACACO.cyan }}>{clp(cards[cards.length - 1]?.cum || totalSoFar)}</b>.
          </div>
        </div>
      )}
      {upcoming.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '16px 0', color: MACACO.textMuted, fontSize: 12 }}>
          Fin de mes — ¡revisá el balance!
        </div>
      ) : (
        <div style={{
          display: 'flex', gap: 10, overflowX: 'auto',
          margin: '0 -16px', padding: '4px 16px 8px', scrollbarWidth: 'none',
        }}>
          {cards.map(c => (
            <div key={c.d} style={{
              flex: '0 0 auto', width: 162,
              background: 'linear-gradient(180deg, rgba(245,197,24,0.07), rgba(245,197,24,0.01))',
              border: '1px dashed rgba(245,197,24,0.32)',
              borderRadius: 14, padding: 14,
            }}>
              <div style={{ fontSize: 9.5, color: MACACO.primary, letterSpacing: '0.14em', fontWeight: 700, textTransform: 'uppercase' }}>{c.dow}</div>
              <div style={{ fontSize: 26, fontWeight: 800, color: '#fff', marginTop: 2 }}>{String(c.d).padStart(2, '0')}</div>
              <div style={{ marginTop: 10, fontSize: 9, color: MACACO.textMuted, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase' }}>Meta del día</div>
              <div style={{ fontSize: 15, fontWeight: 800, color: MACACO.primary, marginTop: 2 }}>{clp(metaDiaria)}</div>
              <div style={{ marginTop: 8, fontSize: 9, color: MACACO.textMuted, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase' }}>Acum si cumple</div>
              <div style={{ fontSize: 14, fontWeight: 700, color: MACACO.cyan, marginTop: 2 }}>{clp(c.cum)}</div>
              <div style={{ marginTop: 6 }}><Progress value={c.pct} color={MACACO.cyan} height={4} glow={false} animate={false} /></div>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
