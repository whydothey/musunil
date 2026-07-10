# S+ Completion Audit

Last updated: 2026-07-10 04:54 KST

Status: 완료 아님.

이 문서는 active goal 완료 여부를 감사한다. 완료 판단은 `docs/splus-master-tracker.md`의 Element Execution Board, launch checklist, 실제 명령 실행 결과를 함께 봐야 한다.

## Completion Rule

active goal은 아래 조건이 모두 증명될 때만 완료다.

- 모든 항목이 S+ 또는 운영에서 동등하게 검증된 Guard 상태다.
- Active row가 0개다.
- `pnpm launch:ready -- <운영 user-inputs.yaml>`가 실제 운영 입력값으로 통과한다.
- `pnpm launch:post-deploy-smoke -- --require-laws`가 실제 배포 API URL로 통과한다.
- storage, redaction, mobile integrity, law source dry-run/post, production `/ready`가 실제 외부 연결로 통과한다.
- 공개 화면과 공개 API에 원문, 정밀 위치, private media key, 요구사항 문구가 나오지 않는다.

## Requirement Audit

| 요구사항 | 현재 판정 | 증거 | 남은 조건 |
|---|---|---|---|
| 주제 기반 전국 묶기 | S+ Guard | `topicGrouping`, Issue detail self-check, web smoke | 새 원천 유입 시 회귀 방지 |
| 뉴스 비의존성 | S+ Guard | 18개 권역 공개 일정 parser, `/public-sources/coverage`, runtime smoke | 운영 cron 실패 감지와 실운영 수집 확인 |
| 실시간 현장 인증 | A+ Active | 앱 내 촬영, 최소 5초, 서버 시각, held_private, redaction proof, trusted device integrity gate | 실제 storage, redaction, Play Integrity/App Attest dry-run |
| 전국 동시다발 인지 | S+ Guard | `nationalTimeline`, 자료/지역 필터, 모바일/데스크톱 캡처 | 새 데이터 유입 시 회귀 방지 |
| 규모 실시간 추정 | A+ Active | AI 추정 Claim 메타, 공개 근거 없는 추정 차단, 독립 시점 과대 산정 차단 | 실제 운영 영상/현장 인증 결과를 추정 confidence에 연결 |
| 조작 방어 | S+ Guard | 반복 해시, GPS 품질, 사용자/기기 bucket, 지역 편중, risk dashboard | 운영 실측 임계값 튜닝 |
| 개인정보/권리 보호 | A+ Active | private key/raw GPS 비노출, 공개 반경, purge 전 외부 delete gate | 실제 storage 권한, redaction smoke, purge 검증 |
| 알권리 중심 UX | S+ Guard | 390px/1440px 캡처, issue-first UX, 금지 문구 web smoke | 신규 화면마다 캡처 갱신 |
| 법안·개정안 연결 | A+ Active | parser mock self-check, `/laws`, production preview 비노출, 0건 dry-run 실패 가드 | 실제 법 API 키로 dry-run 1건 이상과 post 검증 |
| 운영 배포 준비 | A- Active | Render blueprint, `/ready`, not-ready write fail-closed, `launch:ready` | 실제 운영 YAML/Secret, DB/Redis, Render 배포 health 통과 |

## Current Passing Evidence

- `pnpm check:release`
- `pnpm check:splus`
- `pnpm launch:ready -- --list`로 actual input 단계와 sample gate 단계를 구분
- `pnpm launch:external-smoke -- --list`
- API/runtime/web smoke 경계 검증

## Required Final Evidence

아래는 실제 운영 입력값과 외부 연결이 있어야 한다.

```bash
pnpm launch:ready -- config/musunil.user-inputs.local.yaml
pnpm launch:ready -- config/musunil.user-inputs.local.yaml --post-laws
MUSUNIL_API_BASE_URL=https://api.example.com pnpm launch:post-deploy-smoke -- --require-laws
```

배포 후:

```text
GET /health -> 200
GET /ready -> 200
```

## Non-Completion Reasons

- 실제 `pnpm storage:smoke` 결과가 아직 없다.
- 실제 `pnpm redaction:smoke` 결과가 아직 없다.
- 실제 `pnpm mobile:integrity-smoke` 결과가 아직 없다.
- 실제 법 원천 `pnpm sources:laws` 1건 이상 dry-run/post 결과가 아직 없다.
- 운영 DB/Redis/Render `/ready` 결과가 아직 없다.
- `check:render-runtime-config`는 Render generated secret fallback의 sample gate이며, 실제 배포 `/ready` 증거를 대체하지 않는다.

## Next Active Goal Order

1. 실제 운영 입력 YAML을 채운다.
2. `pnpm launch:ready -- <yaml>`를 통과시킨다.
3. `pnpm launch:ready -- <yaml> --post-laws`를 staging 또는 운영 전 리허설에서 통과시킨다.
4. Render 배포 후 `pnpm launch:post-deploy-smoke -- --require-laws`를 실제 URL 기준으로 통과시킨다.
5. Element Execution Board의 Active row를 증거 기반으로 Guard 또는 S+로 승급한다.
