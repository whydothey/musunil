# 무슨일

집회·시위 정보를 Claim, Evidence, Source provenance, Risk level로 분리해 보여주는 객관 정보 플랫폼이다. 목적은 정보통신망법 개정 이후 허위·조작정보 환경에서 시민의 알권리를 돕는 것이다.

## 로컬 실행

설치:

```bash
pnpm install
```

검증:

```bash
pnpm check:release
```

운영 입력값 검증:

```bash
pnpm launch:inputs
pnpm launch:verify-inputs
pnpm config:encode -- --check config/musunil.user-inputs.local.yaml
pnpm check:release
pnpm smoke:api -- --require-ready
pnpm smoke:api -- --boundary-checks
```

API:

```bash
pnpm dev:api
```

로컬에서 사용자 token secret이 없으면 `MUSUNIL_INTERNAL_API_KEY`를 anonymous token 서명에도 재사용한다. Render 기본 운영 배포는 `MUSUNIL_USER_TOKEN_SECRET`을 자동 생성한다.

Web:

```bash
pnpm dev:web
```

브라우저에서 출력된 `http://localhost:<port>`를 연다. API가 `http://localhost:4000`에서 실행 중이면 데이터를 가져오고, 아니면 내장 샘플을 표시한다.
운영 정적 빌드는 `pnpm build:web-config`로 단일 YAML의 `api.public_base_url`, `map.map_style_url`만 [apps/web/config.js](/Users/mk/Documents/Musunil/apps/web/config.js)에 공개 주입한다.
Render Static Site는 `pnpm build:web-static`을 사용한다. Render build command는 `MUSUNIL_WRITE_BUILD_INFO=1`로 [apps/web/build-info.json](/Users/mk/Documents/Musunil/apps/web/build-info.json)을 실제 커밋 SHA로 덮어써야 하며, 로컬 release check는 tracked placeholder를 보존한다.

Render Static Site 수동 생성값은 아래 명령으로 `render.yaml`에서 추출한다.

```bash
pnpm render:web-settings
```

핵심 값:

```text
Branch: main
Root Directory: 비움
Build Command: corepack enable && pnpm install --frozen-lockfile && MUSUNIL_WEB_API_BASE_URL=https://api.musunil.com MUSUNIL_WRITE_BUILD_INFO=1 pnpm build:web-static && MUSUNIL_WEB_API_BASE_URL=https://api.musunil.com pnpm check:web-smoke
Publish Directory: apps/web
Required headers: render.yaml의 musunil-web headers 블록과 동일하게 적용
```

Render 공식 문서 기준, Static Site 응답 헤더는 서버 코드가 아니라 [Render Dashboard의 Static Site Headers 설정](https://render.com/docs/static-site-headers) 또는 [Blueprint의 `headers` 설정](https://render.com/docs/blueprint-spec)으로 적용된다. 수동 Static Site를 쓰는 경우 `pnpm render:web-settings`가 출력하는 Headers 항목을 Dashboard에 그대로 입력한다.

`/build-info.json` 또는 `/build-info.js`가 404면 Render가 build command를 실행하지 않았거나, Static Site가 repo root/Publish Directory/Blueprint 설정을 잘못 보고 있는 상태다.
두 파일은 build command가 실제 커밋 SHA로 덮어쓰는 공개 배포 확인 산출물이다. placeholder 파일을 repo에 추적시키고, `.gitignore`에 넣지 않는다.
`/static-manifest.json`은 HTML/config/media 파일 해시를 검증하는 추적 산출물이다. Render가 build output을 반영하지 않아도 live 정적 파일이 repo 산출물과 같은지 `pnpm check:web-deploy`가 해시로 확인한다.
`/static-manifest.json`은 최신인데 `/build-info.json`만 `generated-at-build`면 Render가 저장소의 `apps/web`을 그대로 publish하고 빌드 중 덮어쓴 산출물을 publish하지 않는 상태다. Render Dashboard에서 Static Site의 Branch, Root Directory, Build Command, Publish Directory, Headers를 위 값과 맞춘 뒤 `Clear build cache & deploy`로 다시 배포한다. 이 상태는 최신 UI가 보여도 운영 배포 성공으로 보지 않는다.
헤더까지 강제 확인하려면 `MUSUNIL_STRICT_WEB_HEADERS=1 MUSUNIL_WEB_BASE_URL=https://musunil.com MUSUNIL_EXPECTED_API_BASE_URL=https://api.musunil.com MUSUNIL_EXPECTED_COMMIT_SHA=$(git rev-parse HEAD) pnpm check:web-deploy`를 실행한다.

배포 후에는 아래 명령으로 API와 Web이 같은 최신 커밋을 보고 있는지 확인한다.

```bash
MUSUNIL_API_BASE_URL=https://api.musunil.com \
MUSUNIL_WEB_BASE_URL=https://musunil.com \
MUSUNIL_EXPECTED_API_BASE_URL=https://api.musunil.com \
MUSUNIL_EXPECTED_COMMIT_SHA=$(git rev-parse HEAD) \
pnpm launch:post-deploy-smoke -- --require-laws
```

이 검증이 실패하면 Render가 다른 브랜치/Root/Build Command/Publish Directory를 보고 있거나, Static Site headers/Cloudflare 캐시가 구버전을 반환하는 상태다.

## 현재 구현 범위

- 단일 사용자 입력 YAML 템플릿과 로더.
- Claim 중심 도메인 스키마.
- Proof-of-Presence 판정.
- 자동 병합 금지 규칙.
- 후원/신고/단일 출처 기반 알림 차단 규칙.
- 명세의 주요 조회/제보/정정/신고/반론/구독 API 라우트 로컬 골격.
- 원문 비공개 응답 self-check.
- 공개 API 응답에서 내부 `claimIds/evidenceIds/*ClaimIds/targetRefs` 참조 제거.
- 비파괴 런타임 스모크, HTTP 경계 smoke, 선택적 write smoke.
- 신고 수 자동 삭제 금지 self-check.
- 정적 Web/PWA 프리뷰 화면.
- 로컬 Web 정적 서버 `pnpm dev:web`.
- MapLibre + OpenFreeMap 프리뷰 지도 연결.
- OpenFreeMap 기본 지도 provider 확정, 별도 지도 API key 없이 launch check 통과.
- 운영 seed에서 프리뷰/mock 데이터 제거 옵션.
- 운영형 Web fallback에서 프리뷰/mock 카드와 핀 제거.
- Web API override는 localhost에서만 허용.
- 홈 카드 내부 enum 원문 비노출.
- 실제 공개 원천 기반 시드: 경찰청 2011~2023 집회 신고·개최 통계, 대구 2020~2025 신고·개최 현황, 대구 오늘의 집회시위 게시판 항목.
- `/ready` 운영 준비도 점검.
- `/ready` Postgres/Redis 연결 점검.
- Postgres `store_snapshots` 기반 v1 영속화.
- Postgres snapshot 저장 직렬화.
- Postgres snapshot payload AES-GCM 암호화.
- SIGTERM graceful shutdown snapshot flush.
- `pnpm db:migrate` Postgres migration runner와 핵심 도메인 테이블 계약.
- 내부/admin 라우트 `x-musunil-internal-key` constant-time 보호.
- 사용자별 `/me/*`, 구독 생성/수정, 제보 소유권 기록은 서버 서명 anonymous token으로 범위 확인.
- Anonymous token은 만료 시간을 포함한다.
- LIVE 제보는 anonymous token이 필수이며, 운영 기본값에서는 `held_private` Claim으로 검수 큐에 먼저 들어간다.
- Admin review에서 `--publish` 처리한 Claim만 공개 홈/상세/우선순위 계산에 반영된다.
- JSON body size/parse guard.
- 공개 write API IP rate limit.
- API CORS allowed origin echo와 기본 보안 헤더.
- 로컬 Web fallback 포트 4173/4174 CORS 허용.
- 알림 구독 `alertTypes`, mute, dedupe/cooldown guard.
- 내부 privacy purge: 만료된 raw statement, 정밀 위치 필드, 오래된 audit log 정리.
- 내부 검수 CLI: `pnpm admin:queue`, `pnpm admin:claim`.
- 대구경찰청 공개 원천 worker dry-run.
- 공개 원천 worker fetch 실패/0건 파싱 non-zero 종료.
- 공개 원천 Claim/Occurrence ingest 반복 실행 중복 방지.
- 전국 경찰청 권역 공개 원천 coverage registry와 `pnpm sources:coverage`.
- 공개 coverage API `GET /public-sources/coverage`와 Web 상단 `일정 원천 active/total` 표시.
- 공개 원천 부재를 집회 부재로 해석하지 않는 coverage policy.
- 알림 dispatch worker local completion: due outbox를 `sent`로 마감.
- 정적 Web 공개 API URL 주입.
- Render 배포 초안, cron worker, Postgres migration SQL.
- Render Blueprint 관리형 Postgres/Key Value 자동 생성과 `DATABASE_URL`/`REDIS_URL` 주입.
- Render 서비스 `MUSUNIL_RUNTIME_ENV=production` marker와 설정 실패 시 mock/LIVE 자동 공개 차단.
- Render Web이 API의 `MUSUNIL_USER_INPUTS_B64`를 참조해 YAML secret 입력을 API 한 곳으로 축소.
- Render API가 `MUSUNIL_INTERNAL_API_KEY`, `MUSUNIL_USER_TOKEN_SECRET`, `MUSUNIL_ENCRYPTION_KEY`를 생성하고 내부 서비스가 이를 참조해 YAML 내 운영 secret을 줄임.
- Render cron worker private `MUSUNIL_API_HOSTPORT` 주입과 worker fallback.
- Render Static Site 보안 헤더 Blueprint 선언.
- Render API/Web build `build:web-config` + `launch:check` gate.
- Render privacy purge cron.
- 공개 원천 cron 실패 시 non-zero 종료.
- AI provider 없이도 현재 launch check 통과, provider를 켤 때만 `ai.api_key` 필수.
- production LIVE 미디어는 `storage.*`, media encryption key, Android Play Integrity 또는 iOS App Attest 설정 없이는 launch check 실패.
- LIVE 원본 업로드는 AES-GCM 암호화 후 S3-compatible storage adapter로 PUT하며, production 외부 저장소 필수 모드에서 adapter나 media encryption key가 없으면 fail-closed.
- GitHub Actions `pnpm check:release` CI.
- `pnpm launch:inputs` 운영 YAML 초안 생성: Render generated secret은 비워 두고 실제 운영 값만 `CHANGE_ME_*`로 남김.
- 기본 템플릿은 production-safe 값으로 preview/mock을 끄고 `CHANGE_ME_*` 입력값만 드러냄.
- `pnpm launch:verify-inputs` 로컬 검증: Render 관리형 DB/Redis를 모의 주입해 사용자 YAML만 검증.
- `pnpm config:encode` 운영 YAML 검증 후 `MUSUNIL_USER_INPUTS_B64` 생성. placeholder가 남아 있으면 실패.

## 외부 연결 전까지 보류

- PostGIS 위치/반경 쿼리 최적화.
- 운영용 지도 provider 확정.
- Expo 앱 내 촬영, Play Integrity, App Attest.
- S3/R2 원본 미디어 암호화 저장.
- 얼굴/차량번호 자동 마스킹 모델.
- 공개 집회/교통 원천 자동 수집 worker와 PDF 구조화 파서.
- AI 모델 호출.
- FCM/APNs 실제 발송.
- 결제/후원 provider.
- Render Dashboard에서 Blueprint 생성과 `MUSUNIL_USER_INPUTS_B64` 1회 입력.

UI/UX 프리뷰용 외부 연결 순서는 [docs/uiux-preview-connections-guide.md](/Users/mk/Documents/Musunil/docs/uiux-preview-connections-guide.md)에 정리했다. 먼저 지도만 붙이고, 실제 푸시/결제/AI/미디어 저장소는 뒤로 미룬다.

국내 운영과 운영 후원 수익화 순서는 [docs/domestic-operation-and-monetization.md](/Users/mk/Documents/Musunil/docs/domestic-operation-and-monetization.md)에 정리했다. 현재 순서는 도메인 기반 실제 서비스 오픈, 개인사업자 등록 및 사업용 계좌 확보, PG 단발/정기 운영 후원 연결이다. 개인 계좌 공개와 후원 기반 노출/알림/신뢰도 가중은 금지한다.

Mock 데이터와 실제 공개 원천 ingest 방식은 [docs/data-fixtures-and-real-sources.md](/Users/mk/Documents/Musunil/docs/data-fixtures-and-real-sources.md)에 정리했다.

내부 운영:

```bash
pnpm admin:queue
pnpm admin:claim <claim_id> -- --risk low --reason "검수 완료"
pnpm admin:claim <claim_id> -- --publish --reason "공개 가능"
pnpm dispatch:notifications
pnpm smoke:api
pnpm smoke:api -- --write-checks
```

## 제품 원칙

- Event를 단일 진실 객체로 만들지 않는다.
- 모든 경찰/지자체 안내, 주최 측 공지, 보도, 제보, 반론, 신고, AI 추정은 Claim이다.
- 사용자 원문은 공개 응답에 직접 노출하지 않는다.
- 자유 댓글, 추천/비추천, 찬반투표는 만들지 않는다.
- 후원은 랭킹, 알림, 신뢰도에 영향을 주지 않는다.
- 신고 수만으로 자동 삭제하지 않는다.
- 참여 독려, 충돌/회피/불법 진입/폭력/신상털이 안내를 만들지 않는다.
