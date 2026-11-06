import * as A from 'firebase/auth';
export * from 'firebase/auth';
// 테스트 전용: 에뮬레이터에 연결
export const getAuth=app=>{const au=A.getAuth(app);try{A.connectAuthEmulator(au,'http://127.0.0.1:9099',{disableWarnings:true})}catch(e){}return au};
