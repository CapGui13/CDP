// Network-first public-only cache. No tokens, API requests or private drafts.
const CACHE="cdp-public-2026-11-26-canonical-season-audit-v1";
const ASSETS=["./","./index.html","./manifest.webmanifest","./icon.svg","./data/published.json",...["center-names","auto-import","club-centers","sync","persistence","presentation","provisional","publication","ranking","query-import","session-sync","ffb-browser","github-publish","qualification-details","ranking-tools","sport-dashboard","sport-ui","race-tools","race-ui","xlsx-export"].map(n=>"./src/"+n+".mjs")];
const scope=new URL(self.registration.scope);
const allowed=new Set(ASSETS.map(a=>new URL(a,scope).pathname));
self.addEventListener("install",event=>event.waitUntil(caches.open(CACHE).then(async cache=>{await cache.addAll(ASSETS);await self.skipWaiting();})));
self.addEventListener("activate",event=>event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith("cdp-public-")&&k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
self.addEventListener("fetch",event=>{
 const req=event.request,url=new URL(req.url);
 if(req.method!=="GET"||url.origin!==scope.origin||!allowed.has(url.pathname)||req.headers.has("Authorization"))return;
 const key=new URL(url.pathname,url.origin).href;
 event.respondWith((async()=>{
  const cache=await caches.open(CACHE);
  try{const response=await fetch(req,{cache:"no-store"});if(response.ok&&response.type==="basic"){try{await cache.put(key,response.clone());}catch{}}return response;}
  catch(e){const cached=await cache.match(key);if(!cached)throw e;if(url.pathname.endsWith("/data/published.json")){const headers=new Headers(cached.headers);headers.set("X-CDP-Offline","1");return new Response(await cached.blob(),{status:200,headers});}return cached;}
 })());
});