# Musunil S+ Master Tracker

Last updated: 2026-07-11 11:21 KST

Active goal: 무슨일의 모든 제품 요소가 S+가 될 때까지 문서로 추적하고 순차 개선한다. 기준 사용 사례는 전국 단위 동일 주제 집회 확인이며, 주제 기반 전국 묶기, 뉴스 비의존성, 실시간 현장 인증, 전국 동시다발 인지, 규모 실시간 추정, 조작 방어, 개인정보/권리 보호, 알권리 중심 UX, 공개 원천 전국 균등성, 법안·개정안 연결, 운영 배포 준비를 모두 포함한다.

Active goal status: 진행 중. 이 문서의 Element Execution Board에서 S+가 아닌 항목이 남아 있으면 active goal은 완료하지 않는다.

## Active Goal Management

- 전체 active goal은 이 문서가 관리한다.
- 목표 단위는 기능이 아니라 사용자에게 드러나는 제품 요소다.
- 각 요소는 `현재 등급`, `S+ 기준`, `차단 요인`, `다음 active goal`, `S+ 판정 증거`를 반드시 가진다.
- `Active` 항목은 즉시 개선 대상이며, `Guard` 항목은 S+ 회귀 방지 대상이다.
- 각 요소의 `다음 active goal`은 한 번에 하나씩 순차 수행한다.
- 승급은 문서 선언만으로 하지 않고, self-check, dry-run, release gate, browser capture, public payload 검증 중 하나 이상의 증거가 있어야 한다.
- 외부 연결값이 필요한 항목은 차단 사유와 사용자가 마지막에 입력할 값만 남긴다.

## Product-Wide S+ Contract

| 축 | S+ 상태 정의 | 현재 관리 방식 |
|---|---|---|
| 정보 구조 | 사용자는 먼저 이슈를 보고, 지역·시간·근거·이견을 따라 내려간다. | Issue → Occurrence/Claim → Evidence/Risk → Timeline/Map |
| 데이터 모델 | 어떤 입력도 Event 단일 진실 객체로 승격되지 않는다. | Claim 중심 schema/API self-check |
| 공개 원천 | 전국 권역이 같은 기준으로 추적되고, 공백은 집회 부재가 아니라 자료 상태로 표시된다. | 18개 권역 coverage report와 parser dry-run |
| 현장 인증 | 실시간 GPS 기반 현장 영상만 사용자 제보가 되며, 공개본은 유효한 공개 URL과 비식별 처리 증거가 있어야 한다. | LIVE upload/review/worker-redaction proof contract |
| 조작 방어 | 의심 신호는 자동 삭제가 아니라 검토 우선순위와 위험 신호로만 반영된다. | public verification signals + admin risk dashboard |
| 개인정보 | 원문, 정밀 위치, 원본 미디어 key는 공개 응답에 나오지 않는다. | privacy dashboard + purge/self-check |
| UX/디자인 | 국평오도 1분 안에 “어디서 무엇이 확인됐는지”를 이해한다. | 390px/1440px capture와 web smoke |
| 쓰기 경계 | 읽기는 공개이고 제보·반론·신고·알림은 본인확인 완료 세션으로만 가능하다. | PortOne identity adapter + write boundary smoke |
| 운영 | 사용자가 마지막 입력값만 채우면 배포·수집·검증·모니터링이 돈다. | launch checklist + Render runtime gates |

## Product Goal

무슨일은 집회·시위에 관한 공개 자료와 현장 인증 Claim을 모아, 사용자가 특정 이슈에 대해 어디서 무엇이 확인됐는지 객관적으로 파악하게 하는 서비스다.

- 목표는 참여 독려가 아니라 알권리 제공이다.
- Event를 단일 진실 객체로 만들지 않는다.
- 모든 발표, 보도, 제보, 반론, 신고, AI 추정은 Claim이다.
- 같은 주제라도 다른 지역과 시간은 별도 Occurrence로 남긴다.
- 규모, 원천, 근거 강도, 위험 수준은 분리해 표시한다.
- 후원, 신고 수, 추천/비추천, 자유 댓글은 노출·알림·신뢰도·랭킹에 영향을 주지 않는다.

## Source Of Truth

| 문서 | 역할 |
|---|---|
| `docs/splus-master-tracker.md` | 전체 S+ 목표, 현재 등급, 순차 active goal 관리 |
| `docs/splus-ux-tracker.md` | 데스크톱·모바일 화면 흐름, 디자인, 국평오 직관성 관리 |
| `docs/commercial-splus-redesign.md` | 상업용 앱 수준 UI/UX 재설계 active goal, 에이전트 피드백, 사용자 수락 게이트 관리 |
| `docs/national-issue-splus-tracker.md` | 전국 동일 주제 집회 사용 사례와 규모·검증·타임라인 관리 |
| `docs/splus-completion-audit.md` | active goal 완료 여부를 요구사항별 증거와 미충족 조건으로 감사 |
| `docs/data-fixtures-and-real-sources.md` | 공개 원천, 지역 균등성, 실제 데이터 연결 원칙 관리 |
| `docs/launch-readiness-checklist.md` | 운영 전 외부 연결, 배포, 런타임 체크 관리 |
| `AGENTS.md` | 프로젝트 비협상 원칙과 금지사항 |

## Overall Verdict

현재 전체 등급은 A다.

- UX·디자인은 사용자 판정과 충돌한 문서상 S+ 선언을 리셋했고, 상업용 앱 수준 재설계가 Active다. 1~35차 개선으로 홈 KPI/숫자판/장식 커버/운영자 언어/지도 숫자판/제보 기술 문구/상세 탭 오표기/모바일 카드 과밀/제보 단계표를 낮췄고, 공개 poster 프리뷰·근거 탭 직행·선택 이슈 문맥 라인·지도-first·컴팩트 지도 시트·하단 근거 도구막대·검토 대기 영상 슬롯·지도 중심 데스크톱 레이아웃·dev config 회귀 방어·홈 compact 검토 행·홈 scanline·데스크톱 홈 지역 현황 지도·기본 홈 상세 닫힘·지도 선택 시트 경량화·지도 도구막대/탐색 타일 경량화·공식 fallback 이슈·지도 선택 현장 상세 동기화·모바일 5탭 overflow 방지·홈 주행동 단일화·`인증영상/현장촬영` 라벨 분리·`위치/현장/공식 자료/인원` scanline·지도 fallback 표면 개선·MapLibre layer 재동기화·현장 인증 Evidence 기반 지도 영역 분리·인증 영역 근접 줌·poster 없는 인증영상 검토 카드화·실제 공개 영상 player 계약·공개 media route/CSP 계약을 연결했다. 35차로 로컬/정적 공개 영상 경로는 검증됐지만, 실제 운영 GPS evidence, 실제 제보 영상 품질, 독립 재검증, 사용자 수락 전에는 S+가 아니다.
- Issue 기반 전국 묶기, 전국 동일 주제 집회 인지, 지역별 현장 신호, 알권리 중심 UX, 조작 방어, 현장 영상 Claim 피드, 알림·후원·신고 방어, 자동 규모 추정, 공개 검증 신호, 18개 권역 공개 일정 parser와 coverage report는 구현되어 A+ 이상 단계다.
- 운영 S+에는 실제 `pnpm storage:smoke` 실행, 실제 `pnpm redaction:smoke` 실행, 운영 DB, 실제 원천 수집 스케줄, 모바일 앱 무결성 provider dry-run이 남아 있다. Admin redaction bypass는 차단되어 공개본 URL과 redaction proof는 내부 redaction worker만 기록한다.

## Element Scorecard

| 요소 | 현재 등급 | S+ 기준 | 담당 트래커 | 다음 active goal |
|---|---:|---|---|---|
| 제품 목적·문구 | S+ | 알권리 중심이며 참여 독려, 전술, 결집 지시가 없다. | `docs/splus-ux-tracker.md` | 유지·회귀 방지 |
| Claim 중심 모델 | S+ | 발표·보도·제보·반론·신고·AI 추정이 모두 Claim이며 진실 객체로 승격되지 않는다. | `AGENTS.md` | 유지·회귀 방지 |
| Issue 기반 전국 묶기 | S+ | 목적이 같은 집회는 Issue로 묶고 지역·시간별 Occurrence는 분리 유지하며, 묶음 근거와 한계를 화면에 표시한다. | `docs/national-issue-splus-tracker.md` | 유지·회귀 방지 |
| 공개 원천 커버리지 | S+ | 전국 지역 차별 없이 공개 자료 상태, 갱신 주기, 다음 점검, 공백 사유가 coverage report로 추적된다. | `docs/data-fixtures-and-real-sources.md` | 유지·운영 실패 알림은 배포 준비에서 추적 |
| 법안·개정안 연결 | A+ | 법 관련 이슈가 공개 입법 정보와 연결되고 관심도 기준으로 탐색된다. | `docs/data-fixtures-and-real-sources.md` | 실제 API 키로 dry-run/post 검증 |
| 본인확인 기반 쓰기 경계 | A+ | 공개 읽기는 로그인 없이 가능하고, 제보·현장 판단·반론·정정·권리침해 신고·알림 설정은 본인확인 완료 세션만 허용한다. | `docs/launch-readiness-checklist.md` | 실제 포트원 채널로 인증 리허설 |
| 실시간 현장 인증 | A+ | GPS, 앱 내 촬영, 서버 해시, 업로드 시간, 거리 검증, 비식별 공개본이 한 흐름으로 닫힌다. | `docs/splus-ux-tracker.md` | 실제 모바일 attestation provider·외부 저장소·redaction smoke 실행 |
| 현장 영상 Claim | S+ | 이슈별 릴스형 확인, 지역/판단 필터, 현장 판단 Claim, 원본 비공개, 공개본 노출이 가능하다. | `docs/national-issue-splus-tracker.md` | 운영 저장소·redaction smoke 검증은 개인정보/운영 항목에서 추적 |
| 전국 동시다발 인지 | S+ | 지역별 첫 확인, 현장 영상, 공식 자료, 반론이 시간축과 필터로 읽힌다. | `docs/national-issue-splus-tracker.md` | 유지·운영 스트림 연결은 배포 단계 |
| 규모 실시간 추정 | A+ | 공개 가능한 현장 영상 근거가 현재 존재할 때만 범위, 신뢰도, 산출 방식, 근거 수, 독립 시점 수, 한계가 표시되고 추정 자체도 AI Claim 메타를 가진다. | `docs/national-issue-splus-tracker.md` | 운영 영상 분석·실제 모바일 attestation 연결 |
| 조작 방어 | S+ | 반복 영상, 낮은 GPS 품질, 원천 부재, 지역 과대표집, 사용자/기기 군집이 자동 삭제가 아닌 검토 신호로 표시된다. | `docs/national-issue-splus-tracker.md` | 유지·운영 실측 임계값 튜닝 |
| 개인정보·권리 보호 | A+ | 원본·정밀 위치 비공개, 비식별 공개본, 권리 검토 상태가 기본이다. | `docs/launch-readiness-checklist.md` | 외부 저장소·redaction smoke·purge 검증 |
| 알림·후원·신고 방어 | S+ | 의미 있는 상태 변화만 알림 대상이며 후원/신고 수가 랭킹·신뢰도·삭제에 영향 없다. | `AGENTS.md` | 유지·회귀 방지 |
| 지도·지역 UX | A+ 후보 | 지도는 보조 확인 수단이며 선택 결과가 카드·상세와 즉시 동기화된다. | `docs/splus-ux-tracker.md` | 실제 운영 GPS evidence, 사용자 수락, 지도 선택-상세 동기화 유지 |
| 데스크톱·모바일 디자인 | A 후보 | 1440px/390px에서 정보 위계, 타이포, 간격, 전환, 가로 넘침 안정성이 개선됐지만 상업용 S+ 수락 전이다. | `docs/commercial-splus-redesign.md` | 실제 제보 영상 품질, 사용자 수락 |
| 운영 배포 준비 | A- | Render 환경변수/Secret File, DB migration, 원천 수집, storage, 모니터링이 실제 연결된다. | `docs/launch-readiness-checklist.md` | 외부 입력값 수집 후 런타임 검증 |

## Element Execution Board

이 표가 현재 active goal의 관리 대장이다. 다음 작업은 `상태`가 `Active`인 항목을 먼저 처리하고, 같은 등급이면 사용자에게 보이는 정보 정확도와 운영 차단 위험이 큰 순서로 진행한다.

| 순서 | 요소 | 상태 | S+ 차단 요인 | 다음 active goal | S+ 판정 증거 |
|---:|---|---|---|---|---|
| 1 | 공개 원천 전국 균등성 | Guard | 현재 18/18 권역 일정 parser가 활성화됨. 새 원천 변경 시 parser가 깨질 수 있다. | 공식 URL·parser·coverage self-check를 유지하고, 운영 cron 실패 감지는 운영 배포 준비 항목에서 검증한다. | `pnpm --filter @musunil/public-source-ingest dev` dry-run `activeScheduleRegions=18`, `count=180` |
| 2 | 상업용 UI/UX 재설계 | Active | 35차로 실제 공개 clip route, video MIME, media CSP까지 검증되게 했다. 홈 CTA 단일화, `인증영상/현장촬영` 라벨 분리, 지도 표면 개선, 공식 자료 핀과 GPS 인증 영역 문구·줌 분리, 인증영상 검토 카드화, poster-only 회귀 차단, public media route 검증까지 1차 반영됐지만 실제 운영 GPS evidence, 실제 제보 영상 품질, 독립 재검증, 사용자 수락은 남아 있다. | 실제 공개 영상 파일이 붙은 운영형 캡처와 실제 GPS evidence가 붙은 지도 영역을 재검증한다. | `docs/commercial-splus-redesign.md`, 33차 reels 캡처, 32차 map 캡처, web smoke, 사용자 수락 |
| 3 | 운영형 현장 인증 | Active | 내부 기기 무결성 기록 경로, 내부 verifier provider/proof hash 감사 기록, 내부 redaction worker 기록 경로, redaction proof hash 필수화, admin redaction bypass 차단, publish 전 trusted device integrity 강제, 현장 판단 Claim verifier 전 held_private 강제, 서버 기준 upload time PoP 강제, S3-compatible encrypted storage adapter, storage PUT/DELETE smoke 명령, redaction smoke 명령, production 메모리 저장 차단, 공개 입력 self-declared pass 차단, Proof-of-Presence in-app camera·최소 5초 강제, Android service account JSON 구조 launch guard는 있으나 실제 storage credential smoke, 실제 redaction smoke, 실제 모바일 attestation provider 호출은 운영 환경 검증 전이다. | storage adapter, redaction smoke, mobile integrity verifier를 운영 설정으로 end-to-end 검증한다. | 업로드→검토→비식별 공개본→공개 live-claims까지 runtime smoke 통과 |
| 4 | 운영 배포 준비 | Active | Render 환경변수/Secret File, 운영 DB, cron, 모니터링은 사용자 입력값 투입 전이다. LIVE 자동 공개 오설정, production storage 누락, production 법 공개 원천 키 누락, production 모바일 무결성 누락은 launch validation으로 차단되고, runtime not-ready 상태의 production write는 503으로 차단된다. | 사용자 입력 YAML과 Render secrets를 기준으로 dry-run 없이 실제 런타임 부팅·migration·health check를 통과시킨다. | `pnpm check:release`, 운영 health/runtime smoke, launch checklist 완료 |
| 5 | 법안·개정안 연결 | Active | mock parser와 API 계약, production 키 누락 launch guard, production preview 법 데이터 비노출 가드, credential 존재 시 0건 dry-run 실패 가드는 있으나 실제 국회/법령 키 dry-run은 남아 있다. | 실제 공개 API 키 입력 후 법안/법령 ingest dry-run과 post 검증을 끝낸다. | `pnpm sources:laws` 1건 이상, `/laws`, `/laws/:id`, runtime smoke 통과 |
| 6 | 본인확인 기반 쓰기 경계 | Active | API에는 PortOne identity start/complete, verified session, `identity_required` write boundary, Web 인증 시트, launch validation이 들어갔다. 실제 포트원 채널 키와 운영 SDK 리허설은 외부 연결 전이다. | 실제 포트원 본인확인 채널로 인증 완료 리허설을 통과시키고 service-watch에 증거를 남긴다. | API self-check, runtime smoke `identity_required`, Web smoke identity sheet |
| 7 | 규모 실시간 추정 | Active | UI와 보수 추정, GPS 품질, 기기 무결성 unknown, 중복 해시 기반 confidence 보정은 있으나 운영 영상 분석과 실제 모바일 attestation 연결 전이다. | 운영 영상 분석과 실제 모바일 attestation 결과를 추정 confidence에 연결한다. | API self-check, issue detail capture, risk dashboard 값 일관성 |
| 8 | 개인정보·권리 보호 | Active | 내부 dashboard, 공개 반경 노출, production 원본 메모리 보관 차단, 원본 storage 암호화, purge 전 외부 storage delete 가드는 있으나 실제 storage 권한·redaction smoke·삭제 요청 처리 검증 전이다. | 원본 접근 통제, 정밀 위치 비공개, 권리 검토, purge를 운영 저장소 기준으로 검증한다. | privacy dashboard, 공개 payload private field 부재, purge self-check |
| 9 | 제품 목적·문구 | Guard | 현재 S+. 새 화면에서 참여 독려·결집·전술성 문구가 재등장할 수 있다. | 문구 회귀 방지 smoke를 유지하고 신규 화면은 알권리 중심 copy review를 통과시킨다. | web smoke 금지어/목적 문구 검증 |
| 10 | Claim 중심 모델 | Guard | 현재 S+. 새 데이터 모델이 Event를 진실 객체처럼 쓰면 구조가 깨진다. | 모든 ingestion/output이 Claim, Evidence, Occurrence, Issue 분리를 유지하게 schema self-check를 확대한다. | schema/API self-check |
| 11 | Issue 기반 전국 묶기 | Guard | 현재 S+. 새 원천 유입 시 주제 정규화 품질이 흔들릴 수 있다. | topicTitle/topicTags/groupingReason 회귀 테스트를 유지한다. | issue detail self-check, browser capture |
| 12 | 현장 영상 Claim | Guard | 현재 S+. 공개본만 보여야 하며 원본·정밀 위치가 새 경로로 새면 안 된다. | 공개 live-claims payload와 UI 필터 회귀 테스트를 유지한다. | API self-check, web smoke |
| 13 | 전국 동시다발 인지 | Guard | 현재 S+. 자료 종류/지역 필터가 새 데이터에서도 작동해야 한다. | nationalTimeline 필터와 지역별 첫 확인 표시 회귀 테스트를 유지한다. | browser capture, web smoke |
| 14 | 조작 방어 | Guard | 현재 S+. 방어 신호가 자동 삭제나 노출 억압으로 오용되면 안 된다. | risk level과 review priority만 바뀌는지 검증한다. | risk dashboard, 신고 자동삭제 금지 self-check |
| 15 | 알림·후원·신고 방어 | Guard | 현재 S+. 새 endpoint가 순위·신뢰도·삭제에 영향을 주면 안 된다. | 댓글·투표·후원 endpoint 부재와 의미 있는 상태 변화 알림만 유지한다. | runtime smoke, schema self-check |
| 16 | 지도·지역 UX | Active | 지도 탭과 데스크톱 홈 모두 지도 맥락이 올라왔고, 31차로 fallback 지도 표면이 실제 지도 톤으로 정리됐으며 32차로 공식 자료 핀과 GPS 인증 영역 생성 조건·근접 줌을 분리했다. 390px 공식 핀은 영역 없음 문구, 서울 검색은 인증 영역 문구와 `detailOpen=false`, `mapVisible=true`, `navOverlap=false`를 확인했다. | 실제 GPS evidence가 있는 운영 데이터에서 현장 인증 영역의 가시성과 핀-영역 연결을 390/430/768/1440px에서 재검증한다. | 31~32차 map screenshots, `overflowX=false`, `navOverlap=false`, forbidden 0, 사용자 수락 |
| 17 | 데스크톱·모바일 디자인 | Active | 문맥 라인, 릴스 겹침, 어두운 영상 poster, 데스크톱 제보 빈 공간, 지도-first, 영상 소셜 레일, 샘플 poster 표시, 홈 대형 검토 썸네일, scanline 혼선, 데스크톱 홈 빈 공간, 패널 경쟁, 지도 시트 과밀, 지도 도구 밀도, 모바일 5탭 overflow, CTA 분산, 영상/촬영 라벨 혼선, 지도 fallback placeholder감, 지도 영역 오해 가능성, 인증영상 빈 시작 상태, 풀스크린 poster-only 회귀, 공개 영상 route/MIME/CSP는 1차 개선됐지만 사용자 수락 전이다. | 실제 공개 영상 표면을 운영형 데이터로 캡처해 상업용 앱처럼 읽히는지 재평가한다. | `docs/commercial-splus-redesign.md`, 33차 reels screenshots, web smoke video/media branch, 사용자 수락 |

## Sequential Active Goals

1. 전국 이슈 인지 S+ - 완료  
   같은 주제의 복수 지역 집회를 한 Issue에서 파악하고, 각 지역 Occurrence는 분리해 유지한다.  
   완료됨: API self-check와 웹 smoke에서 `topicGrouping`, 전국 현황, 지역별 신호, 지역·시간별 별도 현장 원칙이 검증된다.  
   유지 조건: 새 ingestion 경로도 `topicTitle`/`topicTags`를 같은 구조로 정규화해야 한다.

2. 규모 추정 S+  
   현장 영상 Claim과 공개 근거에서 보수적 CrowdEstimate를 자동 산출하고, 한계와 신뢰도를 숫자 옆에 표시한다.  
   완료 조건: public response에 generated estimate가 있고, UI에 `자동 갱신 추정`, 범위, 한계가 함께 보인다.

3. 검증·조작 방어 S+ - 완료  
   낮은 GPS 품질, 반복 해시, 공식 원천 부재, 지역 과대표집을 자동 삭제가 아닌 검토 우선순위 신호로 표시한다.  
   완료됨: public response와 내부 risk dashboard에 검증 신호가 나오고, user/device 군집도 원문 식별자 없이 검토 우선순위로만 표시된다.

4. 동시다발 타임라인 S+ - 완료  
   지역별 첫 확인, 현장 영상, 공식 자료, 반론·정정을 시간순으로 보여 사용자가 동시 발생과 순차 확산을 구분한다.  
   완료됨: 이슈 상세에 전국 시간축, 자료 종류 필터, 지역 필터가 있고 데스크톱/모바일 브라우저 검증에서 `overflowX=false`다.

5. 현장 영상 Claim 피드 S+ - 완료  
   같은 Issue에 연결된 현장 영상 Claim을 이슈 영상 탭에서 지역/판단 상태별로 확인한다.  
   완료됨: `/targets/issue/:id/live-claims` public response와 웹 지역/판단 필터가 self-check, web-smoke로 검증된다.

6. 알림·후원·신고 방어 S+ - 완료  
   자유 댓글, 추천/비추천, 찬반투표, 후원 기반 노출, 신고 수 자동 삭제가 생기지 않도록 막는다.  
   완료됨: schema self-check가 비상태 변화 알림 트리거를 차단하고, API/runtime smoke가 댓글·투표·후원 엔드포인트 부재와 신고 자동삭제 금지를 검증한다.

7. 법안·개정안 연결 S+ - 진행 중  
   법 관련 집회 주제가 국회 의안·현행 법령 공개 메타데이터와 연결되고 관심도순으로 탐색된다.  
   완료됨: 국회 의안/국가법령 API 응답 파서 mock self-check, `/laws` 목록/상세 runtime smoke, `/internal/ingest/laws` API self-check, production 법 공개 원천 키 누락 launch validation, credential 존재 시 0건 dry-run 실패 가드가 있다.  
   남은 조건: 실제 `national_assembly_bill_api_key` 또는 `law_go_kr_oc` 입력 후 `pnpm sources:laws` dry-run/post가 운영 API에 성공해야 한다.

8. 운영형 현장 인증 S+  
   외부 오브젝트 스토리지, 비식별 공개본, 원본 접근 통제, 모바일 기기 무결성이 실제 환경에서 검증된다.  
   완료됨: LIVE 업로드는 서버가 private storage key와 SHA-256 hash를 만들고, Proof-of-Presence 통과 후에도 `held_private`로 검수 대기한다. Admin publish는 redaction worker 완료 전 `live_redaction_required`로 실패하고, Admin이 `redactedClipUrl`을 직접 기록하려 하면 `redaction_worker_required`로 실패한다. Redaction worker는 공개본 URL과 redaction proof hash를 함께 남겨야 하며, proof hash 또는 유효한 공개 URL 없는 completed 상태는 공개 live evidence로 인정하지 않는다. Production launch는 Play Integrity 또는 App Attest 설정 없이는 실패한다. Production API는 S3-compatible storage adapter 없이 원본 영상을 메모리에 보관하지 않고 `live_storage_unavailable`로 실패하며, adapter PUT 바이트는 `media_encryption_key`로 AES-GCM 암호화된다. `redaction.engine_smoke_command`는 production에서 필수이고 `{input}`, `{output}`을 포함해야 한다.  
   완료 조건: 운영 설정으로 업로드·검토·공개본 노출·삭제 요청 처리가 끝까지 돈다.

9. 공개 원천 전국 균등성 S+ - 완료  
   특정 지역만 풍부해지지 않도록 전국 원천 상태와 실패를 리포트하고, 원천 부재도 명시한다.  
   완료됨: coverage report가 18개 권역별 상태, 갱신 주기, 다음 점검, 공백 사유를 포함하고 웹 보조 패널과 runtime smoke에서 검증된다.  
   완료됨: 서울, 부산, 대구, 인천, 광주, 대전, 울산, 세종, 경기남부, 경기북부, 강원, 충북, 충남, 전북, 전남, 경북, 경남, 제주 공식 일정 parser가 dry-run에서 실제 공개 HTML/JSON을 읽어 0건 실패 없이 payload를 만든다.  
   유지 조건: 운영 cron 실패 알림은 운영 배포 준비 항목에서 검증한다.

10. 운영 배포 S+  
   사용자가 마지막에 입력해야 할 값만 넣으면 Render 배포, DB migration, runtime smoke, web smoke가 통과한다.  
   완료 조건: `pnpm check:release`와 런타임 설정 검증이 통과하고 누락 입력값이 문서화된다.

## Evidence Gates

| 증거 | S+ 판정 방식 |
|---|---|
| 문서 | 각 변경 뒤 이 문서와 하위 트래커의 등급·남은 위험을 갱신한다. |
| API self-check | Claim/Evidence/Issue/Occurrence/CrowdEstimate/verification signal 계약을 검증한다. |
| API self-check | CrowdEstimate는 public response에서 `musunil_ai_estimate` Claim 메타, evidence strength, risk level을 함께 노출한다. |
| API self-check | CrowdEstimate `independentViewpointCount`는 지역 수가 아니라 publishable live evidence의 geoCell/evidence id 기준으로 산정된다. |
| API self-check | 공개 일정·자료 Claim만 있는 이슈는 자동 규모 숫자를 만들지 않고 `crowdEstimates`를 비워 둔다. |
| API self-check | 저장된 CrowdEstimate도 현재 공개 가능한 현장 영상 근거가 사라지면 공개 응답에서 제외된다. |
| API self-check | 신고가 자동 삭제를 만들지 않고 댓글·투표·후원 엔드포인트가 상태를 바꾸지 않음을 검증한다. |
| Web smoke | 운영 화면 문구, S+ 요구사항 원문 노출 금지, 핵심 UI 문자열을 검증한다. |
| Runtime smoke | 댓글·투표·후원 엔드포인트가 배포 런타임에도 존재하지 않음을 검증한다. |
| Runtime smoke | `/laws` 목록과 `/laws/:id` 상세가 법안/법령 연결 계약을 유지하고, production seed가 preview 법령을 노출하지 않음을 검증한다. |
| Runtime smoke | 공개 live-claims 응답에 `publicRadiusM`이 있고 private key/raw GPS/media fields가 없는지 검증한다. |
| Runtime smoke | 내부 인증된 device integrity verifier만 provider와 attestation proof hash를 포함해 Evidence의 deviceIntegrityStatus를 기록할 수 있고, pass/proof 전 LIVE 공개 전환이 실패함을 검증한다. |
| API self-check | LIVE 제보와 현장 판단 Proof-of-Presence는 클라이언트가 보낸 `uploadedAt`이 아니라 서버가 기록한 업로드/요청 시각으로 5분 제한을 판정한다. |
| API self-check | 현장 판단 Claim은 최초 `held_private`로만 접수되고 sensor evidence의 trusted device integrity pass/proof 전에는 공개 summary와 이견 수에 반영되지 않는다. |
| Runtime smoke | 내부 인증된 redaction worker만 LIVE Evidence의 비식별 공개본 URL을 기록할 수 있음을 검증한다. |
| API self-check | Admin claim review가 `redactedClipUrl`로 공개본 URL을 직접 기록하려 하면 `redaction_worker_required`로 실패하고 Evidence redaction 상태가 변하지 않음을 검증한다. |
| API/runtime self-check | Redaction worker가 proof 없이 공개본 URL만 기록하려 하면 `redaction_proof_required`로 실패하고, 공개 live evidence는 redaction proof hash와 유효한 공개 URL이 있어야 인정된다. |
| Launch validation | production에서 LIVE 자동 공개, mock 지도, preview/mock 데이터, placeholder secret, localhost origin을 차단한다. |
| Launch validation | production에서 LIVE 미디어용 external storage provider와 media encryption key 누락을 차단한다. |
| Launch validation | production 법 관련 탭은 `national_assembly_bill_api_key` 또는 `law_go_kr_oc` 중 하나가 없으면 차단한다. |
| Launch validation | production LIVE 현장 인증은 Android Play Integrity 또는 iOS App Attest 설정과 앱 식별자가 없으면 차단한다. |
| Launch validation | Android Play Integrity는 base64 Google service account JSON 구조가 맞지 않거나 iOS App Attest team id가 없으면 production launch를 차단한다. |
| Runtime smoke | production runtime이 not-ready이면 모든 write request가 `runtime_not_ready`로 fail-closed 되는지 검증한다. |
| API self-check | LIVE 공개본 URL은 HTTPS 또는 `/media/redacted/`만 허용하고 private/http 경로는 거부한다. |
| API self-check | production 외부 storage 필수 모드에서 adapter가 없으면 LIVE 업로드가 실패하고, adapter가 있으면 원본 base64를 Store에 남기지 않으며 PUT 바이트는 AES-GCM 암호화된다. |
| API self-check | privacy purge는 외부 원본 media delete가 실패하면 DB storageKey를 지우지 않고 `privacy_purge_storage_unavailable`로 실패한다. |
| Manual smoke | 실제 storage credential 입력 후 `pnpm storage:smoke`가 S3-compatible bucket에 PUT 후 DELETE를 성공해야 한다. |
| Manual smoke | 실제 비식별 엔진 command 입력 후 `pnpm redaction:smoke`가 출력 파일과 redaction proof hash를 만들어야 한다. |
| Schema/API self-check | Proof-of-Presence는 LIVE media에서 `in_app_camera`와 최소 5초 영상을 요구하고, 기기 무결성 신호를 분리하며, 공개 API의 self-declared pass는 `unknown`으로 낮춰 저장한다. |
| API self-check | CrowdEstimate confidence가 live count/지역 수뿐 아니라 GPS 품질, 기기 무결성 unknown/fail, 중복 해시 품질 신호를 반영한다. |
| API self-check | LIVE Claim 공개 응답은 정밀 GPS 값 대신 `publicRadiusM`만 노출하고 private key/raw field를 숨긴다. |
| Browser capture | 데스크톱 1440px, 모바일 390px에서 가로 넘침과 핵심 정보 노출을 확인한다. |
| Release check | typecheck, test, launch sample, runtime config, runtime smoke, web smoke를 모두 통과한다. |
| S+ tracker check | Element Execution Board가 Active/Guard 상태, 차단 요인, 다음 active goal, 판정 증거를 유지하고 전체 S+ 완료를 조기 선언하지 않는지 검증한다. |
| Completion audit | `docs/splus-completion-audit.md`가 완료 아님 상태, 요구사항별 판정, 실제 외부 증거 요구 조건을 유지한다. |

## Current Visual Evidence

| 화면 | 파일 | 확인 |
|---|---|---|
| 모바일 이슈 상세 상단 | `docs/national-issue-verification-mobile-2026-07-10-0027.png` | 390x844, 전국 현황·규모 추정·추정 한계 노출, `overflowX=false` |
| 모바일 이슈 상세 검증 신호 | `docs/national-issue-verification-mobile-signals-2026-07-10-0027.png` | 390x844, 지역별 현장 신호·자동 갱신 추정·검증 신호 노출, `overflowX=false` |
| 모바일 이슈 흐름 | `docs/national-issue-timeline-mobile-2026-07-10-0035.png` | 390x844, 전국 시간축·순차/동시 라벨·Claim 메타 노출, `overflowX=false` |
| 모바일 지역별 규모 추정 | `docs/national-issue-regional-estimate-mobile-2026-07-10-0046.png` | 390x844, 이슈 전체 추정·지역별 규모 추정·추정 한계 노출, `overflowX=false` |
| 모바일 타임라인 필터 | `docs/national-issue-timeline-filter-mobile-2026-07-10-0056.png` | 390x844, 흐름 탭·자료 필터·지역 필터·서울 필터 선택, `overflowX=false` |
| 데스크톱 타임라인 필터 | `docs/national-issue-timeline-filter-desktop-2026-07-10-0056.png` | 1440x900, 3열 레이아웃에서 전국 시간축·자료/지역 필터 노출, `overflowX=false` |
| 20차 모바일 현장 영상 | `docs/commercial-splus-surface20-reels-mobile-390-2026-07-11.png` | 390x844, 영상 액션이 하단 근거 도구막대로 보이고 하단 내비와 겹치지 않음, `overflowX=false` |
| 20차 모바일 지도 | `docs/commercial-splus-surface20-map-mobile-390-2026-07-11.png` | 390x844, map top 215px/height 460px, 지도 시트 height 223px, summary rows 2, `overflowX=false` |
| 20차 데스크톱 지도 | `docs/commercial-splus-surface20-map-desktop-1440-2026-07-11.png` | 1440x960, map top 211px/height 700px, 지도 시트 height 178px, summary rows 2, `overflowX=false` |
| 20차 데스크톱 현장 영상 | `docs/commercial-splus-surface20-reels-desktop-1440-2026-07-11.png` | 1440x960, 영상 오버레이와 하단 근거 도구막대 분리, 금지 문구 0, `overflowX=false` |
| 21차 모바일 현장 영상 | `docs/commercial-splus-surface21-reels-mobile-390-2026-07-11.png` | 390x844, 샘플 poster 이미지 0개, 검토 대기 슬롯 3개, badge `검토 대기`, 금지 문구 0, `overflowX=false` |
| 21차 데스크톱 지도 | `docs/commercial-splus-surface21-map-desktop-1440-2026-07-11.png` | 1440x960, 우측 상세 패널 display none, map width 1200px, viewport share 83%, 금지 문구 0, `overflowX=false` |
| 22차 모바일 홈 | `docs/commercial-splus-surface22-home-mobile-390-2026-07-11.png` | 390x844, 로컬 API 데이터 기반 이슈 2개 표시, 큰 검토 썸네일 0, review row 46px, first card 241px, media preview 0, 금지 문구 0, `overflowX=false` |
| 22차 데스크톱 홈 | `docs/commercial-splus-surface22-home-desktop-1440-2026-07-11.png` | 1440x1040, 홈 검토 영상 표면 compact 상태 행, first card 281px, review row 46px, media preview 0, 금지 문구 0, `overflowX=false` |
| 23차 모바일 홈 | `docs/commercial-splus-surface23-home-mobile-390-2026-07-11.png` | 390x844, scanline clipped false, first card 220px, `영상 근거 0건`/내부 문구 0, 금지 문구 0, `overflowX=false` |
| 23차 데스크톱 홈 | `docs/commercial-splus-surface23-home-desktop-1440-2026-07-11.png` | 1440x1040, scanline clipped false, first card 260px, media preview 0, 금지 문구 0, `overflowX=false` |
| 31차 모바일 지도 | `docs/commercial-splus-surface31-map-fallback-mobile-390-2026-07-11.png` | 390x844, 지도 표면 개선, `mapRect=370x460`, sheet 114px, `navOverlap=false`, 금지 문구 0, `overflowX=false` |
| 31차 데스크톱 지도 | `docs/commercial-splus-surface31-map-fallback-desktop-1440-2026-07-11.png` | 1440x960, 지도 표면 개선, `mapRect=1200x700`, sheet 62px, 금지 문구 0, `overflowX=false` |
| 32차 공식 자료 핀 | `docs/commercial-splus-surface32-map-official-pin-mobile-390-2026-07-11.png` | 390x844, 공식 자료 위치만 있는 현장에는 현장 인증 영역을 만들지 않음. `detailOpen=false`, proof `현장 인증 영역은 아직 없습니다`, `scrollWidth=390`, 금지 문구 0 |
| 32차 GPS 인증 영역 | `docs/commercial-splus-surface32-map-gps-area-mobile-390-2026-07-11.png` | 390x844, 공개 가능한 현장 인증 영상 Evidence가 있는 현장은 근접 줌 인증 영역 문구 표시. 검색 후 지도 맥락 유지 `detailOpen=false`, `mapVisible=true`, `navOverlap=false` |
| 33차 모바일 인증영상 검토 카드 | `docs/commercial-splus-surface33-reels-mobile-390-2026-07-11.png` | 390x844, poster 없는 LIVE Claim을 검토 카드로 표시. `panel.bottom=715`, 하단 내비 top 772, `navOverlap=false`, `posterImages=0`, `reviewSlots=0`, 금지 문구 0 |
| 33차 데스크톱 인증영상 검토 카드 | `docs/commercial-splus-surface33-reels-desktop-1440-2026-07-11.png` | 1440x1100, 검토 카드와 우측 맥락 패널 유지. `panel=760x620`, 액션 `근거/위치/이슈`, `overflowX=false`, 금지 문구 0 |
| 34차 공개 영상 player 계약 | `pnpm check:web-smoke` | 풀스크린 인증영상 branch가 display-safe 공개 clip+poster를 `<video class="reel-video">`로 렌더하고, `controlslist="nodownload noplaybackrate"`와 poster-only 회귀 금지를 검증 |
| 35차 공개 영상 route 계약 | `pnpm check:web-smoke` | `/media/redacted/preview-occ-live-1.webm`이 정적 서버에서 200 `video/webm`으로 열리고, payload > 5KB, CSP `media-src`를 검증 |

## Update Rule

- 새 작업은 이 문서의 Sequential Active Goals 순서로 진행한다.
- 실제 우선순위는 Element Execution Board의 `Active` 항목 중 사용자 정보 정확도와 운영 차단 위험이 큰 순서로 결정한다.
- 항목이 S+가 아니면 `현재 등급`, `S+ 기준`, `다음 active goal`을 구체적으로 남긴다.
- S+ 승급은 테스트, 화면 캡처, 공개 payload 검증 중 하나 이상이 있어야 한다.
- 앱 화면에는 이 문서의 요구사항 문구를 그대로 노출하지 않는다.

## Improvement Log

| 시간 | 항목 | 변경 | 판정 |
|---|---|---|---|
| 2026-07-10 00:27 KST | 전체 관리 | 전체 S+ 목표, 항목별 등급, 순차 active goal, 증거 게이트를 상위 트래커로 통합했다. | A+ 관리 체계 수립 |
| 2026-07-10 00:29 KST | 화면 증거 | 390px 모바일 이슈 상세에서 전국 현황, 자동 갱신 추정, 추정 한계, 검증 신호, 동원성 문구 없음, 가로 넘침 없음이 확인됐다. | A+ 유지 · S+ 증거 보강 |
| 2026-07-10 00:31 KST | 릴리즈 게이트 | `pnpm check:release`로 typecheck, test, launch sample, runtime config, runtime smoke, web smoke를 통과했다. | A+ 유지 · 회귀 없음 |
| 2026-07-10 00:35 KST | 동시다발 타임라인 | `/issues/:id`에 `nationalTimeline`을 추가하고, 웹 `흐름` 탭에서 전국 시간축·동시/순차 라벨·Claim별 출처/근거/위험 라벨을 표시하게 했다. | 전국 동시다발 인지 A → A+ |
| 2026-07-10 00:37 KST | 릴리즈 게이트 | `pnpm check:release` 재통과로 nationalTimeline 변경 뒤 typecheck, test, launch sample, runtime config, runtime smoke, web smoke가 유지됨을 확인했다. | A+ 유지 · 회귀 없음 |
| 2026-07-10 00:39 KST | 조작 방어 | 내부 인증이 필요한 `/admin/risk-dashboard`와 `pnpm admin:risk`를 추가했다. 반복 영상 해시, 낮은 GPS 품질, 비식별 대기, held/private Claim, 이슈별 검증 신호, 최근 감사 로그를 자동 삭제가 아닌 검토 우선순위로 표시한다. | 조작 방어 A → A+ |
| 2026-07-10 00:40 KST | 릴리즈 게이트 | `pnpm admin:risk -- --json` 실제 응답, `pnpm check:release` 통과, runtime smoke `admin_risk_dashboard` 통과를 확인했다. | A+ 유지 · 회귀 없음 |
| 2026-07-10 00:43 KST | 개인정보·권리 보호 | 내부 인증이 필요한 `/admin/privacy-dashboard`와 `pnpm admin:privacy`를 추가했다. 원본 영상 보유, 정밀 위치 필드, 비식별 대기, 권리 검토 Claim, purge 대상 수를 값 노출 없이 집계하고, purge가 오래된 live upload buffer도 삭제함을 self-check로 검증했다. | 개인정보·권리 보호 A → A+ |
| 2026-07-10 00:44 KST | 릴리즈 게이트 | `pnpm admin:privacy -- --json` 실제 응답, `pnpm check:release` 통과, runtime smoke `admin_privacy_dashboard` 통과를 확인했다. | A+ 유지 · 회귀 없음 |
| 2026-07-10 00:46 KST | 규모 실시간 추정 | `/issues/:id`에 `regionalCrowdEstimates`를 추가하고, 웹 규모 추정 패널에 지역별 범위·신뢰도·근거 수를 표시했다. | 규모 실시간 추정 A → A+ |
| 2026-07-10 00:48 KST | 화면·릴리즈 게이트 | `pnpm check:release` 통과 후 390px 모바일에서 지역별 규모 추정, 자동 갱신 추정, 추정 한계, `overflowX=false`를 확인했다. | A+ 유지 · 회귀 없음 |
| 2026-07-10 00:50 KST | 공개 원천 커버리지 | `/public-sources/coverage`와 `pnpm sources:coverage`가 18개 권역별 상태, 갱신 주기, 다음 점검, 공백 사유, 후보/통계/확인중 카운트를 제공하게 했다. 웹 보조 패널도 미확인을 집회 부재로 오해하지 않게 표시한다. | 공개 원천 커버리지 A → A+ |
| 2026-07-10 00:56 KST | Issue 기반 전국 묶기 | `/issues/:id`에 `topicGrouping`을 추가하고, 웹 이슈 상세에 주제 묶음 근거·공통 주제어·권역/현장 수·지역/시간 분리 원칙을 표시했다. | Issue 기반 전국 묶기 A+ → S+ |
| 2026-07-10 01:00 KST | 전국 동시다발 인지 | 웹 이슈 상세 `흐름` 탭에 자료 종류 필터와 지역 필터를 추가했다. 390px 모바일과 1440px 데스크톱 브라우저 검증에서 필터 동작과 `overflowX=false`를 확인했다. | 전국 동시다발 인지 A+ → S+ |
| 2026-07-10 01:04 KST | 지역별 현장 신호 | `regionalSignals.statusLabels`와 웹 `지역별 현장 신호` 행에 공식 자료, 현장 Claim/영상, 이견, 더 확인 필요 상태를 직접 표시했다. | 지역별 현장 신호 완료 · 알권리 UX S+ |
| 2026-07-10 01:09 KST | 조작 방어 | 사용자 편중과 기기 attestation bucket 군집 신호를 공개 검증 신호와 내부 risk dashboard에 추가했다. 내부 응답은 raw userId/device attestation을 노출하지 않는다. | 조작 방어 A+ → S+ |
| 2026-07-10 01:14 KST | 현장 영상 Claim | 이슈 단위 live-claims API와 웹 영상 탭 지역/판단 필터를 추가했다. 사용자는 같은 이슈의 공개 현장 영상을 지역·현장명·현장 판단 상태와 함께 확인한다. | 현장 영상 Claim S → S+ |
| 2026-07-10 01:18 KST | 알림·후원·신고 방어 | `shouldNotify` 금지 트리거 검증을 확대하고, API/runtime smoke에 댓글·투표·후원 엔드포인트 부재, 자료 제보 단독 알림 금지, 반복 신고 자동삭제 금지 검사를 추가했다. | 알림·후원·신고 방어 S → S+ |
| 2026-07-10 01:20 KST | 법안·개정안 연결 | 국회 의안/국가법령 응답 파서 self-check와 `/laws` 목록/상세 runtime smoke를 추가했다. 실제 키 기반 dry-run/post만 남아 있다. | 법안·개정안 연결 A → A+ |
| 2026-07-10 01:24 KST | 공개 원천 커버리지 | 강원경찰청 `오늘의 주요집회` parser를 추가하고 공식 HTML dry-run에서 대구+강원 20건 payload, `activeScheduleRegions=2`, `candidateScheduleRegions=1`을 확인했다. | 공개 원천 커버리지 A+ 유지 · S+ 진행 |
| 2026-07-10 01:27 KST | 공개 원천 커버리지 | 부산경찰청 `오늘의 집회/시위` parser를 추가하고 공식 HTML dry-run에서 대구+강원+부산 30건 payload, `activeScheduleRegions=3`, `candidateScheduleRegions=0`을 확인했다. | 공개 원천 커버리지 A+ 유지 · S+ 진행 |
| 2026-07-10 01:33 KST | 공개 원천 커버리지 | 경기남부경찰청 `오늘의 주요집회` parser를 추가하고 공식 HTML dry-run에서 대구+강원+부산+경기남부 40건 payload, `activeScheduleRegions=4`, `needsDiscoveryRegions=12`를 확인했다. | 공개 원천 커버리지 A+ 유지 · S+ 진행 |
| 2026-07-10 01:37 KST | 공개 원천 커버리지 | 광주경찰청 `오늘의집회시위` parser를 추가하고 공식 HTML dry-run에서 대구+강원+부산+경기남부+광주 50건 payload, `activeScheduleRegions=5`, `needsDiscoveryRegions=11`을 확인했다. | 공개 원천 커버리지 A+ 유지 · S+ 진행 |
| 2026-07-10 01:41 KST | 공개 원천 커버리지 | 인천경찰청 `오늘의 집회/시위` parser를 추가하고 공식 HTML dry-run에서 대구+강원+부산+경기남부+광주+인천 60건 payload, `activeScheduleRegions=6`, `needsDiscoveryRegions=10`을 확인했다. | 공개 원천 커버리지 A+ 유지 · S+ 진행 |
| 2026-07-10 01:46 KST | 공개 원천 커버리지 | 경북경찰청 `오늘의 집회시위` parser를 추가하고 공식 HTML dry-run에서 대구+강원+부산+경기남부+광주+인천+경북 70건 payload, `activeScheduleRegions=7`, `needsDiscoveryRegions=9`를 확인했다. | 공개 원천 커버리지 A+ 유지 · S+ 진행 |
| 2026-07-10 01:49 KST | 전체 관리 | active goal을 Element Execution Board로 고정했다. S+ 미달 항목은 `Active`, 이미 S+인 항목은 `Guard`로 관리하고, active goal 완료 조건을 문서상 명확히 했다. | 전체 S+ 관리 체계 강화 |
| 2026-07-10 01:52 KST | 공개 원천 커버리지 | 경남경찰청 `오늘의 주요집회` parser를 추가했다. 공식 게시판 POST JSON dry-run에서 대구+강원+부산+경기남부+광주+인천+경북+경남 80건 payload, `activeScheduleRegions=8`, `needsDiscoveryRegions=8`을 확인했다. | 공개 원천 커버리지 A+ 유지 · S+ 진행 |
| 2026-07-10 01:56 KST | 공개 원천 커버리지 | 제주경찰청 `오늘의집회` parser를 추가했다. 공식 HTML dry-run에서 대구+강원+부산+경기남부+광주+인천+경북+경남+제주 90건 payload, `activeScheduleRegions=9`, `needsDiscoveryRegions=7`을 확인했다. | 공개 원천 커버리지 A+ 유지 · S+ 진행 |
| 2026-07-10 01:59 KST | 공개 원천 커버리지 | 충북경찰청 `오늘의 집회 시위` parser를 추가했다. 공식 HTML dry-run에서 대구+강원+부산+경기남부+광주+인천+경북+경남+제주+충북 100건 payload, `activeScheduleRegions=10`, `needsDiscoveryRegions=6`을 확인했다. | 공개 원천 커버리지 A+ 유지 · S+ 진행 |
| 2026-07-10 02:03 KST | 전체 관리·공개 원천 커버리지 | 전체 active goal 관리 원칙을 문서에 고정하고, 울산경찰청 `오늘의 집회` parser를 추가했다. 공식 모바일 목록 dry-run에서 110건 payload, `activeScheduleRegions=11`, `needsDiscoveryRegions=5`를 확인했고 제목 날짜 기반 Claim에는 `dateSource=title`을 남긴다. | 공개 원천 커버리지 A+ 유지 · S+ 진행 |
| 2026-07-10 02:10 KST | 공개 원천 커버리지 | 서울경찰청 교통정보센터 `집회·통제정보` 공식 JSON parser를 추가했다. 공식 POST JSON dry-run에서 120건 payload, `activeScheduleRegions=12`, `needsDiscoveryRegions=4`를 확인했다. | 공개 원천 커버리지 A+ 유지 · S+ 진행 |
| 2026-07-10 02:14 KST | 공개 원천 커버리지 | 세종경찰청 `오늘의 집회/시위` parser를 추가했다. 정적 HTML 목록의 게시물 단위 Claim을 만들고 날짜 범위 제목은 `endsAt`도 기록한다. | 공개 원천 커버리지 A+ 유지 · S+ 진행 |
| 2026-07-10 02:18 KST | 공개 원천 커버리지 | 경기북부경찰청 `오늘의 주요집회` parser를 추가했다. 통계 전용 권역에서 일정 활성 권역으로 승격했고 기간형 제목은 `endsAt`도 기록한다. | 공개 원천 커버리지 A+ 유지 · S+ 진행 |
| 2026-07-10 02:22 KST | 전체 active goal 관리 | active goal 범위를 전체 제품 요소 S+로 명시하고, 각 요소가 현재 등급·차단 요인·다음 active goal·판정 증거를 갖도록 Product-Wide S+ Contract를 추가했다. | 전체 S+ 관리 체계 고정 |
| 2026-07-10 02:32 KST | 공개 원천 커버리지 | 대전·충남·전북·전남 공식 일정 parser를 추가했다. 공식 HTML/검색 dry-run에서 18개 권역 180건 payload, `fullScheduleCoverage=true`, `activeScheduleRegions=18`, `needsDiscoveryRegions=0`을 확인했다. | 공개 원천 커버리지 S+ |
| 2026-07-10 02:34 KST | 릴리즈 게이트 | `pnpm check:release`가 통과했다. runtime smoke의 `public_source_coverage`도 18/18 전체 일정 coverage를 검증한다. | S+ 회귀 가드 반영 |
| 2026-07-10 02:36 KST | 운영형 현장 인증 | LIVE Claim 공개 전에 비식별 공개본을 강제했다. `/reports/live`는 자동 공개 설정과 무관하게 검수 대기 상태를 유지하고, admin publish는 redaction worker 완료 전 실패한다. | 실시간 현장 인증 A → A+ |
| 2026-07-10 02:39 KST | 운영 배포 준비 | production 설정에서 `moderation.auto_publish_low_risk_live_reports: true`이면 launch validation과 release sample이 실패하도록 추가했다. | 운영 배포 준비 B+ 유지 · 안전 가드 강화 |
| 2026-07-10 02:40 KST | 릴리즈 게이트 | `pnpm --filter @musunil/config test`, `pnpm check:launch-sample`, `pnpm check:release`가 통과했다. | 전체 active goal 관리 증거 갱신 |
| 2026-07-10 02:41 KST | 개인정보·현장 인증 | LIVE 공개본 URL 검증을 강화해 HTTPS CDN 또는 `/media/redacted/` 경로만 허용하고, `http` 및 private 경로는 admin publish 단계에서 거부한다. | 개인정보·권리 보호 A+ 유지 · 공개 경로 가드 강화 |
| 2026-07-10 02:42 KST | 릴리즈 게이트 | `pnpm --filter @musunil/api test`와 `pnpm check:release`가 통과했다. | 공개 미디어 경로 가드 회귀 없음 |
| 2026-07-10 02:43 KST | 조작 방어·현장 인증 | 공개 API가 보낸 `deviceIntegrityStatus: pass`를 서버 검증값으로 믿지 않고 `unknown`으로 저장하게 했다. Proof-of-Presence는 위치·시간·앱 내 촬영 기준과 기기 무결성 fail만 반영하고, unknown은 별도 검토 신호로 남긴다. | 실시간 현장 인증 A+ 유지 · 조작 방어 강화 |
| 2026-07-10 02:44 KST | 릴리즈 게이트 | `pnpm --filter @musunil/schemas test`, `pnpm --filter @musunil/api test`, `pnpm check:release`가 통과했다. | 기기 무결성 분리 회귀 없음 |
| 2026-07-10 02:47 KST | 규모 실시간 추정 | derived CrowdEstimate confidence가 중복 해시, 낮은 GPS 품질, 기기 무결성 unknown/fail이 있으면 한 단계 낮아지도록 했다. self-check는 같은 live count/지역 수 조건에서 pass는 medium, unknown은 low로 내려감을 검증한다. | 규모 실시간 추정 A+ 유지 · confidence 품질 보정 강화 |
| 2026-07-10 02:47 KST | 릴리즈 게이트 | `pnpm --filter @musunil/api test`와 `pnpm check:release`가 통과했다. | 규모 추정 confidence 보정 회귀 없음 |
| 2026-07-10 02:49 KST | 개인정보·권리 보호 | 서버 생성 LIVE Evidence에 공개 위치 반경 `publicRadiusM=200`을 부여하고, 공개 live-claims 응답은 이 반경만 노출하며 private key·GPS 정확도·원문은 숨기는 self-check를 추가했다. | 개인정보·권리 보호 A+ 유지 · 정밀 위치 공개 가드 강화 |
| 2026-07-10 02:50 KST | 릴리즈 게이트 | `pnpm --filter @musunil/api test`와 `pnpm check:release`가 통과했다. | 공개 위치 반경 가드 회귀 없음 |
| 2026-07-10 02:51 KST | 런타임 검증 | `public_live_claim_safety` runtime smoke를 추가했다. 배포 경계에서 live-claims 응답의 `publicRadiusM` 존재와 private key, raw GPS, media hash/base64 비노출을 검증한다. | 개인정보·현장 영상 Claim 회귀 가드 강화 |
| 2026-07-10 02:51 KST | 릴리즈 게이트 | `pnpm check:runtime-smoke`와 `pnpm check:release`가 통과했다. | live-claims runtime safety 회귀 없음 |
| 2026-07-10 02:53 KST | 운영형 현장 인증 | 내부 인증이 필요한 `/internal/evidence/:id/device-integrity`를 추가했다. 공개 사용자는 무결성 pass를 직접 확정할 수 없고, 신뢰된 verifier만 `pass/fail/unknown` 결과를 기록한다. | 실시간 현장 인증 A+ 유지 · 모바일 attestation 연결점 준비 |
| 2026-07-10 02:54 KST | 릴리즈 게이트 | `pnpm --filter @musunil/api test`, `pnpm check:runtime-smoke`, `pnpm check:release`가 통과했다. | device integrity verifier 연결점 회귀 없음 |
| 2026-07-10 02:56 KST | 운영형 현장 인증 | 내부 인증이 필요한 `/internal/evidence/:id/redaction`을 추가했다. redaction worker가 `/media/redacted/` 또는 HTTPS 공개본만 기록하고, admin publish는 이미 완료된 redaction 결과로 공개 전환할 수 있다. | 실시간 현장 인증 A+ 유지 · redaction worker 연결점 준비 |
| 2026-07-10 02:57 KST | 릴리즈 게이트 | `pnpm --filter @musunil/api test`, `pnpm check:runtime-smoke`, `pnpm check:release`가 통과했다. | redaction worker 연결점 회귀 없음 |
| 2026-07-10 03:01 KST | 운영 배포 준비 | production launch validation이 외부 storage provider와 `security.media_encryption_key` 누락을 차단하게 했다. launch input 템플릿과 샘플도 storage 필수값을 요구한다. | 운영 배포 준비 B+ → A- |
| 2026-07-10 03:01 KST | 릴리즈 게이트 | `pnpm --filter @musunil/config test`, `pnpm check:launch-sample`, `pnpm check:render-runtime-config`, `pnpm check:release`가 통과했다. | production storage launch guard 회귀 없음 |
| 2026-07-10 03:04 KST | 법안·개정안 연결 | production launch validation이 `national_assembly_bill_api_key` 또는 `law_go_kr_oc` 중 하나 없이는 법 관련 탭 운영 설정을 통과하지 못하게 했다. 사용자 입력 템플릿과 launch 샘플도 법 공개 원천 키를 요구한다. | 법 공개 원천 launch guard 반영 |
| 2026-07-10 03:06 KST | 릴리즈 게이트 | `pnpm --filter @musunil/config test`, `pnpm check:launch-sample`, `pnpm check:release`가 통과했다. runtime smoke는 `/laws`, 내부 device integrity, 내부 redaction worker, public source coverage, public live-claims safety를 포함한다. | 법 공개 원천 launch guard 회귀 없음 |
| 2026-07-10 03:08 KST | 운영형 현장 인증 | production launch validation이 Android Play Integrity 또는 iOS App Attest 중 하나와 해당 앱 식별자가 없으면 LIVE 현장 인증 운영 설정을 통과하지 못하게 했다. | 모바일 무결성 launch guard 반영 |
| 2026-07-10 03:09 KST | 릴리즈 게이트 | `pnpm --filter @musunil/config test`, `pnpm check:launch-sample`, `pnpm check:render-runtime-config`, `pnpm check:release`가 통과했다. | 모바일 무결성 launch guard 회귀 없음 |
| 2026-07-10 03:12 KST | 운영형 현장 인증·개인정보 | S3-compatible LIVE media storage adapter를 추가하고, production 외부 storage 필수 모드에서 adapter가 없으면 업로드를 실패시키며 adapter가 있으면 원본 base64를 Store에 남기지 않게 했다. | storage adapter 경계 구현 · 실제 credential dry-run 남음 |
| 2026-07-10 03:14 KST | 릴리즈 게이트 | `pnpm check:release`가 통과했다. typecheck, API self-check, launch sample, render runtime config, runtime smoke, web smoke를 모두 포함한다. | storage adapter 경계 회귀 없음 |
| 2026-07-10 03:16 KST | 개인정보·권리 보호 | LIVE media storage PUT 바이트를 `media_encryption_key` 기반 AES-GCM payload로 암호화하고, production 외부 storage 필수 모드에서 암호화 키가 없으면 업로드를 실패하게 했다. | 원본 storage 암호화 self-check 통과 |
| 2026-07-10 03:17 KST | 릴리즈 게이트 | `pnpm check:release`가 통과했다. typecheck, API self-check, launch sample, render runtime config, runtime smoke, web smoke를 모두 포함한다. | 원본 storage 암호화 회귀 없음 |
| 2026-07-10 03:20 KST | 운영형 현장 인증 | 내부 device integrity verifier 기록에 `provider`, `deviceIntegrityProofHash`, `checkedAt`을 요구하게 했다. 원문 attestation token은 저장·응답하지 않고 hash만 남긴다. | 모바일 attestation 감사 경계 강화 |
| 2026-07-10 03:21 KST | 릴리즈 게이트 | `pnpm check:release`가 통과했다. typecheck, API self-check, launch sample, render runtime config, runtime smoke, web smoke를 모두 포함한다. | 모바일 attestation 감사 경계 회귀 없음 |
| 2026-07-10 03:23 KST | 운영 배포 준비 | production runtime이 `/ready` 실패 상태이면 POST/PATCH write를 `runtime_not_ready` 503으로 차단하게 했다. Render runtime config smoke가 DB/Redis 누락 상태에서 `/session/anonymous` write 차단을 검증한다. | not-ready write fail-closed 반영 |
| 2026-07-10 03:24 KST | 릴리즈 게이트 | `pnpm check:release`가 통과했다. typecheck, API self-check, launch sample, render runtime config, runtime smoke, web smoke를 모두 포함한다. | not-ready write fail-closed 회귀 없음 |
| 2026-07-10 03:25 KST | 법안·개정안 연결 | production seed와 Render runtime config smoke에서 preview 법령/의안 데이터가 `/laws`에 노출되지 않음을 검증하게 했다. 실제 ingest 전 법 탭은 빈 목록이어야 한다. | production 법 preview 비노출 가드 |
| 2026-07-10 03:27 KST | 릴리즈 게이트 | `pnpm check:release`가 통과했다. typecheck, API self-check, launch sample, render runtime config, runtime smoke, web smoke를 모두 포함한다. | production 법 preview 비노출 회귀 없음 |
| 2026-07-10 03:29 KST | 개인정보·권리 보호 | S3-compatible storage adapter에 DELETE를 추가하고, privacy purge가 외부 원본 media delete 성공 후에만 DB storageKey/hash를 지우게 했다. 삭제 실패 시 storageKey를 보존하고 503을 반환한다. | purge 외부 원본 삭제 경계 구현 |
| 2026-07-10 03:30 KST | 릴리즈 게이트 | `pnpm check:release`가 통과했다. typecheck, API self-check, launch sample, render runtime config, runtime smoke, web smoke를 모두 포함한다. | purge 외부 원본 삭제 경계 회귀 없음 |
| 2026-07-10 03:33 KST | 운영형 현장 인증·개인정보 | Admin claim review가 `redactedClipUrl`을 직접 기록하지 못하게 막고, 공개본 URL 기록은 내부 redaction worker 경로로만 유지했다. admin 우회 시도는 `redaction_worker_required`로 실패하고 Evidence redaction 상태가 변하지 않는다. | worker-only redaction 경계 강화 |
| 2026-07-10 03:34 KST | 릴리즈 게이트 | `pnpm --filter @musunil/api test`, `pnpm check:launch-sample`, `pnpm check:release`가 통과했다. launch-check도 admin redaction bypass 회귀를 차단한다. | worker-only redaction 회귀 없음 |
| 2026-07-10 03:37 KST | 운영형 현장 인증·개인정보 | Redaction worker가 `redactionProofToken` 또는 `redactionProofHash`를 남겨야 공개본 기록이 완료되도록 했다. proof 없는 redaction은 실패하고, proof hash 없는 completed LIVE Evidence는 공개 현장 영상과 규모 추정에 쓰이지 않는다. | redaction proof 경계 구현 |
| 2026-07-10 03:38 KST | 릴리즈 게이트 | `pnpm check:release`가 통과했다. typecheck, API/schema self-check, migration check, launch sample, render runtime config, runtime smoke, web smoke를 모두 포함한다. | redaction proof 회귀 없음 |
| 2026-07-10 03:39 KST | 운영형 현장 인증·개인정보 | Public LIVE Evidence 완료 판정에 유효한 공개 미디어 URL을 추가했다. proof hash가 있어도 공개 URL이 없으면 live-claims와 규모 추정에 쓰이지 않는다. | 공개본 URL 경계 구현 |
| 2026-07-10 03:40 KST | 릴리즈 게이트 | `pnpm check:release`가 통과했다. typecheck, API self-check, migration check, runtime smoke, web smoke를 모두 포함한다. | 공개본 URL 경계 회귀 없음 |
| 2026-07-10 03:42 KST | 운영 배포 준비·storage | API 서버의 S3-compatible adapter를 공유 모듈로 분리하고 `pnpm storage:smoke`를 추가했다. 실제 credential 입력 후 같은 adapter로 PUT/DELETE dry-run을 검증할 수 있다. | storage dry-run 명령 준비 |
| 2026-07-10 03:44 KST | 릴리즈 게이트 | `pnpm --filter @musunil/api test`, `pnpm --filter @musunil/api typecheck`, `pnpm check:launch-sample`, `pnpm check:release`가 통과했다. | storage smoke 명령 회귀 없음 |
| 2026-07-10 03:46 KST | 운영형 현장 인증 | Production launch validation이 Android Play Integrity credential 또는 iOS App Attest team id 없이 모바일 무결성 설정을 통과하지 못하게 했다. | 모바일 verifier credential launch guard |
| 2026-07-10 03:47 KST | 릴리즈 게이트 | `pnpm --filter @musunil/config test`, `pnpm check:launch-sample`, `pnpm check:release`가 통과했다. | 모바일 verifier credential guard 회귀 없음 |
| 2026-07-10 03:50 KST | 운영형 현장 인증·CLI | `admin:claim`에서 `--redacted-url` 경로를 제거하고, 내부 redaction worker 기록은 `pnpm admin:redaction <evidence_id> -- --url ... --proof-hash ...`로만 수행하게 했다. launch-check가 admin claim 우회를 회귀 방지한다. | worker-only redaction CLI 경계 강화 |
| 2026-07-10 03:50 KST | 릴리즈 게이트 | `node scripts/admin-review.mjs help`, `pnpm --filter @musunil/api test`, `pnpm check:launch-sample`, `pnpm check:release`가 통과했다. | admin redaction CLI 회귀 없음 |
| 2026-07-10 03:51 KST | 릴리즈 게이트 | `pnpm check:release`가 재통과했다. `admin:redaction`은 `--url`만 받으며 옛 `--redacted-url` alias는 남기지 않는다. | admin redaction CLI alias 회귀 없음 |
| 2026-07-10 03:54 KST | 운영형 현장 인증·개인정보 | `redaction.engine_smoke_command`와 `pnpm redaction:smoke`를 추가했다. production 설정은 redaction smoke command가 없거나 `{input}`, `{output}` 자리표시자가 빠지면 실패한다. | 실제 비식별 엔진 smoke 실행점 준비 |
| 2026-07-10 03:57 KST | 릴리즈 게이트 | 샘플 `pnpm redaction:smoke`가 `redaction_engine_smoke` proof hash를 만들었고, `pnpm --filter @musunil/config test`, `pnpm check:launch-sample`, `pnpm check:release`가 통과했다. | redaction smoke와 전체 release gate 회귀 없음 |
| 2026-07-10 03:59 KST | 운영형 현장 인증 | Android Play Integrity 설정이 임의의 긴 문자열이 아니라 base64 Google service account JSON인지 검증하게 했다. 필수 필드는 `type`, `project_id`, `client_email`, `private_key`다. | 모바일 verifier credential 구조 가드 강화 |
| 2026-07-10 04:01 KST | 릴리즈 게이트 | `pnpm --filter @musunil/config test`, `pnpm check:launch-sample`, `pnpm check:release`가 통과했다. launch sample은 base64 Google service account JSON 구조 검증을 포함한다. | 모바일 verifier credential 구조 회귀 없음 |
| 2026-07-10 04:02 KST | 법안·개정안 연결 | 법 원천 credential이 있을 때 `pnpm sources:laws` dry-run이 0건을 반환하면 `law_source_parse_empty`로 실패하게 했다. | 법 원천 dry-run 판정 강화 |
| 2026-07-10 04:03 KST | 릴리즈 게이트 | `pnpm --filter @musunil/public-source-ingest test`, `pnpm check:launch-sample`, `pnpm check:release`가 통과했다. | 법 원천 dry-run 0건 실패 가드 회귀 없음 |
| 2026-07-10 04:05 KST | 운영형 현장 인증 | 공유 `hasProofOfPresence`가 LIVE media의 `captureMode`를 `in_app_camera`로 강제하고, `/reports/live` 갤러리 제출은 `proof_of_presence_failed`로 실패하게 self-check를 추가했다. | 현장 영상 Claim 입력 경계 강화 |
| 2026-07-10 04:06 KST | 릴리즈 게이트 | `pnpm --filter @musunil/schemas test`, `pnpm --filter @musunil/api test`, `pnpm check:release`가 통과했다. | in-app camera Proof-of-Presence 회귀 없음 |
| 2026-07-10 04:08 KST | 운영형 현장 인증 | 공유 Proof-of-Presence 정책에 `minDurationMs=5000`을 추가하고 1초 LIVE 제출이 실패하는 self-check를 넣었다. | 너무 짧은 현장 영상 인증 차단 |
| 2026-07-10 04:09 KST | 릴리즈 게이트 | `pnpm --filter @musunil/schemas test`, `pnpm --filter @musunil/api test`, `pnpm check:release`가 통과했다. | 최소 5초 Proof-of-Presence 회귀 없음 |
| 2026-07-10 04:12 KST | 운영형 현장 인증 | LIVE Claim 공개 전환은 redaction 완료뿐 아니라 내부 verifier의 device integrity `pass`와 proof hash가 있어야 통과하게 했다. | trusted device integrity 전 공개 차단 |
| 2026-07-10 04:14 KST | 릴리즈 게이트 | `pnpm --filter @musunil/api test`, `pnpm check:release`가 통과했다. | trusted device integrity 공개 전환 회귀 없음 |
| 2026-07-10 04:17 KST | 운영형 현장 인증 | LIVE 제보와 현장 판단 PoP의 5분 제한을 서버 기록 시각 기준으로 고정하고, 클라이언트 `uploadedAt` 위조 회귀를 차단했다. | 서버 기준 실시간성 강화 |
| 2026-07-10 04:21 KST | 운영형 현장 인증 | 현장 판단 Claim을 verifier 전 `held_private`로 접수하고, sensor evidence의 trusted device integrity pass/proof 전 admin publish를 실패하게 했다. | 현장 판단 공개 전환 경계 강화 |
| 2026-07-10 04:25 KST | Claim 중심 모델·규모 추정 | 공개 CrowdEstimate에 `musunil_ai_estimate` Claim 메타, evidence strength, risk level을 붙이고 웹 규모 추정 패널에 표시했다. | AI 추정 Claim 원칙 회귀 방지 |
| 2026-07-10 04:27 KST | 규모 실시간 추정 | `independentViewpointCount`가 이슈 지역 수가 아니라 공개 가능한 live evidence의 geoCell/evidence id 기준으로만 계산되게 했다. | 독립 시점 과대 산정 방지 |
| 2026-07-10 04:30 KST | 규모 실시간 추정 | 공개 현장 영상이 없으면 자동 CrowdEstimate를 만들지 않게 했다. 공개 일정만 있는 이슈는 추정 대기 상태로 남는다. | 근거 없는 규모 숫자 방지 |
| 2026-07-10 04:33 KST | 규모 실시간 추정·검증 신호 | 저장된 CrowdEstimate와 타임라인/검증 신호도 현재 publishable live evidence 기준을 통과해야 공개 영상 근거로 취급되게 했다. | 오래된/비공개 근거 혼입 방지 |
| 2026-07-10 04:36 KST | 전체 S+ 관리 | active goal을 이 문서의 Element Execution Board 기준으로 유지하고, 모든 제품 요소를 Active 또는 Guard 상태로 문서 추적한다. | 전체 요소 S+ 달성 관리 체계 유지 |
| 2026-07-10 04:36 KST | 릴리즈 게이트 | `pnpm check:release`가 통과했다. typecheck, test, launch sample, Render runtime config, runtime smoke, web smoke를 모두 포함한다. | 전체 S+ 회귀 없음 |
| 2026-07-10 04:38 KST | 전체 S+ 관리 | `pnpm check:splus`를 추가하고 `pnpm check:release`에 연결했다. Active row가 남아 있는데 전체 S+ 완료처럼 문서화되거나 차단 요인·다음 active goal·판정 증거가 비면 실패한다. | 문서 관리 회귀 가드 자동화 |
| 2026-07-10 04:41 KST | 운영 배포 준비 | `pnpm launch:external-smoke`를 추가했다. 사용자가 운영 YAML/Secret을 채운 뒤 storage PUT/DELETE, redaction proof 생성, 법 원천 1건 이상 dry-run을 한 번에 검증한다. | 외부 연결 검증 진입점 단일화 |
| 2026-07-10 04:47 KST | 운영형 현장 인증 | `mobile.integrity_smoke_command`와 `pnpm mobile:integrity-smoke`를 추가하고 `pnpm launch:external-smoke`에 연결했다. 실제 provider dry-run은 `mobile_integrity_provider_dry_run` marker를 출력해야 한다. | 모바일 attestation dry-run 게이트 준비 |
| 2026-07-10 04:50 KST | 운영 배포 준비 | `pnpm launch:ready -- <user-inputs.yaml>`를 추가했다. 입력 검증, config encode check, Render runtime config smoke, external smoke, release check를 한 번에 실행한다. | 최종 운영 전 검증 진입점 단일화 |
| 2026-07-10 04:54 KST | 전체 S+ 관리 | `docs/splus-completion-audit.md`를 추가했다. 요구사항별 현재 판정, 증거, 남은 조건, 최종 완료 증거를 분리해 조기 완료 선언을 막는다. | 완료 감사 문서화 |
| 2026-07-10 05:02 KST | 운영 배포 준비 | `pnpm launch:post-deploy-smoke`를 추가했다. 실제 배포 API URL에서 `/health`, `/ready`, public payload safety, coverage, laws, admin auth boundary를 비파괴로 확인한다. | 배포 후 실제 URL 검증 진입점 준비 |
| 2026-07-10 05:03 KST | 전체 S+ 관리 | `pnpm check:splus`가 Element Execution Board의 Active 항목과 Completion Audit의 Active 판정을 교차 검증하게 했다. 문서 하나가 조기 S+로 틀어져도 release gate에서 실패한다. | 문서 관리 일관성 가드 강화 |
| 2026-07-10 05:04 KST | 화면 증거 관리 | `pnpm check:splus`가 S+ 트래커의 데스크톱·모바일 화면 증거 파일 존재와 이미지 헤더를 검증하게 했다. 문서에 죽은 캡처 링크가 남으면 release gate에서 실패한다. | 시각 증거 회귀 가드 강화 |
| 2026-07-10 05:05 KST | 운영 입력 매뉴얼 | `docs/user-inputs-manual.md`에 법 데이터 post 리허설과 배포 후 실제 URL smoke 명령을 추가하고, `pnpm check:splus`가 해당 최종 명령 누락을 차단하게 했다. | 마지막 사용자 입력 단계 회귀 가드 강화 |
| 2026-07-10 05:06 KST | 운영 배포 준비 | `pnpm launch:post-deploy-smoke`가 localhost, 127.0.0.1, `.local`, HTTP URL을 거부하고 실제 배포 HTTPS API URL만 최종 smoke 대상으로 받게 했다. | 배포 후 검증 경계 강화 |
| 2026-07-10 05:07 KST | 개인정보·권리 보호 | `pnpm launch:post-deploy-smoke`가 `/home`뿐 아니라 `/issues`, `/area-clusters`, `/map`, `/public-sources/coverage`, `/laws` 공개 응답에서도 원문·내부 id·정밀 위치·private media·proof hash 노출을 차단하게 했다. | 배포 후 공개 응답 안전성 강화 |
| 2026-07-10 05:08 KST | 개인정보·권리 보호 | `pnpm launch:post-deploy-smoke`가 실제 데이터가 있을 때 첫 이슈 상세, 이슈 live-claims, 첫 법안 상세까지 따라가 공개 응답 안전성을 검사하게 했다. | 배포 후 상세 응답 안전성 강화 |
| 2026-07-10 05:09 KST | 알림·후원·신고 방어 | `pnpm launch:post-deploy-smoke`가 배포 API에서 댓글·투표·반응·후원 endpoint 부재와 `hazard_area`/`service_disruption` 공개 타입 부재를 확인하게 했다. | 배포 후 금지 surface 검증 강화 |
| 2026-07-10 05:10 KST | 운영 배포 준비 | `pnpm launch:post-deploy-smoke`가 `/ready`의 `config_source`, `postgres`, `redis` 세부 check가 모두 ok인지 확인하게 했다. | 배포 후 DB/Redis 준비 증거 강화 |
| 2026-07-10 05:11 KST | 개인정보·권리 보호 | `storage:smoke`가 private storage key를 출력하지 않고, redaction/mobile smoke가 외부 provider raw output을 launch log에 그대로 흘리지 않게 했다. `launch:check`가 이 회귀를 차단한다. | 운영 smoke 로그 최소화 |
| 2026-07-10 05:12 KST | 운영 배포 준비 | `pnpm launch:post-deploy-smoke`가 실제 배포 API의 `nosniff`, `no-store`, `no-referrer` 헤더와 CORS 허용/차단 경계를 확인하게 했다. | 배포 후 API 보안 헤더 검증 강화 |
| 2026-07-10 05:13 KST | 운영 배포 준비 | `pnpm launch:post-deploy-smoke`가 각 요청을 10초 timeout으로 제한하고 redirect를 자동 추적하지 않게 했다. 배포 API가 아닌 우회 응답을 최종 smoke로 인정하지 않는다. | 배포 후 smoke 직접성 강화 |
| 2026-07-11 01:56 KST | 상업용 UI/UX 재설계 | 독립 에이전트 비평 3개를 반영해 홈 KPI, 카드 숫자판, 장식 커버, 반복 불확실성 박스, 홈 `관련 법안` CTA, `이슈 파일 보기` 라벨을 제거했다. 카드 언어를 `어디서`, `근거`, `어디서 확인됐나`로 바꾸고 보이는 `탐색` 탭명을 `지도`로 바꿨다. 390/430/768/1440px 캡처에서 `overflowX=false`, mini stat 0, 홈 반복 불확실성 박스 0을 확인했다. | A- Active · 사용자 수락 전 S+ 아님 |
| 2026-07-11 02:07 KST | 상업용 UI/UX 재설계 | 우측 상세 상단에 `영상/지도/근거` 빠른 버튼을 추가하고, 개요 탭의 전국 현황·묶음·규모·검증·관련 현장을 닫힌 disclosure로 낮췄다. 1440px에서 지도 빠른 버튼은 데스크톱 지도 화면으로, 영상 빠른 버튼은 영상 탭으로 전환됨을 확인했다. | A Active · 사용자 수락 전 S+ 아님 |
| 2026-07-11 02:17 KST | 상업용 UI/UX 재설계 | 독립 비평 A- 결과를 반영해 홈 카드를 `공개 위치/확인 수준/현재 상태` 시민 5초 요약으로 바꾸고 CTA를 `확인 근거 보기`로 좁혔다. 공개 가능한 `redactedClipUrl`이 있으면 비식별 공개본 프리뷰와 재생 표식을 표시한다. 390/430/768/1440px 캡처에서 `overflowX=false`, citizen summary 2개, preview 1개, mini stat 0, 금지 소셜 문구 0을 확인했다. | A Active · 실제 운영 공개 영상 품질과 사용자 수락 전 S+ 아님 |
| 2026-07-11 02:26 KST | 상업용 UI/UX 재설계 | 데스크톱 홈에서 지도와 제보가 동시에 노출되지 않게 하고, 제보는 `desktop-report` 독립 화면으로 분리했다. 1440px 홈 캡처에서 `mapVisible=false`, `reportVisible=false`, `recordVisible=true`; 제보 화면에서 `reportVisible=true`, `recordVisible=false`를 확인했다. | A Active · 사용자 수락 전 S+ 아님 |
| 2026-07-11 04:32 KST | 상업용 UI/UX 재설계 | 독립 비평을 반영해 제보 첫 화면의 단계표와 인증/위치 칩을 위치 확인 전 숨기고, 소비자용 CTA `근처 현장 찾기`와 결과 예고 문장으로 바꿨다. 홈 카드 `근거 보기`는 상세 근거 탭으로 바로 이동한다. 390px/1440px 캡처에서 금지 소셜·기술 문구 0, `overflowX=false`를 확인했다. | A+ 후보 Active · 사용자 수락 전 S+ 아님 |
| 2026-07-11 02:44 KST | 상업용 UI/UX 재설계 | 홈 카드의 표형 `공개 위치/확인 수준/현재 상태` row를 제거하고 16:9 비식별 공개 영상 프리뷰를 카드 핵심 콘텐츠로 키웠다. 모바일 상단 위치/알림 도구를 숨기고 상세 탭을 `개요/근거/영상/지도/다른 주장`으로 재정렬했다. 공개 영상은 clip+poster+proof+device integrity가 모두 있어야 노출되며, `pnpm check:release`가 통과했다. | A+ 후보 Active · 사용자 수락 전 S+ 아님 |
| 2026-07-11 02:59 KST | 상업용 UI/UX 재설계 | API가 `/media/redacted/*` 공개 poster만 안전하게 서빙하도록 추가하고 runtime/post-deploy/service-watch에 회귀 검사를 넣었다. 홈 프리뷰 정보는 별도 하단 박스가 아니라 16:9 미디어 오버레이로 압축했다. 390px/1440px 캡처에서 poster 200 `image/png`, ratio 1.77, `dashboardRows=0`, `overflowX=false`를 확인했다. | A+ 후보 Active · 데스크톱 우측 상세와 사용자 수락 전 S+ 아님 |
| 2026-07-11 03:07 KST | 상업용 UI/UX 재설계 | 데스크톱 우측 상세를 문장형 맥락 패널로 정리하고 빠른 버튼에 아이콘을 붙였다. 상세 탭과 개요 섹션은 더 가벼운 pill/flow 구조로 낮췄다. 1440px/390px 캡처에서 `actionIconCount=3`, 금지 문구 0, `overflowX=false`를 확인했다. | A+ 후보 Active · 독립 비평 재검증과 사용자 수락 전 S+ 아님 |
| 2026-07-11 03:47 KST | 상업용 UI/UX 재설계 | 독립 감사 3개가 지적한 날짜 혼선, 영상 프리뷰-CTA 불일치, 운영자 언어, 전역 알림 과노출을 반영했다. 홈 제목은 `집회·시위 공개자료`, 홈 영상은 중앙 play affordance 0, 릴스 액션은 `근거/위치 범위/관련 이슈` 3개로 축소했다. 390px/1440px 캡처에서 `visibleWordsRejected=[]`, 금지 소셜 문구 0, `overflowX=false`를 확인했다. | A+ 후보 Active · 모바일 첫 카드 정보량과 사용자 수락 전 S+ 아님 |
| 2026-07-11 03:53 KST | 상업용 UI/UX 재설계 | 모바일 홈 이슈 카드를 우측 썸네일+문장 요약 구조로 압축했다. 390px 첫 카드 높이 170px, 첫 viewport visible issue cards 2개, 430px 첫 카드 170px, 데스크톱 preview 343x194 유지, `overflowX=false`를 확인했다. | A+ 후보 Active · 사용자 수락 전 S+ 아님 |
| 2026-07-11 03:59 KST | 상업용 UI/UX 재설계 | 상세 상단 라벨 행을 문장 리스트로 바꾸고 요약 문단을 지역·현장 수·근거 상태·미확인 조건 중심으로 정리했다. 1440px/390px 캡처에서 `labelDisplay=none`, 빠른 버튼 `근거/영상/지도`, 금지 문구 0, `overflowX=false`를 확인했다. | A+ 후보 Active · 사용자 수락 전 S+ 아님 |
| 2026-07-11 05:02 KST | 상업용 UI/UX 재설계 | 현장 영상 poster를 밝은 비식별 공공 현장 프레임으로 재생성하고, 데스크톱 제보 화면에 연결 이슈·선택 현장·공개 위치·현재 단계 상태 패널을 추가했다. 모바일 릴스 poster `naturalWidth=960`, 하단 내비 겹침 없음, 데스크톱 제보 action gap 12px, 금지 문구 0, `overflowX=false`를 확인했다. | A 후보 Active · 독립 비평 재검증과 사용자 수락 전 S+ 아님 |
| 2026-07-11 05:14 KST | 상업용 UI/UX 재설계 | 05:14 독립 비평 Visual 4~6/10, IA B- 결과를 반영해 지도 탭을 지도-first로 재배치하고, 홈 카드에 지역·기준일·공개 현장·영상 근거 빠른 상황 줄을 추가했으며, `제보` 탭 라벨을 `영상제보`로 바꿨다. 390px 홈/지도, 1440px 지도/제보 캡처에서 금지 문구 0, `overflowX=false`, 데스크톱 지도 top 211px를 확인했다. | A 후보 Active · 지도 시트 과밀, 추상 영상 표면, 사용자 수락 전 S+ 아님 |
| 2026-07-11 05:20 KST | 상업용 UI/UX 재설계 | 지도 시트는 summary 2줄과 `상세 보기` 중심으로 낮추고, 영상 액션은 오른쪽 세로 반응 레일에서 하단 근거 도구막대로 바꿨다. 모바일 릴스 action bar 676~716px, 하단 내비 top 772px로 겹침 없음. 모바일/데스크톱 지도 시트는 223px/178px로 줄었고 금지 문구 0, `overflowX=false`를 확인했다. | A 후보 Active · 박스형 UI, 추상 영상 표면, 실제 제보 영상 품질, 사용자 수락 전 S+ 아님 |
| 2026-07-11 05:29 KST | 상업용 UI/UX 재설계 | 독립 Visual Critique B- 결과를 반영해 샘플 poster를 실제 현장처럼 렌더하지 않고 `현장 영상 공개 준비 중` 슬롯으로 전환했다. 데스크톱 지도 탭은 우측 상세 패널을 숨기고 지도 폭을 1200px, 화면 폭 83%로 확장했다. 390px/1440px 캡처에서 금지 문구 0, `overflowX=false`를 확인했다. | A 후보 Active · 박스형 UI, 실제 제보 영상 품질, 사용자 수락 전 S+ 아님 |
| 2026-07-11 05:41 KST | 상업용 UI/UX 재설계 | 로컬 dev 서버가 stale `config.js`로 운영 API를 바라보는 회귀를 막고, web smoke가 runtime API override를 검증하게 했다. 홈 카드에서 공개 poster 없는 영상 상태는 46px compact review row로 낮춰 대형 가짜 썸네일을 제거했다. | A 후보 Active · 박스형 UI, 실제 제보 영상 품질, 사용자 수락 전 S+ 아님 |
| 2026-07-11 05:49 KST | 상업용 UI/UX 재설계 | 독립 홈 평가 Visual A-, 국평오 5초 A-/10초 A/20초 A-를 반영해 카드 상단을 기준일·확인 건수·영상 상태·미확인 scanline으로 고정했다. 390px/1440px 모두 scanline clipped false, 금지 문구 0, `overflowX=false`를 확인했다. | A 후보 Active · 데스크톱 홈 지도·지역 현황 중심 재구성과 사용자 수락 전 S+ 아님 |
| 2026-07-11 06:00 KST | 상업용 UI/UX 재설계 | 데스크톱 홈을 이슈 피드 + 중앙 `지역 현황` 지도 + 우측 맥락 패널로 재구성하고, 영상 0건 직접 노출 문구를 제거했다. 390/430/768/1440px 캡처에서 금지 문구 0, `overflowX=false`, 모바일 scanline clipping 0을 확인했다. | A 후보 Active · 24차 독립 비평과 사용자 수락 전 S+ 아님 |
| 2026-07-11 06:11 KST | 상업용 UI/UX 재설계 | 독립 Visual/IA/QA 재검토를 반영해 홈 카드에 `근거/영상/지역/반론` 액션 허브를 추가하고, 법안·탐색·상세·영상 0-count 문구를 사용자 언어로 정리했다. 390/430/768/1440px 캡처와 모바일 액션 플로우에서 금지 문구 0, `0건` 노출 0, `overflowX=false`, `근거→상세 근거`, `영상→영상`, `지역→지도`, `반론→반론·정정`을 확인했다. | A 후보 Active · 데스크톱 패널 경쟁, 실제 제보 영상 품질, 사용자 수락 전 S+ 아님 |
| 2026-07-11 06:23 KST | 상업용 UI/UX 재설계 | 데스크톱 기본 홈을 `이슈 목록 + 지역 현황 지도` 2축으로 단순화하고 우측 상세는 `근거/반론/카드 상세` 행동 후 `desktop-detail-open`으로 열리게 했다. 1440px 기본 홈에서 `detailVisible=false`, map width 828px, 액션 후 selected tab `근거`, 390px 모바일 액션 회귀 없음, 금지 문구 0, `overflowX=false`를 확인했다. | A 후보 Active · 실제 제보 영상 품질과 사용자 수락 전 S+ 아님 |
| 2026-07-11 10:04 KST | 상업용 UI/UX 재설계 | static/운영 API 빈 응답에서도 공식 공개자료 fallback 이슈가 보이게 하고, 지도 `상세`가 선택 현장 상세로 열리게 했다. 모바일 액션은 2열, 하단 내비는 5탭이 390px 안에 들어오며, 지도 상세 `detailTitle=mapTitle`, `selectedTab=근거`, `toastCount=0`을 CDP 캡처로 확인했다. | A+ 후보 Active · 실제 운영 API와 사용자 수락 전 S+ 아님 |
| 2026-07-11 10:16 KST | 상업용 UI/UX 재설계 | 독립 Visual/IA 재검토가 지적한 CTA 분산과 `영상/영상제보` 혼선을 반영했다. 홈 주행동은 `지도에서 확인` 1개, 보조 액션은 `근거/인증영상/반론`으로 낮췄고, 탭 라벨은 `인증영상/현장촬영`으로 분리했다. 390px CDP에서 `primary=지도에서 확인`, `scrollWidth=390`, `영상제보` 노출 0, scanline `위치 2곳 · 현장 5건 · 공식 자료 6건 · 인원 미확인`을 확인했다. | A+ 후보 Active · 지도 placeholder감, 실제 운영 영상, 사용자 수락 전 S+ 아님 |
| 2026-07-11 10:32 KST | 상업용 UI/UX 재설계 | 지도 fallback canvas를 와이어프레임 도로 그림에서 지도 톤 베이스와 자료 핀/인증 영역 보조 레이어로 바꾸고, MapLibre `styledata/idle`에서 GeoJSON layer sync를 재시도하게 했다. 390px 지도 `mapRect=370x460`, `navOverlap=false`, 1440px 지도 `mapRect=1200x700`, sheet 62px, 금지 문구 0을 확인했다. | A+ 후보 Active · 실제 GPS evidence 기반 영역 시각 평가는 운영 데이터 연결 후 재검증 |
| 2026-07-11 10:49 KST | 상업용 UI/UX 재설계 | 지도 현장 인증 영역을 공개 가능한 live Evidence 기준으로만 생성하게 했다. 공식 자료 위치만 있는 현장은 `현장 인증 영역은 아직 없습니다`로 표시하고, 인증 영상 Evidence가 있는 현장은 근접 줌 인증 영역으로 보여준다. | A+ 후보 Active · 실제 운영 GPS evidence와 사용자 수락 전 S+ 아님 |
| 2026-07-11 11:04 KST | 상업용 UI/UX 재설계 | 인증영상 탭이 영상 근거가 있는 이슈를 기본 선택하게 하고, poster 없는 LIVE Claim을 빈 릴스판 대신 `검토 대기` 카드로 표시했다. 390px에서 `panel.bottom=715`, 하단 내비 top 772, `navOverlap=false`, `posterImages=0`, `reviewSlots=0`, 금지 문구 0을 확인했다. | A+ 후보 Active · 실제 공개 영상 품질, 독립 재검증, 사용자 수락 전 S+ 아님 |
| 2026-07-11 11:10 KST | 상업용 UI/UX 재설계 | 실제 공개 `redactedClipUrl`과 poster가 모두 있는 LIVE Claim은 풀스크린 인증영상 탭에서 poster-only 이미지가 아니라 native video player로 렌더되게 했다. sample poster는 계속 검토 카드로 숨기고, `check:web-smoke`가 video branch와 poster-only 회귀 금지를 검증한다. | A+ 후보 Active · 실제 공개 영상 파일 기반 캡처와 사용자 수락 전 S+ 아님 |
| 2026-07-11 11:16 KST | 상업용 UI/UX 재설계 | seed/API가 참조하는 preview webm 파일을 추가하고, 정적 서버 `.webm/.mp4` MIME과 `media-src` CSP를 보강했다. `check:web-smoke`가 preview clip route 200, `video/webm`, 5KB 이상을 검증한다. sample은 UI에서 실제 제보처럼 노출하지 않는다. | A+ 후보 Active · 실제 운영 공개 영상 캡처와 사용자 수락 전 S+ 아님 |
| 2026-07-11 11:21 KST | 상업용 UI/UX 재설계 | 공개 영상 route 검증을 배포 후 smoke, runtime smoke, service watch까지 확장했다. 운영 API의 `/media/redacted/preview-occ-live-1.webm`이 200 `video/webm`, `nosniff`, 5KB 이상으로 열리지 않으면 배포 감시가 실패한다. | A+ 후보 Active · 실제 운영 공개 영상 캡처와 사용자 수락 전 S+ 아님 |
