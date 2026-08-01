# S+ Service Watch

Last checked: 2026-08-01T05:47:10.338Z

Status: Active

| Check | Result | Detail |
|---|---|---|
| web_static_manifest | ok | {"files":28,"bytes":1478975,"headersFile":"verified","buildVariantFiles":2,"mode":"matches_stable_local_and_all_live_hashes"} |
| web_runtime_config | ok | {"apiBaseUrl":"https://api.musunil.com","expectedApiBaseUrl":"https://api.musunil.com","mapStyleHost":"tiles.openfreemap.org","publicKeys":["apiBaseUrl","mapStyleUrl"]} |
| web_build_info | ok | {"commitSha":"7400182cf5d8ed53074f888d300e3439217d14f3","builtAt":"2026-07-31T08:29:02.847Z"} |
| web_header_contract | ok | {"checked":[{"path":"/","headers":{"cache-control":"no-store","content-security-policy":"default-src 'self'; connect-src 'self' https:; img-src 'self' data: blob: https:; media-src 'self' https: blob:; script-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net https://cdn.portone.io; style-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net; worker-src 'self' blob:","permissions-policy":"camera=(self), microphone=(), geolocation=(self)","referrer-policy":"no-referrer","x-content-type-options":"nosniff","x-frame-options":"DENY"}},{"path":"/config.js","headers":{"cache-control":"no-store","content-security-policy":"default-src 'self'; connect-src 'self' https:; img-src 'self' data: blob: https:; media-src 'self' https: blob:; script-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net https://cdn.portone.io; style-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net; worker-src 'self' blob:","permissions-policy":"camera=(self), microphone=(), geolocation=(self)","referrer-policy":"no-referrer","x-content-type-options":"nosniff","x-frame-options":"DENY"}},{"path":"/build-info.json","headers":{"cache-control":"no-store","content-security-policy":"default-src 'self'; connect-src 'self' https:; img-src 'self' data: blob: https:; media-src 'self' https: blob:; script-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net https://cdn.portone.io; style-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net; worker-src 'self' blob:","permissions-policy":"camera=(self), microphone=(), geolocation=(self)","referrer-policy":"no-referrer","x-content-type-options":"nosniff","x-frame-options":"DENY"}}]} |
| web_forbidden_ui_absent | ok | {"bytes":718,"tokenCount":22} |
| web_visual_surface | fail | Visual surface smoke failed: serviceStates=unknown ; homeSummaries=mobile_390_home:issues=0 stories=0 state=unknown banner=none first=none empty=missing emptyTitle=none emptyBody=none emptyActions= ; mobile_430_home:issues=0 stories=0 state=unknown banner=none first=none empty=missing emptyTitle=none emptyBody=none emptyActions= ; tablet_768_home:issues=0 stories=0 state=unknown banner=none first=none empty=missing emptyTitle=none emptyBody=none emptyActions= ; desktop_1440_home:issues=0 stories=0 state=unknown banner=none first=none empty=missing emptyTitle=none emptyBody=none emptyActions= ; failures=mobile_390_home: home issue feed not ready: issues=0, stories=0, state=unknown, banner=none, first=none, empty=missing, emptyTitle=none, emptyBody=none, emptyActions=none \| mobile_390_home: home issue feed has no cards and no controlled empty state \| mobile_390_home: home issue empty title changed:  \| mobile_390_home: home issue empty body changed:  \| mobile_390_home: home issue empty recovery actions changed:  \| mobile_390_home: expected at least 3 issue story rings, got 0 \| mobile_390_home: expected at least 3 issue cards, got 0 \| mobile_390_home: first issue title is missing \| mobile_390_home: first issue public place/time line is too operational:  \| mobile_390_home: first issue summary missing location/evidence units:  \| mobile_390_home: first issue evidence-first path missing:  \| mobile_390_home: first issue has too many visible action labels: 0 \| +44 more |
| api_endpoint_preflight | ok | {"hostname":"api.musunil.com","addressFamilies":["IPv4"],"healthStatus":200} |
| api_health_ready | ok | {"ready":true,"readinessPath":"/ready/public-read","checks":["config_source","payments.donations_disabled","payments.operating_support_disabled","payments.mode_disabled","identity.web_enabled","security.jwt_secret","security.encryption_key","redis.url","storage.provider","redaction.engine_smoke_command","mobile.android_play_integrity_enabled","identity.session_cookie_domain","map.provider","map.map_style_url","domestic_operation.service_country","domestic_operation.overseas_service_enabled","domestic_operation.overseas_payments_enabled","domestic_operation.tax_deductible_donation_receipt_enabled","domestic_operation.public_personal_bank_account_exposure_enabled","postgres","ops_scheduler_schema"]} |
| public_redacted_media | ok | {"publicMedia":0,"previewMedia":"absent"} |
| public_payload_me | ok | {} |
| public_payload_home | ok | {"cards":134,"issues":2,"firstIssueTitle":"공직선거법 관련 주요 쟁점","sourceBundleFirst":false,"topicIssues":2} |
| public_payload_issues | ok | {"issues":0} |
| public_payload_area-clusters | ok | {} |
| public_payload_map | ok | {"pins":134,"areas":0} |
| public_payload_public-sources_coverage | ok | {"activeScheduleRegions":18,"nextRefreshAt":"2026-08-02T05:24:46.816Z","sourceRefreshes":25} |
| public_payload_laws | ok | {"laws":68} |
| public_payload_transparency_logs | ok | {"logs":50} |
| public_payload_transparency_monthly | ok | {} |
| public_source_refresh_freshness | ok | {"activeScheduleSources":18,"refreshedActiveSources":18,"latestCheckedAt":"2026-08-01T05:27:11.286Z","sourceRefreshes":25,"overdueRegions":0} |
| identity_public_read_write_boundary | ok | {"read":"public","write":"runtime_locked"} |

## Required Actions

| ID | Owner | Action | Verify | Reference |
|---|---|---|---|---|
| stop_live_visual_surface_regression | lead | 실제 musunil.com이 live issue feed를 받지 못하고 있다. API DNS/CORS/Web config와 `/home.issueCards` 연결을 고쳐 `serviceSyncState=live`이고 홈 이슈 3개 이상이 렌더링될 때까지 배포 승급을 중단한다. | pnpm launch:final-gate | docs/launch-cutover-runbook.md#3-render-api |

## History
