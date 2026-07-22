import { useAppState } from "../app-state";
import { EmptyState, LoadingState, ScreenHeader, ServiceUnavailable } from "../components";
import { Link } from "../router";

export function HomeScreen() {
  const { dataset, serviceSyncState } = useAppState();
  return (
    <section className="screen screen-feed" data-screen="home">
      <ScreenHeader title="주요 이슈" eyebrow="전국 집회·시위" />
      <div className="feed-intro"><p>공개 근거로 연결된 진행·예정 집회 주제입니다</p><span>{dataset?.eventTopicGroups.length || 0}개</span></div>
      {serviceSyncState === "loading" ? <LoadingState /> : null}
      {serviceSyncState === "unavailable" ? <ServiceUnavailable /> : null}
      {dataset && dataset.eventTopicGroups.length === 0 ? <EmptyState title="확인된 주요 주제가 없습니다" description="진행·예정 일정에 연결된 공개 근거가 확인되면 이곳에 표시합니다." actionHref="/explore" actionLabel="지역에서 찾기" /> : null}
      <div className="issue-feed" aria-label="주요 집회 주제 목록">
        {dataset?.eventTopicGroups.map((group) => <Link key={group.id} href={`/event-topics/${encodeURIComponent(group.id)}`} className={`event-topic-card status-${group.status}`}>
          <span className="event-topic-status">{group.statusLabel}</span>
          <h2>{group.title}</h2>
          <p>진행 {group.currentCount}건 · 예정 {group.upcomingCount}건 · {group.regionCount}개 지역</p>
          <small>개별 일정 {group.occurrenceCount}건 · 공개 근거 {group.evidenceCount}건</small>
        </Link>)}
      </div>
      {dataset?.topicUnknownActiveCount ? <div className="topic-unknown-callout"><strong>주제 확인 중 {dataset.topicUnknownActiveCount}건</strong><p>경찰 공개 일정에 목적이 기재되지 않아 장소·시간만 확인된 일정입니다.</p><Link href="/explore">지도에서 일정 보기</Link></div> : null}
      <nav className="home-trust-links" aria-label="서비스 원칙과 권리 안내"><Link href="/methodology">방법론</Link><Link href="/transparency">투명성</Link><Link href="/privacy">개인정보</Link><Link href="/rights">정정·권리</Link></nav>
    </section>
  );
}
