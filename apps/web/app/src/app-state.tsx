import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import dataSource from "@musunil/data-source";
import type { AppDataset, ServiceReadiness } from "./contracts";
import { useRouter } from "./router";

export type ServiceSyncState = "loading" | "live" | "fixture" | "unavailable";
export type IdentityState = "unknown" | "anonymous" | "verified" | "expired";

interface AppStateValue {
  dataset?: AppDataset;
  serviceSyncState: ServiceSyncState;
  identityState: IdentityState;
  readiness?: ServiceReadiness;
  selectedIssueId?: string;
  selectedOccurrenceId?: string;
  selectIssue: (id?: string) => void;
  selectOccurrence: (id?: string) => void;
  ensureIssue: (id: string) => Promise<void>;
  ensureOccurrence: (id: string) => Promise<void>;
  retry: () => void;
}

const AppStateContext = createContext<AppStateValue | undefined>(undefined);

export function AppStateProvider({ children }: { children: ReactNode }) {
  const { route } = useRouter();
  const [dataset, setDataset] = useState<AppDataset>();
  const [serviceSyncState, setServiceSyncState] = useState<ServiceSyncState>("loading");
  const [identityState] = useState<IdentityState>("anonymous");
  const [readiness, setReadiness] = useState<ServiceReadiness>();
  const [selectedIssueId, selectIssue] = useState<string>();
  const [selectedOccurrenceId, setSelectedOccurrenceId] = useState<string>();
  const [attempt, setAttempt] = useState(0);
  const lastRefreshAt = useRef(0);

  useEffect(() => {
    let active = true;
    setServiceSyncState("loading");
    dataSource.loadDataset().then((next) => {
      if (!active) return;
      setDataset((current) => current ? mergeDataset(current, next) : next);
      lastRefreshAt.current = Date.now();
      setServiceSyncState(dataSource.mode === "fixture" ? "fixture" : "live");
      if (dataSource.loadReadiness) void dataSource.loadReadiness().then((status) => { if (active) setReadiness(status); }).catch(() => {
        if (active) setReadiness({ gates: { publicRead: { ready: true, failedIds: [] }, contribution: { ready: false, failedIds: ["readiness_unavailable"] }, operator: { ready: false, failedIds: ["readiness_unavailable"] } } });
      });
    }).catch(() => {
      if (!active) return;
      setDataset(undefined);
      setServiceSyncState("unavailable");
    });
    return () => { active = false; };
  }, [attempt]);

  useEffect(() => {
    const refresh = () => {
      if (document.visibilityState !== "visible") return;
      void dataSource.loadDataset().then((next) => {
        setDataset((current) => current ? mergeDataset(current, next) : next);
        setServiceSyncState(dataSource.mode === "fixture" ? "fixture" : "live");
        lastRefreshAt.current = Date.now();
      }).catch(() => undefined);
    };
    const interval = window.setInterval(refresh, 5 * 60_000);
    const onFocus = () => { if (Date.now() - lastRefreshAt.current > 60_000) refresh(); };
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onFocus);
    return () => { window.clearInterval(interval); window.removeEventListener("focus", onFocus); document.removeEventListener("visibilitychange", onFocus); };
  }, []);

  useEffect(() => {
    if (!dataSource.loadSupplementalDataset || !dataset) return;
    const scope = route.name === "reels" ? "reels" : ["laws", "law", "law-group"].includes(route.name) ? "laws" : route.name === "trust" && route.id === "transparency" ? "transparency" : undefined;
    if (!scope) return;
    let active = true;
    void dataSource.loadSupplementalDataset(scope).then((supplemental) => {
      if (active) setDataset((current) => current ? { ...current, ...supplemental } : current);
    }).catch(() => undefined);
    return () => { active = false; };
  }, [route.name, dataset === undefined]);

  const selectOccurrence = useCallback((id?: string) => {
    setSelectedOccurrenceId(id);
    if (!id || !dataset) return;
    const occurrence = dataset.occurrences.find((item) => item.id === id);
    if (occurrence?.issueId) selectIssue(occurrence.issueId);
  }, [dataset]);

  const ensureIssue = useCallback(async (id: string) => {
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
  }, []);

  const ensureOccurrence = useCallback(async (id: string) => {
    const currentOccurrence = dataset?.occurrences.find((item) => item.id === id);
    if (!currentOccurrence) return;
    const detail = await dataSource.loadOccurrence(id, currentOccurrence.targetType);
    setDataset((current) => current ? {
      ...current,
      occurrences: mergeById(current.occurrences, [detail.occurrenceDigest]),
      claimsByOccurrence: { ...current.claimsByOccurrence, [id]: detail.claims || [] }
    } : current);
  }, [dataset]);

  const value = useMemo<AppStateValue>(() => ({
    dataset,
    serviceSyncState,
    identityState,
    readiness,
    selectedIssueId,
    selectedOccurrenceId,
    selectIssue,
    selectOccurrence,
    ensureIssue,
    ensureOccurrence,
    retry: () => setAttempt((current) => current + 1)
  }), [dataset, serviceSyncState, identityState, readiness, selectedIssueId, selectedOccurrenceId, selectOccurrence, ensureIssue, ensureOccurrence]);

  return <AppStateContext.Provider value={value}>{children}</AppStateContext.Provider>;
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
    transparency: current.transparency ?? incoming.transparency
  };
}

export function useAppState() {
  const value = useContext(AppStateContext);
  if (!value) throw new Error("AppStateProvider is missing");
  return value;
}
