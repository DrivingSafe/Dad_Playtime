// 심부름 탭, 엄마 메모, 책 카테고리·우리집 책장, 백업·설치 안내, 연속 일수 (폰 에뮬레이션)
const {chromium,devices}=require('playwright');const http=require('http');const fs=require('fs');const path=require('path');const os=require('os');
const root=path.resolve(__dirname,'..');
const srv=http.createServer((q,r)=>{const f=path.join(root,decodeURIComponent(q.url.split('?')[0]).replace(/\/$/,'/index.html'));
  fs.readFile(f,(e,d)=>{if(e){r.writeHead(404);r.end()}else{r.writeHead(200,{'content-type':f.endsWith('.json')?'application/json':f.endsWith('.js')?'text/javascript':'text/html; charset=utf-8'});r.end(d)}})});
let fails=0;const ok=(c,m)=>{console.log((c?'PASS ':'FAIL ')+m);if(!c)fails++};
(async()=>{
 const D=JSON.parse(fs.readFileSync(path.join(root,'data/books.json'),'utf8'));
 ok(new Set(D.books.map(b=>b.id)).size===D.books.length&&D.books.every(b=>D.cats.some(c=>c.id===b.cat)),'책 데이터 id 중복 없음, 카테고리 유효 ('+D.books.length+'권/'+D.cats.length+'개 분류)');
 ok(D.books.every(b=>b.title&&b.src&&b.age&&b.age[0]<=b.age[1]),'모든 책에 제목·출처·월령 범위');
 ok(D.cats.every(c=>c.tip&&c.name&&c.ages),'모든 카테고리에 읽는 법·월령');
 ok(!D.books.some(b=>/까이유/.test(b.title+b.series)),'확인하지 못한 시리즈(까이유)는 넣지 않음');
 await new Promise(r=>srv.listen(0,r));const url='http://localhost:'+srv.address().port+'/';
 const b=await chromium.launch();const ctx=await b.newContext({...devices['Pixel 7'],acceptDownloads:true});const p=await ctx.newPage();const errs=[];p.on('pageerror',e=>errs.push(e.message));
 p.on('dialog',d=>d.accept());
 await p.goto(url);await p.waitForTimeout(900);
 await p.click('[data-ssex="f"]');await p.click('[data-srole="dad"]');await p.click('#ssave');await p.waitForTimeout(900);
 await p.evaluate(()=>{const d=new Date();d.setMonth(d.getMonth()-28);S.cfg.birth=ymd(d);render()});await p.waitForTimeout(500);
 const vis=()=>p.evaluate(()=>[...document.querySelectorAll('nav button')].filter(b=>!b.hidden).map(b=>b.dataset.tab).join());
 const T=s=>p.textContent(s);

 // ---- 심부름 ----
 ok(await vis()==='dad,errand,check,grow','아빠: 오늘·심부름·체크·성장 탭');
 await p.click('[data-tab="conf"]');await p.click('[data-myrole="mom"]');await p.waitForTimeout(700);
 ok(await vis()==='mom,errand,check,grow','엄마: 엄마의 눈·심부름·체크·성장 탭');
 await p.click('[data-tab="errand"]');await p.waitForTimeout(800);
 ok(/아빠에게 부탁할 일/.test(await T('#main'))&&!!(await p.$('#errtext')),'엄마의 심부름 화면: 입력칸');
 await p.fill('#errtext','커피 사와');await p.click('[data-eadd]');await p.waitForTimeout(500);
 ok(await p.evaluate(()=>S.errands.length===1&&S.errands[0].text==='커피 사와'&&S.errands[0].by==='mom'&&S.errands[0].due==='wayhome'&&!S.errands[0].done),'엄마가 심부름 추가 (퇴근길)');
 await p.click('[data-equick="삼겹살"]');await p.waitForTimeout(300);
 ok(await p.inputValue('#errtext')==='삼겹살 사와','빠른 추가 칩이 입력칸을 채움');
 await p.fill('#errtext','오는 길에 삼겹살 사와');await p.click('[data-edue="today"]');await p.waitForTimeout(300);
 await p.fill('#errtext','오는 길에 삼겹살 사와');await p.press('#errtext','Enter');await p.waitForTimeout(500);
 ok(await p.evaluate(()=>S.errands.length===2&&S.errands[0].text==='오는 길에 삼겹살 사와'&&S.errands[0].due==='today'),'Enter로 추가, 오늘 안에');
 await p.fill('#errtext','잘못 쓴 것');await p.click('[data-eadd]');await p.waitForTimeout(400);
 const delId=await p.evaluate(()=>S.errands[0].id);await p.click(`[data-edel="${delId}"]`);await p.waitForTimeout(400);
 ok(await p.evaluate(()=>S.errands.filter(e=>!e.del).length===2),'내가 적은 심부름은 삭제 가능');
 await p.click('[data-tab="mom"]');await p.waitForTimeout(500);

 // ---- 엄마 메모 ----
 ok(!!(await p.$('[data-memochip]')),'엄마의 눈에 아빠 전달 메모 칸');
 await p.click('[data-memochip="낮잠 안 잤어요"]');await p.click('[data-memochip="열이 있어요"]');await p.waitForTimeout(300);
 await p.fill('#memotext','3시쯤 한 번 울었어요');await p.click('[data-memosave]');await p.waitForTimeout(500);
 ok(await p.evaluate(()=>{const m=S.memo[today()];return m&&m.chips.length===2&&/3시쯤/.test(m.text)}),'메모 저장 (상태 칩 2개 + 한 줄)');

 // ---- 아빠 화면 ----
 await p.click('[data-tab="conf"]');await p.click('[data-myrole="dad"]');await p.waitForTimeout(800);
 ok(await p.evaluate(()=>E.role==='dad'&&E.tab==='dad'),'아빠로 전환 → 오늘 화면');
 ok(await p.evaluate(()=>!!document.getElementById('memocard')&&/낮잠 안 잤어요/.test(document.getElementById('memocard').textContent)&&/3시쯤/.test(document.getElementById('memocard').textContent)),'아빠 오늘 화면 맨 위에 엄마 메모');
 ok(await p.evaluate(()=>!!document.getElementById('errmini')&&/심부름 2개/.test(document.getElementById('errmini').textContent)&&/삼겹살/.test(document.getElementById('errmini').textContent)),'아빠 오늘 화면에 심부름 목록 (잊지 않게)');
 ok(await p.evaluate(()=>{const d=document.querySelector('nav [data-tab="errand"] .dot');return d&&!d.hidden&&d.textContent==='2'}),'심부름 탭에 남은 개수 표시(2)');
 const mom1=await p.evaluate(()=>S.errands.find(e=>/커피/.test(e.text)).id);
 await p.click(`#errmini [data-etoggle="${mom1}"]`);await p.waitForTimeout(500);
 ok(await p.evaluate(i=>{const e=S.errands.find(x=>x.id===i);return e.done===1&&e.doneBy==='dad'&&e.doneTs>0},mom1),'아빠가 체크 → 완료(아빠 완료 기록)');
 ok(await p.evaluate(()=>{const d=document.querySelector('nav [data-tab="errand"] .dot');return d&&!d.hidden&&d.textContent==='1'}),'남은 개수 1로 줄어듦');
 await p.click('[data-tab="errand"]');await p.waitForTimeout(500);
 ok(await p.evaluate(()=>!document.querySelector('[data-edel]')),'아빠는 엄마가 적은 심부름을 지울 수 없음');
 ok(/아빠 완료/.test(await p.evaluate(()=>{E.op.edone=true;render();return document.getElementById('main').textContent})),'완료한 일 목록에 "아빠 완료"');
 ok(await p.evaluate(()=>S.errands.some(e=>e.text==='커피 사와'&&e.done)),'엄마 화면에서도 완료로 보임(같은 기록)');

 // ---- 책: 카테고리 읽기 카드 + 확인된 추천 책 + 우리집 책장 ----
 await p.click('[data-tab="dad"]');await p.waitForTimeout(400);
 await p.evaluate(()=>{PICK={date:today()};pickSave();selectItem('book','cg:habit')});await p.waitForTimeout(500);
 ok(/집에 있는 생활습관 책 아무거나/.test(await T('#card-book .order')),'오늘의 도서: "집에 있는 ○○ 책 아무거나" 카테고리 카드');
 ok(/응가 기차/.test(await T('#card-book'))&&/책장에 추가/.test(await T('#card-book')),'카테고리별로 확인된 책 제목 추천 + 책장에 추가');
 ok(/읽는 법|그 시간 직전/.test(await T('#card-book')),'카테고리별 읽는 법');
 await p.click('#card-book [data-shelftoggle="habit1"]');await p.waitForTimeout(500);
 ok(await p.evaluate(()=>shelfBooks().some(s=>s.cid==='habit1'&&s.cat==='habit')),'"책장에 추가" → 우리집 책장에 등록');
 ok(/✓ 책장에 있음/.test(await T('#card-book')),'추가 후 표시가 바뀜');
 await p.evaluate(()=>{PICK={date:today()};pickSave();render()});await p.waitForTimeout(400);
 ok(await p.evaluate(()=>resolveItem('book').id.startsWith('sh:')),'책장에 책이 있으면 추천 도서가 책장에서 나옴');
 ok(/응가 기차/.test(await T('#card-book .order'))&&/우리집 책장/.test(await T('#card-book')),'오늘의 도서: 우리집 책장의 응가 기차');
 // 도감 도서 탭
 await p.click('[data-openlib]');await p.click('[data-ltab="book"]');await p.waitForTimeout(400);
 ok(await p.evaluate(()=>[...document.querySelectorAll('.fchip')].map(c=>c.textContent).join('|')),'도서 탭 필터 칩');
 const chips=await p.evaluate(()=>[...document.querySelectorAll('.fchip')].map(c=>c.textContent));
 ok(['우리집 책장','동물','자연','숫자','색깔·모양','생활습관','감정·관계','소리·말놀이'].every(x=>chips.includes(x)),'카테고리 칩: 동물·자연·숫자·색깔·모양 등');
 await p.click('[data-lfilter="mine"]');await p.waitForTimeout(250);ok(await p.evaluate(()=>document.querySelectorAll('.tile').length===1),'우리집 책장 필터: 1권');
 await p.click('[data-shelfform]');await p.fill('#shelftitle','까이유 - 처음 하는 일');await p.click('[data-shelfcat="feeling"]');await p.waitForTimeout(200);
 ok(await p.inputValue('#shelftitle')==='까이유 - 처음 하는 일','종류를 눌러도 입력한 제목이 남음');
 await p.click('[data-shelfsave]');await p.waitForTimeout(600);
 ok(await p.evaluate(()=>shelfBooks().length===2&&shelfBooks().some(s=>s.title==='까이유 - 처음 하는 일'&&s.cat==='feeling')),'우리집 책 직접 등록(제목+종류)');
 await p.click('[data-lfilter="feeling"]');await p.waitForTimeout(250);
 ok(await p.evaluate(()=>/까이유/.test(document.querySelector('.tiles').textContent)&&/나도 안아 줘/.test(document.querySelector('.tiles').textContent)),'감정·관계 필터: 내 책 + 추천 책');
 await p.click('[data-lfilter="colorshape"]');await p.waitForTimeout(250);await p.click('.tile >> nth=0');await p.waitForTimeout(250);
 ok(/확인된 한국어 책을 아직 찾지 못했어요/.test(await T('.lib-detail')),'확인 못 한 카테고리는 솔직하게 안내(색깔·모양)');
 await p.click('[data-libback]');await p.click('[data-lfilter="sound"]');await p.waitForTimeout(250);
 await p.click('.tile:has-text("폭신폭신")');await p.waitForTimeout(250);
 ok(await p.evaluate(()=>!!document.querySelector('.lib-detail a[href*="kyobobook"]')&&!!document.querySelector('.lib-detail a[href*="naver"]')),'책 상세: 서점·도서관 찾기 링크');
 ok(await p.evaluate(()=>!!document.querySelector('.lib-detail [data-shelftoggle]')),'책 상세: 우리집에 있어요(책장에 추가)');
 await p.click('[data-libclose]');await p.waitForTimeout(300);

 // ---- 백업·설치 ----
 await p.click('[data-tab="conf"]');await p.waitForTimeout(400);
 ok(!!(await p.$('[data-export]'))&&!!(await p.$('[data-importbtn]')),'의견 탭에 백업 저장·불러오기');
 const [dl]=await Promise.all([p.waitForEvent('download'),p.click('[data-export]')]);
 const fp=path.join(os.tmpdir(),'dpn-backup-test.json');await dl.saveAs(fp);
 const bk=JSON.parse(fs.readFileSync(fp,'utf8'));
 ok(bk.app==='15min-play-notebook'&&bk.keys.dpn_db&&/커피/.test(bk.keys.dpn_db)&&/까이유/.test(bk.keys.dpn_db),'백업 파일에 심부름·책장 포함 ('+dl.suggestedFilename()+')');
 await p.evaluate(()=>{localStorage.clear()});
 await p.setInputFiles('#importfile',fp);await p.waitForTimeout(2500);
 ok(await p.evaluate(()=>S.errands.some(e=>e.text==='커피 사와')&&shelfBooks().some(s=>s.title==='까이유 - 처음 하는 일')),'기록을 지운 뒤 백업 불러오기 → 심부름·책장 복원');
 await p.click('[data-tab="conf"]');await p.waitForTimeout(400);
 ok(/크롬|사파리/.test(await T('#main')),'설치 안내 문구(크롬·사파리)');
 await p.evaluate(()=>{window.__prompted=0;const ev=new Event('beforeinstallprompt');ev.prompt=()=>{window.__prompted=1};ev.userChoice=Promise.resolve({outcome:'accepted'});window.dispatchEvent(ev)});await p.waitForTimeout(500);
 ok(!!(await p.$('[data-install]')),'설치 가능하면 "앱 설치하기" 버튼');
 await p.click('[data-install]');await p.waitForTimeout(300);ok(await p.evaluate(()=>window.__prompted===1),'버튼이 설치 창을 띄움');

 // ---- 연속 일수 ----
 await p.click('[data-tab="dad"]');await p.waitForTimeout(300);
 await p.evaluate(()=>{S.plays=[0,1,2].map(i=>({id:'s'+i,card:'box',kind:'play',mins:10,ts:Date.now()-i*864e5,date:dayAgo(i)}));render()});await p.waitForTimeout(300);
 ok(/3일 연속/.test(await T('.streak')),'연속 일수: 3일 연속 놀이 중');
 ok(!errs.length,'페이지 오류 없음 '+errs);
 await b.close();srv.close();process.exit(fails?1:0);
})();
