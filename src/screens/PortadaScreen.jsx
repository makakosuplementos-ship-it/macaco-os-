// Portada: el cerebro. Un mapa de puntos de luz, un punto por área; debajo, la
// caja y cómo va el día. Arriba, UN solo paso para hoy.
import { useMemo } from 'react';
import { MACACO } from '../theme.js';
import { useApp } from '../store.jsx';
import { escanearCorteza } from '../corteza.js';
import { areasPortada, ahoraPaso } from '../domain/portada.js';
import { CerebroMapa } from '../components/CerebroMapa.jsx';
import { Icon } from '../components/ui.jsx';
import { ResumenInicio } from '../components/ResumenInicio.jsx';
import { resumenInicio } from '../domain/inicio.js';

const fino = { fontWeight: 300 };
const etiqueta = { fontSize: 11, fontWeight: 600, letterSpacing: '0.14em', textTransform: 'uppercase' };

export default function PortadaScreen({ go }) {
  const { productos, ventas, gastos, deudas, caja, config, corteza, sync, pedidos, movimientos, estrategia } = useApp();
  const resumen = useMemo(() => resumenInicio({ ventas, config, pedidos }), [ventas, config, pedidos]);

  const areas = useMemo(() => areasPortada({ productos, ventas, gastos, deudas, caja, config }),
    [productos, ventas, gastos, deudas, caja, config]);
  const ahora = useMemo(() => ahoraPaso(
    escanearCorteza({ productos, ventas, gastos, deudas, caja, config, movimientos, estrategia }).decisiones, corteza),
  [productos, ventas, gastos, deudas, caja, config, movimientos, estrategia, corteza]);

  const abrir = (n) => go(n.destino, n.id);
  const fecha = new Date().toLocaleDateString('es-CL', { weekday: 'long', day: 'numeric', month: 'long' });

  return (
    <div style={{ minHeight: '100%', background: '#000', color: MACACO.text, padding: '10px 20px 220px', boxSizing: 'border-box' }}>
      {/* Barra superior: sin bordes, sobre el negro */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '4px 0 22px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Icon.monkey size={22} />
          <span style={{ ...etiqueta, letterSpacing: '0.2em', fontSize: 12.5 }}>Makako</span>
        </div>
        <span style={{ fontSize: 12, ...fino, color: MACACO.textDim, textAlign: 'right' }}>
          <span style={{ textTransform: 'capitalize', display: 'block' }}>{fecha}</span>
          {sync.pendientes > 0 && <span style={{ color: MACACO.ambar, fontWeight: 400 }}>{sync.pendientes} por enviar</span>}
        </span>
      </div>

      {/* Ahora */}
      <div style={{ marginBottom: 6 }}>
        <div style={{ ...etiqueta, color: MACACO.ambar }}>Ahora</div>
        <div style={{ fontSize: 27, fontWeight: 400, letterSpacing: '-0.04em', lineHeight: 1.1, marginTop: 10, textWrap: 'balance' }}>{ahora.titulo}</div>
        <div style={{ fontSize: 14.5, ...fino, color: '#bdbdbd', lineHeight: 1.5, marginTop: 10, maxWidth: 420 }}>{ahora.porque}</div>
        {ahora.destino && (
          <button onClick={() => go(ahora.destino, ahora.area)} style={{
            marginTop: 16, background: MACACO.lavanda, color: '#0A0A0F', border: 'none', borderRadius: 24, cursor: 'pointer',
            padding: '13px 22px', fontFamily: 'inherit', fontSize: 13, fontWeight: 600, letterSpacing: '0.025em', textTransform: 'uppercase',
          }}>Hacerlo</button>
        )}
      </div>

      {/* Mapa */}
      <div style={{ margin: '14px -20px 0' }}>
        <CerebroMapa nodos={areas} onElegir={abrir} alto={410} />
      </div>
      <div style={{ fontSize: 11, ...fino, color: MACACO.textMuted, textAlign: 'center', marginTop: 2 }}>
        Más brillo = mejor va esa área · punto tenue = aún sin medir
      </div>

      {/* Lo demás, debajo del cerebro: caja, hoy contra ayer y la meta del mes */}
      <div style={{ marginTop: 34 }}>
        <ResumenInicio r={resumen} caja={caja} colchon={config.colchonMinimo} go={go} cerebro={false} />
      </div>

      {/* Enlaces discretos */}
      <div style={{ display: 'flex', gap: 22, marginTop: 22, flexWrap: 'wrap' }}>
        {[['Tu equipo · 12 asesores', 'equipo'], ['Más datos del día', 'home'], ['Decisiones del cerebro', 'corteza'], ['Estrategia 2027–2031', 'estrategia']].map(([t, d]) => (
          <button key={d} onClick={() => go(d)} style={{
            background: 'transparent', border: 'none', cursor: 'pointer', fontFamily: 'inherit', padding: 0,
            fontSize: 13, fontWeight: 400, color: MACACO.textDim, textDecoration: 'underline', textUnderlineOffset: 4,
          }}>{t}</button>
        ))}
      </div>
    </div>
  );
}
