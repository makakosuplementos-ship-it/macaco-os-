'use strict';
const $ = selector => document.querySelector(selector);
const money = value => new Intl.NumberFormat('es-CL', {style:'currency',currency:'CLP',maximumFractionDigits:0}).format(value);
const escapeHTML = value => String(value).replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
const normalize = value => value.toLocaleLowerCase('es').normalize('NFD').replace(/[\u0300-\u036f]/g,'');
const hasPrice = item => Number.isInteger(item.price) && item.price > 0;
const priceText = (item, quantity = 1) => hasPrice(item) ? money(item.price * quantity) : 'Consultar precio';
const matchesCategory = (product, selected) => selected === 'Todos' ||
  (selected === 'Preentreno y cafeína'
    ? product.category === selected || product.category === 'Pre entreno' || product.id === 'cafeina' || product.id === 'arginina'
    : product.category === selected);
let products = [], config = {}, category = 'Todos', query = '', sort = 'featured', cart = {};
let toastTimer, packs = [];
const postersWithPrintedPrice = new Set(['musclewhey','gummy','pump']);
try {
  const saved = JSON.parse(localStorage.getItem('makako-selection-v1') || '{}');
  if (saved && typeof saved === 'object' && !Array.isArray(saved)) cart = saved;
} catch { cart = {}; }

function toast(message) {
  $('#toast').textContent = message;
  $('#toast').classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => $('#toast').classList.remove('show'), 2800);
}
function skuProducts() {
  return products.flatMap(product => {
    const variants = product.variants?.length ? product.variants : [product];
    return variants.map(variant => ({
      ...product, ...variant,
      id: variant.id,
      name: product.name,
      price: variant.price,
      parentId: product.id,
      variants: undefined
    }));
  });
}
function getSku(id) { return [...skuProducts(),...packSkus()].find(sku => sku.id === id); }
function packSkus() {
  const skus = skuProducts();
  const todayChile = new Intl.DateTimeFormat('en-CA',{timeZone:'America/Santiago',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
  return packs.filter(pack => !pack.offerDate || pack.offerDate === todayChile).map(pack => {
    const items = pack.items.map(id => skus.find(sku => sku.id === id));
    const complete = items.every(item => item && hasPrice(item));
    const originalPrice = complete ? items.reduce((sum,item) => sum + item.price,0) : null;
    const automaticPrice = complete ? Math.round(originalPrice * 0.9) : null;
    const price = pack.offerDate ? pack.offerPrice : automaticPrice;
    return {...pack,name:'Pack ' + pack.name,category:'Packs',brand:'Makako Fit',image:pack.productImage || items[0]?.image,
      flavor:pack.flavorChoice || items.map(item => item ? item.name + ' · ' + item.brand + ' (' + item.flavor + ')' : '').join(' + '),
      size:items.map(item => item?.size).filter(Boolean).join(' + '),
      components:items,originalPrice,automaticPrice,price,
      savings:complete && price != null ? Math.max(0,originalPrice-price) : null};
  });
}
function renderPacks() {
  $('#packs-grid').innerHTML = packSkus().map(pack => `<article class="pack-card">
    <div class="pack-images" data-pack-size="${pack.components.length}">
    <img class="pack-brand" src="assets/wordmark.png" alt="Makako Fit">
    <span class="pack-art-motto">SUPLEMENTA<br>TU DISCIPLINA.</span>
    <div class="pack-stage">${pack.productImage ? `<img class="pack-pair-art" src="${escapeHTML(pack.productImage)}" alt="Dos tarros Grizzly Bear de 2 kg, del mismo tamaño" loading="lazy">` : pack.components.map(item => `<span class="pack-cutout cutout-${escapeHTML(item.id)}"><img src="${escapeHTML(item.image)}" alt="${escapeHTML(item.name)}" loading="lazy"></span>`).join('')}</div>
    <span class="pack-badge">${pack.savings > 0 ? '−' + Math.round(pack.savings / pack.originalPrice * 100) + '%' : pack.offerDate ? 'PACK' : '−10%'}</span></div>
    <div class="pack-content"><p class="eyebrow">${escapeHTML(pack.label)}</p><h3>${escapeHTML(pack.name)}</h3><p class="pack-purpose">${escapeHTML(pack.purpose || '')}</p>
    <div class="pack-pricing">${hasPrice(pack) ? `<span class="pack-offer-label">${pack.savings > 0 ? 'PRECIO OFERTA' : 'PRECIO PACK'}</span><strong>${money(pack.price)} <small>CLP</small></strong>${pack.originalPrice != null ? `<span>Antes, por separado: ${pack.savings > 0 ? `<s>${money(pack.originalPrice)}</s>` : money(pack.originalPrice)}</span>` : ''}${pack.savings > 0 ? `<span class="pack-savings">Ahorras ${money(pack.savings)}</span>` : ''}` : '<strong>Consultar precio</strong><span>Consulta el precio de esta combinación.</span>'}</div>
    <div class="pack-benefit-heading">¿QUÉ TE APORTA ESTE PACK?</div>
    <ul class="pack-benefits">${pack.components.map(item => `<li><span class="benefit-check" aria-hidden="true">✓</span><span>${escapeHTML(packBenefit(item.id))}</span></li>`).join('')}</ul>
    <details class="pack-includes"><summary>Ver productos incluidos (${pack.components.length})</summary><ul class="pack-components">${pack.components.map(item => `<li><strong>${escapeHTML(item.name)}</strong><span>${escapeHTML(item.brand)} · ${escapeHTML(item.size)} · ${pack.flavorChoice ? 'Sabor a elección' : escapeHTML(item.flavor)}</span></li>`).join('')}</ul></details>
    <button class="primary" data-add-pack="${escapeHTML(pack.id)}">AÑADIR PACK <span>+</span></button></div></article>`).join('');
}
function packBenefit(id) {
  if (id.startsWith('musclewhey') || id === 'grizzly-whey') return 'Proteína: apoya la recuperación y el mantenimiento muscular.';
  if (id.startsWith('creatina-')) return 'Creatina: apoya la fuerza y el rendimiento en esfuerzos intensos.';
  if (id === 'cafeina') return 'Cafeína: ayuda a mantenerte alerta y reducir la fatiga.';
  if (id === 'magnesio') return 'Glicinato de magnesio: contribuye a la función muscular y nerviosa.';
  if (id === 'omega3') return 'Omega 3: aporta ácidos grasos esenciales a tu alimentación.';
  if (id === 'pump') return 'Pump²: preentreno sin estimulantes y sin sabor, fácil de combinar.';
  if (id === 'essential') return 'Essential: preentreno orientado a energía y enfoque para entrenar.';
  if (id === 'thavage') return 'Thavage: preentreno orientado a energía y enfoque para entrenar.';
  if (id === 'venom') return 'Venom Inferno: preentreno con estimulantes para energía y enfoque.';
  return '';
}
function cardPrice(product) {
  const priced = skuProducts().filter(sku => sku.parentId === product.id && hasPrice(sku));
  if (!priced.length) return null;
  return Math.min(...priced.map(sku => sku.price));
}
function decoratePosterPrices() {
  document.querySelectorAll('.product-media').forEach(button => {
    const product = products.find(item => item.id === button.dataset.detail);
    if (!product || !postersWithPrintedPrice.has(product.id)) return;
    const current = cardPrice(product);
    button.insertAdjacentHTML('beforeend', `<span class="media-live-price"><small>PRECIO ACTUAL</small><strong>${current == null ? 'Consultar precio' : money(current)}</strong></span>`);
  });
}
function renderProducts() {
  renderPacks();
  window.MakakoMotion?.clearProducts();
  let visible = products.filter(product =>
    matchesCategory(product,category) &&
    normalize([product.name,product.brand,product.category,product.flavor,product.variants?.map(variant => variant.flavor).join(' ')].join(' ')).includes(normalize(query))
  );
  if (sort === 'low') visible.sort((a,b) => (cardPrice(a) ?? Infinity) - (cardPrice(b) ?? Infinity));
  if (sort === 'high') visible.sort((a,b) => (cardPrice(b) ?? -Infinity) - (cardPrice(a) ?? -Infinity));
  if (sort === 'name') visible.sort((a,b) => a.name.localeCompare(b.name,'es'));
  $('#product-grid').innerHTML = visible.map(product => {
    const price = cardPrice(product);
    const priceLabel = price == null ? 'Consultar precio' : `${product.variants ? 'Desde ' : ''}${money(price)}`;
    const flavor = product.variants ? `${product.variants.length} sabores · ${product.variants.map(variant => variant.flavor).join(' / ')}` : product.flavor;
    const details = [flavor,product.size].filter(Boolean).join(' · ');
    const categoryLabel = [product.brand,product.category].filter(Boolean).join(' / ');
    return `<article class="product-card"><button class="product-media" data-detail="${escapeHTML(product.id)}" aria-label="Ver ${escapeHTML(product.name)}"><img src="${escapeHTML(product.image)}" alt="${product.imageMissing ? 'Foto no disponible' : escapeHTML([product.name,flavor].filter(Boolean).join(' · '))}" loading="lazy">${product.stock === 0 ? '<span class="stock-badge">AGOTADO</span>' : ''}</button><p class="product-category">${escapeHTML(categoryLabel)}</p><h3>${escapeHTML(product.name)}</h3>${details ? `<p class="product-variant">${escapeHTML(details)}</p>` : ''}<p class="product-benefit">${escapeHTML(product.benefits?.[0] || '')}</p><div class="product-price"><strong>${priceLabel}</strong><span>${price == null ? '' : 'CLP'}</span></div><div class="product-actions"><button data-detail="${escapeHTML(product.id)}">VER PRODUCTO ↗</button><button data-add="${escapeHTML(product.id)}" ${product.stock === 0 ? 'disabled' : ''} aria-label="${product.variants ? 'Elegir sabor de' : 'Añadir'} ${escapeHTML(product.name)}">+</button></div></article>`;
  }).join('');
  $('#empty').hidden = visible.length !== 0;
  $('#result-count').textContent = `${visible.length} ${visible.length === 1 ? 'producto' : 'productos'}`;
  $('#clear-search').hidden = !query;
  $('#active-filters').hidden = category === 'Todos' && !query;
  $('#filter-summary').textContent = [category !== 'Todos' ? category : '', query ? `Búsqueda: «${query}»` : ''].filter(Boolean).join(' · ');
  document.querySelectorAll('[data-filter]').forEach(button => {
    const active = button.dataset.filter === category;
    button.classList.toggle('active',active);
    button.setAttribute('aria-pressed',String(active));
    const count = products.filter(product => matchesCategory(product,button.dataset.filter)).length;
    button.innerHTML = `${escapeHTML(button.dataset.filter)} <span class="filter-count">${count}</span>`;
  });
  decoratePosterPrices();
  window.MakakoMotion?.products();
}
function setCategory(value) {category = value;renderProducts();}
function saveCart() {
  try {localStorage.setItem('makako-selection-v1',JSON.stringify(cart));} catch {}
  renderCart();
}
function addSku(id, button) {
  const selected = getSku(id);
  if (!selected) return;
  if (selected.stock === 0) {toast('Este producto está agotado');return;}
  cart[id] = Math.min(99,(cart[id] || 0) + 1);
  saveCart();
  toast('Producto añadido a tu selección');
  window.MakakoMotion?.added(button);
}
function showProduct(id, selectedId) {
  const product = products.find(item => item.id === id || item.variants?.some(variant => variant.id === id));
  if (!product) return;
  const sku = getSku(selectedId || product.variants?.[0]?.id || product.id);
  if (!sku) return;
  const variants = product.variants || [];
  const imageLabel = sku.imageMissing ? 'Foto no disponible' : [product.name,sku.flavor].filter(Boolean).join(' · ');
  const availability = sku.stock === 0 ? 'Agotado' : sku.available ? 'Disponible' : 'Consultar stock';
  $('#product-detail').dataset.sku = sku.id;
  $('#product-detail').innerHTML = `<img src="${escapeHTML(sku.image)}" alt="${escapeHTML(imageLabel)}"><div class="detail-content"><p class="eyebrow">${escapeHTML(product.brand || product.category)}</p><h2 id="detail-title">${escapeHTML(product.name)}</h2><p>${escapeHTML(product.description || '')}</p>${product.benefits?.length ? `<h3 class="benefits-heading">Beneficios y características</h3><ul class="benefits-list">${product.benefits.map(benefit => `<li>${escapeHTML(benefit)}</li>`).join('')}</ul>` : ''}${product.benefitSource ? `<a class="benefit-source" href="${escapeHTML(product.benefitSource.url)}" target="_blank" rel="noopener">${escapeHTML(product.benefitSource.label)} ↗</a>` : ''}<div class="detail-spec"><span>Categoría</span><strong>${escapeHTML(product.category)}</strong></div>${variants.length ? `<label class="variant-picker" for="detail-flavor">Elige el sabor<select id="detail-flavor">${variants.map(variant => `<option value="${escapeHTML(variant.id)}" ${variant.id === sku.id ? 'selected' : ''}>${escapeHTML(variant.flavor)}</option>`).join('')}</select></label>` : sku.flavor ? `<div class="detail-spec"><span>Sabor</span><strong>${escapeHTML(sku.flavor)}</strong></div>` : ''}${sku.size ? `<div class="detail-spec"><span>Presentación</span><strong>${escapeHTML(sku.size)}</strong></div>` : ''}<div class="detail-spec"><span>Disponibilidad</span><strong>${availability}</strong></div><p class="detail-price">${priceText(sku)} <small>${hasPrice(sku) ? 'CLP' : ''}</small></p><p>${hasPrice(sku) ? 'Precio de referencia. Confirma disponibilidad y precio vigente con Makako Fit.' : 'Precio pendiente de agregar. Puedes incluir este producto en tu selección para consultar.'}</p>${sku.originalImage ? `<a class="benefit-source" href="${escapeHTML(sku.originalImage)}" target="_blank" rel="noopener">Ver foto original del envase ↗</a>` : ''}<button class="primary" data-add-sku="${escapeHTML(sku.id)}" ${sku.stock === 0 ? 'disabled' : ''}>${sku.stock === 0 ? 'AGOTADO' : 'AÑADIR A MI SELECCIÓN'} <span>+</span></button></div>`;
  if (postersWithPrintedPrice.has(sku.id)) {
    const img = $('#product-detail').querySelector('img');
    const wrapper = document.createElement('div');
    wrapper.className = 'detail-media';
    img.replaceWith(wrapper);
    wrapper.append(img);
    wrapper.insertAdjacentHTML('beforeend', `<span class="media-live-price"><small>PRECIO ACTUAL</small><strong>${priceText(sku)}</strong></span>`);
  }
  if (!$('#product-dialog').open) {
    $('#product-dialog').showModal();
    window.MakakoMotion?.dialog($('#product-dialog'));
  }
}
function cartLines() {return [...skuProducts(),...packSkus()].filter(sku => sku.stock !== 0 && cart[sku.id] > 0).map(sku => ({...sku,qty:cart[sku.id]}));}
function total() {return cartLines().reduce((sum,sku) => sum + (hasPrice(sku) ? sku.price * sku.qty : 0),0);}
function totalText() {
  const items = cartLines();
  return items.some(sku => !hasPrice(sku))
    ? (items.some(hasPrice) ? `${money(total())} + por cotizar` : 'Por cotizar')
    : money(total());
}
function orderText() {
  return `Hola Makako Fit, quiero consultar disponibilidad de esta selección:\n\n${cartLines().map(sku => `${sku.qty} × ${sku.name}${sku.flavor || sku.size ? ` (${[sku.flavor,sku.size].filter(Boolean).join(', ')})` : ''} — ${priceText(sku,sku.qty)}${sku.components && sku.savings > 0 ? ' · Ahorro incluido: ' + money(sku.savings * sku.qty) : ''}`).join('\n')}\n\nTotal de referencia: ${totalText()}\nStock, precio vigente y envío por confirmar.\nEste resumen no confirma una compra.`;
}
function renderCart() {
  const items = cartLines();
  const count = items.reduce((sum,sku) => sum + sku.qty,0);
  $('#cart-count').textContent = count;
  $('#cart-items').innerHTML = items.length ? items.map(sku => `<article class="cart-item"><img src="${escapeHTML(sku.image)}" alt="${escapeHTML(sku.name)}"><div><h3>${escapeHTML(sku.name)}</h3><p>${escapeHTML([sku.flavor,sku.size].filter(Boolean).join(' · '))}</p><strong>${priceText(sku,sku.qty)}</strong><div class="item-controls"><div class="quantity"><button data-change="${escapeHTML(sku.id)}" data-delta="-1" aria-label="Reducir cantidad de ${escapeHTML(sku.name)} ${escapeHTML(sku.flavor || '')}">−</button><span>${sku.qty}</span><button data-change="${escapeHTML(sku.id)}" data-delta="1" aria-label="Aumentar cantidad de ${escapeHTML(sku.name)} ${escapeHTML(sku.flavor || '')}">+</button></div><button class="remove" data-remove="${escapeHTML(sku.id)}">Eliminar</button></div></div></article>`).join('') : '<div class="cart-empty">Tu selección está vacía.<br>Explora el catálogo y añade lo que necesitas.<br><button class="secondary" style="margin-top:20px" data-close="cart-dialog">Seguir explorando</button></div>';
  $('#cart-total').textContent = totalText();
  $('#selection-dock').hidden = !count;
  document.body.classList.toggle('has-selection',count > 0);
  $('#dock-count').textContent = `${count} ${count === 1 ? 'producto' : 'productos'} en tu selección`;
  $('#dock-total').textContent = totalText();
  $('#copy-order').disabled = !count;
  $('#download-order').disabled = !count;
  const phone = String(config.whatsapp || '').replace(/\D/g,'');
  $('#whatsapp-order').hidden = !phone || !count;
  if (phone) $('#whatsapp-order').href = `https://wa.me/${phone}?text=${encodeURIComponent(orderText())}`;
}
function resetFilters() {query = '';$('#search').value = '';setCategory('Todos');$('#search').focus({preventScroll:true});}
function openCart() {$('#cart-dialog').showModal();window.MakakoMotion?.dialog($('#cart-dialog'));}

document.addEventListener('click',event => {
  const button = event.target.closest('button');
  if (!button) return;
  if (button.dataset.filter) setCategory(button.dataset.filter);
  if (button.dataset.category) {setCategory(button.dataset.category);$('#catalogo').scrollIntoView({behavior:window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth'});}
  if (button.dataset.detail) showProduct(button.dataset.detail);
  if (button.dataset.add) {
    const product = products.find(item => item.id === button.dataset.add);
    if (product?.variants) showProduct(product.id);
    else addSku(button.dataset.add,button);
  }
  if (button.dataset.addSku) addSku(button.dataset.addSku,button);
  if (button.dataset.addPack) addSku(button.dataset.addPack,button);
  if (button.hasAttribute('data-pack-section')) $('#packs').scrollIntoView({behavior:window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth'});
  if (button.dataset.close) document.getElementById(button.dataset.close).close();
  if (button.dataset.change) {
    const id = button.dataset.change;
    cart[id] = Math.max(0,Math.min(99,(cart[id] || 0) + Number(button.dataset.delta)));
    if (!cart[id]) delete cart[id];
    saveCart();
  }
  if (button.dataset.remove) {delete cart[button.dataset.remove];saveCart();}
});
document.addEventListener('change',event => {
  if (event.target.id !== 'detail-flavor') return;
  const id = event.target.value;
  showProduct(id,id);
  $('#detail-flavor').focus({preventScroll:true});
});
$('#cart-open').addEventListener('click',openCart);
$('#dock-open').addEventListener('click',openCart);
$('#search').addEventListener('input',event => {query = event.target.value;renderProducts();});
$('#sort').addEventListener('change',event => {sort = event.target.value;renderProducts();});
$('#reset').addEventListener('click',resetFilters);
$('#clear-filters').addEventListener('click',resetFilters);
$('#clear-search').addEventListener('click',() => {query = '';$('#search').value = '';renderProducts();$('#search').focus({preventScroll:true});});
document.querySelectorAll('dialog').forEach(dialog => dialog.addEventListener('click',event => {
  if (event.target !== dialog) return;
  const box = dialog.getBoundingClientRect();
  if (event.clientX < box.left || event.clientX > box.right || event.clientY < box.top || event.clientY > box.bottom) dialog.close();
}));
$('#copy-order').addEventListener('click',async () => {
  try {await navigator.clipboard.writeText(orderText());toast('Resumen copiado. Puedes enviarlo a Makako Fit.');}
  catch {toast('No se pudo copiar. Usa «Descargar selección».');}
});
$('#download-order').addEventListener('click',() => {
  const blob = new Blob([orderText()],{type:'text/plain;charset=utf-8'});
  const url = URL.createObjectURL(blob), anchor = document.createElement('a');
  anchor.href = url;anchor.download = 'seleccion-makako-fit.txt';anchor.click();
  setTimeout(() => URL.revokeObjectURL(url),1000);
  toast('Selección descargada');
});
$('#year').textContent = new Date().getFullYear();
let visibleOfferDay = new Intl.DateTimeFormat('en-CA',{timeZone:'America/Santiago',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
setInterval(() => {
  const day = new Intl.DateTimeFormat('en-CA',{timeZone:'America/Santiago',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
  if (day !== visibleOfferDay) {visibleOfferDay = day;renderProducts();renderCart();}
},30000);
// Macaco OS manda: agotado, foto y precio salen de la vista pública catalogo_publico
// Las fichas nuevas también reciben el nombre. Si falla la lectura, queda catalogo.json.
const MACACO_OS = {
  url:'https://jmvbdjahitdhbvrfblnh.supabase.co/rest/v1/catalogo_publico?select=productos',
  key:'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImptdmJkamFoaXRkaGJ2cmZibG5oIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODAxODU2ODksImV4cCI6MjA5NTc2MTY4OX0.6q_M4V6y53sUEr-20MzkSOTZTLL5nthwLLFLPhCsi8o'
};
async function aplicarMacacoOS(list) {
  try {
    const response = await fetch(MACACO_OS.url,{headers:{apikey:MACACO_OS.key,authorization:'Bearer ' + MACACO_OS.key},cache:'no-store'});
    if (!response.ok) return;
    const [row] = await response.json();
    const live = row?.productos;
    if (live && typeof live === 'object' && !Array.isArray(live)) actualizarProductos(list, live);
  } catch {}
}

function actualizarProductos(list, live) {
  const fichasExistentes = new Set(list.map(product => product.id));
  list.forEach(product => {
    if (!Object.hasOwn(live, product.id)) return;
    const info = live[product.id];
    if (!info) return;
    product.stock = info.agotado === true ? 0 : null;
    product.available = info.agotado === false && !product.variants?.length;
    (product.variants || []).forEach(variant => {
      if (info.agotado === true) variant.stock = 0;
      else delete variant.stock;
    });
    const image = fotoInventario(info);
    if (image) product.image = image;
    if (hasPrice({price:info.precio})) {
      product.price = info.precio;
      // El precio es del producto principal; otras presentaciones conservan su precio.
      (product.variants || []).forEach(variant => {
        if (variant.id === product.id) variant.price = info.precio;
      });
    }
  });
  for (const [id, info] of Object.entries(live)) {
    if (!id.startsWith('os:') || fichasExistentes.has(id) ||
        typeof info?.nombre !== 'string' || !info.nombre.trim()) continue;
    const image = fotoInventario(info);
    list.push({
      id,
      name: info.nombre.trim(),
      category: 'Otros',
      image: image || 'assets/logo.png',
      imageMissing: !image,
      price: hasPrice({price:info.precio}) ? info.precio : null,
      stock: info.agotado === true ? 0 : null,
      available: info.agotado === false
    });
  }
}

function fotoInventario(info) {
  return typeof info.imagen === 'string' && info.imagen.startsWith('https://') ? info.imagen : null;
}
Promise.all(['catalogo.json','packs.json'].map(url => fetch(url).then(response => {if (!response.ok) throw new Error('catalog');return response.json();}))).then(async ([data,packData]) => {
  packs = packData;
  config = data;products = data.products;
  await aplicarMacacoOS(products);
  const ids = new Set([...skuProducts(),...packSkus()].filter(sku => sku.stock !== 0).map(sku => sku.id));
  cart = Object.fromEntries(Object.entries(cart).filter(([id,quantity]) => ids.has(id) && Number.isInteger(quantity) && quantity > 0 && quantity <= 99));
  renderProducts();renderCart();
}).catch(() => {
  $('#product-grid').innerHTML = '<p>No pudimos cargar el catálogo. Recarga la página para intentarlo de nuevo.</p>';
  $('#result-count').textContent = '';
  $('#cart-open').disabled = true;
});

