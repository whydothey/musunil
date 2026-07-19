import { createContext, useCallback, useContext, useEffect, useMemo, useState, type MouseEvent, type ReactNode } from "react";

export type RouteName = "home" | "issue" | "occurrence" | "reels" | "explore" | "laws" | "report";
export interface Route {
  name: RouteName;
  id?: string;
  search: URLSearchParams;
  path: string;
}

function readRoute(): Route {
  const path = window.location.pathname.replace(/\/+$/, "") || "/";
  const search = new URLSearchParams(window.location.search);
  const issue = path.match(/^\/issues\/([^/]+)$/);
  if (issue) return { name: "issue", id: decodeURIComponent(issue[1]), search, path };
  const occurrence = path.match(/^\/occurrences\/([^/]+)$/);
  if (occurrence) return { name: "occurrence", id: decodeURIComponent(occurrence[1]), search, path };
  if (path === "/reels") return { name: "reels", search, path };
  if (path === "/explore") return { name: "explore", search, path };
  if (path === "/laws") return { name: "laws", search, path };
  if (path === "/report") return { name: "report", search, path };
  return { name: "home", search, path: "/" };
}

interface RouterValue {
  route: Route;
  navigate: (href: string, options?: { replace?: boolean; restoreFocusHref?: string }) => void;
  back: () => void;
}

const RouterContext = createContext<RouterValue | undefined>(undefined);

export function RouterProvider({ children }: { children: ReactNode }) {
  const [route, setRoute] = useState(readRoute);
  useEffect(() => {
    const onPopState = (event: PopStateEvent) => {
      setRoute(readRoute());
      const restoreFocusHref = event.state?.restoreFocusHref;
      if (typeof restoreFocusHref === "string") {
        window.requestAnimationFrame(() => window.requestAnimationFrame(() => {
          const target = document.querySelector<HTMLAnchorElement>(`a[href="${CSS.escape(restoreFocusHref)}"]`);
          target?.focus({ preventScroll: true });
        }));
      }
    };
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);
  const navigate = useCallback((href: string, options?: { replace?: boolean; restoreFocusHref?: string }) => {
    if (options?.replace) window.history.replaceState({}, "", href);
    else {
      if (options?.restoreFocusHref) {
        window.history.replaceState({ ...(window.history.state || {}), restoreFocusHref: options.restoreFocusHref }, "", window.location.href);
      }
      window.history.pushState({}, "", href);
    }
    setRoute(readRoute());
    window.scrollTo({ top: 0, behavior: "instant" });
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
