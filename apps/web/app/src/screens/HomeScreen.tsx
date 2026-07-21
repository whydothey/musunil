import { useAppState } from "../app-state";
import { EmptyState, IssueListItem, LoadingState, ScreenHeader, ServiceUnavailable } from "../components";
import { Link } from "../router";

export function HomeScreen() {
  const { dataset, serviceSyncState } = useAppState();
  return (
    <section className="screen screen-feed" data-screen="home">
      <ScreenHeader title="주요 이슈" eyebrow="전국 집회·시위" />
      <div className="feed-intro"><p>지금 여러 현장에서 확인되는 쟁점입니다</p><span>{dataset?.issues.length || 0}개</span></div>
      {serviceSyncState === "loading" ? <LoadingState /> : null}
      {serviceSyncState === "unavailable" ? <ServiceUnavailable /> : null}
      {dataset && dataset.issues.length === 0 ? <EmptyState title="확인된 주요 이슈가 없습니다" description="공개 자료와 검토를 통과한 현장이 확인되면 이곳에 표시합니다." actionHref="/explore" actionLabel="지역에서 찾기" /> : null}
      <div className="issue-feed" aria-label="주요 이슈 목록">
        {dataset?.issues.map((issue) => <IssueListItem key={issue.id} issue={issue} />)}
      </div>
      <nav className="home-trust-links" aria-label="서비스 원칙과 권리 안내"><Link href="/methodology">방법론</Link><Link href="/transparency">투명성</Link><Link href="/privacy">개인정보</Link><Link href="/rights">정정·권리</Link></nav>
    </section>
  );
}
