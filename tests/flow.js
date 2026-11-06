// 로컬 저장소 어댑터로 주요 흐름(설정·놀이 기록·메시지·컨펌·의견·새로고침 유지)과 콘텐츠 무결성을 점검한다.
const {chromium}=require('playwright');const http=require('http');const fs=require('fs');const path=require('path');
const root=path.resolve(__dirname,'..');
const srv=http.createServer((q,r)=>{const f=path.join(root,decodeURIComponent(q.url.split('?')[0]).replace(/^\/$/,'/index.html'));
  fs.readFile(f,(e,d)=>{if(e){r.writeHead(404);r.end()}else{r.writeHead(200,{'content-type':f.endsWith('.json')?'application/json':'text/html; charset=utf-8'});r.end(d)}})});
let fails=0;const ok=(c,m)=>{console.log((c?'PASS ':'FAIL ')+m);if(!c)fails++};
(async()=>{
 await new Promise(r=>srv.listen(0,r));const url='http://localhost:'+srv.address().port+'/';
 const b=await chromium.launch();const ctx=await b.newContext({viewport:{width:390,height:800}});const p=await ctx.newPage();
 const errs=[];p.on('pageerror',e=>errs.push(e.message));
 await p.goto(url);await p.waitForTimeout(600);

 // 콘텐츠 무결성
 const c=await p.evaluate(()=>({n:CARDS.length,ids:CARDS.map(x=>x.id),bad:CARDS.filter(x=>!x.t||!x.steps||x.steps.length<3||!x.x30||!x.q||!x.doms.length||(!x.ms.length&&x.age[1]>26)||x.doms.some(d=>!DOM[d])||x.ms.some(m=>!MSBY[m])).map(x=>x.id),items:Object.keys(ITEMS).filter(k=>!CARDS.some(x=>x.id===k))}));
 ok(c.n>=55,'카드 수 '+c.n);ok(new Set(c.ids).size===c.n,'카드 id 중복 없음');ok(!c.bad.length,'카드 필드 유효 '+c.bad);ok(!c.items.length,'ITEMS가 없는 카드를 가리키지 않음');

 // WHO 표 자동 로드(http)
 const ref=await p.evaluate(()=>Object.keys(S.ref).sort().join());ok(ref==='lfa_f,lfa_m,wfa_f,wfa_m','WHO 표 시드 '+ref);

 // 공개 체험용 정리 (서버 없는 모드)
 const pub=await p.evaluate(()=>({birth:S.cfg.birth,def:DEF_BIRTH,local:E.local,foot:document.querySelector('#foot').textContent,setup:document.querySelector('#main').textContent}));
 ok(pub.birth===pub.def,'기본 생일은 현재 기준 임시값 '+pub.birth);
 ok(pub.local&&/서버가 없습니다/.test(pub.foot)&&/기기에만 저장/.test(pub.setup),'저장 방식 안내 표시');
 ok(/진단·치료 조언이 아닙니다/.test(pub.foot),'참고용 면책 문구');
 // 초기 설정
 ok(await p.evaluate(()=>E.db!==null),'로컬 어댑터 연결');
 await p.click('[data-ssex="f"]');await p.click('[data-srole="dad"]');await p.fill('#sname','하늘');await p.click('#ssave');await p.waitForTimeout(300);
 let cfg=await p.evaluate(()=>S.cfg);ok(cfg.sex==='f'&&cfg.name==='하늘','설정 저장 '+JSON.stringify(cfg));

 // 발달 체크
 await p.click('[data-tab="check"]');await p.click('[data-ms="s1"][data-lv="2"]');await p.waitForTimeout(200);
 ok(await p.evaluate(()=>S.ms.s1&&S.ms.s1.level===2&&S.log.length===1),'체크 저장 + 로그');

 // 놀이 기록
 await p.click('[data-tab="dad"]');await p.click('[data-start="play"]');await p.waitForTimeout(300);
 ok(await p.evaluate(()=>!!ACT&&ACT.kind==='play'&&DAY.state==='running'),'이걸로 하기 → 오늘 카운트 시작');
 await p.click('#minibar [data-mbend]');await p.waitForTimeout(300);
 await p.click('[data-frx="0"]');await p.click('[data-fbk="2"]');await p.click('[data-fin="done"]');await p.waitForTimeout(500);
 ok(await p.evaluate(()=>S.plays.length===1&&S.plays[0].mins>=1&&S.plays[0].kind==='play'&&S.plays[0].r===0&&S.plays[0].b===2&&ACT===null),'놀이 완료 기록(반응·횟수)');
 await p.click('[data-fin="report"]');await p.waitForTimeout(300);await p.click('[data-fin="send"]');await p.waitForTimeout(500);
 ok(await p.evaluate(()=>S.msgs.length===1&&S.msgs[0].kind==='report'&&/완료/.test(S.msgs[0].text)),'오늘 마무리 → 엄마에게 보고');

 // 메시지
 ok(!(await p.$('[data-msg="ask:0"]')),'서버 없는 모드에서는 엄마에게 보내기 숨김');await p.evaluate(()=>sendMsg('ask','테스트'));await p.waitForTimeout(200);
 ok(await p.evaluate(()=>S.msgs.length===2&&S.msgs[0].from==='dad'&&S.msgs.some(m=>m.kind==='report')),'보고 메시지 + 메시지 전송');

 // 컨펌·의견
 await p.click('[data-tab="conf"]');await p.click('[data-conf]:first-of-type');await p.waitForTimeout(200);
 ok(await p.evaluate(()=>Object.keys(S.conf).length===1),'컨펌 저장');
 await p.fill('#fbtext','문구가 세요');await p.click('#fbsend');await p.waitForTimeout(200);
 ok(await p.evaluate(()=>S.fb.length===1&&S.fb[0].text==='문구가 세요'),'의견 저장');
 await p.click('[data-donefb]');await p.waitForTimeout(200);
 ok(await p.evaluate(()=>S.fb[0].done===1),'반영됨 토글');

 await p.click('[data-tab="conf"]');await p.waitForTimeout(150);
 const ct=await p.textContent('#main');ok(!/Artifact|공유 메뉴|기여자/.test(ct)&&/이 기기에만 저장/.test(ct),'컨펌 탭에 Artifact 안내 없음');
 await p.click('[data-tab="grow"]');await p.waitForTimeout(150);
 ok(!/앱 사용자/.test(await p.textContent('#main')),'서버 없는 모드에서 앱 사용자 평균 숨김');
 // 새로고침 후 유지
 await p.reload();await p.waitForTimeout(700);
 const st=await p.evaluate(()=>({n:S.cfg.name,ms:!!S.ms.s1,pl:S.plays.length,m:S.msgs.length,c:Object.keys(S.conf).length,f:S.fb.length,role:E.role}));
 ok(st.n==='하늘'&&st.ms&&st.pl===1&&st.m===2&&st.c===1&&st.f===1&&st.role==='dad','새로고침 후 데이터 유지 '+JSON.stringify(st));

 // 모든 탭이 오류 없이 렌더
 ok(!(await p.isVisible('[data-tab="mom"]')),'아빠 역할에는 엄마의 눈 탭이 안 보임');
 for(const t of ['dad','check','grow','conf']){await p.click(`[data-tab="${t}"]`);await p.waitForTimeout(150);ok((await p.textContent('#main')).length>50,'탭 렌더 '+t)}
 ok(!errs.length,'페이지 오류 없음 '+errs);
 await b.close();srv.close();process.exit(fails?1:0);
})();
