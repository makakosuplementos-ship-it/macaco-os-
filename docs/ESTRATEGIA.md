# Estrategia 2027–2031 en Macako 2

Integración del Plan Estratégico. **Este repositorio es público: aquí no hay montos en pesos.** El presupuesto y las decisiones de los socios viven en Supabase (`app_data`, clave `macaco:estrategia`).

## Piezas
- `src/domain/estrategia/plan.js` — identidad, 8 objetivos (OE-01…08), 10 iniciativas, 19 KPI (8 automáticos, 6 manuales, 5 no medibles hoy). Códigos estables.
- `fechas.js`, `canales.js`, `calidad.js` — mes en America/Santiago, canal por transacción (un pack = 1), calidad de datos y cobertura ventas vs stock.
- `kpi.js` — calculadoras puras. Sin dato → `null` + `no_medible` (nunca 0).
- `estado.js` — semáforo. Meta provisional → "Meta sin aprobar"; dato parcial → "Dato por validar"; solo meta aprobada + dato confiable compara.
- `aprobaciones.js` — una meta se aprueba con las firmas de Felipe **y** Papá. La cuenta es compartida: la firma es declarada y fechada. Cambiar el valor borra las firmas.
- `presupuesto.js` — partidas sin monto = pendientes (no $0); anualizado ilustrativo; equilibrio parcial.
- `src/cerebro/areas/estrategia.js` — Corteza: señales de KPI bajo meta aprobada, meses que no cuadran con stock, equilibrio parcial, metas por aprobar. No ejecuta nada.
- `src/screens/EstrategiaScreen.jsx` — Indicadores · Metas · Presupuesto · Plan (desde Portada → "Estrategia 2027–2031").

## Datos (`macaco:estrategia`, claves planas)
`meta:<KPI>`, `pre:<partida>`, `man:<KPI>`, `cal:<KPI>`, `ini:<IE>`. Una entrada por clave para que la fusión entre dispositivos no pise al otro socio.

## Pruebas
`npm test` (node:test). Respaldo: la clave es nueva; no se modificó ninguna tabla ni clave existente. Revertir = borrar la fila `macaco:estrategia`.
