import { ChevronRight } from "lucide-react";
import { useMemo, useState } from "react";
import { useAppState } from "../app-state";
import { EmptyState, LoadingState, ScreenHeader, ServiceUnavailable } from "../components";
import { Link } from "../router";

type LawSort = "interest" | "recent";

export function LawsScreen() {
  const { dataset, serviceSyncState } = useAppState();
  const [sort, setSort] = useState<LawSort>("interest");
  const topics = useMemo(() => [...(dataset?.lawTopics || [])].sort((left, right) => sort === "recent"
    ? new Date(right.latestProposedDate || 0).getTime() - new Date(left.latestProposedDate || 0).getTime()
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
      {dataset && !topics.length ? <EmptyState title="연결된 공식 법안이 없습니다" description="국회·국가법령정보의 공식 자료만 표시합니다." actionHref="/" actionLabel="주요 이슈 보기" /> : null}
      <div className="law-list">
        {topics.map((topic) => {
          const stages = Object.entries(topic.stageCounts).sort((left, right) => right[1] - left[1]).slice(0, 2).map(([stage, count]) => `${stage} ${count}건`).join(" · ");
          return (
            <Link href={`/laws/topics/${encodeURIComponent(topic.id)}`} className="law-row law-topic-row" key={topic.id} ariaLabel={`${topic.label} 관련 법안 ${topic.billCount}건 보기`}>
              <div className="law-source-line"><span>{topic.lawName}</span><time>{topic.latestProposedDate || "날짜 확인 중"}</time></div>
              <div className="law-row-main"><div><h2>{topic.label}</h2><p>관련 법안 {topic.billCount}건 · {stages || "단계 확인 중"}</p><small>{topic.representativeKeywords.join(" · ")}</small></div><ChevronRight aria-hidden="true" /></div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
