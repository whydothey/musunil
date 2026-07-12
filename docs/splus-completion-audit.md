# S+ Completion Audit

Last updated: 2026-07-12 18:25 KST

Status: 완료 아님.

이 문서는 active goal 완료 여부를 감사한다. 완료 판단은 `docs/splus-master-tracker.md`의 Element Execution Board, launch checklist, 실제 명령 실행 결과를 함께 봐야 한다.

## Completion Rule

active goal은 아래 조건이 모두 증명될 때만 완료다.

- 모든 항목이 S+ 또는 운영에서 동등하게 검증된 Guard 상태다.
- Active row가 0개다.
- `pnpm launch:ready -- <운영 user-inputs.yaml>`가 실제 운영 입력값으로 통과한다.
- `pnpm cloudflare:check:strict`가 실제 `musunil.com`/`api.musunil.com` 기준으로 통과한다.
- `pnpm launch:post-deploy-smoke -- --require-laws --require-source-refreshes`가 production 기본 Web/API URL로 통과한다.
- `pnpm launch:cutover-rehearsal -- --strict`가 최신 blocker report 기준으로 통과한다.
- `pnpm launch:final-gate`가 실제 배포 Web/API URL로 통과한다.
- `pnpm service:watch -- --once`가 실제 Web/API URL 기준으로 통과한다.
- `pnpm check:visual-surface:live`가 실제 `https://musunil.com` 기준으로 통과한다.
- `pnpm service:watch:visual`의 `web_visual_surface`가 ok이고 `serviceSyncState=live`이며 남은 failure가 없다.
- storage, redaction, mobile integrity, law source dry-run/post, production `/ready`가 실제 외부 연결로 통과한다.
- 공개 화면과 공개 API에 원문, 정밀 위치, private media key, 요구사항 문구가 나오지 않는다.

## Requirement Audit

| 요구사항 | 현재 판정 | 증거 | 남은 조건 |
|---|---|---|---|
| 주제 기반 전국 묶기 | S+ Guard | `topicGrouping`, Issue detail self-check, web smoke | 새 원천 유입 시 회귀 방지 |
| 뉴스 비의존성 | S+ Guard | 18개 권역 공개 일정 parser, `/public-sources/coverage`, `pnpm check:source-diagnostics`, runtime smoke | 운영 cron 실패 감지와 실운영 수집 확인 |
| 실시간 현장 인증 | A+ Active | 앱 내 촬영, 최소 5초, 서버 시각, held_private, redaction proof, trusted device integrity gate, 공개 poster 필수, API redacted poster route smoke | 실제 storage, redaction, Play Integrity/App Attest dry-run |
| 전국 동시다발 인지 | S+ Guard | `nationalTimeline`, 자료/지역 필터, 모바일/데스크톱 캡처 | 새 데이터 유입 시 회귀 방지 |
| 규모 실시간 추정 | A+ Active | AI 추정 Claim 메타, 공개 근거 없는 추정 차단, 독립 시점 과대 산정 차단 | 실제 운영 영상/현장 인증 결과를 추정 confidence에 연결 |
| 조작 방어 | S+ Guard | 반복 해시, GPS 품질, 사용자/기기 bucket, 지역 편중, risk dashboard | 운영 실측 임계값 튜닝 |
| 개인정보/권리 보호 | A+ Active | private key/raw GPS 비노출, 공개 반경, poster 없는 clip 공개 차단, purge 전 외부 delete gate | 실제 storage 권한, redaction smoke, purge 검증 |
| 알권리 중심 UX | A 후보 Active | 상업용 UI/UX 재설계 문서, 이슈 First 28차 구현, 표형 row 제거, 데스크톱 홈 도구 동시노출 제거 캡처, 우측 맥락 패널 1차 재정렬, 제보 첫 행동 단순화, 지도 숫자판 제거, 상세 `시간 흐름` 탭 정정, 홈/지도 `오늘` 날짜 혼선 제거, `현장 파일/현장 판단/GPS 인증` 운영자 언어 제거, 릴스 액션 축소와 하단 근거 도구막대, 샘플 poster 검토 대기 슬롯 전환, 홈 compact review row 전환, stale config 빈 화면 회귀 방어, 홈 scanline clipped false, 데스크톱 홈 `지역 현황` 지도 연결, 데스크톱 기본 홈 `detailVisible=false` 2축 구조, 행동 후 `desktop-detail-open` 상세 패널, 지도 선택 시트 경량화, 지도 검색/범례/탐색 타일 경량화, 모바일/태블릿 홈 이슈 피드 유지 캡처, 영상 0건 직접 노출 제거, 홈 `근거/영상/지역/반론` 액션 허브, 법안·탐색·상세·영상 0-count 공개 문구 완화, 모바일 액션 플로우 `근거→상세 근거`, `영상→영상 탭`, `지역→지도`, `반론→반론·정정`, 영상/지도/제보 선택 이슈 문맥 라인, `공개된 주장`→`출처별 자료`, `다른 주장`→`반론·정정`, `영상제보` 라벨, 홈 주행동 `지도에서 확인`, 보조 액션 `근거/인증영상/반론`, 탭 라벨 `인증영상/현장촬영`, 공식 자료 핀과 GPS 인증 영역·줌 분리, 인증영상 기본 이슈 선택과 poster 없는 검토 카드, 공개 clip+poster의 풀스크린 video player 계약, 공개 media route/MIME/CSP 계약, 배포 후 공개 clip route 감시, surface50 데스크톱 홈 지도 비중 완화, surface51 poster 없는 홈 영상 썸네일 제거, surface53 주요 이슈 story ring 전환, 상단 숫자판 DOM/로직 제거, `pnpm check:visual-surface`, 금지 문구 web smoke | 01:29 visual surface gate에서 390/430/768/1440px 홈·상세·영상·탐색·제보 20개 상태가 통과했다. 그래도 실제 운영 GPS evidence, 실제 운영 공개 영상 캡처, 독립 재검증, 사용자 수락 전 S+ 아님 |
| 지도·지역 UX | A+ 후보 Active | 공개 지도는 자료 위치 핀과 현장 인증 범위만 유지, 지도 탭 숫자 타일 0개, 중복 지도 버튼 hidden, 지도-first 재배치, 데스크톱 홈 `지역 현황` 지도 visible, 모바일 홈 지도 미노출, 모바일 map top 215px/height 460px, 데스크톱 map top 211px/height 700px, 데스크톱 map width 1200px/viewport share 83%, 홈/전용 지도 시트 62px, 모바일 지도 시트 114px, `sheetMapRatio=0.09~0.25`, toolbar 52~54px, 탐색 tile 52px, summary hidden, 하단 내비 겹침 없음, 지도·상세 제목 동기화, 31차 fallback 지도 표면 개선, MapLibre `styledata/idle` layer sync, 32차 Evidence-gated presence area와 근접 줌, 공식 자료 핀 `현장 인증 영역은 아직 없습니다`, 검색 후 지도 맥락 `detailOpen=false`, `visibleRejected=[]`, surface50 홈 지도 648x403px 맥락화 | 사용자 수락, 독립 비평 재검증, 실제 GPS evidence 기반 영역 시각 검증 |
| 법안·개정안 연결 | A+ Active | parser mock self-check, `/laws`, production preview 비노출, 0건 dry-run 실패 가드 | 실제 법 API 키로 dry-run 1건 이상과 post 검증 |
| 본인확인 기반 쓰기 경계 | A+ Active | 포트원 provider 설정, identity start/complete, write endpoint `identity_required` 경계, 비-LIVE 사용자 제출 `held_private` 검수 대기, 검수 전 공개 detail 불변 write smoke | 실제 포트원 채널 키와 운영 SDK 결제 전 인증 리허설 |
| 운영 배포 준비 | A- Active | Render blueprint, `/ready`, not-ready write fail-closed, `launch:ready` | 실제 운영 YAML/Secret, DB/Redis, Render 배포 health 통과 |

## Current Local/Static Passing Evidence

아래 항목은 로컬 코드, 정적 빌드, sample config, 또는 metadata gate의 현재 통과 증거다. 실제 `musunil.com` live API 동기화나 운영 provider 연결 완료 증거가 아니다.

- `pnpm check:release`
- `pnpm check:splus`
- `pnpm check:web-flow`
- `pnpm check:ux-surface`
- `pnpm check:visual-surface`
- `pnpm check:build-info-clean`
- `pnpm check:source-diagnostics`
- `pnpm check:law-diagnostics`
- `pnpm check:ops-diagnostics`
- `pnpm ops:diagnose`
- `pnpm ops:diagnose -- --template`에서 `lawSources.readyForSmoke=false`와 법안 원천 `requiredActions`를 확인
- `pnpm launch:ready -- --list`로 actual input 단계와 sample gate 단계를 구분
- `pnpm launch:external-smoke -- --list`
- `pnpm launch:cutover-rehearsal`로 현재 stage, 다음 operator 명령, final gate 순서를 한 화면에 확인
- `pnpm launch:missing-inputs -- --refresh`로 secret 값을 출력하지 않고 마지막 입력 필드, provider smoke proof marker, Runtime secret 범위를 확인
- `pnpm launch:missing-inputs -- --template --json`에서 법안 placeholder credential이 `missing`으로 남는지 확인
- `pnpm launch:post-deploy-workflow -- --check`로 현재 Git SHA, production 기본 URL, `github_environment`, `render_api_dns_target` 입력을 포함한 GitHub Actions `post-deploy` 실행 명령을 secret 노출 없이 생성
- `pnpm render:api-settings`
- API/runtime/web smoke 경계 검증

2026-07-12 17:59 기준 `pnpm launch:post-deploy-workflow`는 후배포 workflow 수동 입력 실수를 줄이는 guard다. 실제 workflow 실행, DNS 적용, API readiness, live Web `serviceSyncState=live` 검증 전에는 운영 준비 완료로 보지 않는다.

## Current Live Blockers

`pnpm launch:blockers -- --refresh`를 실행해 freshness window 안에서 갱신된 결과만 live completion 증거로 본다. stale blocker report는 완료 판단에 쓰지 않는다. 최신 갱신 결과 기준 live completion은 아직 막혀 있다.

- `api_endpoint_preflight`: `api.musunil.com` DNS가 아직 연결되지 않아 API `/health`, `/ready`, 공개 payload, identity boundary 검사가 skip 상태다.
- `web_header_contract`: live Web에 no-store, CSP, Permissions-Policy, Referrer-Policy, nosniff, X-Frame-Options가 아직 적용되지 않았다.
- `web_visual_surface`: 실제 `https://musunil.com` 화면 구조는 `pnpm check:visual-surface:live`에서 통과하지만 API 미연결 때문에 `serviceSyncState=delayed`다. 최신 live visual 결과는 첫 이슈 `정보통신망법 개정 관련 집회`, 홈 topic issue 3개, story 3개, source bundle first 0/4를 보여준다. 최종 완료에는 `serviceSyncState=live`, 홈 topic issue 3개 이상, `web_visual_surface=ok`, 남은 failure 0개가 필요하다.

## Required Final Evidence

아래는 실제 운영 입력값과 외부 연결이 있어야 한다.

```bash
pnpm launch:ready -- config/musunil.user-inputs.local.yaml
pnpm launch:ready -- config/musunil.user-inputs.local.yaml --post-laws
pnpm cloudflare:check:strict
pnpm sources:refresh-preflight
pnpm launch:post-deploy-smoke -- --require-laws --require-source-refreshes
pnpm launch:cutover-rehearsal -- --strict
pnpm launch:final-gate
MUSUNIL_WEB_BASE_URL=https://musunil.com MUSUNIL_API_BASE_URL=https://api.musunil.com pnpm service:watch -- --once
pnpm check:visual-surface:live
pnpm service:watch:visual
```

배포 후:

```text
GET /health -> 200
GET /ready -> 200
```

## Non-Completion Reasons

- 실제 `pnpm storage:smoke` 결과가 아직 없다.
- 실제 `pnpm redaction:smoke` 결과가 아직 없다.
- 실제 `pnpm mobile:integrity-smoke` 결과가 아직 없다.
- 실제 `pnpm identity:smoke` 결과가 아직 없다.
- 실제 법 원천 `pnpm sources:laws` 1건 이상 dry-run/post 결과가 아직 없다.
- 실제 포트원 본인확인 채널로 인증 완료 리허설 결과가 아직 없다.
- 운영 DB/Redis/Render `/ready` 결과가 아직 없다.
- `pnpm launch:cutover-rehearsal -- --strict`는 현재 API DNS, Web headers, live issue sync blocker 때문에 실패해야 정상이다.
- `pnpm ops:diagnose`는 metadata 준비와 누락 그룹을 보여주는 사전 진단이며, 실제 storage/redaction/mobile identity provider smoke를 대체하지 않는다.
- `check:render-runtime-config`는 Render generated secret fallback의 sample gate이며, 실제 배포 `/ready` 증거를 대체하지 않는다.
- 2026-07-11 06:11 독립 평가 기준 UI/UX는 S+가 아니다. 28차 패치로 지도-first, 10초 상황 줄, `영상제보` 라벨, 지도 시트 과밀, 지도 도구 밀도, 영상 소셜 레일, 샘플 poster의 AI 데모감, 홈 대형 검토 썸네일, dev stale config 회귀, 데스크톱 지도 인스펙터 경쟁, scanline 혼선, 데스크톱 홈 빈 공간과 패널 경쟁은 개선됐지만, 독립 비평 재검증, 실제 제보 영상 품질, 사용자 수락이 남아 있다.
- 2026-07-11 10:04 29차 패치로 static/운영 API 빈 응답 시 공식 공개자료 fallback 이슈가 보이고, 지도 `상세`가 선택 현장 상세와 `근거` 탭으로 이어지는 것을 390px/1440px CDP 캡처로 확인했다. 다만 실제 운영 API, 실제 제보 영상 품질, 독립 비평 재검증, 사용자 수락 전에는 S+로 승급하지 않는다.
- 2026-07-11 10:16 30차 패치로 홈 주행동이 `지도에서 확인` 1개로 정리되고, 공개 열람 탭 `인증영상`과 작성 탭 `현장촬영`이 분리됐다. 390px/1440px CDP에서 `overflowX=false`, `영상제보` 노출 0을 확인했지만 지도 placeholder감, 실제 운영 영상, 사용자 수락 전에는 S+로 승급하지 않는다.
- 2026-07-11 10:32 31차 패치로 지도 fallback 표면과 MapLibre layer 재동기화를 개선했다. 390px/1440px 지도 캡처에서 `overflowX=false`, `navOverlap=false`, 금지 문구 0을 확인했지만 실제 GPS evidence 기반 영역 시각 검증 전에는 S+로 승급하지 않는다.
- 2026-07-11 10:49 32차 패치로 현장 인증 영역을 공개 가능한 live Evidence 기준으로만 생성하게 했다. 공식 자료 위치만 있는 현장은 `현장 인증 영역은 아직 없습니다`로 표시하고, 검색 결과는 지도 맥락 안에서 유지하며 인증 영역이 있는 현장은 근접 줌으로 표시한다. 실제 운영 GPS evidence, 독립 비평 재검증, 사용자 수락 전에는 S+로 승급하지 않는다.
- 2026-07-11 11:04 33차 패치로 인증영상 탭이 video-bearing Issue를 기본 선택하고 poster 없는 LIVE Claim을 검토 카드로 표시한다. 390px/1440px 캡처에서 `overflowX=false`, 금지 문구 0, 모바일 `navOverlap=false`를 확인했지만 실제 공개 영상 품질, 독립 비평 재검증, 사용자 수락 전에는 S+로 승급하지 않는다.
- 2026-07-11 11:10 34차 패치로 실제 공개 `redactedClipUrl`과 poster가 모두 있는 LIVE Claim은 풀스크린 인증영상 탭에서 `<video class="reel-video">`로 렌더된다. `check:web-smoke`는 이 계약과 poster-only 회귀 금지를 검증하지만 실제 공개 영상 파일 기반 캡처와 사용자 수락 전에는 S+로 승급하지 않는다.
- 2026-07-11 11:16 35차 패치로 seed/API가 참조하는 preview webm 파일, 정적 서버 video MIME, `media-src` CSP를 검증한다. sample은 UI에서 실제 제보처럼 노출하지 않으며, 실제 운영 공개 영상 캡처와 사용자 수락 전에는 S+로 승급하지 않는다.
- 2026-07-11 11:21 36차 패치로 배포 후 smoke, runtime smoke, service watch까지 공개 preview clip route를 검사한다. poster만 살아 있고 실제 영상 route가 깨지는 배포 회귀는 차단하지만, 실제 운영 공개 영상 캡처와 사용자 수락 전에는 S+로 승급하지 않는다.
- 2026-07-11 11:26 라이브 점검에서 `musunil.com` HTML과 공개 preview clip은 최신으로 보였지만 build-info 404와 정적 no-store 헤더 미적용이 확인됐다. Render Dashboard/Blueprint가 새 build command와 headers를 적용하기 전에는 운영 배포 준비를 S+로 승급하지 않는다.
- 2026-07-11 11:29 build-info 산출물이 `.gitignore`에 막혀 publish에서 빠지는 회귀를 제거했다. 다음 Render 배포에서 `/build-info.json` 200과 현재 Git SHA 일치가 확인되기 전에는 운영 배포 준비를 S+로 승급하지 않는다.
- 2026-07-11 11:34 build-info placeholder를 repo에 추적시켜 Render Static publish 경로를 고정했다. build command가 실제 Git SHA로 덮어쓰는지 live에서 확인되기 전에는 운영 배포 준비를 S+로 승급하지 않는다.
- 2026-07-11 11:38 live build-info가 200이어도 placeholder 값이면 배포 실패로 처리하도록 `check-web-deploy`와 `service-watch`를 강화했다. 이후 21:26 정책에서 static manifest와 live file hash가 현재 repo 산출물과 정확히 일치하면 build metadata placeholder는 경고로 낮추고, 해시 불일치만 구버전 배포 실패로 처리하게 바꿨다.
- 2026-07-11 11:45 static manifest와 live file hash 검증을 추가했다. 21:26 현재 live static hash 일치가 최신 UI 배포의 1차 증거이며, build-info SHA 일치와 static no-store headers는 운영 품질 경고로 남긴다.
- 2026-07-11 11:58 홈 이슈 카드를 보고서형 scanline/대형 CTA 구조에서 앱 피드형 `상태/제목/장소 미리보기/지도·근거·영상·반론` 구조로 바꿨다. 390px 캡처에서 첫 카드 211px, 액션 `지도/근거/영상/반론`, 위치 미리보기 112x113, 내부 요청사항 문구 0을 확인했지만 독립 비평 재검증, 실제 운영 공개 영상/GPS, 사용자 수락 전에는 S+로 승급하지 않는다.
- 2026-07-11 12:10 `현장촬영` 첫 화면의 중첩 empty-state 박스와 데스크톱 맥락 패널 경쟁을 제거했다. 모바일은 headline+보호 pill+`근처 현장 찾기` 단일 행동으로, 데스크톱 locate 단계는 중앙 680px 단일 흐름으로 정리됐다. 실제 본인확인, 위치권한, 운영 GPS/카메라 리허설 전에는 S+로 승급하지 않는다.
- 2026-07-11 12:22 poster 없는 LIVE Claim을 상태표형 `reels-review-panel`이 아니라 `reel-card reel-full reel-pending`으로 표시하게 했다. 모바일은 액션 `근거/위치/이슈`가 하단 내비와 겹치지 않고, 데스크톱은 700px 카드 안에 액션이 첫 viewport로 들어온다. 실제 공개 영상 품질, 독립 비평 재검증, 사용자 수락 전에는 S+로 승급하지 않는다.
- 2026-07-11 12:24 상세 시트의 긴 라벨을 `영상/흐름/반론`으로 줄이고 접근성 라벨에 전체 의미를 유지했다. 모바일 390px 상세는 `tabs.height=50`, `navOverlap=false`, `scrollWidth=390`을 확인했지만 독립 비평 재검증, 실제 운영 공개 영상/GPS, 사용자 수락 전에는 S+로 승급하지 않는다.
- 2026-07-11 12:34 독립 Visual Critique의 P0인 모바일 상세 가독성 문제를 반영해 제목·요약·핵심 문장 숨김 클램프를 자연 줄바꿈으로 바꿨다. 390px 상세는 title/summary/row horizontal overflow false, panel fit true, `navOverlap=false`, `scrollWidth=390`을 확인했지만 공통 이슈 요약 바, 액션 위계 재정렬, 사용자 수락 전에는 S+로 승급하지 않는다.
- 2026-07-11 12:40 독립 Visual Critique의 P1인 동등한 카드 액션 위계를 반영해 홈 카드 primary를 `근거 보기`로 올리고 `지도/영상/반론`을 secondary로 낮췄다. 390px 첫 카드 primary action evidence, visible cards 3, `scrollWidth=390`, forbidden 0을 확인했지만 공통 이슈 요약 바, 실제 운영 공개 영상/GPS, 사용자 수락 전에는 S+로 승급하지 않는다.
- 2026-07-11 12:48 `인증영상/지도/현장촬영`에 공통 이슈 요약 바를 붙이고, 모바일→데스크톱 전환 시 현재 화면과 레일 선택 상태가 유지되게 했다. 390px 세 화면과 1440px 지도 캡처에서 같은 이슈명/상태/요약, `navOverlap=false`, forbidden 0, desktop `activeRail=explore`를 확인했지만 실제 운영 공개 영상/GPS, 독립 재검증, 사용자 수락 전에는 S+로 승급하지 않는다.
- 2026-07-11 13:11 surface44 독립 비평을 반영해 홈 primary를 `상세 보기`로 바꾸고, 카드/상세/탐색 지도에 공통 `확인 요약`을 붙였다. 상세는 비동기 로딩 지연과 무관하게 `개요` 탭으로 열리며, 최상위 탭은 `홈/영상/탐색/법안/제보`로 정리됐다. 390px 홈/상세/지도와 1440px 데스크톱 캡처에서 forbidden 0, `scrollWidth=390/1440`, 상세 `selectedDetailTab=개요`, 지도 current tab `탐색`을 확인했지만 실제 운영 공개 영상/GPS, 독립 재검증, 사용자 수락 전에는 S+로 승급하지 않는다.
- 2026-07-11 13:24 surface45 독립 재비평이 10초 기준 실패를 지적해 구체 이슈 우선 정렬, 짧은 공통 요약, 반복 감사 라벨 제거, 카드 보조 CTA 제거, 지도 CTA `근거·영상 보기`를 반영했다. 390px/1440px 첫 카드가 `정보통신망법 개정 반대 집회`로 시작하고 forbidden 0, `scrollWidth=390/1440`을 확인했지만 live build-info/header 실패, 실제 운영 공개 영상/GPS, 독립 재검증, 사용자 수락 전에는 S+로 승급하지 않는다.
- 2026-07-11 13:24 live `https://musunil.com` 검증은 `/static-manifest.json` 최신 hash는 확인되지만 `/build-info.json` placeholder와 no-store header 미적용 때문에 실패한다. Render build output/header가 실제 반영되기 전 운영 배포 준비를 S+로 승급하지 않는다.
- 2026-07-11 13:31 `e8b098c` 푸시 후 GitHub Actions는 통과했고 live static manifest는 최신 커밋과 일치했지만 `/build-info.json` placeholder는 유지됐다. deploy checker와 문서를 보강했으며, Render Dashboard 설정과 headers가 실제로 고쳐지기 전 운영 배포 준비를 S+로 승급하지 않는다.
- 2026-07-11 13:40 surface47에서 브랜드 subtitle, 홈 제목, fallback 상태, 스토리 레일을 시민용 앱 언어로 낮췄다. 390px/1440px 캡처에서 첫 구체 이슈, forbidden 0, `scrollWidth=390/1440`을 확인했지만 카드 CTA, 데스크톱 지도 비중, 실제 운영 공개 영상/GPS, 사용자 수락 전에는 S+로 승급하지 않는다.
- 2026-07-11 13:50 surface48에서 반복되는 큰 청록 CTA를 제거하고 카드 하단을 가벼운 경로 footer로 낮췄다. 390px/1440px 캡처에서 action background transparent, forbidden 0, `scrollWidth=390/1440`을 확인했지만 카드 요약 중복, 데스크톱 지도 비중, 실제 운영 공개 영상/GPS, 사용자 수락 전에는 S+로 승급하지 않는다.
- 2026-07-11 13:56 surface49에서 홈 카드 요약을 장소·일시·위치와 공식·영상·반론 두 줄로 분리했다. 390px/1440px 캡처에서 첫 카드 정보 흐름과 overflow는 안정적이지만 데스크톱 지도 비중, 썸네일 완성도, 실제 운영 공개 영상/GPS, 사용자 수락 전에는 S+로 승급하지 않는다.
- 2026-07-11 14:05 surface50에서 데스크톱 홈 지도 영역을 648x403px 맥락 도구로 낮추고 이슈 피드를 520px로 키웠다. 1440px/390px 캡처에서 forbidden 0, rejected 0, `scrollWidth=1440/390`을 확인했지만 썸네일 완성도, 실제 운영 공개 영상/GPS, 사용자 수락 전에는 S+로 승급하지 않는다.
- 2026-07-11 14:14 surface51에서 공개 poster 없는 LIVE 영상을 홈 카드 썸네일처럼 표시하지 않게 했다. 390px/1440px 캡처에서 `reviewOnlyCards=0`, first visual `issue-place-peek`, forbidden 0을 확인했지만 실제 운영 공개 영상/GPS, 사용자 수락 전에는 S+로 승급하지 않는다.
- 2026-07-11 14:24 surface53에서 주요 이슈 레일을 필터칩형 pill이 아니라 원형 이슈 story ring으로 바꿨다. 390px/1440px 캡처에서 `storyCount=3`, `storyOrbCount=3`, `storyLabels=정보통신망법 개정 반대/대통령 탄핵 요구 행진/전국 집회 공개 일정`, `overflowX=false`, forbidden 0, rejected 0을 확인했지만 사용자 수락 전에는 S+로 승급하지 않는다.
- 2026-07-11 21:26 deploy checker와 service watch를 static hash 우선 판정으로 수정했다. `/static-manifest.json`과 live HTML/config/media SHA-256이 현재 repo 산출물과 같으면 최신 UI 배포는 통과하고, `/build-info.json` placeholder와 no-store header 미적용은 경고로 남긴다. static hash가 다르면 계속 실패한다.
- 2026-07-11 23:23 API 미연결 상태를 공개 화면에서 숨기지 않도록 `실시간 동기화 지연` 서비스 배너를 추가했다. 390px/1440px 캡처에서 저장된 공개자료 기준 안내, `다시 확인`, forbidden 0, `overflowX=false`를 확인했지만 실제 API 도메인 연결 전 운영 배포 준비는 완료가 아니다.
- 2026-07-11 23:33 Render 수동 Static Site 설정값을 `render.yaml`에서 추출하는 `pnpm render:web-settings` helper를 추가했다. helper 출력은 Branch, Root Directory, Build Command, Publish Directory, Headers, strict header 검증 명령을 포함하지만, Render Dashboard에서 헤더가 실제 반영되고 `MUSUNIL_STRICT_WEB_HEADERS=1 pnpm check:web-deploy`가 통과하기 전 운영 배포 준비는 완료가 아니다.
- 2026-07-11 23:38 `service:watch`가 API endpoint preflight를 먼저 실행하고, DNS/HTTPS preflight 실패 시 하위 API 검사들을 `skip`으로 기록하게 했다. 현재 live 감시는 `api_endpoint_preflight`만 실패하며 `getaddrinfo ENOTFOUND api.musunil.com`을 보여주지만, API DNS와 Render API 서비스 연결 전 운영 배포 준비는 완료가 아니다.
- 2026-07-11 23:43 `service:watch`가 Web static header contract와 Required Actions를 문서에 남기게 했다. 현재 Required Actions는 API DNS 연결, Render Static headers 적용, build metadata publish 확인이지만, 이 조치들이 실제로 적용되어 `service:watch`와 strict web deploy check가 통과하기 전 운영 배포 준비는 완료가 아니다.
- 2026-07-11 23:58 독립 Visual Critique와 IA Red-Team의 P0/P1 지적을 반영해 홈 카드 요약을 `지역 · 현장 · 위치 · 영상 · 인원` 고정 문장으로 바꾸고, 반론 있는 이슈/영상에 `다른 주장/반론` 진입을 추가했다. API 미연결 배너도 장애성 표현에서 `저장된 공개자료 기준`으로 낮췄다. 390px/1440px 캡처에서 forbidden 0, `overflowX=false`를 확인했지만 상세/지도 대시보드화, 실제 운영 공개 영상/GPS, 사용자 수락 전에는 S+로 승급하지 않는다.
- 2026-07-11 23:59 상세 개요를 리포트형 카드에서 시민 질문형 답변 구조로 바꿨다. 390px/1440px에서 overview card 0, answer row 5, disclosure 2, 데스크톱 상세 상태 지도 시트 62px, forbidden 0, `overflowX=false`를 확인했지만 실제 운영 공개 영상/GPS와 사용자 수락 전에는 S+로 승급하지 않는다.
- 2026-07-12 00:14 `pnpm launch:cutover-plan`과 [launch-cutover-runbook.md](/Users/mk/Documents/Musunil/docs/launch-cutover-runbook.md)를 추가해 API DNS, Cloudflare DNS, Render Static headers, build metadata, 검증 순서를 한 화면에 고정했다. `pnpm launch:cutover-plan -- --json`, `pnpm check:launch-sample`, `pnpm check:render-runtime-config`, `pnpm check:web-smoke`는 통과했지만 실제 Render/Cloudflare 반영과 `service:watch` 통과 전 운영 배포 준비는 완료가 아니다.
- 2026-07-12 00:28 `pnpm check:web-flow`를 release gate에 추가했다. 홈 이슈 카드, 상세 빠른 행동, 인증 영상 액션, 공통 이슈 맥락, 지도 선택/검색, 법안→이슈, 제보 대상 확정→촬영→접수, 본인확인 경계 등 11개 사용자 흐름 계약을 검사하며 현재 모두 통과한다. 다만 이 검사는 코드 계약 회귀 방지이며 실제 운영 API, 실제 영상/GPS, 사용자 수락을 대체하지 않는다.
- 2026-07-12 00:33 `pnpm check:source-diagnostics`를 release gate에 추가했다. 외부 fetch 없이 18개 active schedule 원천의 URL, parser, POST body, refresh cadence 구조를 진단하며, `blockedSourceIds`, `parserMissingSourceIds`, `urlMissingSourceIds`, `postBodyMissingSourceIds`가 생기면 릴리즈가 실패한다. 실제 운영 cron fetch 성공을 대체하지는 않는다.
- 2026-07-12 00:37 `pnpm check:law-diagnostics`를 release gate에 추가했다. 외부 fetch 없이 국회 의안 API와 법제처 국가법령 API endpoint, 관심 키워드, credential 구성 여부를 진단하고 API key/OC 원문이 출력되지 않게 했다. 실제 법 원천 1건 이상 dry-run/post 증거는 여전히 필요하다.
- 2026-07-12 00:38 `/ready`와 `runtime_not_ready` 응답에 safe `summary.failedIds`, `summary.blockingGroups`, `requiredActions`를 추가했다. API self-check, `pnpm check:render-runtime-config`, `pnpm check:runtime-smoke`가 통과했으며, Render DB/Redis 미연결 같은 운영 차단 원인을 그룹 단위로 식별한다. 실제 운영 `/ready=true` 증거 전에는 운영 준비 완료가 아니다.
- 2026-07-12 00:44 `pnpm ops:diagnose`와 `pnpm check:ops-diagnostics`를 추가했다. 외부 연결 전에도 storage, redaction, mobile integrity, identity metadata 준비 상태와 다음 조치를 secret 원문 없이 확인하고, release gate에서 이 진단 계약을 검사한다. 실제 provider smoke와 운영 `/ready=true` 증거 전에는 운영 준비 완료가 아니다.
- 2026-07-12 00:49 `pnpm launch:ready`가 external smoke 전에 `pnpm ops:diagnose -- --require-external-smoke-ready`를 실행하게 했다. 운영 입력 누락이 provider smoke 실패로만 보이지 않고 `requiredActions`로 먼저 정리된다. 실제 provider smoke와 운영 `/ready=true` 증거 전에는 운영 준비 완료가 아니다.
- 2026-07-12 11:10 `pnpm identity:smoke`를 external smoke에 추가했다. 실제 PortOne 본인확인 완료 ID를 일회성 env로 넣어 `identity_portone_verified_lookup` proof marker가 나와야 쓰기 경계 운영 리허설 증거로 본다.
- 2026-07-12 00:54 live `pnpm service:watch -- --once` 결과 static manifest는 local과 일치하지만 `web_header_contract`와 `api_endpoint_preflight`가 실패했다. Required Actions는 Render API custom domain + Cloudflare DNS, Render Static headers, build metadata fallback을 owner/action/verify/reference로 문서화한다. 실제 조치와 재검증 전에는 운영 준비 완료가 아니다.
- 2026-07-12 01:01 `pnpm check:ux-surface`를 release gate에 추가했다. 홈 이슈 우선 구조, 대시보드 회귀, 5개 탭, 인증 영상 액션, 지도 맥락 도구, 제보 초보자 흐름, 본인확인 경계, 금지 소셜 UI를 9개 시나리오로 검사하며 현재 모두 통과한다. 다만 이 검사는 정적 표면 회귀 방어이며 실제 모바일/데스크톱 캡처, 실제 운영 영상/GPS, 사용자 수락을 대체하지 않는다.
- 2026-07-12 01:08 `pnpm render:api-settings`를 추가했다. Render `musunil-api`의 build/pre-deploy/start/health/env source/custom domain/Cloudflare/검증 명령을 secret 원문 없이 출력하고, `launch-check`, `launch-cutover-plan`, `service:watch` Required Actions와 연결했다. 실제 `api.musunil.com` DNS와 운영 `/ready=true` 전에는 운영 준비 완료가 아니다.
- 2026-07-12 01:14 `write-web-config`가 로컬 검증 중 tracked build-info placeholder를 덮어쓰지 않게 하고, Render Web build에는 `MUSUNIL_WRITE_BUILD_INFO=1`을 명시했다. `pnpm check:build-info-clean`을 release gate에 추가해 로컬 `check:release`가 build-info를 더럽히면 실패한다.
- 2026-07-12 02:03 자료 제보, 현장 정정, 권리침해 신고, 반론이 인증 후에도 `202 queued_for_review`/`held_private`로만 저장되게 했다. Admin review 전에는 공개 현장 detail, 집계, evidence count가 변하지 않으며, `/transparency/logs`는 공개 DTO와 sanitized reason만 반환한다. `pnpm --filter @musunil/api test`, `pnpm smoke:api -- --write-checks`가 통과했다.
- 2026-07-12 01:29 숨겨진 상단 숫자판 DOM과 갱신 로직을 제거하고 `pnpm check:visual-surface`를 release gate에 추가했다. Chrome/CDP로 390px, 430px, 768px, 1440px 홈·상세·영상·탐색·제보 20개 상태를 실제 렌더링해 overflow, nav overlap, dashboard visible, map sheet, report first action을 검사하지만, 실제 운영 공개 영상/GPS와 사용자 수락 전에는 S+로 승급하지 않는다.
- 2026-07-12 01:52 `pnpm check:visual-surface:live`를 추가하고 운영 fallback을 실제 공개자료 기준 3개 이슈 파일로 분리했다. API가 아직 연결되지 않아도 live 홈이 단일 공개자료 카드로 축소되는 회귀를 차단한다. 새 Render 배포 후 live 명령은 통과했지만, 실제 운영 공개 영상/GPS와 사용자 수락 전에는 S+로 승급하지 않는다.
- 2026-07-12 02:09 visual smoke가 Web `serviceSyncState`와 서비스 배너 상태를 출력하고, `pnpm service:watch:visual`은 운영 도메인이 `delayed` fallback 상태이면 `web_visual_surface`를 실패 처리한다. 이제 live visual 통과만으로 API live 동기화가 된 것처럼 판정하지 않는다.
- 2026-07-12 08:28 Render Static Site build command를 `pnpm build:web-static:render` 단일 명령으로 수렴했다. 이 명령은 운영 API base, 실제 build-info 작성, 정적 빌드, web smoke를 묶고 `launch-check`가 Render/README 계약을 감시한다. 다만 실제 Render build metadata, static headers, API DNS가 live에서 통과하기 전 운영 준비 완료가 아니다.
- 2026-07-12 08:44 `pnpm launch:blockers -- --refresh`로 live evidence를 갱신했다. `docs/splus-service-watch.md`는 `publish_build_metadata` 조치가 `pnpm build:web-static:render` 확인을 요구하도록 바뀌었지만, Web header contract, `api.musunil.com` DNS, live issue feed 0건은 계속 실패다. 이 상태는 완료 증거가 아니라 외부 조치 전 차단 증거다.
- 2026-07-12 09:22 홈 빈 상태의 운영 문구를 `새 이슈를 확인 중입니다`와 `다시 확인/지역 보기`로 낮췄다. 이는 API 미연결 상태에서도 사용자가 다음 행동을 이해하게 하는 UX guard이며, `serviceSyncState=live` 또는 `/home.issueCards` 운영 데이터 연결 완료 증거가 아니다.
- 2026-07-12 16:17 `launch:blockers`가 Web header-only 경로와 API DNS+Render domain 경로의 입력 준비 상태를 분리했다. 현재 `web_headers_only` 누락값은 `CLOUDFLARE_API_TOKEN`만이고, 전체 API 경로는 `RENDER_API_TOKEN or MUSUNIL_RENDER_API_DNS_TARGET`와 `CLOUDFLARE_API_TOKEN`을 요구한다. 실제 token 적용과 live 재검증 전 운영 준비 완료가 아니다.
- 2026-07-12 16:25 `CLOUDFLARE_API_TOKEN`만 있는 부분 입력 상태에서는 `launch:blockers`의 `Next command`가 `pnpm launch:apply -- --apply --cloudflare-headers-only`로 바뀐다. Web header blocker를 API DNS 입력과 독립적으로 먼저 줄일 수 있지만, 실제 적용·strict Web header 검증·API DNS/live sync 전 운영 준비 완료가 아니다.
- 2026-07-12 16:26 `launch:cutover-rehearsal`과 `launch:operator-brief`가 `launch:blockers`의 split apply 판단을 그대로 쓰게 했다. `CLOUDFLARE_API_TOKEN`만 있는 상태에서는 두 경로 모두 Web header-only 명령을 안내하지만, 실제 Cloudflare 적용·strict Web header 검증·API DNS/live sync 전 운영 준비 완료가 아니다.
- 2026-07-12 16:33 `launch:missing-inputs`가 `Blocker report` 시각과 `Report freshness`를 함께 표시하고, stale live blocker report 기반이면 refresh 경고를 남긴다. 법안 원천 진단 helper가 실패하면 `launch:missing-inputs`도 실패하므로, 오래된 입력 체크리스트나 깨진 법 원천 진단을 출시 준비 증거로 쓰지 않는다.
- 2026-07-12 16:37 `launch:operator-brief`의 Split apply paths가 `Inputs ready`와 `Missing`을 표시한다. 운영 브리프만 보고 Web header-only 경로와 API DNS+Render domain 경로의 실행 가능 여부를 확인할 수 있지만, 실제 Cloudflare/Render 적용과 final gate 전 운영 준비 완료가 아니다.
- 2026-07-12 16:43 `launch:apply`가 Render token 존재와 Render API target 파생 성공을 분리한다. 잘못된 token이나 서비스 조회 실패로 target을 못 얻으면 `configured_but_target_derivation_failed`와 수동 `MUSUNIL_RENDER_API_DNS_TARGET` 대안을 출력하지만, 실제 유효 token 또는 정확한 target 입력과 final gate 전 운영 준비 완료가 아니다.
- 2026-07-12 16:51 `launch:apply -- --apply`가 실제 Render/Cloudflare write 전에 dry-run preflight를 먼저 실행한다. 필수 입력 누락, 잘못된 Render token, target 파생 실패가 있으면 `applyBlocked=true`와 `No Render or Cloudflare writes were attempted`를 출력하므로, 부분 입력 상태의 실적용 오작동을 완료 증거로 오해하지 않는다.
- 2026-07-12 16:59 `MUSUNIL_RENDER_API_DNS_TARGET`와 `CLOUDFLARE_API_TOKEN`만 있는 수동 target 경로에서는 `launch:apply -- --apply`가 Render API write를 건너뛰고 Cloudflare DNS apply만 실행한다. 이 경로는 Render Dashboard에서 custom domain target을 이미 확인한 경우의 적용 보조이며, Cloudflare apply와 strict DNS/final gate 통과 전 운영 준비 완료가 아니다.
- 2026-07-12 17:08 `launch:blockers`와 `service:watch` Required Action이 수동 Render target 경로를 직접 표시한다. `Render automation: skipped (manual_api_dns_target_without_render_token)`와 split path note는 operator 안내가 실제 apply 동작과 일치한다는 증거지만, 실제 Cloudflare DNS 적용과 `serviceSyncState=live` 전 운영 준비 완료가 아니다.
- 2026-07-12 17:13 `docs/launch-missing-inputs.md`를 최신 live blocker report로 다시 생성했고, `launch-check`가 `docs/splus-service-watch.md`의 `Last checked`와 입력 체크리스트의 `Blocker report` 시각이 다르면 실패하게 했다. 이는 오래된 사용자 입력 체크리스트를 완료 증거로 쓰지 않기 위한 guard이며, 실제 Cloudflare DNS/Web header/API live sync 전 운영 준비 완료가 아니다.
- 2026-07-12 17:22 `pnpm launch:handoff`를 추가했다. 이제 live blocker를 한 번만 갱신한 뒤 운영 브리프와 입력 체크리스트를 같은 report 시각으로 생성하고, `launch-check`가 `docs/splus-service-watch.md`, `docs/launch-operator-brief.md`, `docs/launch-missing-inputs.md`의 blocker 시각 불일치를 실패 처리한다. 이는 운영자 handoff 문서 오판을 줄이는 guard이며, 실제 외부 DNS/Header/API 연결 완료 증거가 아니다.
- 2026-07-12 17:29 운영 브리프의 하드코딩 Git SHA를 제거했다. 문서를 커밋하면 기록된 SHA는 구조적으로 stale해지므로, 이제 배포 직전 `git rev-parse HEAD`를 실행해 확인하도록 안내하고 `launch-check`가 `- Git SHA: <40hex>` 회귀를 실패 처리한다. 이는 stale commit 기준 배포 오판을 막는 guard이며, live 배포 완료 증거가 아니다.
- 2026-07-12 17:37 GitHub Actions `post-deploy` 수동 workflow가 `render_api_dns_target` 입력을 받아 `MUSUNIL_RENDER_API_DNS_TARGET`으로 넘기게 했다. Render API token 없이 Dashboard에서 복사한 API DNS target만 쓰는 경로도 원격 `final-gate`에서 strict CNAME 검증을 실행할 수 있지만, 실제 DNS 적용·API readiness·`serviceSyncState=live` 전 운영 준비 완료가 아니다.
- 2026-07-12 17:45 GitHub Actions `post-deploy` 수동 workflow가 선택적 `RENDER_API_TOKEN`/`MUSUNIL_RENDER_API_TOKEN`/`MUSUNIL_INTERNAL_API_KEY` secrets를 원격 `launch:final-gate`에 전달하게 했다. secret이 있으면 Render target 자동 파생과 공개 원천 refresh 회복을 원격에서도 시도할 수 있지만, secret 입력·DNS 적용·API readiness·`serviceSyncState=live` 전 운영 준비 완료가 아니다.
- 2026-07-12 17:50 GitHub Actions `post-deploy` 수동 workflow에 `github_environment` 입력과 기본 `production` job environment를 추가했다. Environment secret에 둔 Render/API 운영 secret도 원격 final-gate에서 접근 가능하지만, 실제 secret 입력·DNS 적용·API readiness·`serviceSyncState=live` 전 운영 준비 완료가 아니다.
- 2026-07-12 18:09 `launch:blockers`, `launch:cutover-rehearsal`, `launch:operator-brief`, `launch:missing-inputs`가 필수 입력 누락 상태에서 즉시 실행 가능한 dry-run과 입력 후 실제 apply 명령을 분리해 표시한다. `pnpm launch:apply`는 현재 안전한 dry-run이고 `pnpm launch:apply -- --apply`는 Render/Cloudflare 입력 뒤 실행할 명령으로만 안내되지만, 실제 DNS/Header/API live sync와 final gate 전 운영 준비 완료가 아니다.
- 2026-07-12 18:17 `storage:smoke`가 `MUSUNIL_STORAGE_SMOKE_KEY` override를 `private/live/smoke/` 아래로 제한한다. 이 guard는 기존 원본 media key 오삭제를 막지만, 실제 storage credential로 `pnpm storage:smoke`가 통과하기 전 운영 storage 준비 완료가 아니다.
- 2026-07-12 18:25 storage smoke key 제한은 `assertStorageSmokeKey`와 API self-check에서 실행 검증된다. 정상 smoke key는 통과하고 기존 원본 media key 후보, traversal, double-slash key는 실패해야 한다. 이 회귀 테스트는 운영 원본 오삭제 위험을 낮추지만, 실제 storage credential로 `pnpm storage:smoke`가 통과하기 전 운영 storage 준비 완료가 아니다.

## Next Active Goal Order

1. `pnpm launch:cutover-plan`으로 Render/Cloudflare/API 컷오버 입력값을 확인한다.
2. 실제 운영 입력 YAML을 채운다.
3. `pnpm launch:ready -- <yaml>`를 통과시킨다.
4. `pnpm launch:ready -- <yaml> --post-laws`를 staging 또는 운영 전 리허설에서 통과시킨다.
5. Render 배포 후 `pnpm sources:refresh-preflight`로 공개 집회 원천 refresh ledger를 확인한다. ledger가 부족하고 `MUSUNIL_INTERNAL_API_KEY`가 있으면 이 단계가 `sources:assemblies:post`를 자동 실행한다.
6. Render 배포 후 `pnpm launch:post-deploy-smoke -- --require-laws --require-source-refreshes`를 production 기본 URL 기준으로 통과시킨다. staging/preview 도메인은 env override로만 검증한다.
7. `pnpm launch:final-gate`를 통과시킨다.
8. Element Execution Board의 Active row를 증거 기반으로 Guard 또는 S+로 승급한다.
