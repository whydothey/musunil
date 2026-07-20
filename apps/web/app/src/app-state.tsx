import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import dataSource from "@musunil/data-source";
import type { AppDataset } from "./contracts";

export type ServiceSyncState = "loading" | "live" | "fixture" | "unavailable";
export type IdentityState = "unknown" | "anonymous" | "verified" | "expired";

interface AppStateValue {
  dataset?: AppDataset;
  serviceSyncState: ServiceSyncState;
  identityState: IdentityState;
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
  const [dataset, setDataset] = useState<AppDataset>();
  const [serviceSyncState, setServiceSyncState] = useState<ServiceSyncState>("loading");
  const [identityState] = useState<IdentityState>("anonymous");
  const [selectedIssueId, selectIssue] = useState<string>();
  const [selectedOccurrenceId, setSelectedOccurrenceId] = useState<string>();
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let active = true;
    setServiceSyncState("loading");
    dataSource.loadDataset().then((next) => {
      if (!active) return;
      setDataset(next);
      setServiceSyncState(dataSource.mode === "fixture" ? "fixture" : "live");
    }).catch(() => {
      if (!active) return;
      setDataset(undefined);
      setServiceSyncState("unavailable");
    });
    return () => { active = false; };
  }, [attempt]);

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
        newsByIssue: { ...current.newsByIssue, [id]: detail.newsArticles || [] }
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
    selectedIssueId,
    selectedOccurrenceId,
    selectIssue,
    selectOccurrence,
    ensureIssue,
    ensureOccurrence,
    retry: () => setAttempt((current) => current + 1)
  }), [dataset, serviceSyncState, identityState, selectedIssueId, selectedOccurrenceId, selectOccurrence, ensureIssue, ensureOccurrence]);

  return <AppStateContext.Provider value={value}>{children}</AppStateContext.Provider>;
}

function mergeById<T extends { id: string }>(current: T[], incoming: T[]): T[] {
  const merged = new Map(current.map((item) => [item.id, item]));
  for (const item of incoming) merged.set(item.id, item);
  return [...merged.values()];
}

export function useAppState() {
  const value = useContext(AppStateContext);
  if (!value) throw new Error("AppStateProvider is missing");
  return value;
}
