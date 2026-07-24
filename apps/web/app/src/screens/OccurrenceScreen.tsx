import { ArrowUpRight, FileText, MapPin, PlaySquare } from "lucide-react";
import { useEffect, useMemo, useRef } from "react";
import { useAppState } from "../app-state";
import { EmptyState, FactRow, LoadingState, ScheduleStatus, ScreenHeader, ServiceUnavailable } from "../components";
import { evidenceLabel, formatDateTime, formatRelativeTime, locationPrecisionLabel, occurrenceDisplayTitle, occurrencePurposeLabel, riskLabel, scaleLabel } from "../format";
import { Link } from "../router";

export function OccurrenceScreen({ id }: { id: string }) {
  const { dataset, serviceSyncState, occurrenceDetailStates, selectOccurrence, ensureOccurrence } = useAppState();
  const occurrence = dataset?.occurrences.find((item) => item.id === id);
  const claims = dataset?.claimsByOccurrence[id] || [];
  const hasClaimPayload = Object.prototype.hasOwnProperty.call(dataset?.claimsByOccurrence || {}, id);
  const detailState = occurrenceDetailStates[id] || (hasClaimPayload ? "ready" : "idle");
  const issue = useMemo(() => dataset?.issues.find((item) => item.id === occurrence?.issueId), [dataset, occurrence]);
  const reels = useMemo(() => dataset?.reels.filter((item) => item.occurrenceId === id) || [], [dataset, id]);
  const evidenceRef = useRef<HTMLDetailsElement>(null);
  useEffect(() => {
    selectOccurrence(id);
    if (!Object.prototype.hasOwnProperty.call(dataset?.claimsByOccurrence || {}, id)) ensureOccurrence(id).catch(() => undefined);
  }, [id, selectOccurrence, ensureOccurrence, dataset?.claimsByOccurrence]);
  useEffect(() => {
    if (window.location.hash !== "#evidence" || !evidenceRef.current) return;
    evidenceRef.current.open = true;
    window.requestAnimationFrame(() => evidenceRef.current?.focus());
  }, [id, occurrence]);

  if (serviceSyncState === "loading") return <section className="screen screen-detail"><LoadingState /></section>;
  if (serviceSyncState === "unavailable") return <section className="screen screen-detail"><ServiceUnavailable /></section>;
  if (!occurrence) return <section className="screen screen-detail"><ScreenHeader title="현장을 찾을 수 없습니다" back /><EmptyState title="공개된 현장이 아닙니다" description="위치와 근거가 확인된 현장만 공개합니다." actionHref="/explore" actionLabel="지도에서 찾기" /></section>;

  return (
    <section className="screen screen-detail occurrence-detail" data-screen="occurrence">
      <ScreenHeader title={occurrenceDisplayTitle(occurrence)} eyebrow={issue?.title || occurrencePurposeLabel(occurrence)} back />
      <div className="occurrence-hero">
        <div className="hero-status"><ScheduleStatus occurrence={occurrence} /></div>
        {occurrence.keyPoint ? <p>{occurrence.keyPoint}</p> : null}
      </div>

      <dl className="fact-list" aria-label="현장 핵심 정보">
        <FactRow
          label="주제"
          value={issue?.title || occurrencePurposeLabel(occurrence)}
        />
        <FactRow
          label="장소"
          value={occurrence.locationLabel || occurrence.regionLabel}
        />
        <FactRow label="시간" value={formatDateTime(occurrence.startsAt)} supporting={occurrence.endsAt ? `${formatDateTime(occurrence.endsAt)}까지` : undefined} />
        {occurrence.declaredParticipantCount ? <FactRow label="신고 인원" value={`${occurrence.declaredParticipantCount.toLocaleString("ko-KR")}명`} supporting="신고 기준 · 실제 인원과 다를 수 있음" /> : null}
        {occurrence.scale ? <FactRow label="규모" value={scaleLabel(occurrence)} /> : null}
      </dl>

      <nav className="context-actions" aria-label="현장 관련 정보">
        {reels.length ? <Link href={`/reels?occurrence=${encodeURIComponent(id)}`}><PlaySquare /><span>영상 {reels.length}</span></Link> : null}
        <Link href={`/explore?occurrence=${encodeURIComponent(id)}`}><MapPin /><span>지도</span></Link>
      </nav>

      <details className="evidence-disclosure" id="evidence" ref={evidenceRef} tabIndex={-1}>
        <summary><FileText aria-hidden="true" /><span>근거 {Math.max(occurrence.evidenceCount, claims.length)}건 보기</span></summary>
        <div className="evidence-disclosure-content">
          <dl className="evidence-summary">
            <div><dt>위치</dt><dd>{locationPrecisionLabel(occurrence)}{occurrence.locationUncertaintyRadiusM ? ` · 약 ${formatRadius(occurrence.locationUncertaintyRadiusM)} 범위` : ""}</dd></div>
            <div><dt>확인</dt><dd>{evidenceLabel(occurrence.evidenceStrength)} · {formatRelativeTime(occurrence.updatedAt)} 갱신</dd></div>
          </dl>
          {occurrence.officialSources?.length ? (
            <section className="official-source-list" aria-label="공식 원문">
              {occurrence.officialSources.map((source) => (
                <a key={source.sourceUrl} href={source.sourceUrl} target="_blank" rel="noreferrer" className="official-source-link">
                  <FileText aria-hidden="true" />
                  <span><strong>{source.label}</strong><small>공식 원문 · 외부 사이트</small></span>
                  <ArrowUpRight aria-hidden="true" />
                </a>
              ))}
            </section>
          ) : null}
          {detailState === "loading" || detailState === "idle" ? <LoadingState label="근거를 불러오는 중입니다" /> : null}
          {detailState === "error" ? <ServiceUnavailable title="근거를 불러오지 못했습니다" description="잠시 후 다시 확인해 주세요." /> : null}
          {detailState === "ready" && claims.length ? <section className="claim-list" aria-label="출처별 내용">{claims.map((claim) => (
            <article className="claim-row" key={claim.id}>
              <div className="claim-source"><span>{claim.claimantLabel}</span><time>{formatRelativeTime(claim.createdAt)}</time></div>
              <p>{claim.normalizedStatement}</p>
              <dl className="claim-meta"><div><dt>근거</dt><dd>{evidenceLabel(claim.evidenceStrength)}</dd></div><div><dt>공개</dt><dd>{riskLabel(claim.riskLevel)}</dd></div></dl>
            </article>
          ))}</section> : null}
          {detailState === "ready" && !claims.length ? <EmptyState title="공개된 근거가 없습니다" description="검토된 요약이 생기면 표시합니다." /> : null}
        </div>
      </details>

      {issue ? <Link href={`/issues/${encodeURIComponent(issue.id)}`} className="related-issue-link"><span>관련 이슈</span><strong>{issue.title}</strong></Link> : null}
      <Link href={`/rights?targetType=occurrence&targetId=${encodeURIComponent(id)}`} className="rights-link"><span>이 정보에 대한 정정·반론·권리침해 안내</span></Link>
    </section>
  );
}

function formatRadius(radiusM: number) {
  return radiusM >= 1_000 ? `${Math.round(radiusM / 1_000)}km` : `${Math.round(radiusM / 100) * 100}m`;
}
