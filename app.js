// F2 app.js v4 — Base44 proxy primary + vlvc.ru fallback
var PROXY_PRODUCTS="https://lyra-15172d69.base44.app/functions/proxyProducts";
var PROXY_ORDER="https://lyra-15172d69.base44.app/functions/proxyOrder";
var VPS_PRODUCTS="https://vlvc.ru/api/v1/products";
var VPS_ORDER="https://vlvc.ru/api/v1/Order";
var TIMEOUT_MS=8000;var CACHE_TTL=60000;
if(typeof Promise.any!=="function"){Promise.any=function(promises){return new Promise((resolve,reject)=>{var errors=[];var remaining=promises.length;if(remaining===0){reject(new Error("empty"));return;}promises.forEach(function(p,i){Promise.resolve(p).then(function(v){resolve(v);}).catch(function(e){errors[i]=e;if(--remaining===0)reject(new Error("all rejected"));});});});};}
function gc(k){try{var c=localStorage.getItem(k);if(!c)return null;var p=JSON.parse(c);if(Date.now()-p.ts<CACHE_TTL)return p.data;localStorage.removeItem(k);}catch(e){}return null;}
function sc(k,d){try{localStorage.setItem(k,JSON.stringify({data:d,ts:Date.now()}));}catch(e){}}
async function fetchProducts(){var ck="alko_products";var cached=gc(ck);if(cached)return cached;
// Try Base44 proxy first
try{var r=await fetch(PROXY_PRODUCTS,{method:"GET"});if(r.ok){var d=await r.json();var items=d.items||d;if(items&&items.length>0){sc(ck,items);return items;}}}catch(e){console.log("[proxy] fail: "+e.message);}
// Fallback to vlvc.ru
try{var r2=await fetch(VPS_PRODUCTS,{method:"GET"});if(r2.ok){var d2=await r2.json();if(d2&&d2.length>0){sc(ck,d2);return d2;}}}catch(e){console.log("[vps] fail: "+e.message);}
// Last resort: expired cache
var ex=localStorage.getItem(ck);if(ex)return JSON.parse(ex).data;
throw new Error("All sources failed");}
async function sendOrder(orderData){
// Try Base44 proxy first
try{var r=await fetch(PROXY_ORDER,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(orderData)});if(r.ok){var d=await r.json();if(d&&!d.error)return d;}}catch(e){console.log("[proxy order] fail: "+e.message);}
// Fallback to vlvc.ru
try{var r2=await fetch(VPS_ORDER,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(orderData)});if(r2.ok){var d2=await r2.json();if(d2&&!d2.error)return d2;}}catch(e){console.log("[vps order] fail: "+e.message);}
throw new Error("Order failed");}
var cart=[];
function addToCart(id,name,price){cart.push({id:id,name:name,price:price});updateCart();}
function updateCart(){var el=document.getElementById("cart-count");if(el)el.textContent=cart.length;var t=cart.reduce(function(s,i){return s+i.price;},0);var te=document.getElementById("cart-total");if(te)te.textContent=t+"\u20bd";}
function genKey(){return Math.random().toString(36).substring(2,10)+Math.random().toString(36).substring(2,10);}
async function checkout(){if(cart.length===0){alert("\u041a\u043e\u0440\u0437\u0438\u043d\u0430 \u043f\u0443\u0441\u0442\u0430");return;}var phone=prompt("\u0412\u0432\u0435\u0434\u0438\u0442\u0435 \u0442\u0435\u043b\u0435\u0444\u043e\u043d:");if(!phone)return;var total=cart.reduce(function(s,i){return s+i.price;},0);var ordNum="ORD-"+Date.now();var od={order_number:ordNum,secret_key:genKey(),status:"new",customer_name:phone,phone:phone,total:total,items:JSON.stringify(cart),district:document.body.dataset.district||"\u0421\u041f\u0431"};try{var res=await sendOrder(od);alert("\u0417\u0430\u043a\u0430\u0437 \u043e\u0444\u043e\u0440\u043c\u043b\u0435\u043d! \u2116 "+ordNum);cart=[];updateCart();}catch(e){alert("\u041e\u0448\u0438\u0431\u043a\u0430: "+e.message);}}
async function renderCatalog(){var c=document.getElementById("catalog");try{c.innerHTML='<div class="loading">\u0417\u0430\u0433\u0440\u0443\u0437\u043a\u0430...</div>';var items=await fetchProducts();console.log("[catalog] "+(items?items.length:0)+" items");if(!items||items.length===0){c.innerHTML='<div class="loading">\u0422\u043e\u0432\u0430\u0440\u044b \u0432\u0440\u0435\u043c\u0435\u043d\u043d\u043e \u043e\u0442\u0441\u0443\u0442\u0441\u0442\u0432\u0443\u044e\u0442.</div>';return;}c.innerHTML="";items.filter(function(i){return i.in_stock;}).slice(0,24).forEach(function(i){var d=document.createElement("div");d.className="card";var img=i.photo_url?'<img src="https://vlvc.ru'+i.photo_url+'" loading="lazy" alt="'+i.name+'" onerror="this.style.display=\'none\'">':"";var badges='<span class="badge">'+(i.category||"\u041f\u0440\u043e\u0434\u0443\u043a\u0446\u0438\u044f")+"</span>";if(i.brand)badges+='<span class="badge">'+i.brand+"</span>";var price='<div class="price">'+i.price+"\u20bd</div>";var old=i.old_price?'<span class="old">'+i.old_price+"\u20bd</span>":"";var safeName=(i.name||"").replace(/'/g,"").replace(/"/g,"&quot;");var btn='<button class="btn" onclick="addToCart('+i.id+",&quot;"+safeName+"&quot;,"+i.price+')">\u0412 \u043a\u043e\u0440\u0437\u0438\u043d\u0443</button>';d.innerHTML=img+"<h3>"+i.name+"</h3>"+badges+"<p>"+(i.description||"")+"</p>"+price+old+btn;c.appendChild(d);});}catch(e){console.error("[ERROR]",e);c.innerHTML='<div class="loading">\u041e\u0448\u0438\u0431\u043a\u0430: '+e.message+'</div>';}}
renderCatalog();
