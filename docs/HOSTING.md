# 무료 정적 호스팅 (GitHub Pages)

서버 없이 파일만 올린다. 비용 0원, 24시간 켜져 있고, 주소(URL)만 공유하면 누구나 접속한다. 설치는 선택.

## 한 번만 하는 설정 (약 5분)
1. **저장소를 공개(Public)로 전환**: Settings → General → 맨 아래 Danger Zone → Change visibility → Public
   - 비공개 저장소는 Pages가 유료 플랜일 때만 된다.
   - 공개 전에 `docs/PUBLIC-RELEASE.md` 체크리스트를 먼저 본다 (특히 커밋 이력의 개인 정보).
2. **Pages 소스 지정**: Settings → Pages → Build and deployment → Source = **GitHub Actions**
3. **main 브랜치에 반영**: 개발 브랜치를 `main`으로 머지한다 (Pull Request → Merge).
   - `.github/workflows/pages.yml` 이 main 푸시마다 자동 배포한다.
4. 저장소 Actions 탭에서 "Deploy to GitHub Pages"가 초록색이면 완료.
5. 주소: `https://<GitHub계정>.github.io/Dad_Playtime/`

## 공개되는 파일
`index.html`, `sw.js`, `manifest.webmanifest`, `icons/`, `data/who/*.json` 만 올라간다. (`docs/`, `tests/`, CSV는 제외)

## 업데이트
main 에 머지하면 1~2분 뒤 자동 반영. 이때 `sw.js`의 `VERSION`도 올려야 설치한 폰에 새 화면이 뜬다.

## 대안: Cloudflare Pages (저장소가 비공개여도 무료)
1. Cloudflare 계정 → Workers & Pages → Create → Pages → GitHub 연결
2. Build command 비움, Output directory `/` (루트) → Deploy
3. `https://<프로젝트명>.pages.dev` 주소가 생긴다. 커스텀 도메인도 무료로 연결 가능.

## 확인 순서
1. 주소를 폰 브라우저에서 연다 → 시작 화면이 뜨는지
2. 비행기 모드로 켜 본다 (한 번 열어 본 뒤) → 열리는지
3. 설치(홈 화면에 추가) → 아이콘으로 열리는지 (`docs/PWA-TEST.md`)

## 집 PC 서버와 비교
집 PC는 켜 두어야 하고 네트워크가 열린다. 정적 앱은 Pages가 더 안정적이고 안전하다.
