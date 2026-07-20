import { ChevronRight, ExternalLink, Layers3, Newspaper } from "lucide-react";
import { useEffect, useState } from "react";
import dataSource from "@musunil/data-source";
import type { LawGroupDetailData } from "../contracts";
import { EmptyState, LoadingState, ScreenHeader, ServiceUnavailable } from "../components";
import { Link } from "../router";

export function LawGroupScreen({ id }: { id: string }) {
  const [detail, setDetail] = useState<LawGroupDetailData>();
  const [state, setState] = useState<"loading" | "ready" | "missing" | "unavailable">("loading");

  useEffect(() => {
    let active = true;
    setState("loading");
    dataSource.loadLawGroup(id).then((next) => {
      if (!active) return;
      setDetail(next);
      setState("ready");
    }).catch((error) => {
      if (!active) return;
      setState(error instanceof Error && error.message === "law_group_not_found" ? "missing" : "unavailable");
    });
    return () => { active = false; };
  }, [id]);

  if (state === "loading") return <section className="screen screen-detail"><LoadingState label="동일 이름 법안 그룹을 확인하고 있습니다" /></section>;
  if (state === "unavailable") return <section className="screen screen-detail"><ServiceUnavailable /></section>;
  if (state === "missing" || !detail) return <section className="screen screen-detail"><ScreenHeader title="법안 그룹을 찾을 수 없습니다" back /><EmptyState title="공개된 그룹이 아닙니다" description="동일한 공식 법안명으로 확인된 그룹만 표시합니다." actionHref="/laws" actionLabel="법안 그룹 목록" /></section>;

  const { group, bills, issues = [] } = detail;
  return (
    <section className="screen screen-detail law-topic-detail" data-screen="law-group">
      <ScreenHeader title={group.billTitle} eyebrow={group.lawName} back />
      <div className="law-topic-summary"><Layers3 aria-hidden="true" /><div><strong>동일 이름 법안 {group.billCount}건</strong><span>그룹 핵심 논점 {group.coreTopics.length}개</span></div></div>
      <section className="content-section">
        <div className="section-heading"><div><h2>핵심 논점</h2><p>소속 의안들의 국회 공식 제안요약에서 집계했습니다</p></div></div>
        <div className="law-core-topic-list">
          {group.coreTopics.map((topic) => <div className="law-core-topic-item" key={topic.key}><h3>{topic.label}</h3><p>관련 의안 {topic.billCount}건</p><small>{topic.representativeKeywords.join(" · ")}</small></div>)}
        </div>
      </section>
      <section className="content-section">
        <div className="section-heading"><div><h2>주요 이슈와 관련 뉴스</h2><p>검토 승인된 그룹 단위 이슈와 출처가 확인된 보도만 표시합니다</p></div><Newspaper aria-hidden="true" /></div>
        {issues.length ? issues.map((issue) => (
          <article className="law-issue-news-card" key={issue.id}>
            <Link href={`/issues/${encodeURIComponent(issue.id)}`} className="law-related-row">
              <span><strong>{issue.title}</strong><small>{issue.newsCount ? `관련 뉴스 ${issue.newsCount}건` : `${issue.regionCount}개 지역 · 현장 ${issue.occurrenceCount}곳`}</small></span><ChevronRight aria-hidden="true" />
            </Link>
            {issue.recentNews?.length ? <div className="news-link-list">{issue.recentNews.map((article) => (
              <a key={article.id} href={article.sourceUrl} target="_blank" rel="noopener noreferrer" className="news-link-row">
                <span><strong>{article.summary}</strong><small>{article.publisherLabel} · {new Date(article.publishedAt).toLocaleDateString("ko-KR")}</small></span><ExternalLink aria-hidden="true" />
              </a>
            ))}</div> : null}
          </article>
        )) : <EmptyState title="연결된 이슈가 없습니다" description="검토 승인된 이슈와 언론 보도가 확인되면 표시합니다." />}
      </section>
      <section className="content-section">
        <div className="section-heading"><div><h2>개별 법안</h2><p>발의자·발의일·진행단계가 서로 다른 공식 의안입니다</p></div></div>
        <div className="law-list">
          {bills.map((law) => (
            <Link href={`/laws/${encodeURIComponent(law.id)}`} className="law-row" key={law.id} ariaLabel={`${law.title} ${law.proposer || ""} 상세 보기`}>
              <div className="law-source-line"><span>{law.assemblyBillNo ? `의안 ${law.assemblyBillNo}` : law.source === "assembly_bill" ? "국회 의안" : "현행 법령"}</span><time>{law.proposedDate || law.statusDate || "날짜 확인 중"}</time></div>
              <div className="law-row-main"><div><h2>{law.title}</h2><p>{law.proposer ? `${law.proposer} · ` : ""}{law.stage}</p></div><ChevronRight aria-hidden="true" /></div>
            </Link>
          ))}
        </div>
      </section>
    </section>
  );
}
