# S+ Service Watch

Last checked: 2026-07-19T13:43:29.017Z

Status: Active

| Check | Result | Detail |
|---|---|---|
| web_static_manifest | ok | {"files":16,"bytes":2460348,"headersFile":"verified","buildVariantFiles":6,"mode":"matches_stable_local_and_all_live_hashes"} |
| web_runtime_config | ok | {"apiBaseUrl":"https://api.musunil.com","expectedApiBaseUrl":"https://api.musunil.com","mapStyleHost":"tiles.openfreemap.org","publicKeys":["apiBaseUrl","mapStyleUrl"]} |
| web_build_info | ok | {"commitSha":"ed2aaac141ede375f7d5f6e30fa9f3647f832621","builtAt":"2026-07-19T13:41:57.215Z"} |
| web_header_contract | ok | {"checked":[{"path":"/","headers":{"cache-control":"no-store","content-security-policy":"default-src 'self'; connect-src 'self' https:; img-src 'self' data: blob: https:; media-src 'self' https: blob:; script-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net https://cdn.portone.io; style-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net; worker-src 'self' blob:","permissions-policy":"camera=(self), microphone=(), geolocation=(self)","referrer-policy":"no-referrer","x-content-type-options":"nosniff","x-frame-options":"DENY"}},{"path":"/config.js","headers":{"cache-control":"no-store","content-security-policy":"default-src 'self'; connect-src 'self' https:; img-src 'self' data: blob: https:; media-src 'self' https: blob:; script-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net https://cdn.portone.io; style-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net; worker-src 'self' blob:","permissions-policy":"camera=(self), microphone=(), geolocation=(self)","referrer-policy":"no-referrer","x-content-type-options":"nosniff","x-frame-options":"DENY"}},{"path":"/build-info.json","headers":{"cache-control":"no-store","content-security-policy":"default-src 'self'; connect-src 'self' https:; img-src 'self' data: blob: https:; media-src 'self' https: blob:; script-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net https://cdn.portone.io; style-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net; worker-src 'self' blob:","permissions-policy":"camera=(self), microphone=(), geolocation=(self)","referrer-policy":"no-referrer","x-content-type-options":"nosniff","x-frame-options":"DENY"}}]} |
| web_forbidden_ui_absent | ok | {"bytes":428273,"tokenCount":22} |
| web_visual_surface | fail | live visual surface is rendering non-live data state: delayed; firstIssues=정보통신망법 개정 반대 집회; sourceBundleFirst=0/4 |
| api_endpoint_preflight | fail | getaddrinfo ENOTFOUND api.musunil.com |
| api_health_ready | skip | skipped: API endpoint preflight failed |
| public_redacted_media | skip | skipped: API endpoint preflight failed |
| public_payload_me | skip | skipped: API endpoint preflight failed |
| public_payload_home | skip | skipped: API endpoint preflight failed |
| public_payload_issues | skip | skipped: API endpoint preflight failed |
| public_payload_area-clusters | skip | skipped: API endpoint preflight failed |
| public_payload_map | skip | skipped: API endpoint preflight failed |
| public_payload_public-sources_coverage | skip | skipped: API endpoint preflight failed |
| public_payload_laws | skip | skipped: API endpoint preflight failed |
| public_payload_transparency_logs | skip | skipped: API endpoint preflight failed |
| public_payload_transparency_monthly | skip | skipped: API endpoint preflight failed |
| public_source_refresh_freshness | skip | skipped: API endpoint preflight failed |
| identity_public_read_write_boundary | skip | skipped: API endpoint preflight failed |

## Required Actions

| ID | Owner | Action | Verify | Reference |
|---|---|---|---|---|
| connect_api_endpoint | operator | pnpm launch:apply 출력대로 Render/Cloudflare token과 서비스 target 상태를 확인한다. Render API token과 Cloudflare token이 있으면 pnpm launch:apply -- --apply가 api.musunil.com custom domain 생성, Render onrender.com target 파생, Cloudflare DNS 적용을 한 번에 처리한다. Render token 없이 Dashboard target을 직접 복사한 경우에는 pnpm render:api-settings와 pnpm cloudflare:dns로 값을 확인한 뒤 MUSUNIL_RENDER_API_DNS_TARGET와 CLOUDFLARE_API_TOKEN만 넣고 같은 명령을 실행한다. 이때 renderSkippedReason=manual_api_dns_target_without_render_token이면 Render API write는 건너뛰고 Cloudflare api CNAME만 DNS only로 적용한다. | pnpm launch:apply && pnpm launch:blockers -- --refresh | docs/launch-cutover-runbook.md#3-render-api |
| stop_live_visual_surface_regression | lead | 실제 musunil.com은 fallback 이슈 피드를 렌더링하지만 live API 동기화가 아니다. API DNS/CORS/Web config와 `/home.issueCards` 연결을 고쳐 `serviceSyncState=live`가 될 때까지 배포 승급을 중단한다. | pnpm launch:final-gate | docs/launch-cutover-runbook.md#3-render-api |

## History
