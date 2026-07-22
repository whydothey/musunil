import { useState } from "react";
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
      ["Claim 중심", "경찰·정부·언론·주최 측·시민·AI의 말을 각각 Claim으로 기록합니다. 누가 말했는지, 무엇이 근거인지, 공개 위험이 어떤지는 하나의 신뢰 점수로 합치지 않습니다."],
      ["주제 종합", "동일 이름 법안 그룹을 우산 주제로 삼고, 최근 공개 근거에서 반복 확인되는 세부 논점만 표시합니다. 주제는 탐색 단위이며 사실 확정이나 찬반 판단이 아닙니다."],
      ["이벤트 연결", "시간과 장소만 담긴 경찰 일정은 주제와 자동 연결하지 않습니다. 이벤트 자체의 공개 Claim과 Evidence가 목적을 뒷받침할 때만 승인된 연결을 공개합니다."],
      ["지도와 위치", "공개 자료에서 위치가 확인된 일정만 핀으로 표시합니다. 시민 제보 위치와 현장 영상 좌표는 100~300m 이상 흐리고 정밀 좌표를 공개하지 않습니다."]
    ]
  },
  transparency: {
    eyebrow: "투명성",
    title: "변경과 판단을 기록합니다",
    icon: Scale,
    sections: [
      ["감사 기록", "마스킹, 보류, 삭제, 정정, 반론, 병합, 분기와 상태 변경은 AuditLog 또는 TransparencyLog에 남깁니다."],
      ["자료 범위", "소스에 접근 가능한 지역, 이벤트를 추출한 지역, 위치를 확인한 지역과 실제 지도 표시 수를 서로 다른 지표로 공개합니다."],
      ["자동 삭제 금지", "신고 수만으로 자료를 자동 삭제하지 않습니다. 개인정보·안전 위험은 즉시 비공개 검토 대상으로 보내고 정정·반론 병기를 먼저 검토합니다."]
    ]
  },
  privacy: {
    eyebrow: "개인정보·위치 보호",
    title: "정밀 정보는 공개하지 않습니다",
    icon: ShieldCheck,
    sections: [
      ["본인확인", "제보·정정·반론·권리침해 신고는 국내 본인확인을 통과한 세션에서만 받습니다. CI·DI는 중복 계정 방지를 위한 HMAC 해시로만 저장합니다."],
      ["영상", "원본 영상은 비공개 암호화 저장소에 보관하고 EXIF, 얼굴, 차량번호와 민감 OCR을 제거한 뒤에만 공개본을 만듭니다."],
      ["사용자 원문", "시민 제보와 신고 원문은 공개 기본값이 아닙니다. 공개 화면에는 비식별 처리하고 중립화한 Claim 요약만 표시합니다."]
    ]
  },
  rights: {
    eyebrow: "정정·반론·권리침해",
    title: "다른 근거와 권리 문제를 접수합니다",
    icon: Scale,
    sections: [
      ["별도 Claim 채널", "정정, 반론과 권리침해 신고는 자유 댓글이 아니라 대상과 근거가 명확한 별도 Claim으로 접수합니다."],
      ["검토 원칙", "신고 수가 아니라 공개 위험과 근거를 검토합니다. 마스킹·보류·쟁점 표시·반론 병기를 우선하며 모든 조치를 기록합니다."],
      ["현재 접수 상태", "국내 본인확인과 안전한 접수 게이트가 모두 통과되기 전까지 웹 접수는 열지 않습니다. 준비 완료 후 대상 상세에서 본인확인 기반 채널을 제공합니다."]
    ]
  }
} as const;

export function TrustScreen({ id }: { id: string }) {
  const { dataset } = useAppState();
  const page = pages[id as keyof typeof pages] ?? pages.methodology;
  const Icon = page.icon;
  return <section className="screen screen-detail trust-screen" data-screen="trust">
    <ScreenHeader title={page.title} eyebrow={page.eyebrow} back />
    <div className="trust-lead"><Icon aria-hidden="true" /><p>객관적인 공개 정보와 시민의 알권리를 위해 적용하는 비협상 원칙입니다.</p></div>
    {page.sections.map(([title, body]) => <section className="content-section trust-section" key={title}><h2>{title}</h2><p>{body}</p></section>)}
    {id === "transparency" ? <LiveTransparency initial={dataset?.transparency} /> : null}
  </section>;
}

function LiveTransparency({ initial }: { initial?: TransparencyData }) {
  const [data, setData] = useState(initial);
  const [loading, setLoading] = useState(false);
  const coverage = data?.coverage?.eventCoverage;
  const loadMore = async () => {
    if (!data?.nextCursor || !dataSource.loadTransparency) return;
    setLoading(true);
    try {
      const next = await dataSource.loadTransparency(data.nextCursor);
      setData({ ...next, logs: [...data.logs, ...next.logs] });
    } finally { setLoading(false); }
  };
  if (!data) return <section className="content-section trust-section"><h2>실시간 공개 지표</h2><p>공개 지표를 불러오고 있습니다.</p></section>;
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
    <section className="content-section trust-section"><h2>{data.monthly?.month || "이번 달"} 변경 기록</h2><div className="metric-grid compact">{Object.entries(data.monthly?.counts || {}).map(([action, count]) => <div key={action}><strong>{count}</strong><span>{actionLabel(action)}</span></div>)}</div></section>
    <section className="content-section trust-section"><h2>최근 공개 변경</h2><ol className="transparency-log-list">{data.logs.map((log) => <li key={log.id}><span>{actionLabel(log.action)} · {new Intl.DateTimeFormat("ko-KR", { dateStyle: "medium", timeStyle: "short" }).format(new Date(log.createdAt))}</span><p>{log.publicReason}</p></li>)}</ol>
      {data.nextCursor ? <button type="button" className="secondary-button" disabled={loading} onClick={loadMore}>{loading ? "불러오는 중" : "더 보기"}</button> : null}
    </section>
  </>;
}

function actionLabel(action: string) {
  return ({ state_change: "상태 변경", split: "분리", merge: "연결·병합", hold: "보류", correction: "정정", restore: "복원", rights_report: "권리 신고" } as Record<string, string>)[action] || "검토 기록";
}
