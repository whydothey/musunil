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

export function pastMarkerOpacity(occurrence: Pick<OccurrenceDigest, "startsAt" | "endsAt" | "updatedAt" | "lifecycleState">, now = Date.now()): number {
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

export function occurrenceTopicTitle(occurrence: OccurrenceDigest) {
  return occurrence.issueTitle || occurrence.topicCandidate?.title || "집회 주제 확인 중";
}

export function occurrenceTopicContext(occurrence: OccurrenceDigest) {
  if (occurrence.issueTitle) return "확인된 주제 · 복수 근거 또는 운영 검토로 연결";
  if (occurrence.topicCandidate) return `주제 후보 · ${occurrence.topicCandidate.statusLabel}`;
  if (occurrence.topicStatus === "source_not_disclosed") return "주제 미확인 · 경찰 공개자료에는 집회 목적이 기재되지 않았습니다";
  return `주제 미확인 · ${occurrence.topicStatusLabel || "연결 가능한 목적 근거를 확인하고 있습니다"}`;
}

function number(value: number) {
  return new Intl.NumberFormat("ko-KR").format(value);
}
