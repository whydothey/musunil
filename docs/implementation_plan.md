# 무슨일 구현 계획

무슨일은 정보통신망법 개정 이후 허위·조작정보 환경에서 시민의 알권리를 보호하기 위해 집회·시위 정보를 객관적으로 제공하는 서비스다.

## 전체 시스템 아키텍처

```text
Web/PWA, Mobile
  -> API
    -> Claim/Evidence/Target storage
    -> Report, Correction, Rights-violation, Rebuttal intake
    -> Subscription, NotificationOutbox
  -> Workers
    -> public assembly notice ingest
    -> proof-of-presence verification
    -> lifecycle reconciliation
    -> manipulation detection
    -> Postgres lease 기반 단일 ops scheduler
       -> notification dispatch
       -> public source ingest
       -> law source ingest
       -> privacy purge
  -> Agent service
    -> claim normalization
    -> evidence matching
    -> privacy redaction
    -> rights/risk review
```

핵심 저장 원칙:

- Event를 단일 진실 객체로 만들지 않는다.
- 모든 경찰/지자체 안내, 주최 측 공지, 언론 보도, 시민 제보, 반론, 신고, AI 추정은 Claim이다.
- Source provenance, Evidence strength, Risk level은 별도 필드다.
- 같은 주제라도 지역이나 시간이 다르면 별도 Occurrence다.
- 장기 농성은 ContinuousPresence로 분리한다.
- 공개 지도는 자료 위치 핀과 Proof-of-Presence 현장 인증 영역만 표시한다.
- 교통선, 경로선, 검문/통제 지점, 인파 밀도 면은 공개 도메인으로 만들지 않는다.

## 기능 분해

1. 설정
   - 사용자 입력값은 단일 YAML 파일 또는 Render Secret 주입만 사용한다.
   - 제품/운영 입력값은 단일 YAML에서 읽고, Render 관리형 DB/Redis URL과 generated secret만 환경변수로 받는다.

2. 도메인 모델
   - Issue, Occurrence, ContinuousPresence.
   - Claim, Evidence, AuditLog, TransparencyLog, Subscription, NotificationOutbox.
   - LawItem, IssueLawLink. LawItem은 Event/Claim이 아니라 공식 법령·의안 참조 메타데이터이며, IssueLawLink가 주제어/법 이름/의안 제목/수동 연결 근거를 보존한다.
   - Issue 제목은 지역/형태가 아니라 주장 대상과 주장 성격이다. 예: `부정선거 의혹 제기 집회`, `정보통신망법 개정 반대 집회`, `대통령 탄핵 요구 집회`.

3. 제보
   - 사용자에게 새 사건 생성을 강요하지 않고 주변 후보를 먼저 보여준다.
   - 사용자 제보는 실시간 GPS 기반 앱 내 촬영 현장 영상만 허용한다.
   - 영상 Claim에 대한 현장 판단도 Proof-of-Presence를 통과한 Claim으로만 저장한다.

4. 공개/검증
   - 사용자 원문은 직접 공개하지 않는다.
   - 얼굴, 차량번호, 주소, 전화번호, 미성년자 식별 정보는 공개 전 제거한다.
   - 공개 위치는 반경 흐림으로 낮춘다.

5. 지도/상세
   - 홈의 최상위 탐색 단위는 Issue다.
   - 사용자는 Issue를 먼저 선택하고, 하위 Occurrence/ContinuousPresence 현장을 확인한다.
   - 법 탭은 주요 이슈와 연결된 법령·의안을 관심도순으로 보여 주되, 신뢰도·알림·랭킹과 독립된 탐색 정렬값만 사용한다.
   - 집회 목적이 확인되지 않은 일정/통계 자료는 Issue로 억지 묶지 않고 Occurrence/기록으로 표시한다.
   - 지도는 자료 위치 핀과 현장 인증 영역만 표시한다. 자료에서 위치를 파싱하지 못하면 핀을 만들지 않고 카드에서 `위치 확인 중`으로 남긴다.
   - 현장 인증 영역은 공개 가능한 LIVE Evidence 좌표를 서버에서 흐림 처리해 만든 Polygon만 사용한다.
   - 불법/합법 단정, 참여 독려, 충돌/회피/진입 전술 안내는 만들지 않는다.

6. 알림
   - 모든 업데이트가 아니라 의미 있는 상태 변화만 보낸다.
   - 후원, 신고 수, 조회수, 동일 문구 반복, 단일 출처 주장은 알림 트리거가 아니다.

7. 정정/신고/반론
   - 현장 정정, 권리침해 신고, 반론 제출을 분리한다.
   - 권리침해 신고와 반론도 Claim이다.
   - 신고 수만으로 자동 삭제하지 않는다.

## Sprint 계획

### Sprint 0. 기반

- AGENTS.md 갱신.
- 단일 YAML 템플릿과 사용자 매뉴얼 작성.
- Claim/Evidence/Target 타입과 안전 규칙 구현.
- 최소 self-check 추가.

### Sprint 1. API 골격

- `GET /home`, `GET /issues`, `GET /occurrences/:id`, `GET /targets/:type/:id`.
- `POST /reports/live`, `POST /reports/material`, `POST /internal/ingest/public-source`, `POST /internal/ingest/public-occurrence`.
- 사용자 제출 중 LIVE 제보는 Proof-of-Presence와 비식별 검토 전 `held_private`이고, 자료 제보/정정/권리침해/반론은 모두 `202 queued_for_review`로 접수해 Admin review 전 공개 집계에 반영하지 않는다.
- `GET /ready`, 내부/admin 라우트 키 보호, 공개 원천 Occurrence upsert.
- 메모리 저장소로 먼저 동작 확인 후 DB로 교체한다.
- 실제 공개 원천 기반 seed를 Claim/Evidence로 넣는다: 경찰청 전국 통계, 대구 신고·개최 현황, 대구 오늘의 집회시위 일정.

### Sprint 2. 저장소

- PostgreSQL/PostGIS 마이그레이션.
- 초기 migration SQL로 Claim/Evidence/Occurrence/Audit/Notification 테이블 계약을 고정한다.
- Claim/Evidence/Issue/Occurrence/ContinuousPresence 모델.
- AuditLog/TransparencyLog.

### Sprint 3. 홈/지도

- 이슈 우선 홈: Issue 카드, 선택 이슈의 하위 상황 카드.
- 지금/예정/장기 필터.
- MapLibre GeoJSON source/layer 기반 자료 위치 핀, 현장 인증 영역, 상세 진입.
- Priority score에서 후원/신고/투표/댓글 제외 테스트.

### Sprint 4. 제보 UX

- 주변 기존 상황 후보.
- 상황별 비식별 LIVE 영상 Claim 피드.
- 현장 인증자만 가능한 일치/다른 현장 가능성/맥락 부족/권리 검토 판단.
- 처리 상태 표시.

### Sprint 5. Proof-of-Presence

- 앱 내 촬영 플로우.
- foreground GPS.
- Play Integrity/App Attest hook.
- 원본 해시, EXIF 제거, 마스킹 파이프라인.

### Sprint 6. 집회 현장 정밀화

- ContinuousPresence 그래프.
- 행진도 공개 지도에서는 선형 경로가 아니라 현장 단위 핀과 인증 영역으로 표시한다.
- 공개 원천 위치 파싱 실패, 다중 장소, 반론 있는 현장의 카드/지도 상태를 정리한다.
- LIVE Evidence 1개, 2개, 3개 이상 케이스별 현장 인증 영역 계산을 검증한다.

### Sprint 7. AI/Workers

- 공개 집회 원천 read-only 수집 worker.
- 대구경찰청 `오늘의 집회시위` 목록은 HTML parser + dry-run부터 운영한다.
- 국회 의안 공개 API와 국가법령정보 공동활용 API는 `LawItem`으로 정규화하고 `/internal/ingest/laws`로 반영한다.
- PDF/첨부파일 구조화 파서.
- Claim normalizer.
- Evidence matcher.
- Lifecycle reconciler.
- Crowd estimate.
- Manipulation detection.
- Briefing formatter.

### Sprint 8. 알림/투명성

- Subscription.
- NotificationOutbox dedupe/cooldown.
- 내부 dispatch worker.
- 월간 투명성 로그.

### Sprint 9. 운영/배포

- Render Blueprint 기반 API/Web/Cron/Postgres/Key Value 배포와 private hostport 연결.
- Secret File 또는 `MUSUNIL_USER_INPUTS_B64`.
- 내부 검수 CLI.
- CI lint/test/build.
- 보안/개인정보/악용 시나리오 회귀 테스트.

## 서브에이전트별 담당 작업

- Product Strategy Agent: 집회·시위 특화 우선순위와 금지 기능 검토.
- UX/UI Design Agent: 홈, 지도, 상세, 제보, 정정/신고/반론 UX.
- Frontend Agent: Web/PWA 구현.
- Mobile Agent: Expo 촬영, 위치 인증, 푸시 토큰.
- Backend Agent: API, DB, 인증, 권한.
- Geo/Map Agent: PostGIS, MapLibre source/layer, 자료 위치 핀, 현장 인증 영역.
- AI Agent Engineer: Claim 정규화, Evidence 매칭, 요약, 조작 신호.
- Security/Privacy Agent: 위치 흐림, 원본 보호, 로그 접근 통제.
- Legal/Risk Agent: 권리침해 신고, 기관 요청, 투명성 로그.
- Notification Agent: 상태 변화 감지, dedupe, cooldown.
- DevOps Agent: Render, Secret, CI/CD.
- QA Agent: 맞불집회, 장기 농성, 대량 신고, 후원 영향 차단 테스트.

## 리스크와 우선순위

1. 참가자 식별: 공개 좌표 흐림, 원본 암호화, 얼굴/차량번호 마스킹이 먼저다.
2. 단일 진실화: UI와 API 모두 Claim 비교 구조를 기본값으로 둔다.
3. 동원/전술화: 참여 독려, 충돌·회피·진입 안내를 만들지 않는다.
4. 조작/대량 신고: 신고 수 자동 삭제 금지와 영향력 제거를 코드로 테스트한다.
5. 알림 과잉: 의미 있는 상태 변화와 dedupe 없이는 발송하지 않는다.
6. 후원 오염: 후원 데이터는 우선순위, 알림, 신뢰도 계산에 입력하지 않는다.
