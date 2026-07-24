import type { EvidenceStrength, LifecycleState, OccurrenceDigest, RiskLevel } from "./contracts";

export function lifecycleLabel(state: LifecycleState) {
  return ({
    LIVE: "진행 확인",
    UPCOMING: "예정",
    STARTING_SOON: "곧 시작",
    ONGOING_SERIES: "계속 확인",
    PAUSED: "일시 중단",
    ENDED: "종료",
    ARCHIVED: "기록",
    CANCELED: "취소",
    POSTPONED: "연기",
    UNKNOWN: "확인 중"
  } satisfies Record<LifecycleState, string>)[state];
}

export function lifecycleTone(state: LifecycleState) {
  if (state === "LIVE" || state === "ONGOING_SERIES") return "verified";
  if (state === "UPCOMING" || state === "STARTING_SOON") return "pending";
  if (state === "CANCELED" || state === "POSTPONED") return "hold";
  return "neutral";
}

export type SchedulePhase = "past" | "current" | "upcoming";

export type SchedulePresentation = {
  phase: SchedulePhase;
  label: string;
  tone: "verified" | "pending" | "hold" | "neutral";
};

export function schedulePresentation(
  occurrence: Pick<OccurrenceDigest, "startsAt" | "endsAt" | "lifecycleState" | "targetType">,
  now = Date.now()
): SchedulePresentation {
  if (occurrence.lifecycleState === "CANCELED") return { phase: "past", label: "취소", tone: "hold" };
  if (occurrence.lifecycleState === "POSTPONED") return { phase: "upcoming", label: "연기", tone: "hold" };
  if (occurrence.lifecycleState === "PAUSED") return { phase: "current", label: "일시 중단", tone: "hold" };
  if (occurrence.lifecycleState === "ARCHIVED" || occurrence.lifecycleState === "ENDED") {
    return { phase: "past", label: "지난 일정", tone: "neutral" };
  }
  const startsAt = occurrence.startsAt ? new Date(occurrence.startsAt).getTime() : undefined;
  const endsAt = occurrence.endsAt ? new Date(occurrence.endsAt).getTime() : undefined;
  if (endsAt !== undefined && endsAt < now) return { phase: "past", label: "지난 일정", tone: "neutral" };
  if (startsAt !== undefined && startsAt > now) return { phase: "upcoming", label: "예정", tone: "pending" };
  if (occurrence.lifecycleState === "UPCOMING" && startsAt === undefined) return { phase: "upcoming", label: "예정", tone: "pending" };
  if (occurrence.targetType === "continuous_presence" || occurrence.lifecycleState === "ONGOING_SERIES") return { phase: "current", label: "계속 확인", tone: "verified" };
  if (startsAt !== undefined && startsAt + 12 * 60 * 60_000 < now) return { phase: "past", label: "지난 일정", tone: "neutral" };
  return { phase: "current", label: "진행 중", tone: "verified" };
}

export function schedulePhase(occurrence: Pick<OccurrenceDigest, "startsAt" | "endsAt" | "lifecycleState" | "targetType">, now = Date.now()): SchedulePhase {
  return schedulePresentation(occurrence, now).phase;
}

export function schedulePhaseLabel(phase: SchedulePhase) {
  return ({ past: "지난 일정", current: "진행 중", upcoming: "예정" } satisfies Record<SchedulePhase, string>)[phase];
}

export function pastMarkerOpacity(occurrence: Pick<OccurrenceDigest, "startsAt" | "endsAt" | "updatedAt" | "lifecycleState" | "targetType">, now = Date.now()): number {
  if (schedulePhase(occurrence, now) !== "past") return 1;
  const referenceTime = occurrence.endsAt ? new Date(occurrence.endsAt).getTime() : occurrence.startsAt ? new Date(occurrence.startsAt).getTime() : occurrence.updatedAt ? new Date(occurrence.updatedAt).getTime() : undefined;
  if (referenceTime === undefined || !Number.isFinite(referenceTime)) return 0.3;
  const koreaNow = new Date(now + 9 * 60 * 60 * 1000);
  const cutoff = Date.UTC(koreaNow.getUTCFullYear(), koreaNow.getUTCMonth(), koreaNow.getUTCDate() - 6) - 9 * 60 * 60 * 1000;
  const ageRatio = Math.max(0, Math.min(1, (now - referenceTime) / Math.max(1, now - cutoff)));
  return Number((0.9 - ageRatio * 0.6).toFixed(3));
}

export function formatRelativeTime(value?: string) {
  if (!value) return "최근 확인 시각 없음";
  const parsed = new Date(value).getTime();
  if (!Number.isFinite(parsed)) return "확인 시각 점검 중";
  const diff = Date.now() - parsed;
  if (diff < -5 * 60_000) return "확인 시각 점검 중";
  const diffMinutes = Math.max(1, Math.round(diff / 60_000));
  if (diffMinutes < 60) return `${diffMinutes}분 전 갱신`;
  const hours = Math.round(diffMinutes / 60);
  if (hours < 24) return `${hours}시간 전 갱신`;
  return new Intl.DateTimeFormat("ko-KR", { month: "long", day: "numeric" }).format(new Date(value));
}

export function formatDateTime(value?: string) {
  if (!value) return "일시 확인 중";
  return new Intl.DateTimeFormat("ko-KR", { month: "long", day: "numeric", weekday: "short", hour: "numeric", minute: "2-digit" }).format(new Date(value));
}

export function formatOfficialDate(value?: string) {
  if (!value) return "날짜 확인 중";
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return "날짜 확인 중";
  return new Intl.DateTimeFormat("ko-KR", { year: "numeric", month: "long", day: "numeric" }).format(date);
}

export function scaleLabel(occurrence: OccurrenceDigest) {
  if (!occurrence.scale) return "규모 확인 중";
  return `약 ${number(occurrence.scale.minCount)}~${number(occurrence.scale.maxCount)}명`;
}

export function evidenceLabel(strength: EvidenceStrength) {
  return ({
    none: "확인 자료 없음",
    single_source: "한 곳의 출처",
    multiple_sources: "서로 다른 출처",
    multiple_proof_of_presence: "여러 현장 인증",
    media_time_location_crosscheck: "시각·위치 교차 확인",
    independent_sources_with_field_evidence: "독립 출처·현장 근거"
  } satisfies Record<EvidenceStrength, string>)[strength];
}

export function riskLabel(risk: RiskLevel) {
  return ({
    low: "일반 공개",
    misleading_possible: "맥락 확인 필요",
    rights_risk: "권리 검토",
    high_legal_privacy_risk: "제한 공개",
    must_hold_private: "공개 보류"
  } satisfies Record<RiskLevel, string>)[risk];
}

export function sourceLabel(source: string) {
  return ({
    government_or_police: "관계 기관",
    organizer_or_group: "주최 측",
    verified_citizen_report: "현장 영상",
    rebuttal: "다른 주장",
    media_report: "보도 자료",
    musunil_ai_estimate: "자동 추정"
  } as Record<string, string>)[source] || "출처 확인 중";
}

export function occurrenceSummary(occurrence: OccurrenceDigest) {
  const parts = [occurrence.regionLabel, lifecycleLabel(occurrence.lifecycleState), scaleLabel(occurrence)];
  return parts.join(" · ");
}

export function occurrenceTopicTitle(occurrence: OccurrenceDigest) {
  return occurrence.issueTitle || occurrence.topicCandidate?.title || "목적 확인 중";
}

export function occurrenceDisplayTitle(occurrence: OccurrenceDigest) {
  return occurrence.title;
}

export function occurrencePurposeLabel(occurrence: OccurrenceDigest) {
  if (occurrence.issueTitle) return "확인된 주제";
  if (occurrence.topicCandidate) return "검토 중인 주제 후보";
  return "목적 확인 중";
}

export function occurrenceTopicContext(occurrence: OccurrenceDigest) {
  if (occurrence.issueTitle) return "확인된 주제 · 공개 근거와 운영 검토로 연결";
  if (occurrence.topicCandidate) return `검토 중인 주제 후보 · ${occurrence.topicCandidate.statusLabel}`;
  if (occurrence.topicStatus === "source_not_disclosed") return "목적 확인 중 · 경찰 공개자료에 집회 목적이 적혀 있지 않습니다";
  return `목적 확인 중 · ${occurrence.topicStatusLabel || "연결 가능한 목적 근거를 확인하고 있습니다"}`;
}

export function locationPrecisionLabel(occurrence: Pick<OccurrenceDigest, "locationStatus" | "locationUncertaintyRadiusM" | "fieldLocationEvidenceCount">) {
  if (occurrence.locationStatus === "LOCATION_DISPUTED") return "위치 확인 필요";
  if (occurrence.fieldLocationEvidenceCount || occurrence.locationStatus === "FIELD_CORROBORATED" || occurrence.locationStatus === "CORRECTED") return "현장 근거로 위치 확인";
  const radius = occurrence.locationUncertaintyRadiusM || 0;
  if (radius > 15_000) return "권역 추정";
  if (radius > 1_500) return "넓은 범위 추정";
  if (occurrence.locationStatus === "SOURCE_GEOCODED") return "공개자료 위치";
  return "좌표 확인 중";
}

export function lawStagePresentation(stage: string) {
  const normalized = stage.replace(/\s+/g, "");
  if (normalized === "접수") return { label: "국회에 접수됨", description: "발의된 의안이 국회 절차에 들어온 단계입니다.", step: 0 };
  if (normalized === "소관위접수" || normalized.includes("위원회접수")) return { label: "소관 상임위원회에 전달됨", description: "관련 상임위원회가 의안을 넘겨받은 단계입니다.", step: 1 };
  if (normalized.includes("위원회심사") || normalized.includes("심사중")) return { label: "상임위원회에서 심사 중", description: "상임위원회가 내용과 처리 여부를 검토하는 단계입니다.", step: 1 };
  if (normalized.includes("본회의")) return { label: "본회의 단계", description: "국회 본회의의 심의·의결 절차에 놓인 단계입니다.", step: 2 };
  if (normalized.includes("공포") || normalized.includes("시행")) return { label: "공포·시행 단계", description: "의결 이후 공포되었거나 시행 중인 단계입니다.", step: 3 };
  return { label: stage || "진행 단계 확인 중", description: "공식 자료에 표시된 현재 처리 단계를 확인하고 있습니다.", step: -1 };
}

function number(value: number) {
  return new Intl.NumberFormat("ko-KR").format(value);
}
