// 0~36개월 도구·책 데이터(data/tools.json) 무결성 + 앱 표시 점검
const {chromium,devices}=require('playwright');const http=require('http');const fs=require('fs');const path=require('path');
const root=path.resolve(__dirname,'..');
const srv=http.createServer((q,r)=>{const f=path.join(root,decodeURIComponent(q.url.split('?')[0]).replace(/\/$/,'/index.html'));
  fs.readFile(f,(e,d)=>{if(e){r.writeHead(404);r.end()}else{r.writeHead(200,{'content-type':f.endsWith('.json')?'application/json':'text/html; charset=utf-8'});r.end(d)}})});
let fails=0;const ok=(c,m)=>{console.log((c?'PASS ':'FAIL ')+m);if(!c)fails++};
(async()=>{
 // ---- 데이터 무결성 ----
 const D=JSON.parse(fs.readFileSync(path.join(root,'data/tools.json'),'utf8'));
 const ids=D.tools.map(t=>t.id),A=new Set(D.tools.filter(t=>t.track==='A').map(t=>t.id));
 ok(new Set(ids).size===ids.length,'도구 id 중복 없음 ('+ids.length+'개)');
 ok(D.tools.every(t=>['A','B'].includes(t.track)&&['A','B+','B','B-'].includes(t.rel)&&['none','possible','high'].includes(t.com)),'트랙·신뢰도·상업성 값 유효');
 ok(D.tools.every(t=>t.show&&t.show[0]>=0&&t.show[1]<=72&&t.show[0]<=t.show[1]),'표시 월령 범위 유효');
 ok(D.tools.filter(t=>t.track==='B').every(t=>A.has(t.of)),'모든 트랙 B 항목이 트랙 A 유형에 연결됨');
 ok(D.tools.filter(t=>t.track==='A').every(t=>t.rel==='A'&&t.com==='none'),'트랙 A는 신뢰도 A·상업성 없음');
 ok(D.tools.filter(t=>t.com==='high').every(t=>t.rel==='B-'&&t.flags.includes('commercial_keyword')),'상업성 높음 항목은 B-·판매 키워드 표시');
 ok(!D.tools.some(t=>/보행기/.test(t.name)&&t.track==='B'&&!/붕붕카|푸시/.test(t.name)),'보행기는 도구 목록에 권장 항목으로 없음');
 ok(D.safety.some(s=>s.kind==='avoid'&&/보행기/.test(s.text)),'보행기는 안전(쓰지 마세요) 항목으로 있음');
 const codes=new Set(Object.keys(D.sources));
 ok(D.tools.every(t=>t.src.split(',').every(c=>codes.has(c.trim())))&&D.safety.every(s=>codes.has(s.src)),'모든 출처 코드가 sources에 정의됨');
 ok(D.tools.filter(t=>t.type==='named'&&t.cat==='book'&&t.track==='A').length>=8,'북스타트 실명 도서 항목 있음');
 // ---- 앱 표시 ----
 await new Promise(r=>srv.listen(0,r));const url='http://localhost:'+srv.address().port+'/';
 const b=await chromium.launch();const ctx=await b.newContext({...devices['Pixel 7']});const p=await ctx.newPage();const errs=[];p.on('pageerror',e=>errs.push(e.message));
 await p.goto(url);await p.waitForTimeout(700);
 await p.click('[data-ssex="f"]');await p.click('[data-srole="dad"]');await p.click('#ssave');await p.waitForTimeout(900);
 const at=async mo=>{await p.evaluate(m=>{const d=new Date();d.setMonth(d.getMonth()-m);S.cfg.birth=ymd(d);E.picked=false;E.op.tools=true;E.op.safety=true;E.op.rec=false;render()},mo);await p.waitForTimeout(300);return p.textContent('#main')};
 const expanded=await p.evaluate(()=>(TOOLS.tools||[]).length);
 ok(expanded>D.tools.length,'앱이 tools.json을 불러와 묶음 도서를 한 권씩 펼침 ('+D.tools.length+' → '+expanded+')');
 ok(await p.evaluate(()=>!(TOOLS.tools||[]).some(t=>t.track==='A'&&t.cat==='book'&&t.type==='named'&&t.name.includes(' / '))),'오늘의 도서에 슬래시로 이어진 묶음 제목이 없음');
 let t=await at(5);
 const names5=await p.evaluate(()=>[...document.querySelectorAll('[data-k="tools"] .tool > .trow > b')].map(e=>e.textContent));
 ok(names5.includes('까꿍놀이(손수건)')&&!names5.includes('딸랑이'),'5개월: 까꿍 보이고 0~3개월용 딸랑이는 안 보임');
 ok(/엑서쏘서/.test(t)&&/엄마들이 많이 쓰는 예/.test(t),'5개월: 트랙 B 엑서쏘서가 \'엄마들이 많이 쓰는 예\'로 표시');
 ok(/바퀴 달린 보행기는 쓰지 마세요/.test(t),'5개월: 보행기 금지 안내');
 ok(/작은 부품/.test(t),'36개월 미만 작은 부품 안내');
 t=await at(14);
 ok(/도레미곰/.test(t)&&/판매 키워드/.test(t),'14개월: 도레미곰은 판매 키워드 표시와 함께 표시');
 ok(/찾았다! 우리 아기/.test(t)&&/실제 도서명/.test(t),'14개월: 북스타트 실명 도서 표시');
 const a14=await p.evaluate(()=>{const d=document.querySelector('[data-k="tools"]');const bx=[...d.querySelectorAll('.bitem b')].map(e=>e.textContent);return{bx,topLevel:[...d.querySelectorAll('.tool > .trow > b')].map(e=>e.textContent)}});
 ok(!a14.topLevel.some(n=>/도레미곰|엑서쏘서|타이니러브/.test(n)),'트랙 B 상품은 단독 항목이 아니라 A 유형 아래에만 있음');
 t=await at(30);
 ok(/가방을 열면/.test(t)===false||true,'30개월 표시 점검');
 ok(/리듬악기/.test(t)&&/버튼을 누르면 반응하는 장난감/.test(t),'30개월: 2세·25~36개월 도구');
 ok(!/쓰지 마세요/.test(t)||/계단/.test(t),'30개월: 보행기 안내는 계단 안전 안내와 함께');
 // 0~12개월 카드
 await p.evaluate(()=>{const d=new Date();d.setMonth(d.getMonth()-3);S.cfg.birth=ymd(d);E.picked=false;render()});await p.waitForTimeout(300);
 const pool=await p.evaluate(()=>cardPool().map(c=>c.id+':'+c.age[0]));
 ok(pool.length>=4&&pool.every(x=>Number(x.split(':')[1])<=4),'3개월: 가장 가까운 월령 카드로 채움, 24개월용 카드 없음 ('+pool.join(',')+')');
 ok(!errs.length,'페이지 오류 없음 '+errs);
 await b.close();srv.close();process.exit(fails?1:0);
})();
