import { MapPin } from "lucide-react";
import { useMemo } from "react";
import { useAppState } from "../app-state";
import { EventTopicListItem, ScreenHeader, ServiceUnavailable } from "../components";
import { Link } from "../router";

export function HomeScreen() {
  const { dataset, serviceSyncState } = useAppState();
  const approvedGroups = useMemo(() => dataset?.eventTopicGroups.filter((group) => group.status === "approved") || [], [dataset]);
  return (
    <section className="screen screen-feed" data-screen="home">
      <ScreenHeader title="주요 이슈" eyebrow="전국 집회·시위" />
      <div className="feed-intro"><p>지금 확인된 주제</p>{dataset ? <span>{approvedGroups.length}개</span> : <span className="feed-count-placeholder" aria-hidden="true" />}</div>
      {!dataset && serviceSyncState === "loading" ? <HomeLoadingRows /> : null}
      {!dataset && serviceSyncState === "unavailable" ? <ServiceUnavailable /> : null}
      {dataset && approvedGroups.length === 0 ? <section className="home-zero-state" aria-label="현재 공개자료 현황">
        <h2>확인된 주요 이슈가 아직 없습니다</h2>
        <p>주제가 확인되기 전에도 공개된 일정은 지도에서 볼 수 있습니다.</p>
        <Link href="/explore" className="primary-button home-map-action"><MapPin aria-hidden="true" />지도에서 일정 보기</Link>
      </section> : null}
      <div className="issue-feed" aria-label="주요 집회 주제 목록">
        {approvedGroups.map((group) => <EventTopicListItem key={group.id} group={group} />)}
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
