import { ArrowUpRight, CalendarDays, FileCheck2, Layers3, MapPin } from "lucide-react";
import { useAppState } from "../app-state";
import { EmptyState, FactRow, LoadingState, ScreenHeader, ServiceUnavailable } from "../components";
import { Link } from "../router";

export function LawScreen({ id }: { id: string }) {
  const { dataset, serviceSyncState } = useAppState();
  const law = dataset?.laws.find((item) => item.id === id);
  const linkedIssues = dataset?.issues.filter((issue) => law?.linkedIssueIds?.includes(issue.id)) || [];

  if (serviceSyncState === "loading") return <section className="screen screen-detail"><LoadingState label="공식 법안 정보를 확인하고 있습니다" /></section>;
  if (serviceSyncState === "unavailable") return <section className="screen screen-detail"><ServiceUnavailable /></section>;
  if (!law) return <section className="screen screen-detail"><ScreenHeader title="법안을 찾을 수 없습니다" back /><EmptyState title="공개된 공식 법안이 아닙니다" description="국회·국가법령정보의 공식 항목만 표시합니다." actionHref="/laws" actionLabel="법안 목록" /></section>;

  return (
    <section className="screen screen-detail law-detail" data-screen="law">
      <ScreenHeader title={law.title} eyebrow={law.source === "assembly_bill" ? "국회 의안" : "현행 법령"} back />
      <div className="law-detail-status"><FileCheck2 /><div><strong>{law.stage}</strong><span>공식 출처에서 확인된 단계</span></div></div>
      <dl className="fact-list" aria-label="법안 핵심 정보">
        <FactRow label="기준일" value={law.proposedDate || law.statusDate || "공식 날짜 확인 중"} supporting={law.source === "assembly_bill" ? "공식 발의일" : "공포·시행 기준일"} />
        <FactRow label="연결" value={`이슈 ${law.linkedIssueCount}개`} supporting={`전국 집회 현장 ${law.occurrenceCount}곳 · ${law.regionCount}개 지역`} />
      </dl>
      <section className="content-section law-related-section">
        <div className="section-heading"><div><h2>연결 이슈</h2><p>법안 자체와 집회 현장의 주장은 구분해 표시합니다</p></div><Layers3 aria-hidden="true" /></div>
        {linkedIssues.length ? linkedIssues.map((issue) => <Link key={issue.id} href={`/issues/${encodeURIComponent(issue.id)}`} className="law-related-row"><span><strong>{issue.title}</strong><small>{issue.regionCount}개 지역 · 현장 {issue.occurrenceCount}곳</small></span><MapPin aria-hidden="true" /></Link>) : <EmptyState title="연결된 이슈가 없습니다" description="검토된 IssueLawLink가 확인되면 표시합니다." />}
      </section>
      {law.officialUrl ? <a className="official-law-link" href={law.officialUrl} target="_blank" rel="noreferrer"><CalendarDays /><span><strong>공식 자료에서 확인</strong><small>국회·국가법령정보 원문</small></span><ArrowUpRight /></a> : null}
    </section>
  );
}
