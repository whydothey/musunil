import { ArrowUpRight, CalendarDays, FileCheck2, Layers3 } from "lucide-react";
import { useAppState } from "../app-state";
import { EmptyState, FactRow, LoadingState, ScreenHeader, ServiceUnavailable } from "../components";
import { Link } from "../router";
import { formatOfficialDate } from "../format";

export function LawScreen({ id }: { id: string }) {
  const { dataset, serviceSyncState } = useAppState();
  const law = dataset?.laws.find((item) => item.id === id);
  const group = dataset?.lawGroups.find((item) => item.id === law?.lawGroupId);

  if (serviceSyncState === "loading") return <section className="screen screen-detail"><LoadingState label="공식 법안 정보를 확인하고 있습니다" /></section>;
  if (serviceSyncState === "unavailable") return <section className="screen screen-detail"><ServiceUnavailable /></section>;
  if (!law) return <section className="screen screen-detail"><ScreenHeader title="법안을 찾을 수 없습니다" back /><EmptyState title="공개된 공식 법안이 아닙니다" description="국회·국가법령정보의 공식 항목만 표시합니다." actionHref="/laws" actionLabel="법안 목록" /></section>;

  return (
    <section className="screen screen-detail law-detail" data-screen="law">
      <ScreenHeader title={law.title} eyebrow={law.source === "assembly_bill" ? "국회 의안" : "현행 법령"} back />
      <div className="law-detail-status"><FileCheck2 /><div><strong>{law.stage}</strong><span>공식 출처에서 확인된 단계</span></div></div>
      <dl className="fact-list" aria-label="법안 핵심 정보">
        <FactRow label="기준일" value={formatOfficialDate(law.proposedDate || law.statusDate)} supporting={law.source === "assembly_bill" ? "공식 발의일" : "공포·시행 기준일"} />
        {law.assemblyBillNo || law.proposer ? <FactRow label="의안" value={law.assemblyBillNo ? `제${law.assemblyBillNo}호` : "국회 의안"} supporting={law.proposer || "제안자 확인 중"} /> : null}
        <FactRow label="그룹" value={group ? `동일 이름 의안 ${group.billCount}건` : "그룹 확인 중"} supporting="이슈 연결은 법안 그룹 단위로 검토합니다" />
        {law.coreTopicLabel ? <FactRow label="핵심 논점" value={law.coreTopicLabel} supporting="국회 공식 제안요약의 규칙 기반 분류" /> : null}
      </dl>
      {group ? <section className="content-section law-topic-link-section"><div className="section-heading"><div><h2>소속 법안 그룹</h2><p>정규화된 공식 법안명이 같은 의안끼리 묶었습니다</p></div><Layers3 aria-hidden="true" /></div><Link href={`/laws/groups/${encodeURIComponent(group.id)}`} className="law-related-row"><span><strong>{group.billTitle}</strong><small>동일 이름 의안 {group.billCount}건 · 핵심 논점 {group.coreTopics.length}개</small></span><Layers3 aria-hidden="true" /></Link></section> : null}
      {law.proposalSummary ? <section className="content-section law-summary-section"><div className="section-heading"><div><h2>제안이유 및 주요내용</h2><p>국회 공식 자료에서 제공한 내용입니다</p></div></div><p className="law-official-summary">{law.proposalSummary}</p></section> : null}
      {law.officialUrl ? <a className="official-law-link" href={law.officialUrl} target="_blank" rel="noreferrer"><CalendarDays /><span><strong>공식 자료에서 확인</strong><small>국회·국가법령정보 원문</small></span><ArrowUpRight /></a> : null}
    </section>
  );
}
