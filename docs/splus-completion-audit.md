# S+ Completion Audit

Last updated: 2026-07-11 11:26 KST

Status: 완료 아님.

이 문서는 active goal 완료 여부를 감사한다. 완료 판단은 `docs/splus-master-tracker.md`의 Element Execution Board, launch checklist, 실제 명령 실행 결과를 함께 봐야 한다.

## Completion Rule

active goal은 아래 조건이 모두 증명될 때만 완료다.

- 모든 항목이 S+ 또는 운영에서 동등하게 검증된 Guard 상태다.
- Active row가 0개다.
- `pnpm launch:ready -- <운영 user-inputs.yaml>`가 실제 운영 입력값으로 통과한다.
- `pnpm launch:post-deploy-smoke -- --require-laws`가 실제 배포 API URL로 통과한다.
- `pnpm service:watch -- --once`가 실제 Web/API URL 기준으로 통과한다.
- storage, redaction, mobile integrity, law source dry-run/post, production `/ready`가 실제 외부 연결로 통과한다.
- 공개 화면과 공개 API에 원문, 정밀 위치, private media key, 요구사항 문구가 나오지 않는다.

## Requirement Audit

| 요구사항 | 현재 판정 | 증거 | 남은 조건 |
|---|---|---|---|
| 주제 기반 전국 묶기 | S+ Guard | `topicGrouping`, Issue detail self-check, web smoke | 새 원천 유입 시 회귀 방지 |
| 뉴스 비의존성 | S+ Guard | 18개 권역 공개 일정 parser, `/public-sources/coverage`, runtime smoke | 운영 cron 실패 감지와 실운영 수집 확인 |
| 실시간 현장 인증 | A+ Active | 앱 내 촬영, 최소 5초, 서버 시각, held_private, redaction proof, trusted device integrity gate, 공개 poster 필수, API redacted poster route smoke | 실제 storage, redaction, Play Integrity/App Attest dry-run |
| 전국 동시다발 인지 | S+ Guard | `nationalTimeline`, 자료/지역 필터, 모바일/데스크톱 캡처 | 새 데이터 유입 시 회귀 방지 |
| 규모 실시간 추정 | A+ Active | AI 추정 Claim 메타, 공개 근거 없는 추정 차단, 독립 시점 과대 산정 차단 | 실제 운영 영상/현장 인증 결과를 추정 confidence에 연결 |
| 조작 방어 | S+ Guard | 반복 해시, GPS 품질, 사용자/기기 bucket, 지역 편중, risk dashboard | 운영 실측 임계값 튜닝 |
| 개인정보/권리 보호 | A+ Active | private key/raw GPS 비노출, 공개 반경, poster 없는 clip 공개 차단, purge 전 외부 delete gate | 실제 storage 권한, redaction smoke, purge 검증 |
| 알권리 중심 UX | A 후보 Active | 상업용 UI/UX 재설계 문서, 이슈 First 28차 구현, 표형 row 제거, 데스크톱 홈 도구 동시노출 제거 캡처, 우측 맥락 패널 1차 재정렬, 제보 첫 행동 단순화, 지도 숫자판 제거, 상세 `시간 흐름` 탭 정정, 홈/지도 `오늘` 날짜 혼선 제거, `현장 파일/현장 판단/GPS 인증` 운영자 언어 제거, 릴스 액션 축소와 하단 근거 도구막대, 샘플 poster 검토 대기 슬롯 전환, 홈 compact review row 전환, stale config 빈 화면 회귀 방어, 홈 scanline clipped false, 데스크톱 홈 `지역 현황` 지도 연결, 데스크톱 기본 홈 `detailVisible=false` 2축 구조, 행동 후 `desktop-detail-open` 상세 패널, 지도 선택 시트 경량화, 지도 검색/범례/탐색 타일 경량화, 모바일/태블릿 홈 이슈 피드 유지 캡처, 영상 0건 직접 노출 제거, 홈 `근거/영상/지역/반론` 액션 허브, 법안·탐색·상세·영상 0-count 공개 문구 완화, 모바일 액션 플로우 `근거→상세 근거`, `영상→영상 탭`, `지역→지도`, `반론→반론·정정`, 영상/지도/제보 선택 이슈 문맥 라인, `공개된 주장`→`출처별 자료`, `다른 주장`→`반론·정정`, `영상제보` 라벨, 홈 주행동 `지도에서 확인`, 보조 액션 `근거/인증영상/반론`, 탭 라벨 `인증영상/현장촬영`, 공식 자료 핀과 GPS 인증 영역·줌 분리, 인증영상 기본 이슈 선택과 poster 없는 검토 카드, 공개 clip+poster의 풀스크린 video player 계약, 공개 media route/MIME/CSP 계약, 배포 후 공개 clip route 감시, 금지 문구 web smoke | 11:21 36차에서 seed/API 공개 clip route와 media CSP, 배포 후 smoke/runtime/service-watch 공개 clip route까지 검증하게 했다. 그래도 실제 운영 GPS evidence, 실제 운영 공개 영상 캡처, 독립 재검증, 사용자 수락 전 S+ 아님 |
| 지도·지역 UX | A+ 후보 Active | 공개 지도는 자료 위치 핀과 현장 인증 범위만 유지, 지도 탭 숫자 타일 0개, 중복 지도 버튼 hidden, 지도-first 재배치, 데스크톱 홈 `지역 현황` 지도 visible, 모바일 홈 지도 미노출, 모바일 map top 215px/height 460px, 데스크톱 map top 211px/height 700px, 데스크톱 map width 1200px/viewport share 83%, 홈/전용 지도 시트 62px, 모바일 지도 시트 114px, `sheetMapRatio=0.09~0.25`, toolbar 52~54px, 탐색 tile 52px, summary hidden, 하단 내비 겹침 없음, 지도·상세 제목 동기화, 31차 fallback 지도 표면 개선, MapLibre `styledata/idle` layer sync, 32차 Evidence-gated presence area와 근접 줌, 공식 자료 핀 `현장 인증 영역은 아직 없습니다`, 검색 후 지도 맥락 `detailOpen=false`, `visibleRejected=[]` | 사용자 수락, 독립 비평 재검증, 실제 GPS evidence 기반 영역 시각 검증 |
| 법안·개정안 연결 | A+ Active | parser mock self-check, `/laws`, production preview 비노출, 0건 dry-run 실패 가드 | 실제 법 API 키로 dry-run 1건 이상과 post 검증 |
| 본인확인 기반 쓰기 경계 | A+ Active | 포트원 provider 설정, identity start/complete, write endpoint `identity_required` 경계 | 실제 포트원 채널 키와 운영 SDK 결제 전 인증 리허설 |
| 운영 배포 준비 | A- Active | Render blueprint, `/ready`, not-ready write fail-closed, `launch:ready` | 실제 운영 YAML/Secret, DB/Redis, Render 배포 health 통과 |

## Current Passing Evidence

- `pnpm check:release`
- `pnpm check:splus`
- `pnpm launch:ready -- --list`로 actual input 단계와 sample gate 단계를 구분
- `pnpm launch:external-smoke -- --list`
- API/runtime/web smoke 경계 검증

## Required Final Evidence

아래는 실제 운영 입력값과 외부 연결이 있어야 한다.

```bash
pnpm launch:ready -- config/musunil.user-inputs.local.yaml
pnpm launch:ready -- config/musunil.user-inputs.local.yaml --post-laws
MUSUNIL_API_BASE_URL=https://api.example.com pnpm launch:post-deploy-smoke -- --require-laws
MUSUNIL_WEB_BASE_URL=https://musunil.com MUSUNIL_API_BASE_URL=https://api.example.com pnpm service:watch -- --once
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
- 실제 법 원천 `pnpm sources:laws` 1건 이상 dry-run/post 결과가 아직 없다.
- 실제 포트원 본인확인 채널로 인증 완료 리허설 결과가 아직 없다.
- 운영 DB/Redis/Render `/ready` 결과가 아직 없다.
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

## Next Active Goal Order

1. 실제 운영 입력 YAML을 채운다.
2. `pnpm launch:ready -- <yaml>`를 통과시킨다.
3. `pnpm launch:ready -- <yaml> --post-laws`를 staging 또는 운영 전 리허설에서 통과시킨다.
4. Render 배포 후 `pnpm launch:post-deploy-smoke -- --require-laws`를 실제 URL 기준으로 통과시킨다.
5. Element Execution Board의 Active row를 증거 기반으로 Guard 또는 S+로 승급한다.
