# Data Fixtures And Real Sources

## 현재 포함한 실제 공개 자료 기반 시드

- 전국 과거 통계: 경찰청 공공데이터포털 `경찰청_집회신고 및 개최 현황`, 2011~2023 집회·시위 신고 및 실제 개최 현황.
- 서울 오늘/최근 집회·통제정보: 서울경찰청 교통정보센터 `집회·통제정보` 공식 JSON 목록의 게시물 단위 공개 자료.
- 세종 오늘/예정/최근 일정: 세종경찰청 `오늘의 집회/시위` 게시판의 게시물 단위 공개 일정.
- 대구 과거 통계: 대구광역시경찰청 공공데이터포털 `집회시위 개최 및 신고 현황`, 2020~2025 경찰서별 신고 건수, 개최 건수, 참석인원 현황.
- 대구 오늘/예정/최근 일정: 대구경찰청 `오늘의 집회시위` 게시판의 `0709(목)`, `0707(화)`, `0706(월)`, `0704(토)~0705(일)` 공개 일정 게시물.
- 강원 오늘/예정/최근 일정: 강원경찰청 `오늘의 주요집회` 게시판의 게시물 단위 공개 일정.
- 부산 오늘/최근 일정: 부산경찰청 `오늘의 집회/시위` 게시판의 게시물 단위 공개 일정.
- 경기남부 오늘/예정/최근 일정: 경기남부경찰청 `오늘의 주요집회` 게시판의 게시물 단위 공개 일정.
- 경기북부 오늘/예정/최근 일정: 경기북부경찰청 `오늘의 주요집회` 게시판의 게시물 단위 공개 일정.
- 광주 오늘/예정/최근 일정: 광주경찰청 `오늘의집회시위` 게시판의 주간 공개 일정 게시물.
- 대전 오늘/최근 일정: 대전경찰청 `오늘의주요집회` 공식 게시판의 통합검색 공개 목록.
- 인천 오늘/예정/최근 일정: 인천경찰청 `오늘의 집회/시위` 게시판의 게시물 단위 공개 일정.
- 경북 오늘/예정/최근 일정: 경북경찰청 `오늘의 집회시위` 게시판의 게시물 단위 공개 일정.
- 경남 오늘/최근 일정: 경남경찰청 `오늘의 주요집회` 게시판의 게시물 단위 공개 일정.
- 제주 오늘/예정/최근 일정: 제주경찰청 `오늘의집회` 게시판의 게시물 단위 공개 일정.
- 충북 오늘/예정/최근 일정: 충북경찰청 `오늘의 집회 시위` 게시판의 게시물 단위 공개 일정.
- 충남 오늘/최근 일정: 충남경찰청 `오늘의 주요집회` 게시판의 게시물 단위 공개 일정.
- 전북 오늘/최근 일정: 전북경찰청 `집회시위안내` 게시판의 게시물 단위 공개 일정.
- 전남 오늘/최근 일정: 전남경찰청 `오늘의집회/시위` 게시판의 게시물 단위 공개 일정.
- 울산 오늘/최근 일정: 울산경찰청 `오늘의 집회` 모바일 게시판의 `집회표` 게시물 단위 공개 일정.

이 항목들은 모두 Event가 아니라 `government_or_police` Claim과 `official_doc` Evidence로만 저장한다. 공식 공개 자료라도 자동 진실 객체가 아니며, 시간·장소·인원 상세는 첨부 PDF 파싱과 별도 검증 전까지 원문 링크 기반 Claim으로 취급한다.

## 운영 비활성 프리뷰 데이터

- 서울: 집회성 모임, 장기 현장, 공개 자료 위치와 현장 인증 범위
- 부산: 행진성 집회 현장, 공개 자료 위치와 현장 인증 범위
- 대전: 장기 현장
- 법 탭: 정보통신망법 개정안, 국회법 탄핵 절차, 공직선거법 관련 프리뷰 법령/의안 메타데이터

이 데이터는 UI/UX 검증용이다. 운영에서는 `preview.use_mock_data: false`와 production runtime gate로 비활성화되어야 하며, 실제 서비스 응답에 섞이면 안 된다. 모든 항목은 Event가 아니라 Claim/Evidence로 붙는다. 공개 지도에는 자료 위치 핀과 현장 인증 영역만 표시한다. 사용자 원문은 공개 응답에 노출하지 않는다.

production seed에서는 법 탭 프리뷰 항목도 제거된다. 실제 법령·의안 ingest 전에는 `/laws`가 빈 목록을 반환해야 하며, preview 법령을 운영 화면에 보여주지 않는다.

## 공식 자료 메모

- 경찰청 전국 통계: https://www.data.go.kr/data/15045212/fileData.do
- 대구 집회시위 신고/개최 현황: https://www.data.go.kr/data/15066382/fileData.do
- 대구 집회 시위 일정 현황: https://www.data.go.kr/data/3074269/fileData.do
- 서울경찰청 교통정보센터 집회·통제정보: https://www.spatic.go.kr/spatic/main/assem.do
- 세종경찰청 오늘의 집회/시위: https://www.sjpolice.go.kr/site/main.php?bo=sjpol2&mxPn=02_02
- 대구경찰청 오늘의 집회시위 게시판: https://www.dgpolice.go.kr/dgpo/bbs/List.do?bbsId=d495f174&menuNo=104050000
- 대전경찰청 오늘의주요집회: https://www.djpolice.go.kr/main.htm?mxRc=x7_9&bo=notify3&keyword=%EC%A7%91%ED%9A%8C
- 부산 집회시위 신고/개최 통계: https://www.data.go.kr/data/15127924/fileData.do
- 부산경찰청 오늘의 집회/시위: https://www.bspolice.go.kr/view.do?no=72
- 인천경찰청 오늘의 집회/시위: https://www.icpolice.go.kr/board/rg4_board/list.php?bbs_code=ic015
- 경기남부경찰청 오늘의 주요집회: https://www.ggpolice.go.kr/main/bbslist.do?bbsId=FD2
- 경기북부경찰청 오늘의 주요집회: https://www.ggbpolice.go.kr/main/cop/bbs/selectBoardList.do?bbsId=Assembly_main
- 광주경찰청 오늘의집회시위: https://www.gjpolice.go.kr/cop/bbs/selectBoardList.do?bbsId=BBSMSTR_000000000031&r=gjpolice
- 경북경찰청 오늘의 집회시위: https://www.gbpolice.go.kr/bbs/List.do?bbsId=8&sid=gbpolice
- 경남경찰청 오늘의 주요집회: https://www.gnpolice.go.kr/gnpolice/page.do?MENU_ID=NF05
- 제주경찰청 오늘의집회: https://www.jjpolice.go.kr/jjpolice/notice/assembly.htm
- 충북경찰청 오늘의 집회 시위: https://www.cbpolice.go.kr/main_sub/sub.php?folder_idx=2&folder_page_idx=18
- 충남경찰청 오늘의 주요집회: https://www.cnpolice.go.kr/2014/main.php?mxPn=3_1_1
- 전북경찰청 집회시위안내: https://www.jbpolice.go.kr/index.police?menuCd=DOM_000000202008000000
- 전남경찰청 오늘의집회/시위: https://www.jnpolice.go.kr/?pid=AP0306
- 울산경찰청 오늘의 집회: https://www.uspolice.go.kr/m/board.jsp?tab=bo20141217142954
- 대전 분야별 집회시위 개최 통계: https://www.data.go.kr/data/15142268/fileData.do
- 경기북부 집회시위 개최 통계: https://www.data.go.kr/data/15114224/fileData.do
- 강원 오늘의 주요집회: https://www.gwpolice.go.kr/gw/sub02/sub02_05.jsp

## 전국 확인 가능 지역 원칙

지역 차별을 막기 위해 모든 시도경찰청 권역은 `workers/public-source-ingest/src/sources.ts`의 `policeRegions`에 등록한다.

상태 구분:

- `schedule_active`: 일정 게시판 parser가 실제 ingest에 연결된 권역.
- `schedule_candidate`: 공식 일정 게시판 후보가 있으나 목록/첨부 구조 검증이 남은 권역.
- `statistics_only`: 신고/개최 통계만 있고 오늘/예정 일정 자료는 아직 없는 권역.
- `needs_discovery`: 공식 일정/통계 자료 확인이 필요한 권역.

중요: 공개 자료 부재는 집회 부재가 아니다. `needs_discovery`, `statistics_only`, `schedule_candidate` 권역에서는 "확인된 공개 자료 없음"으로만 표시하고 "집회 없음"으로 표시하지 않는다.

커버리지 확인:

```bash
pnpm sources:coverage
```

운영 구조 진단:

```bash
pnpm sources:diagnose -- --require-operational-readiness
```

API 확인:

```bash
curl http://localhost:4000/public-sources/coverage
```

coverage report는 각 권역마다 아래 필드를 가진다.

- `status`: `schedule_active`, `schedule_candidate`, `statistics_only`, `needs_discovery`
- `coverageLevel`: `daily_schedule`, `candidate_schedule`, `historical_statistics`, `source_discovery`
- `refreshCadenceHours`
- `lastCheckedAt`
- `nextRefreshAt`
- `freshness`
- `gapReason`
- `sourceIds`, `publicScheduleUrl`, `statisticsSourceIds`, `statisticsUrls`

diagnose report는 외부 사이트 fetch 없이 원천 registry만 검사한다. active schedule 원천은 모두 `readiness=ingestable`이어야 하며, `blockedSourceIds`, `parserMissingSourceIds`, `urlMissingSourceIds`, `postBodyMissingSourceIds`가 비어 있어야 한다. POST JSON/HTML 원천은 `bodyStatus=present`, EUC-KR 원천은 `encoding=euc-kr`로 명시되어야 한다.

웹 상단 상태에는 `일정 <active>/<total> · 후보 <candidate>`가 표시된다. 현재는 18개 시도경찰청 권역 모두 일정 parser가 활성 상태라 `18/18`이 정상이다. 접힌 coverage 패널을 열면 권역별 공개 일정 원천, 다음 점검 시각, 갱신 상태를 확인할 수 있다.

출시 전 전국 균등성 목표:

1. 18개 시도경찰청 권역이 모두 coverage report에 포함된다.
2. `schedule_active`가 아닌 권역은 UI/운영 리포트에서 "자료 확인 중", "후보 확인", "통계 확인"처럼 공개 자료 상태로 표시한다.
3. 신규 parser는 활성화 전에 dry-run, 0건 파싱 실패, 중복 ingest 방지 self-check를 통과한다.
4. 신규 parser는 활성화 전에 `pnpm sources:diagnose -- --require-operational-readiness`에서 URL, parser, POST body, refresh cadence 누락이 없어야 한다.
5. 첨부 PDF 구조화 전에는 게시물 단위 Claim만 만들고 세부 장소/행진로를 확정값처럼 노출하지 않는다.

## 실제 데이터 연결 순서

1. 현재 서울경찰청 교통정보센터·세종경찰청·대구경찰청·대전경찰청·강원경찰청·부산경찰청·경기남부경찰청·경기북부경찰청·광주경찰청·인천경찰청·경북경찰청·경남경찰청·제주경찰청·충북경찰청·충남경찰청·전북경찰청·전남경찰청·울산경찰청 게시판 worker는 별도 API 키 없이 공개 HTML, 공식 게시판 JSON, 또는 공식 통합검색 결과를 읽는다.
2. 외부 worker가 공개 집회/교통 자료를 읽는다.
3. worker는 일정 단위 결과를 `/internal/ingest/public-occurrence`로 보낸다.
4. API는 공개 자료 결과를 `government_or_police`, `organizer_or_group`, `media_report`, `material_report` 등 Claim으로 저장한다.

대구경찰청 게시판 worker dry-run:

```bash
pnpm --filter @musunil/public-source-ingest dev
```

공개 자료 fetch 실패, timeout, 0건 파싱은 성공으로 처리하지 않고 non-zero로 종료한다.

2026-07-10 02:32 KST dry-run 확인:

- `pnpm --filter @musunil/public-source-ingest dev`
- 활성 일정 parser: 서울, 부산, 대구, 인천, 광주, 대전, 울산, 세종, 경기남부, 경기북부, 강원, 충북, 충남, 전북, 전남, 경북, 경남, 제주
- 결과: `fullScheduleCoverage=true`, `activeScheduleRegions=18`, `candidateScheduleRegions=0`, `statisticsOnlyRegions=0`, `needsDiscoveryRegions=0`, `count=180`
- metadata-only 운영 진단: `readyForScheduledIngest=true`, `activeScheduleSourceCount=18`, `ingestableSourceCount=18`, `blockedSourceIds=[]`, `parserMissingSourceIds=[]`, `urlMissingSourceIds=[]`, `postBodyMissingSourceIds=[]`
- 서울은 공식 페이지가 JS로 `/spatic/assem/getList.json` POST JSON을 읽는 구조라 worker도 같은 공식 JSON 목록을 사용한다.
- 세종은 공식 HTML 목록이 제목·작성일·조회수를 제공하고, 기간형 제목은 `startsAt`과 `endsAt`으로 나누어 저장한다.
- 경기북부는 공식 HTML 목록이 제목·작성일·첨부 여부를 제공하고, 기간형 제목은 `startsAt`과 `endsAt`으로 나누어 저장한다.
- 울산은 공식 모바일 목록이 게시일을 별도 열로 제공하지 않아 제목 날짜를 일정일로 사용하고, payload `rawText`에 `dateSource=title`을 남긴다.
- 대전은 공식 통합검색의 `오늘의주요집회` 섹션이 게시판 목록을 안정적으로 제공해 worker가 해당 공식 검색 결과를 사용하고, payload `rawText`에 `sourceList=official-search`를 남긴다.

API 반영:

```bash
MUSUNIL_INTERNAL_API_KEY=<internal_api_key> \
MUSUNIL_API_BASE_URL=https://api.example.com \
pnpm --filter @musunil/public-source-ingest dev -- --post
```

법령·의안 연결 dry-run:

```bash
pnpm sources:laws
```

법령·의안 원천 metadata 진단:

```bash
pnpm sources:laws-diagnose -- --require-law-metadata
```

운영 전 통합 외부 smoke:

```bash
pnpm launch:external-smoke
```

이 명령은 storage, redaction, 모바일 무결성, 법 원천 dry-run을 함께 확인한다. 법 원천 credential이 있는데 0건을 파싱하면 dry-run도 `law_source_parse_empty`로 실패한다. 성공은 1건 이상이 반환될 때만 S+ 증거로 인정한다.

현재 검증 범위:

- worker self-check가 국회 의안 API와 국가법령 API의 JSON 응답을 mock으로 파싱한다.
- API self-check가 `/internal/ingest/laws` 반영과 IssueLawLink 자동 연결을 검증한다.
- runtime smoke가 `/laws` 목록과 `/laws/:id` 상세 계약을 검증한다.
- production launch validation이 `national_assembly_bill_api_key` 또는 `law_go_kr_oc` 중 하나 없이는 법 관련 탭 운영 설정을 차단한다.
- production runtime config smoke가 실제 ingest 전 `/laws`에 preview 법령이 나오지 않음을 검증한다.
- law source dry-run은 credential이 있을 때 0건 파싱을 성공으로 취급하지 않는다.
- law source metadata 진단은 국회 의안 API와 법제처 국가법령 API endpoint가 공식 URL인지, 관심 키워드가 비어 있지 않은지, credential 원문이 출력되지 않는지 검증한다.

S+ 판정에 남은 것:

- 실제 `national_assembly_bill_api_key` 또는 `law_go_kr_oc`를 넣고 `pnpm sources:laws`가 1건 이상을 dry-run으로 반환해야 한다.
- 운영 API에 `--laws --post`가 성공하고 법 탭에서 새 LawItem이 이슈와 연결되어야 한다.

법령·의안 API 반영:

```bash
MUSUNIL_INTERNAL_API_KEY=<internal_api_key> \
MUSUNIL_API_BASE_URL=https://api.example.com \
pnpm --filter @musunil/public-source-ingest dev -- --laws --post
```

예시:

```bash
curl -X POST http://localhost:4000/internal/ingest/public-occurrence \
  -H 'content-type: application/json' \
  -H 'x-musunil-internal-key: <internal_api_key>' \
  -d '{
    "id": "occ_daegu_0709_public",
    "issueId": "issue_real_public_sources",
    "type": "static_assembly",
    "areaClusterId": "area_daegu",
    "regionLabel": "대구",
    "title": "대구 0709(목) 오늘의 집회 공개 일정",
    "startsAt": "2026-07-09T00:00:00.000+09:00",
    "lifecycleState": "UPCOMING",
    "claimantLabel": "대구경찰청 오늘의 집회시위",
    "normalizedStatement": "대구경찰청 게시판에 0709(목) 오늘의 집회 공개 일정 게시물이 등록되었습니다."
  }'
```

주제 묶음 규칙:

- `issueId`가 있으면 해당 Issue에 연결한다.
- `issueId`가 없고 집회 목적이 확인되면 `topicTitle`을 보낸다. 예: `부정선거`, `정보통신망법 개정 반대`, `대통령 탄핵 요구`.
- API는 `부정선거`처럼 단정형 표현을 `부정선거 의혹 제기 집회`처럼 주장형 Issue 제목으로 정규화한다.
- 집회 목적이 없는 일정/통계 자료는 `topicTitle`을 보내지 않는다. 이 경우 Occurrence로만 보이고 주요 Issue에는 올리지 않는다.

## 우선 연결할 실제 자료

- 경찰/지자체의 집회 관련 공개 안내
- 온라인 집회신고 시스템 또는 공개 가능한 집회 일정 자료
- 교통 통제/도로 소통 공개 API
- 지하철/버스 운행 영향 공개 API
- 언론/주최 측 공개 자료 링크

실제 자료도 자동 진실이 아니다. 무슨일은 수집 결과를 Claim으로 저장하고, Source provenance와 Evidence strength를 분리해 표시한다.
