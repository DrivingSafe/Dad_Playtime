// 월령별 이정표 세트·놀이 카드 풀·역할별 탭 점검
const {chromium,devices}=require('playwright');const http=require('http');const fs=require('fs');const path=require('path');
const root=path.resolve(__dirname,'..');
const srv=http.createServer((q,r)=>{const f=path.join(root,decodeURIComponent(q.url.split('?')[0]).replace(/\/$/,'/index.html'));
  fs.readFile(f,(e,d)=>{if(e){r.writeHead(404);r.end()}else{r.writeHead(200,{'content-type':f.endsWith('.json')?'application/json':'text/html; charset=utf-8'});r.end(d)}})});
let fails=0;const ok=(c,m)=>{console.log((c?'PASS ':'FAIL ')+m);if(!c)fails++};
const setup=async p=>{await p.click('[data-ssex="f"]');await p.click('[data-srole="dad"]');await p.click('#ssave');await p.waitForTimeout(800)};
(async()=>{
 await new Promise(r=>srv.listen(0,r));const url='http://localhost:'+srv.address().port+'/';
 const b=await chromium.launch();
 // ---- A. 공개(개발자 모드 꺼짐): 확인된 세트(30·36)만 ----
 {
  const ctx=await b.newContext({...devices['Pixel 7']});const p=await ctx.newPage();const errs=[];p.on('pageerror',e=>errs.push(e.message));
  await p.goto(url);await p.waitForTimeout(600);await setup(p);
  const at=async mo=>p.evaluate(m=>{const d=new Date();d.setMonth(d.getMonth()-m);S.cfg.birth=ymd(d);E.picked=false;render();return{set:CURSET,n:MS.length,ids:MS.map(x=>x.id),pool:cardPool().map(c=>c.id),ages:setAges()}},mo);
  let r=await at(20);ok(r.set===30&&r.ages.join()==='30,36','공개: 20개월은 30개월 세트 ('+r.set+')');
  ok(!r.ids.some(i=>/^x(18|24)/.test(i)),'공개: 초안(18·24) 이정표 없음');
  ok(!r.pool.some(id=>['push18','scribble18'].includes(id)),'공개: 초안 카드 없음');
  r=await at(32);ok(r.set===30&&r.n===15,'공개: 32개월 30개월 세트 15개');
  r=await at(40);ok(r.set===36&&r.n===12,'공개: 40개월 36개월 세트 12개 ('+r.n+')');
  ok(r.pool.includes('beads')&&r.pool.includes('whyq')&&!r.pool.includes('book'),'공개: 40개월 카드 풀은 36개월용');
  r=await at(28);ok(r.pool.includes('book')&&!r.pool.includes('beads'),'공개: 28개월 카드 풀은 24~35개월용');
  // 체크 탭 화면
  await p.evaluate(()=>{const d=new Date();d.setMonth(d.getMonth()-40);S.cfg.birth=ymd(d);E.tab='check';render()});await p.waitForTimeout(300);
  ok((await p.textContent('#main')).includes('36개월 이정표')&&!(await p.textContent('#main')).includes('미리보기'),'공개: 36개월 체크 화면, 다음 세트 없어 미리보기 숨김');
  await p.evaluate(()=>{const d=new Date();d.setMonth(d.getMonth()-31);S.cfg.birth=ymd(d);render()});await p.waitForTimeout(300);
  ok((await p.textContent('#main')).includes('36개월 이정표 미리보기'),'공개: 31개월에 36개월 미리보기');
  ok(!errs.length,'페이지 오류 없음 '+errs);await ctx.close();
 }
 // ---- B. 개발자 모드: 18·24 초안 포함 ----
 {
  const ctx=await b.newContext({...devices['Pixel 7']});const p=await ctx.newPage();const errs=[];p.on('pageerror',e=>errs.push(e.message));
  await p.goto(url+'?dev=1');await p.waitForTimeout(700);await setup(p);
  const at=async mo=>p.evaluate(m=>{const d=new Date();d.setMonth(d.getMonth()-m);S.cfg.birth=ymd(d);E.picked=false;E.tab='check';render();return{set:CURSET,draft:!MSETS[CURSET].ready,pool:cardPool().map(c=>c.id)}},mo);
  let r=await at(20);ok(r.set===18&&r.draft,'개발자: 20개월 → 18개월 초안 세트');
  ok(r.pool.includes('push18'),'개발자: 18개월대 초안 카드 포함');
  ok((await p.textContent('#main')).includes('원문 대조 전 초안'),'개발자: 초안 표시 문구');
  r=await at(26);ok(r.set===24&&r.draft,'개발자: 26개월 → 24개월 초안 세트');
  r=await at(32);ok(r.set===30&&!r.draft,'개발자: 32개월 → 30개월 세트');
  r=await at(40);ok(r.set===36,'개발자: 40개월 → 36개월 세트');
  // 초안 끄기 → 공개와 동일
  await p.evaluate(()=>{DEV.draft=false;const d=new Date();d.setMonth(d.getMonth()-20);S.cfg.birth=ymd(d);render()});
  ok(await p.evaluate(()=>CURSET===30),'개발자: 초안 끄면 공개와 같음');
  await p.evaluate(()=>{DEV.draft=true});
  // ---- 역할별 탭 ----
  const vis=async()=>p.evaluate(()=>[...document.querySelectorAll('nav button')].filter(b=>!b.hidden).map(b=>b.dataset.tab).join());
  await p.click('#devtog');await p.waitForTimeout(200);
  await p.click('[data-dview="all"]');await p.waitForTimeout(300);ok(await vis()==='dad,check,grow,mom','개발자 전체: 4개 탭 ('+await vis()+')');
  await p.click('[data-dview="dad"]');await p.waitForTimeout(300);ok(await vis()==='dad,check,grow','아빠 보기: 엄마의 눈 숨김');
  await p.click('[data-dview="mom"]');await p.waitForTimeout(300);ok(await vis()==='check,grow,mom','엄마 보기: 아빠의 놀이 숨김');
  ok(await p.evaluate(()=>E.tab==='mom'||E.tab==='check'||E.tab==='grow'),'엄마 보기: 보이지 않는 탭에 머물지 않음');
  ok(!errs.length,'페이지 오류 없음 '+errs);await ctx.close();
 }
 await b.close();srv.close();process.exit(fails?1:0);
})();
