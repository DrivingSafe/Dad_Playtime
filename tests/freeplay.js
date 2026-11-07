// 아이가 하자는 놀이: 검색 → 시작/분 기록, 직접 적기, 보고 포함
const {chromium,devices}=require('playwright');const http=require('http');const fs=require('fs');const path=require('path');
const root=path.resolve(__dirname,'..');
const srv=http.createServer((q,r)=>{const f=path.join(root,decodeURIComponent(q.url.split('?')[0]).replace(/\/$/,'/index.html'));
  fs.readFile(f,(e,d)=>{if(e){r.writeHead(404);r.end()}else{r.writeHead(200,{'content-type':f.endsWith('.json')?'application/json':f.endsWith('.js')?'text/javascript':'text/html; charset=utf-8'});r.end(d)}})});
let fails=0;const ok=(c,m)=>{console.log((c?'PASS ':'FAIL ')+m);if(!c)fails++};
(async()=>{
 await new Promise(r=>srv.listen(0,r));const url='http://localhost:'+srv.address().port+'/';
 const b=await chromium.launch();const ctx=await b.newContext({...devices['Pixel 7']});const p=await ctx.newPage();const errs=[];p.on('pageerror',e=>errs.push(e.message));p.on('dialog',d=>d.accept());
 await p.goto(url);await p.waitForTimeout(900);
 await p.click('[data-ssex="f"]');await p.click('[data-srole="dad"]');await p.click('#ssave');await p.waitForTimeout(900);
 await p.evaluate(()=>{const d=new Date();d.setMonth(d.getMonth()-28);S.cfg.birth=ymd(d);render()});await p.waitForTimeout(400);
 ok(!!(await p.$('[data-freeplay]')),'오늘 화면에 "아이가 하자는 놀이" 버튼');
 await p.click('[data-freeplay]');await p.waitForTimeout(300);
 ok(await p.evaluate(()=>!!document.getElementById('fpq')&&document.querySelectorAll('[data-fpquick]').length>=8),'검색창과 빠른 선택(퍼즐 등)');
 await p.fill('#fpq','퍼즐');await p.waitForTimeout(300);
 ok(await p.evaluate(()=>/"퍼즐" 그대로 기록/.test(document.getElementById('fpres').textContent)),'검색 결과 맨 위에 "퍼즐 그대로 기록"');
 // 분 기록
 await p.click('[data-fppick^="free:"]');await p.waitForTimeout(200);
 ok(await p.evaluate(()=>!!document.querySelector('[data-fpstart]')&&document.querySelectorAll('[data-fplog]').length===7),'선택 후: 시작 / 이미 했어요(분) 선택');
 await p.click('[data-fplog="15"]');await p.waitForTimeout(500);
 ok(await p.evaluate(()=>S.plays[0].t==='퍼즐'&&S.plays[0].mins===15&&S.plays[0].kind==='free'&&dayElapsed()===900&&document.getElementById('sheet').hidden),'퍼즐 15분 기록 → 오늘 시간 15분 적립');
 ok(await p.evaluate(()=>/퍼즐/.test(document.getElementById('todaycard').textContent)),'오늘 한 것에 퍼즐 표시');
 // 시작(시간 재기)
 await p.click('[data-freeplay]');await p.waitForTimeout(200);await p.click('[data-fpquick="블록"]');await p.waitForTimeout(200);
 await p.click('[data-fppick^="free:"]');await p.click('[data-fpstart]');await p.waitForTimeout(500);
 ok(await p.evaluate(()=>!!ACT&&ACT.kind==='free'&&ACT.title==='블록'&&document.getElementById('minibar').textContent.includes('블록')),'블록 시작 → 상단 바에 표시');
 await p.evaluate(()=>{ACT.start-=240*1000;actSave()});await p.waitForTimeout(1200);
 ok(await p.evaluate(()=>/목표 시간이 됐어요/.test(document.getElementById('sheet').textContent)),'기록해 둔 15분 + 지금 시간이 목표(15분)를 넘으면 알람 시트');
 await p.click('[data-fin="complete"]');await p.waitForTimeout(300);await p.click('[data-fin="done"]');await p.waitForTimeout(500);
 ok(await p.evaluate(()=>S.plays[0].t==='블록'&&S.plays[0].mins>=4&&dayElapsed()>=1140),'블록 완료 → 4분 이상 기록, 합산');
 await p.click('[data-fin="report"]');await p.waitForTimeout(300);
 const rp=await p.evaluate(()=>document.querySelector('.repbox').textContent);
 ok(/퍼즐 · 15분/.test(rp)&&/블록/.test(rp)&&/2개 완료/.test(rp),'엄마 보고에 퍼즐·블록 포함: '+rp.split('\n').slice(0,3).join(' / '));
 // 카탈로그 검색
 await p.click('[data-fin="later"]');await p.waitForTimeout(300);
 const nm=await p.evaluate(()=>CARDS[0].t);
 await p.evaluate(()=>{DAY=newDay();daySave();render()});await p.click('[data-freeplay]');await p.fill('#fpq',nm.slice(0,2));await p.waitForTimeout(300);
 ok(await p.evaluate(()=>!!document.querySelector('[data-fppick^="play:"]')),'놀이 카드 이름도 검색됨 ('+nm.slice(0,2)+')');
 ok(!errs.length,'페이지 오류 없음 '+errs);
 await b.close();srv.close();console.log(fails?fails+' FAIL':'ALL PASS');process.exit(fails?1:0);
})();
