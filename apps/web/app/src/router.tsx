import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type MouseEvent, type ReactNode } from "react";

export type RouteName = "home" | "issue" | "occurrence" | "reels" | "explore" | "laws" | "law" | "law-topic" | "report";
export interface Route {
  name: RouteName;
  id?: string;
  search: URLSearchParams;
  hash: string;
  path: string;
}

function readRoute(): Route {
  const path = window.location.pathname.replace(/\/+$/, "") || "/";
  const search = new URLSearchParams(window.location.search);
  const hash = window.location.hash;
  const issue = path.match(/^\/issues\/([^/]+)$/);
  if (issue) return { name: "issue", id: decodeURIComponent(issue[1]), search, hash, path };
  const occurrence = path.match(/^\/occurrences\/([^/]+)$/);
  if (occurrence) return { name: "occurrence", id: decodeURIComponent(occurrence[1]), search, hash, path };
  const lawTopic = path.match(/^\/laws\/topics\/([^/]+)$/);
  if (lawTopic) return { name: "law-topic", id: decodeURIComponent(lawTopic[1]), search, hash, path };
  const law = path.match(/^\/laws\/([^/]+)$/);
  if (law) return { name: "law", id: decodeURIComponent(law[1]), search, hash, path };
  if (path === "/reels") return { name: "reels", search, hash, path };
  if (path === "/explore") return { name: "explore", search, hash, path };
  if (path === "/laws") return { name: "laws", search, hash, path };
  if (path === "/report") return { name: "report", search, hash, path };
  return { name: "home", search, hash, path: "/" };
}

interface RouterValue {
  route: Route;
  navigate: (href: string, options?: { replace?: boolean; restoreFocusHref?: string }) => void;
  back: () => void;
}

const RouterContext = createContext<RouterValue | undefined>(undefined);

export function RouterProvider({ children }: { children: ReactNode }) {
  const [route, setRoute] = useState(readRoute);
  const pendingFocusHref = useRef<string | undefined>(undefined);
  const pendingHash = useRef<string | undefined>(undefined);
  useEffect(() => {
    const onPopState = (event: PopStateEvent) => {
      pendingFocusHref.current = typeof event.state?.restoreFocusHref === "string" ? event.state.restoreFocusHref : undefined;
      pendingHash.current = window.location.hash || undefined;
      setRoute(readRoute());
    };
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);
  useEffect(() => {
    const href = pendingFocusHref.current;
    if (!href) return;
    const deadline = performance.now() + 2_000;
    let frame = 0;
    const restore = () => {
      const target = document.querySelector<HTMLAnchorElement>(`a[href="${CSS.escape(href)}"]`);
      if (target) {
        target.focus({ preventScroll: true });
        pendingFocusHref.current = undefined;
        return;
      }
      if (performance.now() < deadline) frame = window.requestAnimationFrame(restore);
    };
    frame = window.requestAnimationFrame(restore);
    return () => window.cancelAnimationFrame(frame);
  }, [route.path]);
  useEffect(() => {
    const hash = pendingHash.current || route.hash;
    if (!hash) return;
    const deadline = performance.now() + 2_000;
    let frame = 0;
    const reveal = () => {
      const target = document.getElementById(decodeURIComponent(hash.slice(1)));
      if (target) {
        target.scrollIntoView({ block: "start", behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
        target.focus({ preventScroll: true });
        pendingHash.current = undefined;
        return;
      }
      if (performance.now() < deadline) frame = window.requestAnimationFrame(reveal);
    };
    frame = window.requestAnimationFrame(reveal);
    return () => window.cancelAnimationFrame(frame);
  }, [route.path, route.hash]);
  const navigate = useCallback((href: string, options?: { replace?: boolean; restoreFocusHref?: string }) => {
    const destination = new URL(href, window.location.href);
    pendingHash.current = destination.hash || undefined;
    if (options?.replace) window.history.replaceState({}, "", href);
    else {
      if (options?.restoreFocusHref) {
        window.history.replaceState({ ...(window.history.state || {}), restoreFocusHref: options.restoreFocusHref }, "", window.location.href);
      }
      window.history.pushState({}, "", href);
    }
    setRoute(readRoute());
    if (!destination.hash) window.scrollTo({ top: 0, behavior: "instant" });
  }, []);
  const back = useCallback(() => {
    if (window.history.length > 1) window.history.back();
    else navigate("/", { replace: true });
  }, [navigate]);
  return <RouterContext.Provider value={useMemo(() => ({ route, navigate, back }), [route, navigate, back])}>{children}</RouterContext.Provider>;
}

export function useRouter() {
  const value = useContext(RouterContext);
  if (!value) throw new Error("RouterProvider is missing");
  return value;
}

export function Link({ href, children, className, ariaLabel, onNavigate }: { href: string; children: ReactNode; className?: string; ariaLabel?: string; onNavigate?: () => void }) {
  const { navigate } = useRouter();
  const onClick = (event: MouseEvent<HTMLAnchorElement>) => {
    if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    onNavigate?.();
    navigate(href, { restoreFocusHref: href });
  };
  return <a href={href} className={className} aria-label={ariaLabel} onClick={onClick}>{children}</a>;
}
