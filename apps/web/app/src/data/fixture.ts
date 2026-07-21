import clipSeoul from "../../../media/redacted/preview-occ-live-1.webm";
import posterSeoul from "../../../media/redacted/preview-occ-live-1-poster.png";
import clipBusan from "../../../media/redacted/preview-busan-live.webm";
import posterBusan from "../../../media/redacted/preview-busan-live-poster.png";
import clipDaejeon from "../../../media/redacted/preview-daejeon-live.webm";
import posterDaejeon from "../../../media/redacted/preview-daejeon-live-poster.png";
import clipPresence from "../../../media/redacted/preview-presence-1.webm";
import posterPresence from "../../../media/redacted/preview-presence-1-poster.png";
import type { AppDataset, IssueOverview, OccurrenceDigest, PublicClaim } from "../contracts";
import type { DataSource } from "./source-contract";

const issues: IssueOverview[] = [
  {
    id: "issue-network-act",
    title: "정보통신망법 개정안 관련 집회",
    status: "active",
    lifecycleState: "LIVE",
    regionCount: 4,
    occurrenceCount: 5,
    officialClaimCount: 7,
    publicVideoCount: 6,
    disputeCount: 2,
    latestUpdatedAt: "2026-07-19T05:42:00.000Z",
    representativeOccurrenceId: "occ-network-seoul",
    latestChange: "서울·부산 현장 영상이 추가로 공개됐습니다"
  },
  {
    id: "issue-election-process",
    title: "선거 관리 절차 관련 집회",
    status: "active",
    lifecycleState: "ONGOING_SERIES",
    regionCount: 7,
    occurrenceCount: 9,
    officialClaimCount: 11,
    publicVideoCount: 4,
    disputeCount: 3,
    latestUpdatedAt: "2026-07-19T04:18:00.000Z",
    representativeOccurrenceId: "occ-election-daegu",
    latestChange: "대구 현장 규모 범위가 새 근거로 갱신됐습니다"
  },
  {
    id: "issue-impeachment",
    title: "대통령 탄핵 관련 집회",
    status: "quiet",
    lifecycleState: "UPCOMING",
    regionCount: 3,
    occurrenceCount: 4,
    officialClaimCount: 5,
    publicVideoCount: 2,
    disputeCount: 1,
    latestUpdatedAt: "2026-07-19T02:05:00.000Z",
    representativeOccurrenceId: "occ-impeachment-daejeon",
    latestChange: "주말 예정 현장 2곳의 공개 일정이 확인됐습니다"
  },
  {
    id: "issue-labor-act",
    title: "노동조합법 개정 관련 집회",
    status: "quiet",
    lifecycleState: "UPCOMING",
    regionCount: 2,
    occurrenceCount: 3,
    officialClaimCount: 4,
    publicVideoCount: 1,
    disputeCount: 0,
    latestUpdatedAt: "2026-07-18T23:40:00.000Z",
    representativeOccurrenceId: "occ-labor-gwangju",
    latestChange: "광주 예정 현장의 장소 정보가 확인됐습니다"
  }
];

const occurrences: OccurrenceDigest[] = [
  {
    id: "occ-network-seoul",
    targetType: "occurrence",
    issueId: "issue-network-act",
    issueTitle: issues[0].title,
    title: "서울 도심 개정안 반대 집회",
    regionLabel: "서울",
    locationLabel: "서울 중구 세종대로 일대",
    lifecycleState: "LIVE",
    startsAt: "2026-07-19T04:00:00.000Z",
    updatedAt: "2026-07-19T05:42:00.000Z",
    evidenceStrength: "independent_sources_with_field_evidence",
    riskLevel: "low",
    officialClaimCount: 3,
    publicVideoCount: 3,
    disputeCount: 1,
    evidenceCount: 8,
    scale: { minCount: 700, maxCount: 1000, confidence: "medium" },
    keyPoint: "개정안의 정보 유통 규제 범위에 반대하는 주장이 확인됐습니다"
  },
  {
    id: "occ-network-busan",
    targetType: "occurrence",
    issueId: "issue-network-act",
    issueTitle: issues[0].title,
    title: "부산 서면 개정안 관련 집회",
    regionLabel: "부산",
    locationLabel: "부산 부산진구 서면 일대",
    lifecycleState: "LIVE",
    startsAt: "2026-07-19T05:00:00.000Z",
    updatedAt: "2026-07-19T05:31:00.000Z",
    evidenceStrength: "multiple_sources",
    riskLevel: "low",
    officialClaimCount: 1,
    publicVideoCount: 2,
    disputeCount: 0,
    evidenceCount: 4,
    scale: { minCount: 180, maxCount: 300, confidence: "medium" },
    keyPoint: "같은 개정안을 대상으로 한 지역 집회가 확인됐습니다"
  },
  {
    id: "occ-network-incheon",
    targetType: "occurrence",
    issueId: "issue-network-act",
    issueTitle: issues[0].title,
    title: "인천 시청 앞 개정안 관련 집회",
    regionLabel: "인천",
    locationLabel: "인천 남동구 시청 인근",
    lifecycleState: "UPCOMING",
    startsAt: "2026-07-20T06:00:00.000Z",
    updatedAt: "2026-07-19T01:10:00.000Z",
    evidenceStrength: "multiple_sources",
    riskLevel: "low",
    officialClaimCount: 2,
    publicVideoCount: 0,
    disputeCount: 1,
    evidenceCount: 2,
    keyPoint: "공개 일정은 확인됐으며 현장 영상은 아직 없습니다"
  },
  {
    id: "occ-election-daegu",
    targetType: "continuous_presence",
    issueId: "issue-election-process",
    issueTitle: issues[1].title,
    title: "대구 동성로 선거 절차 관련 집회",
    regionLabel: "대구",
    locationLabel: "대구 중구 동성로 일대",
    lifecycleState: "ONGOING_SERIES",
    updatedAt: "2026-07-19T04:18:00.000Z",
    evidenceStrength: "multiple_sources",
    riskLevel: "misleading_possible",
    officialClaimCount: 2,
    publicVideoCount: 2,
    disputeCount: 2,
    evidenceCount: 6,
    scale: { minCount: 250, maxCount: 450, confidence: "low" },
    keyPoint: "선거 관리 절차의 투명성에 관한 상반된 주장이 함께 확인됩니다"
  },
  {
    id: "occ-election-seoul",
    targetType: "occurrence",
    issueId: "issue-election-process",
    issueTitle: issues[1].title,
    title: "서울 영등포 선거 절차 관련 집회",
    regionLabel: "서울",
    locationLabel: "서울 영등포구 국회 인근",
    lifecycleState: "UPCOMING",
    startsAt: "2026-07-20T05:00:00.000Z",
    updatedAt: "2026-07-19T03:20:00.000Z",
    evidenceStrength: "multiple_sources",
    riskLevel: "low",
    officialClaimCount: 3,
    publicVideoCount: 0,
    disputeCount: 1,
    evidenceCount: 3,
    keyPoint: "공개 집회 일정과 장소가 확인됐습니다"
  },
  {
    id: "occ-impeachment-daejeon",
    targetType: "occurrence",
    issueId: "issue-impeachment",
    issueTitle: issues[2].title,
    title: "대전 둔산 탄핵 관련 집회",
    regionLabel: "대전",
    locationLabel: "대전 서구 둔산동 일대",
    lifecycleState: "UPCOMING",
    startsAt: "2026-07-20T07:00:00.000Z",
    updatedAt: "2026-07-19T02:05:00.000Z",
    evidenceStrength: "multiple_sources",
    riskLevel: "low",
    officialClaimCount: 2,
    publicVideoCount: 1,
    disputeCount: 1,
    evidenceCount: 3,
    keyPoint: "찬반 입장이 다른 집회 일정이 인접 시간대에 공개됐습니다"
  },
  {
    id: "occ-labor-gwangju",
    targetType: "occurrence",
    issueId: "issue-labor-act",
    issueTitle: issues[3].title,
    title: "광주 금남로 노동조합법 관련 집회",
    regionLabel: "광주",
    locationLabel: "광주 동구 금남로 일대",
    lifecycleState: "UPCOMING",
    startsAt: "2026-07-21T09:00:00.000Z",
    updatedAt: "2026-07-18T23:40:00.000Z",
    evidenceStrength: "multiple_sources",
    riskLevel: "low",
    officialClaimCount: 2,
    publicVideoCount: 0,
    disputeCount: 0,
    evidenceCount: 2,
    keyPoint: "개정안의 사용자 책임 범위를 둘러싼 집회가 예정돼 있습니다"
  }
];

const claim = (id: string, statement: string, source: string, strength: PublicClaim["evidenceStrength"], risk: PublicClaim["riskLevel"]): PublicClaim => ({
  id,
  normalizedStatement: statement,
  sourceProvenance: source,
  evidenceStrength: strength,
  riskLevel: risk,
  createdAt: "2026-07-19T04:00:00.000Z"
});

const claimsByIssue: Record<string, PublicClaim[]> = {
  "issue-network-act": [
    claim("claim-network-official", "개정안 관련 집회 일정과 장소가 관계 기관 공개자료에서 확인됐습니다.", "government_or_police", "independent_sources_with_field_evidence", "low"),
    claim("claim-network-organizer", "주최 측은 개정안의 정보 유통 규제 범위가 과도하다고 주장합니다.", "organizer_or_group", "multiple_sources", "misleading_possible"),
    claim("claim-network-rebuttal", "개정 취지가 허위정보 피해 방지에 있다는 다른 설명도 제시됐습니다.", "rebuttal", "multiple_sources", "misleading_possible"),
    claim("claim-network-news", "정보통신망법의 '온라인 정보·이용자 보호' 쟁점과 관련된 언론 보도입니다.", "media_report", "single_source", "misleading_possible")
  ],
  "issue-election-process": [
    claim("claim-election-official", "지역별 집회 일정이 공개자료에서 확인됐습니다.", "government_or_police", "independent_sources_with_field_evidence", "low"),
    claim("claim-election-field", "복수 지역에서 같은 주제의 현장 영상이 확인됐습니다.", "verified_citizen_report", "multiple_sources", "misleading_possible"),
    claim("claim-election-rebuttal", "제기된 의혹을 반박하는 공식 설명이 함께 공개돼 있습니다.", "rebuttal", "independent_sources_with_field_evidence", "misleading_possible"),
    claim("claim-election-news", "공직선거법의 '투표용지·공급 대응' 쟁점과 관련된 언론 보도입니다.", "media_report", "single_source", "misleading_possible")
  ],
  "issue-impeachment": [claim("claim-impeachment-official", "주말 집회 신고 일정과 장소가 공개자료에서 확인됐습니다.", "government_or_police", "independent_sources_with_field_evidence", "low")],
  "issue-labor-act": [claim("claim-labor-official", "법 개정 관련 집회 일정이 공개자료에서 확인됐습니다.", "government_or_police", "independent_sources_with_field_evidence", "low")]
};

const claimsByOccurrence: Record<string, PublicClaim[]> = Object.fromEntries(
  occurrences.map((occurrence) => [
    occurrence.id,
    [
      claim(`${occurrence.id}-official`, `${occurrence.locationLabel || occurrence.regionLabel}에서 집회 일정 또는 현장이 공개자료로 확인됐습니다.`, "government_or_police", occurrence.officialClaimCount ? "independent_sources_with_field_evidence" : "single_source", "low"),
      ...(occurrence.publicVideoCount
        ? [claim(`${occurrence.id}-video`, "앱 내 촬영과 위치 확인을 통과한 현장 영상이 공개돼 있습니다.", "verified_citizen_report", "multiple_proof_of_presence", "low")]
        : [])
    ]
  ])
);

const reelMedia = [
  { clip: clipSeoul, poster: posterSeoul },
  { clip: clipBusan, poster: posterBusan },
  { clip: clipDaejeon, poster: posterDaejeon },
  { clip: clipPresence, poster: posterPresence }
];
const reelOccurrences = [occurrences[0], occurrences[3], occurrences[5], occurrences[1]];
const reels = reelOccurrences.map((occurrence, index) => ({
  id: `reel-${index + 1}`,
  claimId: `${occurrence.id}-video`,
  occurrenceId: occurrence.id,
  targetType: occurrence.targetType,
  issueId: occurrence.issueId,
  occurrenceTitle: occurrence.title,
  issueTitle: occurrence.issueTitle,
  regionLabel: occurrence.regionLabel,
  capturedAt: `2026-07-19T0${5 - index}:2${index}:00.000Z`,
  durationMs: 7000,
  publicRadiusM: 200,
  sourceProvenance: "verified_citizen_report",
  evidenceStrength: occurrence.evidenceStrength,
  riskLevel: occurrence.riskLevel,
  media: { redactedClipUrl: reelMedia[index].clip, redactedPosterUrl: reelMedia[index].poster },
  summary: "현장 위치와 촬영 시각이 확인된 비식별 영상입니다.",
  hasDispute: occurrence.disputeCount > 0,
  fieldVerification: { aligned: index + 1, disputed: occurrence.disputeCount ? 1 : 0, statusLabel: "현장 확인 중" },
  occurrenceDigest: occurrence
}));

const laws = [
  {
    id: "law-network-act",
    source: "assembly_bill" as const,
    title: "정보통신망 이용촉진 및 정보보호 등에 관한 법률 일부개정법률안",
    stage: "위원회 심사",
    proposedDate: "2026-07-08",
    statusDate: "2026-07-16",
    officialUrl: "https://likms.assembly.go.kr/bill/main.do",
    assemblyBillNo: "2217001",
    proposer: "김예시의원 등 10인",
    proposalSummary: "온라인 정보 유통 과정의 책임과 이용자 보호 절차를 보완하려는 개정안입니다.",
    lawGroupId: "law-group-network-act",
    linkedIssueCount: 0,
    occurrenceCount: 0,
    regionCount: 0,
    interestScore: 87
  },
  {
    id: "law-election-act",
    source: "assembly_bill" as const,
    title: "공직선거법 일부개정법률안",
    stage: "소관위 접수",
    proposedDate: "2026-07-14",
    statusDate: "2026-07-14",
    officialUrl: "https://likms.assembly.go.kr/bill/main.do",
    assemblyBillNo: "2217002",
    proposer: "이예시의원 등 12인",
    proposalSummary: "투표용지 부족 상황을 예방하기 위한 인쇄 수량과 비상 공급 절차를 마련하려는 개정안입니다.",
    lawGroupId: "law-group-election-act",
    linkedIssueCount: 0,
    occurrenceCount: 0,
    regionCount: 0,
    interestScore: 82
  },
  {
    id: "law-labor-act",
    source: "law_effective" as const,
    title: "노동조합 및 노동관계조정법",
    stage: "현행 법령",
    statusDate: "2026-06-30",
    officialUrl: "https://www.law.go.kr/",
    lawGroupId: "law-group-effective-labor",
    linkedIssueCount: 0,
    occurrenceCount: 0,
    regionCount: 0,
    interestScore: 61
  }
];

const pin = (occurrence: OccurrenceDigest, lng: number, lat: number, sequence: number) => ({
  type: "Feature" as const,
  geometry: { type: "Point" as const, coordinates: [lng, lat] },
  properties: {
    id: `pin-${occurrence.id}`,
    occurrenceUnitId: occurrence.id,
    targetType: occurrence.targetType,
    targetId: occurrence.id,
    issueId: occurrence.issueId,
    title: occurrence.title,
    regionLabel: occurrence.regionLabel,
    lifecycleState: occurrence.lifecycleState,
    sequence,
    locationLabel: occurrence.locationLabel,
    source: "public_source_location"
  }
});

const polygon = (occurrence: OccurrenceDigest, coordinates: number[][][]) => ({
  type: "Feature" as const,
  geometry: { type: "Polygon" as const, coordinates },
  properties: {
    id: `area-${occurrence.id}`,
    occurrenceUnitId: occurrence.id,
    targetType: occurrence.targetType,
    targetId: occurrence.id,
    issueId: occurrence.issueId,
    title: occurrence.title,
    sampleCount: occurrence.publicVideoCount,
    publicRadiusM: 200
  }
});

const map = {
  occurrenceDigests: occurrences,
  geojson: {
    pins: {
      type: "FeatureCollection" as const,
      features: [
        pin(occurrences[0], 126.9768, 37.572, 1),
        pin(occurrences[1], 129.058, 35.157, 2),
        pin(occurrences[2], 126.705, 37.455, 3),
        pin(occurrences[3], 128.594, 35.869, 4),
        pin(occurrences[4], 126.915, 37.528, 5),
        pin(occurrences[5], 127.384, 36.351, 6),
        pin(occurrences[6], 126.912, 35.147, 7)
      ]
    },
    presenceAreas: {
      type: "FeatureCollection" as const,
      features: [
        polygon(occurrences[0], [[[126.9735, 37.5705], [126.9802, 37.5705], [126.9802, 37.5741], [126.9735, 37.5741], [126.9735, 37.5705]]]),
        polygon(occurrences[1], [[[129.0555, 35.1553], [129.061, 35.1553], [129.061, 35.159], [129.0555, 35.159], [129.0555, 35.1553]]]),
        polygon(occurrences[3], [[[128.591, 35.867], [128.597, 35.867], [128.597, 35.871], [128.591, 35.871], [128.591, 35.867]]])
      ]
    }
  }
};

const lawGroups: AppDataset["lawGroups"] = [
  { id: "law-group-network-act", lawName: "정보통신망 이용촉진 및 정보보호 등에 관한 법률", billTitle: "정보통신망 이용촉진 및 정보보호 등에 관한 법률 일부개정법률안", coreTopics: [{ key: "network-protection", label: "온라인 정보·이용자 보호", representativeKeywords: ["온라인 정보", "이용자 보호"], billCount: 1 }], billCount: 1, latestProposedDate: "2026-07-08", stageCounts: { "위원회 심사": 1 }, linkedIssueCount: 1, occurrenceCount: 5, regionCount: 4, interestScore: 87 },
  { id: "law-group-election-act", lawName: "공직선거법", billTitle: "공직선거법 일부개정법률안", coreTopics: [{ key: "ballot-supply", label: "투표용지·공급 대응", representativeKeywords: ["투표용지", "공급 대응", "비상 물류"], billCount: 1 }], billCount: 1, latestProposedDate: "2026-07-14", stageCounts: { "소관위 접수": 1 }, linkedIssueCount: 1, occurrenceCount: 9, regionCount: 7, interestScore: 82 },
  { id: "law-group-effective-labor", lawName: "노동조합 및 노동관계조정법", billTitle: "노동조합 및 노동관계조정법", coreTopics: [{ key: "effective-law", label: "현행 법령", representativeKeywords: ["현행 법령"], billCount: 1 }], billCount: 1, stageCounts: { "현행 법령": 1 }, linkedIssueCount: 1, occurrenceCount: 3, regionCount: 2, interestScore: 61 }
];
const lawGroupIssueIds: Record<string, string[]> = {
  "law-group-network-act": ["issue-network-act"],
  "law-group-election-act": ["issue-election-process"],
  "law-group-effective-labor": ["issue-labor-act"]
};

const newsByIssue: AppDataset["newsByIssue"] = {
  "issue-network-act": [
    { id: "news-network-1", issueId: "issue-network-act", lawGroupId: "law-group-network-act", coreTopicKey: "network-protection", publisherLabel: "연합뉴스", publishedAt: "2026-07-16T03:30:00.000Z", summary: "정보통신망법의 '온라인 정보·이용자 보호' 쟁점과 관련된 언론 보도입니다.", sourceUrl: "https://example.com/news/network-1" },
    { id: "news-network-2", issueId: "issue-network-act", lawGroupId: "law-group-network-act", coreTopicKey: "network-protection", publisherLabel: "뉴시스", publishedAt: "2026-07-16T02:10:00.000Z", summary: "정보통신망법의 '온라인 정보·이용자 보호' 쟁점과 관련된 언론 보도입니다.", sourceUrl: "https://example.com/news/network-2" }
  ],
  "issue-election-process": [
    { id: "news-election-1", issueId: "issue-election-process", lawGroupId: "law-group-election-act", coreTopicKey: "ballot-supply", publisherLabel: "연합뉴스", publishedAt: "2026-07-15T04:46:42.000Z", summary: "공직선거법의 '투표용지·공급 대응' 쟁점과 관련된 언론 보도입니다.", sourceUrl: "https://example.com/news/election-1" },
    { id: "news-election-2", issueId: "issue-election-process", lawGroupId: "law-group-election-act", coreTopicKey: "ballot-supply", publisherLabel: "뉴시스", publishedAt: "2026-07-15T04:25:10.000Z", summary: "공직선거법의 '투표용지·공급 대응' 쟁점과 관련된 언론 보도입니다.", sourceUrl: "https://example.com/news/election-2" }
  ]
};

const synthesisByIssue: AppDataset["synthesisByIssue"] = {
  "issue-network-act": {
    version: "fixture-law-group-evidence-v1",
    method: "law_group_evidence_aggregate",
    neutralSummary: "정보통신망법 관련 보도에서 온라인 정보·이용자 보호 논점이 함께 확인됩니다.",
    generatedAt: "2026-07-19T05:00:00.000Z",
    windowStartedAt: "2026-07-16T02:10:00.000Z",
    windowEndedAt: "2026-07-16T03:30:00.000Z",
    evidenceCount: 2,
    publisherCount: 2,
    claimIds: ["claim-network-media-1", "claim-network-media-2"],
    evidenceIds: ["news-network-1", "news-network-2"],
    facets: [{ coreTopicKey: "network-protection", label: "온라인 정보·이용자 보호", evidenceCount: 2, publisherCount: 2, claimIds: ["claim-network-media-1", "claim-network-media-2"], evidenceIds: ["news-network-1", "news-network-2"] }]
  },
  "issue-election-process": {
    version: "fixture-law-group-evidence-v1",
    method: "law_group_evidence_aggregate",
    neutralSummary: "공직선거법 관련 보도에서 투표용지·공급 대응 논점이 함께 확인됩니다.",
    generatedAt: "2026-07-19T05:00:00.000Z",
    windowStartedAt: "2026-07-15T04:25:10.000Z",
    windowEndedAt: "2026-07-15T04:46:42.000Z",
    evidenceCount: 2,
    publisherCount: 2,
    claimIds: ["claim-election-media-1", "claim-election-media-2"],
    evidenceIds: ["news-election-1", "news-election-2"],
    facets: [{ coreTopicKey: "ballot-supply", label: "투표용지·공급 대응", evidenceCount: 2, publisherCount: 2, claimIds: ["claim-election-media-1", "claim-election-media-2"], evidenceIds: ["news-election-1", "news-election-2"] }]
  }
};
for (const issue of issues) {
  const synthesis = synthesisByIssue[issue.id];
  if (!synthesis) continue;
  issue.synthesisSummary = synthesis.neutralSummary;
  issue.synthesisEvidenceCount = synthesis.evidenceCount;
  issue.synthesisPublisherCount = synthesis.publisherCount;
  issue.facets = synthesis.facets;
  issue.latestChange = synthesis.neutralSummary;
}
const lawGroupsByIssue: AppDataset["lawGroupsByIssue"] = Object.fromEntries(Object.entries(lawGroupIssueIds).flatMap(([groupId, issueIds]) => {
  const group = lawGroups.find((item) => item.id === groupId);
  return group ? issueIds.map((issueId) => [issueId, [group]]) : [];
}));
const dataset: AppDataset = { issues, occurrences, reels, laws, lawGroups, claimsByIssue, newsByIssue, synthesisByIssue, lawGroupsByIssue, claimsByOccurrence, map };

export const dataSource: DataSource = {
  mode: "fixture",
  async loadReadiness() { return { gates: { publicRead: { ready: true, failedIds: [] }, contribution: { ready: true, failedIds: [] }, operator: { ready: true, failedIds: [] } } }; },
  async loadDataset() {
    await new Promise((resolve) => window.setTimeout(resolve, 120));
    return dataset;
  },
  async loadIssue(id) {
    const issueOverview = dataset.issues.find((item) => item.id === id);
    return {
      issueOverview,
      occurrenceDigests: dataset.occurrences.filter((item) => item.issueId === id),
      claims: dataset.claimsByIssue[id] || [],
      newsArticles: dataset.newsByIssue[id] || [],
      topicGrouping: dataset.synthesisByIssue[id] ? { synthesisBasis: "evidence_aggregate", policy: "사실 확정이 아닌 탐색 단위", basis: ["공개 근거 종합"], synthesis: dataset.synthesisByIssue[id] } : undefined,
      relatedLawGroups: dataset.lawGroupsByIssue[id] || []
    };
  },
  async loadOccurrence(id) {
    const occurrenceDigest = dataset.occurrences.find((item) => item.id === id);
    if (!occurrenceDigest) throw new Error("occurrence_not_found");
    return { occurrenceDigest, claims: dataset.claimsByOccurrence[id] || [], evidenceCount: occurrenceDigest.evidenceCount };
  },
  async loadLawGroup(id) {
    const group = dataset.lawGroups.find((item) => item.id === id);
    if (!group) throw new Error("law_group_not_found");
    const bills = dataset.laws.filter((law) => law.lawGroupId === id);
    const linkedIssueIds = new Set(lawGroupIssueIds[id] || []);
    return {
      group,
      bills,
      issues: dataset.issues.filter((issue) => linkedIssueIds.has(issue.id)).map((issue) => ({
        ...issue,
        newsCount: (dataset.newsByIssue[issue.id] || []).length,
        recentNews: (dataset.newsByIssue[issue.id] || []).slice(0, 3)
      }))
    };
  }
};

export default dataSource;
