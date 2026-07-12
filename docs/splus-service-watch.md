# S+ Service Watch

Last checked: 2026-07-12T02:25:22.244Z

Status: Active

| Check | Result | Detail |
|---|---|---|
| web_static_manifest | fail | live static manifest does not match local manifest |
| web_runtime_config | ok | {"apiBaseUrl":"https://api.musunil.com","expectedApiBaseUrl":"https://api.musunil.com","mapStyleHost":"tiles.openfreemap.org","publicKeys":["apiBaseUrl","mapStyleUrl"]} |
| web_build_info | fail | build-info placeholder deployed and static manifest did not verify freshness |
| web_header_contract | fail | invalid Web headers: / Cache-Control expected no-store, got public, max-age=0, s-maxage=300; / Content-Security-Policy expected CSP with self, https API/map, public media, PortOne, and blob worker/media allowances, got missing; / Permissions-Policy expected camera=(self), microphone=(), geolocation=(self), got missing; / Referrer-Policy expected no-referrer, got missing; / X-Frame-Options expected DENY, got missing; /config.js Cache-Control expected no-store, got public, max-age=14400, s-maxage=300; /config.js Content-Security-Policy expected CSP with self, https API/map, public media, PortOne, and blob worker/media allowances, got missing; /config.js Permissions-Policy expected camera=(self), microphone=(), geolocation=(self), got missing; /config.js Referrer-Policy expected no-referrer, got missing; /config.js X-Frame-Options expected DENY, got missing; /build-info.json Cache-Control expected no-store, got public, max-age=0, s-maxage=300; /build-info.json Content-Security-Policy expected CSP with self, https API/map, public media, PortOne, and blob worker/media allowances, got missing; /build-info.json Permissions-Policy expected camera=(self), microphone=(), geolocation=(self), got missing; /build-info.json Referrer-Policy expected no-referrer, got missing; /build-info.json X-Frame-Options expected DENY, got missing |
| web_forbidden_ui_absent | ok | {"bytes":390634} |
| web_visual_surface | fail | Visual surface smoke failed: serviceStates=delayed ; homeSummaries=mobile_390_home:issues=3 stories=3 state=delayed banner=저장된 공개자료 기준 first=정보통신망법 개정 관련 집회 empty=missing emptyTitle=none emptyBody=none emptyActions= ; mobile_430_home:issues=3 stories=3 state=delayed banner=저장된 공개자료 기준 first=정보통신망법 개정 관련 집회 empty=missing emptyTitle=none emptyBody=none emptyActions= ; tablet_768_home:issues=3 stories=3 state=delayed banner=저장된 공개자료 기준 first=정보통신망법 개정 관련 집회 empty=missing emptyTitle=none emptyBody=none emptyActions= ; desktop_1440_home:issues=3 stories=3 state=delayed banner=저장된 공개자료 기준 first=정보통신망법 개정 관련 집회 empty=missing emptyTitle=none emptyBody=none emptyActions= ; failures=mobile_390_home: first issue evidence line missing fixed summary units:  \| mobile_390_home: issue cards must keep a lightweight map entry \| mobile_390_home: home issue cards must not render decorative mini-map surfaces: map=3, area=3 \| mobile_430_home: first issue evidence line missing fixed summary units:  \| mobile_430_home: issue cards must keep a lightweight map entry \| mobile_430_home: home issue cards must not render decorative mini-map surfaces: map=3, area=3 \| tablet_768_home: first issue evidence line missing fixed summary units:  \| tablet_768_home: issue cards must keep a lightweight map entry \| tablet_768_home: home issue cards must not render decorative mini-map surfaces: map=3, area=3 \| desktop_1440_home: first issue evidence line missing fixed summary units:  \| desktop_1440_home: issue cards must keep a lightweight map entry \| desktop_1440_home: home issue cards must not render decorative mini-map surfaces: map=3, area=3 |
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
| identity_public_read_write_boundary | skip | skipped: API endpoint preflight failed |

## Required Actions

| ID | Owner | Action | Verify | Reference |
|---|---|---|---|---|
| deploy_latest_static | operator | Render musunil-web의 Branch, Root Directory, Build Command, Publish Directory가 pnpm render:web-settings 출력과 같은지 맞춘 뒤 Clear build cache & deploy를 실행한다. | pnpm render:web-settings && MUSUNIL_WEB_BASE_URL=https://musunil.com MUSUNIL_EXPECTED_API_BASE_URL=https://api.musunil.com MUSUNIL_EXPECTED_COMMIT_SHA=$(git rev-parse HEAD) pnpm check:web-deploy | docs/launch-cutover-runbook.md#2-render-static-site |
| connect_api_endpoint | operator | pnpm render:api-settings와 pnpm cloudflare:dns 출력대로 Render musunil-api 설정과 환경변수를 확인한다. Custom Domains에 api.musunil.com을 추가하고, Render가 표시한 target을 MUSUNIL_RENDER_API_DNS_TARGET에 넣은 뒤 Cloudflare DNS의 api 레코드에 DNS only로 연결한다. | pnpm render:api-settings && : "${MUSUNIL_RENDER_API_DNS_TARGET:?set exact Render API target from Render first}" && pnpm cloudflare:dns && pnpm cloudflare:check:strict && pnpm launch:final-gate | docs/launch-cutover-runbook.md#3-render-api |
| apply_static_headers | operator | pnpm render:web-settings 출력의 Header application mode를 먼저 확인한다. 수동 Static Site이면 Render musunil-web Settings > Headers에 Cache-Control, CSP, Permissions-Policy, Referrer-Policy, nosniff, X-Frame-Options를 그대로 입력하고 Clear build cache & deploy를 실행한다. Render headers가 live 응답에 계속 반영되지 않거나 Cloudflare proxy가 켜져 있으면 pnpm cloudflare:headers로 생성되는 Web 전용 Response Header Transform Rule을 적용하고 /, /config.js, /build-info.json 캐시 우회도 확인한다. | pnpm render:web-settings && pnpm cloudflare:headers && pnpm cloudflare:check && MUSUNIL_STRICT_WEB_HEADERS=1 MUSUNIL_WEB_BASE_URL=https://musunil.com MUSUNIL_EXPECTED_API_BASE_URL=https://api.musunil.com pnpm check:web-deploy | docs/launch-cutover-runbook.md#2-render-static-site |
| stop_live_visual_surface_regression | lead | 실제 musunil.com은 fallback 이슈 피드를 렌더링하지만 live API 동기화가 아니다. API DNS/CORS/Web config와 `/home.issueCards` 연결을 고쳐 `serviceSyncState=live`가 될 때까지 배포 승급을 중단한다. | pnpm launch:final-gate | docs/launch-cutover-runbook.md#3-render-api |

## History
