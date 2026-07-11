# S+ Service Watch

Last checked: 2026-07-11T17:11:59.785Z

Status: Active

| Check | Result | Detail |
|---|---|---|
| web_static_manifest | fail | live static manifest does not match local manifest |
| web_build_info | fail | build-info placeholder deployed and static manifest did not verify freshness |
| web_header_contract | fail | no-store missing: /=public, max-age=0, s-maxage=300, /config.js=public, max-age=14400, s-maxage=300, /build-info.json=public, max-age=0, s-maxage=300 |
| web_forbidden_ui_absent | ok | {"bytes":380214} |
| web_visual_surface | fail | live visual surface is rendering non-live data state: delayed |
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
| deploy_latest_static | operator | Render musunil-web의 Branch, Root Directory, Build Command, Publish Directory가 pnpm render:web-settings 출력과 같은지 맞춘 뒤 Clear build cache & deploy를 실행한다. | pnpm render:web-settings && MUSUNIL_WEB_BASE_URL=https://musunil.com MUSUNIL_EXPECTED_COMMIT_SHA=$(git rev-parse HEAD) pnpm check:web-deploy | docs/launch-cutover-runbook.md#2-render-static-site |
| connect_api_endpoint | operator | pnpm render:api-settings 출력대로 Render musunil-api 설정과 환경변수를 확인한다. Custom Domains에 api.musunil.com을 추가하고, Render가 표시한 target을 Cloudflare DNS의 api 레코드에 DNS only로 연결한다. | pnpm render:api-settings && MUSUNIL_API_BASE_URL=https://api.musunil.com pnpm service:watch -- --once | docs/launch-cutover-runbook.md#3-render-api |
| apply_static_headers | operator | pnpm render:web-settings 출력의 Headers를 Render musunil-web Static Site Dashboard에 그대로 입력하고 Clear build cache & deploy를 실행한다. Cloudflare proxy가 켜져 있으면 캐시 우회 규칙도 함께 확인한다. | pnpm render:web-settings && MUSUNIL_STRICT_WEB_HEADERS=1 MUSUNIL_WEB_BASE_URL=https://musunil.com pnpm check:web-deploy | docs/launch-cutover-runbook.md#2-render-static-site |
| stop_live_visual_surface_regression | lead | 실제 musunil.com이 저장된 공개자료 fallback 상태로 렌더링 중이다. API DNS/CORS/Web config 연결을 고쳐 `serviceSyncState=live`가 될 때까지 배포 승급을 중단한다. | pnpm service:watch:visual | docs/launch-cutover-runbook.md#3-render-api |

## History
