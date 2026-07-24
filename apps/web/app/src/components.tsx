import { ArrowLeft, ChevronRight, RefreshCw } from "lucide-react";
import type { ReactNode } from "react";
import { useAppState } from "./app-state";
import type { EventTopicGroup, IssueOverview, OccurrenceDigest } from "./contracts";
import { formatDateTime, formatRelativeTime, lifecycleLabel, lifecycleTone, occurrenceDisplayTitle, occurrenceTopicTitle, schedulePresentation } from "./format";
import { Link, useRouter } from "./router";

export function ScreenHeader({ title, eyebrow, back, trailing }: { title: string; eyebrow?: string; back?: boolean; trailing?: ReactNode }) {
  const { back: goBack } = useRouter();
  return (
    <header className="screen-header">
      <div className="screen-header-row">
        {back ? <button type="button" className="icon-button back-button" onClick={goBack} aria-label="뒤로"><ArrowLeft /></button> : null}
        <div className="screen-heading">
          {eyebrow ? <p className="eyebrow">{eyebrow}</p> : null}
          <h1>{title}</h1>
        </div>
        {trailing ? <div className="screen-trailing">{trailing}</div> : null}
      </div>
    </header>
  );
}

export function StatusDot({ state, label = true }: { state: OccurrenceDigest["lifecycleState"]; label?: boolean }) {
  return <span className={`status-label tone-${lifecycleTone(state)}`}><span className="status-dot" />{label ? lifecycleLabel(state) : null}</span>;
}

export function ScheduleStatus({ occurrence, now = Date.now() }: { occurrence: Pick<OccurrenceDigest, "startsAt" | "endsAt" | "lifecycleState" | "targetType">; now?: number }) {
  const status = schedulePresentation(occurrence, now);
  return <span className={`status-label tone-${status.tone}`}><span className="status-dot" />{status.label}</span>;
}

export function IssueListItem({ issue }: { issue: IssueOverview }) {
  const { selectIssue } = useAppState();
  return (
    <Link href={`/issues/${encodeURIComponent(issue.id)}`} onNavigate={() => selectIssue(issue.id)} className="issue-row" ariaLabel={`${issue.title} 상세 보기`}>
      <div className="issue-row-top">
        <span className={`bare-dot tone-${lifecycleTone(issue.lifecycleState)}`} aria-hidden="true" />
        <h2>{issue.title}</h2>
        <ChevronRight aria-hidden="true" />
      </div>
      <p className="issue-change">{issue.latestChange || `${formatRelativeTime(issue.latestUpdatedAt)} · 공개 근거를 확인했습니다`}</p>
      {issue.facets?.length ? <div className="issue-facet-chips" aria-label="근거에서 확인된 핵심 논점">
        {issue.facets.slice(0, 3).map((facet) => <span key={facet.coreTopicKey}>{facet.label}<small>{facet.evidenceCount}건</small></span>)}
      </div> : null}
      <p className="issue-meta">
        {issue.regionCount ? `${issue.regionCount}개 지역` : "지역 확인 중"}
        <span aria-hidden="true">·</span>
        {issue.occurrenceCount ? `현장 ${issue.occurrenceCount}곳` : "현장 확인 중"}
        <span aria-hidden="true">·</span>
        {issue.publicVideoCount ? `영상 ${issue.publicVideoCount}건` : "공개 영상 없음"}
        {issue.disputeCount ? <><span aria-hidden="true">·</span><strong>다른 주장 있음</strong></> : null}
      </p>
      {issue.synthesisEvidenceCount ? <p className="issue-provenance">근거 {issue.synthesisEvidenceCount}건 · 서로 다른 발행사 {issue.synthesisPublisherCount || 0}곳</p> : null}
    </Link>
  );
}

export function EventTopicListItem({ group }: { group: EventTopicGroup }) {
  const tone = group.currentCount > 0 ? "verified" : "pending";
  return (
    <Link href={`/event-topics/${encodeURIComponent(group.id)}`} className="issue-row event-topic-row" ariaLabel={`${group.title} 주제 상세 보기`}>
      <div className="issue-row-top">
        <span className={`bare-dot tone-${tone}`} aria-hidden="true" />
        <h2>{group.title}</h2>
        <ChevronRight aria-hidden="true" />
      </div>
      <p className="issue-meta">
        진행 {group.currentCount}건
        <span aria-hidden="true">·</span>
        예정 {group.upcomingCount}건
        <span aria-hidden="true">·</span>
        {group.regionCount}개 지역
      </p>
    </Link>
  );
}

export function OccurrenceListItem({ occurrence }: { occurrence: OccurrenceDigest }) {
  const { selectOccurrence } = useAppState();
  return (
    <Link href={`/occurrences/${encodeURIComponent(occurrence.id)}`} onNavigate={() => selectOccurrence(occurrence.id)} className="occurrence-row" ariaLabel={`${occurrence.title} 현장 보기`}>
      <div className="occurrence-row-head">
        <ScheduleStatus occurrence={occurrence} />
        <span>{formatRelativeTime(occurrence.updatedAt)}</span>
      </div>
      <h3>{occurrenceDisplayTitle(occurrence)}</h3>
      <p className="place-line">주제 · {occurrenceTopicTitle(occurrence)}</p>
      <p className="place-line">{occurrence.locationLabel || occurrence.regionLabel} · {formatDateTime(occurrence.startsAt)}</p>
      <ChevronRight className="row-chevron" aria-hidden="true" />
    </Link>
  );
}

export function LoadingState({ label = "공개 자료를 확인하고 있습니다" }: { label?: string }) {
  return <div className="state-view" role="status"><span className="loading-line" /><p>{label}</p></div>;
}

export function EmptyState({ title, description, actionHref, actionLabel }: { title: string; description: string; actionHref?: string; actionLabel?: string }) {
  return (
    <div className="state-view state-empty">
      <span className="empty-symbol" aria-hidden="true" />
      <h2>{title}</h2>
      <p>{description}</p>
      {actionHref && actionLabel ? <Link href={actionHref} className="text-action">{actionLabel}<ChevronRight /></Link> : null}
    </div>
  );
}

export function ServiceUnavailable({ title = "자료 연결을 확인하고 있습니다", description = "확인되지 않은 내용을 대신 표시하지 않습니다. 잠시 후 다시 확인해 주세요." }: { title?: string; description?: string } = {}) {
  const { retry } = useAppState();
  return (
    <div className="state-view state-empty">
      <span className="empty-symbol" aria-hidden="true" />
      <h2>{title}</h2>
      <p>{description}</p>
      <button type="button" className="text-action" onClick={retry}><RefreshCw />다시 확인</button>
    </div>
  );
}

export function FactRow({ label, value, supporting }: { label: string; value: string; supporting?: string }) {
  return <div className="fact-row"><dt>{label}</dt><dd><strong>{value}</strong>{supporting ? <span>{supporting}</span> : null}</dd></div>;
}
