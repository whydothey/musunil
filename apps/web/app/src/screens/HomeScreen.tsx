import { MapPin } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useAppState } from "../app-state";
import { EventTopicListItem, ScreenHeader, ServiceUnavailable } from "../components";
import { schedulePhase } from "../format";
import { Link } from "../router";

export function HomeScreen() {
  const { dataset, serviceSyncState } = useAppState();
  const [now, setNow] = useState(() => Date.now());
  const approvedGroups = useMemo(() => dataset?.eventTopicGroups.filter((group) => group.status === "approved") || [], [dataset]);
  const candidateGroups = useMemo(() => dataset?.eventTopicGroups.filter((group) => group.status === "candidate") || [], [dataset]);
  const activeCounts = useMemo(() => (dataset?.occurrences || []).reduce((counts, occurrence) => {
    const phase = schedulePhase(occurrence, now);
    if (phase === "current") counts.current += 1;
    if (phase === "upcoming") counts.upcoming += 1;
    return counts;
  }, { current: 0, upcoming: 0 }), [dataset, now]);
  useEffect(() => {
    const interval = window.setInterval(() => setNow(Date.now()), 60_000);
    return () => window.clearInterval(interval);
  }, []);
  const activeTotal = activeCounts.current + activeCounts.upcoming;
  return (
    <section className="screen screen-feed" data-screen="home">
      <ScreenHeader title="지금 확인된 집회·시위 주제" eyebrow="전국 공개자료" />
      <div className="home-service-copy">공개 근거에서 목적이 확인된 주제만 모아봅니다.</div>
      <div className="feed-intro"><p>확인된 주요 주제</p>{dataset ? <span>{approvedGroups.length}개</span> : <span className="feed-count-placeholder" aria-hidden="true" />}</div>
      {!dataset && serviceSyncState === "loading" ? <HomeLoadingRows /> : null}
      {!dataset && serviceSyncState === "unavailable" ? <ServiceUnavailable /> : null}
      {dataset && approvedGroups.length === 0 ? <section className="home-zero-state" aria-label="현재 공개자료 현황">
        <h2>확인된 주제는 아직 없습니다</h2>
        <p>{candidateGroups.length
          ? `진행 중 ${activeCounts.current}건·예정 ${activeCounts.upcoming}건을 확인하고 있으며, 일부 주제 후보는 근거 연결을 검토하고 있습니다.`
          : `진행 중 ${activeCounts.current}건·예정 ${activeCounts.upcoming}건의 장소와 시간을 확인하고 있으며, 목적 근거가 모이면 주제로 연결합니다.`}</p>
        <div className="home-zero-metrics"><span><strong>{activeCounts.current}</strong> 진행 중</span><span><strong>{activeCounts.upcoming}</strong> 예정</span><span><strong>{dataset.topicUnknownActiveCount}</strong> 목적 확인 중</span></div>
        <Link href="/explore" className="primary-button home-map-action"><MapPin aria-hidden="true" />지도에서 일정 {activeTotal}건 보기</Link>
      </section> : null}
      <div className="issue-feed" aria-label="주요 집회 주제 목록">
        {approvedGroups.map((group) => <EventTopicListItem key={group.id} group={group} />)}
        {candidateGroups.length ? <section className="candidate-topic-section" aria-label="검토 중인 주제 후보">
          <div className="candidate-topic-heading"><h2>검토 중인 주제 후보</h2><p>공개 근거에서 반복 확인됐지만 아직 주요 이슈로 승인되지 않았습니다.</p></div>
          {candidateGroups.map((group) => <EventTopicListItem key={group.id} group={group} />)}
        </section> : null}
        {approvedGroups.length > 0 && dataset?.topicUnknownActiveCount ? <Link href="/explore?topic=unknown" className="issue-row event-topic-row topic-unknown-row" ariaLabel={`목적 확인 중인 일정 ${dataset.topicUnknownActiveCount}건 지도에서 보기`}>
          <div className="issue-row-top">
            <span className="bare-dot" aria-hidden="true" />
            <h2>목적 확인 중인 일정</h2>
            <span className="row-count" aria-hidden="true">{dataset.topicUnknownActiveCount}</span>
          </div>
          <p className="issue-change">공개 일정에 목적이 기재되지 않아 장소·시간만 확인된 일정</p>
          <p className="issue-meta">진행·예정 일정만 지도에서 보기</p>
        </Link> : null}
      </div>
      <nav className="home-trust-links" aria-label="서비스 원칙과 권리 안내"><Link href="/methodology">방법론</Link><Link href="/transparency">투명성</Link><Link href="/privacy">개인정보</Link><Link href="/rights">정정·권리</Link></nav>
    </section>
  );
}

function HomeLoadingRows() {
  return <div className="home-loading-list" role="status" aria-label="공개 자료를 확인하고 있습니다">
    {[0, 1, 2].map((index) => <div key={index} className="issue-row home-skeleton-row" aria-hidden="true">
      <div className="skeleton-title" />
      <div className="skeleton-copy" />
      <div className="skeleton-meta" />
    </div>)}
  </div>;
}
