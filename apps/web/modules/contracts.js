const occurrenceTypes = new Set(["occurrence", "continuous_presence"]);

export function toOccurrenceDigest(input = {}) {
  const targetType = occurrenceTypes.has(input.targetType) ? input.targetType : "occurrence";
  const sourceSummary = input.sourceSummary || {};
  return Object.freeze({
    id: String(input.id || ""),
    targetType,
    issueId: input.issueId ? String(input.issueId) : undefined,
    title: String(input.title || "집회 현장"),
    regionLabel: String(input.regionLabel || "지역 확인 중"),
    locationLabel: input.publicLocation?.label ? String(input.publicLocation.label) : undefined,
    lifecycleState: String(input.lifecycleState || "UNKNOWN"),
    startsAt: input.startsAt || undefined,
    endsAt: input.endsAt || undefined,
    updatedAt: input.updatedAt || undefined,
    evidenceStrength: String(input.evidenceStrength || "none"),
    riskLevel: String(input.riskLevel || "low"),
    officialClaimCount: Number(input.officialClaimCount ?? sourceSummary.official ?? 0),
    publicVideoCount: Number(input.publicVideoCount ?? input.liveEvidenceCount ?? 0),
    disputeCount: Number(input.disputeCount ?? 0),
    evidenceCount: Number(input.evidenceCount ?? input.proof ?? 0),
    scale: input.scale || undefined
  });
}

export function toIssueOverview(input = {}) {
  return Object.freeze({
    id: String(input.id || ""),
    title: String(input.title || "이슈 확인 중"),
    status: String(input.status || "active"),
    lifecycleState: String(input.lifecycleState || "UNKNOWN"),
    regionCount: Number(input.regionCount ?? 0),
    occurrenceCount: Number(input.occurrenceCount ?? input.targetCount ?? 0),
    officialClaimCount: Number(input.officialClaimCount ?? input.officialCount ?? 0),
    publicVideoCount: Number(input.publicVideoCount ?? input.liveClaimCount ?? 0),
    disputeCount: Number(input.disputeCount ?? 0),
    latestUpdatedAt: input.latestUpdatedAt || input.updatedAt || undefined,
    representativeOccurrenceId: input.representativeOccurrenceId || undefined
  });
}

export function isOccurrenceDigest(value) {
  return Boolean(value && occurrenceTypes.has(value.targetType) && typeof value.id === "string" && value.id.length > 0);
}
