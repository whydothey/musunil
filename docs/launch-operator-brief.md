# Launch Operator Brief

이 문서는 마지막 운영 연결 단계에서 사람이 Render/Cloudflare/Secret 입력을 할 때 보는 단일 브리프다. 여기 나온 값만 기준으로 맞추고, 완료 판단은 `pnpm launch:final-gate` 통과로만 한다.

> 실제 Render/Cloudflare 화면을 열기 직전에는 반드시 `pnpm launch:operator-brief -- --refresh`를 다시 실행한다. 이 파일은 마지막 생성 시점의 스냅샷이며, 오래된 Git SHA나 blocker 상태를 출시 판단 증거로 쓰지 않는다.

## Current State

- Generated: 2026-07-12T00:46:08.498Z
- Git SHA: fab138be13aeb8cc25d2b288f1a69fcfb1c7421a
- Refresh command: `pnpm launch:operator-brief -- --refresh`
- Active goal: active
- Launch readiness: blocked
- Stage: connect_api_endpoint
- Release blocked: yes
- Service watch: 2026-07-12T00:45:33.259Z (fresh)
- Checks: 4 ok, 3 fail, 12 skip, 4 actions
- Next command: `pnpm render:api-settings && pnpm cloudflare:dns && pnpm cloudflare:check`

## What To Do Now

1. connect_api_endpoint (operator)
   - Action: pnpm render:api-settings와 pnpm cloudflare:dns 출력대로 Render musunil-api 설정과 환경변수를 확인한다. Custom Domains에 api.musunil.com을 추가하고, Render가 표시한 target을 Cloudflare DNS의 api 레코드에 DNS only로 연결한다.
   - Verify: `pnpm render:api-settings && pnpm cloudflare:dns && pnpm cloudflare:check && pnpm launch:final-gate`
   - Reference: docs/launch-cutover-runbook.md#3-render-api
2. apply_static_headers (operator)
   - Action: pnpm render:web-settings 출력의 Header application mode를 먼저 확인한다. 수동 Static Site이면 Render musunil-web Settings > Headers에 Cache-Control, CSP, Permissions-Policy, Referrer-Policy, nosniff, X-Frame-Options를 그대로 입력하고 Clear build cache & deploy를 실행한다. Render headers가 live 응답에 계속 반영되지 않거나 Cloudflare proxy가 켜져 있으면 pnpm cloudflare:headers로 생성되는 Web 전용 Response Header Transform Rule을 적용하고 /, /config.js, /build-info.json 캐시 우회도 확인한다.
   - Verify: `pnpm render:web-settings && pnpm cloudflare:headers && pnpm cloudflare:check && MUSUNIL_STRICT_WEB_HEADERS=1 MUSUNIL_WEB_BASE_URL=https://musunil.com MUSUNIL_EXPECTED_API_BASE_URL=https://api.musunil.com pnpm check:web-deploy`
   - Reference: docs/launch-cutover-runbook.md#2-render-static-site
3. publish_build_metadata (operator)
   - Action: Static manifest hash로 최신 UI는 확인됐지만 build-info가 placeholder다. Render musunil-web Build Command가 pnpm build:web-static:render인지 확인한다. 이 단일 명령은 MUSUNIL_WRITE_BUILD_INFO=1로 실제 Git SHA를 쓰며, 수정 후 Clear build cache & deploy를 실행한다.
   - Verify: `pnpm render:web-settings && MUSUNIL_WEB_BASE_URL=https://musunil.com MUSUNIL_EXPECTED_API_BASE_URL=https://api.musunil.com MUSUNIL_EXPECTED_COMMIT_SHA=$(git rev-parse HEAD) pnpm check:web-deploy`
   - Reference: docs/launch-readiness-checklist.md
4. stop_live_visual_surface_regression (lead)
   - Action: 실제 musunil.com이 live issue feed를 받지 못하고 있다. API DNS/CORS/Web config와 `/home.issueCards` 연결을 고쳐 `serviceSyncState=live`이고 홈 이슈 3개 이상이 렌더링될 때까지 배포 승급을 중단한다.
   - Verify: `pnpm launch:final-gate`
   - Reference: docs/launch-cutover-runbook.md#3-render-api

## Render Web Static Site

- Service: `musunil-web`
- Branch: `main`
- Root Directory: blank
- Build Command: `corepack enable && pnpm install --frozen-lockfile && pnpm build:web-static:render`
- Publish Directory: `apps/web`
- Static Web에는 DB/Redis, 사용자 입력 YAML, token secret, encryption key, internal API key를 넣지 않는다.

Environment variables:
- `NODE_VERSION`: `24`
- `MUSUNIL_RUNTIME_ENV`: `production`

Headers to copy into Render Dashboard when this is a manual Static Site:
- Path: `/*`
  - Name: `Cache-Control`
  - Value:
    ```text
    no-store
    ```
- Path: `/*`
  - Name: `Content-Security-Policy`
  - Value:
    ```text
    default-src 'self'; connect-src 'self' https:; img-src 'self' data: blob: https:; media-src 'self' https: blob:; script-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net https://cdn.portone.io; style-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net; worker-src 'self' blob:
    ```
- Path: `/*`
  - Name: `Permissions-Policy`
  - Value:
    ```text
    camera=(self), microphone=(), geolocation=(self)
    ```
- Path: `/*`
  - Name: `Referrer-Policy`
  - Value:
    ```text
    no-referrer
    ```
- Path: `/*`
  - Name: `X-Content-Type-Options`
  - Value:
    ```text
    nosniff
    ```
- Path: `/*`
  - Name: `X-Frame-Options`
  - Value:
    ```text
    DENY
    ```

Header application mode:
- Manual Static Site: open Render musunil-web > Settings > Headers and copy every header rule below. render.yaml does not sync into a manually created Static Site.
- Blueprint-managed service: sync render.yaml and confirm the musunil-web headers section is applied by Render.

## Render API Service

- Service: `musunil-api`
- Branch: `main`
- Root Directory: blank
- Runtime: `node`
- Region: `singapore`
- Plan: `starter`
- Build Command: `corepack enable && pnpm install --frozen-lockfile && pnpm check && pnpm build:web-config && pnpm launch:check`
- Pre Deploy Command: `pnpm db:migrate`
- Start Command: `pnpm start:api`
- Health Check Path: `/ready`
- Custom Domain: `api.musunil.com`

Environment source summary:
- Fixed:
  - `NODE_VERSION=24`
  - `MUSUNIL_RUNTIME_ENV=production`
- Render generated:
  - `MUSUNIL_INTERNAL_API_KEY`
  - `MUSUNIL_USER_TOKEN_SECRET`
  - `MUSUNIL_ENCRYPTION_KEY`
- Render managed:
  - `DATABASE_URL <- Render Postgres musunil-postgres connectionString`
  - `REDIS_URL <- Render Key Value musunil-redis connectionString`
- Operator input:
  - `MUSUNIL_USER_INPUTS_B64`

## Cloudflare

Render Dashboard가 보여주는 custom-domain target을 그대로 복사한다. API는 smoke 통과 전까지 DNS only가 안전하다.

DNS template: `pnpm cloudflare:dns` -> `docs/cloudflare-dns-records.md`, `infra/cloudflare/dns-records.tf.example`

Web headers fallback:

- Render Static Site Headers가 live 응답에 반영되지 않으면 `pnpm cloudflare:headers`로 Cloudflare Response Header Transform Rule 템플릿을 갱신한다.
- Web 레코드가 Cloudflare proxied 상태일 때만 Cloudflare response header rule이 적용된다.
- API 레코드는 `/health`, `/ready`, CORS, media smoke 통과 전까지 DNS only를 유지한다.

- `musunil.com`: CNAME or Render-supported apex record -> Render musunil-web custom-domain target shown in Render. Proxy: DNS only when Render headers are applied directly; proxied if using the Cloudflare response header rule, with cache bypass confirmed.
- `www`: CNAME -> musunil.com or the Render musunil-web custom-domain target. Proxy: same as musunil.com.
- `api`: CNAME -> Render musunil-api custom-domain target shown in Render. Proxy: DNS only until /health, /ready, CORS, and media smoke pass.

Cache rules:
- Do not cache /, /config.js, /build-info.json, or /static-manifest.json.
- Do not transform HTML, JS, JSON, poster, or video responses before launch verification.
- After proxying is enabled, rerun strict web headers and service watch.

## User Inputs

사용자가 마지막에 채울 값의 우선순위다. Static Web에는 secret을 넣지 않고, API/Secret File에만 주입한다.

- app.support_email
- organization.legal_name/operator_name/privacy_officer_*/location_info_manager_*
- storage.* and security.media_encryption_key
- redaction.engine_smoke_command
- mobile Android Play Integrity or iOS App Attest credentials
- identity.portone_store_id / identity channel key / identity API secret
- public_data_sources.national_assembly_bill_api_key or public_data_sources.law_go_kr_oc
- payments.* only after individual business account and PG contract are ready

## Verification

- pnpm launch:verify-inputs config/musunil.user-inputs.local.yaml
- pnpm config:encode -- --check config/musunil.user-inputs.local.yaml
- pnpm launch:ready -- config/musunil.user-inputs.local.yaml --post-laws
- pnpm render:api-settings
- pnpm render:web-settings
- pnpm cloudflare:dns
- pnpm cloudflare:headers
- Apply Render custom domains, Cloudflare DNS, and Render Static headers or the Web-only Cloudflare response header fallback.
- pnpm cloudflare:check
- MUSUNIL_WEB_BASE_URL=https://musunil.com MUSUNIL_EXPECTED_API_BASE_URL=https://api.musunil.com MUSUNIL_EXPECTED_COMMIT_SHA=$(git rev-parse HEAD) pnpm check:web-deploy
- MUSUNIL_STRICT_WEB_HEADERS=1 MUSUNIL_WEB_BASE_URL=https://musunil.com MUSUNIL_EXPECTED_API_BASE_URL=https://api.musunil.com MUSUNIL_EXPECTED_COMMIT_SHA=$(git rev-parse HEAD) pnpm check:web-deploy
- pnpm check:visual-surface:live
- pnpm launch:post-deploy-smoke -- --require-laws
- MUSUNIL_WEB_BASE_URL=https://musunil.com MUSUNIL_API_BASE_URL=https://api.musunil.com MUSUNIL_EXPECTED_API_BASE_URL=https://api.musunil.com MUSUNIL_EXPECTED_COMMIT_SHA=$(git rev-parse HEAD) pnpm service:watch:visual
- pnpm launch:final-gate

## Success Criteria

- Final launch gate exits 0 with live post-deploy smoke and refreshed strict blocker checks.
- Live static manifest matches the current repo output.
- Live config.js apiBaseUrl matches https://api.musunil.com.
- Live visual surface smoke passes on musunil.com across 390px, 430px, 768px, and 1440px.
- Integrated service watch passes with web_runtime_config ok, web_visual_surface ok, serviceSyncState=live, and at least 3 rendered topic issue cards.
- Strict Web header check passes with no-store, CSP, Permissions-Policy, Referrer-Policy, nosniff, and frame protection on /, /config.js, and /build-info.json.
- api.musunil.com resolves over HTTPS and /ready is ready=true.
- Public payloads expose no raw user text, private GPS, storage keys, identity hashes, or forbidden engagement surfaces.
- Write endpoints return identity_required without a verified identity session.
- Laws endpoint is empty before official ingest or contains only official National Assembly/Law.go.kr sourced items.
