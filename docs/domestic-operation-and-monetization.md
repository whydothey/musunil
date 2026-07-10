# 국내 운영 및 운영 후원 구조

Last updated: 2026-07-10 17:41 KST

무슨일은 현재 대한민국 국내 사용자와 국내 공개 원천을 대상으로 운영한다. 해외 결제, 해외 법인, 외화 정산, 해외 개인정보 이전은 v1 범위에서 제외한다.

이 문서는 법률·세무 자문을 대체하지 않는다. 실제 개인사업자 등록, 통신판매업 신고, PG 계약, 기부금품 모집 등록 필요 여부는 세무사 또는 법무 전문가와 최종 확인한다.

## 운영 순서

1. 도메인 기반 실제 서비스 오픈
   - `musunil.com`, `api.musunil.com` 기준 HTTPS 배포를 먼저 완료한다.
   - 실제 공개 원천 API, 저장소, 비식별 엔진, 모바일 무결성 smoke를 우선 연결한다.
   - 결제 기능은 이 단계에서 켜지 않는다.

2. 개인사업자 등록 및 사업용 계좌 확보
   - 운영 주체는 초기에는 개인사업자로 시작한다.
   - 앱에는 개인 사적 계좌를 공개하지 않는다.
   - 수익과 비용은 사업용 계좌로 분리한다.
   - `organization.business_registration_number`, `organization.business_bank_account_holder`는 개인사업자 등록 후 로컬 YAML에만 입력한다.

3. PG 결제 연결
   - 단발 운영 후원과 정기 운영 후원은 PG 결제로 받는다.
   - 결제명은 `기부`보다 `무슨일 운영 후원` 또는 `서포터 결제`를 우선 사용한다.
   - PG secret, webhook secret은 Render 환경변수 또는 Secret File로만 주입한다.

4. 투명성 페이지 공개
   - 후원금은 서버, 지도, 원천 수집, 비식별 처리, 운영 검수 비용에 사용한다고 밝힌다.
   - 후원은 노출, 알림, 신뢰도, 랭킹, 지도 표시, Claim 우선순위에 영향을 주지 않는다고 표시한다.
   - 세액공제 기부금 영수증을 발급하지 않는 단계라면 그 사실을 명확히 표시한다.

## 비협상 원칙

- 개인 계좌번호를 공개 화면에 직접 노출하지 않는다.
- 후원자 전용 이슈 우선 노출, 후원자 알림 우선권, 후원자 신뢰도 가중치를 만들지 않는다.
- 후원 내역은 Claim, Evidence, Risk level, Evidence strength 계산에 들어가지 않는다.
- 후원 결제 실패나 환불은 정보 접근 권한을 제한하는 방식으로 처리하지 않는다.
- 자유 댓글, 추천/비추천, 찬반투표, 후원 기반 배지는 만들지 않는다.

## 입력 파일 반영 위치

사용자가 직접 채우는 값은 `config/musunil.user-inputs.local.yaml` 한 파일에만 둔다.

도메인 오픈 전 필수:

- `app.public_base_url`
- `api.public_base_url`
- `web.allowed_origins`
- `app.support_email`
- `organization.legal_name`
- `organization.operator_name`
- `organization.privacy_officer_*`
- `organization.location_info_manager_*`
- `public_data_sources.national_assembly_bill_api_key` 또는 `public_data_sources.law_go_kr_oc`
- `security.media_encryption_key`
- `storage.*`
- `redaction.engine_smoke_command`
- `mobile.*`

개인사업자 등록 후 입력:

- `organization.operator_type: "individual_business"`
- `organization.business_registration_number`
- `organization.mail_order_sales_registration_number` 또는 신고 면제/비대상 판단 근거
- `organization.business_bank_account_holder`

PG 연결 후 입력:

- `payments.operating_support_enabled`
- `payments.provider`
- `payments.pg_mid`
- `payments.pg_client_key`
- `payments.pg_secret_key`
- `payments.pg_webhook_secret`
- `payments.success_url`
- `payments.fail_url`
- `payments.webhook_url`

## 결제 기능을 켜는 조건

아래 조건을 모두 만족하기 전까지 `payments.operating_support_enabled`와 `payments.donations_enabled`는 `false`로 둔다.

- 개인사업자 등록 완료.
- 사업용 계좌 확보.
- PG 계약 완료.
- 환불/취소/정기결제 해지 안내 문구 확정.
- 개인정보처리방침에 결제 처리 위탁/수집 항목 반영.
- 후원 투명성 페이지 공개.
- 후원 영향 금지 smoke가 통과.

현재 launch validation은 `payments.donations_enabled: false`를 요구한다. 이는 세액공제 가능한 공익 기부금 기능을 켜지 않는다는 뜻이며, 운영 후원 PG는 별도 검토 후 `operating_support_enabled`로만 단계적으로 연결한다.
