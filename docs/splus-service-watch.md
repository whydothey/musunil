# S+ Service Watch

Last checked: 2026-07-12T12:32:02.144Z

Status: Active

| Check | Result | Detail |
|---|---|---|
| web_static_manifest | ok | {"files":5,"bytes":920321,"headersFile":"verified","mode":"matches_local_and_live_hashes"} |
| web_runtime_config | ok | {"apiBaseUrl":"https://api.musunil.com","expectedApiBaseUrl":"https://api.musunil.com","mapStyleHost":"tiles.openfreemap.org","publicKeys":["apiBaseUrl","mapStyleUrl"]} |
| web_build_info | fail | build-info placeholder deployed; set MUSUNIL_ALLOW_PLACEHOLDER_BUILD_INFO=1 only for a static-hash-only diagnostic |
| web_header_contract | fail | invalid Web headers: / Cache-Control expected no-store, got public, max-age=0, s-maxage=300; / Content-Security-Policy expected CSP with self, https API/map, public media, PortOne, and blob worker/media allowances, got missing; / Permissions-Policy expected camera=(self), microphone=(), geolocation=(self), got missing; / Referrer-Policy expected no-referrer, got missing; / X-Frame-Options expected DENY, got missing; /config.js Cache-Control expected no-store, got public, max-age=14400, s-maxage=300; /config.js Content-Security-Policy expected CSP with self, https API/map, public media, PortOne, and blob worker/media allowances, got missing; /config.js Permissions-Policy expected camera=(self), microphone=(), geolocation=(self), got missing; /config.js Referrer-Policy expected no-referrer, got missing; /config.js X-Frame-Options expected DENY, got missing; /build-info.json Cache-Control expected no-store, got public, max-age=0, s-maxage=300; /build-info.json Content-Security-Policy expected CSP with self, https API/map, public media, PortOne, and blob worker/media allowances, got missing; /build-info.json Permissions-Policy expected camera=(self), microphone=(), geolocation=(self), got missing; /build-info.json Referrer-Policy expected no-referrer, got missing; /build-info.json X-Frame-Options expected DENY, got missing |
| web_forbidden_ui_absent | ok | {"bytes":400278,"tokenCount":22} |
| web_visual_surface | fail | live visual surface is rendering non-live data state: delayed; firstIssues=정보통신망법 개정 관련 집회; sourceBundleFirst=0/4 |
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
| apply_static_headers | operator | pnpm launch:apply 출력대로 Render Web header 적용 계획을 확인한다. Render API token이 있으면 pnpm launch:apply -- --apply --deploy-web으로 musunil-web Headers를 적용하고 배포까지 요청한다. Render headers가 live 응답에 계속 반영되지 않거나 Render token 없이 Web header만 먼저 고치려면 pnpm cloudflare:check에서 web_proxy_mode.proxyObserved=true를 확인한 뒤 pnpm launch:apply -- --apply --cloudflare-headers-only로 Web 전용 Response Header Transform Rule만 추가한다. | pnpm launch:apply -- --cloudflare-headers-only && pnpm cloudflare:check && MUSUNIL_STRICT_WEB_HEADERS=1 MUSUNIL_WEB_BASE_URL=https://musunil.com MUSUNIL_EXPECTED_API_BASE_URL=https://api.musunil.com pnpm check:web-deploy | docs/launch-cutover-runbook.md#2-render-static-site |
| publish_build_metadata | operator | Static manifest hash로 최신 UI는 확인됐지만 build-info가 placeholder다. Render Dashboard를 바꾸기 전 `pnpm check:web-render-build-command`로 실제 Render build contract를 로컬에서 먼저 통과시킨다. 그 다음 musunil-web Build Command가 pnpm build:web-static:render인지 확인한다. 이 단일 명령은 MUSUNIL_WRITE_BUILD_INFO=1로 실제 Git SHA를 쓰며, 수정 후 Clear build cache & deploy를 실행한다. | pnpm check:web-render-build-command && pnpm render:web-settings && MUSUNIL_WEB_BASE_URL=https://musunil.com MUSUNIL_EXPECTED_API_BASE_URL=https://api.musunil.com MUSUNIL_EXPECTED_COMMIT_SHA=$(git rev-parse HEAD) pnpm check:web-deploy | docs/launch-readiness-checklist.md |
| stop_live_visual_surface_regression | lead | 실제 musunil.com은 fallback 이슈 피드를 렌더링하지만 live API 동기화가 아니다. API DNS/CORS/Web config와 `/home.issueCards` 연결을 고쳐 `serviceSyncState=live`가 될 때까지 배포 승급을 중단한다. | pnpm launch:final-gate | docs/launch-cutover-runbook.md#3-render-api |

## History
