// 할 일 알람: 시간 지정, 울림(소리·진동·알림), 10분 재알림, 폰 알람(.ics), 반복, 재촉, 봤어요 (폰 에뮬레이션, 로컬 모드)
const {chromium,devices}=require('playwright');const http=require('http');const fs=require('fs');const path=require('path');
const root=path.resolve(__dirname,'..');
const srv=http.createServer((q,r)=>{const f=path.join(root,decodeURIComponent(q.url.split('?')[0]).replace(/\/$/,'/index.html'));
  fs.readFile(f,(e,d)=>{if(e){r.writeHead(404);r.end()}else{r.writeHead(200,{'content-type':f.endsWith('.json')?'application/json':f.endsWith('.js')?'text/javascript':'text/html; charset=utf-8'});r.end(d)}})});
let fails=0;const ok=(c,m)=>{console.log((c?'PASS ':'FAIL ')+m);if(!c)fails++};
(async()=>{
 await new Promise(r=>srv.listen(0,r));const url='http://localhost:'+srv.address().port+'/';
 const b=await chromium.launch();const ctx=await b.newContext({...devices['Pixel 7'],acceptDownloads:true,permissions:['notifications']});
 const p=await ctx.newPage();const errs=[];p.on('pageerror',e=>errs.push(e.message));p.on('dialog',d=>d.accept());
 await p.addInitScript(()=>{window.__vib=[];navigator.vibrate=v=>{window.__vib.push(v);return true}});
 await p.goto(url);await p.waitForTimeout(900);
 ok(await p.evaluate(()=>E.tab==='dad'),'처음 설정 전에는 설정이 있는 화면으로 안내');
 await p.click('[data-ssex="f"]');await p.click('[data-srole="dad"]');await p.click('#ssave');await p.waitForTimeout(900);
 await p.reload();await p.waitForTimeout(1000);
 ok(await p.evaluate(()=>E.tab==='errand'),'설정을 마친 뒤 앱을 열면 "할 일"이 첫 화면');
 ok(await p.evaluate(()=>document.querySelector('nav button[role=tab]').dataset.tab==='errand'),'하단 탭의 첫 번째가 할 일');
 // 아빠가 전화로 받은 부탁을 바로 적는다
 await p.fill('#errtext','전화로 받은 부탁: 우유 사오기');await p.click('[data-eat="in30"]');await p.click('[data-erep="daily"]');await p.click('[data-epri]');await p.click('[data-eadd]');await p.waitForTimeout(500);
 const e0=await p.evaluate(()=>S.errands[0]);
 ok(e0.by==='dad'&&e0.rep==='daily'&&e0.pri===1&&e0.at>Date.now()+25*60000&&e0.at<Date.now()+31*60000,'아빠가 직접 적은 할 일: 30분 뒤 알람·매일 반복·중요 ('+new Date(e0.at).toTimeString().slice(0,5)+')');
 ok(await p.evaluate(()=>/알람이 울려요/.test(document.getElementById('toast').textContent)),'추가하면 알람이 울릴 시각 안내');
 // 시각이 되면 울린다
 await p.evaluate(()=>{S.errands[0].at=Date.now()-1000;errAlarmTick()});await p.waitForTimeout(400);
 ok(await p.evaluate(()=>window.__vib.length>0&&/⏰/.test(document.getElementById('toast').textContent)),'시각이 되면 진동·토스트 알람');
 ok(await p.evaluate(()=>!!document.querySelector('.lateCard')&&/지금 해야 해요/.test(document.querySelector('.lateCard').textContent)),'지금 해야 할 일 묶음이 맨 위에 빨갛게');
 ok(await p.evaluate(()=>/^\(1\)/.test(document.title)),'탭 제목에 밀린 개수 (1)');
 const n1=await p.evaluate(()=>window.__vib.length);await p.evaluate(()=>errAlarmTick());
 ok(await p.evaluate(n=>window.__vib.length===n,n1),'바로 다시 울리지는 않음 (10분 간격)');
 await p.evaluate(()=>{const m=errNagMap();Object.keys(m).forEach(k=>m[k]-=11*60000);lsSet('dpn_errnag',m);errAlarmTick()});
 ok(await p.evaluate(n=>window.__vib.length>n,n1),'끝낼 때까지 10분 뒤 다시 울림');
 // 폰 알람(.ics)
 const dl=p.waitForEvent('download');await p.click('[data-eics]');const d=await dl;const f=await d.path();const ics=fs.readFileSync(f,'utf8');
 ok(/BEGIN:VEVENT/.test(ics)&&/BEGIN:VALARM/.test(ics)&&/TRIGGER:PT0S/.test(ics)&&/TRIGGER:-PT10M/.test(ics)&&/RRULE:FREQ=DAILY/.test(ics)&&/우유/.test(ics),'폰 알람 파일(.ics): 이벤트·알람(정각, 10분 전)·매일 반복 ('+d.suggestedFilename()+')');
 ok(/DTSTART:\d{8}T\d{6}Z/.test(ics)&&ics.split('\r\n').length>10,'.ics 형식(UTC 시각, CRLF)');
 // 완료 → 반복이라 다음 알람 생성
 await p.click('[data-etoggle]');await p.waitForTimeout(500);
 ok(await p.evaluate(()=>S.errands.filter(e=>!e.del).length===2&&S.errands.some(e=>!e.done&&e.at>Date.now()+20*3600e3)),'완료하면 내일 같은 시각의 새 할 일이 생김 (매일 반복)');
 // 엄마 시점: 아빠 봤어요 / 재촉
 await p.evaluate(()=>{S.errands=[];render()});
 await p.click('[data-tab="conf"]');await p.click('[data-myrole="mom"]');await p.waitForTimeout(500);
 await p.click('[data-tab="errand"]');await p.waitForTimeout(400);
 await p.fill('#errtext','기저귀 사오기');await p.click('[data-eadd]');await p.waitForTimeout(500);
 ok(await p.evaluate(()=>/아빠 아직 안 봄/.test(document.getElementById('main').textContent)),'엄마 화면: 아빠가 아직 안 봤어요 표시');
 await p.click('[data-enudge]');await p.waitForTimeout(400);
 ok(await p.evaluate(()=>S.errands[0].nudge===1&&/재촉 1회/.test(document.getElementById('main').textContent)&&S.msgs.some(m=>m.kind==='nudge')),'재촉하기: 횟수 표시 + 아빠에게 메시지');
 await p.evaluate(()=>{E.role='dad';render()});await p.waitForTimeout(500);
 ok(await p.evaluate(()=>S.errands[0].seen>0),'아빠가 할 일 화면을 보면 "봤어요" 기록');
 await p.evaluate(()=>{E.role='mom';render()});await p.waitForTimeout(300);
 ok(await p.evaluate(()=>/아빠가 봤어요 ✓/.test(document.getElementById('main').textContent)),'엄마 화면: 아빠가 봤어요 ✓');
 ok(!errs.length,'페이지 오류 없음 '+errs);
 await b.close();srv.close();console.log(fails?fails+' FAIL':'ALL PASS');process.exit(fails?1:0);
})();
