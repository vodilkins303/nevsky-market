// app.js v7 — DIRECT vlvc.ru only. No Base44. Timeout 8s + 1 retry on fail.
var API_PRODUCTS="https://vlvc.ru/api/v1/products";
var API_ORDER="https://vlvc.ru/api/v1/Order";
var IMG_BASE="https://vlvc.ru";
var TIMEOUT_MS=8000;var CACHE_TTL=300000;
function fetchWithTimeout(url,opts,ms){var ctrl=new AbortController();var timer=setTimeout(function(){ctrl.abort();},ms);return fetch(url,Object.assign({},opts,{signal:ctrl.signal})).then(function(r){clearTimeout(timer);if(!r.ok)throw new Error("HTTP "+r.status);return r;}).catch(function(e){clearTimeout(timer);throw e;});}
function gc(k){try{var c=localStorage.getItem(k);if(!c)return null;var p=JSON.parse(c);if(Date.now()-p.ts<CACHE_TTL)return p.data;localStorage.removeItem(k);}catch(e){}return null;}
function sc(k,d){try{localStorage.setItem(k,JSON.stringify({data:d,ts:Date.now()}));}catch(e){}}
async function fetchOnce(){var r=await fetchWithTimeout(API_PRODUCTS,{method:"GET"},TIMEOUT_MS);var d=await r.json();return Array.isArray(d)?d:(d.items||[]);}
async function fetchProducts(){var ck="alko_products";var cached=gc(ck);if(cached)return cached;
try{var items=await fetchOnce();if(items&&items.length>0){sc(ck,items);return items;}}catch(e){console.log("[fetchProducts] attempt1 fail: "+e.message);}
try{var items2=await fetchOnce();if(items2&&items2.length>0){sc(ck,items2);return items2;}}catch(e2){console.log("[fetchProducts] attempt2 fail: "+e2.message);}
var ex=localStorage.getItem(ck);if(ex){try{return JSON.parse(ex).data;}catch(e3){}}
throw new Error("Каталог временно недоступен");}
async function sendOrder(orderData){
for(var attempt=0;attempt<2;attempt++){
try{var r=await fetchWithTimeout(API_ORDER,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(orderData)},TIMEOUT_MS);var d=await r.json();if(d&&!d.error)return d;}catch(e){console.log("[sendOrder] attempt"+(attempt+1)+" fail: "+e.message);}
}
throw new Error("Ошибка оформления заказа");}
var cart=[];
function addToCart(id,name,price){cart.push({id:id,name:name,price:price});updateCart();}
function updateCart(){var el=document.getElementById("cart-count");if(el)el.textContent=cart.length;var t=cart.reduce(function(s,i){return s+i.price;},0);var te=document.getElementById("cart-total");if(te)te.textContent=t+"\u20bd";}
function genKey(){return Math.random().toString(36).substring(2,10)+Math.random().toString(36).substring(2,10);}
async function checkout(){if(cart.length===0){alert("Корзина пуста");return;}var phone=prompt("Введите телефон:");if(!phone)return;var total=cart.reduce(function(s,i){return s+i.price;},0);var ordNum="ORD-"+Date.now();var od={order_number:ordNum,secret_key:genKey(),status:"new",customer_name:phone,phone:phone,total:total,items:JSON.stringify(cart),district:document.body.dataset.district||"СПб"};try{var res=await sendOrder(od);alert("Заказ оформлен! № "+ordNum);cart=[];updateCart();}catch(e){alert("Ошибка: "+e.message);}}
async function renderCatalog(){var c=document.getElementById("catalog");try{c.innerHTML='<div class="loading">Загрузка...</div>';var items=await fetchProducts();console.log("[catalog] "+(items?items.length:0)+" items");if(!items||items.length===0){c.innerHTML='<div class="loading">Товары временно отсутствуют.</div>';return;}c.innerHTML="";items.filter(function(i){return i.in_stock;}).slice(0,24).forEach(function(i){var d=document.createElement("div");d.className="card";var img=i.photo_url?'<img src="'+IMG_BASE+i.photo_url+'" loading="lazy" alt="'+i.name+'" onerror="this.style.display=\'none\'">':"";var badges='<span class="badge">'+(i.category||"Продукция")+"</span>";if(i.brand)badges+='<span class="badge">'+i.brand+"</span>";var price='<div class="price">'+i.price+"\u20bd</div>";var old=i.old_price?'<span class="old">'+i.old_price+"\u20bd</span>":"";var safeName=(i.name||"").replace(/'/g,"").replace(/"/g,"&quot;");var btn='<button class="btn" onclick="addToCart('+i.id+",&quot;"+safeName+"&quot;,"+i.price+')">В корзину</button>';d.innerHTML=img+"<h3>"+i.name+"</h3>"+badges+"<p>"+(i.description||"")+"</p>"+price+old+btn;c.appendChild(d);});}catch(e){console.error("[ERROR]",e);c.innerHTML='<div class="loading">Ошибка: '+e.message+'</div>';}}
renderCatalog();
