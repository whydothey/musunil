import { resolve } from "node:path";
import { loadUserInputs } from "../packages/config/src/index.ts";

const runtime = readRuntime();
const runWriteChecks = process.argv.includes("--write-checks");
const runBoundaryChecks = process.argv.includes("--boundary-checks");
const checks = [];

await check("health", async () => {
  const body = await request("GET", "/health");
  assert(body.ok === true, "health did not return ok=true");
});

await check("home", async () => {
  const body = await request("GET", "/home");
  assert(Array.isArray(body.cards), "home cards are missing");
  assert(body.cards.length > 0, "home cards are empty");
});

await check("laws", async () => {
  const body = await request("GET", "/laws");
  assert(Array.isArray(body.laws), "laws list is missing");
  assert(body.laws.length > 0, "laws list is empty");
  const law = body.laws[0];
  assert(law.id && law.lawName && law.source, "law card identity fields missing");
  assert(typeof law.linkedIssueCount === "number", "law linkedIssueCount missing");
  assert(typeof law.interestScore === "number", "law interestScore missing");
  const detail = await request("GET", `/laws/${encodeURIComponent(law.id)}`);
  assert(detail.law?.id === law.id, "law detail identity mismatch");
  assert(Array.isArray(detail.issues), "law detail issues missing");
  assert(Array.isArray(detail.relatedTargets), "law detail relatedTargets missing");
});

await check("ready", async () => {
  const response = await fetch(`${runtime.apiBaseUrl}/ready`);
  const body = await response.json();
  assert(typeof body.ready === "boolean", "/ready response is missing ready boolean");
  assert(Array.isArray(body.checks), "/ready response is missing checks array");
  if (process.argv.includes("--require-ready")) {
    assert(response.status === 200, `/ready returned ${response.status}`);
    assert(body.ready === true, "/ready returned ready=false");
  }
});

await check("admin_auth_required", async () => {
  const response = await fetch(`${runtime.apiBaseUrl}/admin/review-queue`);
  assert(response.status === 401, `admin route should require internal auth, got ${response.status}`);
});

await check("admin_wrong_key_rejected", async () => {
  const response = await fetch(`${runtime.apiBaseUrl}/admin/review-queue`, {
    headers: { "x-musunil-internal-key": `${runtime.internalApiKey}_wrong` }
  });
  assert(response.status === 401, `wrong internal key should be rejected, got ${response.status}`);
});

await check("security_headers", async () => {
  const response = await rawRequest("GET", "/health");
  assert(response.headers["x-content-type-options"] === "nosniff", "x-content-type-options header missing");
  assert(response.headers["referrer-policy"] === "no-referrer", "referrer-policy header missing");
  assert(response.headers["cache-control"] === "no-store", "cache-control header missing");
});

await check("cors_allowed_origin", async () => {
  for (const origin of ["http://localhost:4173", "http://localhost:4174"]) {
    const response = await rawRequest("GET", "/health", undefined, { origin });
    assert(response.headers["access-control-allow-origin"] === origin, `allowed CORS origin was not echoed: ${origin}`);
    assert(response.headers["access-control-allow-headers"]?.includes("x-musunil-user-id"), "user scope header is not CORS-allowed");
    assert(response.headers["access-control-allow-headers"]?.includes("x-musunil-user-token"), "user token header is not CORS-allowed");
    assert(response.headers.vary === "Origin", "Vary: Origin header missing");
  }
});

await check("cors_disallowed_origin", async () => {
  const origin = "https://not-allowed.musunil.invalid";
  const response = await rawRequest("GET", "/health", undefined, { origin });
  assert(response.headers["access-control-allow-origin"] !== origin, "disallowed CORS origin was echoed");
});

await check("user_scope_required", async () => {
  const response = await rawRequest("GET", "/me/reports?userId=user_1");
  assert(response.status === 401, `/me route without user scope should return 401, got ${response.status}`);
  assert(response.body?.error === "identity_required", "user scope error code mismatch");
});

await check("user_scope_allowed", async () => {
  const session = await anonymousSession();
  const response = await rawRequest("GET", `/me/reports?userId=${session.userId}`, undefined, userHeaders(session));
  assert(response.ok, `/me route with matching user scope returned ${response.status}`);
  assert(Array.isArray(response.body?.reports), "scoped reports response is missing reports array");
});

await check("subscription_user_scope_mismatch", async () => {
  const session = await anonymousSession();
  const response = await rawRequest(
    "POST",
    "/subscriptions",
    JSON.stringify({ userId: "user_1", targetType: "occurrence", targetId: "occ_1", alertLevel: "major_only", alertTypes: ["state_changed"] }),
    userHeaders(session)
  );
  assert(response.status === 401, `subscription user scope mismatch should return 401, got ${response.status}`);
  assert(response.body?.error === "identity_required", "subscription user scope error code mismatch");
});

await check("report_user_scope_mismatch", async () => {
  const session = await anonymousSession();
  const response = await rawRequest(
    "POST",
    "/reports/material",
    JSON.stringify({ userId: "victim_user", targetType: "occurrence", targetId: "occ_1", rawText: "spoofed owner" }),
    userHeaders(session)
  );
  assert(response.status === 401, `report user scope mismatch should return 401, got ${response.status}`);
  assert(response.body?.error === "identity_required", "report user scope error code mismatch");
});

await check("admin_queue", async () => {
  const body = await request("GET", "/admin/review-queue", undefined, true);
  assert(Array.isArray(body.claims), "admin queue claims are missing");
});

await check("admin_risk_dashboard", async () => {
  const body = await request("GET", "/admin/risk-dashboard", undefined, true);
  assert(body.decisionPolicy === "signals_prioritize_review_only", "admin risk dashboard policy mismatch");
  assert(typeof body.summary?.reviewQueueCount === "number", "admin risk dashboard summary missing");
  assert(Array.isArray(body.issueRisks), "admin risk dashboard issueRisks missing");
  assert(JSON.stringify(body).includes("private/live/2026") === false, "admin risk dashboard leaked private storage path");
});

await check("admin_privacy_dashboard", async () => {
  const body = await request("GET", "/admin/privacy-dashboard", undefined, true);
  assert(body.policy === "private_originals_precise_location_never_public", "admin privacy dashboard policy mismatch");
  assert(typeof body.summary?.heldPrivateClaimCount === "number", "admin privacy dashboard summary missing");
  assert(typeof body.purgePreview?.originalMedia === "number", "admin privacy dashboard purge preview missing");
  assert(JSON.stringify(body).includes("private/live/2026") === false, "admin privacy dashboard leaked private storage path");
});

await check("internal_device_integrity", async () => {
  const unauthed = await rawRequest("PATCH", "/internal/evidence/ev_occ_live_1/device-integrity", JSON.stringify({ deviceIntegrityStatus: "unknown" }));
  assert(unauthed.status === 401, `device integrity patch without internal key should return 401, got ${unauthed.status}`);
  const missingProof = await rawRequest(
    "PATCH",
    "/internal/evidence/ev_occ_live_1/device-integrity",
    JSON.stringify({ deviceIntegrityStatus: "pass", provider: "play_integrity" }),
    { "x-musunil-internal-key": runtime.internalApiKey }
  );
  assert(missingProof.status === 400, `device integrity proofless patch should return 400, got ${missingProof.status}`);
  const updated = await request(
    "PATCH",
    "/internal/evidence/ev_occ_live_1/device-integrity",
    { deviceIntegrityStatus: "pass", provider: "play_integrity", attestationToken: "runtime-device-token" },
    true
  );
  assert(updated.status === "device_integrity_recorded", "device integrity patch status mismatch");
  assert(updated.evidence?.deviceIntegrityStatus === "pass", "device integrity patch did not record trusted result");
  assert(updated.evidence?.deviceIntegrityProvider === "play_integrity", "device integrity provider not recorded");
  assert(String(updated.evidence?.deviceIntegrityProofHash || "").startsWith("sha256-"), "device integrity proof hash missing");
  assert(JSON.stringify(updated).includes("runtime-device-token") === false, "device integrity response leaked raw attestation token");
  assert(JSON.stringify(updated).includes("storageKey") === false, "device integrity response leaked storage key");
});

await check("internal_redaction_worker", async () => {
  const unauthed = await rawRequest("PATCH", "/internal/evidence/ev_occ_live_1/redaction", JSON.stringify({ redactedClipUrl: "/media/redacted/runtime-live.webm" }));
  assert(unauthed.status === 401, `redaction patch without internal key should return 401, got ${unauthed.status}`);
  const invalid = await rawRequest(
    "PATCH",
    "/internal/evidence/ev_occ_live_1/redaction",
    JSON.stringify({ redactedClipUrl: "/private/live/runtime-live.webm" }),
    { "x-musunil-internal-key": runtime.internalApiKey }
  );
  assert(invalid.status === 400, `private redaction URL should return 400, got ${invalid.status}`);
  const proofless = await rawRequest(
    "PATCH",
    "/internal/evidence/ev_occ_live_1/redaction",
    JSON.stringify({ redactedClipUrl: "/media/redacted/runtime-live.webm" }),
    { "x-musunil-internal-key": runtime.internalApiKey }
  );
  assert(proofless.status === 400, `proofless redaction patch should return 400, got ${proofless.status}`);
  const updated = await request(
    "PATCH",
    "/internal/evidence/ev_occ_live_1/redaction",
    { redactedClipUrl: "/media/redacted/runtime-live.webm", redactionProofToken: "runtime-redaction-report" },
    true
  );
  assert(updated.status === "redaction_recorded", "redaction patch status mismatch");
  assert(updated.evidence?.redactionStatus === "completed", "redaction patch did not mark completed");
  assert(String(updated.evidence?.redactionProofHash || "").startsWith("sha256-"), "redaction proof hash missing");
  assert(JSON.stringify(updated).includes("runtime-redaction-report") === false, "redaction response leaked raw proof token");
  assert(JSON.stringify(updated).includes("storageKey") === false, "redaction response leaked storage key");
});

await check("public_schema_safety", async () => {
	  for (const path of [
	    "/home",
	    "/occurrences/occ_1",
	    "/targets/occurrence/occ_1/live-claims",
	    "/targets/issue/issue_1/live-claims",
	    "/continuous-presences/presence_1",
	    "/area-clusters"
	  ]) {
    assertPublicPayloadSafe(await request("GET", path));
  }
});

await check("public_live_claim_safety", async () => {
  const body = await request("GET", "/targets/occurrence/occ_1/live-claims");
  assert(Array.isArray(body.liveClaims), "live claims response is missing liveClaims array");
  assert(body.liveClaims.length > 0, "seed live claims response is empty");
  assert(typeof body.liveClaims[0].publicRadiusM === "number", "live claim public radius is missing");
  assertPublicPayloadSafe(body);
});

if (runWriteChecks) {
  await check("write_claim_raw_safety", async () => {
    const marker = `SMOKE_RAW_${Date.now()}`;
    const session = await anonymousSession();
    const created = await request("POST", "/reports/material", { userId: session.userId, targetType: "occurrence", targetId: "occ_1", rawText: marker }, false, userHeaders(session));
    assert(JSON.stringify(created).includes(marker) === false, "raw report text leaked from create response");
    const detail = await request("GET", "/occurrences/occ_1");
    assert(JSON.stringify(detail).includes(marker) === false, "raw report text leaked from public detail");
  });
}

if (runBoundaryChecks) {
  await check("invalid_json_boundary", async () => {
    const response = await rawRequest("POST", "/reports/material", "{", {
      "x-forwarded-for": `198.51.100.invalid-${Date.now()}`
    });
    assert(response.status === 400, `invalid JSON should return 400, got ${response.status}`);
    assert(response.body?.error === "invalid_json", "invalid JSON error code mismatch");
  });

  await check("body_too_large_boundary", async () => {
    const response = await rawRequest("POST", "/reports/material", Buffer.alloc(257 * 1024, "x"), {
      "x-forwarded-for": `198.51.100.large-${Date.now()}`
    });
    assert(response.status === 413, `large body should return 413, got ${response.status}`);
    assert(response.body?.error === "body_too_large", "large body error code mismatch");
  });

  await check("public_write_rate_limit_boundary", async () => {
    const forwardedFor = `198.51.100.rate-${Date.now()}`;
    let lastResponse;
    for (let index = 0; index < 31; index += 1) {
      lastResponse = await rawRequest("POST", "/reports/material", "{", { "x-forwarded-for": forwardedFor });
    }
    assert(lastResponse?.status === 429, `31st public write should return 429, got ${lastResponse?.status}`);
    assert(lastResponse.body?.error === "rate_limited", "rate limit error code mismatch");
  });
}

await check("forbidden_public_types_absent", async () => {
  const body = await request("GET", "/home");
  const text = JSON.stringify(body);
  assert(!text.includes("hazard_area"), "hazard_area leaked into assembly-focused public API");
  assert(!text.includes("service_disruption"), "service_disruption leaked into assembly-focused public API");
});

await check("forbidden_engagement_endpoints_absent", async () => {
  for (const path of ["/comments", "/votes", "/likes", "/reactions", "/donations", "/sponsorships"]) {
    const response = await rawRequest("POST", path, JSON.stringify({ targetType: "occurrence", targetId: "occ_1" }));
    assert(response.status === 404, `${path} should not exist, got ${response.status}`);
  }
});

await check("public_source_coverage", async () => {
  const body = await request("GET", "/public-sources/coverage");
  assert(body.coverage?.totalPoliceRegions === 18, "public source coverage must include all police regions");
  assert(body.coverage?.fullScheduleCoverage === true, "public source coverage must have full schedule coverage");
  assert(body.coverage?.activeScheduleRegions === 18, "public source coverage must have all active schedule sources");
  assert(typeof body.coverage?.candidateScheduleRegions === "number", "public source coverage candidate count missing");
  assert(body.coverage?.needsDiscoveryRegions === 0, "public source coverage must not have discovery gaps");
  assert(typeof body.coverage?.nextRefreshAt === "string", "public source coverage next refresh is missing");
  assert(body.coverage?.regions?.length === 18, "public source coverage regions missing");
  assert(
    body.coverage.regions.every((region) => region.refreshCadenceHours > 0 && region.lastCheckedAt && region.nextRefreshAt && region.gapReason),
    "public source region freshness contract missing"
  );
  assert(body.coverage?.policy === "absence_of_public_source_is_not_absence_of_assembly", "public source absence policy mismatch");
});

await check("notification_dispatch_local_completion", async () => {
  const body = await request("POST", "/internal/notifications/dispatch", {}, true);
  assert(body.status === "local_dispatch_completed", "notification dispatch local completion failed");
  assert(typeof body.dispatchedCount === "number", "notification dispatch count missing");
});

await check("privacy_purge_preview", async () => {
  const body = await request("POST", "/internal/privacy/purge-expired", {}, true);
  assert(body.status === "privacy_purge_completed", "privacy purge failed");
});

const failed = checks.filter((item) => !item.ok);
console.log(JSON.stringify({ apiBaseUrl: runtime.apiBaseUrl, writeChecks: runWriteChecks, boundaryChecks: runBoundaryChecks, checks }, null, 2));
if (failed.length > 0) process.exit(1);

async function check(id, action) {
  try {
    await action();
    checks.push({ id, ok: true });
  } catch (error) {
    checks.push({ id, ok: false, message: error instanceof Error ? error.message : String(error) });
  }
}

async function request(method, path, body, internal = false, headers = {}) {
  const response = await rawRequest(
    method,
    path,
    body ? JSON.stringify(body) : undefined,
    { ...(internal ? { "x-musunil-internal-key": runtime.internalApiKey } : {}), ...headers }
  );
  assert(response.ok, `${method} ${path} returned ${response.status}: ${JSON.stringify(response.body)}`);
  return response.body;
}

async function rawRequest(method, path, body, headers = {}) {
  const response = await fetch(`${runtime.apiBaseUrl}${path}`, {
    method,
    headers: {
      "content-type": "application/json",
      ...headers
    },
    body
  });
  const text = await response.text();
  let payload;
  try {
    payload = text.length > 0 ? JSON.parse(text) : undefined;
  } catch {
    payload = text;
  }
  return { ok: response.ok, status: response.status, headers: Object.fromEntries(response.headers.entries()), body: payload };
}

async function anonymousSession() {
  const start = await rawRequest("POST", "/auth/identity/start", JSON.stringify({ purpose: "general" }));
  assert(start.status === 201, `identity start returned ${start.status}`);
  assert(typeof start.body?.identityVerificationId === "string", "identity start missing identityVerificationId");
  const response = await rawRequest(
    "POST",
    "/auth/identity/complete",
    JSON.stringify({ identityVerificationId: start.body.identityVerificationId, testCi: `ci-${Date.now()}-${Math.random()}`, testDi: `di-${Date.now()}-${Math.random()}` })
  );
  assert(response.status === 201, `identity complete returned ${response.status}`);
  assert(typeof response.body?.userId === "string", "anonymous session missing userId");
  assert(typeof response.body?.token === "string", "anonymous session missing token");
  assert(response.body?.authLevel === "identity_verified", "identity session authLevel mismatch");
  assert(Date.parse(response.body?.expiresAt) > Date.now(), "anonymous session expiresAt is missing or expired");
  return response.body;
}

function userHeaders(session) {
  return {
    "x-musunil-user-id": session.userId,
    "x-musunil-user-token": session.token
  };
}

function assertPublicPayloadSafe(body) {
  const text = JSON.stringify(body);
  for (const field of [
    '"statement"',
    '"claimIds"',
    '"evidenceIds"',
    '"delayClaimIds"',
    '"serviceStatusClaimIds"',
    '"flowDirectionClaimIds"',
    '"emergencySignalClaimIds"',
    '"targetRefs"',
    '"storageKey"',
    '"publicStorageKey"',
    '"privateMediaBase64"',
    '"mediaBase64"',
    '"hash"',
    '"geoCell"',
    '"gpsAccuracyM"',
    '"distanceToTargetM"',
    '"deviceIntegrityProvider"',
    '"deviceIntegrityProofHash"',
    '"deviceIntegrityCheckedAt"'
  ]) {
    assert(!text.includes(field), `public payload leaked ${field}`);
  }
}

function readRuntime() {
  const cwd = resolve(import.meta.dirname, "..");
  let config = {};
  try {
    config = loadUserInputs({ cwd }).config;
  } catch {
    config = {};
  }

  const apiBaseUrl = process.env.MUSUNIL_API_BASE_URL ?? apiUrlFromHostport(process.env.MUSUNIL_API_HOSTPORT) ?? readConfigString(config, "api.internal_base_url") ?? "http://localhost:4000";
  const internalApiKey = process.env.MUSUNIL_INTERNAL_API_KEY ?? readConfigString(config, "security.internal_api_key");
  if (!internalApiKey || internalApiKey.startsWith("CHANGE_ME")) {
    throw new Error("Set security.internal_api_key in the user-inputs YAML or MUSUNIL_INTERNAL_API_KEY before runtime smoke.");
  }
  return { apiBaseUrl: apiBaseUrl.replace(/\/$/, ""), internalApiKey };
}

function apiUrlFromHostport(hostport) {
  return hostport ? `http://${hostport}` : undefined;
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function readConfigString(config, path) {
  const value = path.split(".").reduce((current, key) => {
    if (!current || typeof current !== "object" || Array.isArray(current)) return undefined;
    return current[key];
  }, config);
  return typeof value === "string" && value.length > 0 ? value : undefined;
}
