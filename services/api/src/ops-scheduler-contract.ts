export type OpsTaskId =
  | "notification_dispatch"
  | "public_source_ingest"
  | "law_source_ingest"
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
    command: "pnpm",
    args: ["dispatch:notifications"],
    needsUserInputs: false
  },
  {
    id: "public_source_ingest",
    cadenceSeconds: 60 * 60,
    retrySeconds: 5 * 60,
    priority: 20,
    command: "pnpm",
    args: ["sources:assemblies:post"],
    needsUserInputs: false
  },
  {
    id: "law_source_ingest",
    cadenceSeconds: 12 * 60 * 60,
    retrySeconds: 15 * 60,
    priority: 30,
    command: "pnpm",
    args: ["sources:laws:post"],
    needsUserInputs: true
  },
  {
    id: "media_redaction",
    cadenceSeconds: 5 * 60,
    retrySeconds: 2 * 60,
    priority: 35,
    command: "pnpm",
    args: ["redaction:worker"],
    needsUserInputs: true
  },
  {
    id: "privacy_purge",
    cadenceSeconds: 24 * 60 * 60,
    retrySeconds: 30 * 60,
    priority: 40,
    command: "pnpm",
    args: ["privacy:purge"],
    needsUserInputs: false
  }
];

export const opsLeaseSeconds = 30 * 60;

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
