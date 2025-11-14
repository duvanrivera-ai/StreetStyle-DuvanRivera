// Configuración general
const MONEDA   = 'COP';
const LOCALE   = 'es-CO';
const TAX_RATE = 0.19;
const DESCUENTO = 0;

const productos = [
  {
    id: 1,
    nombre: 'Hoodie “Black Street”',
    categoria: 'Hoodies',
    precio: 120000,
    img: 'https://i.pinimg.com/736x/87/fd/06/87fd060c00f3b77e08bcaefebed21ca8.jpg'
  },
  {
    id: 2,
    nombre: 'Hoodie “Retro Gray”',
    categoria: 'Hoodies',
    precio: 115000,
    img: 'https://i.pinimg.com/1200x/ac/af/20/acaf202d83ae17d909255bdde79959c9.jpg'
  },
  {
    id: 3,
    nombre: 'Gorra “NYC Flat”',
    categoria: 'Gorras',
    precio: 75000,
    img: 'https://i.pinimg.com/736x/32/a3/65/32a365ea2ea57c55fa39edae4905c521.jpg'
  },
  {
    id: 4,
    nombre: 'Gorra “Classic White”',
    categoria: 'Gorras',
    precio: 70000,
    img: 'https://i.pinimg.com/1200x/ec/a9/1a/eca91a1568d9d443930eca7984f2c185.jpg'
  },
  {
    id: 5,
    nombre: 'Buso Oversize “Storm”',
    categoria: 'Busos oversize',
    precio: 95000,
    img: 'https://i.pinimg.com/736x/69/38/bf/6938bf86743551cab01f47c47a3b2ff4.jpg'
  },
  {
    id: 6,
    nombre: 'Buso Oversize “Skyline”',
    categoria: 'Busos oversize',
    precio: 99000,
    img: 'https://i.pinimg.com/736x/22/b6/85/22b68521cf82a1300db99b50452c871f.jpg'
  }
];


let carrito = new Map();

const el = {
  contProds: document.getElementById('productos'),
  lista:     document.getElementById('lista-carrito'),
  subtotal:  document.getElementById('subtotal-text'),
  impuestos: document.getElementById('impuestos-text'),
  descuento: document.getElementById('descuento-text'),
  total:     document.getElementById('total-text'),
  cantidad:  document.getElementById('cantidad-carrito'),
  select:    document.getElementById('categoria'),
  btnVaciar: document.getElementById('btn-vaciar'),
  btnFinal:  document.getElementById('btn-finalizar'),
  paypal:    document.getElementById('paypal-button-container'),
  hints:     document.getElementById('hints-vacios')
};

const money = new Intl.NumberFormat(LOCALE, { style: 'currency', currency: MONEDA });

// Render productos
function renderProductos(lista){
  el.contProds.innerHTML = '';

  if (!Array.isArray(lista) || lista.length === 0){
    el.hints.style.display = 'block';
    el.hints.textContent = '👋 Aún no hay productos.';
    return;
  } else {
    el.hints.style.display = 'none';
  }

  lista.forEach(p => {
    const card = document.createElement('article');
    card.className = 'producto';
    card.innerHTML = `
      <img src="${p.img}" alt="${p.nombre}">
      <h3>${p.nombre}</h3>
      <p>Precio: <strong class="price">${money.format(p.precio)}</strong></p>
      <button class="button" data-add="${p.id}">Agregar al carrito</button>
    `;
    const img = card.querySelector('img');
    img.addEventListener('error', () => {
      img.alt = p.nombre + ' (imagen no disponible)';
    });
    el.contProds.appendChild(card);
  });
}

// Filtro
function filtrar(){
  const sel = el.select.value;
  const data = sel === 'todos' ? productos : productos.filter(p => p.categoria === sel);
  renderProductos(data);
  localStorage.setItem('filtro_categoria', sel);
}

function cargarFiltro(){
  const f = localStorage.getItem('filtro_categoria');
  if (f) el.select.value = f;
}

// LocalStorage carrito
function persist(){
  localStorage.setItem('carrito_streetstyle', JSON.stringify(Array.from(carrito.entries())));
}
function load(){
  const data = localStorage.getItem('carrito_streetstyle');
  if (data){
    carrito = new Map(JSON.parse(data));
  }
}

// Totales
function totales(){
  const subtotal = [...carrito.values()]
    .reduce((a,i) => a + i.precio * i.cantidad, 0);
  const desc = Math.min(DESCUENTO, subtotal);
  const base = subtotal - desc;
  const impuestos = base * TAX_RATE;
  const total = base + impuestos;
  const cantidad = [...carrito.values()]
    .reduce((a,i) => a + i.cantidad, 0);

  return { subtotal, descuento: desc, impuestos, total, cantidad };
}

function pintarCarrito(){
  el.lista.innerHTML = '';

  carrito.forEach(it => {
    const li = document.createElement('li');
    li.innerHTML = `
      <span>${it.nombre} — ${money.format(it.precio)}</span>
      <div class="qty">
        <button aria-label="Disminuir" data-dec="${it.id}">−</button>
        <span>${it.cantidad}</span>
        <button aria-label="Aumentar" data-inc="${it.id}">+</button>
        <button class="remove" aria-label="Eliminar" data-del="${it.id}">✕</button>
      </div>
    `;
    el.lista.appendChild(li);
  });

  const {subtotal, descuento, impuestos, total, cantidad} = totales();

  el.subtotal.textContent  = money.format(subtotal);
  el.descuento.textContent = money.format(descuento);
  el.impuestos.textContent = money.format(impuestos);
  el.total.textContent     = money.format(total);
  el.cantidad.textContent  = cantidad;

  el.paypal.style.display = total > 0 ? 'block' : 'none';
  renderPayPal(total);
}

// Operaciones carrito
function add(id){
  const p = productos.find(x => x.id === id);
  if (!p) return;
  const it = carrito.get(id);
  if (it) it.cantidad++;
  else carrito.set(id, {...p, cantidad:1});
  persist();
  pintarCarrito();
}
function dec(id){
  const it = carrito.get(id);
  if (!it) return;
  it.cantidad--;
  if (it.cantidad <= 0) carrito.delete(id);
  persist();
  pintarCarrito();
}
function delItem(id){
  carrito.delete(id);
  persist();
  pintarCarrito();
}

// PayPal
let paypalRenderedTotal = null;
function renderPayPal(total){
  if (!window.paypal) return;
  if (total <= 0){
    el.paypal.innerHTML = '';
    paypalRenderedTotal = null;
    return;
  }
  if (paypalRenderedTotal === total && el.paypal.childElementCount > 0) return;

  paypalRenderedTotal = total;
  el.paypal.innerHTML = '';
  paypal.Buttons({
    createOrder: (data, actions) => actions.order.create({
      purchase_units: [{ amount: { value: total.toFixed(2), currency_code: MONEDA } }]
    }),
    onApprove: (data, actions) => actions.order.capture().then(() => {
      alert('¡Gracias por tu compra!');
      carrito.clear();
      persist();
      pintarCarrito();
    }),
    onError: err => {
      console.error(err);
      alert('Error con el pago. Intenta de nuevo.');
    }
  }).render('#paypal-button-container');
}

// Eventos
document.addEventListener('click', e => {
  const addBtn = e.target.closest('[data-add]');
  const incBtn = e.target.closest('[data-inc]');
  const decBtn = e.target.closest('[data-dec]');
  const delBtn = e.target.closest('[data-del]');

  if (addBtn) add(+addBtn.dataset.add);
  if (incBtn) add(+incBtn.dataset.inc);
  if (decBtn) dec(+decBtn.dataset.dec);
  if (delBtn) delItem(+delBtn.dataset.del);
});

el.select.addEventListener('change', filtrar);

el.btnVaciar.addEventListener('click', () => {
  if (carrito.size === 0) return;
  if (confirm('¿Vaciar carrito?')){
    carrito.clear();
    persist();
    pintarCarrito();
  }
});

el.btnFinal.addEventListener('click', () => {
  if (carrito.size === 0){
    alert('Carrito vacío.');
    return;
  }
  alert('Pedido confirmado (simulado).');
});

// Init
(function init(){
  cargarFiltro();
  renderProductos(productos);
  load();
  pintarCarrito();
})();
