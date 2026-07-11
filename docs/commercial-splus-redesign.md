# Commercial S+ Redesign Tracker

Last updated: 2026-07-11 13:56 KST

Active goal: 상업용 앱 수준의 시민용 집회·시위 정보 서비스 UX를 완성한다. 사용자 수락 전에는 UX/디자인을 S+로 표기하지 않는다.

## Current Decision

현재 구현 가설은 `집회·시위 공개자료 First`다. `이슈 파일`이나 `오늘`처럼 내부/시간 오해를 만드는 표현은 운영 화면에서 낮추고, 사용자가 바로 묻는 `무슨 일`, `어디서 확인`, `무엇으로 확인`, `지도/근거/인증영상/반론` 흐름으로 전환한다.

- 홈은 `집회·시위 공개자료` 이슈 목록이다.
- 지도, 영상, 법안은 별도 대시보드가 아니라 선택 이슈의 근거와 맥락으로 들어간다.
- 첫 화면은 KPI, 내부 모델, 숫자판보다 `무슨 일`, 공개 위치 문장, 근거 문장, 불확실성 문장을 먼저 보여준다. 홈 카드의 주행동은 `상세 보기`이고, `지도/영상/반론`은 같은 이슈의 보조 확인 경로로 낮춘다.
- `아직 확인할 점`은 홈 카드마다 큰 박스로 반복하지 않고 상세의 개요·근거에서 확인하게 한다.
- 상세 첫 화면은 `근거`, `영상`, `지도` 빠른 버튼과 3줄 개요를 먼저 보여주고, 탭도 `개요/근거/영상/흐름/반론`처럼 짧게 유지한다. 전국 현황·주제 묶음·규모·검증 신호는 접힌 세부 정보로 낮춘다.
- 공개 가능한 `redactedClipUrl`과 `redactedPosterUrl`이 모두 있는 이슈는 홈 카드 안에 16:9 `비식별 공개본` 프리뷰를 붙인다. 공개본이 없으면 장식 이미지나 가짜 썸네일을 만들지 않는다.
- 홈 첫 화면에는 지도 화면과 제보 도구를 기본 노출하지 않는다. 지도는 `탐색` 탭/카드 보조 버튼/상세 빠른 버튼에서 위치 맥락으로 열고, 공개 열람은 `영상` 탭에서, 제보 작성은 `제보` 탭에서 독립 화면처럼 연다.
- 제보는 일반 업로드가 아니라 `현장 영상 제보`로 제한한다. 첫 화면은 후보/조건 목록보다 `근처 현장 찾기` 단일 주행동을 먼저 보여준다.
- 04:43 독립 비평 기준 현재 화면은 S+가 아니다. Visual critique는 A- 공공서비스 프로토타입, IA red-team은 B-로 평가했다. 이번 패치는 `영상/지도/제보`가 선택 이슈 맥락으로 읽히게 하는 1차 보정이며, 상업용 S+ 승급 근거가 아니다.
- 05:02 패치로 현장 영상 poster를 어두운 야간 placeholder 톤에서 밝은 비식별 공공 현장 프레임으로 재생성했고, 데스크톱 제보 화면에 연결 이슈·선택 현장·공개 위치·현재 단계 상태 패널을 추가했다. 그래도 사용자 수락 전 S+는 아니다.
- 05:14 독립 비평 기준 Visual Design은 홈 모바일 6/10, 영상 모바일 5/10, 지도 데스크톱 4/10, 제보 데스크톱 4.5/10이고 IA Red-Team은 전체 B-다. 이번 19차 패치는 지도-first 재배치, 이슈 카드의 지역·기준일·공개 현장·영상 근거 한 줄, `영상제보` 탭 라벨을 반영했지만, 사용자 수락 전 S+는 아니다.
- 05:20 패치로 지도 선택 시트는 요약 2줄과 `상세 보기` 중심으로 낮추고, 영상 화면 오른쪽 세로 액션 레일은 하단 근거 도구막대로 바꿨다. 모바일 영상에서 하단 내비와 겹치지 않고, 지도 시트도 모바일 223px/데스크톱 178px로 줄었다. 다만 데스크톱 우측 패널과 박스형 화면 밀도는 아직 상업용 S+로 확정할 수 없다.
- 05:29 독립 Visual Critique는 여전히 B-로 평가했고, P0로 `추상 영상 비주얼 제거`, `내부 상태 문구 제거`, `카드/칩/테두리 밀도 축소`를 제안했다. 이번 21차 패치는 샘플 poster를 실제 현장 영상처럼 렌더하지 않고 `현장 영상 공개 준비 중` 슬롯으로 바꿨으며, 데스크톱 지도 탭에서 우측 상세 패널을 숨기고 지도를 83% 폭으로 확장했다. 그래도 사용자 수락 전 S+는 아니다.
- 05:41 패치로 로컬 dev 서버가 오래된 `config.js` 때문에 운영 API를 바라보고 홈이 빈 화면처럼 보이는 회귀를 막았다. `serve-web`은 `MUSUNIL_WEB_API_BASE_URL` 런타임 override를 안전하게 적용하고, web smoke가 이를 검증한다. 홈 카드에서는 실제 공개 poster가 없을 때 대형 검토 썸네일을 만들지 않고 46px 검토 상태 행으로 낮췄다. 그래도 사용자 수락 전 S+는 아니다.
- 05:49 독립 비평 기준 최신 홈은 Visual A-, 국평오 5초 A-/10초 A/20초 A-이며 S+는 아니다. 23차 패치는 카드 상단을 `기준일 · 지역별 확인 건수 · 영상 상태 · 미확인` scanline으로 고정하고, 390px에서도 말줄임 없이 보이게 했다. 남은 최우선 리스크는 데스크톱 홈의 빈 공간과 지도/지역 현황 중심 재구성이다.
- 06:00 패치로 데스크톱 홈은 좌측 이슈 피드, 중앙 `지역 현황` 지도, 우측 선택 이슈 맥락 패널의 4열 구조가 됐다. 모바일/태블릿 홈은 이슈 목록 중심을 유지한다. `현장 영상 근거 0건`처럼 0건 숫자를 직접 노출하는 문구는 제거했다. 그래도 독립 비평 재검증과 사용자 수락 전 S+는 아니다.
- 06:11 독립 재검토에서 Visual Critique는 최신 홈을 C+~A- 후보로 보고, IA/국평오는 5초 PASS-/10초 PARTIAL/20초 PARTIAL로 평가했다. 25차 패치는 이슈 카드에 `근거/영상/지역/반론` 액션 허브를 추가하고, 운영 화면의 0건류 빈 상태를 `확인 중/연결 대기` 언어로 낮췄다. 여전히 캡처 재검증과 사용자 수락 전 S+는 아니다.
- 06:23 패치로 데스크톱 기본 홈은 우측 상세 패널을 닫고 `이슈 목록 + 지역 현황 지도` 2축으로 시작한다. `근거/반론/카드 상세` 행동을 할 때만 `desktop-detail-open` 패널이 열리며, 1440px 기본 홈에서 `detailVisible=false`, 지도 폭 828px, 액션 후 상세에서 `selectedTab=근거`를 확인했다. 그래도 실제 제보 영상 품질과 사용자 수락 전 S+는 아니다.
- 06:32 패치로 지도 위 선택 시트를 홈에서는 62px 선택 요약, 모바일 지도에서는 114px 요약으로 낮췄다. `상세 보기`는 `상세`로 줄이고, `상세 패널에 반영` 같은 내부 표현을 운영 화면에서 제거했다. 1440px 홈 `sheetMapRatio=0.13`, 390px 지도 `sheetMapRatio=0.25`, `navOverlap=false`, `rejected=[]`를 확인했다. 그래도 사용자 수락 전 S+는 아니다.
- 09:37 패치로 지도 검색·범례를 하나의 얇은 지도 도구막대로 합치고, 탐색 타일을 52px 선택 pill로 낮췄다. 데스크톱 지도 시트도 62px로 낮아졌고, 1440px 지도 `toolbarMapRatio=0.08`, `sheetMapRatio=0.09`, 390px 지도 `toolbarMapRatio=0.11`, `firstTile.height=52`, `navOverlap=false`, `rejected=[]`를 확인했다. 사용자 수락 전 S+는 아니다.
- 10:04 패치로 static/운영 API 빈 응답 상태에서도 공식 공개자료 fallback 이슈가 보여 빈 홈 회귀를 막았다. 지도 `상세`는 선택 이슈가 아니라 선택 현장 `target` 상세로 열리며, 검색 실패는 지도 시트 안에 회복 문구를 표시한다. 390px CDP 캡처에서 `scrollWidth=390`, 하단 5탭, 지도 상세 `detailTitle=mapTitle`, `selectedTab=근거`, `toastCount=0`을 확인했다. 그래도 실제 운영 API와 사용자 수락 전 S+는 아니다.
- 10:16 독립 Visual/IA 재검토에서 `카드 안의 카드`, `다음 행동 분산`, `영상/영상제보 오해`, `위치·규모 단위 불명확`이 P0/P1로 지적됐다. 30차 패치는 홈 카드 주행동을 `지도에서 확인` 1개로 올리고 보조 액션을 `근거/인증영상/반론`으로 낮췄으며, 탭 라벨을 `인증영상`과 `현장촬영`으로 분리했다. 390px CDP `scrollWidth=390`, scanline `위치 2곳 · 현장 5건 · 공식 자료 6건 · 인원 미확인`, forbidden `영상제보=[]`를 확인했다. 그래도 지도 placeholder감, 실제 제보 영상 품질, 사용자 수락 전 S+는 아니다.
- 10:32 패치로 지도 fallback canvas를 와이어프레임 도로 그림에서 실제 지도 표면과 같은 톤의 데이터 보조 레이어로 바꿨다. MapLibre 타일 로드가 늦어도 `자료 위치 핀`과 `현장 인증 범위`를 다시 그리며, `styledata/idle`에서도 GeoJSON 레이어 동기화를 재시도한다. 390px/1440px 지도 캡처에서 `overflowX=false`, `navOverlap=false`, 금지 문구 0을 확인했다. 현장 인증 범위의 최종 시각 평가는 실제 공개 가능 GPS evidence가 붙은 운영 데이터로 다시 해야 한다.
- 10:49 패치로 지도 인증 영역은 일반 공개 근거 수가 아니라 공개 가능한 현장 인증 영상 Evidence가 있을 때만 생성되게 했다. 공식 자료 위치만 있는 대구 현장은 `공개 자료 위치만 확인됐습니다`로 표시되고, 서울 현장 인증 mock은 `1건의 현장 인증 자료로 공개 범위를 계산했습니다`로 표시된다. 지도 검색은 모바일에서 상세 시트를 자동으로 열지 않고 지도 맥락 안에서 결과를 선택하며, 인증 영역이 있는 현장은 근접 줌으로 반경이 읽히게 한다. 사용자 수락 전 S+는 아니다.
- 11:04 패치로 `인증영상` 탭이 영상 근거가 있는 이슈를 기본으로 고르고, 공개 poster가 없는 LIVE Claim은 재생 가능한 영상처럼 보이지 않게 `검토 대기` 카드로 렌더한다. 390px에서 panel bottom 715px, 하단 내비 top 772px, `navOverlap=false`, `reviewSlots=0`, `posterImages=0`, 금지 문구 0을 확인했다. 실제 운영 제보 영상 품질과 사용자 수락 전 S+는 아니다.
- 11:10 패치로 실제 공개 `redactedClipUrl`과 공개 poster가 모두 있는 LIVE Claim은 풀스크린 인증영상 탭에서 poster-only 이미지가 아니라 native video player로 열린다. sample poster는 계속 숨겨 검토 카드로 보이며, `check:web-smoke`가 `publicLiveVideoDisplaySrc`, `<video class="reel-video">`, controlslist, poster-only 회귀 금지를 검증한다. 실제 공개 영상 파일이 붙은 운영 캡처와 사용자 수락 전 S+는 아니다.
- 11:16 패치로 seed/API가 참조하는 `/media/redacted/preview-*.webm` 공개 clip 파일을 추가하고, 정적 서버가 `.webm/.mp4`를 영상 MIME으로 서빙하며 `media-src` CSP를 허용하게 했다. `check:web-smoke`가 preview clip 200, `video/webm`, 5KB 이상, media CSP를 검증한다. sample media는 UI에서 실제 제보처럼 노출하지 않는다.
- 11:21 패치로 배포 후 smoke, runtime smoke, service watch도 poster뿐 아니라 `/media/redacted/preview-occ-live-1.webm` clip의 200 `video/webm`, `nosniff`, payload 크기를 같이 확인하게 했다. 정적 웹만 통과하고 운영 API 영상 route가 깨지는 회귀를 S+ 게이트에서 차단한다.
- 11:26 라이브 점검에서 `https://musunil.com/` HTML과 `/media/redacted/preview-occ-live-1.webm`은 최신으로 보이지만 `/build-info.json`과 `/build-info.js`는 404, `/`와 `/config.js`는 `Cache-Control: public, max-age=14400`으로 응답했다. Render Static Site가 현재 Blueprint/build command/header 기준을 완전히 적용하지 않는 상태로 판정하고, Web static build command를 `build:web-static + check:web-smoke`로 분리했으며 Render CSP에 `media-src`를 추가했다.
- 11:29 패치로 `.gitignore`에서 `apps/web/build-info.js/json` 제외를 제거했다. build command가 생성한 공개 배포 확인 산출물이 Render Static publish에서 누락되는 문제를 재발 방지하기 위해 `launch-check`도 build-info ignore 회귀를 실패 처리한다.
- 11:34 패치로 `apps/web/build-info.js/json` placeholder를 repo에 추적시킨다. Render Static이 untracked build output을 publish하지 않는 경우에도 파일 경로가 존재하고, build command가 실행되면 실제 Git SHA로 덮어쓴다. `launch-check`는 build-info 파일이 Git 추적 대상이 아니면 실패한다.
- 11:38 라이브 점검에서 build-info 파일은 200으로 바뀌었지만 값이 `generated-at-build` placeholder 그대로였다. 즉 Render가 build command 산출물을 publish하지 않는 상태다. `check-web-deploy`와 `service-watch`가 placeholder build-info를 배포 실패로 처리하도록 강화했다.
- 11:45 패치로 `static-manifest.json`을 추가했다. manifest는 `index.html`, `config.js`, 공개 poster/clip의 SHA-256과 byte size를 담고, `check-web-deploy`가 live 파일 해시를 비교한다. Render build output이 placeholder인 상태에서도 실제 UI 정적 파일이 현재 산출물인지 별도 증거를 확보한다.
- 12:24 패치로 상세 시트의 긴 `인증 영상/시간 흐름/반론·정정` 탭 라벨을 화면에서는 `영상/흐름/반론`으로 줄이고 접근성 라벨에 전체 의미를 남겼다. 모바일 상세 시트는 내부 스크롤과 탭 최소 높이를 고정해 390px에서 하단 내비 겹침 없이 `근거/영상/지도`, `개요/근거/영상/흐름/반론`이 보인다. 사용자 수락 전 S+는 아니다.
- 12:34 독립 Visual Critique가 모바일 상세를 P0로 지적했다. `-webkit-line-clamp` 기반 숨김을 제거하고 제목·요약·핵심 문장이 자연 줄바꿈되게 바꿨다. 390px 상세에서 title/summary/row horizontal overflow false, panel fit true, `navOverlap=false`, `scrollWidth=390`을 확인했다. 사용자 수락 전 S+는 아니다.
- 12:40 패치로 홈 카드 액션을 4개 동등 버튼에서 `근거 보기` primary와 `지도/영상/반론` secondary로 재정렬했다. 모바일 390px 첫 카드 primary action은 evidence, secondary는 map/video/dispute, visible cards 3, `scrollWidth=390`, forbidden 0을 확인했다. 사용자 수락 전 S+는 아니다.
- 12:48 패치로 `인증영상/지도/현장촬영` 상단에 같은 이슈 요약 바를 붙였다. 상태, 이슈명, 지역·일정·위치 수·현장 수·공식 근거·영상 상태가 화면마다 같은 구조로 유지되고, 모바일에서 데스크톱으로 확장해도 현재 화면과 좌측 레일 선택 상태가 보존된다. 사용자 수락 전 S+는 아니다.
- 13:11 패치로 독립 Visual Critique/IA Red-Team의 surface44 지적을 반영해 홈 primary를 `상세 보기`로 바꾸고, 카드/상세/지도에 공통 `확인 요약` 문장을 붙였다. 상세 진입은 비동기 로딩과 무관하게 `개요` 탭으로 안정화했고, 최상위 탭은 `홈/영상/탐색/법안/제보`로 고정했다. 그래도 실제 운영 공개 영상/GPS와 사용자 수락 전 S+는 아니다.
- 13:24 독립 surface45 재비평은 10초 기준 실패로 판정했다. 46차 패치는 fallback/빈 API 상태에서도 구체 이슈를 먼저 정렬하고, 요약을 `지역 · 일시 · 기준 · 위치 · 공식 · 영상 · 반론` 짧은 순서로 고정했다. 카드 반복 라벨 `공개자료 기준/확인 요약`과 보조 CTA 3개를 제거하고, 지도 시트 CTA를 `근거·영상 보기`로 바꿨다. 사용자 수락 전 S+는 아니다.
- 13:24 live `https://musunil.com` 검증은 여전히 실패한다. `/static-manifest.json`은 최신 index hash를 가리키지만 `/build-info.json`은 placeholder이고 `/`, `/config.js`, `/build-info.json` 모두 no-store가 아니다. Render build/header 계약이 실제 서비스에서 반영되기 전 운영 배포 준비는 S+로 승급하지 않는다.
- 13:31 `e8b098c` 푸시 후 GitHub Actions는 통과했고 live manifest도 새 커밋과 일치했지만 `/build-info.json`은 여전히 placeholder다. `check:web-deploy` 실패 메시지와 launch 문서를 강화해 Render 수동 Static Site가 빌드 산출물이 아니라 커밋된 `apps/web`을 그대로 publish하는 경우를 즉시 식별하게 했다.
- 13:40 surface47 패치로 브랜드 subtitle을 `공개 위치·근거 확인`, 홈 제목을 `확인된 집회·시위`, fallback 상태 문구를 `위치와 근거 기준`으로 바꾸고, 스토리 레일은 짧은 이슈명 pill로 정리했다. 390px/1440px 캡처에서 첫 이슈는 `정보통신망법 개정 반대 집회`, story labels는 `정보통신망법 개정 반대/대통령 탄핵 요구 행진/전국 집회 공개 일정`, forbidden 0, `scrollWidth=390/1440`이다. 카드 CTA와 데스크톱 지도 비중은 다음 개선 대상으로 남긴다.
- 13:50 surface48 패치로 반복되는 큰 청록 CTA를 제거했다. 홈 카드는 전체 탭 가능한 피드 카드로 유지하고, 하단은 `근거·영상·지도 / 자세히`의 가벼운 경로 footer로 낮췄다. 390px/1440px 캡처에서 action background는 transparent, action height는 30/32px, forbidden 0, `scrollWidth=390/1440`이다. 아직 카드 요약 줄과 하단 경로의 중복, 데스크톱 지도 비중은 다음 개선 대상으로 남긴다.
- 13:56 surface49 패치로 홈 카드 요약을 `장소·일시·위치` 1차 정보와 `공식·영상·반론` 근거 상태로 분리했다. 390px/1440px 첫 카드 place line은 `서울 · 일시 확인 중 · 위치 1곳`, evidence line은 `공식 확인 중 · 영상 1건 · 반론 1건`, footer는 `근거·영상·지도 자세히`, forbidden 0, `scrollWidth=390/1440`이다. 다음 개선은 데스크톱 지도 비중과 카드 썸네일의 시각 완성도다.

## Agent Feedback Summary

| 에이전트 | 결론 | 반영 |
|---|---|---|
| Visual Design Critique | 정보 정리는 좋아졌지만 카드/박스/칩 반복 때문에 아직 상업용 앱보다 정리된 공공 대시보드처럼 보인다. | 상단 KPI 숨김, 카드 숫자판 제거, 장식 커버 제거, 홈 카드의 반복 불확실성 박스 제거, 우측 상세 세부 정보 접힘 |
| Reference Mapping | Instagram/Citizen/PulsePoint/Naver/KakaoMap/Toss/GOV.UK의 겉모양이 아니라 익숙한 조작 문법만 차용해야 한다. | 홈은 가벼운 이슈 피드, 상세는 정확한 근거, 지도는 위치 확인 도구, 영상은 검증 중심 릴스 문법으로 분리 |
| IA Redesign | 현재 5탭은 정답이 아니며 `이슈 First`를 먼저 검증해야 한다. | 홈을 이슈 목록으로 재정의하고, 최상위 탭은 `탐색`으로 유지하되 지도는 위치 맥락 도구로 낮춤 |
| 국평오 Red-Team | 5초 정체성은 가능하지만 `관련 법안`, `이슈 파일 보기`, `장소·시간` 분류명이 첫 행동을 흐린다. | 홈의 `관련 법안` CTA 제거, 카드 CTA를 `어디서 확인됐나`로 변경, `어디서/근거` 질문형 문구 적용 |
| Visual Design Critique 2 | 02:17 캡처 기준 A-. 시민용 앱보다 운영 대시보드에 가깝고, 5초 요약과 현장 영상 프리뷰 품질이 약하다. | 카드 첫 화면을 `공개 위치/확인 수준/현재 상태` 시민 5초 요약으로 재구성, CTA를 `확인 근거 보기`로 좁힘 |
| Reference Mapping 2 | PulsePoint/GOV.UK 방향은 맞지만 Toss식 한 행동과 Naver/KakaoMap식 위치 인지가 약하다. | 카드에 공개 위치 반경/정밀 위치 비공개 표현을 추가하고, 상태와 검증 상태를 분리 |
| Visual Design Critique 3 | 02:34 캡처 기준 여전히 표형 카드, 반복 칩, 작은 영상 프리뷰가 상업용 앱보다 업무 시스템처럼 보인다. | 표형 `공개 위치/확인 수준/현재 상태` row 제거, 모바일 상단 위치/알림 도구 숨김, 카드 영상 프리뷰 16:9 확대 |
| Reference Mapping 3 | `A' 오늘의 집회·시위 First`가 가장 쉽고, 지도/법안/영상은 동등한 목적지가 아니라 선택 이슈의 보조 맥락이어야 한다. | 상세 탭 순서를 `개요/근거/영상/지도/다른 주장`으로 재정렬 |
| QA/Principle Regression | poster 없는 clip이 publishable로 취급되는 회귀 구멍이 있다. | `redactedClipUrl + redactedPosterUrl + proof + device integrity`가 모두 있어야 공개 영상으로 계산되게 서버·웹·스모크 강화 |
| Visual Design Critique 4 | 02:59 캡처 기준 빈 영상 박스 문제는 해소됐지만 데스크톱 우측 패널은 아직 상업용 앱보다 행정 상세 패널 느낌이 남는다. | API 공개 poster 서빙을 추가하고, 홈 영상 프리뷰 정보를 별도 박스가 아닌 16:9 미디어 오버레이로 압축 |
| PM Local Patch 1 | 03:07 캡처 기준 우측 상세의 표형 느낌과 업무 시스템 버튼감이 줄었다. 다만 사용자 수락 전이며, 실제 레퍼런스 대조 기반 독립 비평은 아직 다시 받아야 한다. | 우측 상세를 문장형 스택, 아이콘+라벨 빠른 버튼, 가벼운 pill tab, 흐름형 overview로 재정렬 |
| Visual/Reference/Red-Team 5 | 03:15 제보 화면은 후보와 조건이 먼저 보여 초보자에게 업로드 도구처럼 읽혔다. 첫 화면은 위치 확인 한 행동, 대상 확정, 앱 내 촬영, 제출 확인 순서로 단순해야 한다. | 제보 제목을 `현장 영상 제보`로 바꾸고 GPS 전 후보 카드를 숨김. 기준 설명은 접고, CTA를 `내 위치로 현장 찾기` 중심으로 재정렬 |
| PM Local Patch 2 | 03:25 지도 탭이 2열 숫자 타일로 보여 대시보드 미학이 재등장했고, 상세 `지도` 탭은 실제 지도 대신 시간축을 보여 예측 가능성이 낮았다. | 지도 탭을 숫자 없는 이슈·지역 리스트로 바꾸고, 상세 탭 `지도`를 `흐름`으로 수정. `지도` 빠른 버튼만 실제 지도 화면으로 이동 |
| PM Local Patch 3 | 03:34 영상 화면이 검은 목업판처럼 보이고 텍스트 원형 액션이 검증 도구처럼 보였다. | 공개 poster를 full-screen 영상 배경으로 직접 렌더링하고, `비식별 공개본` badge와 아이콘+짧은 라벨 액션 레일로 정리. 로컬 API poster를 허용하도록 dev CSP 보정 |
| Independent Audit 4 | 03:47 독립 비평 3개가 `오늘` 날짜 혼선, 영상 프리뷰-CTA 불일치, `현장 파일`/`현장 판단` 같은 운영자 언어, 전역 알림 CTA 과노출을 P0/P1로 지적했다. | 홈 제목을 `집회·시위 공개자료`로 바꾸고, 홈 중앙 재생 아이콘 제거, `현장 파일 보기` 제거, `현장 판단/GPS 인증`을 `현장 확인/촬영 위치 확인`으로 변환, 릴스 액션을 `근거/위치 범위/관련 이슈` 3개로 축소 |
| PM Local Patch 4 | 03:53 모바일 첫 카드가 390px에서 397px로 길어 피드보다 행정 카드처럼 보였다. | 공개 영상이 있는 모바일 이슈 카드를 우측 썸네일+문장 요약 구조로 압축. 첫 카드 170px, 390/430px에서 이슈 카드 2개가 첫 화면에 들어옴 |
| PM Local Patch 5 | 03:59 우측 상세의 `장소·시간/확인 근거/아직 확인` 라벨 행이 분석 패널처럼 보였다. | 상세 상단을 3문장 요약+짧은 문장 리스트로 바꾸고, 라벨은 시각적으로 숨김. `근거/영상/지도` 빠른 버튼은 유지 |
| PM Local Patch 6 | 04:14 모바일 지도 탭은 선택 카드가 길어 지도가 밀렸고, 지도 시트는 `장소/근거/최근 확인/확인 정도` 값판처럼 보였다. | 모바일 지도 선택지를 가로 칩으로 낮추고 지도 첫 화면을 올림. 지도 시트를 문장형 위치 맥락으로 바꾸고, 지도·상세 패널을 같은 현장으로 동기화. 원천 제목/출처명의 `오늘의` 날짜 혼선도 공개 표시층에서 중립화 |
| PM Local Patch 7 | 04:27 제보 탭이 GPS 전부터 권한 오류처럼 보이거나 단계 표시가 첫 화면을 과하게 차지하면 초보 제보자가 업로드 흐름을 불안하게 느낀다. | 제보 탭 진입만으로 위치 권한을 요청하지 않게 하고, 모바일 단계 표시를 44px 진행 표시로 압축. 후속 패치에서 첫 화면 CTA는 `근처 현장 찾기`로 정리 |
| Independent Audit 5 | 04:30 제보 첫 화면은 기능적으로 단순해졌지만 5단계 pill, 상단 인증/위치 칩, 기술 기준 문구 때문에 아직 검증 워크플로 패널처럼 보인다. `근거 보기` CTA도 실제 근거 탭으로 바로 가지 않아 예측 가능성이 낮다. | 위치 확인 전 단계표와 상단 칩을 숨김. CTA를 `근처 현장 찾기`로 바꾸고 결과를 문장으로 예고. `근거 보기` 클릭은 상세 `근거` 탭으로 직행하게 변경 |
| IA Red-Team 6 | 04:30 상위 탭 `영상/지도/제보`가 이슈의 하위 맥락이 아니라 동급 기능 모음처럼 읽힐 수 있다. | 이번 패치에서는 홈 `근거 보기` 직행만 반영. 상위 IA 재검증은 Active 잔여 리스크로 유지 |
| Visual Design Critique 6 | 04:43 최신 캡처 기준 S+ 아님. 카드/테두리/패널이 많고 영상 표면은 어두운 placeholder처럼 보이며 모바일 하단 내비와 오버레이가 답답하다. 데스크톱 제보는 빈 공간이 많다. | 이슈 맥락 카드를 얇은 문맥 라인으로 낮추고, 릴스 오버레이를 하단 내비 위로 올림. 영상 표면과 데스크톱 제보 밀도는 Active 리스크로 유지 |
| IA Red-Team 7 | 04:43 5초 주제 파악은 통과하지만 10초 `어디/언제/규모`는 부분 실패. `2건 진행·예정`, `공개된 주장`, `근거/이슈` 버튼이 모호하다. | 문맥 라인을 `서울 · 시간 확인 중 · 위치 1곳 · 현장 2건 · 공식 확인 중 · 영상 근거 1건`으로 축약. 상세 탭을 `현장 영상/시간 흐름/반론·정정`으로 변경하고 `공개된 주장`을 `출처별 자료`로 교체 |
| PM Local Patch 8 | 05:02 영상 표면의 placeholder감과 데스크톱 제보 빈 공간을 직접 줄였다. | redacted preview poster 생성 로직을 밝은 현장 프레임으로 변경. 데스크톱 제보는 980px 폭, 좌측 현장 찾기·우측 연결 상태 패널 구조로 재배치. 모바일 릴스 poster 960px 로드, 오버레이/하단내비 겹침 없음 확인 |
| Visual Design Critique 7 | 05:14 현재 화면은 홈 6/10, 영상 5/10, 지도 4/10, 제보 4.5/10이다. 지도는 지도보다 리스트/상세가 우세하고, 영상/홈의 추상 썸네일과 반복 pill/card가 AI 대시보드 신호다. | 지도 DOM을 지도-first로 재배치하고, 이슈/지역 리스트는 지도 아래 선택 스트립으로 낮춤. 추상 썸네일·박스형 UI는 Active 리스크 유지 |
| IA Red-Team 8 | 05:14 5초 정체성은 A-지만 10초 `어디/언제/규모`는 C+, 20초 근거/영상/지도/제보 경로는 B-다. `제보` 단독 라벨은 자유 제보처럼 읽힐 수 있다. | 이슈 카드에 `지역 · 기준일 · 공개 현장 · 영상 근거` 한 줄을 추가하고, 하단/좌측 탭 라벨을 `영상제보`로 변경 |
| PM Local Patch 9 | 05:14 지도 탭의 지도 top이 데스크톱 620px, 모바일 328px로 밀려 지도-first가 아니었다. | 지도 top을 데스크톱 211px, 모바일 215px로 올림. 데스크톱 지도 높이 700px, 모바일 지도 높이 460px, 금지 문구 0, `overflowX=false` 확인 |
| PM Local Patch 10 | 05:20 지도 시트가 지도를 다시 가리고, 영상 액션이 소셜 앱의 반응 레일처럼 읽힐 수 있었다. | 지도 시트 summary는 2줄만 노출하고 높이를 모바일 223px/데스크톱 178px로 낮춤. 영상 액션은 하단 `근거/위치 범위/관련 이슈` 도구막대로 바꿔 하단 내비와 겹치지 않게 조정 |
| Visual Design Critique 8 | 05:29 최신 화면은 B-. 생성 poster가 앱을 AI 데모처럼 보이게 만들고, 데스크톱 `좌측 레일 + 중앙 패널 + 우측 인스펙터`가 업무 화면처럼 보인다. | 샘플 redacted poster는 화면 표시용에서 제외하고 검토 대기 슬롯으로 렌더. 데스크톱 지도는 우측 상세 패널을 숨기고 지도 중심 레이아웃으로 확장 |
| PM Local Patch 11 | 05:41 캡처 기준 홈 데이터 빈 화면 회귀와 대형 검토 썸네일은 상업용 신뢰를 해친다. | `serve-web` 런타임 config override와 smoke 검증 추가. 홈 검토 영상 표면을 46px 상태 행으로 낮춰 모바일 첫 카드 241px, 데스크톱 첫 카드 281px로 축소 |
| Visual Design Critique 9 | 05:41/05:49 홈 캡처 기준 A-. 모바일은 앱다워졌지만 데스크톱은 빈 공간, 반복 상태, 비슷한 무게의 버튼/탭 때문에 S+가 아니다. | 23차에서는 카드 scanline만 정리. 다음 단일 디자인 변경은 데스크톱 홈을 지도/지역 현황 중심으로 재구성 |
| 국평오 Red-Team 9 | 05:41 홈 캡처 기준 5초 A-, 10초 A, 20초 A-. `진행 또는 예정`, `공개자료 기준`, `영상 근거 0건`과 검토 상태가 혼란을 만든다. | 카드 상단을 `7월 7일 기준 · 서울·대전 3건 확인 · 영상 1건 검토 · 1건 더 확인`처럼 고정 scanline으로 변경 |
| PM Local Patch 12 | 06:00 데스크톱 홈의 빈 canvas를 지도·지역 현황으로 채우고, 0건 영상 문구를 사용자 언어로 낮췄다. | 데스크톱 홈 기본 layout을 4열로 바꾸고 `지역 현황` 지도와 이슈/지역 선택 타일을 노출. 모바일은 지도 미노출, 이슈 피드 유지. 390/430/768/1440px 모두 `overflowX=false`, 금지 문구 0 |
| Visual Design Critique 10 | 06:11 재검토 기준 첫 화면은 아직 상업용 시민 앱보다 보고서 리스트에 가깝다. CTA가 약하고 데스크톱은 패널 경쟁이 남아 있다. | 홈 이슈 카드의 단일 CTA를 `근거/영상/지역/반론` 행동 허브로 바꾸고, 선택 상태 글로우를 낮춤 |
| IA/국평오 Red-Team 10 | 06:11 기준 5초는 통과 후보지만 10초 규모, 20초 다른 주장/반론 경로는 부분 실패다. | 카드 scanline에 규모 상태와 다른 주장 상태를 추가하고, `반론` 버튼을 첫 카드 액션으로 노출 |
| QA Agent 10 | 06:11 기준 운영 화면 코드에 `0건`/`0개`가 사용자 빈 상태로 노출될 여지가 많다. | 법안, 탐색, 상세, 영상 카드의 0-count 문구를 `확인 중/연결 대기/공개 근거 확인 중`으로 전환하고 web smoke 가드 추가 |
| PM Local Patch 13 | 06:23 데스크톱 홈의 우측 상세가 첫 화면에서 지도와 경쟁했다. | 기본 홈은 상세 패널을 닫고, 사용자가 `근거/반론/카드 상세`를 누를 때만 상세 패널을 여는 `desktop-detail-open` 상태로 전환 |
| Visual Design Critique 11 | 06:32 지도는 홈에서 맥락 도구로 보이기 시작했지만, 지도 시트와 검색/범례/탐색 타일이 아직 패널 스택처럼 보일 수 있다. | 지도 시트 h3/summary line clamp, 홈 지도 시트 62px compact, 모바일 지도 시트 114px compact, 내부 토스트/맥락 문구 제거 |
| PM Local Patch 14 | 09:37 검색창·범례·탐색 타일이 각각 카드처럼 떠 있어 지도 화면이 패널 묶음으로 읽혔다. | 검색/범례를 54px 이하 도구막대로 합치고, 탐색 타일을 52px pill/화살표 액션으로 낮춤. 데스크톱 지도 선택 시트도 62px compact로 정리 |
| Visual/IA Red-Team 12 | 10:16 홈 카드 4개 CTA가 기능 목록처럼 보이고, `영상/영상제보`가 공개 열람과 제보 작성으로 구분되지 않는다. 10초 위치·규모 단위도 문장 속에 묻힌다. | 홈 CTA를 `지도에서 확인` primary 1개로 통합, 보조 액션 `근거/인증영상/반론`으로 낮춤. 탭 라벨 `인증영상/현장촬영`, scanline `위치/현장/공식 자료/인원` 단위 고정 |
| PM Local Patch 15 | 10:32 지도 fallback이 흐린 격자와 회색 선으로 보여 실제 상업용 지도보다 와이어프레임처럼 읽힌다. | fallback canvas를 지도 톤 베이스+자료 핀+인증 영역 렌더링으로 교체하고, MapLibre `styledata/idle`에서 source/layer 동기화를 재시도 |
| PM Local Patch 16 | 10:49 인증 영역이 공식 자료 핀만 있는 현장에도 생기면 사용자가 GPS 현장 인증이 있다고 오해할 수 있다. | fallback `presenceAreas`를 공개 가능한 live Evidence 기준으로만 생성. 공식 자료 핀과 현장 인증 영역 문구를 분리하고, 지도 검색은 상세 자동 오픈 없이 지도 맥락에 남기며 인증 영역이 있는 현장은 14.4 줌으로 확대 |
| PM Local Patch 17 | 11:04 인증영상 탭이 첫 진입에서 영상 없는 이슈의 빈 상태로 시작하거나 poster 없는 Claim을 거대한 빈 영상판처럼 보여 상업용 앱보다 데모 화면처럼 읽혔다. | 기본 영상 이슈 선택을 video-bearing Issue로 보정하고, poster 없는 LIVE Claim은 `검토 대기` 정보 카드로 낮춤. 모바일 겹침·가로 넘침·소셜 금지 문구 없음 확인 |
| PM Local Patch 18 | 11:10 실제 공개 영상이 들어와도 풀스크린 탭이 poster 이미지만 보여주면 “영상 앱”이 아니라 증거 카드처럼 보인다. | 공개 clip+poster가 모두 있으면 `<video class="reel-video">`로 렌더하고 sample/fallback은 계속 검토 카드로 유지. web smoke가 poster-only 회귀를 차단 |
| PM Local Patch 19 | 11:16 API seed가 공개 clip URL을 가리키지만 로컬/정적 미디어에는 poster만 있어 실제 video branch 검증이 약했다. | 참조 중인 preview webm 파일을 추가하고, 정적 서버 MIME/CSP를 보강. web smoke가 clip route와 media CSP를 검증 |
| Visual Design Critique 13 | 12:31 현재 UI는 원칙 위반은 적지만 정보가 많은 내부 운영 도구처럼 읽힌다. P0는 모바일 상세 가독성/레이아웃 파손, P1은 첫 5초 주제 인지 약함과 동등한 근거/영상/지도/반론 버튼 위계다. | 이번 패치에서 상세 제목/요약/bullet 숨김 클램프를 제거하고 줄바꿈 안정화. 다음 패치 후보는 공통 이슈 요약 바와 액션 위계 재정렬 |
| PM Local Patch 20 | 12:40 홈 카드의 `지도/근거/영상/반론` 4개 버튼이 같은 무게라 기능 목록처럼 보였다. | `근거 보기`를 full-width primary로 올리고 `지도/영상/반론`을 3개 secondary로 낮춤. 지도는 별도 위치 미리보기와 보조 버튼으로 유지 |
| PM Local Patch 21 | 12:48 영상·지도·현장촬영 화면이 각각 따로 노는 화면처럼 읽힐 수 있었다. | 공통 이슈 요약 바에 상태 pill, 이슈명, 지역·현장·근거 요약을 통일하고, 모바일→데스크톱 전환 시 선택 화면과 레일 상태를 유지 |
| Visual/IA Surface44 | 홈은 B+, 상세 B, 지도 B+, 데스크톱 B+ 후보. 가장 큰 문제는 감사 라벨과 반복 버튼이 여전히 대시보드처럼 읽히고, 10초 안에 `언제/어디/근거/반론`을 한 줄로 파악하기 어렵다는 점이다. | 홈 primary를 `상세 보기`로 바꾸고, 모든 주요 표면에 `확인 요약` 문장을 공유. 상세 탭은 즉시 `개요`로 열리게 하고, 탭 라벨은 `홈/영상/탐색/법안/제보`로 단순화 |
| Visual/IA Surface45 | 5초 주제 파악은 부분통과, 10초 `어디/언제/어느 정도`는 실패. `공개자료 기준`, `확인 요약`, `7월 9일 공개자료`가 내부 운영어처럼 보이고 첫 카드가 메타 이슈라 목적이 흐렸다. | 구체 이슈 우선 정렬, 짧은 공통 요약 포맷, 반복 감사 라벨 제거, 카드 보조 CTA 제거, 지도 CTA `근거·영상 보기` 적용 |

## Active Goal Board

| 순서 | 목표 | 상태 | 완료 기준 |
|---:|---|---|---|
| 0 | S+ 판정 리셋 | 완료 | `docs/splus-ux-tracker.md`가 현재 UX를 Active 미달로 표시 |
| 1 | 대시보드 미학 제거 | 1차 완료 | 상단 KPI, 카드 내 숫자판, 장식 글로우, 선택됨 배지가 첫 화면에 보이지 않음 |
| 2 | 이슈 First 구현 | 7차 진행 | 모바일 첫 화면에서 주요 이슈와 `근거/영상/지역/반론` 액션이 한 번에 보이고, 각 행동이 같은 이슈 문맥으로 이동 |
| 3 | 상세 문장형 확인 구조 | 4차 완료 | 상세 상단이 3문장 요약과 짧은 문장 리스트로 보이고, 라벨 행은 화면에서 보이지 않음 |
| 4 | 공개 현장 프리뷰 연결 | 3차 완료 | `redactedClipUrl`과 `redactedPosterUrl`이 모두 있는 이슈 카드에 API-served 16:9 비식별 공개본 프리뷰와 재생 표식이 보임 |
| 5 | 시민 5초 요약 검증 | 2차 완료 | 390px에서 표형 row 0개, 공개 영상 프리뷰 336x189, `overflowX=false` 확인 |
| 6 | 데스크톱 도구 동시노출 제거 | 완료 | 홈에서 지도/제보가 보이지 않고, 지도·제보는 각각 탭에서 독립 흐름으로 열림 |
| 7 | 제보 첫 행동 단순화 | 3차 완료 | 제보 첫 화면에서 단계표/상단 인증칩/후보/대상 패널 0개, 위치권한 자동 요청 0개, 주행동 `근처 현장 찾기`, 기준 설명 접힘 |
| 8 | 지도 탭 숫자판 제거 | 완료 | 모바일/데스크톱 지도 탭의 큰 숫자 타일 0개, 중복 `지도` 버튼 숨김, 이슈/지역 선택이 지도 안에서 유지됨 |
| 8-1 | 지도 위치 맥락 S+ 보강 | 완료 | 모바일 지도 탭에서 선택 목록은 84px 가로 칩, 지도는 첫 화면에 노출, 지도 시트 라벨 display none, 하단 내비 겹침 없음, 지도·우측 상세 제목 일치 |
| 9 | 현장 영상 목업감 제거 | 완료 | full-screen 영상에 poster 이미지 3개, 액션 아이콘 9개, 금지 소셜 문구 0, `overflowX=false` |
| 10 | 운영자 언어 제거 | 완료 | 홈/영상/상세 첫 화면에서 `오늘의 집회·시위`, `현장 파일 보기`, `중요 변경 알림`, `현장 판단`, `GPS 인증` 노출 0 |
| 11 | 모바일 카드 정보량 압축 | 완료 | 390px 첫 카드 높이 170px, 첫 viewport 이슈 카드 2개, `overflowX=false` |
| 12 | 상업용 캡처 검증 | 진행 중 | 독립 비평 A-를 A+/S 후보로 끌어올릴 추가 캡처와 5/10/20초 이해도 검증 |
| 13 | 사용자 수락 | 대기 | 사용자가 상업용 앱 수준으로 인정 |
| 14 | 상위 IA 재검증 | Active | `영상/지도/제보`에 선택 이슈 문맥 라인은 생겼지만 독립 red-team은 B- 판정. 10초 위치·시간·규모 이해도와 사용자 수락 필요 |
| 15 | 모바일 릴스 내비 겹침 제거 | 완료 | 390px에서 릴스 오버레이/액션 bottom 759px, 하단 내비 top 772px, 겹침 없음 |
| 16 | 영상 표면 placeholder감 완화 | 1차 완료 | 390px 릴스에서 poster `naturalWidth=960`, 밝은 비식별 현장 프레임 표시, 하단 내비 겹침 없음 |
| 17 | 데스크톱 제보 빈 공간 완화 | 1차 완료 | 1440px 제보 화면에서 context panel visible, panel width 980px, start/action gap 12px, `overflowX=false` |
| 18 | 지도-first 재배치 | 1차 완료 | 지도 탭에서 map shell이 explore grid보다 먼저 렌더되고, 1440px top 211px/height 700px, 390px top 215px/height 460px로 첫 화면에 보임 |
| 19 | 10초 위치·시간·규모 보강 | 1차 완료 | 홈 이슈 카드에 `서울·대전 · 7월 7일 기준 · 공개 현장 3건 · 영상 근거 1건` 형식의 빠른 상황 줄이 보임 |
| 20 | 영상제보 라벨 명확화 | 완료 | 모바일 하단 탭과 데스크톱 레일의 `제보`를 1차로 `영상제보`로 바꿔 자유 제보/의견 제출 오해를 낮췄고, 30차에서 공개 열람 `인증영상`과 작성 `현장촬영`으로 다시 분리 |
| 21 | 지도 시트 과밀 완화 | 1차 완료 | 모바일 지도 시트 223px, 데스크톱 지도 시트 178px, summary visible rows 2, 지도와 시트가 같은 현장 문맥 유지 |
| 22 | 영상 액션 소셜 affordance 완화 | 1차 완료 | 모바일 영상 액션을 오른쪽 세로 반응 레일에서 하단 근거 도구막대로 변경, 하단 내비와 겹침 없음, 오버레이와 액션 분리 |
| 23 | 샘플 영상 비주얼의 AI 데모감 제거 | 1차 완료 | 샘플 poster는 화면에 실제 현장 이미지처럼 렌더하지 않음. 모바일 릴스 `posterImages=0`, `reviewSlots=3`, badge `검토 대기`, 금지 문구 0 |
| 24 | 데스크톱 지도 업무용 인스펙터 제거 | 1차 완료 | 데스크톱 지도 탭에서 `.detail-column display=none`, map width 1200px, viewport share 83%, `overflowX=false` |
| 25 | dev/static config 회귀 방어 | 완료 | `serve-web`이 `MUSUNIL_WEB_API_BASE_URL=http://localhost:*` override를 적용하고 `check:web-smoke`가 stale production API 회귀를 실패 처리 |
| 26 | 홈 검토 영상 표면 경량화 | 1차 완료 | 공개 poster가 없으면 홈 카드에 큰 영상 박스를 만들지 않고 46px 상태 행만 표시. 390px first card 241px, 1440px first card 281px, media preview 0, 금지 문구 0 |
| 27 | 홈 카드 5/10초 scanline 정리 | 1차 완료 | 390px/1440px 모두 scanline clipped false, `영상 근거 0건`/내부 문구 0, 모바일 first card 220px, 데스크톱 first card 260px |
| 28 | 데스크톱 홈 지도·지역 현황 중심 재구성 | 1차 완료 | 1440px 홈에서 중앙 `지역 현황` 지도 visible, map width 540px, detail width 380px, `overflowX=false`, 금지 문구 0 |
| 29 | 24차 독립 비평 재검증 | 1차 완료 | Visual/IA/QA 독립 피드백 수집. Visual C+~A- 후보, IA 5초 PASS-/10초 PARTIAL/20초 PARTIAL, QA 0-count·runtime 검증 공백 지적 |
| 30 | 이슈 카드 행동 허브와 0-count 차단 | 1차 구현 | 홈 카드 `근거/영상/지역/반론` 액션, 반론 경로 노출, 법안/탐색/상세/영상 0-count 문구 완화, `pnpm check:web-smoke` 통과. 캡처 재검증 필요 |
| 31 | 데스크톱 첫 화면 패널 경쟁 완화 | 1차 완료 | 1440px 기본 홈 `detailVisible=false`, `mapVisible=true`, map width 828px. `근거` 클릭 후 `desktop-detail-open`, `detailVisible=true`, selected tab `근거` |
| 32 | 지도 선택 시트 경량화 | 1차 완료 | 1440px 홈 지도 sheet 62px, `sheetMapRatio=0.13`, chips/context/summary hidden. 390px 지도 sheet 114px, `sheetMapRatio=0.25`, `navOverlap=false`, `rejected=[]` |
| 33 | 지도 도구·탐색 타일 밀도 완화 | 1차 완료 | 1440px 지도 toolbar 54px, `toolbarMapRatio=0.08`, sheet 62px, `sheetMapRatio=0.09`. 390px 지도 toolbar 52px, first tile 52px, `navOverlap=false`, `overflowX=false`, `rejected=[]` |
| 34 | 지도 상세 흐름·모바일 overflow 회귀 방지 | 1차 완료 | 390px CDP `scrollWidth=390`, 하단 탭 `홈/영상/지도/법안/영상제보`, 카드 액션 2열, 지도 상세 `detailTitle=mapTitle`, `selectedTab=근거`, `toastCount=0`; web smoke에 선택 현장 상세·검색 실패·공식 fallback 이슈 가드 추가 |
| 35 | 주행동 단일화·영상/촬영 분리 | 1차 완료 | 390px 홈 `primary=지도에서 확인`, secondary `근거/인증영상/반론`, 하단 탭 `홈/인증영상/지도/법안/현장촬영`, scanline `위치 2곳 · 현장 5건 · 공식 자료 6건 · 인원 미확인`, `overflowX=false`, `영상제보` 노출 0 |
| 36 | 지도 표면·fallback 상업용화 | 1차 완료 | 390px 지도 `mapRect=370x460`, `navOverlap=false`, `scrollWidth=390`; 1440px 지도 `mapRect=1200x700`, `sheet=62px`, 금지 문구 0. 실제 GPS evidence 기반 영역 시각 평가는 운영 데이터 연결 후 재검증 |
| 37 | GPS evidence 기반 지도 영역 분리 | 1차 완료 | 공식 자료 핀만 있는 현장은 `현장 인증 영역은 아직 없습니다`, 현장 인증 영상 Evidence가 있는 현장은 `현장 인증 자료로 공개 범위를 계산했습니다`와 근접 줌 영역으로 분리. 모바일 검색 `서울`은 `detailOpen=false`, `mapVisible=true`, `navOverlap=false`, `scrollWidth=390` |
| 38 | 인증영상 검토 상태 상업용화 | 1차 완료 | 390px 인증영상 `anchorTitle=정보통신망법 개정 반대 집회`, `reviewPanel=true`, `reviewSlots=0`, `posterImages=0`, `navOverlap=false`, `overflowX=false`, 액션 `근거/위치/이슈`. 1440px도 같은 검토 카드와 우측 맥락 패널 유지 |
| 39 | 실제 공개 영상 player 계약 | 1차 완료 | `renderFullScreenReels`가 display-safe 공개 clip+poster를 `<video class="reel-video">`로 렌더하고 sample poster는 검토 카드로 유지. `check:web-smoke`가 `controlslist`, `publicLiveVideoDisplaySrc`, poster-only 회귀 금지를 검증 |
| 40 | 공개 영상 media route 계약 | 1차 완료 | seed/API가 참조하는 preview webm 파일 존재, 정적 서버 `.webm/.mp4` MIME, `media-src` CSP, `/media/redacted/preview-occ-live-1.webm` 200 `video/webm`을 `check:web-smoke`가 검증 |
| 41 | 공개 영상 배포 감시 계약 | 1차 완료 | `post-deploy-smoke`, `runtime-smoke`, `service-watch`, `launch-check`가 poster와 clip을 함께 확인. 운영 API `/media/redacted/preview-occ-live-1.webm` 200 `video/webm`, `nosniff`, payload > 5KB가 깨지면 실패 |
| 42 | Render Static 배포 계약 분리 | 1차 완료 | Static Web build는 운영 secret 전체 검사가 아니라 `build:web-static + check:web-smoke`로 산출물 계약을 검증. `render.yaml` Web CSP에 `media-src 'self' https: blob:` 추가. live 404 build-info는 build command/Blueprint 미적용으로 기록 |
| 43 | build-info publish 누락 방지 | 1차 완료 | `.gitignore`에서 `apps/web/build-info.js/json` 제외를 제거하고 `launch-check`가 build-info ignore 회귀를 실패 처리. Render Static build 산출물이 public deploy version check에 포함될 수 있게 함 |
| 44 | build-info tracked placeholder | 1차 완료 | `apps/web/build-info.js/json` placeholder를 repo에 추적. build command가 실제 SHA로 덮어쓰며, tracked file이 아니면 `launch-check` 실패 |
| 45 | placeholder 배포 실패 처리 | 1차 완료 | live build-info 200이더라도 `generated-at-build` 또는 `source: placeholder`면 `check-web-deploy`와 `service-watch` 실패. Render build output 미반영을 정상 배포로 인정하지 않음 |
| 46 | static manifest content hash | 1차 완료 | `apps/web/static-manifest.json` tracked. `build:web-static`과 `check:web-smoke`가 manifest를 생성/검증하고, `check:web-deploy`가 live HTML/config/media 해시를 비교 |
| 47 | 상세 시트 짧은 라벨·모바일 시트 보정 | 1차 완료 | 390px 상세 `actionLabels=근거/영상/지도`, `tabLabels=개요/근거/영상/흐름/반론`, `tabs.height=50`, `navOverlap=false`, `scrollWidth=390`. 1440px도 같은 라벨과 `navOverlap=false` |
| 48 | 모바일 상세 텍스트 줄바꿈 안정화 | 1차 완료 | 독립 critique P0 반영. 390px 상세 title/summary/row horizontal overflow false, all fit panel true, `navOverlap=false`, `scrollWidth=390`. 숨김 클램프 대신 자연 줄바꿈 |
| 49 | 홈 카드 액션 위계 재정렬 | 재수정 완료 | surface44 비평 이후 `근거 보기` primary는 근거 탭 직행으로 좁아 10초 이해에는 좋지만 첫 방문 CTA로 강했다. surface45에서 `상세 보기` primary와 `지도/영상/반론` secondary로 바꿈 |
| 50 | 공통 이슈 요약 바와 반응형 상태 보존 | 1차 완료 | 영상·탐색·제보에 같은 상태/이슈명/위치·현장·근거 요약이 보이고, 모바일→데스크톱 전환 시 선택 레일이 유지됨 |
| 51 | 소비자형 확인 요약·상세 진입 안정화 | 1차 완료 | 390px 홈 첫 카드 `primaryAction=summary`, `primaryLabel=상세 보기`, 확인 요약 `대구 · 전국 · 7월 9일 공개자료 · 위치 2곳 · 공식자료 6건 · 현장 영상 확인 중 · 반론/정정 없음`, 상세 `selectedDetailTab=개요`, 모바일/데스크톱 탭 `홈/영상/탐색/법안/제보`, `scrollWidth=390/1440`, forbidden 0 |
| 52 | 구체 이슈 우선·요약 압축 | 1차 완료 | 390px/1440px 첫 카드가 `정보통신망법 개정 반대 집회`로 시작. 요약 `서울 · 일시 확인 중 · 기준 2026.07.11 · 위치 1곳 · 공식 확인 중 · 영상 1건 · 반론 1건`, 카드 action 1개 `상세 보기`, source/summary label visible false, 지도 CTA `근거·영상 보기`, forbidden 0 |

## Current Evidence

| 증거 | 결과 |
|---|---|
| 06:00 desktop home region map | `docs/commercial-splus-surface24-home-map-desktop-1440-2026-07-11.png` |
| 06:00 mobile home 390 | `docs/commercial-splus-surface24-home-map-mobile-390-2026-07-11.png` |
| 06:00 mobile home 430 | `docs/commercial-splus-surface24-home-map-mobile-430-2026-07-11.png` |
| 06:00 tablet home 768 | `docs/commercial-splus-surface24-home-map-tablet-768-2026-07-11.png` |
| 06:00 metrics | 1440px 홈 `layoutColumns=76px 360px 540px 380px`, `mapTitle=지역 현황`, `mapVisible=true`, `rejectedTerms=[]`, `overflowX=false`. 390/430/768px 홈은 `mapVisible=false`, `scanlineClipped=false`, `rejectedTerms=[]`, `overflowX=false` |
| 06:11 mobile home 390 action hub | `docs/commercial-splus-surface25-action-hub-mobile-390-2026-07-11.png` |
| 06:11 mobile home 430 action hub | `docs/commercial-splus-surface25-action-hub-mobile-430-2026-07-11.png` |
| 06:11 tablet home 768 action hub | `docs/commercial-splus-surface25-action-hub-tablet-768-2026-07-11.png` |
| 06:11 desktop home 1440 action hub | `docs/commercial-splus-surface25-action-hub-desktop-1440-2026-07-11.png` |
| 06:11 metrics | 390/430/768/1440px 모두 첫 카드 액션 `근거/영상/지역/반론`, `scanlineClipped=false`, `rejectedTerms=[]`, `overflowX=false`. 모바일 액션 플로우는 `근거→상세 근거`, `영상→영상 탭`, `지역→지도`, `반론→상세 반론·정정`으로 검증됨 |
| 06:23 desktop map-first home | `docs/commercial-splus-surface26-desktop-home-map-first-1440-2026-07-11.png` |
| 06:23 desktop evidence detail open | `docs/commercial-splus-surface26-desktop-evidence-open-1440-2026-07-11.png` |
| 06:23 mobile regression | `docs/commercial-splus-surface26-mobile-home-regression-390-2026-07-11.png` |
| 06:23 metrics | 기본 1440px 홈 `detailVisible=false`, `mapVisible=true`, map width 828px, `rejectedTerms=[]`, `overflowX=false`. `근거` 클릭 후 `layout=desktop-detail-open`, `detailVisible=true`, selected tab `근거`. 390px 모바일 홈은 4액션 유지, `overflowX=false`, 금지 문구 0 |
| 06:32 desktop compact map sheet | `docs/commercial-splus-surface27-map-sheet-desktop-home-v2-1440-2026-07-11.png` |
| 06:32 mobile compact map sheet | `docs/commercial-splus-surface27-map-sheet-mobile-explore-v2-390-2026-07-11.png` |
| 06:32 map sheet metrics | 1440px 홈 `detailVisible=false`, sheet 62px, `sheetMapRatio=0.13`, chips/context/summary hidden, `rejected=[]`, `overflowX=false`. 390px 지도 sheet 114px, `sheetMapRatio=0.25`, summary hidden, `navOverlap=false`, `rejected=[]`, `overflowX=false` |
| 09:37 desktop map tools | `docs/commercial-splus-surface28-map-tools-desktop-v2-1440-2026-07-11.png` |
| 09:37 mobile map tools | `docs/commercial-splus-surface28-map-tools-mobile-v2-390-2026-07-11.png` |
| 09:37 map tools metrics | 1440px 지도 toolbar 54px, `toolbarMapRatio=0.08`, sheet 62px, `sheetMapRatio=0.09`, tile 52px, repeated `보기` removed. 390px 지도 toolbar 52px, tile 52px, `navOverlap=false`, `overflowX=false`, `rejected=[]` |
| 10:04 mobile map detail | `docs/commercial-splus-surface29-map-detail-mobile-390-2026-07-11.png` |
| 10:04 desktop map detail | `docs/commercial-splus-surface29-map-detail-desktop-1440-2026-07-11.png` |
| 10:04 map detail metrics | 390px `scrollWidth=390`, 하단 5탭, 지도 상세 `detailTitle=mapTitle`, `selectedTab=근거`, `toastCount=0`. 1440px도 지도 시트와 우측 상세 제목 동기화 |
| 10:16 mobile home primary CTA | `docs/commercial-splus-surface30-home-mobile-390-2026-07-11.png` |
| 10:16 mobile verified video | `docs/commercial-splus-surface30-reels-mobile-390-2026-07-11.png` |
| 10:16 desktop home primary CTA | `docs/commercial-splus-surface30-home-desktop-1440-2026-07-11.png` |
| 10:16 primary CTA metrics | 390px `primary=지도에서 확인`, secondary `근거/인증영상/반론`, nav `홈/인증영상/지도/법안/현장촬영`, scanline `위치 2곳 · 현장 5건 · 공식 자료 6건 · 인원 미확인`, `overflowX=false`, `영상제보` 노출 0 |
| 10:32 mobile map surface | `docs/commercial-splus-surface31-map-fallback-mobile-390-2026-07-11.png` |
| 10:32 desktop map surface | `docs/commercial-splus-surface31-map-fallback-desktop-1440-2026-07-11.png` |
| 10:32 map surface metrics | 390px `mapRect=370x460`, `navOverlap=false`, `scrollWidth=390`, forbidden 0. 1440px `mapRect=1200x700`, sheet 62px, forbidden 0 |
| 10:49 official source pin | `docs/commercial-splus-surface32-map-official-pin-mobile-390-2026-07-11.png` |
| 10:49 GPS evidence area | `docs/commercial-splus-surface32-map-gps-area-mobile-390-2026-07-11.png` |
| 10:49 map truthfulness metrics | 공식 자료 핀: `detailOpen=false`, title `대구 7월 9일 집회 공개 일정`, summary `대구 · 공개 자료 위치만 확인됐습니다.`, proof `1건의 공개 근거가 있으며, 현장 인증 영역은 아직 없습니다.` 검색 `서울`: `detailOpen=false`, `mapVisible=true`, proof `1건의 현장 인증 자료로 공개 범위를 계산했습니다.`, 영역 근접 줌 표시, `navOverlap=false`, `scrollWidth=390` |
| 11:04 mobile reels review card | `docs/commercial-splus-surface33-reels-mobile-390-2026-07-11.png` |
| 11:04 desktop reels review card | `docs/commercial-splus-surface33-reels-desktop-1440-2026-07-11.png` |
| 11:04 reels metrics | 390px `panel=370x500`, `panel.bottom=715`, `navTop=772`, `navOverlap=false`, `reviewPanel=true`, `reviewSlots=0`, `posterImages=0`, actions `근거/위치/이슈`, 금지 문구 0. 1440px `panel=760x620`, `overflowX=false`, 금지 문구 0 |
| 11:10 public video contract | `pnpm check:web-smoke` 통과. 풀스크린 공개 영상 branch가 `<video class="reel-video">`와 `controlslist="nodownload noplaybackrate"`를 포함하고, 기존 poster-only `<img class="reel-poster-image" src="${escapeHtml(poster)}">` 회귀를 차단 |
| 11:16 public clip route | `pnpm check:web-smoke` 통과. `/media/redacted/preview-occ-live-1.webm` 200, `content-type: video/webm`, payload > 5KB, CSP `media-src 'self' ... https:` 포함 |
| 11:21 public clip deploy gate | 배포 후 smoke/runtime/service-watch까지 `/media/redacted/preview-occ-live-1.webm` 200 `video/webm`, `nosniff`, payload > 5KB를 검사하도록 승격 |
| 11:26 live deploy diagnosis | live `/` 200, live `/media/redacted/preview-occ-live-1.webm` 200 `video/webm`, live `/build-info.json` 404, live `/build-info.js` 404, live `/` cache-control `public, max-age=0, s-maxage=300`, live `/config.js` cache-control `public, max-age=14400, s-maxage=300` |
| 11:29 build-info ignore fix | `.gitignore` no longer ignores `apps/web/build-info.js/json`; `launch-check` fails if those generated public artifacts are ignored again |
| 11:34 tracked build-info placeholders | `apps/web/build-info.js/json` placeholder files added so Render Static has publishable paths before build overwrite |
| 11:38 live placeholder diagnosis | live `/build-info.json` 200 but body `commitSha=generated-at-build`, `source=placeholder`; live `/` still `Cache-Control: public, max-age=0, s-maxage=300` |
| 11:45 static manifest | `apps/web/static-manifest.json` added. Local manifest records SHA-256/bytes for index/config/public media; deploy check verifies live file hashes |
| 390px mobile capture | `docs/commercial-splus-mobile-390-2026-07-11.png` |
| 430px mobile capture | `docs/commercial-splus-mobile-430-2026-07-11.png` |
| 768px tablet capture | `docs/commercial-splus-tablet-768-2026-07-11.png` |
| 1440px desktop capture | `docs/commercial-splus-desktop-1440-2026-07-11.png` |
| Responsive metrics | 390/430/768/1440 모두 `overflowX=false`, 첫 화면 mini stat 0, 홈 반복 불확실성 박스 0 |
| Field preview 390px | `docs/commercial-splus-field-preview-mobile-390-2026-07-11.png` |
| Field preview 430px | `docs/commercial-splus-field-preview-mobile-430-2026-07-11.png` |
| Field preview 768px | `docs/commercial-splus-field-preview-tablet-768-2026-07-11.png` |
| Field preview 1440px | `docs/commercial-splus-field-preview-desktop-1440-2026-07-11.png` |
| Field preview metrics | 390/430/768/1440 모두 `overflowX=false`, `previewCount=1`, `previewPlayCount=1`, `miniStatCount=0`, 금지 소셜 문구 0 |
| Citizen summary 390px | `docs/commercial-splus-citizen-summary-mobile-390-2026-07-11.png` |
| Citizen summary 430px | `docs/commercial-splus-citizen-summary-mobile-430-2026-07-11.png` |
| Citizen summary 768px | `docs/commercial-splus-citizen-summary-tablet-768-2026-07-11.png` |
| Citizen summary 1440px | `docs/commercial-splus-citizen-summary-desktop-1440-2026-07-11.png` |
| Citizen summary metrics | 390/430/768/1440 모두 `overflowX=false`, `citizenSummaryCount=2`, `previewCount=1`, `miniStatCount=0`, `hasPublicLocation/hasVerificationState/hasCurrentState/hasEvidenceCta=true`, 금지 소셜 문구 0 |
| Desktop clean home | `docs/commercial-splus-desktop-home-clean-v2-1440-2026-07-11.png` |
| Desktop report focused | `docs/commercial-splus-desktop-report-focused-1440-2026-07-11.png` |
| Desktop tool visibility metrics | 1440px 홈에서 `mapVisible=false`, `reportVisible=false`, `recordVisible=true`, `overflowX=false`; 제보 탭에서 `desktop-report`, `reportVisible=true`, `recordVisible=false` |
| Home CTA | `관련 법안` 전면 CTA 제거, 홈 카드 CTA는 `확인 근거 보기` |
| Navigation | 내부 route는 `explore` 유지, 보이는 라벨은 `지도` |
| Desktop detail | 1440px에서 `영상/지도/근거` 빠른 버튼 노출, 개요 탭은 3개 overview card + 닫힌 detail disclosure 3개 |
| Quick action check | `영상` 버튼은 영상 탭으로 전환, `지도` 버튼은 데스크톱 지도 화면과 좌측 레일 `지도` 상태로 전환 |
| 02:44 mobile home | `docs/commercial-splus-mobile-home-redesign-v2-data-390-2026-07-11.png` |
| 02:44 mobile detail | `docs/commercial-splus-mobile-detail-redesign-data-390-2026-07-11.png` |
| 02:44 desktop home | `docs/commercial-splus-desktop-home-redesign-v2-data-1440-2026-07-11.png` |
| 02:44 live metrics | 390px 홈 `dashboardRows=0`, `fieldPreviewRect=336x189`, `topbarActionsVisible=false`, `overflowX=false`; 모바일 상세 탭 `개요/근거/영상/지도/다른 주장`; 1440px 홈 `mapVisible=false`, `reportVisible=false`, `overflowX=false` |
| Redacted poster contract | 공개 LIVE 영상은 clip과 poster가 모두 `/media/redacted/` 또는 `*.musunil.com` HTTPS 공개 경로로 검증되어야 하며, poster 누락 시 live-claims와 규모 추정에서 제외됨 |
| 02:59 mobile home with real poster | `docs/commercial-splus-mobile-home-real-poster-390-2026-07-11.png` |
| 02:59 desktop home with real poster | `docs/commercial-splus-desktop-home-real-poster-1440-2026-07-11.png` |
| 02:59 media route metrics | 모바일/데스크톱 모두 poster `http://localhost:58151/media/redacted/preview-occ-live-1-poster.png`가 200 `image/png`로 응답, payload 435747 bytes, preview ratio 1.77, `dashboardRows=0`, `overflowX=false` |
| API public media guard | `/media/redacted/*`만 API에서 안전하게 서빙하고 encoded traversal/private path는 403 또는 404로 차단. `runtime-smoke`, `post-deploy-smoke`, `service-watch`, `launch-check`에 회귀 검사를 추가 |
| 03:07 desktop context panel | `docs/commercial-splus-desktop-context-panel-1440-2026-07-11.png` |
| 03:07 mobile detail context panel | `docs/commercial-splus-mobile-detail-context-panel-390-2026-07-11.png` |
| 03:07 context metrics | 1440px 우측 상세 `actionIconCount=3`, `dashboardRows=0`, `forbidden=[]`, `overflowX=false`; 390px 상세 시트 `detailOpen=true`, `scopedStatRows=3`, `actionIconCount=3`, `forbidden=[]`, `overflowX=false` |
| 03:15 mobile report first action | `docs/commercial-splus-mobile-report-first-action-390-2026-07-11.png` |
| 03:15 desktop report first action | `docs/commercial-splus-desktop-report-first-action-1440-2026-07-11.png` |
| 03:15 report metrics | 모바일/데스크톱 모두 첫 CTA `내 위치로 현장 찾기`, GPS 전 후보 카드 0개, 대상 패널 0개, `nearbyState=waiting`, 금지 소셜 문구 0, `overflowX=false` |
| 04:27 mobile report single action | `docs/commercial-splus-report-single-action-v5-mobile-390-2026-07-11.png` |
| 04:27 desktop report single action | `docs/commercial-splus-report-single-action-v2-desktop-1440-2026-07-11.png` |
| 04:27 report metrics | 390px 제보 첫 화면 `sectionTitle=40px`, `steps=44px`, visible action 1개 `내 위치로 현장 찾기`, GPS 전 후보/대상/미리보기 hidden, status `위치를 확인하면 근처 현장이 표시됩니다.`, 금지 소셜 문구 0, `overflowX=false`; 1440px도 같은 단일 행동 구조 유지 |
| 04:32 mobile report consumer | `docs/commercial-splus-report-consumer-mobile-390-2026-07-11.png` |
| 04:32 mobile report consumer with data | `docs/commercial-splus-report-consumer-live-mobile-390-2026-07-11.png` |
| 04:32 desktop report consumer | `docs/commercial-splus-report-consumer-desktop-1440-2026-07-11.png` |
| 04:32 issue evidence direct | `docs/commercial-splus-issue-evidence-direct-mobile-390-2026-07-11.png` |
| 04:32 consumer metrics | 390px/1440px 제보 첫 화면 모두 visible action 1개 `근처 현장 찾기`, 단계표 hidden, 인증/위치 칩 hidden, 후보/대상 hidden, 금지 소셜·기술 문구 0, `overflowX=false`. 이슈 카드 `근거 보기` 클릭 후 `detailOpen=true`, selected tab `근거`, summary hidden, `overflowX=false` |
| 04:43 compact IA mobile reels | `docs/commercial-splus-ia-compact-v4-reels-mobile-390-2026-07-11.png` |
| 04:43 compact IA mobile map | `docs/commercial-splus-ia-compact-v2-map-mobile-390-2026-07-11.png` |
| 04:43 compact IA mobile report | `docs/commercial-splus-ia-compact-v2-report-mobile-390-2026-07-11.png` |
| 04:43 compact IA desktop reels | `docs/commercial-splus-ia-compact-reels-desktop-1440-2026-07-11.png` |
| 04:43 compact IA desktop map | `docs/commercial-splus-ia-compact-map-desktop-1440-2026-07-11.png` |
| 04:43 compact IA desktop report | `docs/commercial-splus-ia-compact-report-desktop-1440-2026-07-11.png` |
| 04:43 compact IA metrics | 390px/1440px 모두 context line `서울 · 시간 확인 중 · 위치 1곳 · 현장 2건 · 공식 확인 중 · 영상 근거 1건`, 금지 소셜/`공개된 주장`/`2건 진행·예정` 0, `overflowX=false`. 모바일 릴스 오버레이와 하단 내비 겹침 없음 |
| 05:02 bright redacted poster asset | `apps/web/media/redacted/preview-occ-live-1-poster.png` |
| 05:02 mobile reels bright surface | `docs/commercial-splus-visual-surface-reels-loaded-mobile-390-2026-07-11.png` |
| 05:02 desktop reels bright surface | `docs/commercial-splus-visual-surface-reels-desktop-1440-2026-07-11.png` |
| 05:02 desktop report context panel | `docs/commercial-splus-report-context-panel-v3-desktop-1440-2026-07-11.png` |
| 05:02 visual surface metrics | 모바일 릴스 poster `http://localhost:58171/media/redacted/preview-occ-live-1-poster.png`, `naturalWidth=960`, overlay/actions bottom 716px, 하단 내비 top 772px, 겹침 없음. 데스크톱 제보 context panel visible, start/action gap 12px, 금지 문구 0, `overflowX=false` |
| 05:14 independent critique | Visual Design: 홈 6/10, 영상 5/10, 지도 4/10, 제보 4.5/10. IA Red-Team: overall B-, 5초 A-, 10초 C+, 20초 B- |
| 05:14 mobile home quick line | `docs/current-commercial-audit-home-mobile-v6-390-2026-07-11.png` |
| 05:14 mobile map-first | `docs/current-commercial-audit-map-mobile-v5-390-2026-07-11.png` |
| 05:14 desktop map-first | `docs/current-commercial-audit-map-desktop-v6-1440-2026-07-11.png` |
| 05:14 desktop report label check | `docs/current-commercial-audit-report-desktop-v5-1440-2026-07-11.png` |
| 05:14 metrics | 모바일 홈 first card 188px, first viewport issue cards 2, `영상제보` 탭 표시, `overflowX=false`. 모바일 지도 top 215px/height 460px, 데스크톱 지도 top 211px/height 700px, 금지 문구 0 |
| 05:20 mobile reels evidence toolbar | `docs/commercial-splus-surface20-reels-mobile-390-2026-07-11.png` |
| 05:20 mobile map compact sheet | `docs/commercial-splus-surface20-map-mobile-390-2026-07-11.png` |
| 05:20 desktop map compact sheet | `docs/commercial-splus-surface20-map-desktop-1440-2026-07-11.png` |
| 05:20 desktop reels evidence toolbar | `docs/commercial-splus-surface20-reels-desktop-1440-2026-07-11.png` |
| 05:20 metrics | 모바일 릴스 action bar top 676px/bottom 716px, 하단 내비 top 772px, `reelActionsOverlapNav=false`, overlay/action 겹침 없음. 모바일 지도 sheet height 223px, 데스크톱 지도 sheet height 178px, summary visible rows 2, 금지 문구 0, `overflowX=false` |
| 05:29 independent critique | Visual Design: B-. P0는 추상 영상 비주얼 제거, 내부 상태 문구 제거, 카드/칩/테두리 밀도 40% 축소 |
| 05:29 mobile reels review slot | `docs/commercial-splus-surface21-reels-mobile-390-2026-07-11.png` |
| 05:29 desktop map wide | `docs/commercial-splus-surface21-map-desktop-1440-2026-07-11.png` |
| 05:29 metrics | 모바일 릴스 `posterImages=0`, `reviewSlots=3`, `videoPosters=[]`, `playBadges=["검토 대기"]`, 금지 문구 0, `overflowX=false`. 데스크톱 지도 `.detail-column display=none`, map width 1200px, width share 83%, 금지 문구 0, `overflowX=false` |
| 05:41 mobile home compact review | `docs/commercial-splus-surface22-home-mobile-390-2026-07-11.png` |
| 05:41 desktop home compact review | `docs/commercial-splus-surface22-home-desktop-1440-2026-07-11.png` |
| 05:41 metrics | 로컬 `config.js` runtime override `apiBaseUrl=http://localhost:58241` 확인. 모바일 홈 이슈 2개, first card 241px, review row 46px, media preview 0, compact review rows 2, 금지 문구 0, `overflowX=false`. 데스크톱 홈 first card 281px, review row 46px, media preview 0, 금지 문구 0, `overflowX=false` |
| 05:49 mobile home scanline | `docs/commercial-splus-surface23-home-mobile-390-2026-07-11.png` |
| 05:49 desktop home scanline | `docs/commercial-splus-surface23-home-desktop-1440-2026-07-11.png` |
| 05:49 metrics | scanline: `7월 7일 기준 · 서울·대전 3건 확인 · 영상 1건 검토 · 1건 더 확인`, `7월 7일 기준 · 부산 1건 확인 · 영상 검토 중 · 공식 자료 확인 중`. 390px/1440px 모두 `scanlineClipped=false`, media preview 0, 금지 문구 0, `overflowX=false` |
| 03:25 mobile detail flow tab | `docs/commercial-splus-detail-flow-tab-mobile-390-2026-07-11.png` |
| 03:25 mobile map list | `docs/commercial-splus-map-list-mobile-v3-390-2026-07-11.png` |
| 03:25 desktop map list | `docs/commercial-splus-map-list-desktop-v2-1440-2026-07-11.png` |
| 03:25 map/detail metrics | 상세 탭은 `개요/근거/영상/흐름/다른 주장`, 지도 탭 `bigTileNumbers=0`, 중복 지도 버튼 hidden, 금지 소셜 문구 0, `overflowX=false` |
| 03:34 mobile reels poster | `docs/commercial-splus-reels-poster-fixed-mobile-390-2026-07-11.png` |
| 03:34 desktop reels poster | `docs/commercial-splus-reels-poster-fixed-desktop-1440-2026-07-11.png` |
| 03:34 reels metrics | 모바일/데스크톱 모두 `posterImages=3`, `reelActionIcons=15`, `playBadges=비식별 공개본`, 금지 소셜 문구 0, `overflowX=false` |
| 03:47 mobile home language | `docs/commercial-splus-home-language-v2-mobile-390-2026-07-11.png` |
| 03:47 mobile reels actions | `docs/commercial-splus-reels-actions-v2-mobile-390-2026-07-11.png` |
| 03:47 desktop home language | `docs/commercial-splus-home-language-v2-desktop-1440-2026-07-11.png` |
| 03:47 language/action metrics | 모바일/데스크톱 모두 `visibleWordsRejected=[]`, 금지 소셜 문구 0, `overflowX=false`. 홈 중앙 play affordance 0, 릴스 액션은 `근거/위치 범위/관련 이슈` 3개씩 총 9개 |
| 03:53 mobile compact home 390 | `docs/commercial-splus-home-compact-mobile-390-2026-07-11.png` |
| 03:53 mobile compact home 430 | `docs/commercial-splus-home-compact-mobile-430-2026-07-11.png` |
| 03:53 desktop compact check | `docs/commercial-splus-home-compact-desktop-1440-2026-07-11.png` |
| 03:53 compact metrics | 390px 첫 카드 `397px -> 170px`, 첫 viewport visible issue cards 2개, preview `112x96`, 430px first card 170px, desktop preview 343x194 유지, 금지 소셜 문구 0, `overflowX=false` |
| 03:59 desktop detail plain | `docs/commercial-splus-detail-plain-desktop-1440-2026-07-11.png` |
| 03:59 mobile detail plain | `docs/commercial-splus-detail-plain-mobile-390-2026-07-11.png` |
| 03:59 detail metrics | 데스크톱/모바일 상세 모두 `rowCount=3`, `labelDisplay=none`, 빠른 버튼 `근거/영상/지도`, `visibleWordsRejected=[]`, 금지 소셜 문구 0, `overflowX=false` |
| 04:14 mobile map context | `docs/commercial-splus-map-context-mobile-390-2026-07-11.png` |
| 04:14 desktop map context | `docs/commercial-splus-map-context-v3-desktop-1440-2026-07-11.png` |
| 04:14 map metrics | 모바일 지도 `exploreGrid=84px`, `mapShell.top=217`, `overlapNavSheet=false`, `labelDisplays=none`. 데스크톱 지도와 우측 상세 제목이 모두 `대구 7월 9일 집회 공개 일정`, `visibleRejected=[]`, `overflowX=false` |
| 11:58 mobile home feed card | `docs/commercial-splus-surface37-home-mobile-390-2026-07-11.png` |
| 11:58 desktop home feed card | `docs/commercial-splus-surface37-home-desktop-1440-2026-07-11.png` |
| 11:58 home card metrics | 모바일 390px 첫 화면 이슈 카드 2개 이상, 첫 카드 211px, 카드 액션 `지도/근거/영상/반론`, 위치 미리보기 `112x113`, `scrollWidth=390`, 내부 `시민 5초 요약` 노출 0. 데스크톱 1440px 첫 카드 3개, 각 카드 222px, `detailVisible=false`, `mapVisible=true`, `overflowX=false`. 다만 실제 운영 영상/GPS와 사용자 수락 전 S+는 아니다. |
| 12:10 mobile report single flow | `docs/commercial-splus-surface38-report-mobile-390-2026-07-11.png` |
| 12:10 desktop report single flow | `docs/commercial-splus-surface38-report-desktop-1440-2026-07-11.png` |
| 12:10 report metrics | 모바일 390px `현장촬영` 첫 화면은 `empty-state=false`, 단계표 hidden, CTA `근처 현장 찾기`, 보호 pill `정밀 위치 비공개/제출 전 현장 확인`, `navOverlap=false`, `scrollWidth=390`. 데스크톱 1440px locate 단계는 오른쪽 맥락 패널 hidden, 중앙 단일 흐름 680px, CTA와 headline gap 12px. 실제 본인확인/위치권한/운영 GPS 리허설 전 S+는 아니다. |
| 12:22 mobile reels pending full | `docs/commercial-splus-surface39-reels-mobile-390-2026-07-11.png` |
| 12:22 desktop reels pending full | `docs/commercial-splus-surface39-reels-desktop-1440-2026-07-11.png` |
| 12:22 reels metrics | poster 없는 LIVE Claim은 legacy `reels-review-panel` 대신 `reel-card reel-full reel-pending`으로 표시된다. 모바일 390px 카드 526px, review slot visible, 액션 `근거/위치/이슈`, `navOverlap=false`, `scrollWidth=390`. 데스크톱 1440px 카드 700px, 액션 bottom 892px로 첫 viewport 안에 표시. 실제 공개 영상 품질과 사용자 수락 전 S+는 아니다. |
| 12:24 mobile detail short labels | `docs/commercial-splus-surface40-detail-mobile-390-2026-07-11.png` |
| 12:24 desktop detail short labels | `docs/commercial-splus-surface40-detail-desktop-1440-2026-07-11.png` |
| 12:24 detail metrics | 모바일 390px 상세 `actionLabels=근거/영상/지도`, 탭 `개요/근거/영상/흐름/반론`, `tabs.height=50`, `navOverlap=false`, `scrollWidth=390`. 데스크톱 1440px도 같은 짧은 라벨, `navOverlap=false`, `scrollWidth=1440`. 사용자 수락 전 S+는 아니다. |
| 12:34 mobile detail readability | `docs/commercial-splus-surface41-detail-readability-mobile-390-2026-07-11.png` |
| 12:34 desktop detail readability | `docs/commercial-splus-surface41-detail-readability-desktop-1440-2026-07-11.png` |
| 12:34 detail readability metrics | 독립 Visual Critique P0 반영. 모바일 390px `titleHorizontalOverflow=false`, `summaryHorizontalOverflow=false`, `rowHorizontalOverflow=false/false/false`, `titleFitsPanel=true`, `summaryFitsPanel=true`, `rowsFitPanel=true`, `navOverlap=false`, `scrollWidth=390`. 데스크톱도 같은 overflow false와 panel fit true. 사용자 수락 전 S+는 아니다. |
| 12:40 mobile home action hierarchy | `docs/commercial-splus-surface42-home-action-hierarchy-mobile-390-2026-07-11.png` |
| 12:40 desktop home action hierarchy | `docs/commercial-splus-surface42-home-action-hierarchy-desktop-1440-2026-07-11.png` |
| 12:40 home action metrics | 모바일 390px 첫 카드 `primaryAction=evidence`, `primaryLabel=근거 보기`, secondary `지도/영상/반론`, `firstCard.height=257`, visible cards 3, `navOverlap=false`, `scrollWidth=390`, forbidden 0. 데스크톱 1440px도 primary evidence, secondary map/video/dispute, `scrollWidth=1440`. 사용자 수락 전 S+는 아니다. |
| 12:48 mobile reels issue summary | `docs/commercial-splus-surface43-issue-summary-reels-mobile-390-2026-07-11.png` |
| 12:48 mobile map issue summary | `docs/commercial-splus-surface43-issue-summary-map-mobile-390-2026-07-11.png` |
| 12:48 mobile report issue summary | `docs/commercial-splus-surface43-issue-summary-report-mobile-390-2026-07-11.png` |
| 12:48 desktop map issue summary | `docs/commercial-splus-surface43-issue-summary-map-desktop-1440-2026-07-11.png` |
| 12:48 issue summary metrics | 모바일 390px 인증영상/지도/현장촬영 모두 status `반론 함께 표시`, title `정보통신망법 개정 반대 집회`, line `서울 · 일정 확인 중 · 위치 1곳 · 현장 2건 · 공식 확인 중 · 현장 영상 1건`, `navOverlap=false`, `scrollWidth=390`, forbidden 0. 데스크톱 1440px 지도 확장 후 `activeRail=explore`, `activeRailText=지도`, map 1198x698, `scrollWidth=1440`. 사용자 수락 전 S+는 아니다. |
| 13:11 mobile home confirm summary | `docs/commercial-splus-surface45-confirm-summary-home-mobile-390-2026-07-11.png` |
| 13:11 mobile detail confirm summary | `docs/commercial-splus-surface45-confirm-summary-detail-mobile-390-2026-07-11.png` |
| 13:11 mobile map confirm summary | `docs/commercial-splus-surface45-confirm-summary-map-mobile-390-2026-07-11.png` |
| 13:11 desktop home confirm summary | `docs/commercial-splus-surface45-confirm-summary-home-desktop-1440-2026-07-11.png` |
| 13:11 confirm summary metrics | 모바일 390px 홈 하단 탭 `홈/영상/탐색/법안/제보`, 첫 카드 `primaryAction=summary`, `primaryLabel=상세 보기`, 확인 요약 표시, `scrollWidth=390`, forbidden 0. 상세는 `selectedDetailTab=개요`, 확인 요약 유지, `scrollWidth=390`. 지도는 current tab `탐색`, `visibleMap=true`, 지도 요약 `서울 · 자료 위치와 현장 인증 범위를 함께 표시합니다.`. 데스크톱 1440px 레일 `홈/영상/탐색/법안/제보`, primary summary, `scrollWidth=1440`. 사용자 수락 전 S+는 아니다. |
| 13:24 mobile home simplified issue | `docs/commercial-splus-surface46-simplified-card-home-mobile-390-2026-07-11.png` |
| 13:24 mobile detail simplified issue | `docs/commercial-splus-surface46-simplified-card-detail-mobile-390-2026-07-11.png` |
| 13:24 mobile map simplified issue | `docs/commercial-splus-surface46-simplified-card-map-mobile-390-2026-07-11.png` |
| 13:24 desktop home simplified issue | `docs/commercial-splus-surface46-simplified-card-home-desktop-1440-2026-07-11.png` |
| 13:24 simplified issue metrics | 390px 홈 첫 카드 `정보통신망법 개정 반대 집회`, status `반론 있음`, summary `서울 · 일시 확인 중 · 기준 2026.07.11 · 위치 1곳 · 공식 확인 중 · 영상 1건 · 반론 1건`, action labels `상세 보기`, `scrollWidth=390`, forbidden 0. 상세도 같은 title/summary와 `selectedDetailTab=개요`. 지도 current tab `탐색`, context line 동일, CTA `근거·영상 보기`. 데스크톱 1440px 첫 카드도 같은 이슈와 요약, `scrollWidth=1440`. 사용자 수락 전 S+는 아니다. |
| 13:24 live deploy check | `MUSUNIL_WEB_BASE_URL=https://musunil.com MUSUNIL_EXPECTED_COMMIT_SHA=$(git rev-parse HEAD) pnpm check:web-deploy` 실패. 원인: live `/build-info.json` body `commitSha=generated-at-build`, `source=placeholder`; live headers `/` public max-age 0, `/config.js` public max-age 14400, `/build-info.json` public max-age 0. |
| 13:31 deploy contract diagnosis | `e8b098c` push 및 GitHub Actions success 후 live `/static-manifest.json`은 최신 manifest와 일치. 실패 원인은 `/build-info.json` placeholder 유지. `check:web-deploy`가 body와 Render 수동 설정 힌트를 함께 출력하도록 강화. |
| 13:40 mobile home surface47 | `docs/commercial-splus-surface47-home-mobile-390-2026-07-11.png` |
| 13:40 desktop home surface47 | `docs/commercial-splus-surface47-home-desktop-1440-2026-07-11.png` |
| 13:40 surface47 metrics | 390px/1440px subtitle `공개 위치·근거 확인`, home title `확인된 집회·시위`, api state `위치와 근거 기준`, first issue `정보통신망법 개정 반대 집회`, first action `상세 보기`, forbidden 0, `scrollWidth=390/1440`. 사용자 수락 전 S+는 아니다. |
| 13:50 mobile home surface48 | `docs/commercial-splus-surface48-light-card-footer-mobile-390-2026-07-11.png` |
| 13:50 desktop home surface48 | `docs/commercial-splus-surface48-light-card-footer-desktop-1440-2026-07-11.png` |
| 13:50 surface48 metrics | 390px/1440px first action `근거·영상·지도 자세히`, action background transparent, action height 30/32px, first issue `정보통신망법 개정 반대 집회`, forbidden 0, `scrollWidth=390/1440`. 사용자 수락 전 S+는 아니다. |
| 13:56 mobile home surface49 | `docs/commercial-splus-surface49-card-summary-split-mobile-390-2026-07-11.png` |
| 13:56 desktop home surface49 | `docs/commercial-splus-surface49-card-summary-split-desktop-1440-2026-07-11.png` |
| 13:56 surface49 metrics | 390px/1440px place line `서울 · 일시 확인 중 · 위치 1곳`, evidence line `공식 확인 중 · 영상 1건 · 반론 1건`, footer `근거·영상·지도 자세히`, action background transparent, forbidden 0, `scrollWidth=390/1440`. 사용자 수락 전 S+는 아니다. |

## Non-Negotiable Gates

- 자유 댓글, 좋아요, 추천/비추천, 찬반, 팔로우를 만들지 않는다.
- 후원, 조회수, 신고 수, 영상 수를 노출 우선순위처럼 보이게 하지 않는다.
- 출처 provenance, evidence strength, risk level을 단일 신뢰도 점수로 합치지 않는다.
- 지도와 카드가 참여 독려, 길 안내, 충돌 회피, 정밀 좌표 안내처럼 보이면 실패다.
- 사용자 원문, 정밀 위치, 원본 미디어 key는 공개 UI/API에 나오면 실패다.
- poster 없는 clip, private 경로, 외부 임의 host, 확장자 불일치 미디어가 공개 영상으로 렌더링되면 실패다.
- `S+` 승급은 캡처와 사용자 수락 없이는 금지한다.

## Verification Targets

- 5초: 사용자가 “오늘 어떤 집회·시위 정보인지” 말할 수 있다.
- 10초: 사용자가 “어디서, 언제, 어느 정도 확인됐는지” 말할 수 있다.
- 20초: 사용자가 “근거, 현장 영상, 다른 주장, 지도 맥락을 어디서 보는지” 찾을 수 있다.
