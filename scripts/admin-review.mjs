import { resolve } from "node:path";
import { loadUserInputs } from "../packages/config/src/index.ts";

const riskLevels = new Set(["low", "misleading_possible", "rights_risk", "high_legal_privacy_risk", "must_hold_private"]);

const command = process.argv[2] ?? "help";
const args = process.argv.slice(3);

try {
  if (command === "privacy") {
    const dashboard = await apiRequest("GET", "/admin/privacy-dashboard");
    if (hasFlag(args, "json")) {
      console.log(JSON.stringify(dashboard, null, 2));
    } else {
      printPrivacyDashboard(dashboard);
    }
  } else if (command === "risk") {
    const dashboard = await apiRequest("GET", "/admin/risk-dashboard");
    if (hasFlag(args, "json")) {
      console.log(JSON.stringify(dashboard, null, 2));
    } else {
      printRiskDashboard(dashboard);
    }
  } else if (command === "queue") {
    const queue = await apiRequest("GET", "/admin/review-queue");
    if (hasFlag(args, "json")) {
      console.log(JSON.stringify(queue, null, 2));
    } else {
      printQueue(queue);
    }
  } else if (command === "claim") {
    const id = args[0];
    if (!id) throw new Error("claim id is required.");
    const riskLevel = readOption(args, "risk");
    if (riskLevel && !riskLevels.has(riskLevel)) throw new Error(`invalid risk level: ${riskLevel}`);
    const body = {
      ...(riskLevel ? { riskLevel } : {}),
      ...(readOption(args, "statement") ? { normalizedStatement: readOption(args, "statement") } : {}),
      ...(hasFlag(args, "publish") ? { visibility: "public" } : {}),
      ...(hasFlag(args, "hold") ? { visibility: "held_private" } : {}),
      publicReason: readOption(args, "reason") ?? "admin reviewed Claim"
    };
    if (!body.riskLevel && !body.normalizedStatement && !body.visibility) throw new Error("--risk, --statement, --publish, or --hold is required.");
    const result = await apiRequest("PATCH", `/admin/claims/${encodeURIComponent(id)}`, body);
    console.log(JSON.stringify(result, null, 2));
  } else if (command === "redaction") {
    const id = args[0];
    if (!id) throw new Error("evidence id is required.");
    const redactedClipUrl = readOption(args, "url");
    const redactedPosterUrl = readOption(args, "poster-url");
    const proofToken = readOption(args, "proof-token");
    const proofHash = readOption(args, "proof-hash");
    if (!redactedClipUrl) throw new Error("--url is required.");
    if (!proofToken && !proofHash) throw new Error("--proof-token or --proof-hash is required.");
    const result = await apiRequest("PATCH", `/internal/evidence/${encodeURIComponent(id)}/redaction`, {
      redactedClipUrl,
      ...(redactedPosterUrl ? { redactedPosterUrl } : {}),
      ...(proofToken ? { redactionProofToken: proofToken } : { redactionProofHash: proofHash })
    });
    console.log(JSON.stringify(result, null, 2));
  } else if (command === "news") {
    const candidates = await apiRequest("GET", "/admin/news-issue-candidates");
    if (hasFlag(args, "json")) console.log(JSON.stringify(candidates, null, 2));
    else printNewsCandidates(candidates);
  } else if (command === "news-candidate") {
    const id = args[0];
    if (!id) throw new Error("news candidate id is required.");
    const status = hasFlag(args, "approve") ? "approved" : hasFlag(args, "reject") ? "rejected" : undefined;
    if (!status) throw new Error("--approve or --reject is required.");
    const evidenceIds = readOption(args, "evidence-ids")?.split(",").map((item) => item.trim()).filter(Boolean);
    const result = await apiRequest("PATCH", `/admin/news-issue-candidates/${encodeURIComponent(id)}`, {
      status,
      ...(evidenceIds?.length ? { evidenceIds } : {}),
      reviewNote: readOption(args, "reason") ?? "뉴스 이슈 연결 검토"
    });
    console.log(JSON.stringify(result, null, 2));
  } else {
    printUsage();
  }
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
}

async function apiRequest(method, path, body) {
  const runtime = readRuntime();
  const response = await fetch(`${runtime.apiBaseUrl}${path}`, {
    method,
    headers: {
      "content-type": "application/json",
      "x-musunil-internal-key": runtime.internalApiKey
    },
    body: body ? JSON.stringify(body) : undefined
  });
  const payload = await readJson(response);
  if (!response.ok) {
    throw new Error(`${method} ${path} failed: ${response.status} ${JSON.stringify(payload)}`);
  }
  return payload;
}

function readRuntime() {
  const cwd = resolve(import.meta.dirname, "..");
  let config;
  try {
    config = loadUserInputs({ cwd }).config;
  } catch {
    config = {};
  }

  const apiBaseUrl = process.env.MUSUNIL_API_BASE_URL ?? apiUrlFromHostport(process.env.MUSUNIL_API_HOSTPORT) ?? readConfigString(config, "api.internal_base_url") ?? "http://localhost:4000";
  const internalApiKey = process.env.MUSUNIL_INTERNAL_API_KEY ?? readConfigString(config, "security.internal_api_key");
  if (!internalApiKey || internalApiKey.startsWith("CHANGE_ME")) {
    throw new Error("Set security.internal_api_key in the user-inputs YAML or MUSUNIL_INTERNAL_API_KEY before admin operations.");
  }
  return { apiBaseUrl: apiBaseUrl.replace(/\/$/, ""), internalApiKey };
}

function apiUrlFromHostport(hostport) {
  return hostport ? `http://${hostport}` : undefined;
}

async function readJson(response) {
  const text = await response.text();
  if (!text) return {};
  try {
    return JSON.parse(text);
  } catch {
    return { raw: text };
  }
}

function printQueue(queue) {
  const claims = Array.isArray(queue.claims) ? queue.claims : [];
  console.log(`review_queue claims=${claims.length}`);
  for (const claim of claims) {
    console.log(`${claim.id} | ${claim.riskLevel} | ${claim.sourceProvenance} | ${claim.targetType}:${claim.targetId}`);
    if (claim.visibility === "held_private") console.log("  visibility: held_private");
    console.log(`  ${claim.normalizedStatement}`);
  }
}

function printRiskDashboard(dashboard) {
  const summary = dashboard.summary ?? {};
  console.log(
    `risk_dashboard review=${summary.reviewQueueCount ?? 0} high=${summary.highRiskClaimCount ?? 0} held=${summary.heldPrivateClaimCount ?? 0} pending_redaction=${summary.pendingRedactionCount ?? 0} user_clusters=${summary.userClusterCount ?? 0} device_clusters=${summary.deviceAttestationClusterCount ?? 0}`
  );
  console.log(`policy: ${dashboard.decisionPolicy}`);
  for (const issue of dashboard.issueRisks ?? []) {
    console.log(`${issue.riskScore} | ${issue.title} | review=${issue.reviewClaimCount}`);
    for (const signal of issue.verificationSignals ?? []) console.log(`  ${signal.severity} ${signal.label}: ${signal.summary}`);
  }
}

function printPrivacyDashboard(dashboard) {
  const summary = dashboard.summary ?? {};
  const purge = dashboard.purgePreview ?? {};
  console.log(`privacy_dashboard held=${summary.heldPrivateClaimCount ?? 0} pending_redaction=${summary.pendingRedactionCount ?? 0} originals=${summary.originalMediaStoredCount ?? 0} precise=${summary.preciseLocationStoredCount ?? 0}`);
  console.log(`policy: ${dashboard.policy}`);
  console.log(`purge_preview raw=${purge.rawStatements ?? 0} precise=${purge.preciseLocationFields ?? 0} originals=${purge.originalMedia ?? 0} upload_buffers=${purge.liveUploadBuffers ?? 0}`);
}

function printNewsCandidates(payload) {
  const candidates = Array.isArray(payload.candidates) ? payload.candidates : [];
  console.log(`news_issue_candidates count=${candidates.length}`);
  for (const candidate of candidates) {
    console.log(`${candidate.id} | ${candidate.group?.billTitle ?? candidate.lawGroupId} | ${candidate.coreTopic?.label ?? "법안명 전체"}`);
    console.log(`  pending=${candidate.pendingArticles?.length ?? 0} publishers=${candidate.eligibility?.publisherCount ?? 0} eligible=${candidate.eligibility?.eligibleForReview === true}`);
    for (const article of candidate.pendingArticles ?? []) console.log(`  - ${article.publisherLabel} | ${article.publishedAt} | ${article.sourceTitle}`);
  }
}

function printUsage() {
  console.log(`Usage:
  pnpm admin:privacy
  pnpm admin:privacy -- --json
  pnpm admin:risk
  pnpm admin:risk -- --json
  pnpm admin:queue
  pnpm admin:queue -- --json
  pnpm admin:claim <claim_id> -- --risk low --reason "reviewed"
  pnpm admin:claim <claim_id> -- --publish --reason "ready for public view"
  pnpm admin:claim <claim_id> -- --hold --reason "privacy review needed"
  pnpm admin:claim <claim_id> -- --statement "정정된 공개 문장" --reason "privacy wording"
  pnpm admin:redaction <evidence_id> -- --url "/media/redacted/clip.webm" --poster-url "/media/redacted/clip-poster.webp" --proof-hash "sha256-..."
  pnpm admin:news
  pnpm admin:news -- --json
  pnpm admin:news-candidate <candidate_id> -- --approve --reason "독립 매체와 법안 연관성 확인"
  pnpm admin:news-candidate <candidate_id> -- --reject --reason "관련성 부족"
`);
}

function hasFlag(values, name) {
  return values.includes(`--${name}`);
}

function readOption(values, name) {
  const exactIndex = values.indexOf(`--${name}`);
  if (exactIndex >= 0) return values[exactIndex + 1];
  const prefix = `--${name}=`;
  return values.find((value) => value.startsWith(prefix))?.slice(prefix.length);
}

function readConfigString(config, path) {
  const value = path.split(".").reduce((current, key) => {
    if (!current || typeof current !== "object" || Array.isArray(current)) return undefined;
    return current[key];
  }, config);
  return typeof value === "string" && value.length > 0 ? value : undefined;
}
