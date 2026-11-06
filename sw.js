/* 서비스 워커: 앱 본체와 WHO 표를 캐시해 오프라인에서도 열리게 한다.
   index.html 을 고칠 때마다 VERSION 을 올려야 기존 설치본이 새 버전으로 바뀐다. */
const VERSION='dpn-v0.11';
const SHELL=['./','./index.html','./manifest.webmanifest','./icons/icon-192.png','./icons/icon-512.png','./icons/apple-touch-icon.png',
  './data/tools.json','./data/who/doc_wfa_m.json','./data/who/doc_wfa_f.json','./data/who/doc_lfa_m.json','./data/who/doc_lfa_f.json'];
self.addEventListener('install',e=>{e.waitUntil(caches.open(VERSION).then(c=>c.addAll(SHELL)).then(()=>self.skipWaiting()))});
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(ks=>Promise.all(ks.filter(k=>k!==VERSION).map(k=>caches.delete(k)))).then(()=>self.clients.claim()))});
self.addEventListener('fetch',e=>{
  const r=e.request;if(r.method!=='GET')return;
  const u=new URL(r.url);
  if(u.origin!==location.origin)return; // 구글 폰트 등 외부는 브라우저 기본 동작 (오프라인이면 시스템 글꼴)
  // 화면(index.html)은 네트워크 우선, 실패하면 캐시. 나머지는 캐시 우선.
  if(r.mode==='navigate'){
    e.respondWith(fetch(r).then(res=>{const cp=res.clone();caches.open(VERSION).then(c=>c.put('./index.html',cp));return res}).catch(()=>caches.match('./index.html')));
    return;
  }
  e.respondWith(caches.match(r).then(h=>h||fetch(r).then(res=>{if(res.ok){const cp=res.clone();caches.open(VERSION).then(c=>c.put(r,cp))}return res})));
});
