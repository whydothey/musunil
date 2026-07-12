# Launch Cutover Runbook

이 문서는 `musunil.com`을 실제 공개 서비스로 넘길 때 마지막에 사람이 입력해야 하는 값을 한곳에 모은다. 세부 값은 `render.yaml`과 `config/musunil.user-inputs.local.yaml`을 기준으로 하며, 복사 가능한 최신 출력은 항상 아래 명령을 먼저 본다.

```bash
pnpm launch:operator-brief
pnpm launch:cutover-rehearsal
pnpm launch:blockers
pnpm launch:cutover-plan
pnpm render:api-settings
pnpm render:web-settings
pnpm cloudflare:dns
pnpm cloudflare:headers
pnpm cloudflare:apply
pnpm cloudflare:check
```

`pnpm launch:operator-brief -- --refresh`는 위 명령들의 핵심 출력과 현재 blocker를 [launch-operator-brief.md](/Users/mk/Documents/Musunil/docs/launch-operator-brief.md)에 합쳐 쓰는 운영자용 단일 브리프다. Render/Cloudflare 화면을 열기 직전에는 반드시 refresh한 이 파일을 먼저 본다. 기존 파일의 오래된 Git SHA나 blocker 상태는 출시 판단 증거가 아니다.
`pnpm cloudflare:dns`는 Render custom-domain target을 입력할 Cloudflare DNS 레코드 템플릿을 [cloudflare-dns-records.md](/Users/mk/Documents/Musunil/docs/cloudflare-dns-records.md)와 [dns-records.tf.example](/Users/mk/Documents/Musunil/infra/cloudflare/dns-records.tf.example)에 생성한다. Render target을 복사한 뒤 `MUSUNIL_RENDER_WEB_DNS_TARGET`, `MUSUNIL_RENDER_API_DNS_TARGET`을 로컬 셸에 넣으면 git-ignored local copy와 strict CNAME 검증도 함께 쓸 수 있다.
`pnpm cloudflare:headers`는 Render Static headers가 live에 적용되지 않을 때 쓸 Cloudflare Response Header Transform Rule 템플릿을 [cloudflare-response-headers.md](/Users/mk/Documents/Musunil/docs/cloudflare-response-headers.md)와 [response-headers.tf.example](/Users/mk/Documents/Musunil/infra/cloudflare/response-headers.tf.example)에 생성한다.
`pnpm cloudflare:apply`는 기본 dry-run이다. `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ZONE_ID`, Render target env가 있을 때 `--apply --dns` 또는 `--apply --headers`를 붙이면 Cloudflare API로 DNS Records와 Response Header Transform Rule을 생성/갱신한다.

## 1. 현재 차단 항목

2026-07-12 04:05 KST live 감시 기준으로 최신 UI 정적 파일은 `musunil.com`에 반영됐다. `web_static_manifest`, `web_runtime_config`, `web_build_info`, `web_forbidden_ui_absent`는 통과했고, `config.js`도 `https://api.musunil.com`을 가리킨다.

출시 직전 완료 전까지 남는 차단 항목은 아래 순서로 처리한다.

| 우선순위 | 항목 | 현재 증거 | 해야 할 일 | 검증 |
|---|---|---|---|---|
| 1 | API DNS | `api_endpoint_preflight` 실패: `getaddrinfo ENOTFOUND api.musunil.com` | `pnpm render:api-settings`와 `pnpm cloudflare:dns` 출력대로 Render `musunil-api` 설정과 env source를 확인한다. `api.musunil.com` custom domain을 추가한 뒤 Render가 표시한 target을 `MUSUNIL_RENDER_API_DNS_TARGET`에 넣고 Cloudflare `api` CNAME을 DNS only로 연결한다. | `: "${MUSUNIL_RENDER_API_DNS_TARGET:?set exact Render API target from Render first}" && pnpm cloudflare:check:strict` |
| 2 | Static headers | `/`, `/config.js`, `/build-info.json`에 CSP, Permissions, Referrer, nosniff, X-Frame-Options가 없고 Cache-Control이 `no-store`가 아니다. | `pnpm render:web-settings` 출력의 Header application mode를 먼저 확인한다. 수동 Static Site이면 Render Dashboard의 `musunil-web > Settings > Headers`에 모든 header를 직접 입력하고 `Clear build cache & deploy`를 실행한다. Blueprint-managed이면 `render.yaml` headers sync를 확인한다. Render headers가 live 응답에 계속 반영되지 않거나 Cloudflare proxy가 켜져 있으면 `pnpm cloudflare:headers`로 생성되는 Web 전용 Response Header Transform Rule을 적용하고 `/`, `/config.js`, `/build-info.json` 캐시 우회를 확인한다. | `pnpm render:web-settings && pnpm cloudflare:headers && pnpm cloudflare:check && MUSUNIL_STRICT_WEB_HEADERS=1 MUSUNIL_WEB_BASE_URL=https://musunil.com MUSUNIL_EXPECTED_API_BASE_URL=https://api.musunil.com pnpm check:web-deploy` |
| 3 | Live issue data sync | `web_visual_surface` 실패: 화면 구조는 렌더링되지만 `serviceSyncState=delayed`이며 최신 첫 이슈는 `정보통신망법 개정 관련 집회`, source bundle first는 `0/4`다. | API DNS, CORS, `/ready`, public payload가 연결되어 Web이 live 상태로 동기화되게 한다. API 연결 뒤 `/home.issueCards`는 실제 주제형 Issue를 3개 이상 포함하고 첫 항목이 공개자료 묶음이면 안 된다. | `pnpm launch:final-gate` |
| 4 | Build metadata | `build-info.json`은 placeholder지만 static manifest hash로 최신 UI 파일은 확인됐다. | Render가 build command output을 publish하는지 확인한다. 계속 수동 Static Site를 유지하면 static manifest 검증을 fallback warning으로 인정하되, 최신성 판정은 hash로 한다. | `MUSUNIL_WEB_BASE_URL=https://musunil.com MUSUNIL_EXPECTED_API_BASE_URL=https://api.musunil.com MUSUNIL_EXPECTED_COMMIT_SHA=$(git rev-parse HEAD) pnpm check:web-deploy` |

통합 감시 문서는 매번 아래 명령으로 갱신한다.

```bash
pnpm launch:cutover-rehearsal -- --refresh
pnpm launch:blockers -- --refresh

MUSUNIL_WEB_BASE_URL=https://musunil.com \
MUSUNIL_API_BASE_URL=https://api.musunil.com \
MUSUNIL_EXPECTED_API_BASE_URL=https://api.musunil.com \
MUSUNIL_EXPECTED_COMMIT_SHA=$(git rev-parse HEAD) \
pnpm service:watch:visual
```

## 2. Render Static Site

Render Static Site를 수동으로 만든 경우 Dashboard 값은 `pnpm render:web-settings` 출력값과 같아야 한다.

```bash
pnpm render:web-settings
```

Header 적용 방식은 둘 중 하나만 믿는다.

- 수동 Static Site: Render 공식 문서 기준 static site custom response header는 Dashboard에서 설정한다. `render.yaml`에 header가 있어도 수동 생성된 Static Site가 Blueprint-managed가 아니면 live 응답에 자동 반영됐다고 보지 않는다. 반드시 `musunil-web > Settings > Headers`에 아래 6개 header를 입력한다.
- Blueprint-managed service: `render.yaml`의 `musunil-web.headers`가 Render Blueprint sync로 적용됐는지 확인한다. Render Blueprint 문서는 static site의 `headers` 필드를 지원한다.

참고:

- Render Static Site headers: https://render.com/docs/static-site-headers
- Render Blueprint static site headers: https://render.com/docs/blueprint-spec#static-sites

고정 기준:

- Branch: `main`
- Root Directory: 비움
- Build Command: `render.yaml`의 `musunil-web.buildCommand`
- Publish Directory: `apps/web`
- Environment Variables: `NODE_VERSION=24`, `MUSUNIL_RUNTIME_ENV=production`만 둔다. Static Web에는 DB/Redis URL, 사용자 입력 YAML, token secret, encryption key, internal API key를 넣지 않는다.
- Headers: `Cache-Control`, `Content-Security-Policy`, `Permissions-Policy`, `Referrer-Policy`, `X-Content-Type-Options`, `X-Frame-Options`
- Portable Headers File: `apps/web/_headers`. `pnpm build:web-static`이 `render.yaml`의 `musunil-web.headers`에서 생성한다. Cloudflare Pages/Netlify류 정적 호스트에서는 이 파일을 사용할 수 있지만, Render 수동 Static Site에서는 Dashboard Headers 입력을 대체하지 않는다.

주의:

- Web `config.js`에는 `apiBaseUrl`, `mapStyleUrl`만 공개한다.
- Web `config.js`의 `apiBaseUrl`은 `https://api.musunil.com`이어야 한다.
- `/`, `/config.js`, `/build-info.json`, `/static-manifest.json`은 캐시된 구버전이 나오면 안 된다.
- `/`, `/config.js`, `/build-info.json`은 `Cache-Control: no-store`, CSP, `Permissions-Policy`, `Referrer-Policy: no-referrer`, `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`가 실제 응답에 있어야 한다.
- Static hash가 현재 repo 산출물과 다르면 최신 UI 배포로 인정하지 않는다.

## 3. Render API

`musunil-api`는 Blueprint 기준으로 만든다. 수동 생성 시에도 아래 계약을 지킨다.

```bash
pnpm render:api-settings
```

- Health Check Path: `/ready`
- Build Command: `pnpm check`, `pnpm build:web-config`, `pnpm launch:check` 포함
- Pre Deploy Command: `pnpm db:migrate`
- Start Command: `pnpm start:api`
- `MUSUNIL_RUNTIME_ENV=production`
- `DATABASE_URL`, `REDIS_URL`은 Render 관리형 Postgres/Key Value에서 주입
- `MUSUNIL_INTERNAL_API_KEY`, `MUSUNIL_USER_TOKEN_SECRET`, `MUSUNIL_ENCRYPTION_KEY`는 Render generated value
- `MUSUNIL_USER_INPUTS_B64`는 API 서비스에만 입력

## 4. Cloudflare

Cloudflare에는 Render Dashboard가 보여주는 custom-domain target을 그대로 사용한다.
복사 가능한 최신 DNS 템플릿은 아래 명령으로 생성한다.

```bash
# Render Dashboard에서 복사한 실제 target을 두 환경변수에 먼저 export한다.
: "${MUSUNIL_RENDER_WEB_DNS_TARGET:?set exact Render Web target from Render first}"
: "${MUSUNIL_RENDER_API_DNS_TARGET:?set exact Render API target from Render first}"
pnpm cloudflare:dns
pnpm cloudflare:check:strict
```

Cloudflare API token을 쓰는 경우에는 수동 Dashboard 입력 대신 아래처럼 먼저 dry-run을 보고 적용한다.

```bash
: "${CLOUDFLARE_API_TOKEN:?set Cloudflare API token first}"
: "${CLOUDFLARE_ZONE_ID:?set Cloudflare zone id first}"
pnpm cloudflare:apply -- --dns
pnpm cloudflare:apply -- --dns --apply
pnpm cloudflare:apply -- --headers
pnpm cloudflare:apply -- --headers --apply
pnpm cloudflare:check:strict
```

| Name | Type | Target | Proxy |
|---|---|---|---|
| `musunil.com` | CNAME 또는 Render가 안내한 apex 방식 | Render `musunil-web` target | strict header 검증 전까지 DNS only 권장 |
| `www` | CNAME | `musunil.com` 또는 Render `musunil-web` target | Web과 동일 |
| `api` | CNAME | Render `musunil-api` target | `/health`, `/ready`, CORS, media smoke 통과 전까지 DNS only 권장 |

Render Static Site Headers가 계속 live 응답에 반영되지 않으면 `pnpm cloudflare:headers`를 실행하고, `docs/cloudflare-response-headers.md`의 Dashboard Rule 또는 Terraform 예시를 Web 레코드에만 적용한다. 이 rule은 Cloudflare proxied Web 레코드에서만 동작한다. API 레코드는 smoke 통과 전까지 DNS only를 유지한다.

프록시를 켠 뒤에는 HTML, config, build-info, static manifest에 캐시 우회가 적용되는지 다시 검증한다.

## 5. 사용자 입력 우선순위

사용자가 마지막에 채워야 하는 값은 아래 순서로 처리한다.

1. 운영 연락처: `app.support_email`, `organization.*`
2. 원본 영상 저장: `storage.*`, `security.media_encryption_key`
3. 비식별 처리: `redaction.engine_smoke_command`
4. 모바일 현장성 검증: Android Play Integrity 또는 iOS App Attest
5. 본인확인: `identity.portone_*`
6. 법안 원천: `public_data_sources.national_assembly_bill_api_key` 또는 `public_data_sources.law_go_kr_oc`
7. 후원/PG: 개인사업자 계좌와 PG 계약 완료 후 `payments.*`

개인 계좌 공개, 세액공제 가능한 기부금 영수증, 후원자 우대 노출은 국내 v1 범위가 아니다.

## 6. 검증 순서

```bash
pnpm launch:cutover-rehearsal
pnpm ops:diagnose
pnpm launch:verify-inputs config/musunil.user-inputs.local.yaml
pnpm config:encode -- --check config/musunil.user-inputs.local.yaml
pnpm launch:ready -- config/musunil.user-inputs.local.yaml --post-laws
pnpm render:api-settings
pnpm render:web-settings
# Render Dashboard에서 복사한 실제 target을 두 환경변수에 먼저 export한다.
: "${MUSUNIL_RENDER_WEB_DNS_TARGET:?set exact Render Web target from Render first}"
: "${MUSUNIL_RENDER_API_DNS_TARGET:?set exact Render API target from Render first}"
pnpm cloudflare:dns
pnpm cloudflare:check:strict
```

`pnpm ops:diagnose`의 `requiredActions`가 남아 있으면 실제 storage/redaction/mobile identity smoke를 실행하기 전에 해당 값을 먼저 채운다.

Render custom domain, Cloudflare DNS, Render Static headers를 적용한 뒤:

```bash
MUSUNIL_WEB_BASE_URL=https://musunil.com \
MUSUNIL_EXPECTED_API_BASE_URL=https://api.musunil.com \
MUSUNIL_EXPECTED_COMMIT_SHA=$(git rev-parse HEAD) \
pnpm check:web-deploy

MUSUNIL_STRICT_WEB_HEADERS=1 \
MUSUNIL_WEB_BASE_URL=https://musunil.com \
MUSUNIL_EXPECTED_API_BASE_URL=https://api.musunil.com \
MUSUNIL_EXPECTED_COMMIT_SHA=$(git rev-parse HEAD) \
pnpm check:web-deploy

pnpm launch:post-deploy-smoke -- --require-laws

MUSUNIL_WEB_BASE_URL=https://musunil.com \
MUSUNIL_API_BASE_URL=https://api.musunil.com \
MUSUNIL_EXPECTED_API_BASE_URL=https://api.musunil.com \
MUSUNIL_EXPECTED_COMMIT_SHA=$(git rev-parse HEAD) \
pnpm service:watch -- --once

pnpm check:visual-surface:live

MUSUNIL_WEB_BASE_URL=https://musunil.com \
MUSUNIL_API_BASE_URL=https://api.musunil.com \
MUSUNIL_EXPECTED_API_BASE_URL=https://api.musunil.com \
pnpm service:watch:visual

MUSUNIL_WEB_BASE_URL=https://musunil.com \
MUSUNIL_API_BASE_URL=https://api.musunil.com \
MUSUNIL_EXPECTED_API_BASE_URL=https://api.musunil.com \
MUSUNIL_EXPECTED_COMMIT_SHA=$(git rev-parse HEAD) \
pnpm launch:final-gate
```

Production `musunil.com` 기준 최종 판정 전에는 strict 리허설로 현재 blocker stage를 확인하고, 최종 판정은 `pnpm launch:final-gate`로 한다. 위처럼 환경변수를 쓰는 형태는 staging/preview 도메인이나 특정 commit 검증을 override할 때만 사용한다.

```bash
pnpm launch:cutover-rehearsal -- --strict
pnpm launch:final-gate
```

## 7. 완료 판정

출시 직전 S+ 운영 준비는 아래가 모두 현재 증거로 통과해야 한다.

- `pnpm launch:final-gate`가 실제 운영 Web/API URL 기준으로 통과한다.
- Live static manifest가 현재 repo 산출물과 일치한다.
- Live `config.js`의 `apiBaseUrl`이 `https://api.musunil.com`이다.
- `pnpm check:visual-surface:live`가 실제 운영 도메인에서 통과한다.
- `pnpm service:watch:visual`의 `web_runtime_config`와 `web_visual_surface`가 ok이고 detail 또는 scenarios의 `serviceSyncState`가 `live`다.
- live 홈 첫 카드와 API `/home.issueCards[0]`가 공개자료 묶음이 아니라 실제 주제형 Issue다.
- Strict Web header check가 no-store, CSP, Permissions, Referrer, nosniff, frame 방어까지 통과한다.
- `api.musunil.com`이 HTTPS로 resolve되고 `/ready`가 `ready=true`다.
- 공개 payload에 사용자 원문, 정밀 GPS, storage key, identity hash가 없다.
- 쓰기 endpoint는 본인확인 세션 없이는 `identity_required`를 반환한다.
- 법안 탭은 공식 ingest 전 빈 목록이거나 국회/법제처 공식 원천 항목만 노출한다.
