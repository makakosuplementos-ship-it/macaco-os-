import { useState, useEffect } from 'react';
import { MACACO } from './theme.js';
import { IOSDevice } from './components/IOSDevice.jsx';
import { BottomNav } from './components/BottomNav.jsx';
import { Icon } from './components/ui.jsx';
import HomeScreen from './screens/HomeScreen.jsx';
import VentaScreen from './screens/VentaScreen.jsx';
import FinanzasScreen from './screens/FinanzasScreen.jsx';
import InventarioScreen from './screens/InventarioScreen.jsx';
import ReportesScreen from './screens/ReportesScreen.jsx';
import ConfigScreen from './screens/ConfigScreen.jsx';
import GastoScreen from './screens/GastoScreen.jsx';
import CortezaScreen from './screens/CortezaScreen.jsx';
import EquipoScreen from './screens/EquipoScreen.jsx';
import PortadaScreen from './screens/PortadaScreen.jsx';
import AreaScreen from './screens/AreaScreen.jsx';
import { DB_HABILITADO } from './services/supabase.js';
import { useApp } from './store.jsx';
import { DEMO } from './demo.js';

function LoadingDB() {
  const [seg, setSeg] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setSeg(s => s + 1), 1000);
    return () => clearInterval(t);
  }, []);

  const msg = seg < 3  ? 'Conectando a Supabase...'
            : seg < 7  ? 'Cargando tus datos...'
            : seg < 11 ? 'Tardando más de lo normal...'
            : 'Verificando conexión...';

  return (
    <div style={{
      position: 'absolute', inset: 0, zIndex: 200,
      background: MACACO.bg,
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center', gap: 16,
    }}>
      <div style={{ fontSize: 36 }}>🦁</div>
      <div style={{
        width: 36, height: 36, borderRadius: 999,
        border: `3px solid ${MACACO.border}`,
        borderTopColor: MACACO.primary,
        animation: 'spin 700ms linear infinite',
      }} />
      <div style={{ fontSize: 13, color: MACACO.textDim, fontWeight: 600 }}>{msg}</div>
      {seg >= 11 && (
        <button
          onClick={() => window.location.reload()}
          style={{
            padding: '10px 20px', borderRadius: 10,
            background: MACACO.primary, color: '#0A0A0F',
            border: 'none', fontSize: 12, fontWeight: 800,
            cursor: 'pointer', fontFamily: 'inherit',
          }}
        >
          REINTENTAR
        </button>
      )}
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

// Estado del guardado: amarillo = cambios en el celular por enviar (se
// reintenta solo; tocar = enviar ahora); rojo = no se pudo cargar de Supabase.
function DBStatusBadge({ error, sync, onReintentar }) {
  if (!DB_HABILITADO) return null;

  if (error && sync.pendientes === 0) {
    return (
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0, zIndex: 50,
        background: 'rgba(255,77,77,0.95)', backdropFilter: 'blur(8px)',
        padding: '10px 16px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10,
      }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 11, fontWeight: 800, color: '#fff', letterSpacing: '0.08em' }}>
            SIN CONEXIÓN CON SUPABASE
          </div>
          <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.85)', marginTop: 2 }}>
            Mostrando lo guardado en este celular. Lo que registres se envía al volver la señal.
          </div>
        </div>
        <button
          onClick={() => window.location.reload()}
          style={{
            padding: '6px 12px', borderRadius: 8,
            background: '#fff', color: MACACO.danger,
            border: 'none', fontSize: 11, fontWeight: 800,
            cursor: 'pointer', fontFamily: 'inherit', flexShrink: 0,
          }}
        >
          REINTENTAR
        </button>
      </div>
    );
  }

  // Todo guardado: no estorba. El estado completo está en Sistema y en el Home.
  if (sync.pendientes === 0) return null;
  const color = MACACO.primary;
  return (
    <button
      onClick={onReintentar}
      style={{
        position: 'absolute', top: 12, right: 14, zIndex: 50,
        display: 'flex', alignItems: 'center', gap: 5,
        padding: '3px 9px', borderRadius: 999,
        background: color + '1a',
        border: `1px solid ${color}40`,
        fontSize: 9.5, fontWeight: 700, letterSpacing: '0.06em',
        color, fontFamily: 'inherit',
        cursor: 'pointer',
      }}
    >
      <span style={{
        width: 5, height: 5, borderRadius: 999,
        background: color, boxShadow: `0 0 6px ${color}`,
        display: 'inline-block',
      }} />
      {sync.enviando ? 'ENVIANDO…' : `${sync.pendientes} POR ENVIAR`}
    </button>
  );
}

const APP_VERSION = '1793728335';

function AppInner() {
  const [screen, setScreen]           = useState('cerebro');
  const [updateListo, setUpdateListo] = useState(false);
  const { cargandoDB, errorDB, sync, reintentarSync } = useApp();
  const [areaCorteza, setAreaCorteza] = useState(null);
  // go('corteza', 'stock') abre la Corteza filtrada en esa área del cerebro.
  const go = (s, area = null) => { setScreen(s); setAreaCorteza(area); };

  // Verificación de versión — fuerza recarga si hay versión nueva en el servidor.
  // Funciona aunque el service worker sirva código viejo.
  useEffect(() => {
    if (DEMO) return; // la demo no tiene version.json
    const checkVersion = async () => {
      try {
        const res = await fetch(`/version.json?t=${Date.now()}`, { cache: 'no-store' });
        const { v } = await res.json();
        if (v && v !== APP_VERSION) {
          console.log('[version] nueva versión detectada, recargando...');
          window.location.reload(true);
        }
      } catch { /* sin internet — no pasa nada */ }
    };
    checkVersion();
  }, []);

  // Cuando el service worker nuevo toma control → recargar automáticamente
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;

    const onControllerChange = () => window.location.reload();
    navigator.serviceWorker.addEventListener('controllerchange', onControllerChange);

    // Si ya hay un SW esperando (versión nueva disponible) → activarlo ahora
    navigator.serviceWorker.ready.then(reg => {
      if (reg.waiting) {
        setUpdateListo(true);
        reg.waiting.postMessage({ type: 'SKIP_WAITING' });
      }
      reg.addEventListener('updatefound', () => {
        const sw = reg.installing;
        sw?.addEventListener('statechange', () => {
          if (sw.state === 'installed' && navigator.serviceWorker.controller) {
            setUpdateListo(true);
            sw.postMessage({ type: 'SKIP_WAITING' });
          }
        });
      });
    });

    return () => navigator.serviceWorker.removeEventListener('controllerchange', onControllerChange);
  }, []);

  const screens = {
    home:       <HomeScreen go={go} />,
    venta:      <VentaScreen go={go} />,
    gasto:      <GastoScreen go={go} />,
    finanzas:   <FinanzasScreen go={go} />,
    corteza:    <CortezaScreen go={go} areaInicial={areaCorteza} />,
    equipo:     <EquipoScreen go={go} />,
    cerebro:    <PortadaScreen go={go} />,
    area:       <AreaScreen go={go} areaId={areaCorteza} />,
    inventario: <InventarioScreen go={go} />,
    reportes:   <ReportesScreen go={go} />,
    config:     <ConfigScreen go={go} />,
  };

  const isMobile = typeof window !== 'undefined' && window.matchMedia('(max-width: 480px)').matches;

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', justifyContent: 'center',
      alignItems: 'flex-start', padding: isMobile ? 0 : '40px 16px 80px',
    }}>
      <IOSDevice width={390} height={844} dark>
        <div id="capa-hojas" style={{ position: 'absolute', inset: 0, background: MACACO.bg, overflow: 'hidden' }}>

          {/* Banner de actualización disponible */}
          {updateListo && (
            <div style={{
              position: 'absolute', top: 0, left: 0, right: 0, zIndex: 300,
              background: MACACO.primary, color: '#0A0A0F',
              padding: '10px 16px', textAlign: 'center',
              fontSize: 12, fontWeight: 700, letterSpacing: '0.04em',
            }}>
              Actualizando app...
            </div>
          )}

          {/* Spinner mientras carga Supabase */}
          {cargandoDB && <LoadingDB />}

          {/* Badge de estado de conexión */}
          {!cargandoDB && ((screen !== 'home' && screen !== 'cerebro') || errorDB) && <DBStatusBadge error={errorDB} sync={sync} onReintentar={reintentarSync} />}

          <div
            key={screen}
            style={{
              position: 'absolute',
              top: isMobile ? 0 : 54, left: 0, right: 0, bottom: 0,
              overflowY: 'auto',
              animation: 'screenIn 320ms cubic-bezier(.2,.7,.2,1)',
            }}
          >
            {screens[screen]}
          </div>

          {(screen === 'home' || screen === 'cerebro') && !cargandoDB && (
            <div style={{
              position: 'absolute', right: 18, bottom: 102, zIndex: 30,
              display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 10,
              animation: 'fabIn 400ms cubic-bezier(.2,.7,.2,1) both',
            }}>
              <button
                onClick={() => go('gasto')}
                style={{
                  display: 'flex', alignItems: 'center', gap: 8,
                  padding: '11px 16px', borderRadius: 999,
                  background: MACACO.cardElev, color: MACACO.orange,
                  border: `1px solid rgba(255,159,64,0.35)`, cursor: 'pointer',
                  fontFamily: 'inherit', fontSize: 12, fontWeight: 700,
                  letterSpacing: '0.04em',
                  boxShadow: `0 4px 16px rgba(0,0,0,0.4), 0 0 20px rgba(255,159,64,0.15)`,
                }}
              >
                <span style={{
                  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                  width: 20, height: 20, borderRadius: 999,
                  background: 'rgba(255,159,64,0.18)', color: MACACO.orange,
                }}>
                  <Icon.minus size={12} />
                </span>
                REGISTRAR GASTO
              </button>
              <button
                onClick={() => go('venta')}
                style={{
                  display: 'flex', alignItems: 'center', gap: 8,
                  padding: '14px 18px', borderRadius: 999,
                  background: MACACO.primary, color: '#0A0A0F',
                  border: 'none', cursor: 'pointer',
                  fontFamily: 'inherit', fontSize: 13, fontWeight: 800,
                  letterSpacing: '0.04em',
                  boxShadow: `0 8px 24px rgba(245,197,24,0.4), 0 0 30px rgba(245,197,24,0.3)`,
                }}
              >
                <span style={{
                  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                  width: 22, height: 22, borderRadius: 999, background: '#0A0A0F',
                  color: MACACO.primary,
                }}>
                  <Icon.plus size={14} />
                </span>
                REGISTRAR VENTA
              </button>
            </div>
          )}

          <BottomNav active={['home', 'corteza', 'equipo', 'area', 'gasto'].includes(screen) ? 'cerebro' : screen} go={go} />
        </div>
      </IOSDevice>
    </div>
  );
}

// AppInner está dentro de AppProvider (en main.jsx) y puede usar useApp
export default AppInner;
