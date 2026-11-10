import { useState } from 'react';
import { MACACO, clp, clpCompact } from '../theme.js';
import { Card, SectionTitle, Progress, Trend, Dot } from '../components/ui.jsx';
import { Screen } from '../components/Screen.jsx';
import { CerebroArea } from '../components/CerebroArea.jsx';
import { useApp } from '../store.jsx';
import {
  ventasDelDia, ventasDelMes, ventasUltimos7Dias,
  sumarTotal, sumarMargen, getDiasGraficoSemanal, getTopProductos,
  calcMetricasInventario, getResumenClientes, gastosDelMes, sumarGastos, MESES,
  contarTransacciones, mesesConDatos, resumenMes, ventasPorProducto, rotacionProductosMes, mesKey, mesLabel,
  ventasPorCanal, ventasPorSabor,
} from '../store.jsx';

const TABS = ['Diario', 'Semanal', 'Mensual', 'Clientes'];

export default function ReportesScreen({ go }) {
  const { ventas, movimientos, productos, config, gastos } = useApp();
  const [tab,     setTab]     = useState('Mensual');
  return (
    <Screen>
      <div style={{ padding: '6px 0 14px' }}>
        <div style={{ fontSize: 11, color: MACACO.primary, fontWeight: 700, letterSpacing: '0.16em', textTransform: 'uppercase' }}>Análisis</div>
        <div style={{ fontSize: 26, fontWeight: 800, letterSpacing: '-0.02em', marginTop: 4 }}>Reportes</div>
      </div>

      <CerebroArea areas={['ventas']} go={go} />

      {/* Tabs */}
      <div style={{
        display: 'flex', background: MACACO.card,
        border: `1px solid ${MACACO.border}`, borderRadius: 12, padding: 4, marginBottom: 16,
      }}>
        {TABS.map(t => {
          const active = tab === t;
          return (
            <button key={t} onClick={() => setTab(t)} style={{
              flex: 1, padding: '8px 4px',
              background: active ? MACACO.cardElev : 'transparent',
              color: active ? '#fff' : MACACO.textDim,
              border: 'none', borderRadius: 9,
              fontSize: 11, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
              boxShadow: active ? `inset 0 0 0 1px ${MACACO.border}` : 'none',
              transition: '150ms',
            }}>{t}</button>
          );
        })}
      </div>

      <div style={{ animation: 'fadeUp 320ms cubic-bezier(.2,.7,.2,1)' }}>
        {tab === 'Diario'   && <ReporteDiario  ventas={ventas} config={config} />}
        {tab === 'Semanal'  && <ReporteSemanal ventas={ventas} config={config} />}
        {tab === 'Mensual'  && <ReporteMensual ventas={ventas} movimientos={movimientos} productos={productos} config={config} gastos={gastos} />}
        {tab === 'Clientes' && <ClientesTab    ventas={ventas} />}
      </div>

    </Screen>
  );
}

// ─── Diario ───────────────────────────────────────────────────────────────────

function ReporteDiario({ ventas, config }) {
  const vHoy  = ventasDelDia(ventas);
  const total = sumarTotal(vHoy);
  const margen = sumarMargen(vHoy);
  const top   = getTopProductos(vHoy, 1)[0];
  const nTx   = contarTransacciones(vHoy);
  const aov   = nTx > 0 ? total / nTx : 0;

  const ayer    = new Date(); ayer.setDate(ayer.getDate() - 1);
  const vAyer   = ventasDelDia(ventas, ayer);
  const totAyer = sumarTotal(vAyer);
  const trend   = totAyer > 0 ? Math.round(((total - totAyer) / totAyer) * 100) : null;

  return (
    <>
      <Card style={{ marginBottom: 12 }} padding={18}>
        <div style={{ fontSize: 11, color: MACACO.textDim, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase' }}>Ventas hoy</div>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginTop: 6 }}>
          <div style={{ fontSize: 32, fontWeight: 800, letterSpacing: '-0.03em', fontVariantNumeric: 'tabular-nums' }}>{clp(total)}</div>
          {trend !== null && <Trend value={trend} />}
        </div>
        {totAyer > 0 && <div style={{ fontSize: 11.5, color: MACACO.textMuted, marginTop: 4 }}>vs ayer ({clp(totAyer)})</div>}
      </Card>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 12 }}>
        <KpiTile label="Transacciones"  value={String(nTx)} />
        <KpiTile label="Ticket promedio" value={aov > 0 ? clp(Math.round(aov)) : '—'} />
      </div>
      {total > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 12 }}>
          <KpiTile label="Margen bruto" value={clp(margen)} color={MACACO.success} />
          <KpiTile label="% Margen" value={total > 0 ? (margen / total * 100).toFixed(0) + '%' : '—'} color={MACACO.success} />
        </div>
      )}
      {top && (
        <Card style={{ marginBottom: 12 }}>
          <SectionTitle style={{ marginBottom: 10 }}>Más vendido hoy</SectionTitle>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <div style={{ fontSize: 15, fontWeight: 700 }}>{top.n}</div>
              <div style={{ fontSize: 12, color: MACACO.textMuted, marginTop: 2 }}>{top.q} unidad{top.q > 1 ? 'es' : ''}</div>
            </div>
            <div style={{ padding: '6px 12px', borderRadius: 999, background: 'rgba(245,197,24,0.12)', color: MACACO.primary, fontSize: 12, fontWeight: 700 }}>×{top.q}</div>
          </div>
        </Card>
      )}
      {vHoy.length === 0 && <EmptyState texto="Sin ventas registradas hoy" />}
    </>
  );
}

// ─── Semanal ──────────────────────────────────────────────────────────────────

function ReporteSemanal({ ventas, config }) {
  const v7    = ventasUltimos7Dias(ventas);
  const total = sumarTotal(v7);
  const dias  = getDiasGraficoSemanal(ventas);
  const max   = Math.max(1, ...dias.map(d => d.v));
  const top3  = getTopProductos(v7, 3);
  const metaSem = config.metaDiaria * 7;
  const pct   = metaSem > 0 ? (total / metaSem) * 100 : 0;

  return (
    <>
      <Card style={{ marginBottom: 12 }} padding={18}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
          <div>
            <div style={{ fontSize: 11, color: MACACO.textDim, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase' }}>Ventas 7 días</div>
            <div style={{ fontSize: 28, fontWeight: 800, marginTop: 4, fontVariantNumeric: 'tabular-nums' }}>{clp(total)}</div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 11, color: MACACO.textDim }}>Meta {clpCompact(metaSem)}</div>
            <div style={{ fontSize: 16, fontWeight: 700, color: MACACO.primary, marginTop: 2 }}>{pct.toFixed(1)}%</div>
          </div>
        </div>
        <div style={{ marginTop: 14 }}><Progress value={pct} color={MACACO.primary} height={6} /></div>
      </Card>
      <Card style={{ marginBottom: 12 }}>
        <SectionTitle style={{ marginBottom: 14 }}>Últimos 7 días</SectionTitle>
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6, height: 110 }}>
          {dias.map((d, i) => {
            const h = d.v === 0 ? 4 : (d.v / max) * 90 + 8;
            return (
              <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
                <div style={{ fontSize: 9, color: d.isToday ? MACACO.primary : MACACO.textMuted, fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>
                  {d.v >= 1000 ? Math.round(d.v / 1000) + 'k' : d.v > 0 ? d.v : ''}
                </div>
                <div style={{ width: '100%', height: h, borderRadius: 4, background: d.isToday ? MACACO.primary : 'rgba(245,197,24,0.25)', boxShadow: d.isToday ? `0 0 10px ${MACACO.primary}88` : 'none' }} />
                <div style={{ fontSize: 10.5, color: d.isToday ? '#fff' : MACACO.textMuted, fontWeight: d.isToday ? 700 : 500 }}>{d.d}</div>
              </div>
            );
          })}
        </div>
      </Card>
      {top3.length > 0 && <TopProductosList items={top3} />}
      {v7.length === 0 && <EmptyState texto="Sin ventas en los últimos 7 días" />}
    </>
  );
}

// ─── Mensual ──────────────────────────────────────────────────────────────────

function ReporteMensual({ ventas, movimientos, productos, config, gastos }) {
  const ahora  = new Date();
  const [sel, setSel]       = useState(mesKey(ahora));
  const [abierto, setAbierto] = useState(false);
  const esActual = sel === mesKey(ahora);
  const [selA, selM] = sel.split('-').map(Number);
  const hoy    = esActual ? ahora : new Date(selA, selM - 1, 15);
  const meses  = mesesConDatos(ventas, gastos);
  const vMes   = ventasDelMes(ventas, hoy);
  const total  = sumarTotal(vMes);
  const margen = sumarMargen(vMes);
  const nTx    = contarTransacciones(vMes);
  const aov    = nTx > 0 ? total / nTx : 0;
  const pct    = config.metaMensual > 0 ? (total / config.metaMensual) * 100 : 0;
  const top3   = getTopProductos(vMes, 3);

  const { cogsMes, unidadesVendidas, unidadesRecibidas, inventarioActual, str, rotacion, dsi } =
    calcMetricasInventario(ventas, movimientos, productos, hoy);

  const margenPct = total > 0 ? (margen / total * 100) : 0;

  // Gastos del mes
  const gMes            = gastosDelMes(gastos, hoy);
  const gastosNegocio   = sumarGastos(gMes.filter(g => g.tipo === 'negocio'));
  const gananciaNeta    = total - cogsMes - gastosNegocio;
  const ratioGastos     = total > 0 ? (gastosNegocio / total) * 100 : 0;
  const hayGastos       = gastosNegocio > 0;

  // Máximo para escalar el gráfico
  const maxGasto = Math.max(gastosNegocio, 1);

  return (
    <>
      <Card style={{ marginBottom: abierto ? 8 : 12 }} padding={18} onClick={() => setAbierto(a => !a)}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ fontSize: 11, color: MACACO.textDim, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase' }}>{MESES[hoy.getMonth()]} {hoy.getFullYear()}</div>
          <div style={{ fontSize: 10.5, color: MACACO.primary, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6 }}>
            {meses.length > 1 ? `${meses.length} meses` : 'Historial'}
            <svg width="12" height="12" viewBox="0 0 14 14" style={{ transform: abierto ? 'rotate(180deg)' : 'none', transition: '200ms' }}>
              <path d="M3 5l4 4 4-4" stroke={MACACO.primary} strokeWidth="1.8" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
        </div>
        <div style={{ fontSize: 32, fontWeight: 800, marginTop: 6, fontVariantNumeric: 'tabular-nums' }}>{clp(total)}</div>
        <div style={{ fontSize: 12, color: MACACO.textMuted, marginTop: 4 }}>de {clp(config.metaMensual)} meta</div>
        {(() => { const t = ventasPorProducto(vMes).sort((a, b) => b.unidades - a.unidades)[0];
          return t ? <div style={{ fontSize: 12, color: MACACO.textDim, marginTop: 8 }}>
            Más vendido: <b style={{ color: '#fff' }}>{t.nombre}</b> ({t.unidades} u) · margen <b style={{ color: MACACO.success }}>{clp(margen)}</b>
          </div> : null; })()}
        <div style={{ marginTop: 14 }}>
          <Progress value={pct} color={MACACO.primary} height={10} />
          <div style={{ marginTop: 6, fontSize: 11, color: MACACO.textMuted, textAlign: 'right' }}>{pct.toFixed(1)}%</div>
        </div>
      </Card>

      {abierto && (
        <Card padding={0} style={{ marginBottom: 12 }}>
          {meses.map((k, i) => {
            const [a, m] = k.split('-').map(Number);
            const r = resumenMes(ventas, gastos, new Date(a, m - 1, 15));
            const activo = k === sel;
            const pctMes = config.metaMensual > 0 ? (r.total / config.metaMensual) * 100 : 0;
            return (
              <div key={k} onClick={(e) => { e.stopPropagation(); setSel(k); setAbierto(false); }} style={{
                padding: '12px 14px', cursor: 'pointer',
                background: activo ? 'rgba(245,197,24,0.07)' : 'transparent',
                borderBottom: i === meses.length - 1 ? 'none' : `1px solid ${MACACO.borderSoft}`,
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                  <div style={{ fontSize: 13.5, fontWeight: 700, color: activo ? MACACO.primary : '#fff' }}>{mesLabel(k)}</div>
                  <div style={{ fontSize: 14, fontWeight: 800, fontVariantNumeric: 'tabular-nums' }}>{clp(r.total)}</div>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4, fontSize: 11, color: MACACO.textMuted }}>
                  <span>{r.transacciones} venta{r.transacciones !== 1 ? 's' : ''} · {pctMes.toFixed(0)}% meta</span>
                  <span>margen <b style={{ color: MACACO.success }}>{clp(r.margen)}</b> · gastos {clp(r.gastos)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 3, fontSize: 11, color: MACACO.textMuted }}>
                  <span style={{ minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {r.top ? <>Más vendido: <b style={{ color: '#fff' }}>{r.top.nombre}</b> ({r.top.unidades} u)</> : 'Sin ventas'}
                  </span>
                  <span style={{ fontWeight: 700, color: r.neto >= 0 ? MACACO.success : MACACO.danger, flexShrink: 0, marginLeft: 8 }}>neto {clp(r.neto)}</span>
                </div>
              </div>
            );
          })}
        </Card>
      )}

      <SectionTitle>KPIs financieros</SectionTitle>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 14 }}>
        <KpiTile label="Margen bruto"   value={margenPct > 0 ? margenPct.toFixed(0) + '%' : '—'} color={MACACO.success} />
        <KpiTile label="Ticket prom."   value={aov > 0 ? clpCompact(Math.round(aov)) : '—'} />
        <KpiTile label="Transacciones"  value={String(nTx)} color={MACACO.cyan} />
        <KpiTile label="COGS del mes"   value={cogsMes > 0 ? clpCompact(cogsMes) : '—'} color={MACACO.danger} />
      </div>

      {/* Ventas por canal */}
      {vMes.length > 0 && (
        <>
          <SectionTitle>Ventas por canal</SectionTitle>
          <Card padding={0} style={{ marginBottom: 14 }}>
            {ventasPorCanal(vMes).map((c, i, arr) => (
              <div key={c.canal} style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '12px 14px',
                borderBottom: i === arr.length - 1 ? 'none' : `1px solid ${MACACO.borderSoft}`,
              }}>
                <div>
                  <div style={{ fontSize: 13.5, fontWeight: 600 }}>{c.canal}</div>
                  <div style={{ fontSize: 11, color: MACACO.textMuted, marginTop: 2 }}>
                    {c.transacciones} {c.transacciones === 1 ? 'venta' : 'ventas'} · margen {c.margenPct.toFixed(0)}%
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: 14, fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>{clp(c.total)}</div>
                  <div style={{ fontSize: 11, color: MACACO.success, marginTop: 2 }}>{clp(c.margen)} margen</div>
                </div>
              </div>
            ))}
          </Card>
        </>
      )}

      {/* Resultado neto real */}
      <SectionTitle>Resultado neto real</SectionTitle>
      <Card style={{
        marginBottom: 12,
        background: gananciaNeta >= 0
          ? 'linear-gradient(135deg, rgba(0,230,118,0.06), rgba(0,230,118,0.01))'
          : 'linear-gradient(135deg, rgba(255,77,77,0.06), rgba(255,77,77,0.01))',
        borderColor: gananciaNeta >= 0 ? 'rgba(0,230,118,0.25)' : 'rgba(255,77,77,0.25)',
      }} padding={18}>
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 14 }}>
          <div>
            <div style={{ fontSize: 11, color: MACACO.textDim, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', marginBottom: 4 }}>
              Ganancia neta
            </div>
            <div style={{ fontSize: 30, fontWeight: 800, letterSpacing: '-0.03em', fontVariantNumeric: 'tabular-nums', color: gananciaNeta >= 0 ? MACACO.success : MACACO.danger }}>
              {clp(gananciaNeta)}
            </div>
          </div>
          {total > 0 && gastosNegocio > 0 && (
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 10, color: MACACO.textMuted, fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase' }}>
                Ratio gastos
              </div>
              <div style={{ fontSize: 20, fontWeight: 800, marginTop: 2, color: ratioGastos > 50 ? MACACO.danger : ratioGastos > 25 ? MACACO.orange : MACACO.success }}>
                {ratioGastos.toFixed(0)}%
              </div>
            </div>
          )}
        </div>
        {/* Desglose */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {[
            { label: 'Ventas',         val: total,          color: MACACO.success },
            { label: 'COGS',           val: -cogsMes,       color: MACACO.danger },
            { label: 'Gastos negocio', val: -gastosNegocio, color: MACACO.orange },
          ].map(({ label, val, color }) => (
            <div key={label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ fontSize: 12, color: MACACO.textDim }}>{label}</div>
              <div style={{ fontSize: 13, fontWeight: 700, color, fontVariantNumeric: 'tabular-nums' }}>
                {val >= 0 ? clp(val) : `−${clp(Math.abs(val))}`}
              </div>
            </div>
          ))}
          <div style={{ height: 1, background: 'rgba(255,255,255,0.1)', margin: '4px 0' }} />
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: '#fff' }}>Neto</div>
            <div style={{ fontSize: 14, fontWeight: 800, color: gananciaNeta >= 0 ? MACACO.success : MACACO.danger, fontVariantNumeric: 'tabular-nums' }}>
              {gananciaNeta >= 0 ? clp(gananciaNeta) : `−${clp(Math.abs(gananciaNeta))}`}
            </div>
          </div>
        </div>
      </Card>

      {/* Gráfico gastos negocio */}
      {hayGastos && (
        <Card style={{ marginBottom: 14 }} padding={16}>
          <div style={{ fontSize: 10.5, color: MACACO.textDim, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 14 }}>
            Gastos del mes
          </div>
          {[
            { label: 'Negocio', val: gastosNegocio,  color: MACACO.orange },
          ].map(({ label, val, color }) => {
            const pctBar = (val / maxGasto) * 100;
            return (
              <div key={label} style={{ marginBottom: 10 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
                  <div style={{ fontSize: 12, color: MACACO.textDim, fontWeight: 500 }}>{label}</div>
                  <div style={{ fontSize: 12, fontWeight: 700, color, fontVariantNumeric: 'tabular-nums' }}>{val > 0 ? clp(val) : '—'}</div>
                </div>
                <div style={{ height: 8, background: 'rgba(255,255,255,0.06)', borderRadius: 999, overflow: 'hidden' }}>
                  <div style={{
                    width: pctBar + '%', height: '100%', background: color,
                    borderRadius: 999, boxShadow: `0 0 10px ${color}66`,
                    transition: 'width 800ms cubic-bezier(.2,.7,.2,1)',
                  }} />
                </div>
              </div>
            );
          })}
        </Card>
      )}

      <SectionTitle>Métricas de inventario</SectionTitle>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 14 }}>
        <KpiTile
          label="Sell-Through"
          value={str !== null ? str.toFixed(0) + '%' : 'Sin compras'}
          color={str !== null ? (str >= 70 ? MACACO.success : str >= 40 ? MACACO.primary : MACACO.danger) : MACACO.textMuted}
          hint={unidadesRecibidas > 0 ? `${unidadesVendidas}u vend / ${unidadesRecibidas}u recib` : 'Registra compras para calcular'}
        />
        <KpiTile
          label="Rotación inv."
          value={rotacion !== null ? rotacion.toFixed(2) + '×' : '—'}
          color={MACACO.cyan}
          hint="COGS / inventario actual"
        />
        <KpiTile
          label="DSI"
          value={dsi !== null ? dsi + ' días' : '—'}
          color={dsi !== null ? (dsi <= 15 ? MACACO.danger : dsi <= 30 ? MACACO.primary : MACACO.success) : MACACO.textMuted}
          hint="Días hasta agotar stock"
        />
        <KpiTile
          label="Val. inventario"
          value={clpCompact(inventarioActual)}
          color={MACACO.textDim}
          hint="A costo actual"
        />
      </div>

      <ProductosDelMes ventas={ventas} movimientos={movimientos} productos={productos} fecha={hoy} esActual={esActual} />
      <SaboresVendidos ventasMes={vMes} ventasTodas={ventas} productos={productos} />
      {vMes.length === 0 && <EmptyState texto="Sin ventas registradas este mes" />}
    </>
  );
}

// Ventas, margen y rotación de cada producto en el mes elegido (también meses anteriores).
function ProductosDelMes({ ventas, movimientos, productos, fecha, esActual }) {
  const dias  = esActual ? fecha.getDate() : undefined;
  const filas = rotacionProductosMes(ventas, movimientos, productos, fecha, dias);
  if (filas.length === 0) return null;
  const diasMes = dias || new Date(fecha.getFullYear(), fecha.getMonth() + 1, 0).getDate();

  return (
    <>
      <SectionTitle>Rotación por producto</SectionTitle>
      <Card padding={0} style={{ marginBottom: 6 }}>
        {filas.map((f, i) => {
          const vendio = f.unidades > 0;
          const color  = f.diasRotacion === null ? MACACO.textMuted : f.diasRotacion <= 15 ? MACACO.success : f.diasRotacion <= 30 ? MACACO.primary : MACACO.danger;
          // Cuántos días alcanza el stock actual al ritmo de este mes (solo mes en curso)
          const alcanza = esActual && vendio && f.stockFin > 0 ? Math.round(f.stockFin / (f.unidades / diasMes)) : null;
          return (
            <div key={f.id || f.nombre} style={{
              padding: '12px 14px',
              borderBottom: i === filas.length - 1 ? 'none' : `1px solid ${MACACO.borderSoft}`,
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 10 }}>
                <div style={{ fontSize: 13, fontWeight: 600, minWidth: 0 }}>{f.nombre}</div>
                <div style={{ fontSize: 13, fontWeight: 700, fontVariantNumeric: 'tabular-nums', flexShrink: 0 }}>
                  {vendio ? clp(f.total) : <span style={{ color: MACACO.textMuted, fontWeight: 500, fontSize: 11 }}>sin ventas</span>}
                </div>
              </div>
              {vendio && (
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 3, fontSize: 11.5 }}>
                  <span style={{ color: MACACO.textDim }}>
                    Vendió <b style={{ color: '#fff' }}>{f.unidades} u</b> · margen <b style={{ color: MACACO.success }}>{clp(f.margen)}</b>
                  </span>
                  <span style={{ color, fontWeight: 700 }}>
                    {f.rotacion !== null ? `${f.rotacion.toFixed(1)}× · ${f.diasRotacion} d` : '—'}
                  </span>
                </div>
              )}
              <div style={{ fontSize: 10.5, color: MACACO.textMuted, marginTop: 3 }}>
                Stock {f.stockIni} → {f.stockFin}
                {f.compras > 0 && ` · compras +${f.compras}`}
                {f.vendidoPct !== null && vendio && ` · vendió ${f.vendidoPct.toFixed(0)}% de lo disponible`}
                {alcanza !== null && ` · alcanza ~${alcanza} días`}
              </div>
            </div>
          );
        })}
      </Card>
      <div style={{ fontSize: 10.5, color: MACACO.textMuted, lineHeight: 1.45, margin: '0 4px 14px' }}>
        Rotación = unidades vendidas ÷ stock promedio del mes. Los días indican cada cuánto se renueva el stock (menos días = rota más rápido).
      </div>
    </>
  );
}

// ─── Sabores ──────────────────────────────────────────────────────────────────
// Qué sabor se vende más y cuál menos, por producto. Solo cuenta ventas registradas
// con sabor (las anteriores a los sabores no lo traen).
function SaboresVendidos({ ventasMes, ventasTodas, productos }) {
  const [alcance, setAlcance] = useState('mes'); // mes | todo
  const grupos = ventasPorSabor(alcance === 'mes' ? ventasMes : ventasTodas, productos);
  if (grupos.length === 0) return null;
  const hayVentas = grupos.some(g => g.unidades > 0);

  return (
    <>
      <SectionTitle>Sabores</SectionTitle>
      <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
        {[['mes', 'Este mes'], ['todo', 'Todo el historial']].map(([id, label]) => {
          const active = alcance === id;
          return (
            <button key={id} onClick={() => setAlcance(id)} style={{
              flex: 1, padding: '9px 6px', borderRadius: 10, fontFamily: 'inherit', cursor: 'pointer',
              background: active ? MACACO.primary : MACACO.card, color: active ? '#0A0A0F' : '#fff',
              border: `1px solid ${active ? MACACO.primary : MACACO.border}`, fontSize: 12, fontWeight: 700,
            }}>{label}</button>
          );
        })}
      </div>
      {grupos.map(g => (
        <Card key={g.productoId} padding={0} style={{ marginBottom: 10 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', padding: '12px 14px 4px' }}>
            <div style={{ fontSize: 13.5, fontWeight: 700, minWidth: 0 }}>{g.producto}</div>
            <div style={{ fontSize: 11.5, color: MACACO.textDim, flexShrink: 0 }}>{g.unidades} u con sabor</div>
          </div>
          {g.sabores.map((f, i) => {
            // solo se marca cuando hay un ganador (o perdedor) claro, no en un empate
            const mas   = hayVentas && i === 0 && f.unidades > 0 && f.unidades > (g.sabores[1]?.unidades ?? 0);
            const menos = g.sabores.length > 1 && i === g.sabores.length - 1 && g.unidades > 0
              && f.unidades < (g.sabores[g.sabores.length - 2]?.unidades ?? 0);
            const sinStock = f.stock !== null && f.stock <= 0;
            return (
              <div key={f.sabor} style={{ padding: '9px 14px', borderTop: `1px solid ${MACACO.borderSoft}` }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 10 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, minWidth: 0 }}>
                    {f.sabor}
                    {mas && <span style={{ marginLeft: 8, fontSize: 10, fontWeight: 800, color: MACACO.success }}>MÁS VENDIDO</span>}
                    {menos && <span style={{ marginLeft: 8, fontSize: 10, fontWeight: 800, color: MACACO.textMuted }}>MENOS VENDIDO</span>}
                  </div>
                  <div style={{ fontSize: 12.5, fontWeight: 700, fontVariantNumeric: 'tabular-nums', flexShrink: 0 }}>
                    {f.unidades} u{f.unidades > 0 ? ` · ${clp(f.total)}` : ''}
                  </div>
                </div>
                <div style={{ height: 5, borderRadius: 999, background: MACACO.cardElev, marginTop: 6, overflow: 'hidden' }}>
                  <div style={{ width: `${Math.round(f.pct)}%`, height: '100%', background: mas ? MACACO.success : MACACO.primary }} />
                </div>
                <div style={{ fontSize: 10.5, marginTop: 4, color: sinStock && f.unidades > 0 ? MACACO.danger : MACACO.textMuted }}>
                  {g.unidades > 0 ? `${Math.round(f.pct)}% de las ventas` : 'sin ventas aún'}
                  {f.stock !== null && ` · ${sinStock ? 'agotado' : `${f.stock} en stock`}`}
                  {sinStock && f.unidades > 0 && ' · se vende y no tienes'}
                </div>
              </div>
            );
          })}
        </Card>
      ))}
      <div style={{ fontSize: 10.5, color: MACACO.textMuted, lineHeight: 1.45, margin: '0 4px 14px' }}>
        Solo cuenta ventas registradas con sabor. Las anteriores a que agregaras sabores no se pueden repartir.
      </div>
    </>
  );
}

// ─── Clientes ─────────────────────────────────────────────────────────────────

function ClientesTab({ ventas }) {
  const clientes = getResumenClientes(ventas);
  const [selected, setSelected] = useState(null);

  const clienteConNombre = ventas.filter(v => v.cliente).length;
  const sinNombre        = ventas.length - clienteConNombre;

  if (clientes.length === 0) {
    return (
      <Card style={{ marginTop: 8 }}>
        <div style={{ textAlign: 'center', padding: '20px 0' }}>
          <div style={{ fontSize: 32, marginBottom: 12 }}>👤</div>
          <div style={{ fontSize: 14, fontWeight: 600, color: '#fff' }}>Sin clientes registrados</div>
          <div style={{ fontSize: 12, color: MACACO.textMuted, marginTop: 6, lineHeight: 1.5 }}>
            Ingresa el nombre del cliente al registrar una venta para ver su historial aquí.
            {sinNombre > 0 && ` (${sinNombre} venta${sinNombre > 1 ? 's' : ''} sin nombre)`}
          </div>
        </div>
      </Card>
    );
  }

  return (
    <>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 14 }}>
        <KpiTile label="Clientes únicos" value={String(clientes.length)} color={MACACO.cyan} />
        <KpiTile label="LTV promedio"    value={clpCompact(Math.round(clientes.reduce((s, c) => s + c.ltv, 0) / clientes.length))} />
      </div>

      <SectionTitle>Ranking por LTV</SectionTitle>
      <Card padding={0} style={{ marginBottom: 14 }}>
        {clientes.map((c, i) => (
          <div
            key={c.nombre}
            onClick={() => setSelected(selected === c.nombre ? null : c.nombre)}
            style={{
              padding: '14px',
              borderBottom: i === clientes.length - 1 ? 'none' : `1px solid ${MACACO.borderSoft}`,
              cursor: 'pointer',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{
                width: 32, height: 32, borderRadius: 999, flexShrink: 0,
                background: i === 0 ? 'rgba(245,197,24,0.2)' : 'rgba(255,255,255,0.06)',
                color: i === 0 ? MACACO.primary : MACACO.textDim,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 13, fontWeight: 800,
              }}>{i + 1}</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 14, fontWeight: 600 }}>{c.nombre}</div>
                <div style={{ fontSize: 11, color: MACACO.textMuted, marginTop: 2 }}>
                  {c.compras} compra{c.compras > 1 ? 's' : ''} · ticket prom. {clp(Math.round(c.ticketPromedio))}
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: 16, fontWeight: 800, color: i === 0 ? MACACO.primary : '#fff', fontVariantNumeric: 'tabular-nums' }}>
                  {clp(c.ltv)}
                </div>
                <div style={{ fontSize: 10, color: MACACO.success, fontWeight: 600, marginTop: 2 }}>
                  {c.margenPct.toFixed(0)}% margen
                </div>
              </div>
            </div>

            {selected === c.nombre && (
              <div style={{
                marginTop: 12, padding: '10px 12px', borderRadius: 10,
                background: 'rgba(255,255,255,0.04)', border: `1px solid ${MACACO.borderSoft}`,
              }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                  <MiniDato label="Top producto"  value={c.topProducto} />
                  <MiniDato label="Margen total"  value={clp(c.margen)} />
                  <MiniDato label="Última compra" value={new Date(c.ultima).toLocaleDateString('es-CL', { day: 'numeric', month: 'short' })} />
                  <MiniDato label="LTV total"     value={clp(c.ltv)} color={MACACO.primary} />
                </div>
              </div>
            )}
          </div>
        ))}
      </Card>

      {sinNombre > 0 && (
        <div style={{ fontSize: 11, color: MACACO.textMuted, textAlign: 'center', marginBottom: 12 }}>
          {sinNombre} venta{sinNombre > 1 ? 's' : ''} sin nombre de cliente no aparecen aquí
        </div>
      )}
    </>
  );
}

// ─── Componentes compartidos ──────────────────────────────────────────────────

function KpiTile({ label, value, color, hint }) {
  return (
    <div style={{ background: MACACO.card, border: `1px solid ${MACACO.border}`, borderRadius: 12, padding: 14 }}>
      <div style={{ fontSize: 10.5, color: MACACO.textDim, fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase' }}>{label}</div>
      <div style={{ fontSize: 20, fontWeight: 800, color: color || '#fff', marginTop: 6, fontVariantNumeric: 'tabular-nums' }}>{value}</div>
      {hint && <div style={{ fontSize: 9.5, color: MACACO.textMuted, marginTop: 4, lineHeight: 1.4 }}>{hint}</div>}
    </div>
  );
}

function TopProductosList({ items, titulo = 'Top productos' }) {
  return (
    <>
      <SectionTitle>{titulo}</SectionTitle>
      <Card padding={0} style={{ marginBottom: 12 }}>
        {items.map((p, i, arr) => (
          <div key={i} style={{
            display: 'flex', alignItems: 'center', padding: '12px 14px',
            borderBottom: i === arr.length - 1 ? 'none' : `1px solid ${MACACO.borderSoft}`,
          }}>
            <div style={{
              width: 22, height: 22, borderRadius: 999,
              background: i === 0 ? 'rgba(245,197,24,0.2)' : 'rgba(255,255,255,0.06)',
              color: i === 0 ? MACACO.primary : MACACO.textDim,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 11, fontWeight: 800, marginRight: 12,
            }}>{i + 1}</div>
            <div style={{ flex: 1, fontSize: 13, fontWeight: 500 }}>{p.n}</div>
            <div style={{ fontSize: 12, color: MACACO.textMuted, marginRight: 12 }}>×{p.q}</div>
            <div style={{ fontSize: 13, fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>{clp(p.v)}</div>
          </div>
        ))}
      </Card>
    </>
  );
}

function MiniDato({ label, value, color }) {
  return (
    <div>
      <div style={{ fontSize: 9.5, color: MACACO.textMuted, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase' }}>{label}</div>
      <div style={{ fontSize: 12, fontWeight: 700, color: color || '#fff', marginTop: 2, fontVariantNumeric: 'tabular-nums' }}>{value}</div>
    </div>
  );
}

function EmptyState({ texto }) {
  return (
    <Card>
      <div style={{ textAlign: 'center', padding: '12px 0', color: MACACO.textMuted, fontSize: 13 }}>{texto}</div>
    </Card>
  );
}
