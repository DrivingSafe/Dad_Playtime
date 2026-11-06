// 가족 연결 end-to-end: 실제 Firebase SDK + Firestore·Auth 에뮬레이터 + 실제 firestore.rules, 폰 두 대(브라우저 컨텍스트 2개)
// 실행: ./tests/rules/node_modules/.bin/firebase emulators:exec --config firebase.json --only firestore,auth --project dad-playtime-test "node tests/family.js"
const {chromium,devices}=require('playwright');const http=require('http');const fs=require('fs');const path=require('path');
const root=path.resolve(__dirname,'..');const dist=path.join(__dirname,'rules/dist');
if(!fs.existsSync(dist)){console.log('SKIP: tests/rules 에서 npm install && node build-sdk.js 가 필요해요');process.exit(0)}
const mime=f=>f.endsWith('.json')?'application/json':f.endsWith('.js')?'text/javascript':'text/html; charset=utf-8';
const srv=http.createServer((q,r)=>{
  const u=decodeURIComponent(q.url.split('?')[0]);
  const f=u.startsWith('/__fb/')?path.join(dist,u.slice(6)):path.join(root,u.replace(/\/$/,'/index.html'));
  fs.readFile(f,(e,d)=>{if(e){r.writeHead(404);r.end()}else{r.writeHead(200,{'content-type':mime(f)});r.end(d)}})});
let fails=0;const ok=(c,m)=>{console.log((c?'PASS ':'FAIL ')+m);if(!c)fails++};
const W=ms=>new Promise(r=>setTimeout(r,ms));
(async()=>{
 await new Promise(r=>srv.listen(0,r));const url='http://localhost:'+srv.address().port+'/';
 const b=await chromium.launch();
 const phone=async()=>{const ctx=await b.newContext({...devices['Pixel 7']});const p=await ctx.newPage();p.__errs=[];p.on('pageerror',e=>p.__errs.push(e.message));p.on('dialog',d=>d.accept());await p.addInitScript(()=>{window.__FB_BASE='/__fb/'});return{ctx,p}};
 const setup=async(p,role,name)=>{await p.click('[data-ssex="f"]');await p.click(`[data-srole="${role}"]`);if(name)await p.fill('#sname',name);await p.click('#ssave');await p.waitForTimeout(800)};
 const T=(p,s)=>p.textContent(s);

 // ================= 아빠 폰: 기록을 만들고 가족 시작 =================
 const A=await phone(),a=A.p;
 await a.goto(url);await a.waitForTimeout(900);
 await setup(a,'dad','콩이');
 await a.evaluate(()=>{const d=new Date();d.setMonth(d.getMonth()-28);S.cfg.birth=ymd(d);saveCfg({name:'콩이',birth:ymd(d),sex:'f'});});await a.waitForTimeout(500);
 await a.evaluate(()=>{addErrand('아빠가 적은 메모용 심부름','any')});await a.waitForTimeout(400);
 await a.click('[data-tab="conf"]');await a.waitForTimeout(300);
 ok(!!(await a.$('[data-famnew]'))&&!!(await a.$('[data-famjoin]')),'연결 전: 의견 탭에 "새로 시작하기·코드로 합류하기"');
 await a.click('[data-famnew]');await a.waitForTimeout(300);
 ok(await a.evaluate(()=>/저장되는 것/.test(document.querySelector('#sheet').textContent)&&/구글 Firebase 서버\(서울\)/.test(document.querySelector('#sheet').textContent)&&/개발자/.test(document.querySelector('#sheet').textContent)),'동의 화면: 저장 항목·위치(서울)·개발자 열람·삭제 안내');
 ok(await a.evaluate(()=>document.querySelector('[data-consentgo]').disabled),'동의 전에는 계속 버튼이 비활성');
 await a.click('[data-c1]');ok(await a.evaluate(()=>document.querySelector('[data-consentgo]').disabled),'필수 2개 중 1개만 체크하면 여전히 비활성');
 await a.click('[data-c2]');ok(await a.evaluate(()=>!document.querySelector('[data-consentgo]').disabled),'필수 2개 모두 체크하면 활성');
 await a.click('[data-consentgo]');
 await a.waitForFunction(()=>E.mode==='family',null,{timeout:20000}).then(()=>ok(true,'가족 생성 후 새로고침 → 가족 모드')).catch(()=>ok(false,'가족 생성 후 가족 모드 (errs: '+a.__errs.join('|')+')'));
 await a.waitForTimeout(1500);
 const fam=await a.evaluate(()=>JSON.parse(localStorage.getItem('dpn_fam')));
 ok(fam&&fam.fid&&fam.role==='dad'&&/^[A-Z2-9]{6}$/.test(fam.code),'가족 정보 저장 (역할 아빠, 6자리 코드 '+(fam&&fam.code)+')');
 await a.click('[data-tab="conf"]');await a.waitForTimeout(500);
 ok(await a.evaluate(()=>/연결됨/.test(document.getElementById('famcard').textContent)&&/엄마를 기다리는 중/.test(document.getElementById('famcard').textContent)),'아빠 폰: 연결됨, 엄마를 기다리는 중');
 ok((await T(a,'#invcode')).trim()===fam.code,'초대 코드가 화면에 보임');
 ok(await a.evaluate(()=>!document.querySelector('[data-backup],[data-export]')&&!document.querySelector('[data-myrole]')),'가족 모드에서는 역할 바꾸기·로컬 백업이 보이지 않음');
 ok(await a.evaluate(()=>S.cfg.name==='콩이'&&S.errands.some(e=>/아빠가 적은/.test(e.text))),'기존 기록(아이 정보·심부름)이 가족 저장소로 옮겨져 그대로 보임');

 // ================= 엄마 폰: 코드로 합류 =================
 const B=await phone(),m=B.p;
 await m.goto(url+'?join='+fam.code);await m.waitForTimeout(1500);
 ok(await m.evaluate(()=>/저장되는 것/.test(document.querySelector('#sheet').textContent)),'초대 링크(?join=)로 열면 동의 화면부터');
 await m.click('[data-c1]');await m.click('[data-c2]');await m.click('[data-consentgo]');await m.waitForTimeout(500);
 ok((await m.inputValue('#joincode'))===fam.code,'코드가 미리 입력돼 있음');
 await m.fill('#joincode','ZZZZZZ');await m.click('[data-joincheck]');await m.waitForTimeout(1500);
 ok(/찾을 수 없어요/.test(await T(m,'#sheet')),'없는 코드: "코드를 찾을 수 없어요"');
 await m.fill('#joincode',fam.code.toLowerCase());await m.click('[data-joincheck]');await m.waitForTimeout(1500);
 ok(/아빠가 만든 가족/.test(await T(m,'#sheet'))&&/엄마<\/b>로 합류|엄마로 합류/.test(await m.evaluate(()=>document.querySelector('#sheet').innerHTML)),'소문자로 입력해도 인식, 이 폰은 엄마로 합류 안내');
 ok(/합쳐지지 않아요/.test(await T(m,'#sheet')),'이 기기의 기존 기록은 합쳐지지 않는다고 안내');
 await m.click('[data-joinconfirm]');
 await m.waitForFunction(()=>E.mode==='family',null,{timeout:20000}).then(()=>ok(true,'합류 후 가족 모드')).catch(()=>ok(false,'합류 후 가족 모드 (errs: '+m.__errs.join('|')+')'));
 await m.waitForTimeout(2000);
 ok(await m.evaluate(()=>E.role==='mom'&&JSON.parse(localStorage.getItem('dpn_fam')).role==='mom'),'엄마 폰: 역할이 엄마로 고정');
 ok(await m.evaluate(()=>S.cfg.name==='콩이'),'엄마 폰에 아빠가 만든 아이 정보가 보임 (설정 화면 없이)');
 ok(await m.evaluate(()=>!document.querySelector('#ssave')),'합류한 폰에는 처음 설정 화면이 안 뜸');
 ok(await m.evaluate(()=>S.errands.some(e=>/아빠가 적은/.test(e.text))),'엄마 폰에 아빠의 기존 심부름이 보임');

 // ---- 두 폰이 서로 보임 ----
 await a.click('[data-tab="conf"]');await a.waitForTimeout(800);
 ok(await a.evaluate(()=>/엄마도 연결됐어요/.test(document.getElementById('famcard').textContent)&&!document.getElementById('invcode')),'아빠 폰: 엄마 합류가 실시간으로 반영(코드 숨김)');
 await m.evaluate(()=>{E.tab='errand';render()});await m.waitForTimeout(600);
 await m.fill('#errtext','커피 사와');await m.click('[data-eadd]');await m.waitForTimeout(1500);
 ok(await a.evaluate(()=>S.errands.some(e=>e.text==='커피 사와'&&e.by==='mom')),'엄마가 적은 심부름이 아빠 폰에 실시간으로 뜸');
 await a.evaluate(()=>{E.tab='dad';render()});await a.waitForTimeout(500);
 ok(await a.evaluate(()=>!!document.getElementById('errmini')&&/커피 사와/.test(document.getElementById('errmini').textContent)),'아빠 오늘 화면에 엄마 심부름 표시');
 const cid=await a.evaluate(()=>S.errands.find(e=>e.text==='커피 사와').id);
 await a.click(`#errmini [data-etoggle="${cid}"]`);await a.waitForTimeout(1500);
 ok(await m.evaluate(()=>{const e=S.errands.find(x=>x.text==='커피 사와');return e&&e.done===1&&e.doneBy==='dad'}),'아빠가 체크하면 엄마 폰에 완료로 반영');
 await m.evaluate(()=>{E.tab='mom';render()});await m.waitForTimeout(500);
 await m.evaluate(()=>{E.memoChips=['낮잠 안 잤어요'];E.memoText='3시쯤 울었어요'});await m.evaluate(()=>saveMemo());await m.waitForTimeout(1500);
 ok(await a.evaluate(()=>!!document.getElementById('memocard')&&/낮잠 안 잤어요/.test(document.getElementById('memocard').textContent)),'엄마 메모가 아빠 오늘 화면 맨 위에 실시간으로 뜸');
 // 놀이 완료 → 마무리 보고 → 엄마 폰에 보고
 await a.evaluate(()=>{const d=new Date();startActivity('play',resolveItem('play').id)});await a.waitForTimeout(500);
 await a.click('#minibar [data-mbend]');await a.waitForTimeout(300);await a.click('[data-frx="0"]');await a.click('[data-fin="done"]');await a.waitForTimeout(500);
 await a.click('[data-fin="report"]');await a.waitForTimeout(300);await a.click('[data-fin="send"]');await a.waitForTimeout(2000);
 ok(await m.evaluate(()=>S.msgs.some(x=>x.kind==='report'&&/오늘 놀이/.test(x.text))&&S.plays.length>=1),'아빠의 마무리 보고와 놀이 기록이 엄마 폰에 도착');
 ok(await m.evaluate(()=>{E.tab='mom';render();E.op.rep=true;render();return /놀이 ·|도서 ·|잘 따라함/.test(document.getElementById('main').textContent)}),'엄마의 눈에 아빠 보고가 보임');

 // ---- 보안: 세 번째 폰, 같은 코드 ----
 const C=await phone(),c=C.p;
 await c.goto(url);await c.waitForTimeout(800);
 ok(!!(await c.$('#ssave'))&&!!(await c.$('[data-famjoin]')),'처음 설정 화면에 "이미 가족이 시작했어요 · 초대 코드로 합류" 링크');
 await c.click('[data-famjoin]');await c.waitForTimeout(300);await c.click('[data-c1]');await c.click('[data-c2]');await c.click('[data-consentgo]');await c.waitForTimeout(300);
 await c.fill('#joincode',fam.code);await c.click('[data-joincheck]');await c.waitForTimeout(1800);
 ok(/이미 사용된 코드/.test(await T(c,'#sheet')),'세 번째 폰: 이미 쓴 코드는 "이미 사용된 코드" (한 번만 쓸 수 있음)');
 ok(await c.evaluate(()=>E.mode==='local'),'합류하지 못한 폰은 계속 로컬 모드');
 // ---- 권한 없는 폰은 가족 데이터를 못 읽음 ----
 const denied=await c.evaluate(async(fid)=>{try{const {db,F}=await fbLoad();await fbUid();await F.getDocs(F.collection(db,'families/'+fid+'/plays'));return 'allowed'}catch(e){return e.code||String(e)}},fam.fid);
 ok(/permission-denied/.test(denied),'가족이 아닌 폰: 가족 데이터 읽기가 서버 규칙으로 거부됨 ('+denied+')');

 // ---- 개발자 모드는 샌드박스(클라우드에 쓰지 않음) ----
 await a.goto(url+'?dev=1');await a.waitForTimeout(1500);
 ok(await a.evaluate(()=>DEV.on&&E.mode==='local'),'개발자 모드는 가족 기록과 분리된 로컬 샌드박스');
 await a.goto(url+'?dev=0');await a.waitForTimeout(1500);
 ok(await a.evaluate(()=>E.mode==='family'),'개발자 모드를 끄면 다시 가족 모드');

 // ---- 이 폰 연결 해제 ----
 await m.click('[data-tab="conf"]');await m.waitForTimeout(500);
 await m.click('[data-famleave]');await m.waitForFunction(()=>E.mode==='local',null,{timeout:20000}).then(()=>ok(true,'엄마 폰: 연결 해제 → 로컬 모드')).catch(()=>ok(false,'엄마 폰: 연결 해제'));
 await a.waitForTimeout(1500);
 await a.click('[data-tab="conf"]');await a.waitForTimeout(800);
 ok(await a.evaluate(()=>/엄마를 기다리는 중/.test(document.getElementById('famcard').textContent)),'아빠 폰: 엄마가 해제하면 다시 "기다리는 중"');
 ok(await a.evaluate(()=>S.plays.length>=1&&S.cfg.name==='콩이'),'해제해도 가족 기록은 그대로 남음');
 // 새 코드로 다른 엄마 폰 합류 가능
 await a.evaluate(()=>{const f=JSON.parse(localStorage.getItem('dpn_fam'));f.codeExp=1;localStorage.setItem('dpn_fam',JSON.stringify(f))});await a.reload();await a.waitForTimeout(1500);
 await a.click('[data-tab="conf"]');await a.waitForTimeout(500);
 ok(!!(await a.$('[data-newinvite]')),'코드가 만료되면 "새 초대 코드 만들기"');
 await a.click('[data-newinvite]');await a.waitForTimeout(2500);
 const code2=await a.evaluate(()=>JSON.parse(localStorage.getItem('dpn_fam')).code);ok(code2&&code2!==fam.code,'새 코드 발급 ('+code2+')');
 await c.fill('#joincode',code2).catch(()=>{});
 await c.evaluate(()=>{E.join={};sheetShow(joinHTML(),'fin')});await c.fill('#joincode',code2);await c.click('[data-joincheck]');await c.waitForTimeout(1800);
 ok(/아빠가 만든 가족/.test(await T(c,'#sheet')),'연결 해제 뒤 새 코드로 다른 엄마 폰이 합류 가능');
 await c.click('[data-joinconfirm]');await c.waitForFunction(()=>E.mode==='family',null,{timeout:20000}).then(()=>ok(true,'새 엄마 폰 합류 완료')).catch(()=>ok(false,'새 엄마 폰 합류 (errs: '+c.__errs.join('|')+')'));

 // ---- 가족 기록 삭제 ----
 await a.click('[data-tab="conf"]');await a.waitForTimeout(600);
 await a.click('[data-famwipe]');await a.waitForTimeout(3500);
 const left=await a.evaluate(async()=>{await new Promise(r=>setTimeout(r,800));return{plays:S.plays.length,errands:S.errands.length,cfg:S.cfg.name}});
 ok(left.plays===0&&left.errands===0,'가족 기록 모두 삭제 → 놀이·심부름 기록이 사라짐 ('+JSON.stringify(left)+')');

 // ---- SDK 로드 실패: 쓰기 막고 안내 ----
 const D=await b.newContext({...devices['Pixel 7']});const d=await D.newPage();
 await d.addInitScript((f)=>{window.__FB_BASE='/__nofb/';localStorage.setItem('dpn_fam',JSON.stringify(f))},{fid:'x',role:'dad'});
 await d.goto(url);await d.waitForTimeout(2000);
 ok(await d.evaluate(()=>!!E.famFail&&E.canWrite===false&&/가족 기록을 불러오지 못했어요/.test(document.getElementById('main').textContent)),'연결 실패 시: 저장하지 않고 "가족 기록을 불러오지 못했어요" 안내');
 for(const x of [A,B,C])if(x.p.__errs.length)ok(false,'페이지 오류 '+x.p.__errs.join('|'));
 await b.close();srv.close();process.exit(fails?1:0);
})();
