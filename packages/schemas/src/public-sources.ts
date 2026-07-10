export type PoliceRegion = {
  code: string;
  label: string;
};

export type SourceCoverageStatus = "schedule_active" | "schedule_candidate" | "statistics_only" | "needs_discovery";

export type PublicAssemblySource = {
  id: string;
  regionCode: string;
  regionLabel: string;
  kind: "schedule" | "statistics";
  status: "active" | "candidate" | "needs_discovery";
  url?: string;
  pageUrl?: string;
  method?: "GET" | "POST";
  body?: string;
  parser?: "daegu_today_assembly" | "gangwon_today_assembly" | "busan_today_assembly" | "gyeonggi_south_today_assembly" | "gyeonggi_north_today_assembly" | "gwangju_today_assembly" | "incheon_today_assembly" | "gyeongbuk_today_assembly" | "gyeongnam_today_assembly" | "jeju_today_assembly" | "chungbuk_today_assembly" | "chungnam_today_assembly" | "jeonbuk_today_assembly" | "jeonnam_today_assembly" | "daejeon_today_assembly" | "ulsan_today_assembly" | "seoul_assembly_control" | "sejong_today_assembly";
  encoding?: "euc-kr";
  refreshCadenceHours: number;
  lastCheckedAt: string;
  failureReason?: string;
  notes: string;
};

const registryLastCheckedAt = "2026-07-10T02:22:00.000+09:00";
const discoveryRefreshCadenceHours = 168;

export const policeRegions: PoliceRegion[] = [
  { code: "seoul", label: "서울" },
  { code: "busan", label: "부산" },
  { code: "daegu", label: "대구" },
  { code: "incheon", label: "인천" },
  { code: "gwangju", label: "광주" },
  { code: "daejeon", label: "대전" },
  { code: "ulsan", label: "울산" },
  { code: "sejong", label: "세종" },
  { code: "gyeonggi_south", label: "경기남부" },
  { code: "gyeonggi_north", label: "경기북부" },
  { code: "gangwon", label: "강원" },
  { code: "chungbuk", label: "충북" },
  { code: "chungnam", label: "충남" },
  { code: "jeonbuk", label: "전북" },
  { code: "jeonnam", label: "전남" },
  { code: "gyeongbuk", label: "경북" },
  { code: "gyeongnam", label: "경남" },
  { code: "jeju", label: "제주" }
];

export const publicAssemblySources: PublicAssemblySource[] = [
  {
    id: "national_police_assembly_statistics",
    regionCode: "national",
    regionLabel: "전국",
    kind: "statistics",
    status: "active",
    url: "https://www.data.go.kr/data/15045212/fileData.do",
    refreshCadenceHours: 720,
    lastCheckedAt: registryLastCheckedAt,
    notes: "2011~2023 신고/개최 통계. 일정 원천이 아니므로 개별 Occurrence 부재를 뜻하지 않는다."
  },
  {
    id: "seoul_assembly_control",
    regionCode: "seoul",
    regionLabel: "서울",
    kind: "schedule",
    status: "active",
    parser: "seoul_assembly_control",
    url: "https://www.spatic.go.kr/spatic/assem/getList.json",
    pageUrl: "https://www.spatic.go.kr/spatic/main/assem.do",
    method: "POST",
    body: "limit=10&offset=0",
    refreshCadenceHours: 24,
    lastCheckedAt: registryLastCheckedAt,
    notes: "서울경찰청 교통정보센터 집회·통제정보. 공식 JSON 목록을 읽어 게시물 단위 Claim으로 ingest한다."
  },
  {
    id: "sejong_today_assembly",
    regionCode: "sejong",
    regionLabel: "세종",
    kind: "schedule",
    status: "active",
    parser: "sejong_today_assembly",
    url: "https://www.sjpolice.go.kr/site/main.php?bo=sjpol2&mxPn=02_02",
    refreshCadenceHours: 24,
    lastCheckedAt: registryLastCheckedAt,
    notes: "오늘의 집회/시위 게시판. 게시물 목록을 읽어 게시물 단위 Claim으로 ingest한다."
  },
  {
    id: "daegu_today_assembly",
    regionCode: "daegu",
    regionLabel: "대구",
    kind: "schedule",
    status: "active",
    parser: "daegu_today_assembly",
    url: "https://www.dgpolice.go.kr/dgpo/bbs/List.do?bbsId=d495f174&menuNo=104050000",
    refreshCadenceHours: 24,
    lastCheckedAt: registryLastCheckedAt,
    notes: "오늘의 집회시위 게시판. 첨부 PDF 파싱 전까지 게시물 단위 Claim으로 ingest한다."
  },
  {
    id: "daegu_assembly_statistics",
    regionCode: "daegu",
    regionLabel: "대구",
    kind: "statistics",
    status: "active",
    url: "https://www.data.go.kr/data/15066382/fileData.do",
    refreshCadenceHours: 720,
    lastCheckedAt: registryLastCheckedAt,
    notes: "2020~2025 경찰서별 신고/개최 통계. 일정 원천이 아니다."
  },
  {
    id: "busan_assembly_statistics",
    regionCode: "busan",
    regionLabel: "부산",
    kind: "statistics",
    status: "active",
    url: "https://www.data.go.kr/data/15127924/fileData.do",
    refreshCadenceHours: 720,
    lastCheckedAt: registryLastCheckedAt,
    notes: "2021~2025 신고/개최 통계. 일정 원천이 아니다."
  },
  {
    id: "daejeon_assembly_statistics",
    regionCode: "daejeon",
    regionLabel: "대전",
    kind: "statistics",
    status: "active",
    url: "https://www.data.go.kr/data/15142268/fileData.do",
    refreshCadenceHours: 720,
    lastCheckedAt: registryLastCheckedAt,
    notes: "2019~2025 분야별 개최 통계. 일정 원천이 아니다."
  },
  {
    id: "daejeon_today_assembly",
    regionCode: "daejeon",
    regionLabel: "대전",
    kind: "schedule",
    status: "active",
    parser: "daejeon_today_assembly",
    url: "https://www.djpolice.go.kr/main.htm?mxRc=x7_9&bo=notify3&keyword=%EC%A7%91%ED%9A%8C",
    refreshCadenceHours: 24,
    lastCheckedAt: registryLastCheckedAt,
    notes: "오늘의주요집회 공식 게시판을 통합검색의 해당 섹션으로 읽어 게시물 단위 Claim으로 ingest한다."
  },
  {
    id: "gyeonggi_north_assembly_statistics",
    regionCode: "gyeonggi_north",
    regionLabel: "경기북부",
    kind: "statistics",
    status: "active",
    url: "https://www.data.go.kr/data/15114224/fileData.do",
    refreshCadenceHours: 720,
    lastCheckedAt: registryLastCheckedAt,
    notes: "2018~2025 개최 통계. 일정 원천이 아니다."
  },
  {
    id: "gyeonggi_north_today_assembly",
    regionCode: "gyeonggi_north",
    regionLabel: "경기북부",
    kind: "schedule",
    status: "active",
    parser: "gyeonggi_north_today_assembly",
    url: "https://www.ggbpolice.go.kr/main/cop/bbs/selectBoardList.do?bbsId=Assembly_main",
    refreshCadenceHours: 24,
    lastCheckedAt: registryLastCheckedAt,
    notes: "오늘의 주요집회 게시판. 게시물 목록을 읽어 게시물 단위 Claim으로 ingest한다."
  },
  {
    id: "gangwon_today_assembly",
    regionCode: "gangwon",
    regionLabel: "강원",
    kind: "schedule",
    status: "active",
    parser: "gangwon_today_assembly",
    url: "https://www.gwpolice.go.kr/gw/sub02/sub02_05.jsp",
    refreshCadenceHours: 24,
    lastCheckedAt: registryLastCheckedAt,
    notes: "오늘의 주요집회 게시판. 첨부 파일 구조화 전까지 게시물 단위 Claim으로 ingest한다."
  },
  {
    id: "busan_today_assembly",
    regionCode: "busan",
    regionLabel: "부산",
    kind: "schedule",
    status: "active",
    parser: "busan_today_assembly",
    url: "https://www.bspolice.go.kr/view.do?no=72",
    refreshCadenceHours: 24,
    lastCheckedAt: registryLastCheckedAt,
    notes: "오늘의 집회/시위 게시판. 첨부 파일 구조화 전까지 게시물 단위 Claim으로 ingest한다."
  },
  {
    id: "gyeonggi_south_today_assembly",
    regionCode: "gyeonggi_south",
    regionLabel: "경기남부",
    kind: "schedule",
    status: "active",
    parser: "gyeonggi_south_today_assembly",
    url: "https://www.ggpolice.go.kr/main/bbslist.do?bbsId=FD2",
    refreshCadenceHours: 24,
    lastCheckedAt: registryLastCheckedAt,
    notes: "오늘의 주요집회 게시판. 첨부 파일 구조화 전까지 게시물 단위 Claim으로 ingest한다."
  },
  {
    id: "gwangju_today_assembly",
    regionCode: "gwangju",
    regionLabel: "광주",
    kind: "schedule",
    status: "active",
    parser: "gwangju_today_assembly",
    url: "https://www.gjpolice.go.kr/cop/bbs/selectBoardList.do?bbsId=BBSMSTR_000000000031&r=gjpolice",
    refreshCadenceHours: 24,
    lastCheckedAt: registryLastCheckedAt,
    notes: "오늘의집회시위 게시판. iframe 게시판 목록을 읽어 게시물 단위 Claim으로 ingest한다."
  },
  {
    id: "incheon_today_assembly",
    regionCode: "incheon",
    regionLabel: "인천",
    kind: "schedule",
    status: "active",
    parser: "incheon_today_assembly",
    encoding: "euc-kr",
    url: "https://www.icpolice.go.kr/board/rg4_board/list.php?bbs_code=ic015",
    refreshCadenceHours: 24,
    lastCheckedAt: registryLastCheckedAt,
    notes: "오늘의 집회/시위 게시판. EUC-KR 목록을 읽어 게시물 단위 Claim으로 ingest한다."
  },
  {
    id: "gyeongbuk_today_assembly",
    regionCode: "gyeongbuk",
    regionLabel: "경북",
    kind: "schedule",
    status: "active",
    parser: "gyeongbuk_today_assembly",
    url: "https://www.gbpolice.go.kr/bbs/List.do?bbsId=8&sid=gbpolice",
    refreshCadenceHours: 24,
    lastCheckedAt: registryLastCheckedAt,
    notes: "오늘의 집회시위 게시판. 첨부 파일 구조화 전까지 게시물 단위 Claim으로 ingest한다."
  },
  {
    id: "gyeongnam_today_assembly",
    regionCode: "gyeongnam",
    regionLabel: "경남",
    kind: "schedule",
    status: "active",
    parser: "gyeongnam_today_assembly",
    url: "https://www.gnpolice.go.kr/gnpmng/sec/getBbsList.do",
    pageUrl: "https://www.gnpolice.go.kr/gnpolice/page.do?MENU_ID=NF05",
    method: "POST",
    body: "BBS_ID=GNPMNG_D101&CURRENT_PAGE=1&PAGE_UNIT=10&FROM_DATE=&TO_DATE=&SEARCH_CONTITION=&SEARCH_KEYWORD=",
    refreshCadenceHours: 24,
    lastCheckedAt: registryLastCheckedAt,
    notes: "오늘의 주요집회 게시판. 공식 게시판 JSON 목록을 읽어 게시물 단위 Claim으로 ingest한다."
  },
  {
    id: "jeju_today_assembly",
    regionCode: "jeju",
    regionLabel: "제주",
    kind: "schedule",
    status: "active",
    parser: "jeju_today_assembly",
    url: "https://www.jjpolice.go.kr/jjpolice/notice/assembly.htm",
    refreshCadenceHours: 24,
    lastCheckedAt: registryLastCheckedAt,
    notes: "오늘의집회 게시판. 게시물 목록을 읽어 게시물 단위 Claim으로 ingest한다."
  },
  {
    id: "chungbuk_today_assembly",
    regionCode: "chungbuk",
    regionLabel: "충북",
    kind: "schedule",
    status: "active",
    parser: "chungbuk_today_assembly",
    url: "https://www.cbpolice.go.kr/main_sub/sub.php?folder_idx=2&folder_page_idx=18",
    refreshCadenceHours: 24,
    lastCheckedAt: registryLastCheckedAt,
    notes: "오늘의 집회 시위 게시판. 게시물 목록을 읽어 게시물 단위 Claim으로 ingest한다."
  },
  {
    id: "chungnam_today_assembly",
    regionCode: "chungnam",
    regionLabel: "충남",
    kind: "schedule",
    status: "active",
    parser: "chungnam_today_assembly",
    encoding: "euc-kr",
    url: "https://www.cnpolice.go.kr/2014/main.php?mxPn=3_1_1",
    refreshCadenceHours: 24,
    lastCheckedAt: registryLastCheckedAt,
    notes: "오늘의 주요집회 게시판. EUC-KR 목록을 읽어 게시물 단위 Claim으로 ingest한다."
  },
  {
    id: "jeonbuk_today_assembly",
    regionCode: "jeonbuk",
    regionLabel: "전북",
    kind: "schedule",
    status: "active",
    parser: "jeonbuk_today_assembly",
    url: "https://www.jbpolice.go.kr/index.police?menuCd=DOM_000000202008000000",
    refreshCadenceHours: 24,
    lastCheckedAt: registryLastCheckedAt,
    notes: "집회시위안내 게시판. 게시물 목록을 읽어 게시물 단위 Claim으로 ingest한다."
  },
  {
    id: "jeonnam_today_assembly",
    regionCode: "jeonnam",
    regionLabel: "전남",
    kind: "schedule",
    status: "active",
    parser: "jeonnam_today_assembly",
    url: "https://www.jnpolice.go.kr/?pid=AP0306",
    refreshCadenceHours: 24,
    lastCheckedAt: registryLastCheckedAt,
    notes: "오늘의집회/시위 게시판. 게시물 목록을 읽어 게시물 단위 Claim으로 ingest한다."
  },
  {
    id: "ulsan_today_assembly",
    regionCode: "ulsan",
    regionLabel: "울산",
    kind: "schedule",
    status: "active",
    parser: "ulsan_today_assembly",
    url: "https://www.uspolice.go.kr/m/board.jsp?tab=bo20141217142954",
    refreshCadenceHours: 24,
    lastCheckedAt: registryLastCheckedAt,
    notes: "오늘의 집회 게시판. 모바일 공식 목록의 제목 날짜를 읽어 게시물 단위 Claim으로 ingest한다."
  }
];

export function ingestablePublicAssemblySources(): PublicAssemblySource[] {
  return publicAssemblySources.filter((source) => source.kind === "schedule" && source.status === "active" && source.parser);
}

export function sourceCoverageReport() {
  const regions = policeRegions.map((region) => {
    const sources = publicAssemblySources.filter((source) => source.regionCode === region.code);
    const activeSchedule = sources.find((source) => source.kind === "schedule" && source.status === "active");
    const candidateSchedule = sources.find((source) => source.kind === "schedule" && source.status === "candidate");
    const activeStatistics = sources.find((source) => source.kind === "statistics" && source.status === "active");
    const status: SourceCoverageStatus = activeSchedule ? "schedule_active" : candidateSchedule ? "schedule_candidate" : activeStatistics ? "statistics_only" : "needs_discovery";
    const primarySource = activeSchedule ?? candidateSchedule ?? activeStatistics;
    const refreshCadenceHours = primarySource?.refreshCadenceHours ?? discoveryRefreshCadenceHours;
    const lastCheckedAt = latestIso(sources.map((source) => source.lastCheckedAt)) ?? registryLastCheckedAt;
    const nextRefreshAt = addHours(lastCheckedAt, refreshCadenceHours);
    return {
      ...region,
      status,
      coverageLevel:
        status === "schedule_active" ? "daily_schedule" : status === "schedule_candidate" ? "candidate_schedule" : status === "statistics_only" ? "historical_statistics" : "source_discovery",
      sourceIds: sources.map((source) => source.id),
      activeScheduleSourceId: activeSchedule?.id,
      publicScheduleUrl: activeSchedule?.pageUrl ?? activeSchedule?.url ?? candidateSchedule?.pageUrl ?? candidateSchedule?.url,
      statisticsSourceIds: sources.filter((source) => source.kind === "statistics" && source.status === "active").map((source) => source.id),
      statisticsUrls: sources.filter((source) => source.kind === "statistics" && source.status === "active" && source.url).map((source) => source.url as string),
      refreshCadenceHours,
      lastCheckedAt,
      nextRefreshAt,
      freshness: new Date(nextRefreshAt).getTime() >= Date.now() ? "current" : "overdue",
      gapReason: primarySource?.failureReason ?? coverageGapReason(status)
    };
  });
  const nextRefreshAt = latestIso(regions.map((region) => region.nextRefreshAt).sort().slice(0, 1));
  return {
    generatedAt: new Date().toISOString(),
    policy: "absence_of_public_source_is_not_absence_of_assembly",
    fullScheduleCoverage: regions.every((region) => region.status === "schedule_active"),
    activeScheduleRegions: regions.filter((region) => region.status === "schedule_active").length,
    candidateScheduleRegions: regions.filter((region) => region.status === "schedule_candidate").length,
    statisticsOnlyRegions: regions.filter((region) => region.status === "statistics_only").length,
    needsDiscoveryRegions: regions.filter((region) => region.status === "needs_discovery").length,
    overdueRegions: regions.filter((region) => region.freshness === "overdue").length,
    nextRefreshAt,
    totalPoliceRegions: policeRegions.length,
    regions,
    sources: publicAssemblySources
  };
}

function addHours(iso: string, hours: number): string {
  return new Date(new Date(iso).getTime() + hours * 60 * 60 * 1000).toISOString();
}

function latestIso(values: string[]): string | undefined {
  return values.filter(Boolean).sort().at(-1);
}

function coverageGapReason(status: SourceCoverageStatus): string {
  if (status === "schedule_active") return "공개 일정 parser 연결됨";
  if (status === "schedule_candidate") return "공식 일정 후보 검증 필요";
  if (status === "statistics_only") return "일정 원천은 없고 과거 통계만 확인됨";
  return "공식 일정/통계 공개 위치 추가 확인 필요";
}
