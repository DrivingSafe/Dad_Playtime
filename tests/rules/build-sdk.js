// 테스트용: npm 의 firebase SDK 를 브라우저 모듈 3개로 묶는다 (실제 gstatic 대신 로컬에서 서빙)
const esbuild=require('esbuild');const path=require('path');
esbuild.buildSync({entryPoints:{'firebase-app':'src/app.js','firebase-auth':'src/auth.js','firebase-firestore':'src/firestore.js'},bundle:true,format:'esm',platform:'browser',outdir:'dist',splitting:true,minify:true,logLevel:'warning',define:{'process.env.NODE_ENV':'"production"'}});
console.log('sdk bundled');
