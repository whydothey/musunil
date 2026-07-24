import { Camera, Home, Landmark, Map, PlaySquare } from "lucide-react";
import { lazy, Suspense } from "react";
import { AppStateProvider, useAppState } from "./app-state";
import { Link, RouterProvider, useRouter, type RouteName } from "./router";
import { LoadingState } from "./components";
import { HomeScreen } from "./screens/HomeScreen";

const ExploreScreen = lazy(() => import("./screens/ExploreScreen").then((module) => ({ default: module.ExploreScreen })));
const EventTopicScreen = lazy(() => import("./screens/EventTopicScreen").then((module) => ({ default: module.EventTopicScreen })));
const IssueScreen = lazy(() => import("./screens/IssueScreen").then((module) => ({ default: module.IssueScreen })));
const LawScreen = lazy(() => import("./screens/LawScreen").then((module) => ({ default: module.LawScreen })));
const LawGroupScreen = lazy(() => import("./screens/LawTopicScreen").then((module) => ({ default: module.LawGroupScreen })));
const LawsScreen = lazy(() => import("./screens/LawsScreen").then((module) => ({ default: module.LawsScreen })));
const OccurrenceScreen = lazy(() => import("./screens/OccurrenceScreen").then((module) => ({ default: module.OccurrenceScreen })));
const ReelsScreen = lazy(() => import("./screens/ReelsScreen").then((module) => ({ default: module.ReelsScreen })));
const ReportScreen = lazy(() => import("./screens/ReportScreen").then((module) => ({ default: module.ReportScreen })));
const TrustScreen = lazy(() => import("./screens/TrustScreen").then((module) => ({ default: module.TrustScreen })));

const navigation = [
  { route: "home" as const, href: "/", label: "홈", icon: Home },
  { route: "reels" as const, href: "/reels", label: "영상", icon: PlaySquare },
  { route: "explore" as const, href: "/explore", label: "탐색", icon: Map },
  { route: "laws" as const, href: "/laws", label: "법안", icon: Landmark },
  { route: "report" as const, href: "/report", label: "제보", icon: Camera }
];

export function App() {
  return (
    <RouterProvider>
      <AppStateProvider>
        <AppShell />
      </AppStateProvider>
    </RouterProvider>
  );
}

function AppShell() {
  const { route } = useRouter();
  const { serviceSyncState } = useAppState();
  const activeRoute: RouteName = route.name === "issue" || route.name === "occurrence" || route.name === "event-topic" || route.name === "trust" ? "home" : route.name === "law" || route.name === "law-group" ? "laws" : route.name;
  const isImmersive = route.name === "reels" || route.name === "explore";
  const isDetail = route.name === "issue" || route.name === "occurrence" || route.name === "event-topic" || route.name === "law" || route.name === "law-group";

  return (
    <div className={`app-shell ${isImmersive ? "is-immersive" : ""} ${isDetail ? "is-detail" : ""}`}>
      <aside className="desktop-sidebar" aria-label="주요 메뉴">
        <Link href="/" className="brand-lockup" ariaLabel="무슨일 홈">
          <BrandMark />
          <span>무슨일</span>
        </Link>
        <nav className="desktop-nav">
          {navigation.map(({ route: navRoute, href, label, icon: Icon }) => (
            <Link key={navRoute} href={href} className={`nav-link ${activeRoute === navRoute ? "is-active" : ""}`} ariaLabel={label}>
              <Icon aria-hidden="true" />
              <span>{label}</span>
            </Link>
          ))}
        </nav>
        <div className="sidebar-foot">
          <div className="trust-links"><Link href="/methodology">방법론</Link><Link href="/transparency">투명성</Link><Link href="/privacy">개인정보</Link><Link href="/rights">정정·권리</Link></div>
          {serviceSyncState === "unavailable" ? <div className="sync-status"><span className="sync-dot unavailable" aria-hidden="true" /><span>자료 연결 확인 중</span></div> : null}
        </div>
      </aside>

      <header className="mobile-header">
        <Link href="/" className="mobile-brand" ariaLabel="무슨일 홈">
          <BrandMark />
          <span>무슨일</span>
        </Link>
      </header>

      <main className="app-main" id="main-content">
        <Suspense fallback={<LoadingState />}><Screen /></Suspense>
      </main>

      <nav className="mobile-tabbar" aria-label="주요 메뉴">
        {navigation.map(({ route: navRoute, href, label, icon: Icon }) => (
          <Link key={navRoute} href={href} className={`tab-link ${activeRoute === navRoute ? "is-active" : ""}`} ariaLabel={label}>
            <Icon aria-hidden="true" />
            <span>{label}</span>
          </Link>
        ))}
      </nav>
    </div>
  );
}

function Screen() {
  const { route } = useRouter();
  if (route.name === "issue") return <IssueScreen id={route.id || ""} />;
  if (route.name === "event-topic") return <EventTopicScreen id={route.id || ""} />;
  if (route.name === "occurrence") return <OccurrenceScreen id={route.id || ""} />;
  if (route.name === "law") return <LawScreen id={route.id || ""} />;
  if (route.name === "law-group") return <LawGroupScreen id={route.id || ""} />;
  if (route.name === "reels") return <ReelsScreen />;
  if (route.name === "explore") return <ExploreScreen />;
  if (route.name === "laws") return <LawsScreen />;
  if (route.name === "report") return <ReportScreen />;
  if (route.name === "trust") return <TrustScreen id={route.id || "methodology"} />;
  return <HomeScreen />;
}

function BrandMark() {
  return <span className="brand-mark" aria-hidden="true"><span /></span>;
}
