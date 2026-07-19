import { ChevronRight } from "lucide-react";
import { useMemo, useState } from "react";
import { useAppState } from "../app-state";
import { EmptyState, LoadingState, ScreenHeader, ServiceUnavailable } from "../components";
import { Link } from "../router";

type LawSort = "interest" | "recent";

export function LawsScreen() {
  const { dataset, serviceSyncState } = useAppState();
  const [sort, setSort] = useState<LawSort>("interest");
  const laws = useMemo(() => [...(dataset?.laws || [])].sort((left, right) => sort === "recent"
    ? new Date(right.proposedDate || 0).getTime() - new Date(left.proposedDate || 0).getTime()
    : right.interestScore - left.interestScore), [dataset, sort]);

  return (
    <section className="screen screen-feed laws-screen" data-screen="laws">
      <ScreenHeader title="법안" eyebrow="집회 이슈와 연결된 공식 정보" />
      <div className="segmented-control" role="tablist" aria-label="법안 정렬">
        <button type="button" role="tab" aria-selected={sort === "interest"} onClick={() => setSort("interest")}>현장 관심</button>
        <button type="button" role="tab" aria-selected={sort === "recent"} onClick={() => setSort("recent")}>최근 발의</button>
      </div>
      {serviceSyncState === "loading" ? <LoadingState label="공식 법안 정보를 확인하고 있습니다" /> : null}
      {serviceSyncState === "unavailable" ? <ServiceUnavailable /> : null}
      {dataset && !laws.length ? <EmptyState title="연결된 공식 법안이 없습니다" description="국회·국가법령정보의 공식 자료만 표시합니다." actionHref="/" actionLabel="주요 이슈 보기" /> : null}
      <div className="law-list">
        {laws.map((law) => {
          return (
            <Link href={`/laws/${encodeURIComponent(law.id)}`} className="law-row" key={law.id} ariaLabel={`${law.title} 법안 정보 보기`}>
              <div className="law-source-line"><span>{law.source === "assembly_bill" ? "국회 의안" : "현행 법령"}</span><time>{law.proposedDate || law.statusDate || "날짜 확인 중"}</time></div>
              <div className="law-row-main"><div><h2>{law.title}</h2><p>{law.stage} · 연결 이슈 {law.linkedIssueCount}개 · 현장 {law.occurrenceCount}곳</p></div><ChevronRight aria-hidden="true" /></div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
