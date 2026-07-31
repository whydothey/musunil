import { useEffect, useState } from "react";
import dataSource from "@musunil/data-source";
import { FileCheck2, Scale, ShieldCheck } from "lucide-react";
import { ScreenHeader } from "../components";
import { useAppState } from "../app-state";
import type { TransparencyData } from "../contracts";

const pages = {
  methodology: {
    eyebrow: "공개 방법론",
    title: "무슨일은 어떻게 정보를 만드나요?",
    icon: FileCheck2,
    sections: [
      ["출처를 섞지 않습니다", "경찰·정부·언론·주최 측·시민이 전한 내용을 각각 구분해 보여줍니다. 어느 한쪽의 설명을 자동으로 사실로 확정하지 않습니다."],
      ["같은 주제를 묶습니다", "여러 자료에서 반복해 확인되는 목적을 중심으로 관련 일정을 묶습니다. 이 묶음은 정보를 찾기 쉽게 하기 위한 것이며 찬반 판단이 아닙니다."],
      ["일정과 주제를 따로 확인합니다", "시간과 장소만 공개된 일정은 목적을 아는 것처럼 표시하지 않습니다. 목적을 설명하는 자료가 확인될 때만 주제 후보로 연결합니다."],
      ["정확한 위치는 숨깁니다", "공개 자료에서 장소가 확인된 일정만 지도에 표시합니다. 시민의 현장 위치는 넓은 범위로 흐려 개인을 찾을 수 없게 합니다."]
    ]
  },
  transparency: {
    eyebrow: "투명성",
    title: "변경과 판단을 기록합니다",
    icon: Scale,
    sections: [
      ["바뀐 내용을 남깁니다", "가림, 보류, 삭제, 정정, 반론, 연결과 상태 변경은 나중에 확인할 수 있도록 기록합니다."],
      ["확인 범위를 나눠 보여줍니다", "자료를 찾은 지역, 개별 일정을 읽어 낸 지역, 위치를 확인한 지역과 실제 지도 표시 수를 따로 공개합니다."],
      ["신고 수만으로 지우지 않습니다", "신고가 많다는 이유만으로 자동 삭제하지 않습니다. 개인정보나 안전 문제가 있으면 먼저 숨기고 근거와 반론을 함께 검토합니다."],
      ["현재는 무수익으로 운영합니다", "후원, 단발 결제와 정기 결제를 제공하지 않습니다. 결제 여부는 정보 노출과 판단에 사용하지 않습니다."]
    ]
  },
  privacy: {
    eyebrow: "개인정보·위치 보호",
    title: "정밀 정보는 공개하지 않습니다",
    icon: ShieldCheck,
    sections: [
      ["쓰기 전에 본인확인합니다", "제보·정정·반론·권리침해 신고는 국내 본인확인을 마친 사람만 이용할 수 있습니다. 본인확인 원문 정보는 공개하지 않습니다."],
      ["영상 속 개인정보를 가립니다", "원본 영상은 비공개로 보관하고 촬영 위치 정보, 얼굴, 차량번호와 민감한 글자를 제거한 뒤 공개합니다."],
      ["사용자가 쓴 원문은 바로 공개하지 않습니다", "시민 제보와 신고 원문은 그대로 보여주지 않습니다. 사람을 알아볼 수 없게 처리한 중립 요약만 공개합니다."]
    ]
  },
  rights: {
    eyebrow: "정정·반론·권리침해",
    title: "다른 근거와 권리 문제를 접수합니다",
    icon: Scale,
    sections: [
      ["별도 접수 채널", "정정, 반론과 권리침해 신고는 자유 댓글이 아니라 대상과 근거가 명확한 별도 주장으로 접수합니다."],
      ["검토 원칙", "신고 수가 아니라 공개 위험과 근거를 검토합니다. 마스킹·보류·쟁점 표시·반론 병기를 우선하며 모든 조치를 기록합니다."],
      ["현재 접수 상태", "국내 본인확인과 안전한 접수 게이트가 모두 통과되기 전까지 웹 접수는 열지 않습니다. 준비 완료 후 대상 상세에서 본인확인 기반 채널을 제공합니다."]
    ]
  }
} as const;

export function TrustScreen({ id }: { id: string }) {
  const { dataset, supplementalStates } = useAppState();
  const page = pages[id as keyof typeof pages] ?? pages.methodology;
  const Icon = page.icon;
  return <section className="screen screen-detail trust-screen" data-screen="trust">
    <ScreenHeader title={page.title} eyebrow={page.eyebrow} back />
    <div className="trust-lead"><Icon aria-hidden="true" /><p>정보를 더 많이 보여주는 것보다, 근거와 개인정보를 제대로 다루는 일을 먼저 지킵니다.</p></div>
    {page.sections.map(([title, body]) => <section className="content-section trust-section" key={title}><h2>{title}</h2><p>{body}</p></section>)}
    {id === "transparency" ? <LiveTransparency initial={dataset?.transparency} state={supplementalStates.transparency} /> : null}
    {id === "rights" ? <SupportContact profile={dataset?.serviceProfile} state={supplementalStates.trust} /> : null}
  </section>;
}

function LiveTransparency({ initial, state }: { initial?: TransparencyData; state: "idle" | "loading" | "ready" | "error" }) {
  const [data, setData] = useState(initial);
  const [loading, setLoading] = useState(false);
  useEffect(() => { if (initial) setData(initial); }, [initial]);
  const coverage = data?.coverage?.eventCoverage;
  const loadMore = async () => {
    if (!data?.nextCursor || !dataSource.loadTransparency) return;
    setLoading(true);
    try {
      const next = await dataSource.loadTransparency(data.nextCursor);
      setData({ ...next, logs: [...data.logs, ...next.logs] });
    } finally { setLoading(false); }
  };
  if (!data && state === "error") return <section className="content-section trust-section"><h2>실시간 공개 지표</h2><p>공개 지표 연결을 확인하고 있습니다. 방법론과 개인정보 보호 원칙은 계속 볼 수 있습니다.</p></section>;
  if (!data && state === "ready") return <section className="content-section trust-section"><h2>실시간 공개 지표</h2><p>아직 공개할 수 있는 집계 기록이 없습니다. 변경 기록이 생기면 이곳에 표시합니다.</p></section>;
  if (!data) return <section className="content-section trust-section" aria-live="polite"><h2>실시간 공개 지표</h2><p>공개 지표를 불러오고 있습니다.</p></section>;
  return <>
    <section className="content-section trust-section"><h2>공개자료 범위</h2>
      {coverage ? <div className="metric-grid">
        <div><strong>{coverage.sourceReachRegions}</strong><span>소스 접근 지역</span></div>
        <div><strong>{coverage.eventLevelRegions}</strong><span>개별 일정 추출 지역</span></div>
        <div><strong>{coverage.geocodedEventRegions}</strong><span>위치 확인 지역</span></div>
        <div><strong>{coverage.mappedUpcomingCount}</strong><span>지도 진행·예정 일정</span></div>
      </div> : <p>범위 집계 중입니다.</p>}
      {coverage?.boardPostOnlyRegions.length ? <p className="metric-note">게시물만 확인되고 개별 일정은 아직 추출하지 못한 지역 {coverage.boardPostOnlyRegions.length}곳: {coverage.boardPostOnlyRegions.join(", ")}</p> : null}
    </section>
    <section className="content-section trust-section"><h2>{formatMonth(data.monthly?.month)} 변경 기록</h2><div className="metric-grid compact">{Object.entries(data.monthly?.counts || {}).map(([category, count]) => <div key={category}><strong>{count}</strong><span>{categoryLabel(category)}</span></div>)}</div></section>
    <section className="content-section trust-section"><h2>최근 공개 변경</h2><ol className="transparency-log-list">{data.logs.map((log) => <li key={log.id}><span>{categoryLabel(log.category || log.action)} · {new Intl.DateTimeFormat("ko-KR", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Seoul" }).format(new Date(log.createdAt))}{log.count && log.count > 1 ? ` · 같은 작업 ${log.count}건` : ""}</span><p>{log.publicReason}</p></li>)}</ol>
      {data.nextCursor ? <button type="button" className="secondary-button" disabled={loading} onClick={loadMore}>{loading ? "불러오는 중" : "더 보기"}</button> : null}
    </section>
  </>;
}

function actionLabel(action: string) {
  return ({ state_change: "상태 변경", split: "분리", merge: "연결·병합", hold: "보류", correction: "정정", restore: "복원", rights_report: "권리 신고" } as Record<string, string>)[action] || "검토 기록";
}

function categoryLabel(category: string) {
  return ({
    source_refresh: "자료 갱신",
    content_correction: "내용 정정",
    link_change: "연결 변경",
    moderation: "공개 검토",
    rights: "권리 관련",
  } as Record<string, string>)[category] || actionLabel(category);
}

function formatMonth(month?: string) {
  if (!month || !/^\d{4}-\d{2}$/.test(month)) return "이번 달";
  const [year, value] = month.split("-");
  return `${year}년 ${Number(value)}월`;
}

function SupportContact({ profile, state }: {
  profile?: { supportAvailable: boolean; supportEmail?: string };
  state: "idle" | "loading" | "ready" | "error";
}) {
  return <section className="content-section trust-section support-contact"><h2>접수 문의</h2>
    {state === "idle" || state === "loading" ? <p>공식 문의 채널을 확인하고 있습니다.</p> : null}
    {state === "error" ? <p>문의 채널 연결을 확인하고 있습니다. 안전한 웹 접수 기능이 준비되면 이 화면에 안내합니다.</p> : null}
    {state === "ready" && profile?.supportAvailable && profile.supportEmail ? <p>웹 접수 기능이 준비되기 전에는 <a href={`mailto:${profile.supportEmail}`}>{profile.supportEmail}</a>로 대상 주소와 정정·반론 근거를 보내 주세요. 민감한 개인정보 원문은 보내지 마세요.</p> : null}
    {state === "ready" && !profile?.supportAvailable ? <p>검증된 공식 문의 채널을 준비하고 있습니다. 준비 전에는 이 화면에서 개인정보나 제보 원문을 받지 않습니다.</p> : null}
  </section>;
}
