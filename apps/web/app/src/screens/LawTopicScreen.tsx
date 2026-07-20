import { ChevronRight, Layers3 } from "lucide-react";
import { useEffect, useState } from "react";
import dataSource from "@musunil/data-source";
import type { LawTopicDetailData } from "../contracts";
import { EmptyState, LoadingState, ScreenHeader, ServiceUnavailable } from "../components";
import { Link } from "../router";

export function LawTopicScreen({ id }: { id: string }) {
  const [detail, setDetail] = useState<LawTopicDetailData>();
  const [state, setState] = useState<"loading" | "ready" | "missing" | "unavailable">("loading");

  useEffect(() => {
    let active = true;
    setState("loading");
    dataSource.loadLawTopic(id).then((next) => {
      if (!active) return;
      setDetail(next);
      setState("ready");
    }).catch((error) => {
      if (!active) return;
      setState(error instanceof Error && error.message === "law_topic_not_found" ? "missing" : "unavailable");
    });
    return () => { active = false; };
  }, [id]);

  if (state === "loading") return <section className="screen screen-detail"><LoadingState label="주제별 법안 정보를 확인하고 있습니다" /></section>;
  if (state === "unavailable") return <section className="screen screen-detail"><ServiceUnavailable /></section>;
  if (state === "missing" || !detail) return <section className="screen screen-detail"><ScreenHeader title="법안 주제를 찾을 수 없습니다" back /><EmptyState title="공개된 주제가 아닙니다" description="공식 제안이유에서 추출한 주제만 표시합니다." actionHref="/laws" actionLabel="법안 주제 목록" /></section>;

  const { topic, bills } = detail;
  return (
    <section className="screen screen-detail law-topic-detail" data-screen="law-topic">
      <ScreenHeader title={topic.label} eyebrow={topic.lawName} back />
      <div className="law-topic-summary"><Layers3 aria-hidden="true" /><div><strong>관련 법안 {topic.billCount}건</strong><span>{topic.representativeKeywords.join(" · ")}</span></div></div>
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
