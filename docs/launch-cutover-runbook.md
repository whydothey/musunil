# Launch Cutover Runbook

이 문서는 `musunil.com`을 실제 공개 서비스로 넘길 때 마지막에 사람이 입력해야 하는 값을 한곳에 모은다. 세부 값은 `render.yaml`과 `config/musunil.user-inputs.local.yaml`을 기준으로 하며, 복사 가능한 최신 출력은 항상 아래 명령을 먼저 본다.

```bash
pnpm launch:handoff
pnpm ci:status
pnpm launch:cutover-rehearsal
pnpm launch:blockers
pnpm launch:cutover-plan
pnpm launch:apply
pnpm render:api-settings
pnpm render:web-settings
pnpm render:apply
pnpm cloudflare:dns
pnpm cloudflare:headers
pnpm cloudflare:apply
pnpm cloudflare:check
```

`pnpm launch:handoff`는 live blocker를 한 번만 갱신하고 [launch-operator-brief.md](/Users/mk/Documents/Musunil/docs/launch-operator-brief.md)와 [launch-missing-inputs.md](/Users/mk/Documents/Musunil/docs/launch-missing-inputs.md)를 같은 blocker report 기준으로 다시 쓴다. Render/Cloudflare 화면을 열기 직전에는 반드시 이 명령을 먼저 실행한다. 기존 파일의 오래된 Git SHA나 blocker 상태는 출시 판단 증거가 아니다.
`pnpm ci:status`는 현재 Git SHA의 GitHub Actions `ci.yml` run을 조회한다. `queued`는 GitHub가 workflow를 받았지만 runner를 아직 배정하지 않은 상태이며 코드 실패가 아니다. 이 명령이 출력한 watch 명령으로 최종 `completed/success`를 확인한 뒤 Render/Cloudflare 적용으로 넘어간다.
GitHub Actions `post-deploy` 수동 workflow는 live 검증 전에 `pnpm check:web-render-build-command`를 먼저 실행한다. 따라서 배포 직후 원격 검증도 현재 커밋의 Render Static build contract와 live Web 검증을 같은 run에서 확인한다.
`pnpm launch:apply`는 기본 dry-run이다. 출력의 `operatorInputs`와 `requiredEnv`가 마지막에 채워야 할 값이며, 핵심 묶음은 `RENDER_API_TOKEN` 또는 `MUSUNIL_RENDER_API_DNS_TARGET`, `CLOUDFLARE_API_TOKEN`이다. `RENDER_API_TOKEN`이 있으면 Render 서비스의 `onrender.com` target을 API에서 파생하고, `CLOUDFLARE_API_TOKEN`과 `--apply`가 있을 때 Render custom domain, Render Web headers, Cloudflare DNS를 한 번에 적용한다. Cloudflare zone은 기본적으로 `musunil.com` 이름으로 조회하며, token 권한 때문에 조회가 실패할 때만 `CLOUDFLARE_ZONE_ID`를 추가한다. Render headers가 live에 계속 반영되지 않을 때는 `pnpm cloudflare:check`에서 `web_proxy_mode.proxyObserved=true`를 확인한 뒤 `--cloudflare-headers-only`를 추가해 Web 전용 Cloudflare response header fallback만 적용할 수 있다. 이 경로는 Render target을 요구하지 않는다.
`pnpm render:apply`는 기본 dry-run이다. `RENDER_API_TOKEN`이 있을 때 `--apply --web-headers` 또는 `--apply --api-domain`을 붙이면 Render API로 `musunil-web` Headers와 `musunil-api` custom domain을 생성/갱신한다. 이 명령은 Render env var나 secret file을 교체하지 않는다.
`pnpm cloudflare:dns`는 Render custom-domain target을 입력할 Cloudflare DNS 레코드 템플릿을 [cloudflare-dns-records.md](/Users/mk/Documents/Musunil/docs/cloudflare-dns-records.md)와 [dns-records.tf.example](/Users/mk/Documents/Musunil/infra/cloudflare/dns-records.tf.example)에 생성한다. Render target을 복사한 뒤 `MUSUNIL_RENDER_WEB_DNS_TARGET`, `MUSUNIL_RENDER_API_DNS_TARGET`을 로컬 셸에 넣으면 git-ignored local copy와 strict CNAME 검증도 함께 쓸 수 있다.
`pnpm cloudflare:headers`는 Render Static headers가 live에 적용되지 않을 때 쓸 Cloudflare Response Header Transform Rule 템플릿을 [cloudflare-response-headers.md](/Users/mk/Documents/Musunil/docs/cloudflare-response-headers.md)와 [response-headers.tf.example](/Users/mk/Documents/Musunil/infra/cloudflare/response-headers.tf.example)에 생성한다.
`pnpm cloudflare:apply`는 기본 dry-run이다. `CLOUDFLARE_API_TOKEN`, Render target env가 있을 때 `--apply --dns` 또는 `--apply --headers`를 붙이면 Cloudflare API로 DNS Records와 Response Header Transform Rule을 생성/갱신한다. Zone name 조회 권한이 없을 때만 `CLOUDFLARE_ZONE_ID`를 fallback으로 넣는다.

## 1. 현재 차단 항목

2026-07-12 21:15 KST live 감시 기준으로 `web_static_manifest`, `web_runtime_config`, `web_forbidden_ui_absent`는 통과했고, `config.js`도 `https://api.musunil.com`을 가리킨다. 하지만 출시 차단 항목은 아직 남아 있다. `web_build_info`는 placeholder, `web_header_contract`는 보안 헤더 미적용, `web_visual_surface`는 `serviceSyncState=delayed`, `api_endpoint_preflight`는 `api.musunil.com` DNS 미연결 상태다.

출시 직전 완료 전까지 남는 차단 항목은 아래 순서로 처리한다.

| 우선순위 | 항목 | 현재 증거 | 해야 할 일 | 검증 |
|---|---|---|---|---|
| 1 | API DNS | `api_endpoint_preflight` 실패: `getaddrinfo ENOTFOUND api.musunil.com` | `pnpm launch:apply` 출력대로 Render/Cloudflare token과 서비스 target 상태를 확인한다. Render API token과 Cloudflare token이 있으면 `pnpm launch:apply -- --apply`가 `api.musunil.com` custom domain 생성, Render `onrender.com` target 파생, Cloudflare DNS 적용을 한 번에 처리한다. Render token 없이 Dashboard target을 직접 복사한 경우에는 `MUSUNIL_RENDER_API_DNS_TARGET`와 `CLOUDFLARE_API_TOKEN`만 넣고 같은 명령을 실행한다. 이때 `renderSkippedReason=manual_api_dns_target_without_render_token`이면 Render API write는 건너뛰고 Cloudflare `api` CNAME만 DNS only로 적용한다. | `pnpm launch:apply && pnpm launch:blockers -- --refresh` |
| 2 | Static headers | `/`, `/config.js`, `/build-info.json`에 CSP, Permissions, Referrer, nosniff, X-Frame-Options가 없고 Cache-Control이 `no-store`가 아니다. | `pnpm launch:apply` 출력대로 Render Web header 적용 계획을 확인한다. Render API token이 있으면 `pnpm launch:apply -- --apply --deploy-web`으로 Headers를 적용하고 배포까지 요청한다. Render headers가 live 응답에 계속 반영되지 않거나 Cloudflare token만 먼저 쓸 수 있으면 `pnpm cloudflare:check`에서 `web_proxy_mode.proxyObserved=true`를 확인한 뒤 `pnpm launch:apply -- --apply --cloudflare-headers-only`로 Web 전용 Response Header Transform Rule만 추가한다. | `pnpm launch:apply -- --cloudflare-headers-only && pnpm cloudflare:check && MUSUNIL_STRICT_WEB_HEADERS=1 MUSUNIL_WEB_BASE_URL=https://musunil.com MUSUNIL_EXPECTED_API_BASE_URL=https://api.musunil.com pnpm check:web-deploy` |
| 3 | Build metadata | `build-info.json`은 placeholder지만 static manifest hash로 최신 UI 파일은 확인됐다. | Render Dashboard를 바꾸기 전 `pnpm check:web-render-build-command`로 실제 Render build contract를 로컬에서 먼저 통과시킨다. 그 다음 Render가 `pnpm build:web-static:render` output을 publish하는지 확인한다. 정적 해시만 확인하는 진단은 `MUSUNIL_ALLOW_PLACEHOLDER_BUILD_INFO=1`로 따로 실행할 수 있지만, 출시 검증은 실제 commit SHA가 build-info에 있어야 통과한다. | `pnpm check:web-render-build-command && MUSUNIL_WEB_BASE_URL=https://musunil.com MUSUNIL_EXPECTED_API_BASE_URL=https://api.musunil.com MUSUNIL_EXPECTED_COMMIT_SHA=$(git rev-parse HEAD) pnpm check:web-deploy` |
| 4 | Live issue data sync | `web_visual_surface` 실패: 화면 구조는 렌더링되지만 `serviceSyncState=delayed`이며 최신 첫 이슈는 `정보통신망법 개정 관련 집회`, source bundle first는 `0/4`다. | API DNS, CORS, `/ready`, public payload가 연결되어 Web이 live 상태로 동기화되게 한다. API 연결 뒤 `/home.issueCards`는 실제 주제형 Issue를 3개 이상 포함하고 첫 항목이 공개자료 묶음이면 안 된다. | `pnpm launch:final-gate` |

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
pnpm render:apply -- --web-headers
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
- Publish Directory: `apps/web/dist`
- Environment Variables: `NODE_VERSION=24`, `MUSUNIL_RUNTIME_ENV=production`만 둔다. Static Web에는 DB/Redis URL, 사용자 입력 YAML, token secret, encryption key, internal API key를 넣지 않는다.
- Headers: `Cache-Control`, `Content-Security-Policy`, `Permissions-Policy`, `Referrer-Policy`, `X-Content-Type-Options`, `X-Frame-Options`
- Portable Headers File: `apps/web/public/_headers`. `pnpm build:web-static`이 `render.yaml`의 `musunil-web.headers`에서 생성하고 Vite가 `apps/web/dist/_headers`로 복사한다. Cloudflare Pages/Netlify류 정적 호스트에서는 이 파일을 사용할 수 있지만, Render 수동 Static Site에서는 Dashboard Headers 입력을 대체하지 않는다.
- Render API token이 있으면 `RENDER_API_TOKEN=... pnpm render:apply -- --web-headers --apply`로 Headers를 적용할 수 있다.

주의:

- Web `config.js`에는 `apiBaseUrl`, `mapStyleUrl`만 공개한다.
- Web `config.js`의 `apiBaseUrl`은 `https://api.musunil.com`이어야 한다.
- `/`, `/config.js`, `/build-info.json`, `/static-manifest.json`은 캐시된 구버전이 나오면 안 된다.
- `/`, `/config.js`, `/build-info.json`은 `Cache-Control: no-store`, CSP, `Permissions-Policy`, `Referrer-Policy: no-referrer`, `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`가 실제 응답에 있어야 한다.
- Static hash가 현재 repo 산출물과 다르면 최신 UI 배포로 인정하지 않는다.

## 3. Render API

`musunil-api`는 Blueprint 기준으로 만든다. 수동 생성 시에도 아래 계약을 지킨다.

```bash
pnpm render:provisioning-plan
pnpm render:api-settings
pnpm render:apply -- --api-domain
```

- Blueprint Path: `render.backend.yaml`
- 기존 `musunil-web`은 현재 수동 Static Site로 유지하며 백엔드 Blueprint에 포함하지 않는다.
- Blueprint 미리보기에는 `musunil-api`, `musunil-postgres`, `musunil-ops-scheduler`, `musunil-redis`만 있어야 한다. 접미사가 붙은 Web 복제본이 보이면 배포하지 않는다.
- 예상 최소 비용은 월 USD 14이며 cron 실행량, DB 스토리지, 대역폭, 빌드 초과분과 세금은 별도다.

- Health Check Path: `/ready`
- Build Command: `pnpm check`, `pnpm build:web-config`, `pnpm launch:check` 포함
- Pre Deploy Command: `pnpm db:migrate`
- Start Command: Dockerfile `pnpm db:migrate && pnpm start:api` (Render Free에서도 시작 전 마이그레이션 실행)
- `MUSUNIL_RUNTIME_ENV=production`
- `DATABASE_URL`, `REDIS_URL`은 Render 관리형 Postgres/Key Value에서 주입
- `MUSUNIL_INTERNAL_API_KEY`, `MUSUNIL_USER_TOKEN_SECRET`, `MUSUNIL_ENCRYPTION_KEY`는 Render generated value
- `MUSUNIL_USER_INPUTS_FILE_PATH=/etc/secrets/musunil.user-inputs.yaml`은 API와 scheduler에 고정
- `pnpm render:runtime-secret` dry-run 뒤, `MUSUNIL_RENDER_SECRET_APPLY_CONFIRM=APPLY_RUNTIME_SECRET_FILE` 확인을 넣어 같은 Secret File을 API와 scheduler에 업로드
- Render API token이 있으면 `RENDER_API_TOKEN=... pnpm render:apply -- --api-domain --apply`로 `api.musunil.com` custom domain을 생성할 수 있다. DNS 적용 뒤 `pnpm render:apply -- --api-domain --verify-domains --apply`로 Render verification을 요청한다.

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
: "${RENDER_API_TOKEN:?set Render API token first}"
: "${CLOUDFLARE_API_TOKEN:?set Cloudflare API token first}"
pnpm launch:apply
pnpm launch:apply -- --apply
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
pnpm ci:status
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

pnpm sources:refresh-preflight
pnpm launch:post-deploy-smoke -- --require-laws --require-source-refreshes

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

Production `musunil.com` 기준 최종 판정 전에는 strict 리허설로 현재 blocker stage를 확인하고, 최종 판정은 `pnpm launch:final-gate`로 한다. 이 최종 게이트는 공개 원천 preflight 뒤 `pnpm cloudflare:check:strict`를 실행해 Web header와 API CNAME target까지 같은 흐름에서 차단한다. 위처럼 환경변수를 쓰는 형태는 staging/preview 도메인이나 특정 commit 검증을 override할 때만 사용한다.

로컬 셸 없이 배포 직후 확인해야 하면 GitHub Actions `post-deploy` 수동 workflow를 실행한다. Render Web만 확인할 때는 `web-deploy`, Web/API/DNS/Header/원천까지 최종 확인할 때는 `final-gate`를 선택한다. `pnpm launch:post-deploy-workflow`는 현재 Git SHA와 production 기본 URL 기준으로 복사 가능한 `gh workflow run post-deploy.yml` 명령을 생성하고, workflow/branch/commit이 일치하는 `workflow_dispatch` run id를 찾아 감시하는 명령까지 출력한다. `github_environment`는 기본 `production`이며, 이 job environment가 repository/environment secret `RENDER_API_TOKEN` 또는 `MUSUNIL_RENDER_API_TOKEN`, `MUSUNIL_INTERNAL_API_KEY`를 읽어 Render target 파생과 공개 원천 refresh 회복에 쓴다. `final-gate`에서 Render API token을 workflow secret으로 쓰지 않는 경우에는 Render `musunil-api > Custom Domains > api.musunil.com`의 DNS target hostname을 `render_api_dns_target` 입력칸에 넣는다. URL, path, dashboard label 없이 hostname만 넣어야 `pnpm cloudflare:check:strict`의 API CNAME 비교가 로컬과 같은 기준으로 돈다.

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
