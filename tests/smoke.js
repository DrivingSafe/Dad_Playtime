const {chromium}=require('playwright');const fs=require('fs');
(async()=>{
 const refs={};for(const k of ['lfa_f','lfa_m','wfa_f','wfa_m'])refs[k]=JSON.parse(fs.readFileSync(require('path').resolve(__dirname,'../data/who/doc_'+k+'.json')));
 const b=await chromium.launch();const p=await b.newPage({viewport:{width:390,height:800},deviceScaleFactor:2});
 const errs=[];p.on('pageerror',e=>errs.push(e.message));
 await p.addInitScript((refs)=>{
  const store={};for(const k in refs)store['ref/'+k]=refs[k];const subs=[];
  const mk=path=>({set:async d=>{store[path]=d;fire()},get:async()=>({exists:path in store,data:()=>store[path]}),onSnapshot:cb=>{const f=()=>cb({exists:path in store,data:()=>store[path]});subs.push(f);f()}});
  const col=name=>{const q={orderBy:()=>q,limit:()=>q,onSnapshot:cb=>{const f=()=>cb({docs:Object.keys(store).filter(k=>k.startsWith(name+'/')&&k.split('/').length===2).map(k=>({id:k.split('/')[1],data:()=>store[k]}))});subs.push(f);f()}};return q};
  const fire=()=>subs.forEach(f=>f());
  window.claude={use:async n=>n==='db'?{doc:mk,collection:col}:{can:async()=>true,id:async()=>'u1'}};
 },refs);
 await p.goto('file://'+require('path').resolve(__dirname,'../index.html'));await p.waitForTimeout(600);
 // wheel scroll test: year wheel to 2023 (index from cy-8)
 const cy=new Date().getFullYear();
 await p.evaluate(()=>{document.querySelector('[data-w=m]').scrollTop=40*(2-1)});await p.waitForTimeout(300);
 console.log('after month scroll',await p.evaluate(()=>E.sbirth),await p.inputValue('.wtxt'));
 await p.fill('.wtxt','20240229');await p.waitForTimeout(300);
 console.log('typed',await p.evaluate(()=>E.sbirth));
 await p.fill('.wtxt','20230231');await p.waitForTimeout(200);
 console.log('invalid keeps',await p.evaluate(()=>E.sbirth));
 await p.fill('.wtxt','20230115');await p.waitForTimeout(300);
 await p.screenshot({path:'wheel.png'});
 await p.click('[data-ssex="m"]');await p.click('[data-srole="dad"]');
 console.log('birth kept after rerender',await p.evaluate(()=>E.sbirth),await p.evaluate(()=>document.querySelector('[data-w=m]').scrollTop));
 await p.click('#ssave');await p.waitForTimeout(400);
 console.log('cfg',await p.evaluate(()=>JSON.stringify(S.cfg)));
 await p.click('[data-tab="grow"]');await p.waitForTimeout(300);
 await p.fill('#gh','90');await p.fill('#gw','13');await p.evaluate(()=>{E.gh=90;E.gw=13});await p.click('#gsave');await p.waitForTimeout(400);
 const t=await p.textContent('#main');console.log('percentile shown:',/백분위/.test(t),t.match(/WHO 표준 기준[^\n]{0,60}/)?.[0],'| notice:',/불러오지|성별이 아직/.test(t));
 await p.screenshot({path:'grow.png',fullPage:true});
 console.log('errs',errs);await b.close();
})();
