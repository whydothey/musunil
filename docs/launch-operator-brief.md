# Launch Operator Brief

이 문서는 마지막 운영 연결 단계에서 사람이 Render/Cloudflare/Secret 입력을 할 때 보는 단일 브리프다. 여기 나온 값만 기준으로 맞추고, 완료 판단은 `pnpm launch:final-gate` 통과로만 한다.

> 실제 Render/Cloudflare 화면을 열기 직전에는 반드시 `pnpm launch:operator-brief -- --refresh`를 다시 실행한다. 이 파일은 마지막 생성 시점의 스냅샷이며, 오래된 Git SHA나 blocker 상태를 출시 판단 증거로 쓰지 않는다.

## Current State

- Generated: 2026-07-12T05:12:01.119Z
- Git SHA: e10c4c53347df687ad4e36706c913bb4097e40b1
- Refresh command: `pnpm launch:operator-brief -- --refresh`
- Active goal: active
- Launch readiness: blocked
- Stage: connect_api_endpoint
- Release blocked: yes
- Service watch: 2026-07-12T05:12:15.062Z (fresh)
- Checks: 4 ok, 3 fail, 13 skip, 4 actions
- Before next command: Render API token과 Cloudflare token이 있으면 `pnpm launch:apply -- --apply`가 api.musunil.com custom domain 생성, Render onrender.com target 파생, Cloudflare DNS 적용을 한 번에 처리한다. token이 없으면 dry-run 출력의 requiredEnv만 채우고, 하위 확인은 `pnpm render:api-settings`와 `pnpm cloudflare:dns`를 사용한다.
- Next command: `pnpm launch:apply && pnpm launch:final-gate`

## One Command Apply

- `pnpm launch:apply`는 Render와 Cloudflare 적용 계획을 한 번에 보여주는 dry-run이다.
- 출력의 `operatorInputs`와 `requiredEnv`가 마지막에 채워야 할 값이다. 현재 핵심 묶음은 `RENDER_API_TOKEN` 또는 `MUSUNIL_RENDER_API_DNS_TARGET`, `CLOUDFLARE_API_TOKEN`이다.
- `RENDER_API_TOKEN`, `CLOUDFLARE_API_TOKEN`이 있으면 `pnpm launch:apply -- --apply`로 Render custom domain, Render Web headers, Cloudflare DNS를 적용한다. Cloudflare zone은 기본적으로 `musunil.com` 이름으로 조회하며, token 권한 때문에 조회가 실패할 때만 `CLOUDFLARE_ZONE_ID`를 추가한다.
- Render API에서 서비스 URL을 읽을 수 있으면 Cloudflare DNS target은 Render `onrender.com` host로 자동 전달된다.
- Web header가 계속 live에 반영되지 않을 때는 `pnpm cloudflare:check`에서 `web_proxy_mode.proxyObserved=true`를 먼저 확인하고, `pnpm launch:apply -- --apply --cloudflare-headers-only`로 Web 전용 Cloudflare fallback만 적용할 수 있다. 이 경로는 Render target을 요구하지 않는다.
- Web build metadata까지 새로 반영해야 하면 `pnpm launch:apply -- --apply --deploy-web`을 사용한다.
- 적용 후 완료 판정은 항상 `pnpm launch:final-gate`다.

Required launch inputs from current dry-run:

- Mode: `dry_run`
- Required env: `RENDER_API_TOKEN or MUSUNIL_RENDER_API_DNS_TARGET`, `CLOUDFLARE_API_TOKEN`

| ID | Required | Status | Env | Purpose |
|---|---|---|---|---|
| render_target_source | one_of | missing | RENDER_API_TOKEN<br>MUSUNIL_RENDER_API_DNS_TARGET<br>alt:MUSUNIL_RENDER_API_TOKEN | Choose one source for the Render API onrender.com target used by api.musunil.com |
| render_api_token | no | missing_for_auto_target_derivation | RENDER_API_TOKEN<br>alt:MUSUNIL_RENDER_API_TOKEN<br>alt:MUSUNIL_RENDER_API_DNS_TARGET | Render service lookup, custom domain/header apply, and onrender.com target derivation |
| render_service_identity | no | optional_by_exact_service_name | MUSUNIL_RENDER_WEB_SERVICE_ID<br>MUSUNIL_RENDER_API_SERVICE_ID<br>alt:MUSUNIL_RENDER_WEB_SERVICE_NAME=musunil-web<br>alt:MUSUNIL_RENDER_API_SERVICE_NAME=musunil-api | Use exact Render service IDs when service-name lookup is ambiguous |
| cloudflare_api_token | yes | missing | CLOUDFLARE_API_TOKEN<br>alt:CF_API_TOKEN | Create or update Cloudflare DNS records and optional response header rule |
| cloudflare_zone | no | default_zone_name_lookup | CLOUDFLARE_ZONE_ID<br>alt:CF_ZONE_ID<br>alt:CLOUDFLARE_ZONE_NAME=musunil.com | Optional fallback when the Cloudflare token cannot resolve the musunil.com zone by name |
| render_api_dns_target | no | missing_manual_fallback | MUSUNIL_RENDER_API_DNS_TARGET<br>alt:RENDER_API_TOKEN | Manual fallback CNAME target for api.musunil.com when Render API target derivation is unavailable |
| render_web_dns_target | no | not_required_for_current_request | MUSUNIL_RENDER_WEB_DNS_TARGET<br>alt:RENDER_API_TOKEN | Manual fallback CNAME target for musunil.com when a Web DNS record is being applied |

Split apply paths from current blockers:

- web_headers_only: Render target/API DNS 없이 Web 보안 헤더 blocker만 먼저 줄인다. Cloudflare Response Header Transform Rule은 proxied Web record에서만 실제 응답에 적용된다. 최종 출시는 API DNS와 live API sync가 별도로 통과해야 한다.
  - Requires: `CLOUDFLARE_API_TOKEN`, `Cloudflare proxied Web record for musunil.com/www`
  - Dry-run: `pnpm launch:apply -- --cloudflare-headers-only`
  - Apply: `pnpm launch:apply -- --apply --cloudflare-headers-only`
  - Verify: `pnpm cloudflare:check && MUSUNIL_STRICT_WEB_HEADERS=1 MUSUNIL_WEB_BASE_URL=https://musunil.com MUSUNIL_EXPECTED_API_BASE_URL=https://api.musunil.com pnpm check:web-deploy`
- api_dns_and_render_domain: Render API custom domain, api.musunil.com DNS, live API 동기화까지 한 번에 검증하는 주 경로다.
  - Requires: `RENDER_API_TOKEN or MUSUNIL_RENDER_API_DNS_TARGET`, `CLOUDFLARE_API_TOKEN`
  - Dry-run: `pnpm launch:apply`
  - Apply: `pnpm launch:apply -- --apply`
  - Verify: `pnpm launch:final-gate`

## What To Do Now

1. connect_api_endpoint (operator)
   - Action: pnpm launch:apply 출력대로 Render/Cloudflare token과 서비스 target 상태를 확인한다. Render API token과 Cloudflare token이 있으면 pnpm launch:apply -- --apply가 api.musunil.com custom domain 생성, Render onrender.com target 파생, Cloudflare DNS 적용을 한 번에 처리한다. token이 없으면 pnpm render:api-settings와 pnpm cloudflare:dns로 값을 확인한 뒤 Render Dashboard target을 MUSUNIL_RENDER_API_DNS_TARGET에 넣고 Cloudflare DNS의 api 레코드에 DNS only로 연결한다.
   - Verify: `pnpm launch:apply && pnpm launch:final-gate`
   - Reference: docs/launch-cutover-runbook.md#3-render-api
2. apply_static_headers (operator)
   - Action: pnpm launch:apply 출력대로 Render Web header 적용 계획을 확인한다. Render API token이 있으면 pnpm launch:apply -- --apply --deploy-web으로 musunil-web Headers를 적용하고 배포까지 요청한다. Render headers가 live 응답에 계속 반영되지 않거나 Render token 없이 Web header만 먼저 고치려면 pnpm cloudflare:check에서 web_proxy_mode.proxyObserved=true를 확인한 뒤 pnpm launch:apply -- --apply --cloudflare-headers-only로 Web 전용 Response Header Transform Rule만 추가한다.
   - Verify: `pnpm launch:apply -- --cloudflare-headers-only && pnpm cloudflare:check && MUSUNIL_STRICT_WEB_HEADERS=1 MUSUNIL_WEB_BASE_URL=https://musunil.com MUSUNIL_EXPECTED_API_BASE_URL=https://api.musunil.com pnpm check:web-deploy`
   - Reference: docs/launch-cutover-runbook.md#2-render-static-site
3. publish_build_metadata (operator)
   - Action: Static manifest hash로 최신 UI는 확인됐지만 build-info가 placeholder다. Render musunil-web Build Command가 pnpm build:web-static:render인지 확인한다. 이 단일 명령은 MUSUNIL_WRITE_BUILD_INFO=1로 실제 Git SHA를 쓰며, 수정 후 Clear build cache & deploy를 실행한다.
   - Verify: `pnpm render:web-settings && MUSUNIL_WEB_BASE_URL=https://musunil.com MUSUNIL_EXPECTED_API_BASE_URL=https://api.musunil.com MUSUNIL_EXPECTED_COMMIT_SHA=$(git rev-parse HEAD) pnpm check:web-deploy`
   - Reference: docs/launch-readiness-checklist.md
4. stop_live_visual_surface_regression (lead)
   - Action: 실제 musunil.com은 fallback 이슈 피드를 렌더링하지만 live API 동기화가 아니다. API DNS/CORS/Web config와 `/home.issueCards` 연결을 고쳐 `serviceSyncState=live`가 될 때까지 배포 승급을 중단한다.
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

Render API automation:

- `pnpm render:apply`는 기본 dry-run이며 `--apply` 없이는 Render에 쓰지 않는다.
- `RENDER_API_TOKEN`이 있으면 `pnpm render:apply -- --web-headers --apply`로 `musunil-web` Headers를 생성·갱신한다.
- 필요하면 `MUSUNIL_RENDER_WEB_SERVICE_ID`를 넣어 서비스명 조회 대신 정확한 service id를 사용한다.

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

Render API automation:

- `RENDER_API_TOKEN`이 있으면 `pnpm render:apply -- --api-domain --apply`로 `api.musunil.com` custom domain을 생성·확인한다.
- DNS 적용 후에는 `pnpm render:apply -- --api-domain --verify-domains --apply`로 Render verification을 요청할 수 있다.
- 필요하면 `MUSUNIL_RENDER_API_SERVICE_ID`를 넣어 서비스명 조회 대신 정확한 service id를 사용한다.
- 이 자동화는 Render env var나 secret file을 교체하지 않는다.

## Cloudflare

Render Dashboard가 보여주는 custom-domain target을 그대로 복사한다. API는 smoke 통과 전까지 DNS only가 안전하다.
Custom Domains에서 api.musunil.com의 DNS target을 복사해 MUSUNIL_RENDER_API_DNS_TARGET에 넣은 뒤 Cloudflare api 레코드에 적용한다.

DNS template: `pnpm cloudflare:dns` -> `docs/cloudflare-dns-records.md`, `infra/cloudflare/dns-records.tf.example`
Exact target env: `MUSUNIL_RENDER_WEB_DNS_TARGET`, `MUSUNIL_RENDER_API_DNS_TARGET`
Local exact copy: `docs/cloudflare-dns-records.local.md`, `infra/cloudflare/dns-records.local.tfvars`

Web headers fallback:

- Render Static Site Headers가 live 응답에 반영되지 않으면 `pnpm cloudflare:headers`로 Cloudflare Response Header Transform Rule 템플릿을 갱신한다.
- Cloudflare token만 준비된 경우 `pnpm cloudflare:check`에서 `web_proxy_mode.proxyObserved=true`를 확인하고, `pnpm launch:apply -- --cloudflare-headers-only`로 dry-run을 본 뒤 `pnpm launch:apply -- --apply --cloudflare-headers-only`로 Web header rule만 적용한다.
- Web 레코드가 Cloudflare proxied 상태일 때만 Cloudflare response header rule이 적용된다.
- API 레코드는 `/health`, `/ready`, CORS, media smoke 통과 전까지 DNS only를 유지한다.

Cloudflare API automation:

- `pnpm cloudflare:apply`는 기본 dry-run이며 `--apply` 없이는 Cloudflare에 쓰지 않는다.
- `CLOUDFLARE_API_TOKEN`과 Render target env를 넣은 뒤 `pnpm cloudflare:apply -- --dns --apply`와 `pnpm cloudflare:apply -- --headers --apply`를 순서대로 실행할 수 있다. Zone name 조회 권한이 없을 때만 `CLOUDFLARE_ZONE_ID`를 추가한다.
- 적용 후에는 `pnpm cloudflare:check:strict`와 `pnpm launch:final-gate`로만 완료를 판단한다.

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

## Launch Ready Plan

- Input file: `/Users/mk/Documents/Musunil/config/musunil.user-inputs.local.yaml`
- input_validation: `pnpm launch:verify-inputs -- /Users/mk/Documents/Musunil/config/musunil.user-inputs.local.yaml`
- config_encode_check: `pnpm config:encode -- --check /Users/mk/Documents/Musunil/config/musunil.user-inputs.local.yaml`
- render_runtime_config_sample: `pnpm check:render-runtime-config`
- operational_metadata_diagnostics: `pnpm ops:diagnose -- --require-external-smoke-ready`
- external_smoke: `pnpm launch:external-smoke`
- release_check: `pnpm check:release`

## External Smoke Proofs

실제 운영 직전에는 아래 proof marker가 각 명령 출력에 있어야 한다. 이 단계는 mock 성공이나 문서상 준비 상태가 아니라 provider 연결 증거를 요구한다.

- storage: `pnpm storage:smoke`, proof: `storage_put_delete`
- redaction: `pnpm redaction:smoke`, proof: `redaction_engine_smoke`
- mobile_integrity: `pnpm mobile:integrity-smoke`, proof: `mobile_integrity_provider_dry_run`
- identity: `pnpm identity:smoke`, proof: `identity_portone_verified_lookup`
- laws_dry_run: `pnpm sources:laws`, proof: `laws_dry_run`, forbidden: `laws_disabled`

## Verification

- pnpm launch:verify-inputs config/musunil.user-inputs.local.yaml
- pnpm config:encode -- --check config/musunil.user-inputs.local.yaml
- pnpm launch:ready -- config/musunil.user-inputs.local.yaml --post-laws
- pnpm launch:apply
- pnpm render:api-settings
- pnpm render:web-settings
- pnpm render:apply -- --api-domain
- pnpm render:apply -- --web-headers
- : "${MUSUNIL_RENDER_WEB_DNS_TARGET:?set exact Render Web target from Render first}"
- : "${MUSUNIL_RENDER_API_DNS_TARGET:?set exact Render API target from Render first}"
- pnpm cloudflare:dns
- pnpm cloudflare:headers
- Apply Render custom domains, Cloudflare DNS, and Render Static headers or the Web-only Cloudflare response header fallback.
- pnpm cloudflare:check:strict
- MUSUNIL_WEB_BASE_URL=https://musunil.com MUSUNIL_EXPECTED_API_BASE_URL=https://api.musunil.com MUSUNIL_EXPECTED_COMMIT_SHA=$(git rev-parse HEAD) pnpm check:web-deploy
- MUSUNIL_STRICT_WEB_HEADERS=1 MUSUNIL_WEB_BASE_URL=https://musunil.com MUSUNIL_EXPECTED_API_BASE_URL=https://api.musunil.com MUSUNIL_EXPECTED_COMMIT_SHA=$(git rev-parse HEAD) pnpm check:web-deploy
- pnpm check:visual-surface:live
- pnpm sources:refresh-preflight
- pnpm launch:post-deploy-smoke -- --require-laws --require-source-refreshes
- MUSUNIL_WEB_BASE_URL=https://musunil.com MUSUNIL_API_BASE_URL=https://api.musunil.com MUSUNIL_EXPECTED_API_BASE_URL=https://api.musunil.com MUSUNIL_EXPECTED_COMMIT_SHA=$(git rev-parse HEAD) pnpm service:watch:visual
- pnpm launch:final-gate

## Success Criteria

- Final launch gate exits 0 with live post-deploy smoke and refreshed strict blocker checks.
- Live static manifest matches the current repo output.
- Live config.js apiBaseUrl matches https://api.musunil.com.
- Live visual surface smoke passes on musunil.com across 390px, 430px, 768px, and 1440px.
- Integrated service watch passes with web_runtime_config ok, web_visual_surface ok, serviceSyncState=live, and at least 3 rendered topic issue cards.
- Strict Web header check passes with no-store, CSP, Permissions-Policy, Referrer-Policy, nosniff, and frame protection on /, /config.js, and /build-info.json.
- Strict Cloudflare DNS check verifies api.musunil.com resolves to the exact Render API custom-domain target.
- api.musunil.com resolves over HTTPS and /ready is ready=true.
- Public payloads expose no raw user text, private GPS, storage keys, identity hashes, or forbidden engagement surfaces.
- Write endpoints return identity_required without a verified identity session.
- Laws endpoint is empty before official ingest or contains only official National Assembly/Law.go.kr sourced items.
