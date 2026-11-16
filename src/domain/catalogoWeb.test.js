import { test } from 'node:test';
import assert from 'node:assert/strict';
import { idCatalogo, catalogoPublico, precioPublico, fichasCatalogo, ENLACES } from './catalogoWeb.js';

test('enlaza por nombre aunque tenga tildes y mayúsculas', () => {
  assert.equal(idCatalogo({ name: 'Cafeína ostrovit' }), 'cafeina');
  assert.equal(idCatalogo({ name: 'Proteína grizzly' }), 'grizzly-whey');
  assert.equal(idCatalogo({ name: 'Glutamina' }), null);
  assert.equal(idCatalogo({ name: 'Omega 3 grizzly bear' }), 'omega3');
  assert.equal(idCatalogo({ name: 'Omega 3' }), null);
});

test('el enlace puesto a mano gana', () => {
  assert.equal(idCatalogo({ name: 'Omega 3', catalogoId: 'omega3' }), 'omega3');
});

test('agotado con stock 0 o menos; foto solo si es pública; precio de venta; sin costos', () => {
  const pub = catalogoPublico([
    { name: 'Glicinato de Magnesio', stock: 0, cost: 7500, price: 14000, imagen: 'data:image/jpeg;base64,xx' },
    { name: 'Creatina inner', stock: 36, cost: 8990, price: 18000, imagen: 'https://x.supabase.co/storage/v1/object/public/product-images/a.jpg' },
    { id: 'glutamina', name: 'Glutamina', stock: 0, cost: 7000 },
    { id: 'crema de arroz', name: ' Crema de arroz ', price: 12900 },
    { name: 'Sin identificador', stock: 12 },
  ]);
  assert.deepEqual(pub, {
    magnesio: { agotado: true, imagen: null, precio: 14000 },
    'creatina-inner': { agotado: false, imagen: 'https://x.supabase.co/storage/v1/object/public/product-images/a.jpg', precio: 18000 },
    'os:glutamina': { agotado: true, imagen: null, precio: null, nombre: 'Glutamina' },
    'os:crema%20de%20arroz': { agotado: null, imagen: null, precio: 12900, nombre: 'Crema de arroz' },
  });
  assert.ok(!/cost|7500|8990|7000|36/.test(JSON.stringify(pub)));
  assert.equal(catalogoPublico([{ id: 'glutamina', name: 'Glutamina 300 g' }])['os:glutamina'].nombre, 'Glutamina 300 g');
});

test('precio raro o vacío no se publica', () => {
  assert.equal(precioPublico(23000), 23000);
  assert.equal(precioPublico('23000'), 23000);
  assert.equal(precioPublico(0), null);
  assert.equal(precioPublico(-5), null);
  assert.equal(precioPublico(1999.5), null);
  assert.equal(precioPublico(undefined), null);
});

test('fichas del catálogo: foto con ruta de /catalogo/ y sabores de las variantes', () => {
  const f = fichasCatalogo({ products: [
    { id: 'musclewhey', name: 'MuscleWhey', brand: 'Hexacore', size: '64 porciones', image: 'assets/musclewhey.webp',
      variants: [{ flavor: 'Hell Chocolate' }, { flavor: 'Cookies Extreme' }] },
    { id: 'gummy', name: 'Gummy', flavor: 'Frutilla', image: 'https://x.test/g.jpg' },
  ] });
  assert.equal(f.musclewhey.foto, '/catalogo/assets/musclewhey.webp');
  assert.deepEqual(f.musclewhey.sabores, ['Hell Chocolate', 'Cookies Extreme']);
  assert.equal(f.gummy.foto, 'https://x.test/g.jpg');
  assert.deepEqual(f.gummy.sabores, ['Frutilla']);
});

test('cada enlace de Macaco OS tiene su ficha y foto en el catálogo publicado', async () => {
  const { readFile } = await import('node:fs/promises');
  const cat = JSON.parse(await readFile(new URL('../../public/catalogo/catalogo.json', import.meta.url), 'utf8'));
  const fichas = fichasCatalogo(cat);
  for (const id of Object.values(ENLACES)) {
    assert.ok(fichas[id]?.foto, `falta foto para ${id}`);
    const archivo = fichas[id].foto.replace('/catalogo/', '../../public/catalogo/');
    await readFile(new URL(archivo, import.meta.url));
  }
});
