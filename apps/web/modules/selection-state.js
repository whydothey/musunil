import { isOccurrenceDigest, toOccurrenceDigest } from "./contracts.js";

export function createOccurrenceSelectionState(initialOccurrence) {
  let selectedOccurrence = initialOccurrence ? toOccurrenceDigest(initialOccurrence) : undefined;
  const listeners = new Set();

  const notify = () => {
    const snapshot = api.snapshot();
    listeners.forEach((listener) => listener(snapshot));
  };

  const api = {
    select(input) {
      const next = toOccurrenceDigest(input);
      if (!isOccurrenceDigest(next)) return api.snapshot();
      selectedOccurrence = next;
      notify();
      return api.snapshot();
    },
    clear() {
      selectedOccurrence = undefined;
      notify();
      return api.snapshot();
    },
    snapshot() {
      return Object.freeze({
        selectedOccurrenceId: selectedOccurrence?.id,
        selectedIssueId: selectedOccurrence?.issueId,
        occurrence: selectedOccurrence
      });
    },
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    }
  };

  return api;
}
