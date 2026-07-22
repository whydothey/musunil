import { useEffect, useState } from "react";
import dataSource from "@musunil/data-source";
import type { EventTopicDetailData } from "../contracts";
import { EmptyState, LoadingState, OccurrenceListItem, ScreenHeader, ServiceUnavailable } from "../components";

export function EventTopicScreen({ id }: { id: string }) {
  const [detail, setDetail] = useState<EventTopicDetailData>();
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    let active = true;
    setFailed(false);
    void dataSource.loadEventTopic(id).then((next) => { if (active) setDetail(next); }).catch(() => { if (active) setFailed(true); });
    return () => { active = false; };
  }, [id]);
  if (failed) return <ServiceUnavailable />;
  if (!detail) return <LoadingState />;
  const { group } = detail;
  return <section className="screen screen-detail event-topic-screen" data-screen="event-topic">
    <ScreenHeader title={group.title} eyebrow="집회·시위 주제" back />
    <div className={`topic-group-summary status-${group.status}`}>
      <span>{group.statusLabel}</span>
      <p>진행 {group.currentCount}건 · 예정 {group.upcomingCount}건 · {group.regionCount}개 지역</p>
      <small>공개 근거 {group.evidenceCount}건 · 출처 {group.sourceCount}곳</small>
      {group.status === "candidate" ? <em>이 주제는 공개 근거에서 추출한 승인 전 후보이며 사실 확정이나 승인된 연결이 아닙니다.</em> : null}
    </div>
    <section className="content-section"><h2>연결된 개별 일정</h2>
      {detail.occurrenceDigests.length ? <div className="occurrence-list">{detail.occurrenceDigests.map((item) => <OccurrenceListItem key={item.id} occurrence={item} />)}</div> : <EmptyState title="연결된 일정이 없습니다" description="공개 근거를 확인하고 있습니다." />}
    </section>
  </section>;
}
