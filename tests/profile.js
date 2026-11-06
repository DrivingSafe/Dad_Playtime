// 테스트 프로필(?profile=) : 한 브라우저에서 두 프로필의 저장소가 섞이지 않고, dev-split.html 구조가 맞는지
const {chromium,devices}=require('playwright');const http=require('http');const fs=require('fs');const path=require('path');
const root=path.resolve(__dirname,'..');
const srv=http.createServer((q,r)=>{const f=path.join(root,decodeURIComponent(q.url.split('?')[0]).replace(/\/$/,'/index.html'));
  fs.readFile(f,(e,d)=>{if(e){r.writeHead(404);r.end()}else{r.writeHead(200,{'content-type':f.endsWith('.json')?'application/json':f.endsWith('.js')?'text/javascript':'text/html; charset=utf-8'});r.end(d)}})});
let fails=0;const ok=(c,m)=>{console.log((c?'PASS ':'FAIL ')+m);if(!c)fails++};
(async()=>{
 await new Promise(r=>srv.listen(0,r));const url='http://localhost:'+srv.address().port+'/';
 const b=await chromium.launch();const ctx=await b.newContext({...devices['Pixel 7']});
 const mk=async q=>{const p=await ctx.newPage();p.__e=[];p.on('pageerror',e=>p.__e.push(e.message));p.on('dialog',d=>d.accept());await p.goto(url+q);await p.waitForTimeout(900);return p};
 const setup=async(p,role,name)=>{await p.click('[data-ssex="f"]');await p.click(`[data-srole="${role}"]`);if(name)await p.fill('#sname',name);await p.click('#ssave');await p.waitForTimeout(800)};
 const d=await mk('?profile=dad'),m=await mk('?profile=mom');let n;
 ok(await d.evaluate(()=>!document.getElementById('profbadge').hidden&&/dad/.test(document.getElementById('profbadge').textContent)),'프로필 배지 표시 (dad)');
 await setup(d,'dad','콩이');await setup(m,'mom','콩이');
 const keys=p=>p.evaluate(()=>Object.keys(localStorage).sort());
 const kd=await keys(d);
 ok(kd.some(k=>k.startsWith('p_dad_'))&&kd.some(k=>k.startsWith('p_mom_')),'같은 브라우저에 p_dad_ / p_mom_ 키가 따로 저장 ('+kd.filter(k=>/^p_/.test(k)).length+'개)');
 ok(!kd.includes('dpn_db')&&!kd.includes('role'),'프로필 모드는 기본 키(dpn_db 등)를 건드리지 않음');
 ok(await d.evaluate(()=>E.role)==='dad'&&await m.evaluate(()=>E.role)==='mom','두 프로필의 역할이 각자 유지 (아빠/엄마)');
 n=await mk('');ok(await n.evaluate(()=>document.getElementById('profbadge').hidden),'프로필 없으면 배지 없음');
 await d.evaluate(()=>{addErrand('아빠만 아는 메모','any')});await d.waitForTimeout(400);
 await m.reload();await m.waitForTimeout(900);
 ok(await m.evaluate(()=>S.errands.length===0),'아빠 프로필 기록이 엄마 프로필에 새지 않음 (로컬 모드)');
 await d.reload();await d.waitForTimeout(900);
 ok(await d.evaluate(()=>S.errands.some(e=>/아빠만/.test(e.text))),'새로고침해도 프로필별 기록 유지');
 await n.reload();await n.waitForTimeout(700);
 ok(!!(await n.$('#ssave')),'프로필 없는 기본 앱은 처음 설정 화면 (오염 없음)');
 ok([d,m,n].every(p=>!p.__e.length),'JS 오류 없음 '+[d,m,n].map(p=>p.__e.join('|')).join(''));
 // dev-split
 const s=await mk('dev-split.html');
 const fr=await s.evaluate(()=>[...document.querySelectorAll('iframe')].map(f=>f.getAttribute('src')||f.src));
 ok(fr.length===2&&fr.some(x=>/profile=dad/.test(x))&&fr.some(x=>/profile=mom/.test(x)),'dev-split.html: 아빠·엄마 iframe 2개');
 await s.waitForTimeout(1200);
 const fs2=s.frames().filter(f=>/profile=/.test(f.url()));
 ok(fs2.length===2,'두 iframe 모두 로드됨');
 // 모두 초기화 후 프로필 키가 사라지는지
 const btn=await s.$('text=모두 초기화');ok(!!btn,'모두 초기화 버튼 존재');
 if(btn){await btn.click();await s.waitForTimeout(2000);
  const fr2=s.frames().filter(f=>/profile=/.test(f.url()));
  ok(fr2.length===2&&(await Promise.all(fr2.map(f=>f.evaluate(()=>!!document.querySelector('#ssave'))))).every(Boolean),'모두 초기화 → 두 폰 모두 처음 설정 화면으로 돌아감')}
 await b.close();srv.close();console.log(fails?fails+' FAIL':'ALL PASS');process.exit(fails?1:0);
})();
