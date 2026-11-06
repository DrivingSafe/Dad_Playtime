// 한 브라우저(컨텍스트 1개)에서 ?profile=dad / ?profile=mom 두 탭으로 실제 가족 연결 (SDK + 에뮬레이터 + 실제 rules)
// 실행: ./tests/rules/node_modules/.bin/firebase emulators:exec --config firebase.json --only firestore,auth --project dad-playtime-test "node tests/split.js"
const {chromium,devices}=require('playwright');const http=require('http');const fs=require('fs');const path=require('path');
const root=path.resolve(__dirname,'..');const dist=path.join(__dirname,'rules/dist');
if(!fs.existsSync(dist)){console.log('SKIP: tests/rules 에서 npm install && node build-sdk.js 가 필요해요');process.exit(0)}
const mime=f=>f.endsWith('.json')?'application/json':f.endsWith('.js')?'text/javascript':'text/html; charset=utf-8';
const srv=http.createServer((q,r)=>{const u=decodeURIComponent(q.url.split('?')[0]);
  const f=u.startsWith('/__fb/')?path.join(dist,u.slice(6)):path.join(root,u.replace(/\/$/,'/index.html'));
  fs.readFile(f,(e,d)=>{if(e){r.writeHead(404);r.end()}else{r.writeHead(200,{'content-type':mime(f)});r.end(d)}})});
let fails=0;const ok=(c,m)=>{console.log((c?'PASS ':'FAIL ')+m);if(!c)fails++};
(async()=>{
 await new Promise(r=>srv.listen(0,r));const url='http://localhost:'+srv.address().port+'/';
 const b=await chromium.launch();const ctx=await b.newContext({...devices['Pixel 7']});
 await ctx.addInitScript(()=>{window.__FB_BASE='/__fb/'});
 const mk=async q=>{const p=await ctx.newPage();p.__e=[];p.on('pageerror',e=>p.__e.push(e.message));p.on('dialog',d=>d.accept());await p.goto(url+q);await p.waitForTimeout(900);return p};
 const d=await mk('?profile=dad');
 await d.click('[data-ssex="f"]');await d.click('[data-srole="dad"]');await d.fill('#sname','콩이');await d.click('#ssave');await d.waitForTimeout(800);
 await d.click('[data-tab="conf"]');await d.click('[data-famnew]');await d.waitForTimeout(300);
 await d.click('[data-c1]');await d.click('[data-c2]');await d.click('[data-consentgo]');
 await d.waitForFunction(()=>E.mode==='family',null,{timeout:20000}).then(()=>ok(true,'아빠 탭: 가족 생성')).catch(()=>ok(false,'가족 생성 '+d.__e.join('|')));
 await d.waitForTimeout(1500);
 const fam=await d.evaluate(()=>JSON.parse(localStorage.getItem('p_dad_dpn_fam')));
 ok(fam&&/^[A-Z2-9]{6}$/.test(fam.code),'아빠 프로필 키(p_dad_dpn_fam)에 가족 정보 저장 '+(fam&&fam.code));
 const m=await mk('?profile=mom&join='+fam.code);
 await m.click('[data-c1]');await m.click('[data-c2]');await m.click('[data-consentgo]');await m.waitForTimeout(500);
 await m.click('[data-joincheck]');await m.waitForTimeout(1500);await m.click('[data-joinconfirm]');
 await m.waitForFunction(()=>E.mode==='family',null,{timeout:20000}).then(()=>ok(true,'엄마 탭: 같은 브라우저인데도 합류 성공')).catch(()=>ok(false,'합류 '+m.__e.join('|')));
 await m.waitForTimeout(2000);
 const uids=await Promise.all([d,m].map(p=>p.evaluate(()=>E.famUid)));
 ok(uids[0]&&uids[1]&&uids[0]!==uids[1],'두 탭이 서로 다른 익명 사용자 ('+uids.map(u=>String(u).slice(0,6)).join(' ≠ ')+')');
 ok(await m.evaluate(()=>E.role==='mom'&&S.cfg.name==='콩이'),'엄마 탭: 역할 엄마, 아빠가 만든 아이 정보 보임');
 await m.evaluate(()=>addErrand('두부 사와','wayhome'));await m.waitForTimeout(1500);
 ok(await d.evaluate(()=>S.errands.some(e=>e.text==='두부 사와')),'엄마 탭에서 적은 심부름이 아빠 탭에 실시간 도착');
 ok(await d.evaluate(()=>/연결됨/.test(document.body.textContent)||E.mode==='family'),'아빠 탭: 연결됨');
 ok(![d,m].some(p=>p.__e.length),'JS 오류 없음 '+[d,m].map(p=>p.__e.join('|')).join(''));
 await b.close();srv.close();console.log(fails?fails+' FAIL':'ALL PASS');process.exit(fails?1:0);
})();
