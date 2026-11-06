# 15분 놀이수첩

퇴근 후 아빠가 15·30분 동안 월령에 맞는 놀이를 하도록 안내하고, 엄마가 이행 현황을 확인하고 칭찬·채찍질을 보내는 개인용 육아 웹앱.

## 구조
| 경로 | 내용 |
|---|---|
| `index.html` | 앱 전체 (HTML/CSS/JS 단일 파일). 저장소 어댑터 내장: Artifact 런타임(`claude.use`)이 있으면 공유 저장소, 없으면 브라우저 localStorage |
| `data/who/*.csv` | WHO 성장 표준 LMS 값 (월령, L, M, S, P3, P50, P97). `wfa`=몸무게, `lfa`=키/신장, `_m` 남아, `_f` 여아 |
| `data/who/doc_*.json` | 위 표를 앱 저장소 `ref/*` 문서로 넣기 위한 JSON (`rows`: [월령,L,M,S]) |
| `docs/ROADMAP.md` | 개발 단계·이전 계획 |
| `docs/DATA-SOURCES.md` | 발달 기준·성장 기준 출처와 법적 확인 항목 |
| `docs/CHANGELOG.md` | 버전별 변경 |
| `tests/smoke.js` | 생일 휠·백분위 점검(가짜 Artifact 저장소) |
| `tests/pwa.js` | PWA 점검(매니페스트·서비스 워커·오프라인), 사용법은 `docs/PWA-TEST.md` |
| `docs/HOSTING.md` | 무료 정적 호스팅(GitHub Pages/Cloudflare Pages) 방법 |
| `docs/PUBLIC-RELEASE.md` | 공개 체험 버전 체크리스트 |
| `tests/flow.js` | 주요 흐름·카드 무결성 점검(로컬 어댑터, `node tests/flow.js`) |

## 데이터 모델 (저장소 문서)
`config/child` · `ms/<id>` · `log/*` · `plays/*` · `body/*` · `assign/<date>` · `growth/<uid>` · `ref/{wfa,lfa}_{m,f}` · `msgs/*` · `conf/<featId>` · `fb/*` · `data/users/<uid>/me`

## 개발 흐름 (엄마 컨펌 포함)
1. 브랜치에서 수정 → 2. 앱 컨펌 보드(또는 GitHub Issue)에 올라온 의견 반영 → 3. `docs/CHANGELOG.md` 갱신 → 4. 머지 → 5. 앱 게시본 갱신
- 엄마 의견은 앱의 "컨펌" 탭에 쌓이고, 반영하면 이슈/PR 번호를 변경 이력에 적는다.

## 독립 앱으로 옮기기
`docs/ROADMAP.md` 참고. 핵심은 `localBackend()`와 같은 모양(`db.doc/collection`, `user.id/can`)의 Firebase 구현을 `getBackend()`에 끼우는 것.
