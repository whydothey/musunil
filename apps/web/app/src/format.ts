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

export function schedulePhase(occurrence: Pick<OccurrenceDigest, "startsAt" | "endsAt" | "lifecycleState">, now = Date.now()): SchedulePhase {
  const startsAt = occurrence.startsAt ? new Date(occurrence.startsAt).getTime() : undefined;
  const endsAt = occurrence.endsAt ? new Date(occurrence.endsAt).getTime() : undefined;
  if (occurrence.lifecycleState === "CANCELED" || occurrence.lifecycleState === "ENDED" || occurrence.lifecycleState === "ARCHIVED" || (endsAt !== undefined && endsAt < now)) return "past";
  if (startsAt !== undefined && startsAt > now) return "upcoming";
  if (occurrence.lifecycleState === "UPCOMING" && startsAt === undefined) return "upcoming";
  return "current";
}

export function schedulePhaseLabel(phase: SchedulePhase) {
  return ({ past: "지난 일정", current: "진행 중", upcoming: "예정" } satisfies Record<SchedulePhase, string>)[phase];
}

export function formatRelativeTime(value?: string) {
  if (!value) return "최근 확인 시각 없음";
  const diffMinutes = Math.max(1, Math.round((Date.now() - new Date(value).getTime()) / 60_000));
  if (diffMinutes < 60) return `${diffMinutes}분 전 갱신`;
  const hours = Math.round(diffMinutes / 60);
  if (hours < 24) return `${hours}시간 전 갱신`;
  return new Intl.DateTimeFormat("ko-KR", { month: "long", day: "numeric" }).format(new Date(value));
}

export function formatDateTime(value?: string) {
  if (!value) return "일시 확인 중";
  return new Intl.DateTimeFormat("ko-KR", { month: "long", day: "numeric", weekday: "short", hour: "numeric", minute: "2-digit" }).format(new Date(value));
}

export function scaleLabel(occurrence: OccurrenceDigest) {
  if (!occurrence.scale) return "규모 확인 중";
  return `약 ${number(occurrence.scale.minCount)}~${number(occurrence.scale.maxCount)}명`;
}

export function evidenceLabel(strength: EvidenceStrength) {
  return ({
    none: "근거 확인 중",
    single_source: "단일 출처",
    multiple_sources: "복수 출처",
    multiple_proof_of_presence: "복수 현장 인증",
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

function number(value: number) {
  return new Intl.NumberFormat("ko-KR").format(value);
}
