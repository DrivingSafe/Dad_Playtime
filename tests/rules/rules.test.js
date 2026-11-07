// Firestore 보안 규칙 테스트 (에뮬레이터). 실행: cd tests/rules && npm test
const {initializeTestEnvironment,assertSucceeds,assertFails}=require('@firebase/rules-unit-testing');
const fs=require('fs');const path=require('path');
let fails=0,n=0;
const ok=(c,m)=>{n++;console.log((c?'PASS ':'FAIL ')+m);if(!c)fails++};
const T=async(m,p,expectOk)=>{try{if(expectOk)await assertSucceeds(p);else await assertFails(p);ok(true,m)}catch(e){ok(false,m+' → '+String(e.message).slice(0,120))}};
(async()=>{
 const env=await initializeTestEnvironment({projectId:'dad-playtime-test',firestore:{rules:fs.readFileSync(path.resolve(__dirname,'../../firestore.rules'),'utf8')}});
 const now=Date.now(),H=3600e3;
 const dbOf=uid=>uid?env.authenticatedContext(uid).firestore():env.unauthenticatedContext().firestore();
 const create=async(uid,fid,code,role)=>{ // 새 가족: 가족+내 구성원+초대(반대 역할)+users 를 한 번에
   const db=dbOf(uid),b=db.batch();
   b.set(db.doc(`families/${fid}`),{createdBy:uid,createdAt:now});
   b.set(db.doc(`families/${fid}/members/${uid}`),{role,joinedAt:now,seen:0});
   b.set(db.doc(`families/${fid}/roles/${role}`),{uid,at:now});
   b.set(db.doc(`invites/${code}`),{familyId:fid,role:role==='dad'?'mom':'dad',createdBy:uid,usedBy:null,expiresAt:now+7*24*H,createdAt:now});
   b.set(db.doc(`users/${uid}`),{familyId:fid,role});
   return b.commit();
 };
 const join=async(uid,fid,code,role,{burn=true,marker=true}={})=>{
   const db=dbOf(uid),b=db.batch();
   b.set(db.doc(`families/${fid}/members/${uid}`),{role,joinedAt:now,seen:0,inviteCode:code});
   if(marker)b.set(db.doc(`families/${fid}/roles/${role}`),{uid,at:now});
   if(burn)b.update(db.doc(`invites/${code}`),{usedBy:uid,usedAt:now});
   return b.commit();
 };
 // ---- 로그인 안 한 사람 ----
 await T('비로그인: 가족 데이터 읽기 거부',dbOf(null).doc('families/f1/plays/p1').get(),false);
 await T('비로그인: 쓰기 거부',dbOf(null).doc('families/f1/plays/p1').set({a:1}),false);
 await T('비로그인: 초대 읽기 거부',dbOf(null).doc('invites/ABC123').get(),false);
 // ---- 가족 만들기 ----
 await T('엄마·아빠 중 한 명이 새 가족 + 구성원 + 초대 + users 생성',create('alice','f1','CODE01','dad'),true);
 await T('남의 이름(createdBy)으로 가족 만들기 거부',(async()=>{const db=dbOf('mallory'),b=db.batch();b.set(db.doc('families/fx'),{createdBy:'alice'});b.set(db.doc('families/fx/members/mallory'),{role:'dad',joinedAt:now});b.set(db.doc('families/fx/roles/dad'),{uid:'mallory'});return b.commit()})(),false);
 await T('같은 역할로 초대 만들기 거부(내가 아빠인데 아빠 초대)',(async()=>{const db=dbOf('bob2'),b=db.batch();b.set(db.doc('families/fy'),{createdBy:'bob2'});b.set(db.doc('families/fy/members/bob2'),{role:'dad',joinedAt:now});b.set(db.doc('families/fy/roles/dad'),{uid:'bob2'});b.set(db.doc('invites/SAMEROLE'),{familyId:'fy',role:'dad',createdBy:'bob2',usedBy:null,expiresAt:now+H});return b.commit()})(),false);
 await T('만료 시각이 8일을 넘는 초대 거부',(async()=>{const db=dbOf('bob3'),b=db.batch();b.set(db.doc('families/fz'),{createdBy:'bob3'});b.set(db.doc('families/fz/members/bob3'),{role:'dad',joinedAt:now});b.set(db.doc('families/fz/roles/dad'),{uid:'bob3'});b.set(db.doc('invites/LONG'),{familyId:'fz',role:'mom',createdBy:'bob3',usedBy:null,expiresAt:now+30*24*H});return b.commit()})(),false);
 // ---- 데이터 접근 ----
 await T('구성원(alice): 가족 데이터 쓰기',dbOf('alice').doc('families/f1/plays/p1').set({mins:10,ts:now}),true);
 await T('구성원(alice): 가족 데이터 읽기',dbOf('alice').doc('families/f1/plays/p1').get(),true);
 await T('구성원(alice): 가족 문서 읽기',dbOf('alice').doc('families/f1').get(),true);
 await T('비구성원(eve): 가족 데이터 읽기 거부',dbOf('eve').doc('families/f1/plays/p1').get(),false);
 await T('비구성원(eve): 가족 데이터 쓰기 거부',dbOf('eve').doc('families/f1/plays/p2').set({a:1}),false);
 await T('비구성원(eve): 가족 목록(컬렉션) 조회 거부',dbOf('eve').collection('families/f1/plays').get(),false);
 await T('비구성원(eve): 구성원 목록 조회 거부',dbOf('eve').collection('families/f1/members').get(),false);
 // ---- 초대 코드 ----
 await T('로그인한 사람: 정확한 코드로 초대 읽기(get)',dbOf('bob').doc('invites/CODE01').get(),true);
 await T('초대 목록(list) 조회 거부 — 코드를 훔쳐보지 못함',dbOf('bob').collection('invites').get(),false);
 await T('초대 삭제 거부',dbOf('alice').doc('invites/CODE01').delete(),false);
 // ---- 합류 ----
 await T('잘못된 역할(아빠 자리에 아빠)로 합류 거부',join('bob','f1','CODE01','dad'),false);
 await T('초대를 쓴 것으로 표시하지 않고 합류 거부(초대 소진 방지/우회 방지)',join('bob','f1','CODE01','mom',{burn:false}),false);
 await T('다른 가족(f9)에 이 코드로 합류 거부',join('bob','f9','CODE01','mom'),false);
 await T('없는 코드로 합류 거부',join('bob','f1','NOPE99','mom'),false);
 await T('역할 자리표 없이 합류 거부',join('bob','f1','CODE01','mom',{marker:false}),false);
 await T('초대 없이 구성원 문서만 만들기 거부',dbOf('bob').doc('families/f1/members/bob').set({role:'mom',joinedAt:now}),false);
 await T('유효한 초대(상대 역할)로 합류 성공',join('bob','f1','CODE01','mom'),true);
 await T('이미 쓴 초대로 세 번째 사람(carol) 합류 거부',join('carol','f1','CODE01','mom'),false);
 await T('합류한 구성원(bob): 가족 데이터 읽기',dbOf('bob').doc('families/f1/plays/p1').get(),true);
 await T('합류한 구성원(bob): 심부름 쓰기',dbOf('bob').doc('families/f1/errands/e1').set({text:'커피 사와',ts:now}),true);
 await T('구성원 목록: 구성원은 읽기 가능',dbOf('alice').collection('families/f1/members').get(),true);
 await T('초대 문서의 다른 필드(role) 바꾸기 거부',(async()=>{const db=dbOf('bob'),b=db.batch();b.update(db.doc('invites/CODE01'),{role:'dad'});return b.commit()})(),false);
 // ---- 만료·사용된 초대 ----
 const admin=env;await env.withSecurityRulesDisabled(async ctx=>{
   const d=ctx.firestore();
   await d.doc('families/f2').set({createdBy:'zed'});await d.doc('families/f2/members/zed').set({role:'dad',joinedAt:now});await d.doc('families/f2/roles/dad').set({uid:'zed'});
   await d.doc('invites/EXPIRED').set({familyId:'f2',role:'mom',createdBy:'zed',usedBy:null,expiresAt:now-H});
   await d.doc('invites/USED02').set({familyId:'f2',role:'mom',createdBy:'zed',usedBy:'someone',expiresAt:now+H});
   await d.doc('invites/FRESH02').set({familyId:'f2',role:'mom',createdBy:'zed',usedBy:null,expiresAt:now+H});
 });
 await T('만료된 초대로 합류 거부',join('dave','f2','EXPIRED','mom'),false);
 await T('이미 사용된 초대로 합류 거부',join('dave','f2','USED02','mom'),false);
 await T('유효한 초대로 합류 성공(다른 가족)',join('dave','f2','FRESH02','mom'),true);
 // ---- 구성원 문서 ----
 await T('역할 바꾸기 거부(bob: 엄마→아빠)',dbOf('bob').doc('families/f1/members/bob').update({role:'dad'}),false);
 await T('seen(읽은 시각)만 갱신 허용',dbOf('bob').doc('families/f1/members/bob').update({seen:now}),true);
 await T('다른 사람의 구성원 문서 수정 거부',dbOf('bob').doc('families/f1/members/alice').update({seen:1}),false);
 await T('같은 역할의 다른 사람이 구성원 문서 삭제 거부',dbOf('eve').doc('families/f1/members/alice').delete(),false);
 await T('비구성원이 구성원 문서 삭제 거부',dbOf('mallory').doc('families/f1/members/bob').delete(),false);
 await T('구성원(bob)이 자리표만 지워 중복 합류 시도 거부(구성원 문서 그대로)',dbOf('bob').doc('families/f1/roles/dad').delete(),false);
 // ---- 초대 다시 만들기(구성원이 상대 역할로) ----
 await T('구성원(alice=아빠)이 엄마용 새 초대 만들기(초대 자체는 허용)',(async()=>{const db=dbOf('alice'),b=db.batch();b.set(db.doc('invites/CODE02'),{familyId:'f1',role:'mom',createdBy:'alice',usedBy:null,expiresAt:now+H});return b.commit()})(),true);
 await T('같은 역할 초대는 만들 수 없음(아빠가 아빠 초대)',(async()=>{const db=dbOf('alice'),b=db.batch();b.set(db.doc('invites/CODE03'),{familyId:'f1',role:'dad',createdBy:'alice',usedBy:null,expiresAt:now+H});return b.commit()})(),false);
 await T('엄마가 이미 있는데 새 초대로 또 엄마 합류 거부 (한 역할에 한 명)',join('carol','f1','CODE02','mom'),false);
 await T('비구성원이 초대를 만들 수 없음',(async()=>{const db=dbOf('eve'),b=db.batch();b.set(db.doc('invites/EVE01'),{familyId:'f1',role:'mom',createdBy:'eve',usedBy:null,expiresAt:now+H});return b.commit()})(),false);
 // ---- users ----
 await T('users: 본인 문서 읽기·쓰기',dbOf('alice').doc('users/alice').set({familyId:'f1',role:'dad'}),true);
 await T('users: 다른 사람 문서 읽기 거부',dbOf('eve').doc('users/alice').get(),false);
 // ---- 연결 해제·삭제 ----
 await T('역할 자리표를 다른 사람이 지우기 거부',dbOf('alice').doc('families/f1/roles/mom').delete(),false);
 await T('상대 폰 교체: alice(아빠)가 bob(엄마)의 구성원 문서+자리표 삭제 (폰 분실)',(async()=>{const db=dbOf('alice'),b=db.batch();b.delete(db.doc('families/f1/members/bob'));b.delete(db.doc('families/f1/roles/mom'));return b.commit()})(),true);
 await T('교체 후 새 초대로 새 엄마 폰(dave) 합류',(async()=>{const db=dbOf('alice'),b=db.batch();b.set(db.doc('invites/CODE09'),{familyId:'f1',role:'mom',createdBy:'alice',usedBy:null,expiresAt:now+H});await b.commit();return join('dave','f1','CODE09','mom')})(),true);
 await T('교체 후 이전 엄마 폰(bob)은 가족 데이터 접근 거부',dbOf('bob').doc('families/f1/plays/p1').get(),false);
 await T('엄마(dave)가 아빠 폰 교체: 아빠 구성원+자리표 삭제',(async()=>{const db=dbOf('dave'),b=db.batch();b.delete(db.doc('families/f1/members/alice'));b.delete(db.doc('families/f1/roles/dad'));return b.commit()})(),true);
 await T('아빠 폰 교체 후 새 아빠 폰(frank)이 새 초대로 합류',(async()=>{const db=dbOf('dave'),b=db.batch();b.set(db.doc('invites/CODE10'),{familyId:'f1',role:'dad',createdBy:'dave',usedBy:null,expiresAt:now+H});await b.commit();return join('frank','f1','CODE10','dad')})(),true);
 // 이후 시나리오가 원래 구성(alice=아빠, bob=엄마)을 전제하므로 되돌림
 await env.withSecurityRulesDisabled(async c=>{const d=c.firestore();for(const u of ['dave','frank']){await d.doc('families/f1/members/'+u).delete()}await d.doc('families/f1/roles/mom').delete();await d.doc('families/f1/roles/dad').delete();await d.doc('families/f1/members/alice').set({role:'dad',joinedAt:now,seen:0});await d.doc('families/f1/members/bob').set({role:'mom',joinedAt:now,seen:0});await d.doc('families/f1/roles/dad').set({uid:'alice',at:now});await d.doc('families/f1/roles/mom').set({uid:'bob',at:now})});
 await T('구성원(bob): 이 기기 연결 해제(구성원 + 역할 자리표 삭제)',(async()=>{const db=dbOf('bob'),b=db.batch();b.delete(db.doc('families/f1/members/bob'));b.delete(db.doc('families/f1/roles/mom'));return b.commit()})(),true);
 await T('연결 해제 후 새 초대로 다른 엄마(carol) 합류 가능',join('carol','f1','CODE02','mom'),true);
 await T('해제한 bob: 가족 데이터 접근 거부',dbOf('bob').doc('families/f1/plays/p1').get(),false);
 await T('구성원(alice): 가족 데이터 삭제',dbOf('alice').doc('families/f1/plays/p1').delete(),true);
 await T('가족 문서 수정 거부',dbOf('alice').doc('families/f1').update({createdBy:'eve'}),false);
 await T('만든 사람(alice)만 가족 문서 삭제',dbOf('alice').doc('families/f1').delete(),true);
 await env.cleanup();
 console.log(`\n${n-fails}/${n} 통과`);process.exit(fails?1:0);
})();
