// PWA 점검: 매니페스트·아이콘·서비스 워커 등록·오프라인 재방문
const {chromium}=require('playwright');const http=require('http');const fs=require('fs');const path=require('path');
const root=path.resolve(__dirname,'..');const T={json:'application/json',webmanifest:'application/manifest+json',png:'image/png',js:'text/javascript',html:'text/html; charset=utf-8',svg:'image/svg+xml'};
const srv=http.createServer((q,r)=>{const f=path.join(root,decodeURIComponent(q.url.split('?')[0]).replace(/\/$/,'/index.html'));
  fs.readFile(f,(e,d)=>{if(e){r.writeHead(404);r.end()}else{r.writeHead(200,{'content-type':T[f.split('.').pop()]||'text/plain'});r.end(d)}})});
let fails=0;const ok=(c,m)=>{console.log((c?'PASS ':'FAIL ')+m);if(!c)fails++};
(async()=>{
 await new Promise(r=>srv.listen(0,r));const url='http://localhost:'+srv.address().port+'/';
 const m=JSON.parse(fs.readFileSync(path.join(root,'manifest.webmanifest')));
 ok(m.display==='standalone'&&m.start_url&&m.name&&m.short_name,'매니페스트 필수 항목');
 for(const i of m.icons){const f=path.join(root,i.src);const [w]=i.sizes.split('x').map(Number);
  const buf=fs.existsSync(f)?fs.readFileSync(f):null;ok(buf&&buf.readUInt32BE(16)===w,'아이콘 '+i.src+' '+i.sizes)}
 const b=await chromium.launch();const ctx=await b.newContext();const p=await ctx.newPage();
 const errs=[];p.on('pageerror',e=>errs.push(e.message));
 await p.goto(url);await p.waitForTimeout(500);
 ok(await p.evaluate(()=>!!document.querySelector('link[rel=manifest]')),'manifest 링크');
 const reg=await p.evaluate(async()=>{const r=await navigator.serviceWorker.ready;return !!r.active});ok(reg,'서비스 워커 활성화');
 await p.reload();await p.waitForTimeout(500);
 ok(await p.evaluate(()=>!!navigator.serviceWorker.controller),'서비스 워커가 페이지 제어');
 // 데이터 하나 저장 후 오프라인 재방문
 await p.click('[data-ssex="m"]');await p.click('[data-srole="dad"]');await p.click('#ssave');await p.waitForTimeout(300);
 await ctx.setOffline(true);await p.reload();await p.waitForTimeout(700);
 ok((await p.textContent('#main')).length>50,'오프라인에서 화면 열림');
 ok(await p.evaluate(()=>S.cfg.sex==='m'&&E.role==='dad'),'오프라인에서 저장 데이터 유지');
 ok(await p.evaluate(()=>Object.keys(S.ref).length===4),'오프라인에서 WHO 표 사용');
 ok(!errs.length,'페이지 오류 없음 '+errs);
 await b.close();srv.close();process.exit(fails?1:0);
})();
