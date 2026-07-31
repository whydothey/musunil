import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import dataSource from "@musunil/data-source";
import type { AppDataset, IdentityPurpose, ServiceReadiness } from "./contracts";
import { useRouter } from "./router";

export type ServiceSyncState = "loading" | "live" | "fixture" | "partial" | "stale" | "unavailable";
export type IdentityState = "unknown" | "anonymous" | "verifying" | "verified" | "expired" | "unavailable";
export type AsyncDataState = "idle" | "loading" | "ready" | "error";
export type SupplementalScope = "reels" | "laws" | "transparency" | "trust";

interface AppStateValue {
  dataset?: AppDataset;
  serviceSyncState: ServiceSyncState;
  identityState: IdentityState;
  identityError?: string;
  readiness?: ServiceReadiness;
  supplementalStates: Record<SupplementalScope, AsyncDataState>;
  issueDetailStates: Record<string, AsyncDataState>;
  occurrenceDetailStates: Record<string, AsyncDataState>;
  selectedIssueId?: string;
  selectedOccurrenceId?: string;
  selectIssue: (id?: string) => void;
  selectOccurrence: (id?: string) => void;
  ensureIssue: (id: string) => Promise<void>;
  ensureOccurrence: (id: string) => Promise<void>;
  requireIdentity: (purpose: IdentityPurpose, returnPath?: string) => Promise<boolean>;
  logout: () => Promise<void>;
  retry: () => void;
}

const AppStateContext = createContext<AppStateValue | undefined>(undefined);
const pendingIdentityKey = "musunil.identity.pending";

export function AppStateProvider({ children }: { children: ReactNode }) {
  const { route, navigate } = useRouter();
  const [dataset, setDataset] = useState<AppDataset>();
  const [serviceSyncState, setServiceSyncState] = useState<ServiceSyncState>("loading");
  const [identityState, setIdentityState] = useState<IdentityState>("unknown");
  const [identityError, setIdentityError] = useState<string>();
  const [readiness, setReadiness] = useState<ServiceReadiness>();
  const [supplementalStates, setSupplementalStates] = useState<Record<SupplementalScope, AsyncDataState>>({
    reels: "idle",
    laws: "idle",
    transparency: "idle",
    trust: "idle"
  });
  const [issueDetailStates, setIssueDetailStates] = useState<Record<string, AsyncDataState>>({});
  const [occurrenceDetailStates, setOccurrenceDetailStates] = useState<Record<string, AsyncDataState>>({});
  const [selectedIssueId, selectIssue] = useState<string>();
  const [selectedOccurrenceId, setSelectedOccurrenceId] = useState<string>();
  const [attempt, setAttempt] = useState(0);
  const lastRefreshAt = useRef(0);
  const automaticRetryCount = useRef(0);
  const loadedSupplementalScopes = useRef(new Set<SupplementalScope>());

  useEffect(() => {
    let active = true;
    void dataSource.loadIdentitySession().then((session) => {
      if (!active) return;
      setIdentityState(session.authenticated ? "verified" : "anonymous");
    }).catch(() => {
      if (active) setIdentityState("unavailable");
    });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    let active = true;
    if (attempt === 0) setServiceSyncState("loading");
    dataSource.loadDataset().then((next) => {
      if (!active) return;
      setDataset((current) => current ? mergeDataset(current, next) : next);
      lastRefreshAt.current = Date.now();
      setServiceSyncState(syncStateForDataset(next));
      if (dataSource.loadReadiness) void dataSource.loadReadiness().then((status) => { if (active) setReadiness(status); }).catch(() => {
        if (active) setReadiness({ gates: { publicRead: { ready: true, failedIds: [] }, identity: { ready: false, failedIds: ["readiness_unavailable"] }, contribution: { ready: false, failedIds: ["readiness_unavailable"] }, operator: { ready: false, failedIds: ["readiness_unavailable"] } } });
      });
    }).catch(() => {
      if (!active) return;
      setDataset(undefined);
      setServiceSyncState("unavailable");
    });
    return () => { active = false; };
  }, [attempt]);

  useEffect(() => {
    if (serviceSyncState === "live" || serviceSyncState === "fixture") {
      automaticRetryCount.current = 0;
      return;
    }
    if (!["partial", "stale", "unavailable"].includes(serviceSyncState)) return;
    const retryDelays = [1_000, 3_000, 10_000];
    const retryIndex = automaticRetryCount.current;
    if (retryIndex >= retryDelays.length) return;
    automaticRetryCount.current += 1;
    const timeout = window.setTimeout(() => setAttempt((current) => current + 1), retryDelays[retryIndex]);
    return () => window.clearTimeout(timeout);
  }, [serviceSyncState]);

  useEffect(() => {
    const refresh = () => {
      if (document.visibilityState !== "visible") return;
      void dataSource.loadDataset().then((next) => {
        setDataset((current) => current ? mergeDataset(current, next) : next);
        setServiceSyncState(syncStateForDataset(next));
        lastRefreshAt.current = Date.now();
      }).catch(() => setServiceSyncState((current) => current === "live" || current === "partial" ? "stale" : current));
    };
    const interval = window.setInterval(refresh, 5 * 60_000);
    const onFocus = () => { if (Date.now() - lastRefreshAt.current > 60_000) refresh(); };
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onFocus);
    return () => { window.clearInterval(interval); window.removeEventListener("focus", onFocus); document.removeEventListener("visibilitychange", onFocus); };
  }, []);

  useEffect(() => {
    if (!dataset) return;
    const scope: SupplementalScope | undefined = route.name === "reels"
      ? "reels"
      : ["laws", "law", "law-group"].includes(route.name)
        ? "laws"
        : route.name === "trust" && route.id === "transparency"
          ? "transparency"
          : route.name === "trust"
            ? "trust"
            : undefined;
    if (!scope) return;
    if (!dataSource.loadSupplementalDataset) {
      loadedSupplementalScopes.current.add(scope);
      setSupplementalStates((current) => ({ ...current, [scope]: "ready" }));
      return;
    }
    if (loadedSupplementalScopes.current.has(scope)) return;
    let active = true;
    setSupplementalStates((current) => ({ ...current, [scope]: "loading" }));
    void dataSource.loadSupplementalDataset(scope).then((supplemental) => {
      if (!active) return;
      loadedSupplementalScopes.current.add(scope);
      setDataset((current) => current ? { ...current, ...supplemental } : current);
      setSupplementalStates((current) => ({ ...current, [scope]: "ready" }));
    }).catch(() => {
      if (active) setSupplementalStates((current) => ({ ...current, [scope]: "error" }));
    });
    return () => { active = false; };
  }, [route.name, route.id, dataset === undefined, attempt]);

  const selectOccurrence = useCallback((id?: string) => {
    setSelectedOccurrenceId(id);
    if (!id || !dataset) return;
    const occurrence = dataset.occurrences.find((item) => item.id === id);
    if (occurrence?.issueId) selectIssue(occurrence.issueId);
  }, [dataset]);

  const ensureIssue = useCallback(async (id: string) => {
    setIssueDetailStates((current) => ({ ...current, [id]: "loading" }));
    try {
      const detail = await dataSource.loadIssue(id);
      setDataset((current) => {
        if (!current) return current;
        const issueOverview = detail.issueOverview;
        const issues = issueOverview ? mergeById(current.issues, [issueOverview]) : current.issues;
        return {
          ...current,
          issues,
          occurrences: mergeById(current.occurrences, detail.occurrenceDigests || []),
          claimsByIssue: { ...current.claimsByIssue, [id]: detail.claims || [] },
          newsByIssue: { ...current.newsByIssue, [id]: detail.newsArticles || [] },
          synthesisByIssue: { ...current.synthesisByIssue, [id]: detail.topicGrouping?.synthesis },
          lawGroupsByIssue: { ...current.lawGroupsByIssue, [id]: detail.relatedLawGroups || [] }
        };
      });
      setIssueDetailStates((current) => ({ ...current, [id]: "ready" }));
    } catch (error) {
      setIssueDetailStates((current) => ({ ...current, [id]: "error" }));
      throw error;
    }
  }, []);

  const ensureOccurrence = useCallback(async (id: string) => {
    const currentOccurrence = dataset?.occurrences.find((item) => item.id === id);
    if (!currentOccurrence) return;
    setOccurrenceDetailStates((current) => ({ ...current, [id]: "loading" }));
    try {
      const detail = await dataSource.loadOccurrence(id, currentOccurrence.targetType);
      setDataset((current) => current ? {
        ...current,
        occurrences: mergeById(current.occurrences, [detail.occurrenceDigest]),
        claimsByOccurrence: { ...current.claimsByOccurrence, [id]: detail.claims || [] }
      } : current);
      setOccurrenceDetailStates((current) => ({ ...current, [id]: "ready" }));
    } catch (error) {
      setOccurrenceDetailStates((current) => ({ ...current, [id]: "error" }));
      throw error;
    }
  }, [dataset]);

  const completeIdentity = useCallback(async (identityVerificationId: string) => {
    const session = await dataSource.completeIdentity(identityVerificationId);
    if (!session.authenticated) throw new Error("identity_not_verified");
    setIdentityState("verified");
    setIdentityError(undefined);
  }, []);

  const requireIdentity = useCallback(async (purpose: IdentityPurpose, returnPath = `${window.location.pathname}${window.location.search}`) => {
    if (identityState === "verified") return true;
    if (dataSource.mode !== "fixture" && readiness?.gates?.identity.ready !== true) {
      setIdentityState("unavailable");
      setIdentityError("본인확인 기능은 운영 준비 후 제공됩니다.");
      return false;
    }
    setIdentityState("verifying");
    setIdentityError(undefined);
    try {
      const started = await dataSource.startIdentity(purpose);
      const safeReturnPath = safeLocalPath(returnPath);
      sessionStorage.setItem(pendingIdentityKey, JSON.stringify({
        identityVerificationId: started.identityVerificationId,
        purpose,
        returnPath: safeReturnPath
      }));
      if (dataSource.mode === "fixture") {
        await completeIdentity(started.identityVerificationId);
        sessionStorage.removeItem(pendingIdentityKey);
        return true;
      }
      const PortOne = await import("@portone/browser-sdk/v2");
      const response = await PortOne.requestIdentityVerification({
        storeId: started.storeId,
        channelKey: started.channelKey,
        identityVerificationId: started.identityVerificationId,
        redirectUrl: `${window.location.origin}/identity/callback`,
        windowType: { pc: "POPUP", mobile: "REDIRECTION" }
      });
      if (!response) throw new Error("identity_canceled");
      if (response.code) throw new Error(response.code);
      if (response.identityVerificationId !== started.identityVerificationId) throw new Error("identity_session_mismatch");
      await completeIdentity(started.identityVerificationId);
      sessionStorage.removeItem(pendingIdentityKey);
      return true;
    } catch (error) {
      setIdentityState("anonymous");
      setIdentityError(identityErrorMessage(error));
      sessionStorage.removeItem(pendingIdentityKey);
      return false;
    }
  }, [completeIdentity, identityState, readiness?.gates?.identity.ready]);

  const logout = useCallback(async () => {
    await dataSource.logout();
    setIdentityState("anonymous");
  }, []);

  useEffect(() => {
    if (route.name !== "identity-callback") return;
    const pending = readPendingIdentity();
    const returnedId = route.search.get("identityVerificationId");
    const providerError = route.search.get("code");
    if (!pending || providerError || returnedId !== pending.identityVerificationId) {
      sessionStorage.removeItem(pendingIdentityKey);
      setIdentityState("anonymous");
      setIdentityError(providerError ? "본인확인이 완료되지 않았습니다." : "본인확인 요청을 확인할 수 없습니다.");
      navigate(pending?.returnPath ?? "/report", { replace: true });
      return;
    }
    let active = true;
    setIdentityState("verifying");
    void completeIdentity(returnedId).then(() => {
      if (!active) return;
      sessionStorage.removeItem(pendingIdentityKey);
      navigate(pending.returnPath, { replace: true });
    }).catch((error) => {
      if (!active) return;
      sessionStorage.removeItem(pendingIdentityKey);
      setIdentityState("anonymous");
      setIdentityError(identityErrorMessage(error));
      navigate(pending.returnPath, { replace: true });
    });
    return () => { active = false; };
  }, [route.name, route.search, completeIdentity, navigate]);

  const value = useMemo<AppStateValue>(() => ({
    dataset,
    serviceSyncState,
    identityState,
    identityError,
    readiness,
    supplementalStates,
    issueDetailStates,
    occurrenceDetailStates,
    selectedIssueId,
    selectedOccurrenceId,
    selectIssue,
    selectOccurrence,
    ensureIssue,
    ensureOccurrence,
    requireIdentity,
    logout,
    retry: () => {
      automaticRetryCount.current = 0;
      setAttempt((current) => current + 1);
    }
  }), [dataset, serviceSyncState, identityState, identityError, readiness, supplementalStates, issueDetailStates, occurrenceDetailStates, selectedIssueId, selectedOccurrenceId, selectOccurrence, ensureIssue, ensureOccurrence, requireIdentity, logout]);

  return <AppStateContext.Provider value={value}>{children}</AppStateContext.Provider>;
}

function safeLocalPath(value: string): string {
  try {
    const url = new URL(value, window.location.origin);
    if (url.origin !== window.location.origin) return "/report";
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return "/report";
  }
}

function readPendingIdentity(): { identityVerificationId: string; purpose: IdentityPurpose; returnPath: string } | undefined {
  try {
    const value = JSON.parse(sessionStorage.getItem(pendingIdentityKey) || "{}") as Record<string, unknown>;
    if (typeof value.identityVerificationId !== "string" || typeof value.returnPath !== "string") return undefined;
    return {
      identityVerificationId: value.identityVerificationId,
      purpose: typeof value.purpose === "string" ? value.purpose as IdentityPurpose : "general",
      returnPath: safeLocalPath(value.returnPath)
    };
  } catch {
    return undefined;
  }
}

function identityErrorMessage(error: unknown): string {
  const code = error instanceof Error ? error.message : "";
  if (code.includes("identity_disabled") || code.includes("identity_not_ready")) return "본인확인 기능은 운영 준비 후 제공됩니다.";
  if (code.includes("cancel")) return "본인확인이 취소되었습니다.";
  if (code.includes("expired")) return "본인확인 시간이 만료되었습니다. 다시 시도해 주세요.";
  return "본인확인을 완료하지 못했습니다. 잠시 후 다시 시도해 주세요.";
}

function syncStateForDataset(dataset: AppDataset): ServiceSyncState {
  if (dataSource.mode === "fixture") return "fixture";
  const states = dataset.publicDataStatus ? [dataset.publicDataStatus.home, dataset.publicDataStatus.map] : ["ready"];
  if (states.every((state) => state === "ready")) return "live";
  if (states.some((state) => state === "ready") && states.some((state) => state === "error")) return "partial";
  if (states.some((state) => state === "stale")) return "stale";
  return "partial";
}

function mergeById<T extends { id: string }>(current: T[], incoming: T[]): T[] {
  const merged = new Map(current.map((item) => [item.id, item]));
  for (const item of incoming) merged.set(item.id, item);
  return [...merged.values()];
}

function mergeDataset(current: AppDataset, incoming: AppDataset): AppDataset {
  return {
    ...incoming,
    reels: current.reels.length ? current.reels : incoming.reels,
    laws: current.laws.length ? current.laws : incoming.laws,
    lawGroups: current.lawGroups.length ? current.lawGroups : incoming.lawGroups,
    claimsByIssue: { ...incoming.claimsByIssue, ...current.claimsByIssue },
    newsByIssue: { ...incoming.newsByIssue, ...current.newsByIssue },
    synthesisByIssue: { ...incoming.synthesisByIssue, ...current.synthesisByIssue },
    lawGroupsByIssue: { ...incoming.lawGroupsByIssue, ...current.lawGroupsByIssue },
    claimsByOccurrence: { ...incoming.claimsByOccurrence, ...current.claimsByOccurrence },
    transparency: current.transparency ?? incoming.transparency,
    serviceProfile: current.serviceProfile ?? incoming.serviceProfile
  };
}

export function useAppState() {
  const value = useContext(AppStateContext);
  if (!value) throw new Error("AppStateProvider is missing");
  return value;
}
