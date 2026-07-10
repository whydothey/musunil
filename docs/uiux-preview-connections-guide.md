# UI/UX 프리뷰용 외부 연결 가이드

목표는 운영 배포가 아니라, 집회·시위 객관 정보 UI를 실제 서비스처럼 확인하는 것이다. 실제 제보, 실제 푸시, 결제는 아직 연결하지 않는다.

## 권장 순서

### 1. 지금 상태로 먼저 확인

```bash
pnpm install
pnpm dev:api
python3 -m http.server 4173 --directory apps/web
```

브라우저:

```text
http://localhost:4173
```

확인할 것:

- 집회·시위 카드 밀도
- 지도 중심 레이아웃
- Claim / Timeline / Evidence 탭
- 제보 패널
- 모바일 하단 탭
- 좁은 화면 가로 넘침 여부

### 2. 지도만 외부 연결

UI/UX 확인에서 가장 먼저 붙일 외부 요소는 지도다. 개인정보를 다루지 않고 화면 완성도 체감이 크다.

추천 선택:

- 빠른 UI 프리뷰: MapLibre + OpenFreeMap
- 키 기반 상용 후보 확인: MapLibre + MapTiler
- 한국 지도 감각 확인: Kakao Maps 또는 NAVER Maps

```yaml
map:
  provider: "maplibre"
  map_style_url: "https://tiles.openfreemap.org/styles/positron"

preview:
  use_external_map_tiles: true
```

### 3. 실제 공개 원천 + 프리뷰 시나리오 확장

이미 포함한 실제 공개 원천:

- 경찰청 2011~2023 집회 신고·개최 통계.
- 대구경찰청 2020~2025 집회 신고·개최 현황.
- 대구경찰청 `오늘의 집회시위` 게시판의 최신 공개 일정 항목.

그 다음 UI/UX 검증용 seed fixture를 늘린다.

프리뷰 시나리오:

- 맞불집회
- 전국 동시다발 집회
- 장기 농성
- 행진성 집회 현장
- 공개 자료 위치 핀
- 현장 인증 영역
- 권리침해 신고 처리
- 반론 추가
- 알림 dedupe

### 4. 샘플 미디어만 연결

실제 사용자 사진/영상은 아직 쓰지 않는다. 공개 가능한 샘플 이미지나 생성 이미지로 확인한다.

확인할 것:

- 얼굴/차량번호 마스킹 전후 카드
- Evidence 상세 썸네일
- “원본 비공개 / 공개본 표시” 문구
- 권리 검토 상태

### 5. 알림은 로컬 outbox로만 확인

FCM/APNs/Expo Push는 UI 확인 단계에서는 붙이지 않는다. `/internal/notifications/dispatch`의 local dispatcher가 due outbox를 `sent`로 마감하는 것으로 충분하다.

확인할 것:

- 모든 업데이트마다 알림이 생기지 않는지
- 상태 변화에만 outbox가 생기는지
- 동일 `dedupe_key`가 중복 생성되지 않는지
- 후원/신고 수/단일 출처 주장이 알림을 만들지 않는지

### 6. 공개 원천 자동 수집은 마지막에 read-only로 연결

UI 프리뷰가 안정된 뒤 read-only worker와 PDF 구조화 파서를 붙인다.

우선순위:

1. 공개 집회신고/경찰·지자체 안내
2. 주최 측 공지
3. 언론/자료 링크
4. 현장 영상 Claim의 공개 가능 Evidence
5. 권리침해 신고와 반론 Claim

원칙:

- 공개 원천 결과도 Claim이다.
- 공식 발표를 자동 진실로 바꾸지 않는다.
- ingest 실패 시 UI가 깨지면 안 된다.

## 운영 전까지 미루는 연결

- 실 사용자 인증
- 실제 LIVE 촬영 업로드
- S3/R2 원본 미디어 저장
- 얼굴/차량번호 자동 마스킹 모델
- FCM/APNs 실제 발송
- 결제/후원
- Render 운영 배포
- AI provider 실제 호출

## 참고 공식 문서

- [MapLibre GL JS](https://www.maplibre.org/maplibre-gl-js/docs/)
- [OpenFreeMap](https://openfreemap.org/)
- [MapTiler + MapLibre](https://docs.maptiler.com/maplibre/)
- [NAVER Maps JavaScript API v3](https://navermaps.github.io/maps.js.en/docs/)
- [Kakao Maps JavaScript API guide](https://apis.map.kakao.com/web/guide/)
- [Render environment variables and secret files](https://render.com/docs/configure-environment-variables)
