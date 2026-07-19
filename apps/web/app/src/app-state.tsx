import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
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

  const selectOccurrence = (id?: string) => {
    setSelectedOccurrenceId(id);
    if (!id || !dataset) return;
    const occurrence = dataset.occurrences.find((item) => item.id === id);
    if (occurrence?.issueId) selectIssue(occurrence.issueId);
  };

  const value = useMemo<AppStateValue>(() => ({
    dataset,
    serviceSyncState,
    identityState,
    selectedIssueId,
    selectedOccurrenceId,
    selectIssue,
    selectOccurrence,
    retry: () => setAttempt((current) => current + 1)
  }), [dataset, serviceSyncState, identityState, selectedIssueId, selectedOccurrenceId]);

  return <AppStateContext.Provider value={value}>{children}</AppStateContext.Provider>;
}

export function useAppState() {
  const value = useContext(AppStateContext);
  if (!value) throw new Error("AppStateProvider is missing");
  return value;
}
