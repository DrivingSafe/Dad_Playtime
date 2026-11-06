// 카드 탐색(화살표·드래그 스와이프·뒤 카드)·고르기 버튼 통일·추천 점검 (폰 에뮬레이션)
const {chromium,devices}=require('playwright');const http=require('http');const fs=require('fs');const path=require('path');
const root=path.resolve(__dirname,'..');
const srv=http.createServer((q,r)=>{const f=path.join(root,decodeURIComponent(q.url.split('?')[0]).replace(/\/$/,'/index.html'));
  fs.readFile(f,(e,d)=>{if(e){r.writeHead(404);r.end()}else{r.writeHead(200,{'content-type':f.endsWith('.json')?'application/json':f.endsWith('.js')?'text/javascript':'text/html; charset=utf-8'});r.end(d)}})});
let fails=0;const ok=(c,m)=>{console.log((c?'PASS ':'FAIL ')+m);if(!c)fails++};
(async()=>{
 await new Promise(r=>srv.listen(0,r));const url='http://localhost:'+srv.address().port+'/';
 const b=await chromium.launch();const ctx=await b.newContext({...devices['Pixel 7']});const p=await ctx.newPage();const errs=[];p.on('pageerror',e=>errs.push(e.message));
 await p.goto(url);await p.waitForTimeout(700);
 await p.click('[data-ssex="f"]');await p.click('[data-srole="dad"]');await p.click('#ssave');await p.waitForTimeout(900);
 await p.evaluate(()=>{const d=new Date();d.setMonth(d.getMonth()-28);S.cfg.birth=ymd(d);PICK={date:today()};pickSave();render()});await p.waitForTimeout(300);
 const title=()=>p.textContent('#card-play .order'),count=async()=>(await p.textContent('#card-play .navcount')).trim();
 // ---- 탐색 ----
 const t0=await title(),c0=await count();
 const m0=c0.match(/^(\d+) \/ (\d+) · 추천$/);ok(!!m0,'처음엔 추천 카드: '+c0);
 const i0=Number(m0[1]),N=Number(m0[2]);
 ok(await p.evaluate(()=>!!document.querySelector('.stack[data-kind="play"] .behind.b1')&&/다음 ·/.test(document.querySelector('.stack[data-kind="play"] .behind.b1').textContent)),'뒤에 겹친 다음 카드(다음 · 제목)가 있음');
 ok(await p.evaluate(()=>!!document.querySelector('.stack[data-kind="play"] .behind.b2')),'두 번째 뒤 카드도 있음');
 await p.click('[data-cnav="play:1"]');
 await p.waitForFunction(()=>document.getElementById('card-play').classList.contains('enter-r'),null,{timeout:2000}).then(()=>ok(true,'넘길 때 새 카드가 들어오는 애니메이션(enter-r)')).catch(()=>ok(false,'넘길 때 새 카드가 들어오는 애니메이션(enter-r)'));
 await p.waitForTimeout(450);
 const t1=await title();ok(t1!==t0,'› 로 다음 놀이');ok(new RegExp('^'+(i0%N+1)+' / '+N+' · 내가 고름').test(await count()),'카운터 '+(i0%N+1)+'번째·내가 고름');
 await p.click('[data-cnav="play:-1"]');await p.waitForTimeout(600);ok(await title()===t0,'‹ 로 이전 놀이');
 // 처음(1번)에서 ‹ → 마지막으로 순환
 await p.evaluate(()=>{selectItem('play',ranked()[0].id)});await p.waitForTimeout(250);
 await p.click('[data-cnav="play:-1"]');await p.waitForTimeout(600);
 ok(new RegExp('^'+N+' / '+N).test(await count()),'1번에서 ‹ 하면 마지막으로 순환 ('+N+')');
 await p.click('[data-crec="play"]');await p.waitForTimeout(300);ok(await title()===t0&&/추천/.test(await count()),'추천으로 돌아가기');
 // ---- 드래그(스와이프) ----
 const box=await (await p.$('#card-play')).boundingBox();
 await p.mouse.move(box.x+box.width/2,box.y+box.height/2);await p.mouse.down();await p.mouse.move(box.x+box.width/2-60,box.y+box.height/2,{steps:4});
 const mid=await p.evaluate(()=>document.getElementById('card-play').style.transform);
 ok(/translateX\(-?\d/.test(mid),'드래그 중 카드가 손가락을 따라 움직임 ('+mid+')');
 await p.mouse.move(box.x+box.width/2-200,box.y+box.height/2,{steps:6});await p.mouse.up();await p.waitForTimeout(700);
 ok(await title()!==t0,'왼쪽으로 스와이프 → 다음 놀이');
 // 조금만 끌면 제자리로
 await p.click('[data-crec="play"]');await p.waitForTimeout(300);
 const box2=await (await p.$('#card-play')).boundingBox();
 await p.mouse.move(box2.x+box2.width/2,box2.y+box2.height/2);await p.mouse.down();await p.mouse.move(box2.x+box2.width/2+30,box2.y+box2.height/2,{steps:3});await p.mouse.up();await p.waitForTimeout(500);
 ok(await title()===t0,'조금만 끌면 제자리로 돌아옴');
 // ---- 고르기 버튼 통일 ----
 await p.evaluate(()=>{E.op.rec=true;render()});await p.waitForTimeout(300);
 const geo=await p.evaluate(()=>[...document.querySelectorAll('.pickrow')].map(r=>{const b=r.querySelector('.pickbtn').getBoundingClientRect(),rr=r.getBoundingClientRect();return{w:Math.round(b.width),gap:Math.round(rr.right-b.right),h:Math.round(b.height)}}));
 ok(geo.length>=3,'추천 줄 '+geo.length+'개');
 ok(new Set(geo.map(x=>x.gap)).size===1,'모든 고르기 버튼의 오른쪽 위치 동일');
 ok(new Set(geo.map(x=>x.w)).size===1,'모든 고르기 버튼 폭 동일 ('+[...new Set(geo.map(x=>x.w))]+'px)');
 ok(geo.every(x=>x.h>=34),'고르기 버튼 높이 충분');
 // ---- 추천 ----
 await p.evaluate(()=>{
  S.plays=[];const now=Date.now(),mk=(card,daysAgo,r)=>({id:'t'+card+daysAgo,card,kind:'play',mins:15,ts:now-daysAgo*864e5,date:ymd(new Date(now-daysAgo*864e5)),r});
  ['follow','freeze','lid','stool'].forEach((c,i)=>S.plays.push(mk(c,i+6,0)));
  S.plays.push(mk('draw',1,2));
  PICK={date:today()};pickSave();render();
 });await p.waitForTimeout(300);
 const rec=await p.evaluate(()=>recommend(5).map(r=>({id:r.c.id,doms:r.c.doms,why:r.why})));
 ok(rec.length===5,'추천 5개 생성');
 ok(rec.slice(0,3).some(r=>r.doms.includes('lang')||r.doms.includes('soc')),'기록이 적은 영역(언어·사회) 놀이가 상위 추천 ('+rec.slice(0,3).map(r=>r.id).join(',')+')');
 ok(!rec.some(r=>r.id==='draw'),'어제 한 놀이는 추천에서 제외');
 ok(rec.every(r=>r.why.length>=1),'모든 추천에 이유 표시');
 const txt=await p.textContent('[data-k="rec"]');ok(/더 해볼 놀이 추천/.test(txt)&&/언어·의사소통 0/.test(txt)&&/사회·정서 0/.test(txt),'추천 영역·영역별 횟수 표시');
 const hard=await p.evaluate(()=>{S.plays.unshift({id:'hh',card:'book',kind:'play',mins:15,ts:Date.now()-8*864e5,date:ymd(new Date(Date.now()-8*864e5)),r:2});return recommend(80).find(r=>r.c.id==='book')});
 ok(!hard||hard.why.some(w=>/힘들어/.test(w)),'힘들어한 놀이에는 짧게 해보기 안내');
 ok(!errs.length,'페이지 오류 없음 '+errs);
 await b.close();srv.close();process.exit(fails?1:0);
})();
