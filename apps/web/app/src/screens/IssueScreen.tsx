import { ExternalLink, FileText, MapPin, Newspaper, PlaySquare, Scale } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useAppState } from "../app-state";
import { EmptyState, LoadingState, OccurrenceListItem, ScreenHeader, ServiceUnavailable, StatusDot } from "../components";
import { evidenceLabel, formatRelativeTime, riskLabel } from "../format";
import { Link } from "../router";

type IssueTab = "occurrences" | "videos" | "evidence" | "laws";
const tabs: Array<{ id: IssueTab; label: string }> = [
  { id: "occurrences", label: "현장" },
  { id: "videos", label: "영상" },
  { id: "evidence", label: "근거" },
  { id: "laws", label: "법안" }
];

export function IssueScreen({ id }: { id: string }) {
  const { dataset, serviceSyncState, issueDetailStates, selectIssue, ensureIssue } = useAppState();
  const [tab, setTab] = useState<IssueTab>("occurrences");
  const issue = dataset?.issues.find((item) => item.id === id);
  const occurrences = useMemo(() => dataset?.occurrences.filter((item) => item.issueId === id || item.issueIds?.includes(id)) || [], [dataset, id]);
  const reels = useMemo(() => dataset?.reels.filter((item) => item.issueId === id) || [], [dataset, id]);
  const lawGroups = dataset?.lawGroupsByIssue[id] || [];
  const synthesis = dataset?.synthesisByIssue[id];
  const claims = dataset?.claimsByIssue[id] || [];
  const news = dataset?.newsByIssue[id] || [];
  const hasClaimPayload = Object.prototype.hasOwnProperty.call(dataset?.claimsByIssue || {}, id);
  const detailState = issueDetailStates[id] || (hasClaimPayload ? "ready" : "idle");
  useEffect(() => {
    selectIssue(id);
    if (!Object.prototype.hasOwnProperty.call(dataset?.claimsByIssue || {}, id)) ensureIssue(id).catch(() => undefined);
  }, [id, selectIssue, ensureIssue, dataset?.claimsByIssue]);

  if (serviceSyncState === "loading") return <section className="screen screen-detail"><LoadingState /></section>;
  if (serviceSyncState === "unavailable") return <section className="screen screen-detail"><ServiceUnavailable /></section>;
  if (!issue) return <section className="screen screen-detail"><ScreenHeader title="이슈를 찾을 수 없습니다" back /><EmptyState title="공개된 이슈가 아닙니다" description="주소를 다시 확인하거나 홈에서 다른 이슈를 선택해 주세요." actionHref="/" actionLabel="홈으로" /></section>;

  return (
    <section className="screen screen-detail" data-screen="issue">
      <ScreenHeader title={issue.title} eyebrow="주요 이슈" back />
      <div className="issue-hero">
        <div className="hero-status"><StatusDot state={issue.lifecycleState} /></div>
        <p>{issue.latestChange || `${issue.regionCount}개 지역의 공개 현장을 확인하고 있습니다.`}</p>
        <div className="hero-summary" aria-label="이슈 현황">
          <span><strong>{issue.occurrenceCount}</strong> 현장</span>
          <span><strong>{issue.regionCount}</strong> 지역</span>
          <span><strong>{issue.publicVideoCount}</strong> 영상</span>
          {issue.disputeCount ? <span className="has-dispute">다른 주장 있음</span> : null}
        </div>
        {synthesis?.facets.length ? <details className="topic-method-disclosure"><summary>핵심 논점 {synthesis.facets.length}개</summary><div className="issue-facet-list">{synthesis.facets.map((facet) => <span key={facet.coreTopicKey}>{facet.label}</span>)}</div><p>공개 근거에서 반복 확인된 탐색 기준이며 사실 확정이나 찬반 판단이 아닙니다.</p></details> : null}
      </div>

      <div className="detail-tabs" role="tablist" aria-label="이슈 정보">
        {tabs.map((item) => <button key={item.id} type="button" role="tab" aria-selected={tab === item.id} onClick={() => setTab(item.id)}>{item.label}</button>)}
      </div>

      <div className="detail-tab-panel" role="tabpanel">
        {tab === "occurrences" ? (
          <div className="section-list">
            <div className="section-heading"><div><h2>전국 현장</h2></div><MapPin aria-hidden="true" /></div>
            {occurrences.length ? occurrences.map((occurrence) => <OccurrenceListItem key={occurrence.id} occurrence={occurrence} />) : <EmptyState title="공개된 현장이 없습니다" description="위치와 근거가 확인된 현장부터 표시합니다." />}
          </div>
        ) : null}

        {tab === "videos" ? (
          <div className="section-list">
            <div className="section-heading"><div><h2>현장 영상</h2></div><PlaySquare aria-hidden="true" /></div>
            {reels.length ? reels.map((reel) => (
              <Link key={reel.id} href={`/reels?issue=${encodeURIComponent(id)}&reel=${encodeURIComponent(reel.id)}`} className="video-list-row">
                <img src={reel.media.redactedPosterUrl} alt="비식별 처리된 현장 영상 미리보기" />
                <div><strong>{reel.occurrenceTitle}</strong><span>{reel.regionLabel} · 공개 반경 {reel.publicRadiusM}m</span></div>
                <PlaySquare aria-hidden="true" />
              </Link>
            )) : <EmptyState title="공개된 현장 영상이 없습니다" description="현장성과 비식별 검토를 통과한 영상만 공개합니다." />}
          </div>
        ) : null}

        {tab === "evidence" ? (
          <div className="section-list evidence-section">
            <div className="section-heading"><div><h2>확인 근거</h2></div><FileText aria-hidden="true" /></div>
            {detailState === "loading" || detailState === "idle" ? <LoadingState label="이 주제의 공개 근거를 확인하고 있습니다" /> : null}
            {detailState === "error" ? <ServiceUnavailable title="근거를 불러오지 못했습니다" description="주제 정보는 볼 수 있지만 근거 목록 연결을 다시 확인해야 합니다." /> : null}
            {detailState === "ready" && claims.length ? claims.map((claim) => (
              <article className="claim-row" key={claim.id}>
                <div className="claim-source"><span>{claim.claimantLabel}</span><time>{formatRelativeTime(claim.createdAt)}</time></div>
                <p>{claim.normalizedStatement}</p>
                <dl className="claim-meta"><div><dt>근거</dt><dd>{evidenceLabel(claim.evidenceStrength)}</dd></div><div><dt>공개</dt><dd>{riskLabel(claim.riskLevel)}</dd></div></dl>
              </article>
            )) : null}
            {detailState === "ready" && !claims.length ? <EmptyState title="공개된 근거 요약이 없습니다" description="출처와 공개 위험을 검토한 요약만 표시합니다." /> : null}
            {news.length ? <section className="issue-news-section" aria-labelledby="issue-news-heading">
              <div className="section-heading"><div><h3 id="issue-news-heading">관련 언론 보도</h3></div><Newspaper aria-hidden="true" /></div>
              <div className="news-link-list">{news.map((article) => (
                <a key={article.id} href={article.sourceUrl} target="_blank" rel="noopener noreferrer" className="news-link-row">
                  <span><strong>{article.headline}</strong><small>{article.summary} · {article.publisherLabel} · {new Date(article.publishedAt).toLocaleDateString("ko-KR")}</small></span><ExternalLink aria-hidden="true" />
                </a>
              ))}</div>
            </section> : null}
          </div>
        ) : null}

        {tab === "laws" ? (
          <div className="section-list">
            <div className="section-heading"><div><h2>관련 법안</h2></div><Scale aria-hidden="true" /></div>
            {lawGroups.length ? lawGroups.map((group) => (
              <Link key={group.id} href={`/laws/groups/${encodeURIComponent(group.id)}`} className="law-inline-row">
                <span>국회 공식 법안 그룹</span>
                <h3>{group.billTitle}</h3>
                <p>동일 이름 의안 {group.billCount}건 · 관련 논점 {group.coreTopics.length}개</p>
              </Link>
            )) : <EmptyState title="연결된 법안이 없습니다" description="공식 법안 정보와 이슈의 연결 근거가 확인되면 표시합니다." actionHref="/laws" actionLabel="법안 전체 보기" />}
          </div>
        ) : null}
      </div>
      <Link href={`/rights?targetType=issue&targetId=${encodeURIComponent(id)}`} className="rights-link"><span>이 주제에 대한 정정·반론·권리침해 안내</span></Link>
    </section>
  );
}
