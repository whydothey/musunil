# 사용자 입력 파일 작성 매뉴얼

Last updated: 2026-07-10 17:41 KST

무슨일은 사용자가 직접 넣어야 하는 운영 값을 한 파일에서만 읽는다.

```bash
pnpm launch:inputs
```

위 명령은 `config/musunil.user-inputs.local.yaml`을 만든다. 이미 파일이 있으면 덮어쓰지 않는다. 수동으로 만들 때는 아래처럼 복사한다.

```bash
cp config/musunil.user-inputs.template.yaml config/musunil.user-inputs.local.yaml
```

작성 후에는 아래 명령으로 검증한다.

```bash
pnpm launch:verify-inputs
```

이 명령은 먼저 `config/musunil.user-inputs.template.yaml`과 로컬 입력 파일의 필드 구조를 비교한다. 오래된 로컬 파일에 새 섹션이 빠져 있으면 실제 값 검증 전에 누락 경로를 출력한다.

Render 기본 배포에서는 `DATABASE_URL`, `REDIS_URL`, `MUSUNIL_USER_TOKEN_SECRET`, `MUSUNIL_ENCRYPTION_KEY`, `MUSUNIL_INTERNAL_API_KEY`를 Render가 주입한다. 사용자는 로컬 YAML의 `CHANGE_ME_*` 값부터 채운다.

국내 운영과 후원 수익화 구조는 [domestic-operation-and-monetization.md](/Users/mk/Documents/Musunil/docs/domestic-operation-and-monetization.md)에 따로 정리한다.

## 현재 진행 순서

1. 도메인 기반 실제 서비스 오픈
2. 개인사업자 등록 및 사업용 계좌 확보
3. PG 단발/정기 운영 후원 연결

지금 우선순위는 1번이다. 개인사업자 번호, 사업용 계좌, PG 키는 실제 서비스가 도메인에서 정상 동작한 뒤 입력한다.

## 1. 도메인과 운영자 정보

도메인은 이미 `musunil.com` 기준으로 들어가 있다. 실제 배포 URL과 연락처부터 확정한다.

- `app.public_base_url`
- `api.public_base_url`
- `web.allowed_origins`
- `app.support_email`
- `organization.legal_name`
- `organization.operator_name`
- `organization.privacy_officer_name`
- `organization.privacy_officer_email`
- `organization.location_info_manager_name`
- `organization.location_info_manager_email`

기본 URL은 아래 상태로 둔다.

```yaml
app:
  public_base_url: "https://musunil.com"
api:
  public_base_url: "https://api.musunil.com"
web:
  allowed_origins:
    - "https://musunil.com"
```

`web.allowed_origins`는 브라우저 CORS Origin과 정확히 같은 값이어야 한다. 운영에서는 `https://musunil.com`처럼 scheme과 host만 쓰고, 마지막 `/`, path, query, localhost를 넣지 않는다. 이 값에는 `app.public_base_url`의 origin이 반드시 포함되어야 한다. `identity.session_cookie_domain`은 Web과 API를 모두 덮는 `.musunil.com`처럼 설정한다.

국내 한정 운영 기본값은 아래 상태로 둔다.

```yaml
domestic_operation:
  service_country: "KR"
  service_language: "ko-KR"
  overseas_service_enabled: false
  overseas_payments_enabled: false
  tax_deductible_donation_receipt_enabled: false
  public_personal_bank_account_exposure_enabled: false
```

`public_personal_bank_account_exposure_enabled`는 운영 중에도 `false`를 유지한다.

## 2. 실제 서비스 오픈에 가장 급한 API·인프라

도메인 기반 오픈 전에 아래 순서로 채운다.

1. 법령·의안 공개 원천
   - `public_data_sources.national_assembly_bill_api_key`
   - 또는 `public_data_sources.law_go_kr_oc`
   - 법 탭과 이슈-법안 연결을 실제 공개 원천으로 돌리려면 둘 중 하나가 필요하다.

2. 포트원 본인확인
   - `identity.provider: "portone"`
   - `identity.portone_store_id`
   - `identity.portone_identity_channel_key`
   - `identity.portone_api_secret`
   - `identity.session_cookie_domain`
   - 읽기는 공개지만 제보, 현장 판단, 반론, 신고, 알림 설정은 본인확인 완료 세션이 필요하다.
   - 실제 운영 직전에는 포트원 본인확인을 1회 완료하고, 완료된 verification id를 현재 터미널에만 `MUSUNIL_PORTONE_SMOKE_IDENTITY_VERIFICATION_ID`로 넣은 뒤 `pnpm identity:smoke`를 실행한다. 이 ID는 YAML이나 Git에 저장하지 않는다.

3. LIVE 현장 영상 원본 저장소
   - `security.media_encryption_key`
   - `storage.provider`
   - `storage.bucket`
   - `storage.region`
   - `storage.endpoint`
   - `storage.access_key_id`
   - `storage.secret_access_key`
   - 실제 credential 입력 후 `pnpm storage:smoke`를 실행한다. `MUSUNIL_STORAGE_SMOKE_KEY`를 직접 지정할 때도 `private/live/smoke/` 아래 값만 사용하고, 기존 원본 미디어 key를 넣지 않는다.

4. 영상 비식별 엔진
   - `redaction.engine_smoke_command`
   - `{input}`과 `{output}`이 반드시 들어가야 한다.

5. 모바일 현장 인증
   - Android 우선이면 `mobile.android_*`
   - iOS 우선이면 `mobile.ios_*`
   - `mobile.integrity_smoke_command`

6. 지도
   - 기본값은 OpenFreeMap이라 별도 API 키가 필요 없다.
   - 유료 지도 provider로 바꿀 때만 별도 설정을 추가한다.

## 3. 보안 키

Render 기본 배포에서는 아래 값은 비워 둔다.

- `security.jwt_secret`
- `security.encryption_key`
- `security.internal_api_key`

사용자가 직접 채워야 하는 값은 LIVE 원본 미디어 암호화 키다.

- `security.media_encryption_key`

권장 생성:

```bash
openssl rand -base64 48
```

## 4. DB와 Redis

Render 기본 배포에서는 비워 둔다.

- `postgres.database_url`
- `redis.url`

외부 DB/Redis를 직접 쓰는 경우에만 입력한다.

## 5. 미디어 저장소

실시간 GPS 현장 영상 제보를 운영하려면 S3 또는 R2 같은 S3 호환 저장소가 필요하다.

- `storage.provider`
- `storage.bucket`
- `storage.region`
- `storage.endpoint`
- `storage.access_key_id`
- `storage.secret_access_key`

AWS S3는 `storage.endpoint`를 비워 둔다. Cloudflare R2 같은 호환 저장소는 endpoint를 입력한다.

## 6. 영상 비식별 엔진

현장 영상은 공개 전 얼굴, 차량번호, 민감 정보 비식별 처리가 필요하다.

- `redaction.engine_smoke_command`

명령에는 `{input}`과 `{output}`이 반드시 들어가야 한다.

```yaml
redaction:
  engine_smoke_command: "node scripts/redact-media.mjs {input} {output}"
```

검증:

```bash
pnpm redaction:smoke
```

기본값은 저장소에 포함된 ffmpeg 비식별 엔진이다. 음성·메타데이터를 제거하고 영상 전체를 보수적으로 흐린 뒤 운영 검토용 공개 후보본을 만든다. `{input}`과 `{output}` 토큰은 삭제하지 않는다. 더 정밀한 얼굴·번호판 선택 마스킹 엔진을 도입할 때만 같은 입출력 계약으로 교체한다.

이 smoke는 실제 합성 영상을 만들고 음성·메타데이터 제거와 시각 세부 감소를 검사한다. 단순히 `{input}`을 `{output}`으로 복사하는 명령은 운영 준비 증거가 아니다.

## 7. 모바일 현장 인증

운영에서는 Android Play Integrity 또는 iOS App Attest 중 하나가 필수다.

Android 우선:

- `mobile.android_play_integrity_enabled: true`
- `mobile.android_package_name`
- `mobile.android_play_integrity_service_account_json_b64`
- `mobile.integrity_smoke_command`

iOS만 쓸 때:

- `mobile.android_play_integrity_enabled: false`
- `mobile.ios_app_attest_enabled: true`
- `mobile.ios_bundle_id`
- `mobile.ios_team_id`
- `mobile.integrity_smoke_command`

Android service account JSON은 파일 전체를 base64로 인코딩한다.

```bash
base64 -i play-integrity-service-account.json | tr -d '\n'
```

`mobile.integrity_smoke_command`는 성공 시 마지막 줄에 구조화된 JSON proof를 출력해야 한다. marker 문자열만 출력하는 명령은 운영 증거가 아니다.

Android 예시:

```json
{"checked":"mobile_integrity_provider_dry_run","provider":"play_integrity","packageName":"app.musunil.android","verdict":"ok"}
```

iOS 예시는 `provider: "app_attest"`, `bundleId`, `teamId`, `verdict`를 포함해야 한다. 서비스 계정 JSON, private key, attestation 원문은 smoke 출력에 남기지 않는다.

## 8. 법령·의안 공개 원천

법 관련 탭과 이슈 연결에는 아래 둘 중 하나가 필요하다.

- `public_data_sources.national_assembly_bill_api_key`
- `public_data_sources.law_go_kr_oc`

둘 다 있으면 국회 의안과 국가법령정보를 함께 사용할 수 있다. `law_interest_keywords`는 집회 이슈와 법령·의안을 연결할 검색어다.

## 9. 지도

기본값은 별도 키가 필요 없는 MapLibre + OpenFreeMap이다.

- `map.provider: "openfreemap"`
- `map.map_style_url: "https://tiles.openfreemap.org/styles/positron"`

공개 위치 흐림 값은 운영에서 줄이지 않는다.

- `map.public_location_blur_meters: 200`
- `map.sensitive_location_blur_meters: 500`

NAVER, Kakao, MapTiler 키는 기본 로컬 시크릿에서 제외했다. 특정 지도 사업자로 바꿀 때만 별도 설정을 추가한다.

## 10. 개인사업자 등록 후 입력할 값

도메인 기반 실제 서비스가 먼저 열린 뒤, 사용자가 개인사업자 등록과 사업용 계좌 확보를 완료하면 아래 값을 채운다.

- `organization.operator_type: "individual_business"`
- `organization.business_registration_number`
- `organization.mail_order_sales_registration_number`
- `organization.business_bank_account_holder`

`business_bank_account_holder`는 PG 정산 및 내부 운영 확인용이다. 공개 화면에 개인 계좌번호를 직접 노출하지 않는다.

통신판매업 신고 필요 여부는 PG 정기결제/디지털 멤버십/후원 상품 구성에 따라 달라질 수 있으므로 사업자 등록 후 확인한다. 신고 전이면 `organization.mail_order_sales_registration_number`는 비워 둔다.

## 11. PG 결제 연결 후 입력할 값

PG 연결 전에는 아래 값을 비활성 상태로 둔다.

```yaml
payments:
  donations_enabled: false
  operating_support_enabled: false
  provider: ""
  mode: "disabled"
```

PG 계약 후에만 아래 값을 채운다.

- `payments.operating_support_enabled`
- `payments.provider`
- `payments.mode`
- `payments.pg_mid`
- `payments.pg_client_key`
- `payments.pg_secret_key`
- `payments.pg_webhook_secret`
- `payments.success_url`
- `payments.fail_url`
- `payments.webhook_url`

초기 문구는 `기부`가 아니라 `무슨일 운영 후원`으로 둔다.

```yaml
payments:
  public_label: "무슨일 운영 후원"
  settlement_currency: "KRW"
  tax_treatment: "business_income"
```

아래 값은 운영 중에도 `false`를 유지한다.

```yaml
payments:
  influence_on_ranking_enabled: false
  influence_on_alerts_enabled: false
  influence_on_trust_enabled: false
```

`payments.donations_enabled`는 세액공제 가능한 공익 기부금 기능을 뜻한다. 공익법인등 지정이나 기부금품 모집 등록 검토 전에는 `false`를 유지한다.

## 12. 반드시 유지할 운영 정책

아래 값은 운영 전 기본값을 바꾸지 않는다.

```yaml
preview:
  use_mock_data: false

features:
  free_comments_enabled: false
  voting_enabled: false

payments:
  donations_enabled: false
  influence_on_ranking_enabled: false
  influence_on_alerts_enabled: false
  influence_on_trust_enabled: false

moderation:
  auto_publish_low_risk_live_reports: false
```

의미:

- 개발용 sample fixture는 운영에 섞이지 않는다.
- 자유 댓글과 찬반투표는 만들지 않는다.
- 후원은 랭킹, 알림, 신뢰도, 지도 노출에 영향을 주지 않는다.
- LIVE 제보는 관리자 검수 전 공개하지 않는다.

## 13. 나중에 켤 값

아래 항목은 지금 로컬 시크릿에서 뺐다. 실제 provider를 정했을 때만 추가한다.

- FCM/APNs 실제 푸시 발송 키
- NAVER/Kakao/MapTiler 지도 키
- 경찰·지자체의 집회·시위 공개 일정 원천 중 아직 연결 방식이 확정되지 않은 키
- AI provider, model 이름, token 한도

현재 템플릿에는 AI 추정 Claim을 나중에 켤 수 있도록 최소 필드만 남겨 두었다.

```yaml
ai:
  provider: ""
  api_key: ""
```

## 14. Render 주입

운영 기본 방식은 Render Secret File이다. 로컬 파일은 저장소에 커밋하지 않고 권한을 `600`으로 유지한다.

```bash
pnpm launch:inputs
chmod 600 config/musunil.user-inputs.local.yaml
pnpm launch:verify-inputs config/musunil.user-inputs.local.yaml
pnpm render:runtime-secret
```

마지막 명령은 기본적으로 dry-run이다. 로컬 YAML 검증, 파일 권한, Render API와 scheduler 서비스 존재 여부만 확인하고 쓰지 않는다. 실제 적용은 두 서비스가 생성되고 모든 입력값을 채운 뒤에만 실행한다.

```bash
RENDER_API_TOKEN=... \
MUSUNIL_RENDER_SECRET_APPLY_CONFIRM=APPLY_RUNTIME_SECRET_FILE \
pnpm render:runtime-secret -- --apply
```

이 명령은 같은 `musunil.user-inputs.yaml`을 `musunil-api`와 `musunil-ops-scheduler`에 업로드하고 두 서비스의 경로를 아래와 같이 맞춘다.

```text
MUSUNIL_USER_INPUTS_FILE_PATH=/etc/secrets/musunil.user-inputs.yaml
```

`MUSUNIL_USER_INPUTS_B64`는 로컬/CI 호환 경로일 뿐 운영 기본값이 아니다. Static Web에는 YAML, Secret File, DB/Redis URL, token, 암호화 키를 넣지 않는다.

## 15. 운영 전 최종 확인

입력 완료 후 기본 검증:

```bash
pnpm ops:diagnose
pnpm launch:ready -- config/musunil.user-inputs.local.yaml
```

`pnpm ops:diagnose`는 storage, redaction, mobile integrity, identity의 준비 상태를 먼저 보여준다. `readyForExternalSmoke`가 false이면 출력의 `requiredActions`를 해결한 뒤 `launch:ready`를 실행한다.

법 데이터 반영까지 포함한 리허설:

```bash
pnpm launch:ready -- config/musunil.user-inputs.local.yaml --post-laws
```

배포 후 API 상태:

```text
GET /health -> 200
GET /ready -> 200
```

`/ready`가 503이면 응답의 `summary.blockingGroups`와 `requiredActions`를 먼저 본다. 예를 들어 `database`, `redis`, `storage`, `identity`, `public_sources`, `mobile_integrity`가 표시되면 해당 Render 연결값 또는 YAML 값을 채운 뒤 다시 확인한다.

배포 URL 기준 비파괴 smoke:

```bash
pnpm sources:refresh-preflight
pnpm launch:post-deploy-smoke -- --require-laws --require-source-refreshes
```

이 smoke는 production 기본값으로 `https://musunil.com`, `https://api.musunil.com`, 현재 Git SHA를 보정한다. staging/preview 도메인을 검증할 때만 `MUSUNIL_WEB_BASE_URL`과 `MUSUNIL_API_BASE_URL`을 실제 HTTPS 배포 URL로 override한다. localhost, 127.0.0.1, `.local`, HTTP URL은 최종 운영 smoke로 인정하지 않는다.

배포 후 최종 판정:

```bash
pnpm launch:final-gate
```

`pnpm launch:final-gate`는 production 기본값으로 `musunil.com`, `api.musunil.com`, 현재 Git SHA를 보정한다. 공개 집회 원천 refresh preflight를 먼저 실행하고, `pnpm cloudflare:check:strict`로 Web header와 API CNAME target을 확인한 뒤, post-deploy smoke를 법안과 공개 집회 원천 refresh 필수 조건으로 실행하고 live service watch를 새로 갱신한다. `MUSUNIL_RENDER_API_DNS_TARGET`이 없고 Render API token이 있으면 Render service URL에서 target을 자동 파생한다. blocker가 하나라도 남아 있으면 실패하며, 앞 검증이 실패해도 blocker 갱신은 시도하므로 출력된 단계별 결과와 `docs/splus-service-watch.md`의 Required Actions를 기준으로 고친다.

Render Static Site 수동 설정값 확인:

```bash
pnpm launch:cutover-plan
pnpm render:web-settings
# Render Dashboard에서 복사한 실제 target을 두 환경변수에 먼저 export한다.
: "${MUSUNIL_RENDER_WEB_DNS_TARGET:?set exact Render Web target from Render first}"
: "${MUSUNIL_RENDER_API_DNS_TARGET:?set exact Render API target from Render first}"
pnpm cloudflare:dns
pnpm cloudflare:check:strict
```

`pnpm launch:cutover-plan`은 API DNS, Cloudflare, Render Static headers, 검증 순서를 한 번에 보여준다. `pnpm render:web-settings` 출력값의 Branch, Root Directory, Build Command, Publish Directory, Headers를 Render Dashboard에 그대로 맞춘 뒤 `Clear build cache & deploy`를 실행한다. Render Custom Domain target은 로컬 환경변수에만 넣고, `pnpm cloudflare:check:strict`로 DNS, Web HTTPS, `config.js`, Web headers, API `/health`, `/ready`, API CNAME target을 분리해서 확인한다. 이후 Web 정적 배포와 헤더를 strict하게 확인한다.

```bash
MUSUNIL_STRICT_WEB_HEADERS=1 \
MUSUNIL_WEB_BASE_URL=https://musunil.com \
MUSUNIL_EXPECTED_COMMIT_SHA=$(git rev-parse HEAD) \
pnpm check:web-deploy
```

## 16. 운영 CLI 확인

```bash
pnpm build:web-config
pnpm launch:ready -- config/musunil.user-inputs.local.yaml
pnpm dev:web
pnpm admin:queue
pnpm admin:claim <claim_id> -- --risk low --reason "검수 완료"
pnpm admin:redaction <evidence_id> -- --url "/media/redacted/clip.webm" --proof-hash "sha256-..."
```
