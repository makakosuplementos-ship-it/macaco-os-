// Lo que el cerebro tiene pendiente para esta área. Va arriba de cada
// pantalla (Finanzas, Stock, Reportes) y abre la Corteza filtrada en el área.
import { useMemo } from 'react';
import { MACACO } from '../theme.js';
import { Icon } from './ui.jsx';
import { useApp } from '../store.jsx';
import { escanearCorteza } from '../corteza.js';

const COLOR = { alta: MACACO.danger, media: MACACO.orange, baja: MACACO.cyan };

export function CerebroArea({ areas, go }) {
  const { productos, ventas, gastos, deudas, caja, config, corteza, movimientos, estrategia } = useApp();
  const pendientes = useMemo(() => escanearCorteza({ productos, ventas, gastos, deudas, caja, config, movimientos, estrategia })
    .decisiones.filter(d => areas.includes(d.area) && !corteza[d.id]),
  [productos, ventas, gastos, deudas, caja, config, movimientos, estrategia, corteza, areas]);

  if (!pendientes.length) return null;
  const top = pendientes[0];
  return (
    <button onClick={() => go('corteza', areas[0])} className="anim" style={{
      width: '100%', textAlign: 'left', cursor: 'pointer', fontFamily: 'inherit', color: MACACO.text,
      display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', marginBottom: 14,
      background: MACACO.card, border: `1px solid ${COLOR[top.prioridad]}55`, borderRadius: 14,
      animation: 'aparecer 350ms both',
    }}>
      <span style={{ fontSize: 18 }}>🧠</span>
      <span style={{ flex: 1, minWidth: 0 }}>
        <span style={{ display: 'block', fontSize: 9.5, fontWeight: 800, letterSpacing: '0.14em', color: COLOR[top.prioridad] }}>
          CEREBRO · {pendientes.length} {pendientes.length > 1 ? 'DECISIONES' : 'DECISIÓN'} EN ESTA ÁREA
        </span>
        <span style={{ display: 'block', fontSize: 13, fontWeight: 700, marginTop: 3, lineHeight: 1.35 }}>{top.senal}</span>
      </span>
      <span style={{ color: MACACO.textMuted }}><Icon.arrowRight size={15} /></span>
    </button>
  );
}
