# Launch Readiness Checklist

## 자동 차단

- `pnpm check` 통과.
- `pnpm check:splus` 통과.
- `pnpm check:release` 통과.
- `pnpm launch:ready` 통과.
- `pnpm launch:post-deploy-smoke` 통과.
- `pnpm build:web-config`가 운영 YAML 기준으로 실행됨.
- `pnpm launch:check` 통과.
- `pnpm launch:verify-inputs` 통과.
- `pnpm config:encode`가 launch 검증 통과 후에만 `MUSUNIL_USER_INPUTS_B64`를 출력한다.
- `pnpm check:launch-sample` 통과.
- `pnpm check:render-runtime-config` 통과.
- `pnpm check:runtime-smoke` 통과.
- `pnpm check:web-smoke` 통과.
- `pnpm launch:inputs`로 생성한 운영 YAML은 `CHANGE_ME_*` 값만 남기고 Render generated secret 필드는 비워 둔다.
- 기본 템플릿은 production-safe로 preview/mock이 꺼져 있고 운영 입력값만 `CHANGE_ME_*`로 남긴다.
- `pnpm launch:verify-inputs`는 Render 관리형 DB/Redis를 모의 주입해 사용자 YAML만 검증한다.
- `pnpm check:render-runtime-config`는 YAML 보안 키가 비어 있어도 Render generated env로 API `/ready` 보안 검증이 통과하는지 sample config로 검사한다.
- `pnpm config:encode -- --check config/musunil.user-inputs.local.yaml` 통과.
- `pnpm smoke:api -- --require-ready` 통과.
- `pnpm smoke:api -- --boundary-checks` 통과.
- `pnpm launch:external-smoke` 통과.
- `pnpm mobile:integrity-smoke` 통과.
- 실제 storage credential 입력 후 `pnpm storage:smoke` 통과.
- 실제 비식별 엔진 명령 입력 후 `pnpm redaction:smoke` 통과.
- `/health` 200.
- `/ready` 200, `config_source`, `postgres`, `redis` check가 모두 ok.
- 배포 후 `MUSUNIL_API_BASE_URL=https://... pnpm launch:post-deploy-smoke -- --require-laws` 통과. 이 값은 localhost나 HTTP가 아닌 실제 배포 HTTPS API URL이어야 하며, 요청 timeout과 redirect 수동 처리, API 보안 헤더, CORS 경계, `/home`, `/issues`, 첫 이슈 상세, 첫 이슈 live-claims, `/area-clusters`, `/map`, `/public-sources/coverage`, `/laws`, 첫 법안 상세 공개 응답 안전성을 함께 확인한다.
- 배포 후 `pnpm launch:post-deploy-smoke`는 API `/media/redacted/preview-occ-live-1-poster.png`가 200 `image/png`, `/media/redacted/preview-occ-live-1.webm`이 200 `video/webm`으로 열리고 encoded traversal가 차단되는지 확인한다.
- Render API health check path가 `/ready`다.
- Render API build에서 `pnpm check`, `pnpm build:web-config`, `pnpm launch:check`가 실행된다.
- Render API pre-deploy에서 `pnpm db:migrate`가 실행된다.
- Render Blueprint가 `musunil-postgres`와 `musunil-redis`를 생성하고 private-network-only로 둔다.
- Render API/Web은 `DATABASE_URL`, `REDIS_URL`을 관리형 Postgres/Key Value에서 자동 주입받는다.
- Render 서비스는 `MUSUNIL_RUNTIME_ENV=production`을 설정해 설정 로드 실패 fallback에서도 mock 데이터와 LIVE 자동 공개를 끈다.
- Render API만 `MUSUNIL_USER_INPUTS_B64`를 prompt 받고, Web은 API 서비스의 같은 env var를 참조한다.
- Render API는 `MUSUNIL_INTERNAL_API_KEY`, `MUSUNIL_USER_TOKEN_SECRET`, `MUSUNIL_ENCRYPTION_KEY`를 생성한다.
- Render Web은 API 서비스의 `MUSUNIL_USER_TOKEN_SECRET`, `MUSUNIL_ENCRYPTION_KEY`를 launch validation용으로 참조한다.
- Render cron worker는 API 서비스의 `MUSUNIL_INTERNAL_API_KEY`를 참조한다.
- Render cron worker는 `MUSUNIL_USER_INPUTS_B64`를 요구하지 않는다.
- Render Web Static Site headers가 `render.yaml`에 선언되어 있다.
- Render Web build에서 `pnpm build:web-config` 후 `pnpm launch:check`가 실행된다.
- `pnpm db:migrate -- --check`가 Claim/Evidence/Occurrence와 장기 현장/교통/인파/경로/제보 테이블 계약을 확인한다.
- Render API는 SIGTERM에서 서버를 닫고 snapshot 저장 후 종료한다.
- 로컬 Web 정적 서버는 실제 HTTP 응답에서 CSP, `nosniff`, `DENY`, `no-referrer`, `Permissions-Policy` 헤더를 보낸다.
- Render cron `musunil-public-source-ingest`, `musunil-law-source-ingest`, `musunil-notification-dispatch`가 있다.
- Render cron `musunil-privacy-purge`가 있다.
- 공개 원천 cron은 ingest POST 실패 시 non-zero로 종료한다.
- 공개 원천 cron은 원천 fetch 실패나 0건 파싱도 non-zero로 종료한다.
- 공개 원천 Claim/Occurrence ingest는 같은 payload 반복 실행 시 중복 Claim을 만들지 않는다.
- `pnpm sources:coverage`에서 18개 시도경찰청 권역이 모두 표시된다.
- `pnpm sources:coverage`에서 각 권역의 `refreshCadenceHours`, `lastCheckedAt`, `nextRefreshAt`, `gapReason`이 빠지지 않는다.
- 일정 자료 확인 중 권역은 "집회 없음"이 아니라 "공개 자료 확인 중"으로 취급한다.
- Postgres snapshot 저장은 쓰기 요청 순서대로 직렬화된다.
- Postgres snapshot payload는 `security.encryption_key` 또는 Render `MUSUNIL_ENCRYPTION_KEY`로 AES-GCM 암호화되어 저장된다.
- 공개 응답에 사용자 원문, 정밀 위치, 원본 미디어 key가 나오지 않는다.
- Runtime smoke는 공개 live-claims 응답의 `publicRadiusM`과 private key/raw GPS/media field 부재를 검증한다.
- Runtime smoke는 공개 redacted poster와 clip이 API `/media/redacted/*`에서 열리고 private/traversal 경로가 차단되는지 검증한다.
- 공개 응답에 내부 `claimIds/evidenceIds/*ClaimIds/targetRefs` 참조 배열이 나오지 않는다.
- 규모 추정 공개 응답은 `musunil_ai_estimate` Claim 메타, evidence strength, risk level을 함께 노출한다.
- 규모 추정의 독립 시점 수는 지역 수가 아니라 공개 가능한 현장 영상 근거 기준으로만 증가한다.
- 공개 일정·자료 Claim만 있고 공개 가능한 현장 영상 근거가 없으면 자동 규모 숫자를 만들지 않는다.
- 저장된 규모 추정도 현재 공개 가능한 현장 영상 근거가 없으면 공개 응답에서 제외한다.
- 잘못된 JSON은 400, 과대 JSON body는 413으로 실패한다.
- 공개 write API는 IP 단위 rate limit으로 429를 반환한다.
- `pnpm smoke:api`는 비파괴로 공개 schema, 금지 타입 부재, 잘못된 내부 키 거부를 확인한다.
- staging에서는 `pnpm smoke:api -- --boundary-checks`와 `pnpm smoke:api -- --write-checks`로 HTTP 경계와 원문 비공개 write path를 확인한다.
- 자유 댓글, 추천/비추천, 찬반투표, 후원 영향 UI가 없다.
- 국내 v1 운영에서 `domestic_operation.service_country`는 `KR`이고 해외 서비스/해외 결제/세액공제 기부금 영수증/개인 계좌 공개 플래그가 모두 꺼져 있다.
- 후원은 `payments.influence_on_ranking_enabled`, `payments.influence_on_alerts_enabled`, `payments.influence_on_trust_enabled`가 모두 false다.
- 도메인 기반 실제 서비스 오픈 전에는 `payments.operating_support_enabled`가 false다.
- PG 운영 후원을 켤 때는 개인사업자 번호, 사업용 계좌 예금주, PG MID/client key/secret/webhook secret/success/fail/webhook URL이 모두 입력되어 있다.
- `hazard_area`, `service_disruption` 공개 타입이 없다.
- 배포 후 post-deploy smoke에서 `/comments`, `/votes`, `/likes`, `/reactions`, `/donations`, `/sponsorships` GET/POST가 404인지 확인한다.
- production seed와 `/home` 응답에 프리뷰/mock 집회가 섞이지 않는다.
- 실제 법령·의안 ingest 전 production `/laws`는 preview 법령을 노출하지 않고 빈 목록을 반환한다.
- production에서 포트원 본인확인 `identity.portone_store_id`, `identity.portone_identity_channel_key`, `identity.portone_api_secret`이 없으면 launch validation이 실패한다.
- 로그인 없이 공개 읽기 API는 접근 가능하지만, 제보·현장 판단·반론·권리침해 신고·알림 설정·`/me/*`는 본인확인 완료 세션 없이는 `identity_required`로 실패한다.
- `pnpm service:watch -- --once`가 Web static hash/build metadata, API DNS/HTTPS endpoint preflight, API readiness, 공개 payload 안전성, 법안/coverage, 인증 write boundary를 검증하고 `docs/splus-service-watch.md`를 갱신한다. API endpoint preflight가 실패하면 하위 API checks는 `skip`이어야 하며, 실패 원인은 `api_endpoint_preflight`에 남아야 한다.
- production Web fallback에도 프리뷰/mock 카드와 프리뷰 전용 지도 핀이 보이지 않는다.
- production Web은 `config.js`의 `apiBaseUrl`을 기준으로 하며, `?api=`와 localStorage API override는 localhost에서만 허용된다.
- 로컬 dev 검증은 `MUSUNIL_WEB_API_BASE_URL=http://localhost:<api-port> pnpm dev:web`가 stale `apps/web/config.js` 값보다 우선해야 하며, `pnpm check:web-smoke`가 이 runtime override를 검증한다.
- Render Static Site 수동 설정값은 `pnpm render:web-settings`로 출력한 Branch, Root Directory, Build Command, Publish Directory, Headers를 기준으로 맞춘다.
- production Web은 가능하면 `build-info.json`의 `commitSha`가 배포 대상 Git SHA와 같아야 한다. Render 수동 Static Site가 build metadata를 반영하지 않는 경우에는 `/static-manifest.json`과 live HTML/config/media SHA-256이 현재 repo 산출물과 정확히 일치해야 한다.
- Render Static Site는 repo root에서 `pnpm build:web-static`과 `pnpm check:web-smoke`를 실행하고 `apps/web`만 publish한다.
- Render Static Site와 Cloudflare 경로는 `/`, `/config.js`, `/build-info.json`에 `Cache-Control: no-store`를 보내야 하며, 공개 영상 확인을 위해 CSP에 `media-src 'self' https: blob:`가 있어야 한다.
- `/build-info.json` 또는 `/build-info.js`가 404면 Static Site build command가 실행되지 않았거나, repo root/Publish Directory/Blueprint 연결이 잘못됐거나, build-info 산출물이 ignore/미추적 처리된 상태로 본다.
- `/static-manifest.json`과 live 파일 해시가 현재 repo 산출물과 일치하지만 `/build-info.json`이 `generated-at-build`이면 Static Site가 커밋된 `apps/web` 파일을 publish하고 build metadata만 반영하지 않는 상태다. 이 경우 최신 UI 배포 여부는 통과로 보되, `check:web-deploy`와 `service:watch`는 `web_build_info_placeholder` 경고를 남긴다.
- `/static-manifest.json` 또는 live 파일 해시가 현재 repo 산출물과 다르면 구버전 배포로 보고 실패한다. Render 수동 Static Site의 Branch, Root Directory, Build Command, Publish Directory, headers를 `README.md`와 `render.yaml` 기준으로 고친 뒤 `Clear build cache & deploy`를 실행한다.
- `apps/web/build-info.js`와 `apps/web/build-info.json`은 placeholder로 repo에 추적하고, Render build command가 실제 Git SHA로 덮어써야 한다.
- `apps/web/static-manifest.json`은 `index.html`, `config.js`, 공개 poster/clip의 SHA-256과 byte size를 담는다. 배포 후 `pnpm check:web-deploy`는 live 파일 해시가 manifest와 같은지 확인한다.
- 배포 후 `MUSUNIL_EXPECTED_COMMIT_SHA=$(git rev-parse HEAD) pnpm launch:post-deploy-smoke`가 live Web static hash와 API smoke를 함께 통과해야 한다. build-info placeholder fallback은 경고이며, static hash 불일치는 실패다.
- 헤더까지 strict하게 닫으려면 `MUSUNIL_STRICT_WEB_HEADERS=1 MUSUNIL_WEB_BASE_URL=https://musunil.com MUSUNIL_EXPECTED_COMMIT_SHA=$(git rev-parse HEAD) pnpm check:web-deploy`가 통과해야 한다.
- 공개 홈 카드에는 `WEAKLY_OBSERVED`, `traffic_control` 같은 내부 enum 원문이 보이지 않는다.
- 내부/admin 라우트는 `x-musunil-internal-key` 없이는 막히고 constant-time 비교를 사용한다.
- 내부 risk dashboard는 사용자/기기 군집을 bucket으로만 표시하고 raw userId/device attestation을 노출하지 않는다.
- 공개 API가 보낸 `deviceIntegrityStatus: pass`는 서버 검증값으로 저장하지 않고 `unknown` 검토 신호로 남긴다.
- 기기 무결성 `pass/fail/unknown` 확정 기록은 내부 인증된 `/internal/evidence/:id/device-integrity`만 수행하며 provider와 attestation proof hash를 함께 남긴다.
- LIVE Claim 공개 전환은 내부 verifier가 device integrity `pass`와 proof hash를 기록한 뒤에만 가능하다.
- Android Play Integrity는 base64 Google service account JSON의 `type`, `project_id`, `client_email`, `private_key`가 없으면 production launch validation이 실패한다.
- iOS App Attest는 team id가 없으면 production launch validation이 실패한다.
- 사용자별 `/me/*`, 구독 생성/수정, 제보 소유권 기록은 서버 서명 anonymous token과 요청 userId가 일치해야 한다.
- Anonymous token은 만료 시간을 포함한다.
- LIVE 제보는 anonymous token 없이는 401이며, 운영 기본값에서는 `held_private`로 검수 대기한다.
- LIVE Proof-of-Presence는 앱 내 촬영 `in_app_camera`와 최소 5초 영상만 통과하고 gallery, screen recording, external link, 너무 짧은 영상은 현장 인증 Claim으로 인정하지 않는다.
- LIVE 제보와 현장 판단 Claim의 5분 제한은 클라이언트가 보낸 `uploadedAt`이 아니라 서버가 기록한 업로드/요청 시각으로 판정한다.
- 현장 판단 Claim은 내부 verifier의 device integrity pass/proof 전에는 `held_private`이며 공개 판단 요약과 이견 수에 반영되지 않는다.
- `held_private` Claim은 공개 홈/상세/우선순위/지도 집계에 반영되지 않고 admin review queue에만 보인다.
- Admin review에서 `--publish`한 Claim만 공개 집계에 반영된다.
- LIVE Claim은 redaction worker 완료 전 `--publish`가 실패하고, Admin review body의 `redactedClipUrl`은 `redaction_worker_required`로 실패한다.
- Redaction worker는 공개본 영상 URL, 공개본 poster URL, `redactionProofToken` 또는 `redactionProofHash`를 함께 남겨야 하며, proof 없는 완료 처리는 `redaction_proof_required`, poster 없는 완료 처리는 `redactedPosterUrl_invalid`로 실패한다.
- LIVE Claim 공개 응답은 정밀 GPS 값 대신 공개 반경 `publicRadiusM`만 노출한다.
- 비식별 공개본 URL 확정 기록은 내부 인증된 `/internal/evidence/:id/redaction`만 수행한다.
- LIVE Claim 공개본 영상/poster URL은 `/media/redacted/` 또는 `*.musunil.com` HTTPS 경로만 허용하고, `http`, private 경로, 외부 임의 host, encoded traversal, 영상/poster 확장자 불일치는 실패한다.
- API 서버가 직접 서빙하는 공개 미디어는 `/media/redacted/*`로 제한하며, repo의 공개 redacted asset root 밖으로 벗어나면 403 또는 404로 실패한다.
- production LIVE 업로드는 S3-compatible storage adapter 또는 `media_encryption_key`가 없으면 `live_storage_unavailable`로 실패하고, 성공 시 원본 base64를 메모리에 보관하지 않으며 PUT 바이트를 AES-GCM으로 암호화한다.
- privacy purge는 외부 storage 원본 media DELETE가 성공한 뒤에만 DB `storageKey`와 hash를 지운다. DELETE 실패 시 `privacy_purge_storage_unavailable`로 실패한다.
- production runtime이 not-ready이면 POST/PATCH write request는 `runtime_not_ready` 503으로 실패한다.
- production 설정에서 `moderation.auto_publish_low_risk_live_reports: true`이면 `pnpm launch:verify-inputs`와 `pnpm config:encode -- --check`가 실패한다.
- 보존 기간이 지난 raw statement와 정밀 위치 필드는 privacy purge로 삭제된다.
- API는 allowed origin만 CORS에 반영하고 `Vary: Origin`, `nosniff`, `no-store`, `no-referrer` 헤더를 보낸다.
- 로컬 smoke는 `localhost:4173`과 `localhost:4174` CORS 허용을 확인한다.

## 운영 필수 입력

- `app.public_base_url`
- `app.support_email`
- `api.public_base_url`
- `web.allowed_origins`
- `domestic_operation.service_country`
- `domestic_operation.public_personal_bank_account_exposure_enabled: false`
- `organization.*`
- `security.jwt_secret` 또는 Render `MUSUNIL_USER_TOKEN_SECRET`
- `security.encryption_key` 또는 Render `MUSUNIL_ENCRYPTION_KEY`
- `security.internal_api_key` 또는 Render `MUSUNIL_INTERNAL_API_KEY`
- `postgres.database_url` 또는 Render `DATABASE_URL`
- `redis.url` 또는 Render `REDIS_URL`
- 기본 OpenFreeMap 외 지도 provider를 쓸 경우 해당 `map.*` 키
- LIVE 미디어 운영을 위한 `security.media_encryption_key`, `storage.provider`, `storage.bucket`, `storage.region`, `storage.access_key_id`, `storage.secret_access_key`
- 법 관련 탭 운영을 위한 `public_data_sources.national_assembly_bill_api_key` 또는 `public_data_sources.law_go_kr_oc`
- 쓰기 기능 운영을 위한 `identity.portone_store_id`, `identity.portone_identity_channel_key`, `identity.portone_api_secret`
- LIVE 공개본 생성을 위한 `redaction.engine_smoke_command`
- LIVE 현장 인증 운영을 위한 Android Play Integrity service account 또는 iOS App Attest team id와 앱 식별자, `mobile.integrity_smoke_command`
- AI provider를 켤 경우 `ai.api_key`
- 실제 push provider를 켤 경우 `notifications.*`
- 모바일 LIVE 제보 출시 전 실제 기기에서 무결성 verifier dry-run

## 개인사업자/PG 단계 입력

도메인 기반 실제 서비스 오픈 후 사용자가 개인사업자 등록과 사업용 계좌 확보를 완료하면 아래 값을 입력한다.

- `organization.operator_type: "individual_business"`
- `organization.business_registration_number`
- `organization.mail_order_sales_registration_number` 또는 신고 전 비워 둠
- `organization.business_bank_account_holder`

PG 계약 후에만 아래 값을 입력하고 `payments.operating_support_enabled`를 켠다.

- `payments.provider`
- `payments.mode`
- `payments.pg_mid`
- `payments.pg_client_key`
- `payments.pg_secret_key`
- `payments.pg_webhook_secret`
- `payments.success_url`
- `payments.fail_url`
- `payments.webhook_url`

`payments.donations_enabled`는 세액공제 가능한 공익 기부금 기능이므로 공익법인등 지정과 기부금품 모집 등록 검토 전에는 false로 둔다.

## 운영 전 수동 확인

- 공공 원천 worker dry-run 결과가 실제 게시판 최신 목록과 맞는다.
- 전국 coverage report의 `schedule_active`, `schedule_candidate`, `statistics_only`, `needs_discovery`, 다음 점검 시각, 공백 사유가 운영 리포트에 반영된다.
- `pnpm launch:external-smoke`가 storage PUT/DELETE, redaction proof, 법 원천 1건 이상 dry-run을 한 번에 통과한다.
- storage/redaction/mobile smoke는 private storage key나 provider raw output을 운영 로그에 그대로 남기지 않는다.
- `pnpm mobile:integrity-smoke`가 실제 모바일 verifier dry-run을 실행하고 `mobile_integrity_provider_dry_run` proof marker를 출력한다.
- storage bucket credential로 `pnpm storage:smoke`가 실제 PUT/DELETE dry-run에 성공한다.
- 비식별 엔진 command로 `pnpm redaction:smoke`가 입력 파일을 처리해 공개본 후보 파일과 proof hash를 만든다.
- Web `config.js`에는 `apiBaseUrl`, `mapStyleUrl`만 있고 내부 키/secret 필드가 없으며 현재 YAML 값과 일치한다.
- Render Web 응답 헤더는 Blueprint 선언값이 실제 응답에 반영되는지 배포 후 확인한다.
- 관리자 검수 큐에서 권리침해 신고/반론/고위험 Claim을 볼 수 있다.
- `pnpm admin:queue`, `pnpm admin:claim`, `pnpm admin:redaction`이 내부 키로만 동작한다.
- `pnpm dispatch:notifications`가 의미 있는 상태 변화 outbox만 처리하고 due 항목을 `sent`로 마감한다.
- Render cron job은 UTC 기준으로 돈다.
- 대량 신고가 자동 삭제로 이어지지 않는다.
- 상태 변화 외 알림이 발송되지 않는다.
- 구독 `alertTypes`, mute, dedupe/cooldown이 적용된다.
- 데스크톱/모바일 캡처에서 텍스트 겹침과 가로 overflow가 없다.

## 출시 보류 조건

- `/ready` 실패.
- `/ready` 실패 상태에서 write request가 성공함.
- `MUSUNIL_USER_INPUTS_B64` 또는 Secret File 누락.
- 템플릿 기본값이 운영 설정에 남아 있음.
- `.example`, `sample`, `placeholder`, `CHANGE_ME` 값이 운영 설정에 남아 있음.
- Render 서비스에서 `MUSUNIL_RUNTIME_ENV=production`이 빠짐.
- 지도 provider가 `mock`.
- `preview.use_mock_data`가 production에서 true.
- 운영 origin에 `localhost` 포함.
- 국내 v1에서 해외 결제, 세액공제 기부금 영수증, 개인 계좌 공개 플래그가 켜짐.
- 개인사업자 등록과 PG 계약 전 `payments.operating_support_enabled`를 켬.
- 후원/결제가 랭킹, 알림, 신뢰도, 지도 노출, Claim 우선순위에 영향을 줌.
- 원본 미디어 비식별화 경로 미연결 상태에서 LIVE 공개를 켬.
- 규모 추정을 Claim 메타 없이 단정 숫자처럼 공개함.
- 공개 가능한 현장 영상 근거 없이 지역 수만으로 규모 추정 독립 시점 수를 올림.
- 공개 일정·자료 Claim만 있는 이슈에 자동 규모 숫자를 표시함.
- 비식별/기기검증이 빠진 과거 영상 근거를 저장 규모 추정, 전국 시간축, 공개 검증 신호에 계속 사용함.
- `redaction.engine_smoke_command`가 없거나 `{input}`, `{output}` 자리표시자를 포함하지 않음.
- Play Integrity와 App Attest가 모두 꺼진 상태에서 LIVE 현장 제보를 운영함.
- 내부 verifier device integrity pass/proof hash 없이 LIVE Claim을 공개함.
- gallery, screen recording, external link를 LIVE 현장 인증으로 받음.
- 5초 미만 영상을 LIVE 현장 인증으로 받음.
- 클라이언트가 보낸 `uploadedAt`으로 LIVE/현장 판단 Proof-of-Presence 5분 제한을 통과시킴.
- 내부 verifier device integrity pass/proof 없이 현장 판단 Claim을 공개 요약이나 이견 수에 반영함.
- `moderation.auto_publish_low_risk_live_reports`를 정책/마스킹 경로 확정 전에 true로 켬.
