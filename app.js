// БОЕЦ V9 — Hash-роутинг SPA
// Promise.any 6 доменов + routers.json fallback
// localStorage: alko_cart + alko_history (5 заказов)
(function(){
'use strict';

// === 6 доменов для Promise.any ===
var DOMAINS = [
  'https://vlvc.ru',
  'https://klan-bro.ru',
  'https://broklan.xyz',
  'https://broklan.lol',
  'https://klanup.lol',
  'https://klan1.lol'
];
var ROUTERS_JSON = 'https://fruit-exchange.github.io/alko-routers/routers.json';
var IMG = 'https://vlvc.ru';
var TIMEOUT = 8000;

// === localStorage ===
function getCart(){try{return JSON.parse(localStorage.getItem('alko_cart')||'[]')}catch(e){return[]}}
function setCart(c){localStorage.setItem('alko_cart',JSON.stringify(c));updateBadge()}
function getHistory(){try{return JSON.parse(localStorage.getItem('alko_history')||'[]')}catch(e){return[]}}
function addHistory(o){var h=getHistory();h.unshift(o);if(h.length>5)h=h.slice(0,5);localStorage.setItem('alko_history',JSON.stringify(h))}

// === API: Promise.any 6 доменов ===
function fetchAny(path){
  var ts = '?_t=' + Date.now();
  if(path.indexOf('?') > -1) ts = '&_t=' + Date.now();
  var promises = DOMAINS.map(function(d){
    return new Promise(function(resolve,reject){
      var ctrl = new AbortController();
      var t = setTimeout(function(){ctrl.abort()}, TIMEOUT);
      fetch(d + '/api/v1' + path + ts, {signal: ctrl.signal, headers:{'Accept':'application/json'}})
        .then(function(r){clearTimeout(t); if(!r.ok)throw new Error(r.status); return r.json()})
        .then(function(d){resolve(d)})
        .catch(function(e){clearTimeout(t); reject(e)});
    });
  });
  return Promise.any(promises).catch(function(){
    // Fallback: routers.json
    return fetch(ROUTERS_JSON).then(function(r){return r.json()}).then(function(list){
      if(!list || !list.length) throw new Error('No routers');
      return Promise.any(list.map(function(d){
        return fetch(d + '/api/v1' + path + ts).then(function(r){return r.json()});
      }));
    });
  });
}

function postAny(path, body){
  var promises = DOMAINS.map(function(d){
    return new Promise(function(resolve,reject){
      var ctrl = new AbortController();
      var t = setTimeout(function(){ctrl.abort()}, TIMEOUT);
      fetch(d + '/api/v1' + path, {method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body),signal:ctrl.signal})
        .then(function(r){clearTimeout(t); if(!r.ok)throw new Error(r.status); return r.json()})
        .then(function(d){resolve(d)})
        .catch(function(e){clearTimeout(t); reject(e)});
    });
  });
  return Promise.any(promises);
}

// === Hash Router ===
function route(){
  var h = location.hash.slice(1) || '/';
  var parts = h.split('/');
  var app = document.getElementById('app');
  
  if(h === '/' || h === '') return pageHome(app);
  if(parts[1] === 'product') return pageProduct(app, parts[2] || '');
  if(parts[1] === 'districts') return pageDistricts(app);
  if(parts[1] === 'track') return pageTrack(app, parts[2] || '');
  if(parts[1] === 'cart') return pageCart(app);
  if(parts[1] === 'checkout') return pageCheckout(app);
  if(parts[1] === 'history') return pageHistory(app);
  pageHome(app);
}

function nav(hash){location.hash = hash}
window.addEventListener('hashchange', route);

// === Render helpers ===
function header(){
  var c = getCart().reduce(function(s,i){return s + i.qty}, 0);
  return '<div class="header"><a href="#/">Доставка напитков Невский СПб — 18+</a><div class="nav"><a href="#/" style="color:#fff">Каталог</a><a href="#/districts" style="color:#fff">Районы</a><a href="#/track/" style="color:#fff">Заказ</a><a href="#/cart" style="color:#fff">🛒<span class="cart-badge" id="cb">'+c+'</span></a></div></div>';
}

function updateBadge(){
  var b = document.getElementById('cb');
  if(b){b.textContent = getCart().reduce(function(s,i){return s+i.qty},0)}
}

function img(p){return p.photo_url ? IMG + '/uploads/' + p.photo_url : ''}
function fmt(n){return Number(n||0).toLocaleString('ru-RU') + ' ₽'}

// === Pages ===
function pageHome(el){
  el.innerHTML = header() + '<div class="container"><div class="loading">Загрузка каталога...</div></div>';
  fetchAny('/products').then(function(items){
    if(!items || !items.length){el.innerHTML = header()+'<div class="container"><div class="empty">Каталог временно недоступен</div></div>'+footer();return}
    var html = header() + '<div class="container"><div class="product-grid">';
    items.forEach(function(p){
      var old = p.old_price ? '<span class="old">'+fmt(p.old_price)+'</span>' : '';
      html += '<div class="product-card" onclick="nav(\'#/product/'+(p.slug||p.id)+'\')">';
      if(p.photo_url) html += '<img src="'+IMG+'/uploads/'+p.photo_url+'" loading="lazy" alt="'+(p.name||'')+'">';
      html += '<div class="info"><div class="name">'+(p.name||'')+'</div><div class="price">'+fmt(p.price)+old+'</div>';
      if(p.category) html += '<div class="cat">'+p.category+'</div>';
      html += '</div></div>';
    });
    html += '</div></div>' + footer();
    el.innerHTML = html;
  }).catch(function(e){
    el.innerHTML = header()+'<div class="container"><div class="error">Не удалось загрузить каталог. Попробуйте позже.</div></div>'+footer();
  });
}

function pageProduct(el, slug){
  el.innerHTML = header()+'<div class="container"><div class="loading">Загрузка...</div></div>';
  fetchAny('/products/'+slug).then(function(p){
    if(p.error){el.innerHTML = header()+'<div class="container"><div class="empty">Товар не найден</div><a href="#/" class="back">← В каталог</a></div>'+footer();return}
    var old = p.old_price ? '<span class="old" style="font-size:18px">'+fmt(p.old_price)+'</span>' : '';
    var html = header()+'<div class="container"><a href="#/" class="back">← В каталог</a>';
    html += '<div class="product-detail">';
    if(p.photo_url) html += '<img src="'+IMG+'/uploads/'+p.photo_url+'" alt="'+(p.name||'')+'">';
    html += '<h1 style="margin-bottom:8px">'+(p.name||'')+'</h1>';
    html += '<div style="font-size:22px;font-weight:700;color:#6c5ce7;margin-bottom:8px">'+fmt(p.price)+old+'</div>';
    if(p.brand) html += '<div style="color:#666;margin-bottom:4px">Бренд: '+p.brand+'</div>';
    if(p.volume_ml) html += '<div style="color:#666;margin-bottom:4px">Объём: '+p.volume_ml+' мл</div>';
    if(p.strength) html += '<div style="color:#666;margin-bottom:4px">Крепость: '+p.strength+'%</div>';
    if(p.category) html += '<div style="color:#666;margin-bottom:8px">Категория: '+p.category+'</div>';
    if(p.description) html += '<p style="margin:12px 0;color:#444">'+p.description+'</p>';
    html += '<button class="btn btn-full" onclick="addToCart(\''+slug+'\')">В корзину — '+fmt(p.price)+'</button>';
    html += '</div></div>'+footer();
    el.innerHTML = html;
  }).catch(function(){
    el.innerHTML = header()+'<div class="container"><div class="error">Ошибка загрузки товара</div></div>'+footer();
  });
}

function pageDistricts(el){
  el.innerHTML = header()+'<div class="container"><div class="loading">Загрузка районов...</div></div>';
  fetchAny('/districts').then(function(d){
    if(!d || !d.length){el.innerHTML = header()+'<div class="container"><div class="empty">Районы недоступны</div></div>'+footer();return}
    var html = header()+'<div class="container"><h2 style="margin:12px 0">Районы доставки СПб</h2>';
    d.forEach(function(r){
      html += '<div class="district-card"><div><strong>'+r.name+'</strong></div><div class="time">'+r.delivery_time_min+'–'+r.delivery_time_max+' мин · '+fmt(r.delivery_fee)+'</div></div>';
    });
    html += '</div>'+footer();
    el.innerHTML = html;
  }).catch(function(){
    el.innerHTML = header()+'<div class="container"><div class="error">Ошибка загрузки районов</div></div>'+footer();
  });
}

function pageTrack(el, id){
  var html = header()+'<div class="container"><h2 style="margin:12px 0">Отслеживание заказа</h2>';
  if(!id){
    html += '<input type="text" id="trackInput" placeholder="Номер заказа (например, ORD-12345)"><button class="btn btn-full" onclick="trackOrder()">Отследить</button>';
    var h = getHistory();
    if(h.length){
      html += '<h3 style="margin:16px 0 8px">История заказов</h3>';
      h.forEach(function(o){html += '<div class="history-item" onclick="nav(\'#/track/'+o.order_number+'\')"><span class="num">'+o.order_number+'</span> · '+fmt(o.total)+' · <span class="order-status s-'+(o.status||'new')+'">'+(o.status||'new')+'</span></div>'});
    }
    html += '</div>'+footer();
    el.innerHTML = html;
    return;
  }
  html += '<div class="loading">Поиск заказа...</div></div>'+footer();
  el.innerHTML = html;
  fetchAny('/orders/'+id).then(function(o){
    if(o.error){el.innerHTML = header()+'<div class="container"><div class="empty">Заказ не найден</div><a href="#/track/" class="back">← К поиску</a></div>'+footer();return}
    var html = header()+'<div class="container"><a href="#/track/" class="back">← К поиску</a>';
    html += '<div class="product-detail"><h2>Заказ '+o.order_number+'</h2>';
    html += '<div style="margin:8px 0">Статус: <span class="order-status s-'+(o.status||'new')+'">'+(o.status||'new')+'</span></div>';
    if(o.customer_name) html += '<div>Клиент: '+o.customer_name+'</div>';
    if(o.district) html += '<div>Район: '+o.district+'</div>';
    if(o.address) html += '<div>Адрес: '+o.address+'</div>';
    if(o.items && o.items.length){
      html += '<h3 style="margin:12px 0 8px">Состав:</h3>';
      o.items.forEach(function(i){html += '<div style="padding:4px 0">'+(i.name||i.product_name||'Товар')+' × '+i.qty+' = '+fmt((i.price||0)*i.qty)+'</div>'});
    }
    html += '<div class="total"><span>Итого:</span><span>'+fmt(o.total)+'</span></div>';
    html += '</div></div>'+footer();
    el.innerHTML = html;
  }).catch(function(){
    el.innerHTML = header()+'<div class="container"><div class="error">Ошибка загрузки заказа</div></div>'+footer();
  });
}

function pageCart(el){
  var cart = getCart();
  var html = header()+'<div class="container"><h2 style="margin:12px 0">Корзина</h2>';
  if(!cart.length){html += '<div class="empty">Корзина пуста</div><a href="#/" class="btn" style="display:inline-block;margin-top:12px">В каталог</a></div>'+footer();el.innerHTML=html;return}
  var total = 0;
  cart.forEach(function(i){
    total += (i.price||0) * i.qty;
    html += '<div class="cart-item">';
    if(i.photo) html += '<img src="'+IMG+'/uploads/'+i.photo+'" alt="">';
    html += '<div style="flex:1"><div>'+i.name+'</div><div style="color:#666;font-size:14px">'+fmt(i.price)+'</div></div>';
    html += '<div class="qty"><button onclick="changeQty(\''+i.id+'\',-1)">−</button><span>'+i.qty+'</span><button onclick="changeQty(\''+i.id+'\',1)">+</button></div>';
    html += '<div style="font-weight:600;width:80px;text-align:right">'+fmt(i.price*i.qty)+'</div>';
    html += '</div>';
  });
  html += '<div class="total"><span>Итого:</span><span>'+fmt(total)+'</span></div>';
  html += '<button class="btn btn-full" onclick="nav(\'#/checkout\')">Оформить заказ</button>';
  html += '</div>'+footer();
  el.innerHTML = html;
}

function pageCheckout(el){
  var cart = getCart();
  if(!cart.length){nav('#/');return}
  var total = cart.reduce(function(s,i){return s + (i.price||0)*i.qty}, 0);
  var html = header()+'<div class="container"><h2 style="margin:12px 0">Оформление заказа</h2>';
  html += '<div class="product-detail">';
  html += '<label>Имя</label><input type="text" id="coName" placeholder="Ваше имя">';
  html += '<label>Телефон</label><input type="tel" id="coPhone" placeholder="+7 (___) ___-__-__">';
  html += '<label>Адрес</label><textarea id="coAddr" rows="2" placeholder="Улица, дом, квартира"></textarea>';
  html += '<label>Район</label><select id="coDistrict"><option value="">Выберите район</option></select>';
  html += '<label>Комментарий</label><textarea id="coComment" rows="2" placeholder="Пожелания (необязательно)"></textarea>';
  html += '<div class="total"><span>Итого:</span><span>'+fmt(total)+'</span></div>';
  html += '<button class="btn btn-full" onclick="submitOrder()">Подтвердить заказ</button>';
  html += '</div></div>'+footer();
  el.innerHTML = html;
  // Load districts
  fetchAny('/districts').then(function(d){
    if(!d)return;
    var sel = document.getElementById('coDistrict');
    d.forEach(function(r){var o=document.createElement('option');o.value=r.name;o.text=r.name;sel.appendChild(o)});
  });
}

function pageHistory(el){
  var h = getHistory();
  var html = header()+'<div class="container"><h2 style="margin:12px 0">История заказов</h2>';
  if(!h.length){html += '<div class="empty">Нет заказов</div></div>'+footer();el.innerHTML=html;return}
  h.forEach(function(o){
    html += '<div class="history-item" onclick="nav(\'#/track/'+o.order_number+'\')"><span class="num">'+o.order_number+'</span> · '+fmt(o.total)+' · <span class="order-status s-'+(o.status||'new')+'">'+(o.status||'new')+'</span></div>';
  });
  html += '</div>'+footer();
  el.innerHTML = html;
}

function footer(){return '<div class="footer">18+ · Доставка по СПб · '+new Date().getFullYear()+'</div>'}

// === Cart actions ===
window.addToCart = function(slug){
  fetchAny('/products/'+slug).then(function(p){
    if(p.error)return;
    var cart = getCart();
    var existing = cart.find(function(i){return i.id === p.id});
    if(existing){existing.qty++} else {cart.push({id:p.id, name:p.name, price:p.price, photo:p.photo_url, qty:1})}
    setCart(cart);
    alert('Добавлено: ' + p.name);
  });
};

window.changeQty = function(id, delta){
  var cart = getCart();
  var item = cart.find(function(i){return i.id === id});
  if(!item)return;
  item.qty += delta;
  if(item.qty <= 0) cart = cart.filter(function(i){return i.id !== id});
  setCart(cart);
  route();
};

window.trackOrder = function(){
  var id = document.getElementById('trackInput').value.trim();
  if(id) nav('#/track/'+id);
};

window.submitOrder = function(){
  var cart = getCart();
  if(!cart.length)return;
  var name = document.getElementById('coName').value.trim();
  var phone = document.getElementById('coPhone').value.trim();
  var addr = document.getElementById('coAddr').value.trim();
  var district = document.getElementById('coDistrict').value;
  var comment = document.getElementById('coComment').value.trim();
  if(!name || !phone || !addr){alert('Заполните имя, телефон и адрес');return}
  var total = cart.reduce(function(s,i){return s + (i.price||0)*i.qty}, 0);
  var items = cart.map(function(i){return {product_id:i.id, name:i.name, qty:i.qty, price:i.price}});
  var order = {customer_name:name, phone:phone, address:addr, district:district, comment:comment, items:items, subtotal:total, total:total, payment_method:'cash', order_source:'website'};
  postAny('/orders', order).then(function(r){
    if(r && r.order_number){
      addHistory({order_number:r.order_number, total:total, status:'new', date:new Date().toISOString()});
      setCart([]);
      alert('Заказ оформлен! Номер: ' + r.order_number);
      nav('#/track/'+r.order_number);
    } else {
      alert('Ошибка оформления заказа');
    }
  }).catch(function(){alert('Ошибка соединения. Попробуйте позже.')});
};

// === Init ===
route();
})();
