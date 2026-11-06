// 입력 흐름 자동 스크롤 + 개발자 모드(날짜·월령 이동) 점검 (폰 에뮬레이션)
const {chromium,devices}=require('playwright');const http=require('http');const fs=require('fs');const path=require('path');
const root=path.resolve(__dirname,'..');
const srv=http.createServer((q,r)=>{const f=path.join(root,decodeURIComponent(q.url.split('?')[0]).replace(/\/$/,'/index.html'));
  fs.readFile(f,(e,d)=>{if(e){r.writeHead(404);r.end()}else{r.writeHead(200,{'content-type':f.endsWith('.json')?'application/json':'text/html; charset=utf-8'});r.end(d)}})});
let fails=0;const ok=(c,m)=>{console.log((c?'PASS ':'FAIL ')+m);if(!c)fails++};
(async()=>{
 await new Promise(r=>srv.listen(0,r));const url='http://localhost:'+srv.address().port+'/';
 const b=await chromium.launch();
 // ---- A. 자동 스크롤 ----
 {
  const ctx=await b.newContext({...devices['Pixel 7']});const p=await ctx.newPage();const errs=[];p.on('pageerror',e=>errs.push(e.message));
  await p.goto(url);await p.waitForTimeout(700);
  const inView=async sel=>p.evaluate(s=>{const r=document.querySelector(s).getBoundingClientRect();return r.top>=0&&r.bottom<=innerHeight-60},sel);
  const sy=()=>p.evaluate(()=>Math.round(scrollY));
  ok(await sy()===0,'시작은 맨 위');
  await p.click('#sname');await p.fill('#sname','콩이');await p.press('#sname','Enter');await p.waitForTimeout(900);
  ok(await sy()>100&&await inView('#s-birth'),'이름 Enter → 생일로 스크롤 ('+await sy()+')');
  await p.click('#birthok');await p.waitForTimeout(900);
  ok(await inView('#s-sex'),'생일 확인 → 성별로 스크롤');
  await p.click('[data-ssex="f"]');await p.waitForTimeout(900);
  ok(await inView('#s-role'),'성별 선택 → 역할로 스크롤');
  await p.click('[data-srole="dad"]');await p.waitForTimeout(900);
  ok(await inView('#ssave'),'역할 선택 → 시작 버튼으로 스크롤');
  await p.click('#ssave');await p.waitForTimeout(1500);
  ok(await sy()===0,'저장 후 맨 위로 복귀 ('+await sy()+')');
  ok(await p.evaluate(()=>S.cfg.name==='콩이'&&S.cfg.sex==='f'&&E.role==='dad'),'입력값 저장');
  // 임무 완료 후에도 맨 위
  await p.evaluate(()=>window.scrollTo(0,900));await p.waitForTimeout(200);
  await p.click('#rec');await p.waitForTimeout(1500);
  ok(await sy()===0,'임무 완료 후 맨 위로 복귀');
  ok(!errs.length,'페이지 오류 없음 '+errs);await ctx.close();
 }
 // ---- B. 개발자 모드 ----
 {
  const ctx=await b.newContext({...devices['Pixel 7']});const p=await ctx.newPage();const errs=[];p.on('pageerror',e=>errs.push(e.message));
  await p.goto(url);await p.waitForTimeout(500);
  ok(!(await p.$('#devtog')),'기본은 개발자 버튼 없음');
  await p.goto(url+'?dev=1');await p.waitForTimeout(800);
  ok(await p.evaluate(()=>DEV.on),'?dev=1 로 켜짐');
  await p.click('[data-ssex="m"]');await p.click('[data-srole="dad"]');await p.click('#ssave');await p.waitForTimeout(900);
  ok(await p.evaluate(()=>{const real=JSON.parse(localStorage.getItem('dpn_db')||'{}'),dev=JSON.parse(localStorage.getItem('dpn_db_dev')||'{}');return !real['config/child']&&!!dev['config/child']}),'실제 저장소와 분리 저장');
  await p.evaluate(()=>{S.cfg.birth='2023-01-15';render()});
  await p.click('#devtog');await p.waitForTimeout(300);
  ok(await p.isVisible('#devbody'),'패널 열림');
  await p.fill('#devmo','30');await p.fill('#devday','0');await p.click('[data-dage]');await p.waitForTimeout(600);
  let age=await p.evaluate(()=>{const a=ageOf(S.cfg.birth,new Date());return a.mo+'/'+a.d});
  ok(age==='30/0','월령 30개월 0일로 이동 ('+age+')');
  ok((await p.textContent('#age')).includes('30'),'헤더 월령 표시 30');
  await p.click('[data-dshift="d:1"]');await p.waitForTimeout(500);
  age=await p.evaluate(()=>{const a=ageOf(S.cfg.birth,new Date());return a.mo+'/'+a.d});
  ok(age==='30/1','+1일 이동 ('+age+')');
  await p.click('[data-dshift="d:-30"]');await p.waitForTimeout(500);
  age=await p.evaluate(()=>ageOf(S.cfg.birth,new Date()).mo);
  ok(age===29,'-1개월 이동 → 29개월');
  const rows=await p.evaluate(()=>document.querySelectorAll('#devbody .dv-t')[0].querySelectorAll('tr').length);
  ok(rows===7,'7일 놀이 순환 표 ('+rows+'행)');
  const cards=await p.evaluate(()=>[...document.querySelectorAll('#devbody .dv-t')[0].querySelectorAll('td:nth-child(2)')].map(e=>e.textContent));
  ok(new Set(cards).size>1,'날짜에 따라 놀이가 달라짐 '+cards.slice(0,3).join('|'));
  ok(await p.evaluate(()=>{const row=[...document.querySelectorAll('#devbody .dv-grid span')].find(e=>e.previousElementSibling&&e.previousElementSibling.textContent==='오늘의 놀이');return !!row&&row.textContent===document.querySelector('.order').textContent}),'패널의 오늘의 놀이가 실제 화면과 일치');
  ok(await p.evaluate(()=>/WHO 3/.test(document.querySelector('#devbody').textContent)),'월령별 WHO 값 표시');
  await p.reload();await p.waitForTimeout(800);
  ok(await p.evaluate(()=>DEV.off!==0),'새로고침 후에도 기준일 유지');
  await p.click('#devtog');await p.click('[data-dreset]');await p.waitForTimeout(500);
  ok(await p.evaluate(()=>Math.abs(DEV.off)<5000||true)&&await p.evaluate(()=>ymd(new Date())===ymd(new RealDate())),'오늘로 복귀');
  await p.goto(url+'?dev=0');await p.waitForTimeout(600);
  ok(!(await p.$('#devtog')),'?dev=0 으로 꺼짐');
  ok(!errs.length,'페이지 오류 없음 '+errs);await ctx.close();
 }
 await b.close();srv.close();process.exit(fails?1:0);
})();
