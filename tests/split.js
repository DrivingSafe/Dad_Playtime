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
 // --- 가족 모드에서도 WHO 기준표가 로드됨 / 엄마 지시가 아빠 시계와 상관없이 우선
 await d.waitForTimeout(800);
 ok(await d.evaluate(()=>['wfa_m','wfa_f','lfa_m','lfa_f'].every(k=>S.ref[k]&&S.ref[k].length>50))&&await m.evaluate(()=>!!S.ref.wfa_f),'가족 모드: WHO 기준표(4종) 로드됨');
 await d.evaluate(()=>{const c=CARDS[3].id;PICK={date:today(),playId:c,playTs:Date.now()+3600e3,playLock:false};pickSave();render()});
 const cid=await m.evaluate(()=>cardPool().find(c=>c.id!==resolveItem('play').id).id);
 await m.evaluate(id=>assignItem('play',id),cid);
 await d.waitForFunction(id=>resolveItem('play').id===id,cid,{timeout:6000}).then(()=>ok(true,'엄마 지시가 아빠 폰에 반영 (아빠 쪽 선택·시계가 앞서 있어도)')).catch(()=>ok(false,'엄마 지시 미반영'));
 // --- 아빠 보고가 엄마에게 알림으로 도착 (엄마가 다른 탭을 보는 중)
 await m.click('[data-tab="check"]');await m.waitForTimeout(300);
 await d.evaluate(()=>sendMsg('report','오늘 보고 테스트','',true));
 await m.waitForFunction(()=>/도착했어요/.test(document.getElementById('toast').textContent)&&!document.getElementById('toast').hidden,null,{timeout:6000}).then(()=>ok(true,'엄마: 아빠 보고 도착 알림(토스트)')).catch(()=>ok(false,'보고 알림 없음'));
 ok(await m.evaluate(()=>unread()>0)&&await m.evaluate(()=>!document.querySelector('nav [data-tab="mom"] .dot').hidden),'엄마 탭에 안 읽음 점 표시');
 // --- 엄마 폰 연결 해제 → 아빠가 새 코드로 다른 폰 연결
 await m.click('[data-tab="conf"]');await m.waitForTimeout(300);await m.click('[data-famleave]');await m.waitForTimeout(2500);
 await d.waitForFunction(()=>!!document.querySelector('[data-tab="conf"]'),null,{timeout:3000});
 await d.click('[data-tab="conf"]');await d.waitForTimeout(800);
 ok(await d.evaluate(()=>/해제했어요/.test(document.getElementById('famcard').textContent)&&!!document.querySelector('[data-newinvite]')&&!document.getElementById('invcode')),'해제 후 아빠: 이전(사용된) 코드 숨기고 새 코드 만들기 안내');
 await d.click('[data-newinvite]');await d.waitForTimeout(2500);
 const code2=await d.evaluate(()=>(document.getElementById('invcode')||{}).textContent);
 ok(/^[A-Z2-9]{6}$/.test(code2||'')&&code2!==fam.code,'새 초대 코드 발급 '+code2);
 const m2=await mk('?profile=mom2&join='+code2);
 await m2.click('[data-c1]');await m2.click('[data-c2]');await m2.click('[data-consentgo]');await m2.waitForTimeout(500);
 await m2.click('[data-joincheck]');await m2.waitForTimeout(1500);await m2.click('[data-joinconfirm]');
 await m2.waitForFunction(()=>E.mode==='family',null,{timeout:20000}).then(()=>ok(true,'다른 폰이 새 코드로 합류')).catch(()=>ok(false,'새 코드 합류 '+m2.__e.join('|')));
 const m3=await mk('?profile=mom3&join='+fam.code);
 await m3.click('[data-c1]');await m3.click('[data-c2]');await m3.click('[data-consentgo]');await m3.waitForTimeout(500);
 await m3.click('[data-joincheck]');await m3.waitForTimeout(1500);
 ok(/이미 사용된 코드/.test(await m3.textContent('#sheet')),'예전 코드 재사용은 "이미 사용된 코드" 안내');
 ok(await d.evaluate(()=>/연결됨/.test(document.body.textContent)||E.mode==='family'),'아빠 탭: 연결됨');
 ok(![d,m].some(p=>p.__e.length),'JS 오류 없음 '+[d,m].map(p=>p.__e.join('|')).join(''));
 await b.close();srv.close();console.log(fails?fails+' FAIL':'ALL PASS');process.exit(fails?1:0);
})();
