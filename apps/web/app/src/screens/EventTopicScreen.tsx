import { useEffect, useState } from "react";
import { MapPin } from "lucide-react";
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
    <div className="issue-hero event-topic-hero">
      <div className="hero-status"><span className={`status-label tone-${group.currentCount > 0 ? "verified" : "pending"}`}><span className="status-dot" />{group.statusLabel}</span></div>
      <div className="hero-summary" aria-label="주제 일정 현황">
        <span><strong>{group.currentCount}</strong> 진행</span>
        <span><strong>{group.upcomingCount}</strong> 예정</span>
        <span><strong>{group.regionCount}</strong> 지역</span>
      </div>
      <details className="topic-method-disclosure">
        <summary>이 주제는 어떻게 묶였나요?</summary>
        <p>{group.status === "candidate" ? "공개 근거에서 반복 확인된 표현을 바탕으로 연결을 검토 중입니다." : "공개 근거에서 같은 목적으로 확인된 일정을 묶었습니다."}</p>
        <small>근거 {group.evidenceCount}건 · 출처 {group.sourceCount}곳 · 근거가 바뀌면 병합·분기·정정될 수 있습니다.</small>
      </details>
    </div>
    <section className="content-section">
      <div className="section-heading"><div><h2>일정</h2></div><MapPin aria-hidden="true" /></div>
      {detail.occurrenceDigests.length ? <div className="occurrence-list">{detail.occurrenceDigests.map((item) => <OccurrenceListItem key={item.id} occurrence={item} />)}</div> : <EmptyState title="연결된 일정이 없습니다" description="공개 근거를 확인하고 있습니다." />}
    </section>
  </section>;
}
