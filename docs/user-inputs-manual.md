# 사용자 입력 파일 작성 매뉴얼

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

Render 기본 배포에서는 `DATABASE_URL`, `REDIS_URL`, `MUSUNIL_USER_TOKEN_SECRET`, `MUSUNIL_ENCRYPTION_KEY`, `MUSUNIL_INTERNAL_API_KEY`를 Render가 주입한다. 사용자는 로컬 YAML의 `CHANGE_ME_*` 값부터 채운다.

## 1. 가장 먼저 채울 값

도메인은 이미 `musunil.com` 기준으로 들어가 있다. 메일과 운영자 정보만 먼저 채운다.

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

## 2. 보안 키

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

## 3. DB와 Redis

Render 기본 배포에서는 비워 둔다.

- `postgres.database_url`
- `redis.url`

외부 DB/Redis를 직접 쓰는 경우에만 입력한다.

## 4. 미디어 저장소

실시간 GPS 현장 영상 제보를 운영하려면 S3 또는 R2 같은 S3 호환 저장소가 필요하다.

- `storage.provider`
- `storage.bucket`
- `storage.region`
- `storage.endpoint`
- `storage.access_key_id`
- `storage.secret_access_key`

AWS S3는 `storage.endpoint`를 비워 둔다. Cloudflare R2 같은 호환 저장소는 endpoint를 입력한다.

## 5. 영상 비식별 엔진

현장 영상은 공개 전 얼굴, 차량번호, 민감 정보 비식별 처리가 필요하다.

- `redaction.engine_smoke_command`

명령에는 `{input}`과 `{output}`이 반드시 들어가야 한다.

```yaml
redaction:
  engine_smoke_command: "node /opt/musunil-redact/cli.mjs {input} {output}"
```

검증:

```bash
pnpm redaction:smoke
```

## 6. 모바일 현장 인증

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

`mobile.integrity_smoke_command`는 성공 시 `mobile_integrity_provider_dry_run`을 출력해야 한다.

## 7. 법령·의안 공개 원천

법 관련 탭과 이슈 연결에는 아래 둘 중 하나가 필요하다.

- `public_data_sources.national_assembly_bill_api_key`
- `public_data_sources.law_go_kr_oc`

둘 다 있으면 국회 의안과 국가법령정보를 함께 사용할 수 있다. `law_interest_keywords`는 집회 이슈와 법령·의안을 연결할 검색어다.

## 8. 지도

기본값은 별도 키가 필요 없는 MapLibre + OpenFreeMap이다.

- `map.provider: "openfreemap"`
- `map.map_style_url: "https://tiles.openfreemap.org/styles/positron"`

공개 위치 흐림 값은 운영에서 줄이지 않는다.

- `map.public_location_blur_meters: 200`
- `map.sensitive_location_blur_meters: 500`

NAVER, Kakao, MapTiler 키는 기본 로컬 시크릿에서 제외했다. 특정 지도 사업자로 바꿀 때만 별도 설정을 추가한다.

## 9. 반드시 유지할 운영 정책

아래 값은 운영 전 기본값을 바꾸지 않는다.

```yaml
preview:
  use_mock_data: false

features:
  free_comments_enabled: false
  voting_enabled: false

payments:
  donations_enabled: false

moderation:
  auto_publish_low_risk_live_reports: false
```

의미:

- mock 데이터는 운영에 섞이지 않는다.
- 자유 댓글과 찬반투표는 만들지 않는다.
- 후원은 랭킹, 알림, 신뢰도, 지도 노출에 영향을 주지 않는다.
- LIVE 제보는 관리자 검수 전 공개하지 않는다.

## 10. 나중에 켤 값

아래 항목은 지금 로컬 시크릿에서 뺐다. 실제 provider를 정했을 때만 추가한다.

- FCM/APNs 실제 푸시 발송 키
- 결제 provider 키
- NAVER/Kakao/MapTiler 지도 키
- 경찰·지자체·교통 API 중 아직 연결 방식이 확정되지 않은 키
- AI provider, model 이름, token 한도

현재 템플릿에는 AI 추정 Claim을 나중에 켤 수 있도록 최소 필드만 남겨 두었다.

```yaml
ai:
  provider: ""
  api_key: ""
```

## 11. Render 주입

방법 A: YAML 전체를 base64로 넣는다.

```bash
pnpm launch:inputs
pnpm launch:verify-inputs
pnpm config:encode -- --check config/musunil.user-inputs.local.yaml
pnpm config:encode -- config/musunil.user-inputs.local.yaml
```

Render 환경변수:

```text
MUSUNIL_USER_INPUTS_B64=<base64 결과>
```

방법 B: Render Secret File을 사용한다.

```text
MUSUNIL_USER_INPUTS_FILE_PATH=/etc/secrets/musunil.user-inputs.yaml
```

## 12. 운영 전 최종 확인

입력 완료 후 기본 검증:

```bash
pnpm launch:ready -- config/musunil.user-inputs.local.yaml
```

법 데이터 반영까지 포함한 리허설:

```bash
pnpm launch:ready -- config/musunil.user-inputs.local.yaml --post-laws
```

배포 후 API 상태:

```text
GET /health -> 200
GET /ready -> 200
```

배포 URL 기준 비파괴 smoke:

```bash
MUSUNIL_API_BASE_URL=https://api.musunil.com pnpm launch:post-deploy-smoke -- --require-laws
```

`MUSUNIL_API_BASE_URL`은 실제 HTTPS API URL이어야 한다. localhost, 127.0.0.1, `.local`, HTTP URL은 최종 운영 smoke로 인정하지 않는다.

## 13. 운영 CLI 확인

```bash
pnpm build:web-config
pnpm launch:ready -- config/musunil.user-inputs.local.yaml
pnpm dev:web
pnpm admin:queue
pnpm admin:claim <claim_id> -- --risk low --reason "검수 완료"
pnpm admin:redaction <evidence_id> -- --url "/media/redacted/clip.webm" --proof-hash "sha256-..."
pnpm admin:claim <claim_id> -- --publish --reason "공개 가능"
pnpm dispatch:notifications
pnpm privacy:purge
pnpm launch:external-smoke
pnpm --filter @musunil/public-source-ingest dev -- --post
pnpm smoke:api -- --require-ready
pnpm smoke:api -- --boundary-checks
```

`--write-checks`는 테스트 Claim을 남기므로 staging 또는 운영 전 최종 리허설에서만 사용한다.
