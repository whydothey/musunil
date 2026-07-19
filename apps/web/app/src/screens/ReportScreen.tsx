import { ArrowLeft, Camera, Check, ChevronRight, LocateFixed, MapPin, RotateCcw, ShieldCheck, Video } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useAppState } from "../app-state";
import type { OccurrenceDigest, ReportCandidate } from "../contracts";
import { lifecycleLabel } from "../format";
import { ScreenHeader } from "../components";

type Phase = "idle" | "locating" | "candidates" | "selected" | "identity" | "camera" | "preview" | "submitted";

export function ReportScreen() {
  const { dataset } = useAppState();
  const [phase, setPhase] = useState<Phase>("idle");
  const [location, setLocation] = useState<GeolocationCoordinates>();
  const [locationError, setLocationError] = useState(false);
  const [selectedId, setSelectedId] = useState<string>();
  const [videoUrl, setVideoUrl] = useState<string>();
  const [verified, setVerified] = useState(false);
  const selected = dataset?.occurrences.find((item) => item.id === selectedId);
  const candidates = useMemo(() => createCandidates(dataset?.occurrences || [], dataset?.map.geojson.pins.features || [], location), [dataset, location]);

  const findNearby = () => {
    setPhase("locating");
    setLocationError(false);
    if (!navigator.geolocation) {
      setLocationError(true);
      setPhase("candidates");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (position) => { setLocation(position.coords); setPhase("candidates"); },
      () => { setLocationError(true); setPhase("candidates"); },
      { enableHighAccuracy: true, timeout: 8_000, maximumAge: 30_000 }
    );
  };

  const choose = (id: string) => { setSelectedId(id); setPhase("selected"); };
  const beginCapture = () => setPhase(verified ? "camera" : "identity");
  const confirmIdentity = () => {
    if (__MUSUNIL_UI_DATA_MODE__ === "fixture") {
      setVerified(true);
      setPhase("camera");
      return;
    }
    window.dispatchEvent(new CustomEvent("musunil:identity-required", { detail: { intent: "live-report" } }));
  };
  const reset = () => { if (videoUrl) URL.revokeObjectURL(videoUrl); setVideoUrl(undefined); setSelectedId(undefined); setPhase("idle"); };

  return (
    <section className="screen report-screen" data-screen="report">
      <ScreenHeader title="현장 제보" eyebrow="실시간 GPS 영상" />
      <div className="report-progress" aria-label="제보 진행 단계">
        {["현장", "확인", "촬영", "접수"].map((label, index) => <span key={label} className={progressIndex(phase) >= index ? "is-active" : ""}><i>{progressIndex(phase) > index ? <Check /> : index + 1}</i>{label}</span>)}
      </div>

      {phase === "idle" ? (
        <div className="report-start">
          <span className="report-start-icon"><LocateFixed /></span>
          <h2>지금 있는 현장을 찾습니다</h2>
          <p>위치는 가까운 집회 현장을 찾을 때만 사용하며, 공개 화면에는 정확한 좌표를 표시하지 않습니다.</p>
          <button type="button" className="primary-button report-primary" onClick={findNearby}><LocateFixed />근처 현장 찾기</button>
        </div>
      ) : null}

      {phase === "locating" ? <div className="report-status" role="status"><span className="locating-pulse"><LocateFixed /></span><h2>근처 현장을 찾는 중</h2><p>현재 위치와 공개된 현장을 비교하고 있습니다</p></div> : null}

      {phase === "candidates" ? (
        <div className="report-stage">
          <div className="report-stage-head"><div><h2>{locationError ? "현장을 선택해 주세요" : "가까운 현장"}</h2><p>{locationError ? "위치를 사용할 수 없어 공개 현장을 지역순으로 표시합니다" : "거리와 이슈를 확인한 뒤 선택해 주세요"}</p></div><button type="button" onClick={findNearby}><RotateCcw />다시 찾기</button></div>
          <div className="candidate-list">
            {candidates.slice(0, 5).map((candidate) => <button type="button" key={candidate.targetId} className="candidate-row" onClick={() => choose(candidate.targetId)}>
              <MapPin aria-hidden="true" />
              <span><small>{candidate.distanceLabel} · {lifecycleLabel((dataset?.occurrences.find((item) => item.id === candidate.targetId)?.lifecycleState) || "UNKNOWN")}</small><strong>{candidate.occurrenceTitle}</strong><em>{candidate.issueTitle}</em></span>
              <ChevronRight aria-hidden="true" />
            </button>)}
          </div>
        </div>
      ) : null}

      {phase === "selected" && selected ? (
        <div className="report-stage target-confirm">
          <button type="button" className="stage-back" onClick={() => setPhase("candidates")}><ArrowLeft />다른 현장</button>
          <span className="confirm-icon"><MapPin /></span>
          <p className="confirm-kicker">제보할 현장</p>
          <h2>{selected.title}</h2>
          <p>{selected.issueTitle}</p>
          <dl><div><dt>장소</dt><dd>{selected.locationLabel || selected.regionLabel}</dd></div><div><dt>연결</dt><dd>이 현장의 영상 Claim</dd></div><div><dt>공개 위치</dt><dd>최소 200m 반경으로 흐림</dd></div></dl>
          <button type="button" className="primary-button report-primary" onClick={beginCapture}><Camera />이 현장 촬영하기</button>
        </div>
      ) : null}

      {phase === "identity" && selected ? (
        <div className="report-stage identity-gate">
          <span className="confirm-icon"><ShieldCheck /></span>
          <p className="confirm-kicker">제출 전 본인확인</p>
          <h2>한 번만 본인확인해 주세요</h2>
          <p>별도 회원가입 없이 확인이 끝나면 바로 촬영으로 이어집니다. 이름과 전화번호는 공개하지 않습니다.</p>
          <button type="button" className="primary-button report-primary" onClick={confirmIdentity}><ShieldCheck />본인확인 계속</button>
          <button type="button" className="secondary-button" onClick={() => setPhase("selected")}>현장 다시 확인</button>
        </div>
      ) : null}

      {phase === "camera" && selected ? <CameraCapture occurrence={selected} onComplete={(url) => { setVideoUrl(url); setPhase("preview"); }} onCancel={() => setPhase("selected")} /> : null}

      {phase === "preview" && selected && videoUrl ? (
        <div className="report-stage preview-stage">
          <div className="preview-frame"><video src={videoUrl} controls playsInline /></div>
          <p className="confirm-kicker">제출 전 확인</p>
          <h2>{selected.title}</h2>
          <dl><div><dt>대상</dt><dd>{selected.issueTitle}</dd></div><div><dt>위치</dt><dd>{location ? `현장 거리 확인됨 · 정확도 ${Math.round(location.accuracy)}m` : "제출 시 위치 재확인"}</dd></div><div><dt>공개 전</dt><dd>얼굴·차량번호 비식별 검토</dd></div></dl>
          <button type="button" className="primary-button report-primary" onClick={() => setPhase("submitted")}><Check />이 현장에 제출</button>
          <div className="preview-secondary"><button type="button" onClick={() => setPhase("camera")}><RotateCcw />다시 촬영</button><button type="button" onClick={() => setPhase("candidates")}><MapPin />대상 바꾸기</button></div>
        </div>
      ) : null}

      {phase === "submitted" && selected ? (
        <div className="report-stage receipt-stage">
          <span className="receipt-check"><Check /></span>
          <p className="confirm-kicker">접수됨</p>
          <h2>비식별 검토를 시작합니다</h2>
          <p>영상은 검토 전 공개되지 않습니다. 연결된 현장과 상태를 이 기기에서 확인할 수 있습니다.</p>
          <dl><div><dt>이슈</dt><dd>{selected.issueTitle}</dd></div><div><dt>현장</dt><dd>{selected.title}</dd></div><div><dt>공개 위치</dt><dd>반경 200m 이상</dd></div><div><dt>접수 ID</dt><dd>{__MUSUNIL_UI_DATA_MODE__ === "fixture" ? "R-260719-0042" : "발급 대기"}</dd></div></dl>
          <button type="button" className="secondary-button" onClick={reset}>완료</button>
        </div>
      ) : null}
    </section>
  );
}

function CameraCapture({ occurrence, onComplete, onCancel }: { occurrence: OccurrenceDigest; onComplete: (url: string) => void; onCancel: () => void }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | undefined>(undefined);
  const recorderRef = useRef<MediaRecorder | undefined>(undefined);
  const [status, setStatus] = useState<"starting" | "ready" | "recording" | "error">("starting");
  const [seconds, setSeconds] = useState(7);

  useEffect(() => {
    let active = true;
    navigator.mediaDevices?.getUserMedia({ video: { facingMode: "environment" }, audio: true }).then((stream) => {
      if (!active) { stream.getTracks().forEach((track) => track.stop()); return; }
      streamRef.current = stream;
      if (videoRef.current) videoRef.current.srcObject = stream;
      setStatus("ready");
    }).catch(() => setStatus("error"));
    return () => { active = false; streamRef.current?.getTracks().forEach((track) => track.stop()); };
  }, []);

  const record = () => {
    const stream = streamRef.current;
    if (!stream) return;
    const chunks: Blob[] = [];
    const recorder = new MediaRecorder(stream);
    recorderRef.current = recorder;
    recorder.ondataavailable = (event) => { if (event.data.size) chunks.push(event.data); };
    recorder.onstop = () => {
      const blob = new Blob(chunks, { type: recorder.mimeType || "video/webm" });
      stream.getTracks().forEach((track) => track.stop());
      onComplete(URL.createObjectURL(blob));
    };
    recorder.start();
    setStatus("recording");
    setSeconds(7);
    let remaining = 7;
    const timer = window.setInterval(() => {
      remaining -= 1;
      setSeconds(remaining);
      if (remaining <= 0) { window.clearInterval(timer); if (recorder.state !== "inactive") recorder.stop(); }
    }, 1000);
  };

  return (
    <div className="camera-stage">
      <div className="camera-top"><button type="button" onClick={onCancel}><ArrowLeft />취소</button><span>{occurrence.title}</span></div>
      {status !== "error" ? <video ref={videoRef} autoPlay muted playsInline /> : <div className="camera-error"><Video /><h2>카메라를 열 수 없습니다</h2><p>브라우저의 카메라 권한을 켠 뒤 다시 시도해 주세요.</p><button type="button" className="secondary-button" onClick={onCancel}>돌아가기</button></div>}
      {status === "starting" ? <div className="camera-loading">카메라 준비 중</div> : null}
      {status === "ready" ? <button type="button" className="record-button" onClick={record} aria-label="7초 촬영 시작"><span /></button> : null}
      {status === "recording" ? <div className="recording-state"><span />촬영 중 · {seconds}초</div> : null}
    </div>
  );
}

function createCandidates(occurrences: OccurrenceDigest[], features: Array<{ geometry: { type: "Point" | "Polygon"; coordinates: unknown }; properties: Record<string, string | number | boolean | undefined> }>, location?: GeolocationCoordinates): ReportCandidate[] {
  return occurrences.map((occurrence, index) => {
    const feature = features.find((item) => item.properties.occurrenceUnitId === occurrence.id && item.geometry.type === "Point");
    const coordinates = feature?.geometry.coordinates as [number, number] | undefined;
    const distanceM = location && coordinates ? haversine(location.latitude, location.longitude, coordinates[1], coordinates[0]) : (index + 1) * 850;
    const statusTone: ReportCandidate["statusTone"] = occurrence.lifecycleState === "LIVE" || occurrence.lifecycleState === "ONGOING_SERIES" ? "live" : occurrence.lifecycleState === "UPCOMING" ? "schedule" : "pending";
    return {
      targetType: occurrence.targetType,
      targetId: occurrence.id,
      issueId: occurrence.issueId,
      issueTitle: occurrence.issueTitle,
      occurrenceTitle: occurrence.title,
      regionLabel: occurrence.regionLabel,
      distanceM,
      distanceLabel: location ? distanceLabel(distanceM) : occurrence.regionLabel,
      statusTone,
      verificationCount: occurrence.publicVideoCount,
      riskLevel: occurrence.riskLevel,
      evidenceStrength: occurrence.evidenceStrength
    };
  }).sort((left, right) => left.distanceM - right.distanceM);
}

function haversine(lat1: number, lng1: number, lat2: number, lng2: number) {
  const toRad = (value: number) => value * Math.PI / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 6_371_000 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function distanceLabel(distanceM: number) {
  return distanceM < 1000 ? `${Math.max(10, Math.round(distanceM / 10) * 10)}m` : `${(distanceM / 1000).toFixed(1)}km`;
}

function progressIndex(phase: Phase) {
  if (phase === "idle" || phase === "locating" || phase === "candidates") return 0;
  if (phase === "selected" || phase === "identity") return 1;
  if (phase === "camera" || phase === "preview") return 2;
  return 3;
}
