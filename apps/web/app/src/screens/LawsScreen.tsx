import { ChevronRight } from "lucide-react";
import { useMemo, useState } from "react";
import { useAppState } from "../app-state";
import { EmptyState, LoadingState, ScreenHeader, ServiceUnavailable } from "../components";
import { lawStagePresentation } from "../format";
import { Link } from "../router";

type LawSort = "interest" | "recent";

export function LawsScreen() {
  const { dataset, serviceSyncState, supplementalStates } = useAppState();
  const [sort, setSort] = useState<LawSort>("interest");
  const groups = useMemo(() => [...(dataset?.lawGroups || [])].sort((left, right) => sort === "recent"
    ? new Date(right.latestProposedDate || 0).getTime() - new Date(left.latestProposedDate || 0).getTime()
    : right.interestScore - left.interestScore), [dataset, sort]);

  return (
    <section className="screen screen-feed laws-screen" data-screen="laws">
      <ScreenHeader title="법안" eyebrow="집회 이슈와 연결된 공식 정보" />
      <p className="law-intro">같은 공식 법안명을 하나의 묶음으로 보고, 발의 시점과 처리 단계가 다른 개별 의안을 함께 확인할 수 있습니다.</p>
      <div className="segmented-control" role="tablist" aria-label="법안 정렬">
        <button type="button" role="tab" aria-selected={sort === "interest"} onClick={() => setSort("interest")}>연결된 현장 많은 순</button>
        <button type="button" role="tab" aria-selected={sort === "recent"} onClick={() => setSort("recent")}>최근 발의</button>
      </div>
      {serviceSyncState === "loading" || supplementalStates.laws === "idle" || supplementalStates.laws === "loading" ? <LoadingState label="공식 법안 정보를 확인하고 있습니다" /> : null}
      {serviceSyncState === "unavailable" ? <ServiceUnavailable /> : null}
      {supplementalStates.laws === "error" ? <ServiceUnavailable title="법안 정보를 불러오지 못했습니다" description="국회 공식 자료 연결을 다시 확인하고 있습니다." /> : null}
      {supplementalStates.laws === "ready" && !groups.length ? <EmptyState title="연결된 공식 법안이 없습니다" description="국회 공식 자료와 주요 이슈의 연결이 확인되면 표시합니다." actionHref="/" actionLabel="주요 이슈 보기" /> : null}
      <div className="law-list">
        {groups.map((group) => {
          const stages = Object.entries(group.stageCounts).sort((left, right) => right[1] - left[1]).slice(0, 2).map(([stage, count]) => `${lawStagePresentation(stage).label} ${count}건`).join(" · ");
          const coreTopics = group.coreTopics.slice(0, 3).map((topic) => `${topic.label} ${topic.billCount}건`).join(" · ");
          return (
            <Link href={`/laws/groups/${encodeURIComponent(group.id)}`} className="law-row law-topic-row" key={group.id} ariaLabel={`${group.billTitle} 법안 그룹 ${group.billCount}건 보기`}>
              <div className="law-source-line"><span>{group.lawName}</span><time>{group.latestProposedDate || "날짜 확인 중"}</time></div>
              <div className="law-row-main"><div><h2>{group.billTitle}</h2><p>동일 이름 법안 {group.billCount}건 · {stages || "단계 확인 중"}</p><small>{coreTopics || "핵심 논점 확인 중"}</small></div><ChevronRight aria-hidden="true" /></div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
