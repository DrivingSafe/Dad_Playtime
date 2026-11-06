// 모바일 점검: 폰 폭으로 렌더되는지(viewport), 표준 모드인지, 가로 스크롤·잘림이 없는지, 터치 대상이 충분히 큰지
const {chromium,devices}=require('playwright');const http=require('http');const fs=require('fs');const path=require('path');
const root=path.resolve(__dirname,'..');
const srv=http.createServer((q,r)=>{const f=path.join(root,decodeURIComponent(q.url.split('?')[0]).replace(/\/$/,'/index.html'));
  fs.readFile(f,(e,d)=>{if(e){r.writeHead(404);r.end()}else{r.writeHead(200,{'content-type':f.endsWith('.json')?'application/json':'text/html; charset=utf-8'});r.end(d)}})});
let fails=0;const ok=(c,m)=>{console.log((c?'PASS ':'FAIL ')+m);if(!c)fails++};
(async()=>{
 await new Promise(r=>srv.listen(0,r));const url='http://localhost:'+srv.address().port+'/';
 const b=await chromium.launch();
 for(const name of ['Pixel 7','iPhone 13','Galaxy S9+']){
  const ctx=await b.newContext({...devices[name]});const p=await ctx.newPage();const errs=[];p.on('pageerror',e=>errs.push(e.message));
  await p.goto(url);await p.waitForTimeout(700);
  const w=devices[name].viewport.width;
  const g=await p.evaluate(()=>({iw:innerWidth,mode:document.compatMode,sw:document.documentElement.scrollWidth,lang:document.documentElement.lang}));
  ok(g.iw===w,name+' 화면 폭 '+g.iw+' = '+w);ok(g.mode==='CSS1Compat',name+' 표준 모드');ok(g.sw<=g.iw,name+' 가로 스크롤 없음 ('+g.sw+')');ok(g.lang==='ko',name+' lang=ko');
  await p.click('[data-ssex="f"]');await p.click('[data-srole="dad"]');await p.click('#ssave');await p.waitForTimeout(700);
  for(const t of ['dad','check','grow','conf']){
    await p.click(`[data-tab="${t}"]`);await p.waitForTimeout(250);
    const r=await p.evaluate(()=>{const iw=innerWidth;const bad=[];document.querySelectorAll('#main button,#main summary,nav button,.pill-btn').forEach(e=>{const b=e.getBoundingClientRect();if(!b.width||!b.height)return;if(b.right>iw+1||b.left<-1)bad.push('넘침:'+(e.textContent||'').trim().slice(0,10));if(b.height<32)bad.push('작음:'+(e.textContent||'').trim().slice(0,10)+Math.round(b.height))});return{sw:document.documentElement.scrollWidth,iw,bad}});
    ok(r.sw<=r.iw&&!r.bad.length,name+' '+t+' 탭 가로 넘침·작은 버튼 없음 '+(r.bad.slice(0,4).join(',')));
  }
  ok(!errs.length,name+' 페이지 오류 없음 '+errs);await ctx.close();
 }
 await b.close();srv.close();process.exit(fails?1:0);
})();
