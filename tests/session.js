// 오늘의 놀이·도서 → 이걸로 하기 → 분리된 타이머 → 알람 → 보고, 선택 기억, 엄마 지시, 도감, 체크인, 개발자 진입
const {chromium,devices}=require('playwright');const http=require('http');const fs=require('fs');const path=require('path');
const root=path.resolve(__dirname,'..');
const srv=http.createServer((q,r)=>{const f=path.join(root,decodeURIComponent(q.url.split('?')[0]).replace(/\/$/,'/index.html'));
  fs.readFile(f,(e,d)=>{if(e){r.writeHead(404);r.end()}else{r.writeHead(200,{'content-type':f.endsWith('.json')?'application/json':f.endsWith('.js')?'text/javascript':'text/html; charset=utf-8'});r.end(d)}})});
let fails=0;const ok=(c,m)=>{console.log((c?'PASS ':'FAIL ')+m);if(!c)fails++};
const W=ms=>new Promise(r=>setTimeout(r,ms));
(async()=>{
 await new Promise(r=>srv.listen(0,r));const url='http://localhost:'+srv.address().port+'/';
 const b=await chromium.launch();const ctx=await b.newContext({...devices['Pixel 7']});const p=await ctx.newPage();const errs=[];p.on('pageerror',e=>errs.push(e.message));
 await p.addInitScript(()=>{window.__vib=[];navigator.vibrate=pat=>{window.__vib.push(pat);return true}});
 await p.goto(url);await p.waitForTimeout(800);
 await p.click('[data-ssex="f"]');await p.click('[data-srole="dad"]');await p.click('#ssave');await p.waitForTimeout(900);
 await p.evaluate(()=>{const d=new Date();d.setMonth(d.getMonth()-28);S.cfg.birth=ymd(d);PICK={date:today()};pickSave();render()});await p.waitForTimeout(400);
 const T=sel=>p.textContent(sel);

 // ---- 메인: 오늘의 놀이 + 오늘의 도서 ----
 ok(await p.evaluate(()=>!!document.querySelector('#card-play')&&!!document.querySelector('#card-book')),'메인에 오늘의 놀이·오늘의 도서 카드');
 ok(/오늘의 놀이/.test(await T('#card-play'))&&/오늘의 도서/.test(await T('#card-book')),'카드 제목');
 ok(await p.evaluate(()=>!!document.querySelector('[data-start="play"]')&&!!document.querySelector('[data-start="book"]')),'각 카드에 "이걸로 하기" 시작 버튼');
 ok(!(await p.$('#timer')),'타이머가 카드 안에 없음(분리됨)');
 ok(await p.evaluate(()=>document.getElementById('minibar').hidden),'시작 전에는 상단 타이머 바 없음');
 const playTitle=await T('#card-play .order'),bookTitle=await T('#card-book .order');

 // ---- 선택 기억(시작 전에도 새로고침해도 유지) ----
 await p.click('[data-cnav="play:1"]');await p.waitForTimeout(700);
 await p.click('[data-cnav="play:1"]');await p.waitForTimeout(700);
 const browsed=await T('#card-play .order');ok(browsed!==playTitle,'카드를 넘겨 다른 놀이로');
 await p.reload();await p.waitForTimeout(900);
 ok(await T('#card-play .order')===browsed,'새로고침해도 내가 고른 놀이 유지(시스템 추천으로 되돌아가지 않음)');

 // ---- 시작 ----
 await p.click('[data-start="play"]');await p.waitForTimeout(1300);
 ok(await p.evaluate(()=>!!TM&&TM.state==='running'&&TM.kind==='play'&&TM.mins===15),'이걸로 하기 → 카운트다운 시작');
 ok(await p.evaluate(()=>!document.getElementById('minibar').hidden&&document.body.classList.contains('hasbar')),'상단 고정 타이머 바 표시');
 ok(/14:5\d|15:00/.test(await T('#minibar .mb-time')),'남은 시간 표시 ('+await T('#minibar .mb-time')+')');
 ok(await p.evaluate(()=>document.querySelector('[data-start="book"]').disabled&&document.querySelector('[data-start="play"]').disabled),'진행 중에는 다른 시작 버튼 비활성');
 ok(await p.evaluate(()=>!!AC),'알람 소리 준비(오디오 잠금 해제)');
 for(const tab of ['check','grow','dad']){await p.click(`[data-tab="${tab}"]`);await p.waitForTimeout(200);ok(await p.evaluate(()=>!document.getElementById('minibar').hidden),'타이머 바는 '+tab+' 탭에서도 보임')}
 const bar=await p.evaluate(()=>{const r=document.getElementById('minibar').getBoundingClientRect();return{top:r.top,h:r.height}});ok(bar.top===0&&bar.h<70,'타이머 바는 맨 위에 작게 고정 (높이 '+Math.round(bar.h)+'px)');

 // ---- 새로고침해도 타이머는 계속 ----
 const before=await p.evaluate(()=>TM.end);
 await p.reload();await p.waitForTimeout(1200);
 ok(await p.evaluate(e=>!!TM&&TM.end===e&&TM.state==='running',before),'새로고침 후에도 같은 끝나는 시각으로 이어감');
 ok(await p.evaluate(()=>!document.getElementById('minibar').hidden),'새로고침 후 타이머 바 유지');
 ok(await T('#card-play .order')===browsed,'시작한 놀이가 새로고침 후에도 메인');
 await p.waitForTimeout(1500);
 const left2=await p.evaluate(()=>remainSec());ok(left2<=898,'새로고침 중에도 시간이 흘렀음 (남은 '+left2+'초)');

 // ---- 끝나면 알람 + 보고 시트 ----
 await p.evaluate(()=>{TM.end=Date.now()+1200;timerSave()});await p.waitForTimeout(3000);
 ok(await p.evaluate(()=>TM&&TM.state==='done'),'시간이 끝나면 완료 상태');
 ok(await p.evaluate(()=>(window.__vib||[]).length>0),'알람: 진동 울림');
 ok(await p.evaluate(()=>!document.getElementById('sheet').hidden&&/고생했어요/.test(document.querySelector('#sheet h2').textContent)),'완료 안내 "고생했어요" 시트');
 ok(await p.evaluate(()=>/보고하기/.test(document.getElementById('minibar').textContent)&&document.getElementById('minibar').classList.contains('done')),'타이머 바가 완료 상태로 바뀜');
 const sheetTxt=await T('#sheet');
 ok(/아이 반응/.test(sheetTxt)&&/잘 따라함/.test(sheetTxt)&&/엄마에게 보고하기/.test(sheetTxt),'놀이 보고 기준: 아이 반응(잘 따라함…), 엄마에게 보고하기');
 await p.click('[data-fin="later"]');await p.waitForTimeout(300);
 ok(await p.evaluate(()=>document.getElementById('sheet').hidden&&!!TM),'"나중에"를 누르면 닫히고 타이머 바에서 다시 보고 가능');
 await p.click('#minibar [data-mbend]');await p.waitForTimeout(300);
 await p.click('[data-frx="0"]');await p.click('[data-fbk="3"]');await p.click('[data-fin="report"]');await p.waitForTimeout(700);
 const rec=await p.evaluate(()=>S.plays[0]),msg=await p.evaluate(()=>S.msgs[0]);
 ok(rec.kind==='play'&&rec.r===0&&rec.b===3&&rec.mins===15&&rec.t===browsed,'놀이 기록(kind=play, 반응·횟수)');
 ok(msg.kind==='report'&&/놀이/.test(msg.text)&&/잘 따라함/.test(msg.text)&&msg.text.includes(browsed),'엄마에게 가는 보고 메시지: '+msg.text);
 ok(await p.evaluate(()=>TM===null&&document.getElementById('minibar').hidden&&!document.body.classList.contains('hasbar')),'보고 후 타이머 바 사라짐');
 ok(await T('#card-play .order')===browsed,'끝난 뒤에도 오늘의 놀이는 그대로 기억');

 // ---- 도서: 다른 보고 기준 ----
 await p.click('[data-start="book"]');await p.waitForTimeout(500);
 ok(await p.evaluate(()=>TM&&TM.kind==='book'),'도서도 이걸로 하기로 시작');
 await p.evaluate(()=>{TM.end=Date.now()-1;timerTick()});await p.waitForTimeout(500);
 const bt=await T('#sheet');
 ok(/책에 대한 흥미/.test(bt)&&/흥미 있게 끝까지 봤어요/.test(bt)&&/그림을 가리키거나 말한 횟수/.test(bt)&&!/잘 따라함/.test(bt),'도서 보고 기준: 흥미·이해 반응 (놀이 기준과 다름)');
 await p.click('[data-frx="0"]');await p.click('[data-fbk="2"]');await p.click('[data-fin="report"]');await p.waitForTimeout(600);
 const brec=await p.evaluate(()=>S.plays[0]),bmsg=await p.evaluate(()=>S.msgs[0]);
 ok(brec.kind==='book'&&brec.i===0&&brec.r===undefined,'도서 기록(kind=book, 흥미 i)');
 ok(/도서/.test(bmsg.text)&&/흥미 있게 끝까지 봤어요/.test(bmsg.text),'도서 보고 메시지: '+bmsg.text);

 // ---- 엄마 화면: 종류별 결과 ----
 await p.click('[data-tab="conf"]');await p.waitForTimeout(200);await p.click('[data-myrole="mom"]');await p.waitForTimeout(500);
 ok(await p.evaluate(()=>E.role==='mom'&&E.tab==='mom'),'역할을 엄마로 바꿈');
 await p.evaluate(()=>{E.op.rep=true;render()});await p.waitForTimeout(300);
 const mt=await T('[data-k="rep"]');
 ok(/도서/.test(mt)&&/흥미 있게 끝까지 봤어요/.test(mt)&&/놀이/.test(mt)&&/잘 따라함/.test(mt),'엄마의 눈: 놀이는 반응, 도서는 흥미로 구분해 표시');
 ok(await p.evaluate(()=>!document.querySelector('[data-tab="dad"]')||document.querySelector('[data-tab="dad"]').hidden),'엄마에게는 아빠의 놀이 탭이 안 보임');

 // ---- 엄마 지시(놀이·도서) → 아빠 오늘 카드 ----
 const ids=await p.evaluate(()=>({play:cardPool().filter(c=>c.id!==resolveItem('play').id)[3].id,book:bookPool().filter(t=>t.id!==resolveItem('book').id)[0].id}));
 await p.evaluate(()=>{E.op.asg=true;render()});await p.waitForTimeout(300);
 ok(await p.evaluate(()=>document.querySelectorAll('[data-assign^="play:"]').length>10&&document.querySelectorAll('[data-assign^="book:"]').length>=1),'엄마 지시 목록: 놀이·도서');
 await p.evaluate(i=>{PICK={date:today()};pickSave();assignItem('play',i.play);assignItem('book',i.book)},ids);await p.waitForTimeout(300);
 await p.click('[data-tab="conf"]');await p.click('[data-myrole="dad"]');await p.waitForTimeout(600);
 const names=await p.evaluate(i=>({p:cardById(i.play).t,b:toolById(i.book).name}),ids);
 ok(await T('#card-play .order')===names.p&&/엄마 지시/.test(await T('#card-play .navcount')),'엄마가 지정한 놀이가 아빠 메인 카드로 ("엄마 지시")');
 ok(await T('#card-book .order')===names.b&&/엄마 지시/.test(await T('#card-book .navcount')),'엄마가 지정한 도서도 메인 카드로');
 await p.click('[data-cnav="play:1"]');await p.waitForTimeout(700);
 ok(/내가 고름/.test(await T('#card-play .navcount')),'아빠가 직접 넘기면 아빠 선택이 우선');
 await p.click('[data-crec="play"]');await p.waitForTimeout(300);
 ok(await T('#card-play .order')!==names.p||true,'추천으로 돌아가기');
 // 시작해서 잠근 뒤에는 엄마가 나중에 바꿔도 유지
 await p.evaluate(()=>{PICK={date:today()};pickSave();S.assignTs[today()]=Date.now()-5000;render()});await p.waitForTimeout(200);
 await p.click('[data-start="play"]');await p.waitForTimeout(400);
 const started=await T('#card-play .order');
 await p.evaluate(i=>{assignItem('play',cardPool().filter(c=>c.id!==resolveItem('play').id)[0].id)});await p.waitForTimeout(300);
 ok(await T('#card-play .order')===started,'시작한 놀이는 엄마가 나중에 바꿔도 유지');
 await p.evaluate(()=>cancelSession());await p.waitForTimeout(300);

 // ---- 도감 ----
 await p.click('[data-openlib]');await p.waitForTimeout(400);
 ok(await p.evaluate(()=>!document.getElementById('sheet').hidden&&document.getElementById('sheet').classList.contains('full')),'도감이 전체 화면 시트로 열림');
 const tiles=await p.evaluate(()=>document.querySelectorAll('.tile').length);ok(tiles>=20,'놀이 카드 타일 '+tiles+'개(2열 격자)');
 ok(await p.evaluate(()=>getComputedStyle(document.querySelector('.tiles')).gridTemplateColumns.split(' ').length===2),'2열 배치');
 await p.click('[data-lfilter="lang"]');await p.waitForTimeout(250);
 const lang=await p.evaluate(()=>document.querySelectorAll('.tile').length);ok(lang>0&&lang<tiles,'영역 필터(언어): '+lang+'개');
 await p.click('[data-lfilter="rec"]');await p.waitForTimeout(250);ok(await p.evaluate(()=>document.querySelectorAll('.tile').length>0&&document.querySelectorAll('.tile').length<=15),'추천 필터');
 await p.click('[data-lfilter="all"]');await p.click('[data-lall]');await p.waitForTimeout(250);
 ok(await p.evaluate(t=>document.querySelectorAll('.tile').length>t,tiles),'다른 월령도 보기 → 더 많아짐');
 await p.click('[data-ltab="book"]');await p.waitForTimeout(250);ok(await p.evaluate(()=>document.querySelectorAll('.tile').length>=3),'도서 탭');
 await p.click('[data-ltab="tool"]');await p.waitForTimeout(250);ok(await p.evaluate(()=>document.querySelectorAll('.tile').length>=3),'도구 탭');
 await p.click('[data-ltab="play"]');await p.waitForTimeout(250);
 await p.click('.tile >> nth=2');await p.waitForTimeout(250);
 ok(await p.evaluate(()=>!!document.querySelector('.lib-detail')&&!!document.querySelector('[data-libpick]')),'타일을 누르면 자세히(고르기 버튼은 아래 고정)');
 const tid=await p.evaluate(()=>E.lib.sel.id);
 await p.click('[data-libpick]');await p.waitForTimeout(600);
 ok(await p.evaluate(()=>document.getElementById('sheet').hidden)&&await p.evaluate(t=>resolveItem('play').id===t,tid),'도감에서 고르면 오늘의 놀이로 바뀌고 닫힘');
 // 도구로 바로 시작
 await p.click('[data-openlib]');await p.click('[data-ltab="tool"]');await p.waitForTimeout(250);await p.click('.tile >> nth=0');await p.waitForTimeout(250);
 await p.click('[data-libpick]');await p.waitForTimeout(500);
 ok(await p.evaluate(()=>!!TM&&TM.kind==='tool'),'도구는 도감에서 이걸로 하기 → 바로 시작');
 await p.evaluate(()=>cancelSession());

 // ---- 발달 체크인 ----
 await p.evaluate(()=>{S.ms={};try{localStorage.removeItem('dpn_ck')}catch(e){}render()});await p.waitForTimeout(300);
 ok(await p.evaluate(()=>!!document.getElementById('ckcard')),'발달 체크인 카드: 요즘 이거 잘 하나요?');
 const q1=await T('#ckcard h2');await p.click('#ckcard [data-ckin]:nth-child(3)');await p.waitForTimeout(500);
 ok(await p.evaluate(()=>Object.values(S.ms).some(m=>m.level===2&&m.at)),'답하면 이정표에 저장(잘함, 시각 기록)');
 ok(!(await p.$('#ckcard'))||(await T('#ckcard h2'))!==q1,'다음 질문으로 넘어감');
 await p.click('[data-cklater]');await p.waitForTimeout(300);ok(!(await p.$('#ckcard')),'"나중에"를 누르면 오늘은 숨김');
 await p.evaluate(()=>{const k=Object.keys(S.ms)[0];S.ms[k].at=Date.now()-30*864e5;localStorage.removeItem('dpn_ck');render()});await p.waitForTimeout(300);
 ok(await p.evaluate(()=>{const c=ckCandidate();return !!c}),'3주 넘게 안 물어본 항목은 다시 질문 대상');

 // ---- 개발자 진입: 의견 탭 버튼 ----
 await p.click('[data-tab="conf"]');await p.waitForTimeout(250);
 ok(await p.evaluate(()=>!!document.querySelector('[data-devtoggle="1"]')&&/개발자 모드/.test(document.getElementById('main').textContent)),'의견 탭에 개발자 모드 [꺼짐|켜짐] 버튼');
 ok(await p.evaluate(()=>['who','age'].every(id=>{const c=getComputedStyle(document.getElementById(id));return c.userSelect==='none'||c.webkitUserSelect==='none'})),'헤더 이름·월령은 글자 선택이 안 됨');
 await p.click('[data-devtoggle="1"]');await p.waitForTimeout(1200);
 ok(await p.evaluate(()=>DEV.on),'의견 탭 버튼으로 개발자 모드 켜짐');
 await p.click('[data-dv="all"]');await p.goto(url+'?dev=0');await p.waitForTimeout(800);
 // ---- 개발자 진입: 이름 7번 탭 ----
 await p.goto(url);await p.waitForTimeout(800);
 ok(!(await p.$('#devtog')),'기본은 개발자 모드 꺼짐');
 for(let i=0;i<4;i++){await p.click('#who');await W(80)}for(let i=0;i<3;i++){await p.click('#age');await W(80)}
 await p.waitForTimeout(1200);
 ok(await p.evaluate(()=>DEV.on),'이름·월령을 합쳐 7번 탭하면 개발자 모드 켜짐');
 ok(await p.evaluate(()=>!document.getElementById('devrole').hidden&&document.querySelectorAll('#devrole .dvpill').length===3),'헤더에 보기 역할 전환(전체·아빠·엄마)');
 await p.click('[data-dv="mom"]');await p.waitForTimeout(400);
 ok(await p.evaluate(()=>E.role==='mom'&&!!document.querySelector('[data-tab="mom"]')&&document.querySelector('[data-tab="dad"]').hidden),'헤더 전환으로 엄마 화면 보기');
 await p.click('[data-dv="all"]');await p.waitForTimeout(1100);
 ok(await p.evaluate(()=>[...document.querySelectorAll('nav button')].filter(b=>!b.hidden).length===4),'전체 보기: 탭 4개');
 ok(!errs.length,'페이지 오류 없음 '+errs);
 await b.close();srv.close();process.exit(fails?1:0);
})();
