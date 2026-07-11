# S+ UX Tracker

Last updated: 2026-07-11 23:23 KST

Goal: 국평오 관점에서 일반 사용자가 무슨일을 첫 방문부터 직관적으로 이해하고, 상업용 앱 수준의 완성도로 이슈별 상황과 현장 인증 영상을 막힘 없이 확인할 수 있을 때까지 모든 UX 항목을 S+로 올린다.

## Current Verdict

현재 사용자 경험 등급은 A 후보 범위다. 상업용 S+ 재설계는 Active다. 2026-07-11 06:11 KST 독립 재검토는 최신 홈을 Visual C+~A- 후보, 국평오 5초 PASS-/10초 PARTIAL/20초 PARTIAL로 봤다. 26차 개선은 데스크톱 기본 홈의 우측 상세 패널을 닫아 첫 화면을 `이슈 목록 + 지역 현황 지도` 2축으로 단순화했고, 27~32차 개선은 지도 선택 시트·검색·범례·탐색 타일·fallback 표면·GPS evidence 기반 영역 생성을 낮췄다. 33차 개선은 poster 없는 인증영상을 빈 영상판이 아니라 검토 카드로 낮췄고, 34~35차는 실제 공개 영상이 붙으면 풀스크린 video player로 열리고 미디어 route/CSP가 동작하게 했다. 50차는 데스크톱 홈 지도 과점을 줄였고, 51차는 poster 없는 영상을 홈 카드 썸네일처럼 보이지 않게 했으며, 53차는 주요 이슈 레일을 필터칩이 아닌 원형 이슈 story ring으로 바꿨다. 사용자 수락 전까지 S+로 표기하지 않는다.

- 사용 가능성: 홈에서 이슈명, 어디서 확인됐는지, 근거 진입이 보이고, 데스크톱 상세에서 영상·지도·근거로 바로 이동할 수 있다.
- 디자인 완성도: A-~A+ 후보
- 국평오 직관성: B-~A+ 후보
- 핵심 문제: 데스크톱 패널 경쟁과 지도 도구 밀도는 1차 완화됐고 데스크톱 홈 지도 과점과 poster 없는 홈 영상 썸네일 문제도 낮췄지만, 실제 운영 GPS evidence, 실제 제보 영상 품질, 독립 재검증, 사용자 수락은 아직 S+가 아니다.
- 핵심 강점: Claim/Evidence 분리, Issue 기반 묶기, 지도-카드-상세 동기화, 현장 인증 제보 구조는 유지할 가치가 있다.
- 이번 active goal: 상업용 앱 수준의 시민용 집회·시위 정보 서비스 UX를 완성한다. 사용자가 승인하기 전에는 UX/디자인을 S+로 표기하지 않는다.

## Design S+ Active Goals

| 순서 | active goal | 완료 기준 | 상태 |
|---:|---|---|---|
| 0 | S+ 판정 리셋 | 사용자 판정과 충돌하는 문서상 S+ 선언을 Active 미달로 낮춘다. | 완료 |
| 1 | 현재 화면 객관 감사 | 첫 viewport의 KPI, 칩, 미니 통계, CTA 수, 제목 잘림, 지도/상세 경쟁 여부를 기록한다. | 1차 완료 |
| 2 | IA 3안 발산 | 이슈 파일 First, 내 주변 Map/List First, 공공 조회센터를 390px/1440px 흐름으로 비교한다. | 진행 중 |
| 3 | 레퍼런스 기반 선택 | Citizen, PulsePoint, Naver/KakaoMap, Toss, GOV.UK 기준으로 선택된 IA만 구현한다. | 진행 중 |
| 4 | 시각 언어 재설계 | KPI 타일, 카드 내 숫자판, 장식성 글로우, 과도한 칩을 제거한다. | 1차 완료 |
| 5 | 사용 흐름 구현 | 이슈 파악 → 상세 → 근거 → 지도 → 현장 영상 흐름을 설명 없이 이어지게 한다. | 2차 완료 |
| 6 | 상업용 S+ 검증 | 390/430/768/1440px 캡처와 사용자 수락 전까지 S+ 표기를 금지한다. | 진행 중 |

## Scorecard

| 항목 | 현재 등급 | S+ 기준 | 상태 |
|---|---:|---|---|
| 목적 인지 | A+ 후보 | 첫 5초 안에 “집회·시위 객관 확인 앱”과 “어떤 구체 이슈가 확인됐나”가 바로 보인다. | Active · 첫 카드가 구체 이슈 `정보통신망법 개정 반대 집회`로 시작. 사용자 수락 전 S+ 아님 |
| 첫 화면 구조 | A+ 후보 | 평균 사용자가 첫 화면에서 주 행동과 상세 진입을 설명 없이 이해한다. | Active · 주요 이슈 story ring, 카드 action 1개 `상세 보기`, 반복 감사 라벨 제거, 390px/1440px `overflowX=false` |
| 이슈 중심 흐름 | A+ 후보 | 이슈 선택 → 상세/근거/지도/영상/반론이 같은 이슈 맥락으로 이어진다. | Active · 홈 주행동은 `상세 보기`, 보조 액션은 `지도/영상/반론`; 상세는 `개요`로 안정 진입 |
| 상황 상세 | A+ 후보 | 무슨 일, 장소·시간, 확인 근거, 아직 확인할 점이 숫자판보다 먼저 보인다. | Active · 상세 상단 `labelDisplay=none`, 3문장 요약, 빠른 버튼 `근거/인증 영상/지도`, overflow 없음 |
| 현장 영상 UX | A 후보 | 영상이 확정 결론이 아니라 현장 인증 자료이며, 근거·위치 범위·관련 이슈에 접근한다. | Active · 33차로 poster 없는 LIVE Claim은 검토 카드로 표시하고, 34~35차로 공개 clip+poster가 모두 있으면 풀스크린 `<video class="reel-video">`로 표시되며 media route/CSP가 통과. 실제 운영 공개 영상 캡처와 사용자 수락 필요 |
| 제보 UX | A 후보 | 첫 제보자가 위치 확인, 대상 확정, 촬영, 미리보기, 접수 상태를 한 흐름으로 이해한다. | Active · 탭 라벨 `제보`, 첫 CTA `근처 현장 찾기`, GPS 전 단계표/칩/후보/대상/미리보기 숨김. 독립 검증 필요 |
| 지도 UX | A+ 후보 | 지도는 자료 위치와 현장 인증 범위만 보여주고 이슈 파일과 연결된다. | Active · 32차로 현장 인증 영역을 공개 가능한 live Evidence 기준으로만 생성하고, 공식 자료 핀과 GPS 인증 영역 문구·줌을 분리. 실제 운영 GPS evidence로 재검증 필요 |
| 모바일 UX | A+ 후보 | 390px 기준 가로 넘침 없이 이슈 2개, 위치·근거 문장, 핵심 행동이 보인다. 실제 공개 영상이 없으면 가짜 썸네일을 만들지 않는다. | Active · 390px 하단 탭 `홈/영상/탐색/법안/제보`, `overflowX=false`, 홈 지도 미노출, 확인 요약과 `상세 보기` primary |
| 시각 디자인 | A 후보 | 공공상황 앱답게 신뢰감 있고 상업용 앱 수준의 위계·타이포·간격을 갖춘다. | Active · 데스크톱 첫 화면 패널 경쟁은 26차에서 1차 완화. 독립 재검증과 사용자 수락 전 |
| 운영형 준비 | S | 외부 저장소, DB, 원천 수집, 비식별 공개본 운영이 실서비스 환경에서 검증된다. | 남음 · 외부 오브젝트 스토리지 어댑터 연결 필요 |

## Previous UX Evidence Under Review

아래 항목은 무효화된 과거 구현 증거다. 2026-07-11 상업용 S+ 재설계 active goal 이후에는 사용자 수락 전까지 현재 S+ 선언으로 보지 않는다.

| 목표 | 완료 증거 |
|---|---|
| 무효화된 과거 목적 인지 판정 | 데스크톱과 모바일 첫 화면에서 `무슨일`, `집회·시위 공개자료 확인`, `지금 확인할 이슈`가 첫 시야에 보인다. |
| 무효화된 과거 첫 화면 구조 판정 | 데스크톱은 좌측 레일, 중앙 이슈 피드, 우측 상세 맥락 패널로 나뉘고 모바일은 홈-영상-탐색-법안-제보 하단 탭으로 역할이 분리된다. |
| 무효화된 과거 이슈 중심 흐름 판정 | 이슈 선택 후 `관련 상황 보기` → 선택 이슈 관련 상황 → 상세 패널로 이어지고, 지도는 보조 확인 수단으로 동기화된다. |
| 무효화된 과거 상황 상세 판정 | 요약, 현장 영상, 흐름, 근거, 다른 주장이 탭으로 분리되고 Claim 원천·근거·다른 주장 밀도가 과하지 않다. |
| 무효화된 과거 현장 영상 UX 판정 | 릴스형 현장 영상에서 `근거`, `지역`, `이슈`, `반론`, `알림` 액션이 보이고, 영상은 확정 결론이 아닌 현장 인증 자료로 표시된다. |
| 무효화된 과거 제보 UX 판정 | 근처 현장 후보에서 대상을 확정한 뒤 7초 촬영하고, 제출 전 대상 현장·촬영 시각·거리·공개 범위를 확인한 다음 검토 대기 자료로 접수된다. |
| 무효화된 과거 지도 UX 판정 | 지도 검색 `1호선`이 선택 상황, 지도 시트, 상세 패널을 같은 대상으로 맞추고 모바일 지도에서도 선택 맥락을 유지한다. |
| 무효화된 과거 모바일 UX 판정 | 390x844 기준 홈, 영상, 탐색, 상세 시트 화면 모두 가로 넘침 없이 확인된다. |
| 무효화된 과거 시각 디자인 판정 | 공공 정보 앱에 맞는 저채도 배경, 제한된 상태색, 카드 밀도, 선형 아이콘 마커, 하단 탭 터치 영역이 일관된다. |

## Visual Evidence

| 화면 | 파일 | 확인 |
|---|---|---|
| 상업용 재설계 53차 모바일 홈 이슈 링 | `docs/commercial-splus-surface53-story-ring-home-mobile-390-2026-07-11.png` | 390px 홈에서 주요 이슈가 pill/filter chip이 아니라 원형 issue story ring으로 보임. `storyCount=3`, `storyOrbCount=3`, `overflowX=false`, forbidden 0 |
| 상업용 재설계 53차 데스크톱 홈 이슈 링 | `docs/commercial-splus-surface53-story-ring-home-desktop-1440-2026-07-11.png` | 1440px 홈에서 이슈 레일이 좌측 피드의 보조 진입점으로 읽힘. `storyLabels=정보통신망법 개정 반대/대통령 탄핵 요구 행진/전국 집회 공개 일정`, rejected 0 |
| 상업용 재설계 54차 모바일 API 동기화 | `docs/commercial-splus-surface54-api-sync-banner-mobile-390-2026-07-11.png` | API 미연결 상태에서도 빈 화면이 아니라 저장된 공개자료 기준 화면과 얇은 동기화 배너가 보임. `overflowX=false`, forbidden 0 |
| 상업용 재설계 54차 데스크톱 API 동기화 | `docs/commercial-splus-surface54-api-sync-banner-desktop-1440-2026-07-11.png` | 데스크톱 상단에 동기화 지연 배너가 표시되지만 이슈 피드/지도 맥락과 경쟁하지 않음 |
| 상업용 재설계 24차 데스크톱 홈 | `docs/commercial-splus-surface24-home-map-desktop-1440-2026-07-11.png` | 1440px 홈에서 좌측 이슈 피드, 중앙 `지역 현황` 지도, 우측 이슈 맥락 패널 노출. `mapVisible=true`, `rejectedTerms=[]`, `overflowX=false` |
| 상업용 재설계 24차 모바일 홈 390 | `docs/commercial-splus-surface24-home-map-mobile-390-2026-07-11.png` | 390px 홈은 이슈 피드 중심 유지, 지도 미노출, scanline 잘림 없음, `rejectedTerms=[]`, `overflowX=false` |
| 상업용 재설계 24차 모바일 홈 430 | `docs/commercial-splus-surface24-home-map-mobile-430-2026-07-11.png` | 430px 홈에서 이슈 카드 2개, 하단 5탭, scanline 잘림 없음, `overflowX=false` |
| 상업용 재설계 24차 태블릿 홈 768 | `docs/commercial-splus-surface24-home-map-tablet-768-2026-07-11.png` | 768px 홈은 모바일 IA 유지, 지도 미노출, `overflowX=false`, 금지 문구 0 |
| 상업용 재설계 25차 모바일 홈 390 | `docs/commercial-splus-surface25-action-hub-mobile-390-2026-07-11.png` | 첫 카드 `근거/영상/지역/반론` 4액션, first card 257px, visible issue cards 2, scanline clipped false, `rejectedTerms=[]`, `overflowX=false` |
| 상업용 재설계 25차 모바일 홈 430 | `docs/commercial-splus-surface25-action-hub-mobile-430-2026-07-11.png` | 430px 첫 카드 257px, 4액션 각 91px, visible issue cards 2, `rejectedTerms=[]`, `overflowX=false` |
| 상업용 재설계 25차 태블릿 홈 768 | `docs/commercial-splus-surface25-action-hub-tablet-768-2026-07-11.png` | 768px 첫 카드 210px, 4액션 각 176px, scanline clipped false, `overflowX=false` |
| 상업용 재설계 25차 데스크톱 홈 | `docs/commercial-splus-surface25-action-hub-desktop-1440-2026-07-11.png` | 1440px 홈에서 좌측 이슈 액션 허브, 중앙 지도, 우측 맥락 패널 유지. `mapVisible=true`, `detailVisible=true`, `rejectedTerms=[]`, `overflowX=false` |
| 상업용 재설계 26차 데스크톱 기본 홈 | `docs/commercial-splus-surface26-desktop-home-map-first-1440-2026-07-11.png` | 1440px 기본 홈은 상세 패널 hidden, 이슈+지도 2축. `detailVisible=false`, `mapVisible=true`, map width 828px, `rejectedTerms=[]`, `overflowX=false` |
| 상업용 재설계 26차 데스크톱 근거 열림 | `docs/commercial-splus-surface26-desktop-evidence-open-1440-2026-07-11.png` | `근거` 클릭 후 `desktop-detail-open`, `detailVisible=true`, selected tab `근거`, `rejectedTerms=[]`, `overflowX=false` |
| 상업용 재설계 26차 모바일 회귀 | `docs/commercial-splus-surface26-mobile-home-regression-390-2026-07-11.png` | 390px 홈은 4액션 유지, visible issue cards 2, `scanlineClipped=false`, `rejectedTerms=[]`, `overflowX=false` |
| 상업용 재설계 27차 데스크톱 지도 시트 | `docs/commercial-splus-surface27-map-sheet-desktop-home-v2-1440-2026-07-11.png` | 1440px 홈 지도 sheet 62px, `sheetMapRatio=0.13`, chips/context/summary hidden, `detailVisible=false`, `rejected=[]`, `overflowX=false` |
| 상업용 재설계 27차 모바일 지도 시트 | `docs/commercial-splus-surface27-map-sheet-mobile-explore-v2-390-2026-07-11.png` | 390px 지도 sheet 114px, `sheetMapRatio=0.25`, summary hidden, `navOverlap=false`, `rejected=[]`, `overflowX=false` |
| 상업용 재설계 28차 데스크톱 지도 도구 | `docs/commercial-splus-surface28-map-tools-desktop-v2-1440-2026-07-11.png` | 1440px 지도 toolbar 54px, `toolbarMapRatio=0.08`, sheet 62px, `sheetMapRatio=0.09`, tile 52px, repeated `보기` removed, `rejected=[]`, `overflowX=false` |
| 상업용 재설계 28차 모바일 지도 도구 | `docs/commercial-splus-surface28-map-tools-mobile-v2-390-2026-07-11.png` | 390px 지도 toolbar 52px, first tile 52px, `sheetMapRatio=0.25`, `navOverlap=false`, `rejected=[]`, `overflowX=false` |
| 데스크톱 홈 | `docs/splus-ux-desktop-2026-07-09-2237.png` | 1440x900, `overflowX=false`, 이슈-지도-상세 3열 확인 |
| 모바일 홈 | `docs/splus-ux-mobile-home-2026-07-09-2237.png` | 390x844, 이슈 2개와 관련 상황 진입 확인 |
| 모바일 지도 | `docs/splus-ux-mobile-map-actual-2026-07-09-2237.png` | 390x844, 지도 검색·마커·선택 시트 확인 |
| 모바일 검색 결과 | `docs/splus-ux-mobile-search-result-2026-07-09-2237.png` | `1호선` 검색 후 상세 전환과 선택 대상 유지 확인 |
| 모바일 현장 영상 | `docs/splus-ux-mobile-video-2026-07-09-2237.png` | 현장 영상, GPS 인증, 비식별 원칙 확인 |
| 모바일 제보 | `docs/splus-ux-mobile-report-2026-07-09-2237.png` | `현장 촬영 시작`, 촬영 조건, 검토 대기 흐름 확인 |
| 디자인 S+ 데스크톱 홈 | `docs/design-splus-desktop-fixed-2026-07-10-1640.png` | 이슈 우선, 지도 보조 문구, 3열 상단 정렬, 공식 자료 미확인 표현, `overflowX=false` |
| 디자인 S+ 데스크톱 법안 | `docs/design-splus-law-desktop-fixed-2026-07-10-1640.png` | 법안·개정안 탭에서 연결 이슈와 공개 근거가 지도보다 먼저 읽히고 3열 상단이 정렬됨 |
| 디자인 S+ 모바일 상세 | `docs/design-splus-mobile-detail-2026-07-10-1626.png` | 390px 상세에서 공식 확인 미확인, 공개된 주장, 규모 추정 대기 흐름 확인 |
| 디자인 S+ 모바일 법안 | `docs/design-splus-mobile-law-2026-07-10-1626.png` | 390px 법안 카드에서 연결 이슈와 관련 상황 우선 표시 |
| 디자인 S+ 모바일 영상 | `docs/design-splus-mobile-video-2026-07-10-1626.png` | `현장 인증 영상`, 지역/판단 필터, 모델명 문구 미노출, `overflowX=false` |
| Instagram-grade 데스크톱 홈 | `docs/instagram-easy-desktop-home-vp2-2026-07-10.png` | 좌측 레일, 중앙 이슈 피드, 우측 상세 맥락 패널이 첫 화면에 함께 보임 |
| Instagram-grade 모바일 홈 | `docs/instagram-easy-mobile-home-vp2-2026-07-10.png` | 이슈 스토리 링, 이슈 피드 카드, 5탭 하단 내비게이션 확인 |
| Instagram-grade 모바일 영상 | `docs/instagram-easy-mobile-reels-vp4-2026-07-10.png` | 릴스형 현장 영상, 근거/지역/이슈/반론/알림 액션, 하단 내비게이션 비겹침 확인 |
| Instagram-grade 모바일 탐색 | `docs/instagram-easy-mobile-explore-vp-2026-07-10.png` | 지역·이슈 그리드 우선, 지도는 위치 맥락 확인 도구로 노출 |
| Instagram-grade 모바일 상세 시트 | `docs/instagram-easy-mobile-detail-sheet-vp2-2026-07-10.png` | 상세가 하단 탭이 아니라 닫을 수 있는 시트로 열림 |
| 현장 영상 대표 썸네일 | `docs/live-video-representative-mobile-home-v2-2026-07-10.png` | 검토 완료된 비식별 현장 영상 URL이 있으면 이슈 대표 썸네일로 우선 사용하고, 미디어 미준비 시 추상 비주얼 fallback 유지 |
| 제보 대상 확정 UX | `docs/report-target-confirm-mobile-2026-07-10-1727.png` | 390px 제보 탭에서 근처 현장 후보, 대상 확정 카드, 위치 미승인 회복 문구, 가로 넘침 없음 확인 |
| 지도·정보구조 데스크톱 홈 | `docs/map-info-splus-desktop-home-2026-07-10.png` | Issue feed가 우선이고 상세 패널이 같은 Issue 맥락을 유지함 |
| 지도·정보구조 데스크톱 탐색 | `docs/map-info-splus-desktop-explore-2026-07-10.png` | 탐색 화면에서 지역/이슈 그리드와 MapLibre 지도, 자료 위치/현장 인증 범위 키가 함께 보임 |
| 지도·정보구조 모바일 탐색 | `docs/map-info-splus-mobile-explore-2026-07-10.png` | 390px에서 하단 `탐색` 탭, 지역/이슈 그리드, 지도 키, 캔버스 핀이 가로 넘침 없이 보임 |
| 상업용 재설계 모바일 390 | `docs/commercial-splus-mobile-390-2026-07-11.png` | 홈에서 `관련 법안` 전면 CTA 제거, 반복 불확실성 박스 제거, `어디서 확인됐나` CTA, `overflowX=false` |
| 상업용 재설계 모바일 430 | `docs/commercial-splus-mobile-430-2026-07-11.png` | 430px에서도 첫 이슈 카드가 제목·어디서·근거·CTA 중심으로 보이고 가로 넘침 없음 |
| 상업용 재설계 태블릿 768 | `docs/commercial-splus-tablet-768-2026-07-11.png` | 768px에서 모바일 탭 구조 유지, mini stat 0, 홈 반복 불확실성 박스 0 |
| 상업용 재설계 데스크톱 1440 | `docs/commercial-splus-desktop-1440-2026-07-11.png` | 좌측 내비/중앙 이슈/우측 상세가 보이며, 상세는 `영상/지도/근거` 빠른 버튼과 닫힌 세부 정보로 과밀도를 낮춤 |
| 상업용 현장 프리뷰 모바일 390 | `docs/commercial-splus-field-preview-mobile-390-2026-07-11.png` | `redactedClipUrl`이 있는 경우 이슈 카드에 비식별 공개본 프리뷰와 재생 표식이 보임 |
| 시민 5초 요약 모바일 390 | `docs/commercial-splus-citizen-summary-mobile-390-2026-07-11.png` | 공개 위치, 확인 수준, 현재 상태, `확인 근거 보기`가 첫 카드에서 보이고 `overflowX=false` |
| 시민 5초 요약 모바일 430 | `docs/commercial-splus-citizen-summary-mobile-430-2026-07-11.png` | 430px에서 시민 요약 2개, 공개본 프리뷰 1개, mini stat 0, 금지 소셜 문구 0 |
| 시민 5초 요약 태블릿 768 | `docs/commercial-splus-citizen-summary-tablet-768-2026-07-11.png` | 768px에서 공개 위치/확인 수준/현재 상태가 카드 안에서 줄바꿈 없이 읽힘 |
| 시민 5초 요약 데스크톱 1440 | `docs/commercial-splus-citizen-summary-desktop-1440-2026-07-11.png` | 데스크톱 중앙 피드가 공개 위치/확인 수준/현재 상태 우선으로 정렬되고 우측 상세와 동기화됨 |
| 데스크톱 홈 정리 1440 | `docs/commercial-splus-desktop-home-clean-v2-1440-2026-07-11.png` | 홈에서 지도·제보 도구가 기본 노출되지 않고 이슈 피드와 선택 이슈 상세만 보임 |
| 데스크톱 제보 독립 화면 1440 | `docs/commercial-splus-desktop-report-focused-1440-2026-07-11.png` | 제보 탭에서만 현장 인증 제보 흐름이 열리고 홈/상세/지도와 섞이지 않음 |
| 상업용 재설계 5차 모바일 홈 | `docs/commercial-splus-mobile-home-redesign-v2-data-390-2026-07-11.png` | 390px에서 표형 row 0개, 공개 영상 프리뷰 336x189, 상단 위치/알림 도구 숨김, `overflowX=false` |
| 상업용 재설계 5차 모바일 상세 | `docs/commercial-splus-mobile-detail-redesign-data-390-2026-07-11.png` | 상세 시트 탭 순서 `개요/근거/영상/지도/다른 주장`, 빠른 버튼 `근거/영상/지도`, `overflowX=false` |
| 상업용 재설계 5차 데스크톱 홈 | `docs/commercial-splus-desktop-home-redesign-v2-data-1440-2026-07-11.png` | 1440px 홈에서 지도/제보 도구 미노출, 표형 row 0개, `overflowX=false` |
| 상업용 재설계 6차 모바일 홈 | `docs/commercial-splus-mobile-home-real-poster-390-2026-07-11.png` | 공개 poster가 API에서 200 `image/png`로 응답, 프리뷰 338x191 ratio 1.77, `dashboardRows=0`, `overflowX=false` |
| 상업용 재설계 6차 데스크톱 홈 | `docs/commercial-splus-desktop-home-real-poster-1440-2026-07-11.png` | 1440px 홈에서 공개 poster 200, 프리뷰 ratio 1.77, 홈 지도 미노출, `dashboardRows=0`, `overflowX=false`; 우측 상세 패널은 추가 디자인 개선 필요 |
| 상업용 재설계 7차 데스크톱 맥락 패널 | `docs/commercial-splus-desktop-context-panel-1440-2026-07-11.png` | 우측 상세가 문장형 스택, 아이콘 빠른 버튼, pill tab, 흐름형 overview로 정리됨. `actionIconCount=3`, `dashboardRows=0`, `forbidden=[]`, `overflowX=false` |
| 상업용 재설계 7차 모바일 상세 | `docs/commercial-splus-mobile-detail-context-panel-390-2026-07-11.png` | 390px 상세 시트에서 새 패널 구조가 유지됨. `detailOpen=true`, `scopedStatRows=3`, `actionIconCount=3`, `forbidden=[]`, `overflowX=false` |
| 상업용 재설계 8차 모바일 제보 | `docs/commercial-splus-mobile-report-first-action-390-2026-07-11.png` | 390px 제보 첫 화면에서 제목 `현장 영상 제보`, 첫 CTA `내 위치로 현장 찾기`, GPS 전 후보 카드 0개, 대상 패널 0개, 기준 설명 접힘, `overflowX=false` |
| 상업용 재설계 8차 데스크톱 제보 | `docs/commercial-splus-desktop-report-first-action-1440-2026-07-11.png` | 1440px 제보 화면에서 홈/지도/상세가 섞이지 않고, 제보 작업만 독립적으로 보임. 후보 카드 0개, 대상 패널 0개, 금지 소셜 문구 0개 |
| 상업용 재설계 9차 모바일 상세 | `docs/commercial-splus-detail-flow-tab-mobile-390-2026-07-11.png` | 상세 탭이 `개요/근거/영상/흐름/다른 주장`으로 바뀌어, 실제 지도는 빠른 버튼 `지도`에서 열리도록 역할이 분리됨. `overflowX=false` |
| 상업용 재설계 9차 모바일 지도 | `docs/commercial-splus-map-list-mobile-v3-390-2026-07-11.png` | 390px 지도 탭에서 큰 숫자 타일 0개, 중복 지도 버튼 hidden, 이슈/지역 리스트와 지도 키만 노출, `overflowX=false` |
| 상업용 재설계 9차 데스크톱 지도 | `docs/commercial-splus-map-list-desktop-v2-1440-2026-07-11.png` | 1440px 지도 탭에서 이슈/지역이 한 줄 리스트로 정리되고 우측 상세와 경쟁하지 않음. `bigTileNumbers=0`, 금지 소셜 문구 0 |
| 상업용 재설계 10차 모바일 영상 | `docs/commercial-splus-reels-poster-fixed-mobile-390-2026-07-11.png` | 390px 영상 탭에서 poster-first 현장 영상, `비식별 공개본` badge, 아이콘 액션 레일 표시. `posterImages=3`, `reelActionIcons=15`, `overflowX=false` |
| 상업용 재설계 10차 데스크톱 영상 | `docs/commercial-splus-reels-poster-fixed-desktop-1440-2026-07-11.png` | 1440px 영상 화면에서 검은 목업판 대신 공개 poster가 보이고 우측 상세와 맥락이 유지됨. 금지 소셜 문구 0 |
| 상업용 재설계 11차 모바일 홈 | `docs/commercial-splus-home-language-v2-mobile-390-2026-07-11.png` | 390px 홈에서 제목 `집회·시위 공개자료`, `visibleWordsRejected=[]`, 홈 중앙 play affordance 0, 금지 소셜 문구 0, `overflowX=false` |
| 상업용 재설계 11차 모바일 영상 | `docs/commercial-splus-reels-actions-v2-mobile-390-2026-07-11.png` | 390px 영상 탭에서 액션이 `근거/위치 범위/관련 이슈` 3개로 축소됨. `posterImages=3`, `reelActionIcons=9`, 금지 소셜 문구 0 |
| 상업용 재설계 11차 데스크톱 홈 | `docs/commercial-splus-home-language-v2-desktop-1440-2026-07-11.png` | 1440px 홈에서 전역 알림은 아이콘으로 낮아지고 `visibleWordsRejected=[]`, `overflowX=false` |
| 상업용 재설계 12차 모바일 홈 390 | `docs/commercial-splus-home-compact-mobile-390-2026-07-11.png` | 390px에서 공개 영상 이슈 카드가 우측 썸네일 구조로 압축됨. 첫 카드 170px, visible issue cards 2, preview 112x96, `overflowX=false` |
| 상업용 재설계 12차 모바일 홈 430 | `docs/commercial-splus-home-compact-mobile-430-2026-07-11.png` | 430px에서도 첫 카드 170px, visible issue cards 2, `overflowX=false` |
| 상업용 재설계 12차 데스크톱 홈 | `docs/commercial-splus-home-compact-desktop-1440-2026-07-11.png` | 데스크톱은 기존 16:9 미디어 카드와 우측 상세 균형을 유지. preview 343x194, `recordVisible=true`, `mapVisible=false`, `overflowX=false` |
| 상업용 재설계 13차 데스크톱 상세 | `docs/commercial-splus-detail-plain-desktop-1440-2026-07-11.png` | 1440px 우측 상세에서 라벨 행이 문장 리스트로 바뀜. `rowCount=3`, `labelDisplay=none`, 빠른 버튼 `근거/영상/지도`, 금지 문구 0 |
| 상업용 재설계 13차 모바일 상세 | `docs/commercial-splus-detail-plain-mobile-390-2026-07-11.png` | 390px 상세 시트에서 같은 구조 유지. `detailOpen=true`, `rowCount=3`, `labelDisplay=none`, `overflowX=false` |
| 상업용 재설계 14차 모바일 지도 | `docs/commercial-splus-map-context-mobile-390-2026-07-11.png` | 390px 지도 탭에서 선택지는 84px 가로 칩, 지도는 top 217px부터 보임. 지도 시트 `labelDisplays=none`, `overlapNavSheet=false`, `visibleRejected=[]`, `overflowX=false` |
| 상업용 재설계 14차 데스크톱 지도 | `docs/commercial-splus-map-context-v3-desktop-1440-2026-07-11.png` | 1440px 지도와 우측 상세가 같은 `대구 7월 9일 집회 공개 일정`을 표시. 출처명은 `대구경찰청 집회·시위 공개자료`, `visibleRejected=[]`, `overflowX=false` |
| 상업용 재설계 15차 모바일 제보 | `docs/commercial-splus-report-single-action-v5-mobile-390-2026-07-11.png` | 390px 제보 첫 화면에서 제목 40px, 단계 44px, visible action 1개 `내 위치로 현장 찾기`, GPS 전 후보/대상/미리보기 hidden, 권한 오류 문구 없음, `overflowX=false` |
| 상업용 재설계 15차 데스크톱 제보 | `docs/commercial-splus-report-single-action-v2-desktop-1440-2026-07-11.png` | 1440px 제보 화면에서도 단일 CTA, 후보/대상/미리보기 hidden, 금지 소셜 문구 0, `overflowX=false` |
| 상업용 재설계 16차 모바일 제보 | `docs/commercial-splus-report-consumer-mobile-390-2026-07-11.png` | 위치 확인 전 단계표와 인증/위치 칩이 숨겨지고, visible action 1개 `근처 현장 찾기`, 후보/대상 hidden, 금지 소셜·기술 문구 0, `overflowX=false` |
| 상업용 재설계 16차 데스크톱 제보 | `docs/commercial-splus-report-consumer-desktop-1440-2026-07-11.png` | 1440px에서도 같은 단일 CTA 구조와 공개 위치 보호 안내 유지, 단계표/칩 hidden, `overflowX=false` |
| 상업용 재설계 16차 근거 직행 | `docs/commercial-splus-issue-evidence-direct-mobile-390-2026-07-11.png` | 홈 이슈 카드 클릭 후 모바일 상세가 열리고 selected tab `근거`, evidence visible, summary hidden, 금지 소셜 문구 0 |
| 상업용 재설계 17차 모바일 영상 | `docs/commercial-splus-ia-compact-v4-reels-mobile-390-2026-07-11.png` | 선택 이슈 문맥 라인 `서울 · 시간 확인 중 · 위치 1곳 · 현장 2건 · 공식 확인 중 · 영상 근거 1건`, 하단 내비와 릴스 오버레이 겹침 없음, 금지 문구 0 |
| 상업용 재설계 17차 모바일 지도 | `docs/commercial-splus-ia-compact-v2-map-mobile-390-2026-07-11.png` | 지도 탭에도 같은 선택 이슈 문맥 라인이 보이고, `공개된 주장`/`2건 진행·예정` 노출 0, `overflowX=false` |
| 상업용 재설계 17차 모바일 제보 | `docs/commercial-splus-ia-compact-v2-report-mobile-390-2026-07-11.png` | 제보 첫 화면에서 선택 이슈가 부차 정보로 사라지지 않고 상단 문맥 라인으로 유지됨 |
| 상업용 재설계 17차 데스크톱 제보 | `docs/commercial-splus-ia-compact-report-desktop-1440-2026-07-11.png` | 1440px 제보 화면에서 새 문맥 라인과 명확한 버튼이 보임. 단, 넓은 빈 공간은 다음 Active 리스크 |
| 상업용 재설계 18차 모바일 영상 | `docs/commercial-splus-visual-surface-reels-loaded-mobile-390-2026-07-11.png` | 밝은 비식별 poster가 API에서 로드됨. `naturalWidth=960`, overlay/actions bottom 716px, 하단 내비 top 772px, 겹침 없음, 금지 문구 0 |
| 상업용 재설계 18차 데스크톱 영상 | `docs/commercial-splus-visual-surface-reels-desktop-1440-2026-07-11.png` | 1440px 영상 화면에서 같은 공개 poster 표면과 우측 맥락이 유지됨. `overflowX=false`, 금지 문구 0 |
| 상업용 재설계 18차 데스크톱 제보 | `docs/commercial-splus-report-context-panel-v3-desktop-1440-2026-07-11.png` | 제보 화면에 연결 이슈·선택 현장·공개 위치·현재 단계 상태 패널 추가. context/start height 303px, action gap 12px, `overflowX=false` |
| 상업용 재설계 19차 모바일 홈 | `docs/current-commercial-audit-home-mobile-v6-390-2026-07-11.png` | 이슈 카드에 `서울·대전 · 7월 7일 기준 · 공개 현장 3건 · 영상 근거 1건` 빠른 상황 줄 추가, 첫 카드 188px, 첫 viewport 카드 2개, `영상제보` 라벨, `overflowX=false` |
| 상업용 재설계 19차 모바일 지도 | `docs/current-commercial-audit-map-mobile-v5-390-2026-07-11.png` | 지도-first 재배치 후 map top 215px, height 460px, 하단 내비 top 772px, 금지 문구 0, `overflowX=false` |
| 상업용 재설계 19차 데스크톱 지도 | `docs/current-commercial-audit-map-desktop-v6-1440-2026-07-11.png` | 지도-first 재배치 후 map top 211px, height 700px. 이슈/지역 선택은 지도 아래 스트립으로 낮아짐, 금지 문구 0, `overflowX=false` |
| 상업용 재설계 19차 데스크톱 제보 | `docs/current-commercial-audit-report-desktop-v5-1440-2026-07-11.png` | 좌측 레일과 모바일 탭 라벨이 `영상제보`로 바뀌고 제보 화면의 연결 상태 패널 유지. 금지 문구 0, `overflowX=false` |
| 상업용 재설계 20차 모바일 영상 | `docs/commercial-splus-surface20-reels-mobile-390-2026-07-11.png` | 오른쪽 세로 레일을 하단 근거 도구막대로 변경. action bar 676~716px, 하단 내비 top 772px, overlay/action 겹침 없음, 금지 문구 0, `overflowX=false` |
| 상업용 재설계 20차 모바일 지도 | `docs/commercial-splus-surface20-map-mobile-390-2026-07-11.png` | 지도 시트 height 223px, summary visible rows 2, map top 215px/height 460px, 금지 문구 0, `overflowX=false` |
| 상업용 재설계 20차 데스크톱 지도 | `docs/commercial-splus-surface20-map-desktop-1440-2026-07-11.png` | 지도 시트 height 178px, summary visible rows 2, map top 211px/height 700px, 금지 문구 0, `overflowX=false` |
| 상업용 재설계 20차 데스크톱 영상 | `docs/commercial-splus-surface20-reels-desktop-1440-2026-07-11.png` | 영상 액션이 하단 근거 도구막대로 보이고 overlay/action이 분리됨. 금지 문구 0, `overflowX=false` |
| 상업용 재설계 21차 모바일 영상 | `docs/commercial-splus-surface21-reels-mobile-390-2026-07-11.png` | 샘플 poster 대신 검토 대기 슬롯 표시. `posterImages=0`, `reviewSlots=3`, `videoPosters=[]`, badge `검토 대기`, 금지 문구 0, `overflowX=false` |
| 상업용 재설계 21차 데스크톱 지도 | `docs/commercial-splus-surface21-map-desktop-1440-2026-07-11.png` | 지도 탭에서 우측 상세 패널 hidden, map width 1200px, viewport share 83%, 지도 시트 178px, 금지 문구 0, `overflowX=false` |
| 상업용 재설계 22차 모바일 홈 | `docs/commercial-splus-surface22-home-mobile-390-2026-07-11.png` | stale config 회귀를 막은 뒤 실제 API 데이터로 홈 이슈 2개 표시. 큰 검토 썸네일 0, review row 46px, first card 241px, media preview 0, 금지 문구 0, `overflowX=false` |
| 상업용 재설계 22차 데스크톱 홈 | `docs/commercial-splus-surface22-home-desktop-1440-2026-07-11.png` | 홈 검토 영상 표면을 compact 상태 행으로 낮춤. first card 281px, review row 46px, media preview 0, 금지 문구 0, `overflowX=false` |
| 상업용 재설계 23차 모바일 홈 | `docs/commercial-splus-surface23-home-mobile-390-2026-07-11.png` | 카드 상단 scanline을 `기준일·지역별 확인 건수·영상 상태·미확인`으로 고정. first card 220px, scanline clipped false, `영상 근거 0건`/금지 문구 0, `overflowX=false` |
| 상업용 재설계 23차 데스크톱 홈 | `docs/commercial-splus-surface23-home-desktop-1440-2026-07-11.png` | 데스크톱 카드도 같은 scanline 유지. first card 260px, scanline clipped false, media preview 0, 금지 문구 0, `overflowX=false` |
| 상업용 재설계 30차 모바일 홈 | `docs/commercial-splus-surface30-home-mobile-390-2026-07-11.png` | 홈 카드 주행동을 `지도에서 확인` 1개로 올리고 보조 액션을 `근거/인증영상/반론`으로 낮춤. scanline `위치 2곳 · 현장 5건 · 공식 자료 6건 · 인원 미확인`, `overflowX=false` |
| 상업용 재설계 30차 모바일 인증영상 | `docs/commercial-splus-surface30-reels-mobile-390-2026-07-11.png` | 공개 열람 탭을 `인증영상`으로 분리하고 제보 작성 오해를 줄임. 하단 탭 `홈/인증영상/지도/법안/현장촬영`, `overflowX=false` |
| 상업용 재설계 30차 데스크톱 홈 | `docs/commercial-splus-surface30-home-desktop-1440-2026-07-11.png` | 좌측 레일 `인증영상/현장촬영`, 홈 primary CTA `지도에서 확인`, secondary `근거/인증영상/반론` 유지. 금지 문구 0 |
| 상업용 재설계 31차 모바일 지도 | `docs/commercial-splus-surface31-map-fallback-mobile-390-2026-07-11.png` | MapLibre 타일과 fallback 보조 레이어 상태에서 자료 위치 핀 표시. `mapRect=370x460`, sheet 114px, `navOverlap=false`, 금지 문구 0 |
| 상업용 재설계 31차 데스크톱 지도 | `docs/commercial-splus-surface31-map-fallback-desktop-1440-2026-07-11.png` | 데스크톱 지도 표면이 와이어프레임에서 실제 지도 톤으로 개선됨. `mapRect=1200x700`, sheet 62px, `overflowX=false`, 금지 문구 0 |
| 상업용 재설계 32차 공식 자료 핀 | `docs/commercial-splus-surface32-map-official-pin-mobile-390-2026-07-11.png` | 공식 자료 위치만 있는 현장은 영역 없이 `공개 자료 위치만 확인됐습니다`, `현장 인증 영역은 아직 없습니다`로 표시. `detailOpen=false`, `scrollWidth=390`, 금지 문구 0 |
| 상업용 재설계 32차 GPS 인증 영역 | `docs/commercial-splus-surface32-map-gps-area-mobile-390-2026-07-11.png` | 공개 가능한 현장 인증 영상 Evidence가 있는 현장은 근접 줌 인증 영역과 `1건의 현장 인증 자료로 공개 범위를 계산했습니다`를 표시. 검색 후 `detailOpen=false`, `mapVisible=true`, `navOverlap=false` |
| 상업용 재설계 33차 모바일 인증영상 | `docs/commercial-splus-surface33-reels-mobile-390-2026-07-11.png` | 영상 근거가 있는 이슈를 기본 선택하고 poster 없는 LIVE Claim은 검토 카드로 표시. `panel.bottom=715`, 하단 내비 top 772, `navOverlap=false`, `posterImages=0`, 금지 문구 0 |
| 상업용 재설계 33차 데스크톱 인증영상 | `docs/commercial-splus-surface33-reels-desktop-1440-2026-07-11.png` | 데스크톱에서도 검토 카드와 우측 이슈 맥락 패널이 유지됨. `panel=760x620`, 액션 `근거/위치/이슈`, `overflowX=false`, 금지 문구 0 |

## Remaining Outside This UX Goal

- 외부 오브젝트 스토리지 어댑터 연결 검증은 운영 준비 항목이다. 현재 UX S+ 목표의 완료 조건에는 포함하지 않는다.
- 실제 운영 환경에서 DB, 원천 수집, 저장소, 비식별 공개본까지 붙인 뒤에는 `운영형 준비` 등급을 별도 갱신한다.
- 전국 단위 동일 주제 집회 사용 사례는 `docs/national-issue-splus-tracker.md`에서 별도로 추적한다.

## Update Rule

- 개선 전에는 이 문서의 해당 항목을 기준으로 작업한다.
- 개선 후에는 실제 데스크톱/모바일 화면을 확인하고 현재 등급, 상태, 남은 문제를 갱신한다.
- S+ 판정은 `국평오 기준 첫 이해`, `클릭 흐름`, `정보 밀도`, `모바일 안정성`, `무슨일 원칙 유지`가 모두 통과해야 한다.

## Improvement Log

| 시간 | 항목 | 변경 | 판정 |
|---|---|---|---|
| 2026-07-11 14:24 KST | 첫 화면 구조 | 주요 이슈 레일을 필터칩형 pill에서 원형 이슈 story ring으로 전환했다. 390px/1440px에서 `storyCount=3`, `overflowX=false`, forbidden 0을 확인했다. | A+ 후보 유지 · 사용자 수락 전 S+ 아님 |
| 2026-07-11 21:26 KST | 운영 배포 확인 | 배포 판정을 build-info 단일 기준에서 static hash 기준으로 바꿨다. 최신 UI 파일 해시가 맞으면 배포 확인은 통과하고, build metadata/header 문제는 경고로 분리한다. | 운영 확인 안정화 · 사용자 수락 전 S+ 아님 |
| 2026-07-11 23:23 KST | API 미연결 UX | API 미연결 상태를 숨기지 않고 `실시간 동기화 지연` 배너와 `다시 확인` 버튼으로 표시했다. 모바일에서는 상세 설명을 숨겨 첫 화면 밀도를 유지한다. | A+ 후보 Active · API 연결 전 S+ 아님 |
| 2026-07-09 21:33 KST | 제보 UX | 비활성 제출 버튼을 제거하고, 모바일 현장 촬영 조건·비식별 검토·현장 영상 탭 이동 CTA로 재구성했다. | B- → A- |
| 2026-07-09 21:35 KST | 제보 UX | 데스크톱/390px 모바일에서 가로 넘침 없음, CTA 클릭 시 `상세 > 현장 영상`으로 전환됨을 확인했다. | A- → A |
| 2026-07-09 21:39 KST | 모바일 UX | 모바일 제보/상세 탭이 보조 컬럼 폭에 갇히지 않도록 한 컬럼 전체 폭으로 보정하고, 제보 단계 카드를 390px에서 세로 흐름으로 전환했다. | A- 유지 |
| 2026-07-09 21:43 KST | 첫 화면 구조 | 모바일 상단 요약 지표를 숨기고, 데스크톱 지표를 보조 줄로 낮췄다. 홈 제목을 `지금 확인할 이슈`, 카드 CTA를 `관련 상황 보기`로 정리했다. | B+ → A |
| 2026-07-09 21:43 KST | 목적 인지 | 데스크톱/390px 모바일에서 첫 화면 제목, 첫 이슈 카드, CTA, 가로 넘침 없음 상태를 확인했다. | A- → A |
| 2026-07-09 21:45 KST | 첫 화면 구조 | 이슈 카드의 중복 숫자 블록을 제거하고 상황 필터를 접힌 `상황 범위` 패널로 낮췄다. 모바일 첫 카드 높이 251px → 191px, 첫 상황 카드가 첫 화면 안으로 진입했다. | A → A+ |
| 2026-07-09 21:45 KST | 모바일 UX | 390px 첫 화면에서 상단 지표 숨김, 가로 넘침 없음, 이슈 2개와 선택 이슈 상황 진입을 확인했다. | A- → A |
| 2026-07-09 21:47 KST | 현장 영상 UX | 현장 영상 탭 상단에 `현장 영상 Claim` 기준, GPS 촬영, 비식별 검토, 원본·정밀 위치 비공개 원칙을 먼저 표시했다. 390px 모바일에서 제보 CTA → 상세 현장 영상 전환과 가로 넘침 없음 확인. | A- → A |
| 2026-07-09 21:53 KST | 지도 UX | 지도 시트에 선택 상태, 연결 이슈/상황 문맥, `상세에서 확인` CTA를 추가했다. 핀 클릭 시 지도 시트·상황 카드·상세 제목·선택 핀이 같은 값으로 맞춰짐을 데스크톱/모바일에서 확인했다. | B+ → A |
| 2026-07-09 21:53 KST | 지도 UX | 지도 검색을 실제 동작으로 연결했다. `1호선` 검색 시 `1호선 일부 구간 영향`이 지도 시트·상황 카드·상세 패널·선택 핀에 반영됨을 확인했다. | A → A+ |
| 2026-07-09 21:54 KST | 상황 상세 | 상황/이슈 요약의 반복 박스 4개를 하나의 `compact-summary`로 합쳐 확인 내용, 미확정, 다른 주장, 확인 정도를 한 흐름으로 읽게 했다. 390px 모바일 상세에서 가로 넘침 없음 확인. | A → A+ |
| 2026-07-09 21:54 KST | 시각 디자인 | 상세 요약 박스 수를 줄이고 용어-내용 구조를 정리해 카드 밀도를 낮췄다. | A- → A |
| 2026-07-09 21:59 KST | 첫 화면 구조 | 데스크톱 그리드를 이슈 430px · 지도 360px · 상세 560px 중심으로 재조정하고, 지도 시트를 1열/2열 구조로 바꿔 보조 패널화했다. 1440px/1280px에서 가로 넘침과 지도 시트 overflow 없음 확인. | A+ → S |
| 2026-07-09 21:59 KST | 목적 인지 | 지도 비중을 낮추고 상세 폭을 키워 첫 화면에서 이슈와 상세가 지도보다 우선 읽히도록 조정했다. | A+ → S |
| 2026-07-09 22:02 KST | 상황 상세 | Claim 원천 자료 카드의 출처·근거·시간을 한 줄 메타로 합치고 근거 바를 낮춰 카드 밀도를 줄였다. 390px 모바일에서 Claim 카드 overflow 없음 확인. | A+ → S |
| 2026-07-09 22:02 KST | 제보 UX | 제보 패널에 `촬영 화면이 열리는 조건`을 추가해 Foreground GPS, 앱 내 카메라, 기기 무결성, 5분 내 업로드 조건을 명확히 표시했다. 390px 모바일에서 한 열 접힘과 overflow 없음 확인. | A → A+ |
| 2026-07-09 22:02 KST | 모바일 UX | 모바일 상세의 Claim 카드와 제보 인증 조건이 390px에서 가로 넘침 없이 읽히는 것을 확인했다. | A → A+ |
| 2026-07-09 22:02 KST | 시각 디자인 | 원천 자료 카드와 제보 인증 조건의 줄 수·박스 수를 줄여 공공 정보 앱의 밀도를 낮췄다. | A → A+ |
| 2026-07-09 22:05 KST | 제보 UX | `촬영 환경 점검` 버튼을 추가하고, 권한 요청 없이 GPS API, 카메라 녹화 API, 모바일 앱 기기 무결성, 5분 제한 상태를 pass/warn으로 표시했다. 390px 모바일에서 상태 갱신과 overflow 없음 확인. | A+ → S |
| 2026-07-09 22:05 KST | 현장 영상 UX | 제보 화면에서 현장 영상 Claim으로 이어지기 전 촬영 가능 조건을 직접 점검하게 해, 판단·촬영 조건이 버튼보다 먼저 이해되도록 보강했다. | A → A+ |
| 2026-07-09 22:08 KST | 이슈 중심 흐름 | 이슈 선택 시 `선택 이슈명 관련 상황`으로 섹션 제목을 바꾸고, 주제 태그·상황 수를 바로 표시하도록 했다. 390px 모바일에서 선택 이슈 → 관련 상황 스크롤과 가로 넘침 없음 확인. | A+ → S |
| 2026-07-09 22:08 KST | 모바일 UX | 390px에서 두 번째 이슈 선택 후 관련 상황 섹션이 viewport 안으로 들어오고, 제목·태그·첫 상황 카드가 한 흐름으로 읽히는 것을 확인했다. | A+ → S |
| 2026-07-09 22:14 KST | 지도 UX | 지도 검색 `1호선` 결과가 지도 시트, 선택 핀, 상세 제목, 상황 카드와 같은 대상으로 맞도록 검증했다. 선택 상황을 목록 맨 위로 올려 데스크톱 첫 화면 안에서 바로 보이게 했다. | A+ → S |
| 2026-07-09 22:14 KST | 현장 영상 UX | 로컬 미리보기 한정 비식별 현장 영상 Claim 샘플을 추가했다. 모바일 상세의 `현장 영상` 탭에서 Claim 문장, 공개 위치 범위, 일치/이견, 비활성 현장 판단 버튼이 가로 넘침 없이 보이는 것을 확인했다. | A+ → S |
| 2026-07-09 22:14 KST | 시각 디자인 | 390px 모바일과 1440px 데스크톱에서 이슈 카드, 상황 카드, 지도 시트, 상세 패널, 현장 영상 Claim 카드의 텍스트·패널 overflow가 없음을 확인했다. | A+ → S |
| 2026-07-09 22:16 KST | 현장 영상 UX | 릴스 카드에서 Claim 문장과 현장 판단 상태를 영상 위로 올렸다. 390px 모바일 첫 viewport 안에 Claim 문장, 상태 칩, GPS 인증 배지가 보이고 overflow가 없음을 확인했다. | S 유지 · S+ 후보 강화 |
| 2026-07-09 22:21 KST | 제보 UX | `현장 촬영 시작`을 추가해 브라우저 카메라, Foreground GPS, 7초 녹화, 기존 `/reports/live` 검토 대기 제출 흐름을 연결했다. 390px 모바일 제보 탭에서 버튼·조건·상태 문구 overflow 없음 확인. | S 유지 · S+ 후보 강화 |
| 2026-07-09 22:23 KST | 반복 검증 | `check:web-smoke`에 이슈 우선 제목, 현장 촬영 진입점, 오래된 제보 차단 문구 재등장 방지 가드를 추가했다. | S+ 후보 유지 |
| 2026-07-09 22:27 KST | 제보 UX | 현장 영상 제출에서 임의 `80m` 값을 제거하고 지도 대상 좌표와 Foreground GPS 사이의 실제 거리를 계산해 `/reports/live`에 전달하도록 했다. 390px 모바일 제보 화면 overflow 없음과 `check:web-smoke` 회귀 가드 통과 확인. | S 유지 · S+ 후보 강화 |
| 2026-07-09 22:29 KST | 제보 UX | `POST /uploads/live` 서버 업로드 키 발급 계약을 추가하고, 웹이 클라이언트에서 private storage key를 만들지 않도록 바꿨다. API self-check와 `check:web-smoke`에서 업로드 계약·가짜 키 회귀 방지를 확인했다. | S 유지 · S+ 후보 강화 |
| 2026-07-09 22:31 KST | 현장 영상 UX | 검토 완료된 LIVE Claim이 비식별 공개본으로 `/targets/:type/:id/live-claims`에 노출되는 흐름을 연결했다. 현재 공개본 URL 기록은 내부 redaction worker 전용이며, private storage key 비노출 self-check가 유지된다. | S 유지 · S+ 후보 강화 |
| 2026-07-09 22:34 KST | 제보 UX | `/uploads/live`가 실제 base64 영상 바이트를 받아 서버에서 크기·타입·SHA-256 해시를 검증하고, `/reports/live`는 해당 업로드 기록과 일치하는 Claim만 받도록 했다. 웹은 서버 산출 hash를 사용하고 `check:web-smoke`가 클라이언트 hash/key 회귀를 차단한다. | S 유지 · S+ 후보 강화 |
| 2026-07-09 22:37 KST | 제보 UX | 웹에서 운영 API일 때 업로드를 막던 임시 클라이언트 분기를 제거하고, 서버 업로드 계약이 저장 가능 여부를 판단하게 했다. `check:web-smoke`에 해당 임시분기 재등장 방지 가드를 추가했다. | S → S+ |
| 2026-07-09 22:41 KST | 전체 UX 검증 | 브라우저에서 1440x900 데스크톱과 390x844 모바일 홈·지도·검색 결과·현장 영상·제보 화면을 캡처했다. 모바일 전체 검증에서 `overflowX=false`, 현장 영상 탭에서 Claim/GPS/비식별 원칙 노출, 제보 탭에서 현장 촬영 시작 노출을 확인했다. | 무효화된 과거 S+ 판정 |
| 2026-07-10 16:26 KST | 디자인 S+ 재검토 | 공개 화면 문구를 `공개된 주장`, `현장 인증 영상`, `공식 자료 미확인`처럼 일반 사용자 언어로 바꿨다. 지도는 보조 확인 수단으로 낮추고, 법 탭은 법안·개정안과 연결 이슈를 먼저 읽게 재정렬했다. 1440px/390px 캡처와 web smoke로 회귀를 확인했다. | 무효화된 과거 S+ 판정 |
| 2026-07-10 16:40 KST | 레이아웃 꼬임 수정 | 데스크톱에서 이슈/법안 컬럼이 지도 높이에 맞춰 늘어나 제목이 아래로 밀리던 문제를 수정했다. 컬럼과 내부 stack을 상단 정렬로 고정했고 1440px 재캡처에서 홈·지도·상세 top=83px, `overflowX=false`를 확인했다. | 데스크톱 레이아웃 S+ 회복 |
| 2026-07-10 17:20 KST | Instagram-grade 쉬운 UX | 모바일 하단 탭을 `홈/영상/탐색/법안/제보`로 바꾸고, 홈은 이슈 스토리+피드, 영상은 릴스형 공개본, 탐색은 지역·이슈 그리드+지도, 상세는 모바일 시트로 전환했다. 데스크톱은 좌측 레일·중앙 피드·우측 상세 맥락 패널로 재정렬했다. | 무효화된 과거 S+ 판정 |
| 2026-07-10 17:27 KST | 제보 UX S+ | 제보 흐름을 위치 확인 → 근처 현장 후보 → 대상 확정 → 앱 내 7초 촬영 → 제출 전 확인 → 접수증으로 전환했다. `/reports/live` 응답에 reportId, claimId, 대상 현장, 연결 이슈, 지역, 공개 반경, 다음 상태를 추가해 사용자가 영상 연결 대상을 제출 전후 확인할 수 있게 했다. | 무효화된 과거 S+ 판정 |
| 2026-07-10 17:45 KST | 현장 영상 대표 썸네일 | 이슈별 검토 완료 live claim의 공개 `redactedClipUrl`을 홈 스토리 링과 이슈 카드 대표 썸네일에 우선 적용했다. 상대 공개 경로는 API 기준 URL로 해석하고, 미디어가 아직 준비되지 않았거나 URL이 없으면 추상 비주얼을 fallback으로 유지한다. | 현장 인증 중심 UX 강화 |
| 2026-07-10 23:35 KST | 지도·정보구조 S+ | 공개 지도 도메인을 자료 위치 핀과 현장 인증 영역으로 축소하고, 데스크톱 `탐색` 전환이 중앙 지도/우측 상세 구조로 열리게 고쳤다. 390px/1440px 캡처에서 DOM 고정 핀 0개, 금지 UI 문구 0개, `overflowX=false`를 확인했고 `pnpm check:release`가 통과했다. | 무효화된 과거 S+ 판정 |
| 2026-07-11 01:56 KST | 상업용 S+ 재설계 1차 | 독립 비평 3개를 반영해 상단 KPI, 카드 숫자판, 장식 커버, 반복 불확실성 박스, 홈 `관련 법안` CTA, `이슈 파일 보기` 라벨을 제거했다. 카드 언어를 `어디서`, `근거`, `어디서 확인됐나`로 바꾸고 보이는 `탐색` 탭명을 `지도`로 바꿨다. 390/430/768/1440px 캡처에서 `overflowX=false`, mini stat 0, 홈 반복 불확실성 박스 0을 확인했다. | A- Active · 사용자 수락 전 S+ 아님 |
| 2026-07-11 02:07 KST | 상업용 S+ 재설계 2차 | 데스크톱 우측 상세에 `영상/지도/근거` 빠른 버튼을 추가하고, 개요 탭을 3개 overview card와 접힌 `전국 현황/묶음·규모·검증/관련 현장` disclosure로 낮췄다. 1440px에서 빠른 버튼 노출, 지도 버튼의 지도 화면 전환, 영상 버튼의 영상 탭 전환을 확인했다. | A Active · 사용자 수락 전 S+ 아님 |
| 2026-07-11 02:17 KST | 상업용 S+ 재설계 3차 | 독립 비평 A- 결과를 반영해 홈 카드를 `공개 위치/확인 수준/현재 상태` 시민 5초 요약으로 바꾸고 CTA를 `확인 근거 보기`로 좁혔다. `redactedClipUrl`이 있는 이슈는 비식별 공개본 프리뷰와 재생 표식을 표시한다. 390/430/768/1440px 캡처에서 `overflowX=false`, citizen summary 2개, preview 1개, mini stat 0, 금지 소셜 문구 0을 확인했다. | A Active · 실제 운영 공개 영상 품질과 사용자 수락 전 S+ 아님 |
| 2026-07-11 02:26 KST | 상업용 S+ 재설계 4차 | 데스크톱 홈에서 지도와 제보 도구가 동시에 뜨지 않게 하고, 제보는 `desktop-report` 독립 화면으로 분리했다. 1440px 홈 캡처에서 `mapVisible=false`, `reportVisible=false`, `recordVisible=true`, `overflowX=false`; 제보 화면에서 `reportVisible=true`, `recordVisible=false`를 확인했다. | A Active · 사용자 수락 전 S+ 아님 |
| 2026-07-11 02:44 KST | 상업용 S+ 재설계 5차 | 독립 비평을 반영해 홈 카드의 `공개 위치/확인 수준/현재 상태` 표형 row를 제거하고, 공개 영상 프리뷰를 16:9로 키웠다. 모바일 홈 상단 위치/알림 도구를 숨기고, 상세 탭을 `개요/근거/영상/지도/다른 주장`으로 재정렬했다. 공개 영상은 clip+poster+proof+device integrity가 모두 있어야 노출되며, web/API/runtime/release smoke가 통과했다. | A+ 후보 Active · 사용자 수락 전 S+ 아님 |
| 2026-07-11 02:59 KST | 상업용 S+ 재설계 6차 | 공개 poster 파일을 생성하고 API가 `/media/redacted/*`만 안전하게 서빙하게 했다. 런타임/배포/서비스 감시가 poster 200 응답과 traversal 차단을 검증한다. 모바일·데스크톱 홈 캡처에서 빈 영상 박스가 사라졌고 프리뷰는 16:9 ratio 1.77로 측정됐다. | A+ 후보 Active · 데스크톱 우측 상세와 사용자 수락 전 S+ 아님 |
| 2026-07-11 03:07 KST | 상업용 S+ 재설계 7차 | 데스크톱 우측 상세 패널을 문장형 스택으로 바꾸고, `근거/영상/지도`를 아이콘+라벨 pill 버튼으로 재정렬했다. 상세 탭은 가벼운 pill tab으로 낮추고, 개요 카드는 흐름형 섹션으로 보이게 했다. 1440px/390px 캡처에서 금지 문구 0, `overflowX=false`, 모바일 상세 열림 상태를 확인했다. | A+ 후보 Active · 독립 비평 재검증과 사용자 수락 전 S+ 아님 |
| 2026-07-11 03:15 KST | 상업용 S+ 재설계 8차 | 제보 첫 화면을 `현장 영상 제보`로 명확히 바꾸고, GPS 확인 전 후보 목록과 대상 패널을 숨겼다. 첫 행동은 `내 위치로 현장 찾기`로 통일하고, 촬영 조건과 현장 영상은 보조 버튼으로 낮췄으며, 제보 기준은 접힌 disclosure로 이동했다. 390px/1440px 캡처에서 후보 카드 0개, 대상 패널 0개, 금지 문구 0, `overflowX=false`를 확인했다. | A+ 후보 Active · 독립 비평 재검증과 사용자 수락 전 S+ 아님 |
| 2026-07-11 03:25 KST | 상업용 S+ 재설계 9차 | 지도 탭의 2열 숫자 타일과 상단 중복 `지도` 버튼을 제거하고, 이슈/지역 한 줄 리스트와 지도 확인 흐름으로 바꿨다. 상세 탭의 `지도` 라벨은 실제 내용에 맞게 `흐름`으로 바꿨고, `지도` 빠른 버튼은 실제 지도 화면으로 가는 역할만 유지했다. 390px/1440px 캡처에서 `bigTileNumbers=0`, 중복 지도 버튼 hidden, 금지 문구 0, `overflowX=false`를 확인했다. | A+ 후보 Active · 독립 비평 재검증과 사용자 수락 전 S+ 아님 |
| 2026-07-11 03:34 KST | 상업용 S+ 재설계 10차 | 영상 화면의 검은 preview판을 공개 poster 직접 렌더 구조로 바꾸고, `비식별 공개본` badge와 아이콘+짧은 라벨 액션 레일을 적용했다. dev CSP에서 localhost API poster를 허용해 로컬 검증에서도 이미지가 깨지지 않게 했다. 390px/1440px 캡처에서 `posterImages=3`, `reelActionIcons=15`, 금지 문구 0, `overflowX=false`를 확인했다. | A+ 후보 Active · 독립 비평 재검증과 사용자 수락 전 S+ 아님 |
| 2026-07-11 03:47 KST | 상업용 S+ 재설계 11차 | 독립 감사 3개를 반영해 홈 제목을 `집회·시위 공개자료`로 바꾸고, 홈 영상 중앙 재생 affordance, 전역 긴 알림 CTA, `현장 파일 보기`, `현장 판단`, `GPS 인증` 노출을 제거했다. 릴스 액션은 `근거/위치 범위/관련 이슈` 3개로 축소했다. 390px/1440px 캡처에서 `visibleWordsRejected=[]`, 금지 소셜 문구 0, `overflowX=false`를 확인했다. | A+ 후보 Active · 모바일 첫 카드 정보량과 사용자 수락 전 S+ 아님 |
| 2026-07-11 03:53 KST | 상업용 S+ 재설계 12차 | 모바일 홈 이슈 카드를 우측 썸네일+문장 요약 구조로 압축했다. 공개 영상이 있는 카드에만 `has-field-preview`를 붙여 영상 없는 이슈는 빈 칸 없이 렌더된다. 390px 첫 카드 높이 170px, visible issue cards 2, 430px 첫 카드 170px, 데스크톱 미디어 카드 유지, `overflowX=false`를 확인했다. | A+ 후보 Active · 사용자 수락 전 S+ 아님 |
| 2026-07-11 03:59 KST | 상업용 S+ 재설계 13차 | 상세 상단 요약을 지역·현장 수·근거 상태·미확인 조건 중심의 3문장으로 바꾸고, `장소·시간/확인 근거/아직 확인` 라벨 행을 문장 리스트처럼 보이게 했다. 데스크톱/모바일 캡처에서 `labelDisplay=none`, 빠른 버튼 `근거/영상/지도`, 금지 문구 0, `overflowX=false`를 확인했다. | A+ 후보 Active · 사용자 수락 전 S+ 아님 |
| 2026-07-11 04:14 KST | 상업용 S+ 재설계 14차 | 모바일 지도 탭의 긴 카드 목록을 가로 선택칩으로 낮추고 지도 시트를 문장형 위치 맥락으로 바꿨다. 지도 화면 진입 시 선택 현장 기준으로 지도와 우측 상세가 동기화되며, 공개 제목/출처명에서 `오늘의` 날짜 혼선을 제거했다. 390px/1440px 캡처에서 `visibleRejected=[]`, `labelDisplays=none`, `overflowX=false`를 확인했다. | A+ 후보 Active · 사용자 수락 전 S+ 아님 |
| 2026-07-11 04:27 KST | 상업용 S+ 재설계 15차 | 제보 탭 진입만으로 위치 권한을 요청하지 않게 하고, 모바일 단계 표시를 44px로 압축했다. 390px/1440px 캡처에서 visible action은 `내 위치로 현장 찾기` 1개, GPS 전 후보/대상/미리보기 hidden, 권한 오류 문구 없음, 금지 소셜 문구 0, `overflowX=false`를 확인했다. | A+ 후보 Active · 독립 비평 재검증과 사용자 수락 전 S+ 아님 |
| 2026-07-11 04:32 KST | 상업용 S+ 재설계 16차 | 독립 비평을 반영해 제보 첫 화면에서 단계표와 인증/위치 칩을 숨기고, 버튼 결과를 설명하는 소비자용 문장으로 바꿨다. CTA는 `근처 현장 찾기` 1개만 보인다. 홈 `근거 보기` CTA는 상세 `근거` 탭으로 바로 이동한다. 390px/1440px 캡처에서 금지 소셜·기술 문구 0, `overflowX=false`를 확인했다. | A+ 후보 Active · 전체 IA 독립 비평과 사용자 수락 전 S+ 아님 |
| 2026-07-11 04:43 KST | 상업용 S+ 재설계 17차 | 독립 비평 결과를 반영해 현재 S+가 아님을 재확인했다. `영상/지도/제보` 상단의 선택 이슈 박스를 얇은 문맥 라인으로 낮추고, `서울 · 시간 확인 중 · 위치 1곳 · 현장 2건 · 공식 확인 중 · 영상 근거 1건` 형식으로 통일했다. `공개된 주장`은 `출처별 자료`, 상세 탭은 `현장 영상/시간 흐름/반론·정정`으로 바꿨고, 모바일 릴스 오버레이와 하단 내비 겹침을 제거했다. | A 후보 Active · 영상 표면, 박스형 UI, 데스크톱 제보 빈 공간, 사용자 수락 전 S+ 아님 |
| 2026-07-11 05:02 KST | 상업용 S+ 재설계 18차 | 현장 영상 poster를 어두운 placeholder 톤에서 밝은 비식별 공공 현장 프레임으로 재생성하고, 데스크톱 제보 화면에 연결 이슈·선택 현장·공개 위치·현재 단계 패널을 추가했다. 모바일 릴스 poster `naturalWidth=960`, 하단 내비 겹침 없음, 데스크톱 제보 action gap 12px, 금지 문구 0, `overflowX=false`를 확인했다. | A 후보 Active · 독립 비평 재검증과 사용자 수락 전 S+ 아님 |
| 2026-07-11 05:14 KST | 상업용 S+ 재설계 19차 | 독립 비평이 Visual 4~6/10, IA B-로 평가한 지도-first/10초 이해도/제보 라벨 문제를 반영했다. 지도는 DOM과 CSS에서 map shell을 explore grid보다 먼저 렌더하고, 홈 카드에는 지역·기준일·공개 현장·영상 근거 한 줄을 추가했으며, 탭 라벨 `제보`를 `영상제보`로 바꿨다. | A 후보 Active · 지도 시트 과밀, 추상 영상 표면, 사용자 수락 전 S+ 아님 |
| 2026-07-11 05:20 KST | 상업용 S+ 재설계 20차 | 지도 시트의 반복 요약을 2줄만 보이게 하고 시트 높이를 모바일 223px, 데스크톱 178px로 낮췄다. 영상 화면의 오른쪽 세로 액션 레일은 하단 `근거/위치 범위/관련 이슈` 도구막대로 바꿔 소셜 반응처럼 읽히는 문제를 줄였다. 390px/1440px 캡처에서 금지 문구 0, `overflowX=false`, 하단 내비 겹침 없음을 확인했다. | A 후보 Active · 박스형 UI, 실제 영상 품질, 사용자 수락 전 S+ 아님 |
| 2026-07-11 05:29 KST | 상업용 S+ 재설계 21차 | 독립 Visual Critique B- 평가의 P0를 반영했다. 샘플 redacted poster는 실제 현장처럼 보이지 않게 막고 `현장 영상 공개 준비 중` 슬롯으로 렌더한다. 데스크톱 지도는 우측 인스펙터를 숨겨 map width 1200px, 화면 폭 83%로 확장했다. 390px/1440px 캡처에서 금지 문구 0, `overflowX=false`를 확인했다. | A 후보 Active · 박스형 UI, 실제 제보 영상 품질, 사용자 수락 전 S+ 아님 |
| 2026-07-11 05:41 KST | 상업용 S+ 재설계 22차 | 로컬 dev 서버가 stale `config.js`를 그대로 서빙해 홈이 빈 상태처럼 보이는 회귀를 차단했다. `serve-web`은 런타임 `MUSUNIL_WEB_API_BASE_URL` override를 적용하고 web smoke가 이를 확인한다. 홈 카드에서는 실제 공개 poster가 없으면 대형 검토 썸네일 대신 46px 상태 행만 표시한다. | A 후보 Active · 박스형 UI, 실제 제보 영상 품질, 독립 재평가와 사용자 수락 전 S+ 아님 |
| 2026-07-11 05:49 KST | 상업용 S+ 재설계 23차 | 독립 평가가 홈을 Visual A-, 국평오 5초 A-/10초 A/20초 A-로 봤다. 카드 상단을 `7월 7일 기준 · 서울·대전 3건 확인 · 영상 1건 검토 · 1건 더 확인` 형식으로 고정하고 390px/1440px 모두 scanline clipping 0, 금지 문구 0, `overflowX=false`를 확인했다. | A 후보 Active · 데스크톱 홈 빈 공간/지도·지역 현황 중심 재구성과 사용자 수락 전 S+ 아님 |
| 2026-07-11 06:00 KST | 상업용 S+ 재설계 24차 | 데스크톱 홈을 이슈 피드 + 중앙 `지역 현황` 지도 + 우측 맥락 패널로 재구성하고, `현장 영상 근거 0건`류 숫자 노출을 제거했다. 390/430/768/1440px 캡처에서 금지 문구 0, `overflowX=false`, 모바일 scanline clipping 0을 확인했다. | A 후보 Active · 독립 비평 재검증과 사용자 수락 전 S+ 아님 |
| 2026-07-11 06:11 KST | 상업용 S+ 재설계 25차 | 독립 Visual/IA/QA 재검토를 반영해 홈 이슈 카드에 `근거/영상/지역/반론` 액션 허브를 추가하고, 법안·탐색·상세·영상의 0-count 빈 상태를 사용자 언어로 정리했다. 390/430/768/1440px 캡처와 액션 플로우 검증에서 금지 문구 0, `0건` 노출 0, `overflowX=false`를 확인했다. | A 후보 Active · 데스크톱 패널 경쟁, 실제 사용자 수락 전 S+ 아님 |
| 2026-07-11 06:23 KST | 상업용 S+ 재설계 26차 | 데스크톱 기본 홈에서 우측 상세 패널을 닫고 `이슈 목록 + 지역 현황 지도`로 시작하게 했다. `근거/반론/카드 상세` 행동 시에만 상세 패널이 열리며, 1440px 기본 홈 `detailVisible=false`, `mapVisible=true`, `overflowX=false`, 액션 후 `desktop-detail-open`을 확인했다. | A 후보 Active · 실제 제보 영상 품질과 사용자 수락 전 S+ 아님 |
| 2026-07-11 06:32 KST | 상업용 S+ 재설계 27차 | 지도 선택 시트를 홈 62px, 모바일 지도 114px로 낮추고 chips/context/summary를 화면 상태에 맞게 숨겼다. `상세 보기`는 `상세`로 줄이고 `상세 패널에 반영` 같은 내부 문구를 제거했다. | A 후보 Active · 지도 도구/탐색 타일 밀도와 사용자 수락 전 S+ 아님 |
| 2026-07-11 09:37 KST | 상업용 S+ 재설계 28차 | 지도 검색과 범례를 하나의 얇은 도구막대로 합치고, 탐색 타일을 52px pill/화살표 액션으로 낮췄다. 데스크톱 지도 시트도 62px compact로 줄였다. | A 후보 Active · 독립 재검증과 실제 제보 영상 품질, 사용자 수락 전 S+ 아님 |
| 2026-07-11 10:04 KST | 상업용 S+ 재설계 29차 | static/운영 API 빈 응답에서도 공식 공개자료 fallback 이슈가 표시되게 하고, 지도 `상세`가 선택 현장 상세로 열리도록 고쳤다. 검색 실패는 지도 시트 안에 회복 문구를 보여준다. 390px CDP 캡처에서 `scrollWidth=390`, 하단 5탭, 카드 액션 2열, 지도 상세 `detailTitle=mapTitle`, `selectedTab=근거`, `toastCount=0`을 확인했다. | A+ 후보 Active · 실제 운영 API와 사용자 수락 전 S+ 아님 |
| 2026-07-11 10:16 KST | 상업용 S+ 재설계 30차 | 독립 Visual/IA 재검토가 CTA 분산과 `영상/영상제보` 혼선을 지적해 홈 CTA를 `지도에서 확인` 1개로 올리고, 보조 액션을 `근거/인증영상/반론`으로 낮췄다. 하단/좌측 탭은 `인증영상/현장촬영`으로 분리하고 scanline 단위를 `위치/현장/공식 자료/인원`으로 고정했다. 390px CDP에서 `scrollWidth=390`, `영상제보` 노출 0을 확인했다. | A+ 후보 Active · 지도 placeholder감, 실제 운영 영상, 사용자 수락 전 S+ 아님 |
| 2026-07-11 10:32 KST | 상업용 S+ 재설계 31차 | 지도 fallback canvas를 와이어프레임 도로 그림에서 지도 톤 베이스와 자료 핀/인증 영역 보조 레이어로 바꿨다. MapLibre `styledata/idle`에서도 GeoJSON layer sync를 재시도해 타일 로드 지연 시 핀/영역 누락 위험을 낮췄다. 390px/1440px 지도 캡처에서 `overflowX=false`, `navOverlap=false`, 금지 문구 0을 확인했다. | A+ 후보 Active · 실제 GPS evidence 기반 영역 시각 평가는 운영 데이터 연결 후 재검증 |
| 2026-07-11 10:49 KST | 상업용 S+ 재설계 32차 | 지도 현장 인증 영역을 일반 공개 근거 수가 아니라 공개 가능한 현장 인증 영상 Evidence 기준으로만 만들게 했다. 공식 자료 핀만 있는 현장은 `공개 자료 위치만 확인됐습니다`와 `현장 인증 영역은 아직 없습니다`로 분리하고, 검색 결과는 상세 시트 자동 오픈 없이 지도 맥락에 남기며 인증 영역이 있는 현장은 근접 줌으로 보여준다. | A+ 후보 Active · 실제 운영 GPS evidence, 독립 재검증, 사용자 수락 전 S+ 아님 |
| 2026-07-11 11:04 KST | 상업용 S+ 재설계 33차 | 인증영상 탭이 영상 없는 이슈의 빈 상태로 시작하지 않도록 video-bearing Issue를 기본 선택하고, poster 없는 LIVE Claim은 재생 버튼이 있는 빈 영상판 대신 `검토 대기` 카드로 표시했다. 390px/1440px 캡처에서 `posterImages=0`, `reviewSlots=0`, 금지 문구 0, `overflowX=false`, 모바일 `navOverlap=false`를 확인했다. | A+ 후보 Active · 실제 공개 영상 품질, 독립 재검증, 사용자 수락 전 S+ 아님 |
| 2026-07-11 11:10 KST | 상업용 S+ 재설계 34차 | 실제 공개 `redactedClipUrl`과 poster가 모두 있는 LIVE Claim은 풀스크린 인증영상 탭에서 poster-only 이미지가 아니라 native video player로 렌더되게 했다. sample poster는 계속 검토 카드로 숨기고, `check:web-smoke`가 video branch와 poster-only 회귀 금지를 검증한다. | A+ 후보 Active · 실제 공개 영상 파일 기반 캡처, 독립 재검증, 사용자 수락 전 S+ 아님 |
| 2026-07-11 11:16 KST | 상업용 S+ 재설계 35차 | seed/API가 참조하는 공개 preview clip 파일을 추가하고, 정적 서버의 `.webm/.mp4` MIME과 `media-src` CSP를 보강했다. `check:web-smoke`가 `/media/redacted/preview-occ-live-1.webm` 200, `video/webm`, 5KB 이상, media CSP를 검증한다. | A+ 후보 Active · sample은 UI에서 숨김, 실제 운영 공개 영상 캡처와 사용자 수락 전 S+ 아님 |
| 2026-07-11 11:21 KST | 상업용 S+ 재설계 36차 | 배포 후 smoke, runtime smoke, service watch까지 공개 preview clip을 검사하게 했다. poster만 살아 있고 실제 공개 영상 route가 깨지는 배포 회귀를 `/media/redacted/preview-occ-live-1.webm` 200, `video/webm`, `nosniff`, 5KB 이상 조건으로 차단한다. | A+ 후보 Active · 실제 운영 공개 영상 캡처와 사용자 수락 전 S+ 아님 |
| 2026-07-11 11:26 KST | 상업용 S+ 재설계 37차 | 라이브 Web에서 최신 HTML과 공개 영상 파일은 확인됐지만 `build-info.json/js` 404와 정적 `Cache-Control` 미적용이 확인됐다. Static Web build command를 운영 secret 전체 검사와 분리하고 `check:web-smoke`로 산출물 계약을 검증하게 했으며 Render CSP에 공개 영상용 `media-src`를 추가했다. | A+ 후보 Active · Render Dashboard/Blueprint 적용 확인과 사용자 수락 전 S+ 아님 |
| 2026-07-11 11:29 KST | 상업용 S+ 재설계 38차 | `build-info.json/js`가 `.gitignore`에 막혀 Render Static publish에서 빠지는 회귀를 막기 위해 ignore 항목을 제거하고 `launch-check`에 금지 검사를 추가했다. | A+ 후보 Active · 다음 Render 배포에서 live build-info 200 확인 전 S+ 아님 |
| 2026-07-11 11:34 KST | 상업용 S+ 재설계 39차 | Render Static이 untracked build output을 publish하지 않는 경우를 막기 위해 `build-info.js/json` placeholder를 repo에 추적시키고, build command가 실제 SHA로 덮어쓰는 계약을 `launch-check`에 추가했다. | A+ 후보 Active · live build-info SHA 확인 전 S+ 아님 |
| 2026-07-11 11:38 KST | 상업용 S+ 재설계 40차 | 라이브 build-info는 200이지만 placeholder 값이 그대로 배포됐다. `check-web-deploy`와 `service-watch`가 `generated-at-build`/`source: placeholder`를 실패 처리하도록 강화했다. | A+ 후보 Active · Render build output 반영 전 S+ 아님 |
| 2026-07-11 11:45 KST | 상업용 S+ 재설계 41차 | `static-manifest.json`을 추가해 live HTML/config/media가 현재 정적 산출물과 같은지 SHA-256으로 검증할 수 있게 했다. | A+ 후보 Active · live manifest 배포와 build-info/header 문제 해결 전 S+ 아님 |
| 2026-07-11 12:40 KST | 상업용 S+ 재설계 42차 | 홈 카드의 동등한 4개 액션을 `근거 보기` primary와 `지도/영상/반론` secondary로 재정렬했다. 390px 첫 카드 `primaryAction=evidence`, visible cards 3, 금지 문구 0, `overflowX=false`; 1440px도 같은 위계를 확인했다. | A+ 후보 Active · 공통 이슈 요약 바, 실제 운영 공개 영상/GPS, 사용자 수락 전 S+ 아님 |
| 2026-07-11 12:48 KST | 상업용 S+ 재설계 43차 | 인증영상·지도·현장촬영 화면에 공통 이슈 요약 바를 붙이고, 모바일→데스크톱 전환 시 현재 화면과 좌측 레일 상태를 보존했다. 390px 세 화면은 같은 status/title/line, `navOverlap=false`, `scrollWidth=390`; 1440px 지도는 `activeRail=explore`, map 1198x698을 확인했다. | A+ 후보 Active · 실제 운영 공개 영상/GPS, 독립 재검증, 사용자 수락 전 S+ 아님 |
| 2026-07-11 13:11 KST | 상업용 S+ 재설계 44차 | surface44 독립 비평을 반영해 홈 primary를 `상세 보기`로 바꾸고, 홈/상세/탐색 지도에 같은 `확인 요약` 문장을 붙였다. 상세 진입은 `개요` 탭으로 안정화했고 하단/레일 탭은 `홈/영상/탐색/법안/제보`로 고정했다. 390px 홈/상세/지도와 1440px 데스크톱 캡처에서 forbidden 0, `scrollWidth=390/1440`, 상세 `selectedDetailTab=개요`, 지도 current tab `탐색`을 확인했다. | A+ 후보 Active · 실제 운영 공개 영상/GPS, 독립 재검증, 사용자 수락 전 S+ 아님 |
| 2026-07-11 13:24 KST | 상업용 S+ 재설계 45차 | surface45 독립 재비평이 10초 기준 실패를 지적해 구체 이슈 우선 정렬, 짧은 요약 포맷, 반복 감사 라벨 제거, 카드 보조 CTA 제거, 지도 CTA `근거·영상 보기`를 반영했다. 390px 첫 카드가 `정보통신망법 개정 반대 집회`로 시작하고 요약은 `서울 · 일시 확인 중 · 기준 2026.07.11 · 위치 1곳 · 공식 확인 중 · 영상 1건 · 반론 1건`, action 1개 `상세 보기`, 지도 current tab `탐색`, forbidden 0, `scrollWidth=390/1440`을 확인했다. | A+ 후보 Active · live build-info/header 실패, 실제 운영 공개 영상/GPS, 사용자 수락 전 S+ 아님 |
| 2026-07-11 13:31 KST | 상업용 S+ 재설계 46차 | `e8b098c` 푸시와 GitHub Actions 성공 후 live static manifest는 최신 커밋과 일치했지만 build-info는 placeholder 그대로였다. deploy checker와 문서가 Render 수동 Static Site 설정 오류를 바로 안내하도록 보강됐다. | A+ 후보 Active · Render build output/header 반영 전 S+ 아님 |
| 2026-07-11 13:40 KST | 상업용 S+ 재설계 47차 | 헤더와 스토리 레일을 시민용 앱 언어로 낮췄다. 모바일/데스크톱 캡처에서 subtitle `공개 위치·근거 확인`, 홈 제목 `확인된 집회·시위`, 상태 `위치와 근거 기준`, 첫 이슈 `정보통신망법 개정 반대 집회`, story labels 3개, forbidden 0, `scrollWidth=390/1440`을 확인했다. | A+ 후보 Active · 카드 CTA/데스크톱 지도 비중/사용자 수락 전 S+ 아님 |
| 2026-07-11 13:50 KST | 상업용 S+ 재설계 48차 | 반복되는 큰 청록 CTA를 제거하고 카드 하단을 `근거·영상·지도 / 자세히` footer로 낮췄다. 390px/1440px에서 action background transparent, action height 30/32px, forbidden 0, `scrollWidth=390/1440`을 확인했다. | A+ 후보 Active · 카드 요약 중복/데스크톱 지도 비중/사용자 수락 전 S+ 아님 |
| 2026-07-11 13:56 KST | 상업용 S+ 재설계 49차 | 카드 요약을 `장소·일시·위치` 1차 정보와 `공식·영상·반론` 근거 상태로 분리했다. 모바일/데스크톱 첫 카드에서 `서울 · 일시 확인 중 · 위치 1곳`, `공식 확인 중 · 영상 1건 · 반론 1건`, forbidden 0, `scrollWidth=390/1440`을 확인했다. | A+ 후보 Active · 데스크톱 지도 비중/썸네일 완성도/사용자 수락 전 S+ 아님 |
| 2026-07-11 14:05 KST | 상업용 S+ 재설계 50차 | 데스크톱 홈 지도 과점을 줄이기 위해 기본 home grid를 이슈 피드 520px, 지도 맥락 648x403px로 조정했다. 모바일 390px은 지도 미노출과 이슈 피드 중심을 유지하고, 양쪽 모두 forbidden 0, rejected 0, `scrollWidth=390/1440`을 확인했다. | A+ 후보 Active · 썸네일 완성도/실제 운영 공개 영상/GPS/사용자 수락 전 S+ 아님 |
| 2026-07-11 14:14 KST | 상업용 S+ 재설계 51차 | 공개 poster 없는 LIVE 영상을 홈 카드 썸네일처럼 표시하지 않고 위치 타일로 대체했다. 390px/1440px 홈은 first visual `issue-place-peek`, `reviewOnlyCards=0`, `placePeekCards=3`, forbidden 0, rejected 0, `scrollWidth=390/1440`을 확인했다. | A+ 후보 Active · 실제 운영 공개 영상/GPS/사용자 수락 전 S+ 아님 |
