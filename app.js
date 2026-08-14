// app.js v9 — 6 router domains Promise.any + lite/full fallback + skeleton
var DOMAINS=["vlvc.ru","klan-bro.ru","broklan.xyz","broklan.lol","klanup.lol","klan1.lol"];
var ROUTERS=[];
DOMAINS.forEach(function(d){ROUTERS.push("https://"+d+"/api/v1/products/lite");ROUTERS.push("https://"+d+"/api/v1/products");});
var IMG_BASE="https://vlvc.ru";
var TIMEOUT_MS=8000;var CACHE_TTL=300000;
if(typeof Promise!=="undefined"&&!Promise.any){Promise.any=function(ps){return new Promise(function(resolve,reject){var errs=[];var n=ps.length;if(n===0){reject(new Error("empty"));return;}ps.forEach(function(p,i){Promise.resolve(p).then(resolve).catch(function(e){errs[i]=e;if(--n===0)reject(new Error("all rejected"));});});});};}
function fetchWithTimeout(url,ms){var ctrl=new AbortController();var timer=setTimeout(function(){ctrl.abort();},ms);return fetch(url,{method:"GET",signal:ctrl.signal}).then(function(r){clearTimeout(timer);if(!r.ok)throw new Error("HTTP "+r.status);return r;}).catch(function(e){clearTimeout(timer);throw e;});}
function gc(k){try{var c=localStorage.getItem(k);if(!c)return null;var p=JSON.parse(c);if(Date.now()-p.ts<CACHE_TTL)return p.data;localStorage.removeItem(k);}catch(e){}return null;}
function sc(k,d){try{localStorage.setItem(k,JSON.stringify({data:d,ts:Date.now()}));}catch(e){}}
async function fetchOne(url){var r=await fetchWithTimeout(url,TIMEOUT_MS);var d=await r.json();return Array.isArray(d)?d:(d.items||[]);}
async function fetchProducts(){var ck="alko_v9";var cached=gc(ck);if(cached)return cached;
try{var promises=ROUTERS.map(function(u){return fetchOne(u).then(function(items){if(items&&items.length>0)return items;throw new Error("empty");});});var items=await Promise.any(promises);if(items&&items.length>0){sc(ck,items);return items;}}catch(e){console.log("[Promise.any] all fail: "+e.message);}
for(var i=0;i<ROUTERS.length;i++){try{var items2=await fetchOne(ROUTERS[i]);if(items2&&items2.length>0){sc(ck,items2);return items2;}}catch(e2){console.log("[fallback] "+ROUTERS[i]+" fail: "+e2.message);}}
var ex=localStorage.getItem(ck);if(ex){try{return JSON.parse(ex).data;}catch(e3){}}
throw new Error("Каталог недоступен");}
async function sendOrder(orderData){for(var a=0;a<2;a++){for(var di=0;di<DOMAINS.length;di++){try{var r=await fetchWithTimeout("https://"+DOMAINS[di]+"/api/v1/Order",TIMEOUT_MS*2);var d=await r.json();if(d&&!d.error)return d;}catch(e){console.log("[order] "+DOMAINS[di]+" fail: "+e.message);}}}throw new Error("Ошибка заказа");}
var cart=[];
function addToCart(id,name,price){cart.push({id:id,name:name,price:price});updateCart();}
function updateCart(){var el=document.getElementById("cart-count");if(el)el.textContent=cart.length;var t=cart.reduce(function(s,i){return s+i.price;},0);var te=document.getElementById("cart-total");if(te)te.textContent=t+"\u20bd";}
function genKey(){return Math.random().toString(36).substring(2,10)+Math.random().toString(36).substring(2,10);}
async function checkout(){if(cart.length===0){alert("Корзина пуста");return;}var phone=prompt("Введите телефон:");if(!phone)return;var total=cart.reduce(function(s,i){return s+i.price;},0);var ordNum="ORD-"+Date.now();var od={order_number:ordNum,secret_key:genKey(),status:"new",customer_name:phone,phone:phone,total:total,items:JSON.stringify(cart),district:document.body.dataset.district||"СПб"};try{await sendOrder(od);alert("Заказ оформлен! № "+ordNum);cart=[];updateCart();}catch(e){alert("Ошибка: "+e.message);}}
function skeleton(){var s="";for(var i=0;i<8;i++){s+='<div class="card skeleton-card"><div class="skel-img"></div><div class="skel-line w80"></div><div class="skel-line w50"></div><div class="skel-line w30"></div></div>';}return s;}
async function renderCatalog(){var c=document.getElementById("catalog");try{c.innerHTML=skeleton();var items=await fetchProducts();if(!items||items.length===0){c.innerHTML='<div class="loading">Товары временно отсутствуют.</div>';return;}c.innerHTML="";items.filter(function(i){return i.in_stock;}).slice(0,24).forEach(function(i){var d=document.createElement("div");d.className="card";var img=i.photo_url?'<img src="'+IMG_BASE+i.photo_url+'" loading="lazy" alt="'+i.name+'" onerror="this.style.display=\'none\'">':"";var badges='<span class="badge">'+(i.category||"Продукция")+"</span>";if(i.brand)badges+='<span class="badge">'+i.brand+"</span>";var price='<div class="price">'+i.price+"\u20bd</div>";var old=i.old_price?'<span class="old">'+i.old_price+"\u20bd</span>":"";var safeName=(i.name||"").replace(/'/g,"").replace(/"/g,"&quot;");var safeId="'"+i.id+"'";var btn='<button class="btn" onclick="addToCart('+safeId+",&quot;"+safeName+"&quot;,"+i.price+')">В корзину</button>';d.innerHTML=img+"<h3>"+i.name+"</h3>"+badges+"<p>"+(i.description||"")+"</p>"+price+old+btn;c.appendChild(d);});}catch(e){console.error("[ERROR]",e);c.innerHTML='<div class="loading">Ошибка: '+e.message+'</div>';}}
renderCatalog();
