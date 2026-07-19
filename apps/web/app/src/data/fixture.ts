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
    keyPoint: "개정안의 정보 유통 규제 범위를 두고 반대 주장이 제기됐습니다"
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
    claim("claim-network-rebuttal", "개정 취지가 허위정보 피해 방지에 있다는 다른 설명도 제시됐습니다.", "rebuttal", "multiple_sources", "misleading_possible")
  ],
  "issue-election-process": [
    claim("claim-election-official", "지역별 집회 일정이 공개자료에서 확인됐습니다.", "government_or_police", "independent_sources_with_field_evidence", "low"),
    claim("claim-election-field", "복수 지역에서 같은 주제의 현장 영상이 확인됐습니다.", "verified_citizen_report", "multiple_sources", "misleading_possible"),
    claim("claim-election-rebuttal", "제기된 의혹을 반박하는 공식 설명이 함께 공개돼 있습니다.", "rebuttal", "independent_sources_with_field_evidence", "misleading_possible")
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
    linkedIssueCount: 1,
    occurrenceCount: 5,
    regionCount: 4,
    interestScore: 87,
    linkedIssueIds: ["issue-network-act"]
  },
  {
    id: "law-election-act",
    source: "assembly_bill" as const,
    title: "공직선거법 일부개정법률안",
    stage: "소관위 접수",
    proposedDate: "2026-07-14",
    statusDate: "2026-07-14",
    officialUrl: "https://likms.assembly.go.kr/bill/main.do",
    linkedIssueCount: 1,
    occurrenceCount: 9,
    regionCount: 7,
    interestScore: 82,
    linkedIssueIds: ["issue-election-process"]
  },
  {
    id: "law-labor-act",
    source: "law_effective" as const,
    title: "노동조합 및 노동관계조정법",
    stage: "현행 법령",
    statusDate: "2026-06-30",
    officialUrl: "https://www.law.go.kr/",
    linkedIssueCount: 1,
    occurrenceCount: 3,
    regionCount: 2,
    interestScore: 61,
    linkedIssueIds: ["issue-labor-act"]
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

const dataset: AppDataset = { issues, occurrences, reels, laws, claimsByIssue, claimsByOccurrence, map };

export const dataSource: DataSource = {
  mode: "fixture",
  async loadDataset() {
    await new Promise((resolve) => window.setTimeout(resolve, 120));
    return dataset;
  }
};

export default dataSource;
