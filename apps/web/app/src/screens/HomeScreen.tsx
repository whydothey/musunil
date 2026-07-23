import { useAppState } from "../app-state";
import { EmptyState, EventTopicListItem, ScreenHeader, ServiceUnavailable } from "../components";
import { Link } from "../router";

export function HomeScreen() {
  const { dataset, serviceSyncState } = useAppState();
  return (
    <section className="screen screen-feed" data-screen="home">
      <ScreenHeader title="주요 이슈" eyebrow="전국 집회·시위" />
      <div className="feed-intro"><p>진행·예정 일정에서 확인된 주제입니다</p>{dataset ? <span>{dataset.eventTopicGroups.length}개</span> : <span className="feed-count-placeholder" aria-hidden="true" />}</div>
      {!dataset && serviceSyncState === "loading" ? <HomeLoadingRows /> : null}
      {!dataset && serviceSyncState === "unavailable" ? <ServiceUnavailable /> : null}
      {dataset && dataset.eventTopicGroups.length === 0 && !dataset.topicUnknownActiveCount ? <EmptyState title="확인된 주요 주제가 없습니다" description="진행·예정 일정에 연결된 공개 근거가 확인되면 이곳에 표시합니다." actionHref="/explore" actionLabel="지역에서 찾기" /> : null}
      <div className="issue-feed" aria-label="주요 집회 주제 목록">
        {dataset?.eventTopicGroups.map((group) => <EventTopicListItem key={group.id} group={group} />)}
        {dataset?.topicUnknownActiveCount ? <Link href="/explore?topic=unknown" className="issue-row event-topic-row topic-unknown-row" ariaLabel={`주제 확인 중인 일정 ${dataset.topicUnknownActiveCount}건 지도에서 보기`}>
          <div className="issue-row-top">
            <span className="bare-dot" aria-hidden="true" />
            <h2>주제 확인 중</h2>
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
