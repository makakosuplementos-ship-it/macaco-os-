// Enlace con el catálogo web (makako-fit-catalogo.vercel.app).
// El catálogo tiene sus propios ids (catalogo.json); acá se dice qué producto
// de Macaco OS es cuál. Un producto sin enlace no cambia nada en el catálogo
// (fuente o silencio): el catálogo sigue mostrando lo que ya tenía.
import { slug } from './texto.js';

// nombre en Macaco OS (como slug) → id en catalogo.json
export const ENLACES = {
  'muscle-whey-isolate': 'musclewhey',
  'creatina-gumyy': 'gummy',
  'pshichotic-red': 'psychotic',
  'creatina-inner': 'creatina-inner',
  'glicinato-de-magnesio': 'magnesio',
  'arginina': 'arginina',
  'cafeina-ostrovit': 'cafeina',
  'omega-3-grizzly-bear': 'omega3',   // el del catálogo es Grizzly Bear; el otro Omega 3 no está en el catálogo
  'proteina-mutant': 'mutant',
  'proteina-grizzly': 'grizzly-whey',
  'venom-inferno': 'venom',
  'preentreno-nitraflex': 'nitraflex',
  'pre-beast': 'beast',
};

// El id del catálogo para un producto: el que se le puso a mano, o el del enlace.
export const idCatalogo = (p) => p.catalogoId || ENLACES[slug(p.name || '')] || null;

// Publica un resumen explícito. Las fichas sin enlace usan el ID del inventario,
// que se mantiene al cambiar el nombre, el precio o la foto.
export function catalogoPublico(productos) {
  return Object.fromEntries((productos || []).flatMap(p => {
    const enlace = idCatalogo(p);
    const nombre = typeof p.name === 'string' ? p.name.trim() : '';
    if (!enlace && (!nombre || p.id == null || p.id === '')) return [];
    const id = enlace || `os:${encodeURIComponent(p.id)}`;
    const stock = Number(p.stock);
    const stockConocido = (typeof p.stock === 'number' ||
      (typeof p.stock === 'string' && p.stock.trim() !== '')) && Number.isFinite(stock);
    const resumen = {
      agotado: stockConocido ? stock <= 0 : null,
      imagen: fotoPublica(p.imagen),
      precio: precioPublico(p.price)
    };
    return [[id, enlace ? resumen : { ...resumen, nombre }]];
  }));
}

// Solo URLs públicas: la foto en data: (demo) no sirve fuera del celular.
export const fotoPublica = (imagen) => (imagen && /^https:\/\//.test(imagen) ? imagen : null);

// Precio en pesos enteros y mayor a cero; si no, el catálogo deja el suyo.
export const precioPublico = (precio) => {
  const n = Number(precio);
  return Number.isInteger(n) && n > 0 ? n : null;
};

// Lo que el catálogo web dice de cada producto (foto, marca, presentación…),
// leído de /catalogo/catalogo.json. Solo para mostrar en la app: no se guarda.
export function fichasCatalogo(catalogo, base = '/catalogo/') {
  const salida = {};
  (catalogo?.products || []).forEach(c => {
    const variantes = (c.variants || []).map(v => v.flavor).filter(Boolean);
    salida[c.id] = {
      id: c.id,
      nombre: c.name,
      marca: c.brand || null,
      categoria: c.category || null,
      presentacion: c.size || null,
      sabores: variantes.length ? variantes : (c.flavor ? [c.flavor] : []),
      descripcion: c.description || null,
      beneficios: c.benefits || [],
      foto: c.image ? (/^https:\/\//.test(c.image) ? c.image : base + c.image.replace(/^\.?\//, '')) : null,
    };
  });
  return salida;
}
