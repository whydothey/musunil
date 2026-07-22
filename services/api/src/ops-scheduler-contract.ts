export type OpsTaskId =
  | "notification_dispatch"
  | "public_source_ingest"
  | "law_source_ingest"
  | "news_source_ingest"
  | "media_redaction"
  | "privacy_purge";

export type OpsTaskDefinition = {
  id: OpsTaskId;
  cadenceSeconds: number;
  retrySeconds: number;
  priority: number;
  command: string;
  args: string[];
  needsUserInputs: boolean;
};

export const opsTaskDefinitions: OpsTaskDefinition[] = [
  {
    id: "notification_dispatch",
    cadenceSeconds: 5 * 60,
    retrySeconds: 60,
    priority: 10,
    command: "node",
    args: ["--disable-warning=ExperimentalWarning", "--experimental-strip-types", "workers/notification-dispatch/src/index.ts"],
    needsUserInputs: false
  },
  {
    id: "public_source_ingest",
    cadenceSeconds: 60 * 60,
    retrySeconds: 5 * 60,
    priority: 20,
    command: "node",
    args: ["--disable-warning=ExperimentalWarning", "--experimental-strip-types", "workers/public-source-ingest/src/index.ts", "--post"],
    needsUserInputs: false
  },
  {
    id: "law_source_ingest",
    cadenceSeconds: 12 * 60 * 60,
    retrySeconds: 15 * 60,
    priority: 30,
    command: "node",
    args: ["--disable-warning=ExperimentalWarning", "--experimental-strip-types", "workers/public-source-ingest/src/index.ts", "--laws", "--post"],
    needsUserInputs: true
  },
  {
    id: "news_source_ingest",
    cadenceSeconds: 60 * 60,
    retrySeconds: 10 * 60,
    priority: 32,
    command: "node",
    args: ["--disable-warning=ExperimentalWarning", "--experimental-strip-types", "workers/public-source-ingest/src/index.ts", "--news", "--post"],
    needsUserInputs: true
  },
  {
    id: "media_redaction",
    cadenceSeconds: 5 * 60,
    retrySeconds: 2 * 60,
    priority: 35,
    command: "node",
    args: ["--disable-warning=ExperimentalWarning", "--experimental-strip-types", "scripts/redaction-worker.mjs"],
    needsUserInputs: true
  },
  {
    id: "privacy_purge",
    cadenceSeconds: 24 * 60 * 60,
    retrySeconds: 30 * 60,
    priority: 40,
    command: "node",
    args: ["--disable-warning=ExperimentalWarning", "--experimental-strip-types", "scripts/privacy-purge.mjs"],
    needsUserInputs: false
  }
];

// Workers renew this lease while running. Keep the orphan window short enough
// that a Render Free deploy cannot suppress scheduled ingestion for 30 minutes.
export const opsLeaseSeconds = 5 * 60;

export function taskById(id: string): OpsTaskDefinition | undefined {
  return opsTaskDefinitions.find((task) => task.id === id);
}

export function childEnvironment(task: OpsTaskDefinition, source: NodeJS.ProcessEnv): NodeJS.ProcessEnv {
  const env = { ...source };
  if (!task.needsUserInputs) {
    delete env.MUSUNIL_USER_INPUTS_B64;
    delete env.MUSUNIL_USER_INPUTS_FILE_PATH;
  }
  return env;
}
