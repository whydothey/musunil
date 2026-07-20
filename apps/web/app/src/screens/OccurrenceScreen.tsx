import { ArrowUpRight, FileText, MapPin, PlaySquare } from "lucide-react";
import { useEffect, useMemo } from "react";
import { useAppState } from "../app-state";
import { EmptyState, FactRow, LoadingState, ScreenHeader, ServiceUnavailable, StatusDot } from "../components";
import { evidenceLabel, formatDateTime, formatRelativeTime, riskLabel, scaleLabel, sourceLabel } from "../format";
import { Link } from "../router";

export function OccurrenceScreen({ id }: { id: string }) {
  const { dataset, serviceSyncState, selectOccurrence, ensureOccurrence } = useAppState();
  const occurrence = dataset?.occurrences.find((item) => item.id === id);
  const claims = dataset?.claimsByOccurrence[id] || [];
  const issue = useMemo(() => dataset?.issues.find((item) => item.id === occurrence?.issueId), [dataset, occurrence]);
  const reels = useMemo(() => dataset?.reels.filter((item) => item.occurrenceId === id) || [], [dataset, id]);
  useEffect(() => {
    selectOccurrence(id);
    if (!Object.prototype.hasOwnProperty.call(dataset?.claimsByOccurrence || {}, id)) ensureOccurrence(id).catch(() => undefined);
  }, [id, selectOccurrence, ensureOccurrence, dataset?.claimsByOccurrence]);

  if (serviceSyncState === "loading") return <section className="screen screen-detail"><LoadingState /></section>;
  if (serviceSyncState === "unavailable") return <section className="screen screen-detail"><ServiceUnavailable /></section>;
  if (!occurrence) return <section className="screen screen-detail"><ScreenHeader title="현장을 찾을 수 없습니다" back /><EmptyState title="공개된 현장이 아닙니다" description="위치와 근거가 확인된 현장만 공개합니다." actionHref="/explore" actionLabel="지도에서 찾기" /></section>;

  return (
    <section className="screen screen-detail occurrence-detail" data-screen="occurrence">
      <ScreenHeader title={occurrence.title} eyebrow={issue?.title || "집회 현장"} back />
      <div className="occurrence-hero">
        <div className="hero-status"><StatusDot state={occurrence.lifecycleState} /><span>{formatRelativeTime(occurrence.updatedAt)}</span></div>
        <p>{occurrence.keyPoint || "공개자료와 현장 근거를 분리해 확인하고 있습니다."}</p>
      </div>

      <dl className="fact-list" aria-label="현장 핵심 정보">
        <FactRow label="장소" value={occurrence.locationLabel || occurrence.regionLabel} supporting="자료에 공개된 위치" />
        <FactRow label="시간" value={formatDateTime(occurrence.startsAt)} supporting={occurrence.endsAt ? `${formatDateTime(occurrence.endsAt)}까지` : undefined} />
        <FactRow label="규모" value={scaleLabel(occurrence)} supporting={occurrence.scale ? `공개 근거 ${occurrence.evidenceCount}건 기준` : "확인 가능한 근거가 더 필요합니다"} />
        <FactRow label="근거" value={evidenceLabel(occurrence.evidenceStrength)} supporting={`공식 자료 ${occurrence.officialClaimCount}건 · 현장 영상 ${occurrence.publicVideoCount}건`} />
      </dl>

      {occurrence.officialSources?.length ? (
        <section className="official-source-list" aria-label="경찰 공개자료 원문">
          {occurrence.officialSources.map((source) => (
            <a key={source.sourceUrl} href={source.sourceUrl} target="_blank" rel="noreferrer" className="official-source-link">
              <FileText aria-hidden="true" />
              <span>
                <strong>{source.label}</strong>
                <small>{source.granularity === "bulletin" ? "게시물 단위 예정 정보" : "개별 일정 정보"}{source.checkedAt ? ` · ${formatRelativeTime(source.checkedAt)} 확인` : ""}</small>
              </span>
              <ArrowUpRight aria-hidden="true" />
            </a>
          ))}
        </section>
      ) : null}

      <nav className="context-actions" aria-label="현장 관련 정보">
        <Link href={`/reels?occurrence=${encodeURIComponent(id)}`}><PlaySquare /><span>영상{reels.length ? ` ${reels.length}` : ""}</span></Link>
        <a href="#evidence"><FileText /><span>근거</span></a>
        <Link href={`/explore?occurrence=${encodeURIComponent(id)}`}><MapPin /><span>위치</span></Link>
      </nav>

      <section className="content-section" id="evidence" tabIndex={-1}>
        <div className="section-heading"><div><h2>근거와 주장</h2><p>누가 말했는지와 무엇으로 확인되는지 구분합니다</p></div></div>
        {claims.length ? claims.map((claim) => (
          <article className="claim-row" key={claim.id}>
            <div className="claim-source"><span>{sourceLabel(claim.sourceProvenance)}</span><time>{formatRelativeTime(claim.createdAt)}</time></div>
            <p>{claim.normalizedStatement}</p>
            <dl className="claim-meta"><div><dt>근거</dt><dd>{evidenceLabel(claim.evidenceStrength)}</dd></div><div><dt>공개</dt><dd>{riskLabel(claim.riskLevel)}</dd></div></dl>
          </article>
        )) : <EmptyState title="공개된 Claim이 없습니다" description="원문을 직접 노출하지 않고 검토된 요약만 공개합니다." />}
      </section>

      {issue ? <Link href={`/issues/${encodeURIComponent(issue.id)}`} className="related-issue-link"><span>관련 이슈</span><strong>{issue.title}</strong></Link> : null}
    </section>
  );
}
