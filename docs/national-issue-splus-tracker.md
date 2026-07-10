# National Issue S+ Tracker

Last updated: 2026-07-10 04:47 KST

Goal: 같은 주제의 집회가 전국에서 동시다발적으로 발생할 때, 일반 사용자가 무슨일에서 어디서 어떤 현장 신호가 확인되는지, 공개 근거와 현장 인증 Claim이 얼마나 쌓였는지, 규모 추정의 신뢰도와 한계가 무엇인지 객관적으로 파악하게 만든다.

Example scenario: `부정선거 의혹 제기 집회` 또는 `선거 검증 요구 집회`가 서울, 부산, 대구, 광주, 대전 등 여러 지역에서 동시에 발생한다. 언론 보도 여부와 무관하게 현장 참여자는 실시간 GPS 기반 현장 영상 Claim을 제출하고, 일반 사용자는 같은 주제의 전국 확산, 지역별 확인 수준, 규모 추정 범위, 반론/이견을 한 화면에서 본다.

## Product Boundary

- 앱은 집회 참여를 독려하지 않는다.
- 앱은 이동 경로, 전술, 충돌 회피, 집결 지시를 제공하지 않는다.
- 앱은 `부정선거`를 사실로 확정하지 않고 `부정선거 의혹 제기 집회`, `선거 검증 요구 집회`처럼 주장 대상과 집회 목적을 객관적으로 표현한다.
- 모든 발표, 현장 영상, 반론, 정정, 신고, AI 추정은 Claim이다.
- 규모는 단일 숫자가 아니라 범위, 신뢰도, 근거 수, 독립 시점 수, 한계와 함께 표시한다.

## Current Verdict

현재 종합 등급은 A+다.

- 강점: Issue 중심 구조, 공개 원천 비의존 시민 Claim, Proof-of-Presence, 비식별 공개본, Claim/Evidence 분리는 방향이 맞다.
- 개선됨: 이슈 상세 최상단에 전국 현황, 지역별 현장 신호, 자동 갱신 규모 추정, 검증 신호, 추정 한계, 이슈 단위 현장 영상 Claim 피드가 표시된다.
- 핵심 약점: 규모 추정은 보수적 자동 산출과 품질 신호 반영 단계까지 왔지만 운영형 영상 분석·실제 모바일 attestation provider dry-run·실제 `pnpm storage:smoke`·`pnpm redaction:smoke` 실행은 아직 남아 있다.
- S+까지 가장 큰 차이: `운영 저장소/모바일 무결성 검증`, `운영 cron 실패 알림`이 필요하다.

## Scorecard

| 항목 | 현재 등급 | S+ 기준 | 상태 |
|---|---:|---|---|
| 주제 기반 전국 묶기 | S+ | 같은 목적의 집회가 지역/시간별 별도 Occurrence로 유지되면서 하나의 Issue 아래 자동/수동 근거와 함께 묶인다. | `topicGrouping`으로 공통 주제어, 권역, 현장 유형, Claim/공식 자료 수, 지역·시간 분리 원칙 표시 |
| 뉴스 비의존성 | S+ | 언론 보도 없이도 공개 원천, 현장 영상 Claim, 현장 정정 Claim만으로 이슈 화면이 의미 있게 채워진다. | 시민 Claim·자동 추정·검증 신호·전국 coverage freshness 경로 있음 · 18개 권역 공식 일정 parser 활성 |
| 실시간 현장 인증 | A+ | 앱 내 촬영, GPS, 거리, 업로드 시간, 서버 해시, 기기 무결성, 비식별 공개본이 한 흐름으로 검증된다. | 브라우저 흐름 있음 · 검수 전 held_private · Proof-of-Presence는 `in_app_camera`와 최소 5초만 인정 · 5분 제한은 서버 기록 시각 기준 · 현장 판단 Claim도 verifier 전 held_private · 공개 전환은 내부 verifier device integrity `pass`와 proof hash 필요 · redaction worker 전용 공개본 URL/proof hash 기록 · 공개 URL 없는 완료 상태는 live evidence 제외 · 내부 device integrity provider/proof hash 기록 경로 있음 · S3-compatible encrypted storage adapter와 `pnpm storage:smoke` 있음 · `redaction.engine_smoke_command`와 `pnpm redaction:smoke` 있음 · Android service account JSON 구조 launch guard 있음 · 실제 모바일 attestation provider/storage/redaction smoke 실행 남음 |
| 전국 동시다발 인지 | S+ | 사용자가 첫 화면에서 전국 몇 개 권역, 몇 개 현장, 어떤 시간대에 같은 주제가 확인됐는지 즉시 본다. | 전국 시간축·동시/순차 라벨·Claim별 출처/근거/위험·자료 종류/지역 필터 표시 완료 |
| 규모 실시간 추정 | A+ | 지역별/이슈별 추정 범위, 신뢰도, 근거 수, 공개 가능한 현장 영상 기준 독립 시점 수, 한계가 명확하게 표시되고 추정 자체가 AI Claim으로 읽힌다. 공개 일정만으로는 숫자 추정을 만들지 않는다. | 이슈·지역별 자동 갱신 CrowdEstimate 표시 완료 · 저장 추정도 현재 공개 근거 없으면 제외 · 추정 Claim의 provenance/evidence/risk 분리 표시 · 독립 시점 지역 수 과대 산정 방지 · 공개 일정-only 자동 숫자 방지 · GPS/기기 무결성/중복 해시 품질 신호 반영 · 운영 영상 분석/실제 모바일 attestation 필요 |
| 조작 방어 | S+ | 대량 업로드, 좌표 스푸핑, 반복 영상, 동일 사용자 과대표집, 신고 악용을 별도 신호로 낮춘다. | 공개 검증 신호와 내부 risk dashboard에 반복 해시, GPS 품질, 지역 편중, 사용자 편중, 기기 bucket 군집이 표시됨 |
| 개인정보/권리 보호 | A+ | 원본 비공개, 비식별 공개본, 위치 흐림, 권리 검토 상태가 기본이다. | private path·정밀 위치값 비노출 dashboard 완료 · LIVE 공개 응답은 `publicRadiusM`만 노출 · 외부 저장소/redaction smoke/purge 검증 필요 |
| 알권리 중심 UX | S+ | 결집 유도 없이 “무슨 일이 어디서 얼마나 확인됐는지”를 국평오도 한눈에 이해한다. | 전국 요약·지역별 공식/현장/이견 상태·자동 추정·검증 신호·필터형 시간축 표시 완료 |

## Ordered Active Goals

1. 전국 이슈 헤더 S+ - 완료
   - 이슈 상세 최상단에 전국 현황 요약을 둔다.
   - 표시 기준: 권역 수, 관련 현장 수, 현장 인증 Claim 수, 공식/비공식 Claim 수, 규모 추정 범위, 최근 업데이트.
   - 완료됨: `topicGrouping`이 같은 주제 묶음 근거와 지역·시간별 분리 원칙을 함께 표시한다.
   - 금지: 참여 독려, 집결 요청, 전술성 문구.
   - 완료 증거: API self-check, web-smoke, 390px 모바일 브라우저 검증.

2. 지역별 현장 신호 S+ - 완료
   - 같은 Issue 아래 지역별 Occurrence와 ContinuousPresence를 한 패널에서 비교한다.
   - 각 지역은 `확인됨`, `더 확인 필요`, `이견 있음`, `공식 자료`, `현장 영상 있음` 상태를 분리해 보여준다.
   - 완료됨: `regionalSignals.statusLabels`와 웹 `지역별 현장 신호` 행이 공식 자료, 현장 Claim/영상, 이견, 더 확인 필요 상태를 직접 표시한다.

3. 규모 추정 S+ - 부분 완료
   - CrowdEstimate를 UI 중심 정보로 승격한다.
   - 단일 숫자 대신 `minCount~maxCount`, `confidence`, `method`, `evidenceCount`, `independentViewpointCount`, `limitations`를 표시한다.
   - 완료됨: 공개 Claim과 현장 신호 기반의 보수적 자동 갱신 추정이 생성되고, 한계가 숫자와 같은 시야에 표시된다.
   - 완료됨: `regionalCrowdEstimates`로 지역별 범위, 신뢰도, 근거 수가 표시된다.
   - 완료됨: GPS 품질, 기기 무결성 unknown/fail, 중복 해시가 있으면 자동 추정 confidence가 한 단계 낮아진다.
   - 남은 기준: 운영 영상 분석과 실제 모바일 attestation 연결이 필요하다.

4. 동시다발 타임라인 S+ - 완료
   - 같은 Issue의 지역별 첫 확인, 현장 영상 Claim, 공식 자료, 반론/정정이 시간순으로 묶인다.
   - 사용자는 “전국에서 동시에 발생했는지, 순차 확산인지”를 구분할 수 있어야 한다.
   - 완료됨: `/issues/:id` public response와 웹 흐름 탭에 전국 시간축, 동시/순차 라벨, Claim별 출처/근거/위험 라벨이 표시된다.
   - 완료됨: 웹 흐름 탭에 자료 종류 필터와 지역 필터가 있고, 390px 모바일과 1440px 데스크톱 캡처에서 `overflowX=false`가 확인됐다.

5. 현장 영상 Claim 피드 S+ - 완료
   - 이슈 단위 릴스형 피드에서 지역 필터와 현장 판단 상태를 제공한다.
   - 판단은 Proof-of-Presence 통과 사용자만 Claim으로 제출한다.
   - 완료됨: `/targets/issue/:id/live-claims`가 이슈에 연결된 공개 현장 영상 Claim을 지역/현장명/판단 상태와 함께 반환한다.
   - 완료됨: 웹 영상 탭에서 지역 필터와 현장 판단 필터를 제공하고, 필터 결과가 없을 때도 명확한 빈 상태를 표시한다.

6. 조작 방어 S+ - 완료
   - 반복 영상 해시, 동일 사용자/좌표 집중, 낮은 GPS 정확도, 비정상 업로드 속도, 지역 과대표집을 표시한다.
   - 조작 신호는 자동 삭제가 아니라 Risk level과 검토 우선순위에만 반영한다.
   - 완료됨: 공식 원천 부재, 추가 확인 필요, 반복 해시, 낮은 GPS 품질, 지역 집중을 공개 검증 신호로 표시한다.
   - 완료됨: 내부 `/admin/risk-dashboard`와 `pnpm admin:risk`가 review queue, high-risk Claim, held/private Claim, pending redaction, evidence signal, issue risk, audit log를 한 화면 계약으로 제공한다.
   - 완료됨: 사용자 편중과 기기 attestation bucket 군집은 식별자 원문 없이 검토 신호로 표시한다.
   - 운영 조정: 실제 트래픽 기반 임계값 튜닝은 배포 후 운영 항목으로 추적한다.

7. 운영형 현장 인증 S+
   - 외부 오브젝트 스토리지, 모바일 기기 무결성, 비식별 처리, 공개본 URL 검증까지 붙인다.
   - 검토 전 원본과 정밀 위치는 공개 응답에 나오지 않아야 한다.
   - 완료됨: 공개본 URL 없는 LIVE Claim은 admin publish도 실패하고, 자동 공개 설정이 원본 공개를 만들지 않는다.
   - 완료됨: 기기 무결성 결과는 내부 인증 경로에서만 `pass/fail/unknown`으로 기록된다.
   - 완료됨: 비식별 공개본 URL과 redaction proof hash는 내부 인증된 redaction worker 경로에서만 기록되고, Admin review와 admin claim CLI의 직접 URL 기록은 실패한다.

8. 국평오 알권리 UX S+
   - 첫 화면 문장을 “얼마나 모였나”가 아니라 “어디서 무엇이 확인됐나” 중심으로 정리한다.
   - 전국 요약, 지역 비교, 규모 추정, Claim 근거, 반론이 1분 안에 이해되어야 한다.

## Evidence Gates

S+ 완료 판정은 아래 증거가 있어야 한다.

| 증거 | 필요 조건 |
|---|---|
| API self-check | `부정선거 의혹 제기 집회` Issue 아래 서울/부산 등 복수 Occurrence가 같은 Issue로 묶임 |
| API self-check | Issue 상세 `topicGrouping`이 공통 주제어, 권역, 현장 유형, 지역·시간 분리 원칙을 포함함 |
| API self-check | Issue 대상 CrowdEstimate가 public response에 범위/신뢰도/한계와 함께 노출됨 |
| API self-check | CrowdEstimate가 `musunil_ai_estimate` Claim 메타와 evidence strength, risk level을 함께 노출함 |
| API self-check | CrowdEstimate 독립 시점 수는 공개 가능한 현장 영상 근거가 없으면 0이고, publishable live evidence의 geoCell/evidence id로만 증가함 |
| API self-check | 공개 일정·자료 Claim만 있는 이슈는 자동 CrowdEstimate를 만들지 않음 |
| API self-check | 저장된 CrowdEstimate도 현재 공개 가능한 현장 영상 근거가 없으면 공개 응답에서 제외됨 |
| API self-check | CrowdEstimate confidence가 GPS 품질, 기기 무결성 unknown/fail, 중복 해시 품질 신호를 반영함 |
| API self-check | Issue 대상 generated CrowdEstimate와 verification signal이 public response에 노출됨 |
| API self-check | Issue 대상 regionalCrowdEstimates가 public response에 지역별 범위와 함께 노출됨 |
| API self-check | Issue 대상 nationalTimeline이 public response에 노출되고 Claim별 출처/근거/위험 라벨을 분리함 |
| API self-check | Issue 대상 liveClaims가 공개 가능한 현장 영상 Claim만 반환하고 지역/현장명/판단 상태를 포함함 |
| API self-check | Issue 대상 regionalSignals가 공식/현장/이견/검증 상태 라벨을 포함함 |
| API self-check | 내부 risk dashboard가 검토 우선순위 신호를 제공하고 private storage path를 노출하지 않음 |
| API self-check | 내부 risk dashboard가 userId 원문 없이 user bucket과 device attestation bucket 군집을 제공함 |
| API self-check | 내부 privacy dashboard가 원본·정밀 위치·권리 검토 상태를 집계하되 private path와 정밀 위치값을 노출하지 않음 |
| API self-check | 현장 영상 Claim 원본 storageKey와 rawText가 공개 응답에 없음 |
| API self-check | 현장 영상 Claim 공개 응답은 정밀 GPS 값 대신 `publicRadiusM`만 노출함 |
| Schema/API self-check | LIVE media Proof-of-Presence는 `in_app_camera`와 최소 5초만 인정하고 gallery/external link/짧은 영상은 실패함 |
| API self-check | LIVE 제보와 현장 판단 Claim은 클라이언트 `uploadedAt` 위조가 아니라 서버 저장/요청 시각 기준으로 5분 내 현장성을 판정함 |
| API self-check | 현장 판단 Claim은 verifier 전 공개 summary와 이견 수에 반영되지 않고, sensor evidence의 trusted device integrity pass/proof 후 admin publish되어야 반영됨 |
| API/runtime self-check | 기기 무결성 결과는 내부 인증된 verifier 경로에서만 provider/proof hash와 함께 기록되고 원문 attestation token은 응답에 없음 |
| API self-check | redaction 완료 후에도 trusted device integrity pass/proof 전에는 LIVE Claim 공개 전환이 실패함 |
| API self-check | Admin review가 공개본 URL을 직접 기록하지 못하고 내부 redaction worker만 Evidence redaction을 완료할 수 있음 |
| API/runtime self-check | redaction proof 없는 공개본 기록은 실패하고, proof hash 또는 유효한 공개 URL 없는 completed LIVE Evidence는 공개 현장 영상으로 인정되지 않음 |
| API/runtime self-check | 비식별 공개본 URL은 내부 인증된 redaction worker 경로에서만 기록됨 |
| Manual smoke | 실제 비식별 엔진 command 입력 후 `pnpm redaction:smoke`가 출력 파일과 proof hash를 만듦 |
| Launch validation | production LIVE 현장 인증은 Play Integrity 또는 App Attest 설정 없이는 통과하지 않음 |
| Launch validation | Android Play Integrity credential은 base64 Google service account JSON 구조가 아니면 통과하지 않음 |
| API self-check | production 외부 storage 필수 모드에서 adapter가 없으면 LIVE 업로드가 실패하고, adapter가 있으면 원본 base64를 Store에 남기지 않으며 PUT 바이트는 AES-GCM 암호화됨 |
| API self-check | 대량 신고/후원/투표/댓글이 우선순위, 알림, 신뢰도에 영향 없음 |
| Web smoke | 전국 이슈 헤더, 지역별 현장 신호, 규모 추정 범위, 한계 문구가 존재함 |
| Web smoke | 이슈 영상 탭이 지역 필터와 현장 판단 필터를 제공함 |
| Browser capture | 1440px desktop, 390px mobile에서 전국 이슈 흐름이 가로 넘침 없이 보임 |
| Browser capture | 390px mobile에서 자동 갱신 추정, 추정 한계, 검증 신호가 한 흐름으로 보임 |
| Browser capture | 390px mobile과 1440px desktop에서 흐름 탭 자료/지역 필터가 보이고 `overflowX=false`임 |
| Tracker update | 모든 항목이 S+로 갱신되고 남은 운영 리스크가 분리됨 |

## Visual Evidence

| 화면 | 파일 | 확인 |
|---|---|---|
| 모바일 이슈 상세 상단 | `docs/national-issue-verification-mobile-2026-07-10-0027.png` | 전국 현황, 현장 영상 수, 규모 추정, 추정 한계 노출 |
| 모바일 검증 신호 | `docs/national-issue-verification-mobile-signals-2026-07-10-0027.png` | 지역별 현장 신호, 자동 갱신 추정, 검증 신호 노출 |
| 모바일 이슈 흐름 | `docs/national-issue-timeline-mobile-2026-07-10-0035.png` | 전국 시간축, 순차/동시 라벨, 현장 영상 Claim과 출처/근거/위험 메타 노출 |
| 모바일 지역별 규모 추정 | `docs/national-issue-regional-estimate-mobile-2026-07-10-0046.png` | 이슈 전체 추정, 지역별 규모 추정, 추정 한계 노출 |
| 모바일 타임라인 필터 | `docs/national-issue-timeline-filter-mobile-2026-07-10-0056.png` | 흐름 탭, 자료 종류 필터, 지역 필터, 서울 필터 선택, `overflowX=false` |
| 데스크톱 타임라인 필터 | `docs/national-issue-timeline-filter-desktop-2026-07-10-0056.png` | 3열 레이아웃에서 전국 시간축과 필터 노출, `overflowX=false` |

## Update Rule

- 개선 전에는 이 문서의 Scorecard를 기준으로 작업한다.
- 개선 후에는 Scorecard, Ordered Active Goals, Improvement Log를 갱신한다.
- S+ 판정은 테스트, 화면 캡처, 공개 payload 검증 중 하나 이상이 있어야 한다.
- 결집을 돕는 문구처럼 보이면 알권리 중심 문구로 바꾼다.

## Improvement Log

| 시간 | 항목 | 변경 | 판정 |
|---|---|---|---|
| 2026-07-10 00:14 KST | 전체 | 전국 단위 동일 주제 집회 사용 사례를 별도 S+ tracker로 분리하고, 현재 등급·S+ 조건·증거 게이트·순차 active goals를 정의했다. | A- 기준선 설정 |
| 2026-07-10 00:22 KST | 전국 이슈 헤더·규모 추정 | `/issues/:id`에 `nationalSummary`, `regionalSignals`, `crowdEstimates`를 추가하고, 웹 이슈 상세 요약에 전국 현황·지역별 현장 신호·규모 추정·추정 한계를 표시했다. self-check, web-smoke, 390px 모바일 브라우저 검증에서 가로 넘침 없음과 동원성 문구 없음 확인. | A- → A |
| 2026-07-10 00:27 KST | 규모 추정·검증 신호 | 공개 Claim과 현장 신호에서 generated CrowdEstimate를 보수적으로 산출하고, 공식 원천 부재·추가 확인 필요·반복 해시·GPS 품질·지역 집중을 삭제가 아닌 검토 신호로 표시하도록 API와 웹 self-check를 보강했다. | A → A+ |
| 2026-07-10 00:29 KST | 모바일 화면 검증 | 390px 모바일 상세 탭에서 전국 현황, 자동 갱신 추정, 추정 한계, 검증 신호가 노출되고 `overflowX=false`, 동원성 문구 없음이 확인됐다. | A+ 유지 |
| 2026-07-10 00:31 KST | 릴리즈 게이트 | `pnpm check:release` 통과로 API 계약, 웹 smoke, 런타임 경계 검증이 유지됨을 확인했다. | A+ 유지 |
| 2026-07-10 00:35 KST | 동시다발 타임라인 | `nationalTimeline`과 웹 흐름 탭의 전국 시간축을 추가했다. 지역별 첫 확인, 현장 영상 Claim, 공개 Claim을 시간순으로 보여주고 동시/순차 라벨을 표시한다. 390px 모바일 캡처에서 `overflowX=false` 확인. | 전국 동시다발 인지 A → A+ |
| 2026-07-10 00:37 KST | 릴리즈 게이트 | `pnpm check:release` 재통과로 nationalTimeline 변경 뒤 API 계약, 웹 smoke, 런타임 경계 검증이 유지됨을 확인했다. | A+ 유지 |
| 2026-07-10 00:39 KST | 조작 방어 | 내부 risk dashboard와 `pnpm admin:risk`를 추가했다. 운영자는 검증 신호, GPS 품질, 반복 해시, held/private Claim, 비식별 대기, 감사 로그를 자동 삭제가 아닌 검토 우선순위로 볼 수 있다. | 조작 방어 A → A+ |
| 2026-07-10 00:40 KST | 릴리즈 게이트 | `pnpm admin:risk -- --json` 실제 응답, `pnpm check:release` 통과, runtime smoke `admin_risk_dashboard` 통과를 확인했다. | A+ 유지 |
| 2026-07-10 00:43 KST | 개인정보·권리 보호 | 내부 privacy dashboard와 `pnpm admin:privacy`를 추가했다. 원본 영상, 정밀 위치 필드, 권리 검토 Claim, purge 대상 수를 private path와 정밀 위치값 없이 확인하고, 오래된 upload buffer 삭제를 self-check로 검증했다. | 개인정보·권리 보호 A → A+ |
| 2026-07-10 00:44 KST | 릴리즈 게이트 | `pnpm admin:privacy -- --json` 실제 응답, `pnpm check:release` 통과, runtime smoke `admin_privacy_dashboard` 통과를 확인했다. | A+ 유지 |
| 2026-07-10 00:46 KST | 규모 실시간 추정 | `regionalCrowdEstimates`와 웹 `지역별 규모 추정` 패널을 추가했다. 이슈 전체 범위와 지역별 보수 범위·신뢰도·근거 수를 함께 볼 수 있다. | 규모 실시간 추정 A → A+ |
| 2026-07-10 00:48 KST | 화면·릴리즈 게이트 | `pnpm check:release` 통과 후 390px 모바일에서 지역별 규모 추정, 자동 갱신 추정, 추정 한계, `overflowX=false`를 확인했다. | A+ 유지 |
| 2026-07-10 00:50 KST | 뉴스 비의존성·공개 원천 | `/public-sources/coverage`가 18개 권역별 상태, 갱신 주기, 다음 점검, 공백 사유를 제공한다. 웹 coverage 패널은 미확인을 집회 부재로 표현하지 않는다. | 뉴스 비의존성 A → A+ |
| 2026-07-10 00:56 KST | 주제 기반 전국 묶기 | `/issues/:id`에 `topicGrouping`을 추가했다. 사용자는 같은 주제로 묶인 근거, 공통 주제어, 권역, 현장 유형, Claim 수, 지역·시간별 별도 현장 원칙을 이슈 상세에서 확인한다. | 주제 기반 전국 묶기 A+ → S+ |
| 2026-07-10 01:00 KST | 전국 동시다발 인지 | 흐름 탭에 자료 종류 필터와 지역 필터를 추가했다. 모바일/데스크톱 브라우저 검증에서 필터 노출·선택 상태·행 수 변화·`overflowX=false`를 확인했다. | 전국 동시다발 인지 A+ → S+ |
| 2026-07-10 01:04 KST | 지역별 현장 신호 | `regionalSignals`에 공식/현장/이견/검증 상태 라벨을 추가하고, 웹 `지역별 현장 신호` 행에서 직접 표시했다. API self-check와 web smoke가 해당 계약을 검증한다. | 지역별 현장 신호 완료 · 알권리 UX A+ → S+ |
| 2026-07-10 01:09 KST | 조작 방어 | 공개 `verificationSignals`와 내부 risk dashboard에 사용자 편중, 기기 attestation bucket 군집, 기기 무결성 확인 신호를 추가했다. 내부 응답은 raw userId/device attestation을 노출하지 않는다. | 조작 방어 A+ → S+ |
| 2026-07-10 01:14 KST | 현장 영상 Claim 피드 | `/targets/issue/:id/live-claims`가 이슈 전체 공개 영상 Claim을 모아 반환하고, 웹 영상 탭에 지역 필터·현장 판단 필터·지역/현장명 맥락을 추가했다. 공개 응답 안전성은 self-check, 화면 계약은 web-smoke로 검증했다. | 현장 영상 Claim 피드 S+ |
| 2026-07-10 01:24 KST | 뉴스 비의존성·공개 원천 | 강원경찰청 `오늘의 주요집회` parser를 추가해 대구 외 1개 권역의 공식 일정 HTML도 Claim payload로 만들 수 있게 했다. dry-run에서 대구+강원 20건을 확인했다. | 뉴스 비의존성 A+ 유지 · 전체 권역 확대 필요 |
| 2026-07-10 01:27 KST | 뉴스 비의존성·공개 원천 | 부산경찰청 `오늘의 집회/시위` parser를 추가했다. dry-run에서 대구+강원+부산 30건을 확인했고, 후보 권역은 0개가 됐다. | 뉴스 비의존성 A+ 유지 · 전체 권역 확대 필요 |
| 2026-07-10 01:33 KST | 뉴스 비의존성·공개 원천 | 경기남부경찰청 `오늘의 주요집회` parser를 추가했다. dry-run에서 대구+강원+부산+경기남부 40건, `activeScheduleRegions=4`, `needsDiscoveryRegions=12`를 확인했다. | 뉴스 비의존성 A+ 유지 · 전체 권역 확대 필요 |
| 2026-07-10 01:37 KST | 뉴스 비의존성·공개 원천 | 광주경찰청 `오늘의집회시위` parser를 추가했다. dry-run에서 대구+강원+부산+경기남부+광주 50건, `activeScheduleRegions=5`, `needsDiscoveryRegions=11`을 확인했다. | 뉴스 비의존성 A+ 유지 · 전체 권역 확대 필요 |
| 2026-07-10 01:41 KST | 뉴스 비의존성·공개 원천 | 인천경찰청 `오늘의 집회/시위` parser를 추가했다. EUC-KR 목록을 디코딩해 dry-run에서 대구+강원+부산+경기남부+광주+인천 60건, `activeScheduleRegions=6`, `needsDiscoveryRegions=10`을 확인했다. | 뉴스 비의존성 A+ 유지 · 전체 권역 확대 필요 |
| 2026-07-10 01:46 KST | 뉴스 비의존성·공개 원천 | 경북경찰청 `오늘의 집회시위` parser를 추가했다. dry-run에서 대구+강원+부산+경기남부+광주+인천+경북 70건, `activeScheduleRegions=7`, `needsDiscoveryRegions=9`를 확인했다. | 뉴스 비의존성 A+ 유지 · 전체 권역 확대 필요 |
| 2026-07-10 01:52 KST | 뉴스 비의존성·공개 원천 | 경남경찰청 `오늘의 주요집회` parser를 추가했다. 공식 게시판 JSON dry-run에서 대구+강원+부산+경기남부+광주+인천+경북+경남 80건, `activeScheduleRegions=8`, `needsDiscoveryRegions=8`을 확인했다. | 뉴스 비의존성 A+ 유지 · 전체 권역 확대 필요 |
| 2026-07-10 01:56 KST | 뉴스 비의존성·공개 원천 | 제주경찰청 `오늘의집회` parser를 추가했다. 공식 HTML dry-run에서 대구+강원+부산+경기남부+광주+인천+경북+경남+제주 90건, `activeScheduleRegions=9`, `needsDiscoveryRegions=7`을 확인했다. | 뉴스 비의존성 A+ 유지 · 전체 권역 확대 필요 |
| 2026-07-10 01:59 KST | 뉴스 비의존성·공개 원천 | 충북경찰청 `오늘의 집회 시위` parser를 추가했다. 공식 HTML dry-run에서 대구+강원+부산+경기남부+광주+인천+경북+경남+제주+충북 100건, `activeScheduleRegions=10`, `needsDiscoveryRegions=6`을 확인했다. | 뉴스 비의존성 A+ 유지 · 전체 권역 확대 필요 |
| 2026-07-10 02:03 KST | 뉴스 비의존성·공개 원천 | 울산경찰청 `오늘의 집회` parser를 추가했다. 공식 모바일 목록 dry-run에서 110건 payload, `activeScheduleRegions=11`, `needsDiscoveryRegions=5`를 확인했고 `집회표` 게시물 제목 날짜를 Claim 일정일로 읽는다. | 뉴스 비의존성 A+ 유지 · 전체 권역 확대 필요 |
| 2026-07-10 02:10 KST | 뉴스 비의존성·공개 원천 | 서울경찰청 교통정보센터 `집회·통제정보` 공식 JSON parser를 추가했다. 공식 POST JSON dry-run에서 120건 payload, `activeScheduleRegions=12`, `needsDiscoveryRegions=4`를 확인했다. | 뉴스 비의존성 A+ 유지 · 전체 권역 확대 필요 |
| 2026-07-10 02:14 KST | 뉴스 비의존성·공개 원천 | 세종경찰청 `오늘의 집회/시위` parser를 추가했다. 정적 HTML 목록의 게시물 단위 Claim을 만들고 기간형 제목은 `endsAt`도 기록한다. | 뉴스 비의존성 A+ 유지 · 전체 권역 확대 필요 |
| 2026-07-10 02:18 KST | 뉴스 비의존성·공개 원천 | 경기북부경찰청 `오늘의 주요집회` parser를 추가했다. 통계 전용 권역에서 일정 활성 권역으로 승격했고 기간형 제목은 `endsAt`도 기록한다. | 뉴스 비의존성 A+ 유지 · 전체 권역 확대 필요 |
| 2026-07-10 02:32 KST | 뉴스 비의존성·공개 원천 | 대전·충남·전북·전남 공식 일정 parser를 추가해 18개 권역 전체가 공식 공개 일정 원천을 갖게 했다. dry-run에서 `fullScheduleCoverage=true`, `activeScheduleRegions=18`, `count=180`을 확인했다. | 뉴스 비의존성 S+ |
| 2026-07-10 02:36 KST | 실시간 현장 인증 | LIVE Claim은 Proof-of-Presence 통과 후에도 검수 대기 상태이며, 비식별 공개본 URL 없이는 공개 전환이 실패하도록 self-check를 추가했다. | 실시간 현장 인증 A → A+ |
| 2026-07-10 02:47 KST | 규모 실시간 추정 | derived CrowdEstimate confidence가 live count/지역 수 외에도 GPS 품질, 기기 무결성 unknown/fail, 중복 해시를 반영해 낮아지도록 했다. | 규모 실시간 추정 A+ 유지 · 품질 신호 반영 |
| 2026-07-10 02:49 KST | 개인정보/권리 보호 | 서버 생성 LIVE Evidence에 공개 위치 반경을 부여하고, 공개 live-claims 응답에서는 정밀 GPS 값 없이 `publicRadiusM`만 확인되도록 self-check를 추가했다. | 개인정보/권리 보호 A+ 유지 |
| 2026-07-10 02:53 KST | 실시간 현장 인증 | 내부 인증된 device integrity verifier가 Evidence의 `deviceIntegrityStatus`를 기록하는 경로를 추가하고 API/runtime self-check로 인증 요구와 응답 안전성을 검증했다. | 실시간 현장 인증 A+ 유지 · 실제 provider 연결점 준비 |
| 2026-07-10 02:56 KST | 실시간 현장 인증 | 내부 인증된 redaction worker가 LIVE Evidence의 비식별 공개본 URL을 기록하는 경로를 추가하고 API/runtime self-check로 인증 요구, URL 제한, 응답 안전성을 검증했다. | 실시간 현장 인증 A+ 유지 · 실제 마스킹 엔진 연결점 준비 |
| 2026-07-10 03:54 KST | 실시간 현장 인증 | `redaction.engine_smoke_command`와 `pnpm redaction:smoke`를 추가해 실제 비식별 엔진 command가 입력 파일을 처리하고 proof hash를 만들 수 있는지 운영 전 검증하게 했다. | 실시간 현장 인증 A+ 유지 · 실제 redaction smoke 실행 남음 |
| 2026-07-10 03:57 KST | 릴리즈 게이트 | 샘플 `pnpm redaction:smoke`, `pnpm check:launch-sample`, `pnpm check:release`가 통과했다. | 운영형 현장 인증 회귀 없음 |
| 2026-07-10 03:59 KST | 실시간 현장 인증 | Android Play Integrity credential이 base64 Google service account JSON 구조인지 launch validation에서 확인하게 했다. | 모바일 verifier credential 구조 가드 강화 |
| 2026-07-10 04:01 KST | 릴리즈 게이트 | `pnpm check:launch-sample`과 `pnpm check:release`가 통과했다. | 모바일 verifier credential 구조 회귀 없음 |
| 2026-07-10 04:02 KST | 법안·개정안 연결 | 법 원천 credential이 있을 때 `pnpm sources:laws` dry-run 0건을 성공으로 보지 않고 `law_source_parse_empty`로 실패하게 했다. | 법 원천 dry-run 판정 강화 |
| 2026-07-10 04:03 KST | 릴리즈 게이트 | `pnpm --filter @musunil/public-source-ingest test`, `pnpm check:launch-sample`, `pnpm check:release`가 통과했다. | 법 원천 dry-run 판정 회귀 없음 |
| 2026-07-10 04:05 KST | 실시간 현장 인증 | 공유 Proof-of-Presence 판정과 `/reports/live` self-check가 gallery/external link 제출을 현장 인증으로 인정하지 않게 했다. | 현장 영상 Claim 입력 경계 강화 |
| 2026-07-10 04:06 KST | 릴리즈 게이트 | `pnpm --filter @musunil/schemas test`, `pnpm --filter @musunil/api test`, `pnpm check:release`가 통과했다. | in-app camera Proof-of-Presence 회귀 없음 |
| 2026-07-10 04:08 KST | 실시간 현장 인증 | Proof-of-Presence 정책에 최소 5초 LIVE 영상 조건을 추가하고 1초 제출 실패를 self-check로 고정했다. | 너무 짧은 현장 영상 인증 차단 |
| 2026-07-10 04:09 KST | 릴리즈 게이트 | `pnpm --filter @musunil/schemas test`, `pnpm --filter @musunil/api test`, `pnpm check:release`가 통과했다. | 최소 5초 Proof-of-Presence 회귀 없음 |
| 2026-07-10 04:12 KST | 실시간 현장 인증 | LIVE Claim 공개 전환은 내부 verifier의 device integrity `pass`와 proof hash가 있어야 가능하게 했다. | trusted device integrity 전 공개 차단 |
| 2026-07-10 04:14 KST | 릴리즈 게이트 | `pnpm --filter @musunil/api test`, `pnpm check:release`가 통과했다. | trusted device integrity 공개 전환 회귀 없음 |
| 2026-07-10 04:17 KST | 실시간 현장 인증 | LIVE 제보와 현장 판단 PoP가 서버 기록 시각으로 5분 제한을 판정하게 했다. 클라이언트 `uploadedAt`을 과거로 맞춘 위조 제출은 self-check에서 실패한다. | 서버 기준 실시간성 강화 |
| 2026-07-10 04:21 KST | 실시간 현장 인증 | 현장 판단 Claim은 최초 `held_private`로 접수되고, sensor evidence의 trusted device integrity pass/proof 뒤 admin publish되어야 공개 영상 판단 요약에 반영된다. | 현장 판단 조작 방어 강화 |
| 2026-07-10 04:25 KST | 규모 실시간 추정 | 자동 규모 추정 응답과 웹 패널에 `musunil_ai_estimate` Claim 메타, 근거 강도, 위험 수준을 함께 표시하게 했다. | AI 추정의 Claim 중심성 강화 |
| 2026-07-10 04:27 KST | 규모 실시간 추정 | 독립 시점 수가 이슈 지역 수로 과대 산정되지 않고 공개 가능한 live evidence 기준으로만 증가하게 했다. | 규모 추정 객관성 강화 |
| 2026-07-10 04:30 KST | 규모 실시간 추정 | 공개 현장 영상이 없는 공개 일정-only 이슈는 자동 규모 숫자를 만들지 않게 했다. | 근거 없는 규모 추정 차단 |
| 2026-07-10 04:33 KST | 규모 실시간 추정·검증 신호 | 저장 추정, 전국 시간축의 현장 영상 라벨, 공개 검증 신호가 모두 publishable live evidence 기준을 사용하게 했다. | 비공개/오래된 근거 혼입 방지 |
| 2026-07-10 04:36 KST | 릴리즈 게이트 | `pnpm check:release`가 통과했다. public live evidence 기준 강화 뒤 typecheck, test, runtime smoke, web smoke가 유지됨을 확인했다. | 전국 이슈 S+ 회귀 없음 |
| 2026-07-10 04:38 KST | 전체 S+ 관리 | `pnpm check:splus`가 전국 이슈 트래커의 A+ 판정과 실제 모바일 attestation/storage/redaction smoke 잔여 조건을 함께 검증하게 했다. | 조기 S+ 선언 방지 |
| 2026-07-10 04:47 KST | 실시간 현장 인증 | `pnpm mobile:integrity-smoke`를 추가해 실제 Play Integrity/App Attest verifier dry-run이 운영 전 통합 smoke의 일부가 되게 했다. | 모바일 attestation dry-run 증거 경로 준비 |
