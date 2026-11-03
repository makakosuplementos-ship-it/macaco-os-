import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

// Una hoja (ficha, formulario) definida pero nunca dibujada deja el botón que la
// abre sin efecto: así se perdió "Mover stock" en un rediseño.
test('cada hoja definida en Stock se dibuja en algún lado', async () => {
  const src = await readFile(new URL('./InventarioScreen.jsx', import.meta.url), 'utf8');
  const hojas = [...src.matchAll(/^function (\w+Sheet)\b/gm)].map(m => m[1]);
  assert.ok(hojas.includes('StockMoveSheet'), 'no encontré StockMoveSheet');
  for (const h of hojas) assert.match(src, new RegExp(`<${h}[\\s/>]`), `${h} está definida pero nunca se muestra`);
});
