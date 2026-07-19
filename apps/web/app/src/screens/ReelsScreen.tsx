import { FileText, Layers3, MapPin, Pause, Play } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useAppState } from "../app-state";
import { EmptyState, LoadingState, ServiceUnavailable } from "../components";
import { formatRelativeTime } from "../format";
import { Link, useRouter } from "../router";

export function ReelsScreen() {
  const { dataset, serviceSyncState } = useAppState();
  const { route } = useRouter();
  const issueId = route.search.get("issue");
  const occurrenceId = route.search.get("occurrence");
  const selectedReel = route.search.get("reel");
  const reels = useMemo(() => {
    const all = dataset?.reels || [];
    const filtered = occurrenceId ? all.filter((item) => item.occurrenceId === occurrenceId) : issueId ? all.filter((item) => item.issueId === issueId) : all;
    if (!selectedReel) return filtered;
    return [...filtered].sort((item) => item.id === selectedReel ? -1 : 0);
  }, [dataset, issueId, occurrenceId, selectedReel]);

  if (serviceSyncState === "loading") return <section className="reels-state"><LoadingState label="공개 영상을 확인하고 있습니다" /></section>;
  if (serviceSyncState === "unavailable") return <section className="reels-state"><ServiceUnavailable /></section>;
  if (!reels.length) return <section className="reels-state"><EmptyState title="공개된 현장 영상이 없습니다" description="현장성과 비식별 검토를 통과한 영상만 이곳에 표시합니다." actionHref="/" actionLabel="주요 이슈 보기" /></section>;

  return (
    <section className="reels-screen" data-screen="reels" aria-label="현장 영상">
      <div className="reels-topbar"><strong>현장 영상</strong><span>위치·시각 확인</span></div>
      <div className="reels-feed">
        {reels.map((reel, index) => <ReelCard key={reel.id} reel={reel} eager={index === 0} />)}
      </div>
    </section>
  );
}

function ReelCard({ reel, eager }: { reel: NonNullable<ReturnType<typeof useAppState>["dataset"]>["reels"][number]; eager: boolean }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [playing, setPlaying] = useState(eager);
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting && entry.intersectionRatio > 0.7) {
        video.play().then(() => setPlaying(true)).catch(() => setPlaying(false));
      } else {
        video.pause();
        setPlaying(false);
      }
    }, { threshold: [0.7] });
    observer.observe(video);
    return () => observer.disconnect();
  }, []);
  const toggle = () => {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) video.play().then(() => setPlaying(true)).catch(() => undefined);
    else { video.pause(); setPlaying(false); }
  };

  return (
    <article className="reel-card">
      <video ref={videoRef} src={reel.media.redactedClipUrl} poster={reel.media.redactedPosterUrl} muted playsInline loop preload={eager ? "auto" : "metadata"} />
      <button type="button" className="reel-toggle" onClick={toggle} aria-label={playing ? "일시 정지" : "재생"}>{playing ? <Pause /> : <Play />}</button>
      <div className="reel-shade" aria-hidden="true" />
      <div className="reel-copy">
        <p className="reel-issue">{reel.issueTitle || "연결 이슈 확인 중"}</p>
        <h2>{reel.occurrenceTitle}</h2>
        <p>{reel.regionLabel} · 공개 반경 {reel.publicRadiusM}m · {formatRelativeTime(reel.capturedAt)}</p>
        <span>{reel.summary}</span>
      </div>
      <nav className="reel-actions" aria-label="영상 관련 정보">
        <Link href={`/occurrences/${encodeURIComponent(reel.occurrenceId)}`} ariaLabel="현장 보기"><MapPin /><span>현장</span></Link>
        <Link href={`/occurrences/${encodeURIComponent(reel.occurrenceId)}#evidence`} ariaLabel="근거 보기"><FileText /><span>근거</span></Link>
        {reel.issueId ? <Link href={`/issues/${encodeURIComponent(reel.issueId)}`} ariaLabel="이슈 보기"><Layers3 /><span>이슈</span></Link> : null}
      </nav>
    </article>
  );
}
