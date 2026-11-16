import { useMemo, useState } from 'react';
import { MACACO, clp } from '../theme.js';
import { Card, SectionTitle } from '../components/ui.jsx';
import { Screen } from '../components/Screen.jsx';
import { useApp } from '../store.jsx';
import { IDENTIDAD, OBJETIVOS, INICIATIVAS, KPIS, SOCIOS, ESTADOS_INICIATIVA, VERSION_ESTRATEGIA } from '../domain/estrategia/plan.js';
import { calcularKpis, contextoDatos } from '../domain/estrategia/kpi.js';
import { metaEfectiva, estadoKpi, contarEstados } from '../domain/estrategia/estado.js';
import { firmar, quitarFirma, cambiarValor, metaPropuesta, faltanFirmas } from '../domain/estrategia/aprobaciones.js';
import { lineasPresupuesto, resumenPresupuesto, puntoEquilibrioParcial } from '../domain/estrategia/presupuesto.js';

const ESTADO = {
  en_meta:              { t: 'En meta',               c: MACACO.success },
  sobre_meta:           { t: 'Sobre la meta',         c: MACACO.cyan },
  bajo_meta:            { t: 'Bajo la meta',          c: MACACO.danger },
  pendiente_aprobacion: { t: 'Meta sin aprobar',      c: MACACO.orange },
  datos_incompletos:    { t: 'Dato por validar',      c: MACACO.orange },
  sin_datos:            { t: 'Sin datos',             c: MACACO.textMuted },
  no_aplica:            { t: 'No aplica',             c: MACACO.textMuted },
};
const fmt = (k, v) => v === null || v === undefined ? '—'
  : k.unidad === '$' ? clp(v) : k.unidad === '%' ? `${v}%` : `${v} ${k.unidad === 'días' ? 'días' : k.unidad}`;

const chip = (c) => ({ fontSize: 10, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: c, border: `1px solid ${c}55`, borderRadius: 999, padding: '2px 8px', whiteSpace: 'nowrap' });
const boton = (activo, c = MACACO.primary) => ({
  background: activo ? `${c}22` : 'transparent', border: `1px solid ${activo ? c : MACACO.border}`, color: activo ? c : MACACO.textDim,
  borderRadius: 8, padding: '7px 11px', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
});
const entrada = { background: MACACO.bg, border: `1px solid ${MACACO.border}`, color: MACACO.text, borderRadius: 8, padding: '8px 10px', fontSize: 14, width: 120, fontFamily: 'inherit' };
const num = (t) => { const n = Number(String(t).replace(/[^\d.-]/g, '')); return t === '' || Number.isNaN(n) ? null : n; };

export default function EstrategiaScreen() {
  const { ventas, productos, movimientos, estrategia, guardarEstrategia } = useApp();
  const [tab, setTab] = useState('hoy');

  const { items, datos } = useMemo(() => {
    const ahora = Date.now();
    const res = calcularKpis({ ventas, productos, movimientos, estrategia, ahora });
    return {
      datos: contextoDatos({ ventas, movimientos, ahora }),
      items: KPIS.map(k => {
        const r = res.find(x => x.code === k.code);
        const meta = metaEfectiva(k, estrategia);
        return { kpi: k, r, meta, estado: estadoKpi(k, r, meta) };
      }),
    };
  }, [ventas, productos, movimientos, estrategia]);

  const conteo = contarEstados(items);

  return (
    <Screen>
      <div style={{ padding: '6px 0 14px' }}>
        <div style={{ fontSize: 11, color: MACACO.primary, fontWeight: 700, letterSpacing: '0.16em', textTransform: 'uppercase' }}>Plan 2027–2031 · v{VERSION_ESTRATEGIA}</div>
        <div style={{ fontSize: 26, fontWeight: 800, letterSpacing: '-0.02em', marginTop: 4 }}>Estrategia</div>
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 14, flexWrap: 'wrap' }}>
        {[['hoy', 'Indicadores'], ['metas', 'Metas'], ['presupuesto', 'Presupuesto'], ['plan', 'Plan']].map(([id, t]) => (
          <button key={id} onClick={() => setTab(id)} style={boton(tab === id)}>{t}</button>
        ))}
      </div>

      {tab === 'hoy' && <Hoy items={items} datos={datos} conteo={conteo} />}
      {tab === 'metas' && <Metas items={items} estrategia={estrategia} guardar={guardarEstrategia} />}
      {tab === 'presupuesto' && <Presupuesto estrategia={estrategia} guardar={guardarEstrategia} items={items} />}
      {tab === 'plan' && <Plan estrategia={estrategia} guardar={guardarEstrategia} />}
    </Screen>
  );
}

function Hoy({ items, datos, conteo }) {
  return (
    <>
      <Card style={{ marginBottom: 14 }}>
        <div style={{ fontSize: 13, color: MACACO.textDim, lineHeight: 1.5 }}>
          Mes completo más reciente con datos cuadrados: <b style={{ color: MACACO.text }}>{datos.mesCompleto || 'ninguno todavía'}</b>.
          {' '}Un indicador sin dato aparece como “Sin datos”, nunca como cero ni como rojo.
        </div>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 10 }}>
          {Object.entries(conteo).map(([e, n]) => <span key={e} style={chip(ESTADO[e].c)}>{n} · {ESTADO[e].t}</span>)}
        </div>
      </Card>
      {OBJETIVOS.map(o => {
        const del = items.filter(i => i.kpi.oe === o.codigo);
        if (!del.length) return null;
        return (
          <div key={o.codigo}>
            <SectionTitle>{o.codigo} · {o.nombre}</SectionTitle>
            {del.map(({ kpi, r, meta, estado }) => (
              <Card key={kpi.code} style={{ marginBottom: 10 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, alignItems: 'flex-start' }}>
                  <div style={{ fontSize: 14, fontWeight: 700 }}>{kpi.code} · {kpi.nombre}</div>
                  <span style={chip(ESTADO[estado].c)}>{ESTADO[estado].t}</span>
                </div>
                <div style={{ fontSize: 24, fontWeight: 800, marginTop: 6 }}>{fmt(kpi, r.valor)}</div>
                <div style={{ fontSize: 12, color: MACACO.textDim, marginTop: 2 }}>
                  {r.periodo ? `Período: ${r.periodo} · ` : ''}Meta {meta.valor === null ? 'sin definir' : fmt(kpi, meta.valor)} ({meta.estado})
                </div>
                {r.nota && <div style={{ fontSize: 12, color: MACACO.textMuted, marginTop: 6, lineHeight: 1.45 }}>{r.nota}</div>}
              </Card>
            ))}
          </div>
        );
      })}
    </>
  );
}

function Metas({ items, estrategia, guardar }) {
  const [borrador, setBorrador] = useState({});
  const editables = items.filter(i => i.kpi.calculo !== 'no_medible' && i.kpi.direccion !== 'rango');
  const guardada = (kpi) => estrategia[`meta:${kpi.code}`];

  const base = (kpi, meta) => guardada(kpi) || metaPropuesta(meta.valor, meta.nota);
  const guardarValor = (kpi, meta) => {
    const v = num(borrador[kpi.code]);
    if (v === null) return;
    guardar({ [`meta:${kpi.code}`]: cambiarValor(base(kpi, meta), v) });
    setBorrador(b => { const n = { ...b }; delete n[kpi.code]; return n; });
  };

  return (
    <>
      <Card style={{ marginBottom: 14 }}>
        <div style={{ fontSize: 13, color: MACACO.textDim, lineHeight: 1.5 }}>
          Una meta cuenta como aprobada solo con la firma de <b style={{ color: MACACO.text }}>Felipe y Papá</b>. Como la app usa una sola cuenta, cada firma es
          declarada y queda con fecha. Cambiar el valor de una meta borra sus firmas.
        </div>
      </Card>
      {editables.map(({ kpi, r, meta, estado }) => {
        const m = base(kpi, meta);
        const falta = faltanFirmas(m);
        return (
          <Card key={kpi.code} style={{ marginBottom: 10 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
              <div style={{ fontSize: 14, fontWeight: 700 }}>{kpi.code} · {kpi.nombre}</div>
              <span style={chip(ESTADO[estado].c)}>{ESTADO[estado].t}</span>
            </div>
            <div style={{ fontSize: 12, color: MACACO.textDim, margin: '6px 0 10px' }}>Dato actual: {fmt(kpi, r.valor)} · calidad: {r.calidad.replace('_', ' ')}</div>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
              <input inputMode="decimal" placeholder={meta.valor === null ? 'Meta' : String(meta.valor)} value={borrador[kpi.code] ?? ''}
                onChange={e => setBorrador(b => ({ ...b, [kpi.code]: e.target.value }))} style={entrada} />
              <button style={boton(borrador[kpi.code] != null && borrador[kpi.code] !== '')} onClick={() => guardarValor(kpi, meta)}>Guardar valor</button>
            </div>
            <div style={{ display: 'flex', gap: 8, marginTop: 10, flexWrap: 'wrap' }}>
              {SOCIOS.map(s => {
                const firmada = !!m.firmas?.[s];
                return (
                  <button key={s} disabled={m.valor === null || m.valor === undefined} style={boton(firmada, MACACO.success)}
                    onClick={() => guardar({ [`meta:${kpi.code}`]: firmada ? quitarFirma(m, s) : firmar(m, s) })}>
                    {firmada ? `✓ ${s} firmó` : `Firmar como ${s}`}
                  </button>
                );
              })}
            </div>
            {falta.length > 0 && m.valor != null && <div style={{ fontSize: 11, color: MACACO.textMuted, marginTop: 6 }}>Falta: {falta.join(' y ')}</div>}
            {r.valor !== null && ['parcial', 'pendiente_validacion'].includes(r.calidad) && (
              <button style={{ ...boton(false), marginTop: 10 }}
                onClick={() => guardar({ [`cal:${kpi.code}`]: { calidad: 'confiable', fecha: new Date().toISOString(), nota: 'Dato validado por un socio.' } })}>
                Validar este dato como confiable
              </button>
            )}
            {estrategia[`cal:${kpi.code}`] && (
              <button style={{ ...boton(false), marginTop: 10, marginLeft: 8 }} onClick={() => guardar({ [`cal:${kpi.code}`]: null })}>Quitar validación</button>
            )}
          </Card>
        );
      })}
    </>
  );
}

function Presupuesto({ estrategia, guardar, items }) {
  const lineas = useMemo(() => lineasPresupuesto(estrategia), [estrategia]);
  const res = resumenPresupuesto(lineas);
  const margen = items.find(i => i.kpi.code === 'FIN-02')?.r.valor;
  const pe = puntoEquilibrioParcial(res.subtotalMensual, margen);
  const [borrador, setBorrador] = useState({});

  const guardarLinea = (l, cambios) => guardar({ [`pre:${l.id}`]: {
    categoria: l.categoria, tipo: l.tipo, centro: l.centro, anualizable: l.anualizable,
    mensual: l.mensual, estado: l.estado, nota: l.nota || '', ...cambios,
  } });

  return (
    <>
      <Card style={{ marginBottom: 14 }}>
        <div style={{ fontSize: 22, fontWeight: 800 }}>{clp(res.subtotalMensual)}<span style={{ fontSize: 12, color: MACACO.textDim, fontWeight: 500 }}> / mes confirmado</span></div>
        <div style={{ fontSize: 12, color: MACACO.textDim, marginTop: 6, lineHeight: 1.5 }}>
          {res.conocidas} partida{res.conocidas === 1 ? '' : 's'} confirmada{res.conocidas === 1 ? '' : 's'} · {res.pendientes} sin monto (no cuentan como $0).
          {' '}Anualizado ilustrativo: {clp(res.anualizadoIlustrativo)} (mensual × 12, sin partidas temporales).
        </div>
        {pe && <div style={{ fontSize: 12, color: MACACO.orange, marginTop: 8, lineHeight: 1.5 }}>
          Punto de equilibrio parcial: {clp(pe.ventasMensuales)}/mes. {pe.advertencia}
        </div>}
      </Card>
      {lineas.map(l => (
        <Card key={l.id} style={{ marginBottom: 10 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
            <div style={{ fontSize: 14, fontWeight: 700 }}>{l.categoria}</div>
            <span style={chip(l.estado === 'confirmado' ? MACACO.success : MACACO.textMuted)}>{l.estado}</span>
          </div>
          <div style={{ fontSize: 12, color: MACACO.textDim, margin: '4px 0 8px' }}>
            {l.tipo} · {l.centro} · actual: {l.mensual === null ? 'sin monto' : clp(l.mensual)}
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
            <input inputMode="numeric" placeholder="Monto mensual" value={borrador[l.id] ?? ''} onChange={e => setBorrador(b => ({ ...b, [l.id]: e.target.value }))} style={entrada} />
            <button style={boton(false)} onClick={() => {
              const v = num(borrador[l.id]); if (v === null) return;
              guardarLinea(l, { mensual: v, estado: 'propuesto' });
              setBorrador(b => { const n = { ...b }; delete n[l.id]; return n; });
            }}>Guardar</button>
            {l.mensual !== null && (
              <button style={boton(l.estado === 'confirmado', MACACO.success)}
                onClick={() => guardarLinea(l, { estado: l.estado === 'confirmado' ? 'propuesto' : 'confirmado' })}>
                {l.estado === 'confirmado' ? '✓ Confirmado' : 'Confirmar'}
              </button>
            )}
          </div>
        </Card>
      ))}
    </>
  );
}

function Plan({ estrategia, guardar }) {
  return (
    <>
      <SectionTitle>Visión 2031</SectionTitle>
      <Card style={{ marginBottom: 14 }}><div style={{ fontSize: 13, lineHeight: 1.55, color: MACACO.textDim }}>{IDENTIDAD.vision2031}</div></Card>
      <SectionTitle>Misión y propósito</SectionTitle>
      <Card style={{ marginBottom: 14 }}>
        <div style={{ fontSize: 13, lineHeight: 1.55, color: MACACO.textDim }}>{IDENTIDAD.mision}</div>
        <div style={{ fontSize: 13, lineHeight: 1.55, color: MACACO.text, marginTop: 10 }}>{IDENTIDAD.proposito}</div>
        <div style={{ fontSize: 11, color: MACACO.textMuted, marginTop: 10 }}>Valores propuestos (aún no aprobados): {IDENTIDAD.valores.lista.join(', ')}.</div>
      </Card>
      <SectionTitle>Objetivos estratégicos</SectionTitle>
      {OBJETIVOS.map(o => (
        <Card key={o.codigo} style={{ marginBottom: 10 }}>
          <div style={{ fontSize: 14, fontWeight: 700 }}>{o.codigo} · {o.nombre}</div>
          <div style={{ fontSize: 12, color: MACACO.textDim, marginTop: 4, lineHeight: 1.5 }}>{o.texto}</div>
        </Card>
      ))}
      <SectionTitle>Iniciativas</SectionTitle>
      {INICIATIVAS.map(i => {
        const est = estrategia[`ini:${i.codigo}`]?.estado || 'planificada';
        return (
          <Card key={i.codigo} style={{ marginBottom: 10 }}>
            <div style={{ fontSize: 14, fontWeight: 700 }}>{i.codigo} · {i.nombre}</div>
            <div style={{ fontSize: 12, color: MACACO.textDim, margin: '4px 0 8px' }}>
              {i.oe.join(', ')} · {i.horizonte} · responsable propuesto: {i.responsablePropuesto}
            </div>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {ESTADOS_INICIATIVA.map(e => (
                <button key={e} style={boton(est === e)} onClick={() => guardar({ [`ini:${i.codigo}`]: { estado: e, fecha: new Date().toISOString() } })}>{e.replace('_', ' ')}</button>
              ))}
            </div>
          </Card>
        );
      })}
    </>
  );
}
