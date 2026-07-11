# S+ Service Watch

Last checked: 2026-07-11T18:54:06.333Z

Status: Active

| Check | Result | Detail |
|---|---|---|
| web_static_manifest | fail | live static manifest does not match local manifest |
| web_runtime_config | ok | {"apiBaseUrl":"https://api.musunil.com","expectedApiBaseUrl":"https://api.musunil.com","mapStyleHost":"tiles.openfreemap.org","publicKeys":["apiBaseUrl","mapStyleUrl"]} |
| web_build_info | fail | build-info placeholder deployed and static manifest did not verify freshness |
| web_header_contract | fail | invalid Web headers: / Cache-Control expected no-store, got public, max-age=0, s-maxage=300; / Content-Security-Policy expected CSP with self, https API/map, public media, PortOne, and blob worker/media allowances, got missing; / Permissions-Policy expected camera=(self), microphone=(), geolocation=(self), got missing; / Referrer-Policy expected no-referrer, got missing; / X-Frame-Options expected DENY, got missing; /config.js Cache-Control expected no-store, got public, max-age=14400, s-maxage=300; /config.js Content-Security-Policy expected CSP with self, https API/map, public media, PortOne, and blob worker/media allowances, got missing; /config.js Permissions-Policy expected camera=(self), microphone=(), geolocation=(self), got missing; /config.js Referrer-Policy expected no-referrer, got missing; /config.js X-Frame-Options expected DENY, got missing; /build-info.json Cache-Control expected no-store, got public, max-age=0, s-maxage=300; /build-info.json Content-Security-Policy expected CSP with self, https API/map, public media, PortOne, and blob worker/media allowances, got missing; /build-info.json Permissions-Policy expected camera=(self), microphone=(), geolocation=(self), got missing; /build-info.json Referrer-Policy expected no-referrer, got missing; /build-info.json X-Frame-Options expected DENY, got missing |
| web_forbidden_ui_absent | ok | {"bytes":382563} |
| web_visual_surface | fail | Visual surface smoke failed: - mobile_390_home: first issue is a public source bundle, not a topic issue: 지역별 집회 공개 일정 - mobile_430_home: first issue is a public source bundle, not a topic issue: 지역별 집회 공개 일정 - tablet_768_home: first issue is a public source bundle, not a topic issue: 지역별 집회 공개 일정 - desktop_1440_home: first issue is a public source bundle, not a topic issue: 지역별 집회 공개 일정 |
| api_endpoint_preflight | fail | getaddrinfo ENOTFOUND api.musunil.com |
| api_health_ready | skip | skipped: API endpoint preflight failed |
| public_redacted_media | skip | skipped: API endpoint preflight failed |
| public_payload_home | skip | skipped: API endpoint preflight failed |
| public_payload_issues | skip | skipped: API endpoint preflight failed |
| public_payload_area-clusters | skip | skipped: API endpoint preflight failed |
| public_payload_map | skip | skipped: API endpoint preflight failed |
| public_payload_public-sources_coverage | skip | skipped: API endpoint preflight failed |
| public_payload_laws | skip | skipped: API endpoint preflight failed |
| public_payload_transparency_logs | skip | skipped: API endpoint preflight failed |
| identity_public_read_write_boundary | skip | skipped: API endpoint preflight failed |

## Required Actions

| ID | Owner | Action | Verify | Reference |
|---|---|---|---|---|
| deploy_latest_static | operator | Render musunil-web의 Branch, Root Directory, Build Command, Publish Directory가 pnpm render:web-settings 출력과 같은지 맞춘 뒤 Clear build cache & deploy를 실행한다. | pnpm render:web-settings && MUSUNIL_WEB_BASE_URL=https://musunil.com MUSUNIL_EXPECTED_API_BASE_URL=https://api.musunil.com MUSUNIL_EXPECTED_COMMIT_SHA=$(git rev-parse HEAD) pnpm check:web-deploy | docs/launch-cutover-runbook.md#2-render-static-site |
| connect_api_endpoint | operator | pnpm render:api-settings 출력대로 Render musunil-api 설정과 환경변수를 확인한다. Custom Domains에 api.musunil.com을 추가하고, Render가 표시한 target을 Cloudflare DNS의 api 레코드에 DNS only로 연결한다. | pnpm render:api-settings && MUSUNIL_WEB_BASE_URL=https://musunil.com MUSUNIL_API_BASE_URL=https://api.musunil.com MUSUNIL_EXPECTED_API_BASE_URL=https://api.musunil.com pnpm service:watch:visual | docs/launch-cutover-runbook.md#3-render-api |
| apply_static_headers | operator | pnpm render:web-settings 출력의 Cache-Control, CSP, Permissions-Policy, Referrer-Policy, nosniff, X-Frame-Options Headers를 Render musunil-web Static Site Dashboard에 그대로 입력하고 Clear build cache & deploy를 실행한다. Cloudflare proxy가 켜져 있으면 캐시 우회와 header override 규칙도 함께 확인한다. | pnpm render:web-settings && MUSUNIL_STRICT_WEB_HEADERS=1 MUSUNIL_WEB_BASE_URL=https://musunil.com MUSUNIL_EXPECTED_API_BASE_URL=https://api.musunil.com pnpm check:web-deploy | docs/launch-cutover-runbook.md#2-render-static-site |
| stop_live_visual_surface_regression | lead | 실제 musunil.com 렌더링 회귀다. 홈 이슈 수, 상세 전환, 인증영상/지도/제보 표면, 모바일 overflow와 하단 내비 겹침을 수정하기 전까지 배포 승급을 중단한다. | MUSUNIL_WEB_BASE_URL=https://musunil.com MUSUNIL_API_BASE_URL=https://api.musunil.com MUSUNIL_EXPECTED_API_BASE_URL=https://api.musunil.com pnpm service:watch:visual | docs/commercial-splus-redesign.md |
| restore_issue_first_live_data | lead | 현재 live 첫 카드가 구체 이슈가 아니라 공개자료 묶음(지역별 집회 공개 일정)이다. API 연결 후 /home issueCards가 실제 주제형 Issue를 먼저 반환하는지 확인하고, 공식자료 묶음은 보조/자료 범위 맥락으로 내려야 한다. | pnpm check:visual-surface:live && MUSUNIL_WEB_BASE_URL=https://musunil.com MUSUNIL_API_BASE_URL=https://api.musunil.com MUSUNIL_EXPECTED_API_BASE_URL=https://api.musunil.com pnpm service:watch:visual | docs/commercial-splus-redesign.md |

## History
