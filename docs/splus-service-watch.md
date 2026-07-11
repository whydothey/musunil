# S+ Service Watch

Last checked: 2026-07-11T15:54:38.390Z

Status: Active

| Check | Result | Detail |
|---|---|---|
| web_static_manifest | ok | {"files":4,"mode":"matches_local"} |
| web_build_info | ok | {"commitSha":"generated-at-build","builtAt":"1970-01-01T00:00:00.000Z","mode":"static_manifest_verified_fallback"} |
| web_header_contract | fail | no-store missing: /=public, max-age=0, s-maxage=300, /config.js=public, max-age=14400, s-maxage=300, /build-info.json=public, max-age=0, s-maxage=300 |
| web_forbidden_ui_absent | ok | {"bytes":381325} |
| api_endpoint_preflight | fail | getaddrinfo ENOTFOUND api.musunil.com |
| api_health_ready | skip | skipped: API endpoint preflight failed |
| public_redacted_media | skip | skipped: API endpoint preflight failed |
| public_payload_home | skip | skipped: API endpoint preflight failed |
| public_payload_issues | skip | skipped: API endpoint preflight failed |
| public_payload_map | skip | skipped: API endpoint preflight failed |
| public_payload_laws | skip | skipped: API endpoint preflight failed |
| public_payload_public-sources_coverage | skip | skipped: API endpoint preflight failed |
| identity_public_read_write_boundary | skip | skipped: API endpoint preflight failed |

## Required Actions

| ID | Owner | Action | Verify | Reference |
|---|---|---|---|---|
| connect_api_endpoint | operator | Render musunil-api의 Custom Domains에 api.musunil.com을 추가하고, Render가 표시한 target을 Cloudflare DNS의 api 레코드에 DNS only로 연결한다. API 서비스에 MUSUNIL_USER_INPUTS_B64와 generated secrets가 있는지도 확인한다. | pnpm launch:cutover-plan && MUSUNIL_API_BASE_URL=https://api.musunil.com pnpm service:watch -- --once | docs/launch-cutover-runbook.md#3-render-api |
| apply_static_headers | operator | pnpm render:web-settings 출력의 Headers를 Render musunil-web Static Site Dashboard에 그대로 입력하고 Clear build cache & deploy를 실행한다. Cloudflare proxy가 켜져 있으면 캐시 우회 규칙도 함께 확인한다. | pnpm render:web-settings && MUSUNIL_STRICT_WEB_HEADERS=1 MUSUNIL_WEB_BASE_URL=https://musunil.com pnpm check:web-deploy | docs/launch-cutover-runbook.md#2-render-static-site |
| publish_build_metadata | operator | Static manifest hash로 최신 UI는 확인됐지만 build-info가 placeholder다. Render가 build command output을 publish하는지 확인하거나, static-manifest 검증을 fallback warning으로 유지한다. | MUSUNIL_WEB_BASE_URL=https://musunil.com MUSUNIL_EXPECTED_COMMIT_SHA=$(git rev-parse HEAD) pnpm check:web-deploy | docs/launch-readiness-checklist.md |

## History
