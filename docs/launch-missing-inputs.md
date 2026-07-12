# Launch Missing Inputs

이 문서는 실제 값을 담지 않는다. 사용자가 마지막에 채울 필드명, 현재 상태, 검증 명령만 보여준다.

## Current Gate

- Generated: 2026-07-12T08:13:22.027Z
- Source: local_file
- Launch state: blocked
- Current stage: connect_api_endpoint
- Release blocked: yes
- Blocker report: 2026-07-12T08:13:21.504Z (0m old, refresh after 15m)
- Report freshness: fresh
- Before next command: 먼저 `pnpm launch:apply` dry-run의 `requiredEnv`와 `operatorInputs`를 채운다. 필수 입력이 비어 있으면 실제 적용과 `pnpm launch:final-gate`를 다음 단계로 안내하지 않는다.
- Next command: `pnpm launch:apply`

## Immediate Apply Inputs

- 아래 값이 없으면 실제 적용이나 final gate를 실행하지 않는다.

- Required env: `RENDER_API_TOKEN or MUSUNIL_RENDER_API_DNS_TARGET`, `CLOUDFLARE_API_TOKEN`

| ID | Required | Status | Env | Purpose |
|---|---|---|---|---|
| render_target_source | one_of | missing | `RENDER_API_TOKEN`<br>`MUSUNIL_RENDER_API_DNS_TARGET`<br>`alt:MUSUNIL_RENDER_API_TOKEN` | Choose one source for the Render API onrender.com target used by api.musunil.com |
| cloudflare_api_token | yes | missing | `CLOUDFLARE_API_TOKEN`<br>`alt:CF_API_TOKEN` | Create or update Cloudflare DNS records and optional response header rule |

## Provider Smoke Inputs

### 원본 영상 저장소

- Status: missing_inputs
- Command: `pnpm storage:smoke`
- Proof marker: `storage_put_delete`

| Field | Status |
|---|---|
| `storage.provider` | configured |
| `storage.bucket` | placeholder |
| `storage.region` | placeholder |
| `storage.access_key_id` | placeholder |
| `storage.secret_access_key` | placeholder |
| `security.media_encryption_key` | placeholder |

### 비식별 엔진

- Status: missing_inputs
- Command: `pnpm redaction:smoke`
- Proof marker: `redaction_engine_smoke`

| Field | Status |
|---|---|
| `redaction.engine_smoke_command` | placeholder |
| `redaction.engine_smoke_command includes {input}` | configured |
| `redaction.engine_smoke_command includes {output}` | configured |

### 모바일 기기 무결성

- Status: missing_inputs
- Command: `pnpm mobile:integrity-smoke`
- Proof marker: `mobile_integrity_provider_dry_run`

| Field | Status |
|---|---|
| `mobile.android_play_integrity_enabled` | configured |
| `mobile.android_package_name` | placeholder |
| `mobile.android_play_integrity_service_account_json_b64` | placeholder |
| `mobile.ios_app_attest_enabled` | not_required |
| `mobile.ios_bundle_id` | not_required |
| `mobile.ios_team_id` | not_required |
| `mobile.integrity_smoke_command` | placeholder |

### 포트원 본인확인

- Status: missing_inputs
- Command: `pnpm identity:smoke`
- Proof marker: `identity_portone_verified_lookup`

| Field | Status |
|---|---|
| `identity.provider` | missing |
| `identity.portone_store_id` | missing |
| `identity.portone_identity_channel_key` | missing |
| `identity.portone_api_secret` | missing |
| `identity.session_cookie_domain` | missing |
| `MUSUNIL_PORTONE_SMOKE_IDENTITY_VERIFICATION_ID` | missing |

### 법안·법령 공식 원천

- Status: missing_inputs
- Command: `pnpm sources:laws`
- Proof marker: `laws_dry_run`

| Field | Status |
|---|---|
| `public_data_sources.national_assembly_bill_api_key or public_data_sources.law_go_kr_oc` | missing |
| `public_data_sources.national_assembly_bill_api_key` | missing |
| `public_data_sources.law_go_kr_oc` | missing |
| `public_data_sources.official_law_endpoints` | 2_official |
| `public_data_sources.law_interest_keywords` | 6_keywords |


## Runtime Secrets

### Render API service secrets
- API/worker Secret File 또는 Render 환경변수에만 넣는다. Static Web에는 넣지 않는다.
- `DATABASE_URL`
- `REDIS_URL`
- `MUSUNIL_USER_INPUTS_B64`
- `MUSUNIL_INTERNAL_API_KEY`
- `MUSUNIL_USER_TOKEN_SECRET`
- `MUSUNIL_ENCRYPTION_KEY`
### Render/Cloudflare cutover shell env
- `pnpm launch:apply` dry-run과 apply 자동화에서만 사용한다.
- `RENDER_API_TOKEN or MUSUNIL_RENDER_API_DNS_TARGET`
- `CLOUDFLARE_API_TOKEN`
- `CLOUDFLARE_ZONE_ID only if zone name lookup fails`

## Launch Ready Steps

- input_validation: `pnpm launch:verify-inputs -- /Users/mk/Documents/Musunil/config/musunil.user-inputs.local.yaml`
- config_encode_check: `pnpm config:encode -- --check /Users/mk/Documents/Musunil/config/musunil.user-inputs.local.yaml`
- render_runtime_config_sample: `pnpm check:render-runtime-config`
- operational_metadata_diagnostics: `pnpm ops:diagnose -- --require-external-smoke-ready`
- external_smoke: `pnpm launch:external-smoke`
- release_check: `pnpm check:release`

## External Smoke Proofs

- storage: `pnpm storage:smoke`, proof: `storage_put_delete`
- redaction: `pnpm redaction:smoke`, proof: `redaction_engine_smoke`
- mobile_integrity: `pnpm mobile:integrity-smoke`, proof: `mobile_integrity_provider_dry_run`
- identity: `pnpm identity:smoke`, proof: `identity_portone_verified_lookup`
- laws_dry_run: `pnpm sources:laws`, proof: `laws_dry_run`, forbidden: `laws_disabled`

## Required Actions

- storage.*와 security.media_encryption_key를 실제 값으로 채운 뒤 pnpm storage:smoke를 실행한다.
- redaction.engine_smoke_command에 {input}/{output}을 받는 실제 비식별 엔진 명령을 넣고 pnpm redaction:smoke를 실행한다.
- Play Integrity 또는 App Attest 값과 mobile.integrity_smoke_command를 채운 뒤 pnpm mobile:integrity-smoke를 실행한다.
- PortOne 본인확인 store/channel/API secret/cookie domain을 채우고 인증 리허설을 수행한다.
- 국회 의안 API key 또는 법제처 OC 중 하나를 입력한다. 이후 pnpm sources:laws를 실행한다.
