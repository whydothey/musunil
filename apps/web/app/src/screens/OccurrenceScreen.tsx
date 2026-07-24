import { ArrowUpRight, FileText, MapPin, PlaySquare } from "lucide-react";
import { useEffect, useMemo } from "react";
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
  useEffect(() => {
    selectOccurrence(id);
    if (!Object.prototype.hasOwnProperty.call(dataset?.claimsByOccurrence || {}, id)) ensureOccurrence(id).catch(() => undefined);
  }, [id, selectOccurrence, ensureOccurrence, dataset?.claimsByOccurrence]);

  if (serviceSyncState === "loading") return <section className="screen screen-detail"><LoadingState /></section>;
  if (serviceSyncState === "unavailable") return <section className="screen screen-detail"><ServiceUnavailable /></section>;
  if (!occurrence) return <section className="screen screen-detail"><ScreenHeader title="현장을 찾을 수 없습니다" back /><EmptyState title="공개된 현장이 아닙니다" description="위치와 근거가 확인된 현장만 공개합니다." actionHref="/explore" actionLabel="지도에서 찾기" /></section>;

  return (
    <section className="screen screen-detail occurrence-detail" data-screen="occurrence">
      <ScreenHeader title={occurrenceDisplayTitle(occurrence)} eyebrow={issue?.title || occurrencePurposeLabel(occurrence)} back />
      <div className="occurrence-hero">
        <div className="hero-status"><ScheduleStatus occurrence={occurrence} /><span>자료 확인 · {formatRelativeTime(occurrence.updatedAt)}</span></div>
        <p>{occurrence.keyPoint || "공개자료와 현장 근거를 분리해 확인하고 있습니다."}</p>
      </div>

      <dl className="fact-list" aria-label="현장 핵심 정보">
        <FactRow
          label="주제"
          value={issue?.title || occurrencePurposeLabel(occurrence)}
          supporting={issue ? "공개 근거로 연결된 주요 이슈" : "공개자료의 목적 정보와 추가 근거를 확인하고 있습니다"}
        />
        <FactRow
          label="장소"
          value={occurrence.locationLabel || occurrence.regionLabel}
          supporting={`${locationPrecisionLabel(occurrence)}${occurrence.locationUncertaintyRadiusM ? ` · 약 ${formatRadius(occurrence.locationUncertaintyRadiusM)} 범위` : ""}${occurrence.fieldLocationEvidenceCount ? ` · 독립 현장 근거 ${occurrence.fieldLocationEvidenceCount}건` : ""}`}
        />
        <FactRow label="시간" value={formatDateTime(occurrence.startsAt)} supporting={occurrence.endsAt ? `${formatDateTime(occurrence.endsAt)}까지` : undefined} />
        {occurrence.declaredParticipantCount ? <FactRow label="신고서 기재 인원" value={`${occurrence.declaredParticipantCount.toLocaleString("ko-KR")}명`} supporting="경찰 공개 일정에 적힌 예정 인원이며 실제 현장 규모가 아닙니다" /> : null}
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
                <small>{source.granularity === "bulletin" ? "게시물 단위 예정 정보" : "개별 일정 정보"}{source.checkedAt ? ` · ${formatRelativeTime(source.checkedAt)} 확인` : ""} · 외부 사이트</small>
              </span>
              <ArrowUpRight aria-hidden="true" />
            </a>
          ))}
        </section>
      ) : null}

      <nav className="context-actions" aria-label="현장 관련 정보">
        {reels.length ? <Link href={`/reels?occurrence=${encodeURIComponent(id)}`}><PlaySquare /><span>영상 {reels.length}</span></Link> : <span className="context-action-unavailable" aria-disabled="true"><PlaySquare /><span>영상 없음</span></span>}
        <a href="#evidence"><FileText /><span>근거</span></a>
        <Link href={`/explore?occurrence=${encodeURIComponent(id)}`}><MapPin /><span>위치</span></Link>
      </nav>

      <section className="content-section" id="evidence" tabIndex={-1}>
        <div className="section-heading"><div><h2>근거와 주장</h2><p>누가 말했는지와 무엇으로 확인되는지 구분합니다</p></div></div>
        {detailState === "loading" || detailState === "idle" ? <LoadingState label="이 일정의 공개 근거를 확인하고 있습니다" /> : null}
        {detailState === "error" ? <ServiceUnavailable title="근거를 불러오지 못했습니다" description="일정 정보는 볼 수 있지만 근거 목록 연결을 다시 확인해야 합니다." /> : null}
        {detailState === "ready" && claims.length ? claims.map((claim) => (
          <article className="claim-row" key={claim.id}>
            <div className="claim-source"><span>{claim.claimantLabel}</span><time>{formatRelativeTime(claim.createdAt)}</time></div>
            <p>{claim.normalizedStatement}</p>
            <dl className="claim-meta"><div><dt>근거</dt><dd>{evidenceLabel(claim.evidenceStrength)}</dd></div><div><dt>공개</dt><dd>{riskLabel(claim.riskLevel)}</dd></div></dl>
          </article>
        )) : null}
        {detailState === "ready" && !claims.length ? <EmptyState title="공개된 근거 요약이 없습니다" description="원문을 그대로 노출하지 않고, 출처와 위험을 검토한 요약만 공개합니다." /> : null}
      </section>

      {issue ? <Link href={`/issues/${encodeURIComponent(issue.id)}`} className="related-issue-link"><span>관련 이슈</span><strong>{issue.title}</strong></Link> : null}
      <Link href={`/rights?targetType=occurrence&targetId=${encodeURIComponent(id)}`} className="rights-link"><span>이 정보에 대한 정정·반론·권리침해 안내</span></Link>
    </section>
  );
}

function formatRadius(radiusM: number) {
  return radiusM >= 1_000 ? `${Math.round(radiusM / 1_000)}km` : `${Math.round(radiusM / 100) * 100}m`;
}
