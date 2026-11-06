import * as F from 'firebase/firestore';
export * from 'firebase/firestore';
// 테스트 전용: 에뮬레이터에 연결 (메모리 캐시)
export const initializeFirestore=(app,opts)=>{const db=F.initializeFirestore(app,{});F.connectFirestoreEmulator(db,'127.0.0.1',8080);return db};
export const getFirestore=app=>{const db=F.getFirestore(app);try{F.connectFirestoreEmulator(db,'127.0.0.1',8080)}catch(e){}return db};
export const persistentLocalCache=()=>({});
