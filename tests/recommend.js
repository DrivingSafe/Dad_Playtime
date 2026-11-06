// 카드 탐색(화살표·스와이프)·고르기 버튼 통일·추천 점검 (폰 에뮬레이션)
const {chromium,devices}=require('playwright');const http=require('http');const fs=require('fs');const path=require('path');
const root=path.resolve(__dirname,'..');
const srv=http.createServer((q,r)=>{const f=path.join(root,decodeURIComponent(q.url.split('?')[0]).replace(/\/$/,'/index.html'));
  fs.readFile(f,(e,d)=>{if(e){r.writeHead(404);r.end()}else{r.writeHead(200,{'content-type':f.endsWith('.json')?'application/json':'text/html; charset=utf-8'});r.end(d)}})});
let fails=0;const ok=(c,m)=>{console.log((c?'PASS ':'FAIL ')+m);if(!c)fails++};
(async()=>{
 await new Promise(r=>srv.listen(0,r));const url='http://localhost:'+srv.address().port+'/';
 const b=await chromium.launch();const ctx=await b.newContext({...devices['Pixel 7'],hasTouch:true});const p=await ctx.newPage();const errs=[];p.on('pageerror',e=>errs.push(e.message));
 await p.goto(url);await p.waitForTimeout(600);
 await p.click('[data-ssex="f"]');await p.click('[data-srole="dad"]');await p.click('#ssave');await p.waitForTimeout(900);
 await p.evaluate(()=>{const d=new Date();d.setMonth(d.getMonth()-28);S.cfg.birth=ymd(d);E.picked=false;render()});await p.waitForTimeout(300);
 const title=()=>p.textContent('.hero .order');const count=()=>p.textContent('.navcount');
 // ---- 탐색 ----
 const t0=await title(),c0=await count();
 const m0=c0.trim().match(/^(\d+) \/ (\d+) · 추천$/);ok(!!m0,'처음엔 추천 카드: '+c0);
 const i0=Number(m0[1]),N=Number(m0[2]);
 await p.click('[data-cnav="1"]');await p.waitForTimeout(250);
 const t1=await title();ok(t1!==t0,'› 로 다음 놀이');ok(new RegExp('^'+(i0%N+1)+' / '+N+' · 내가 고름').test((await count()).trim()),'카운터 '+(i0%N+1)+'번째·내가 고름');
 await p.click('[data-cnav="-1"]');await p.waitForTimeout(250);ok(await title()===t0,'‹ 로 이전 놀이');
 // 처음(1번)으로 보낸 뒤 ‹ 하면 마지막으로 순환
 await p.evaluate(()=>{E.cardId=ranked()[0].id;E.picked=true;render()});await p.waitForTimeout(200);
 await p.click('[data-cnav="-1"]');await p.waitForTimeout(250);
 ok(new RegExp('^'+N+' / '+N).test((await count()).trim()),'1번에서 ‹ 하면 마지막으로 순환 ('+N+')');
 await p.click('[data-crec]');await p.waitForTimeout(250);ok(await title()===t0&&/추천/.test(await count()),'추천 놀이로 돌아가기');
 // 스와이프
 await p.evaluate(()=>{const h=document.getElementById('herocard');const mk=(t,x)=>new TouchEvent(t,{bubbles:true,changedTouches:[new Touch({identifier:1,target:h,clientX:x,clientY:300})],touches:t==='touchend'?[]:[new Touch({identifier:1,target:h,clientX:x,clientY:300})]});h.dispatchEvent(mk('touchstart',300));h.dispatchEvent(mk('touchend',120))});
 await p.waitForTimeout(300);ok(await title()!==t0,'왼쪽으로 스와이프 → 다음 놀이');
 await p.click('[data-crec]');await p.waitForTimeout(250);
 // ---- 버튼 통일 ----
 await p.evaluate(()=>{E.op.lib=true;E.op.rec=true;render()});await p.waitForTimeout(300);
 const geo=await p.evaluate(()=>[...document.querySelectorAll('.pickrow')].map(r=>{const b=r.querySelector('.pickbtn').getBoundingClientRect(),rr=r.getBoundingClientRect();return{w:Math.round(b.width),gap:Math.round(rr.right-b.right),h:Math.round(b.height)}}));
 ok(geo.length>=5,'고르기 줄 '+geo.length+'개 (추천+도감)');
 ok(new Set(geo.map(x=>x.gap)).size===1,'모든 고르기 버튼의 오른쪽 위치 동일 (여백 '+[...new Set(geo.map(x=>x.gap))]+')');
 ok(new Set(geo.map(x=>x.w)).size===1,'모든 고르기 버튼 폭 동일 ('+[...new Set(geo.map(x=>x.w))]+'px)');
 ok(geo.every(x=>x.h>=34),'고르기 버튼 높이 충분 ('+Math.min(...geo.map(x=>x.h))+'px)');
 ok(await p.evaluate(()=>document.querySelectorAll('.pickrow .picked').length===1),'선택된 카드는 같은 자리에 "선택됨" 하나');
 // ---- 추천 ----
 await p.evaluate(()=>{
  S.plays=[];const now=Date.now(),mk=(card,daysAgo,r)=>({id:'t'+card+daysAgo,card,mins:15,ts:now-daysAgo*864e5,date:ymd(new Date(now-daysAgo*864e5)),r});
  // 최근 2주: 신체·인지만 반복, 언어·사회 0번
  ['follow','freeze','lid','stool'].forEach((c,i)=>S.plays.push(mk(c,i+6,0)));
  S.plays.push(mk('draw',1,2)); // 어제 힘들어한 놀이
  E.picked=false;E.cardId=null;render();
 });await p.waitForTimeout(300);
 const rec=await p.evaluate(()=>recommend(5).map(r=>({id:r.c.id,doms:r.c.doms,why:r.why})));
 ok(rec.length===5,'추천 5개 생성');
 ok(rec.slice(0,3).some(r=>r.doms.includes('lang')||r.doms.includes('soc')),'기록이 적은 영역(언어·사회) 놀이가 상위 추천 ('+rec.slice(0,3).map(r=>r.id).join(',')+')');
 ok(!rec.some(r=>r.id==='draw'),'어제 한 놀이는 추천에서 제외');
 ok(rec.every(r=>r.why.length>=1),'모든 추천에 이유 표시');
 const txt=await p.textContent('[data-k="rec"]');ok(/더 해볼 놀이 추천/.test(txt)&&/최근 2주 영역별 놀이/.test(txt),'추천 영역 표시');
 ok(/언어·의사소통 0/.test(txt)&&/사회·정서 0/.test(txt),'영역별 횟수 표시 (언어 0, 사회 0)');
 // 힘들어함 반영
 const hard=await p.evaluate(()=>{S.plays.unshift({id:'hh',card:'book',mins:15,ts:Date.now()-8*864e5,date:ymd(new Date(Date.now()-8*864e5)),r:2});return recommend(60).find(r=>r.c.id==='book')});
 ok(!hard||hard.why.some(w=>/힘들어/.test(w)),'힘들어한 놀이에는 짧게 해보기 안내');
 ok(!errs.length,'페이지 오류 없음 '+errs);
 await b.close();srv.close();process.exit(fails?1:0);
})();
