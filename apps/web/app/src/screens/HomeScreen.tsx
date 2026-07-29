import { MapPin } from "lucide-react";
import { useMemo } from "react";
import { useAppState } from "../app-state";
import { DataStatusNotice, EventTopicListItem, ScreenHeader, ServiceUnavailable } from "../components";
import { schedulePhase } from "../format";
import { Link } from "../router";

export function HomeScreen() {
  const { dataset, serviceSyncState } = useAppState();
  const approvedGroups = useMemo(() => dataset?.eventTopicGroups.filter((group) => group.status === "approved") || [], [dataset]);
  const candidateGroups = useMemo(() => dataset?.eventTopicGroups.filter((group) => group.status === "candidate") || [], [dataset]);
  const visibleGroups = useMemo(() => [...approvedGroups, ...candidateGroups], [approvedGroups, candidateGroups]);
  const visibleTopicCount = visibleGroups.length;
  const activeScheduleCounts = useMemo(() => (dataset?.occurrences || []).reduce((counts, occurrence) => {
    const phase = schedulePhase(occurrence);
    if (phase === "current") counts.current += 1;
    if (phase === "upcoming") counts.upcoming += 1;
    return counts;
  }, { current: 0, upcoming: 0 }), [dataset]);
  const activeScheduleCount = activeScheduleCounts.current + activeScheduleCounts.upcoming;
  return (
    <section className="screen screen-feed" data-screen="home">
      <ScreenHeader title="주요 이슈" eyebrow="전국 집회·시위" />
      <div className="feed-intro"><p>확인된 주제와 후보</p>{dataset ? <span>{visibleTopicCount}개</span> : <span className="feed-count-placeholder" aria-hidden="true" />}</div>
      {dataset && (serviceSyncState === "partial" || serviceSyncState === "stale") ? <DataStatusNotice state={serviceSyncState} lastSuccessfulAt={dataset.publicDataStatus?.lastSuccessfulAt} /> : null}
      {dataset && activeScheduleCount > 0 ? <nav className="home-schedule-summary" aria-label="현재 공개 일정 요약">
        <Link href="/explore"><strong>{activeScheduleCount}건</strong><span>진행·예정 일정</span></Link>
        <Link href="/explore"><strong>{activeScheduleCounts.current}건</strong><span>진행 중</span></Link>
        <Link href="/explore?topic=unknown"><strong>{dataset.topicUnknownActiveCount}건</strong><span>주제 확인 중</span></Link>
      </nav> : null}
      {!dataset && serviceSyncState === "loading" ? <HomeLoadingRows /> : null}
      {!dataset && serviceSyncState === "unavailable" ? <ServiceUnavailable /> : null}
      {dataset && visibleTopicCount === 0 ? <section className="home-zero-state" aria-label="현재 공개자료 현황">
        <h2>{activeScheduleCount > 0 ? "일정의 주제를 확인하고 있습니다" : "확인된 주요 이슈가 아직 없습니다"}</h2>
        <p>{activeScheduleCount > 0
          ? `경찰 공개자료에서 진행·예정 일정 ${activeScheduleCount}건을 확인했습니다. 목적을 뒷받침하는 근거가 모이면 같은 주제로 묶어 보여드립니다.`
          : "새 공개 일정과 주제 근거가 확인되면 이곳에 표시됩니다."}</p>
        <Link href="/explore" className="primary-button home-map-action"><MapPin aria-hidden="true" />지도에서 일정 보기</Link>
      </section> : null}
      <div className="issue-feed" aria-label="주요 집회 주제 목록">
        {visibleGroups.map((group) => <EventTopicListItem key={group.id} group={group} />)}
      </div>
      <nav className="home-trust-links" aria-label="서비스 정보"><span>서비스 정보</span><Link href="/methodology">방법론</Link><Link href="/transparency">투명성</Link><Link href="/privacy">개인정보</Link><Link href="/rights">정정·권리</Link></nav>
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
