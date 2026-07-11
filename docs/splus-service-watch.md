# S+ Service Watch

Last checked: 2026-07-11T14:43:25.149Z

Status: Active

| Check | Result | Detail |
|---|---|---|
| web_static_manifest | ok | {"files":4,"mode":"matches_local"} |
| web_build_info | ok | {"commitSha":"generated-at-build","builtAt":"1970-01-01T00:00:00.000Z","mode":"static_manifest_verified_fallback"} |
| web_header_contract | fail | no-store missing: /=public, max-age=0, s-maxage=300, /config.js=public, max-age=14400, s-maxage=300, /build-info.json=public, max-age=0, s-maxage=300 |
| web_forbidden_ui_absent | ok | {"bytes":376299} |
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

| ID | Action | Verify |
|---|---|---|
| connect_api_endpoint | Create or fix the DNS record for api.musunil.com so it points to the Render API service, then redeploy the API. | MUSUNIL_API_BASE_URL=https://api.musunil.com pnpm service:watch -- --once |
| apply_static_headers | Run pnpm render:web-settings, copy the Headers into the Render Static Site Dashboard, then Clear build cache & deploy. | MUSUNIL_STRICT_WEB_HEADERS=1 MUSUNIL_WEB_BASE_URL=https://musunil.com pnpm check:web-deploy |
| publish_build_metadata | Ensure Render publishes build command output instead of only committed apps/web files, or keep accepting static-manifest verification as a fallback warning. | MUSUNIL_WEB_BASE_URL=https://musunil.com MUSUNIL_EXPECTED_COMMIT_SHA=$(git rev-parse HEAD) pnpm check:web-deploy |

## History
