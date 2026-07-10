import assert from "node:assert/strict";
import {
  calculatePriorityScore,
  canAutoMergeCandidate,
  hasProofOfPresence,
  moderationDecisionFromRightsReports,
  shouldNotify,
  type Claim,
  type Evidence
} from "./index.ts";

const now = new Date("2026-07-07T09:00:00.000Z");

const officialClaim: Claim = {
  id: "claim_1",
  targetType: "occurrence",
  targetId: "occ_1",
  sourceProvenance: "government_or_police",
  claimantLabel: "기관 발표",
  statement: "공식 발표도 Claim으로 저장된다.",
  normalizedStatement: "기관 발표 있음",
  evidenceStrength: "single_source",
  riskLevel: "misleading_possible",
  createdAt: now,
  evidenceIds: [],
  disputedByClaimIds: []
};

assert.equal(officialClaim.sourceProvenance, "government_or_police");
assert.equal(officialClaim.evidenceStrength, "single_source");
assert.equal(officialClaim.riskLevel, "misleading_possible");

const liveEvidence: Evidence = {
  id: "ev_1",
  evidenceType: "live_media",
  capturedAt: now,
  uploadedAt: new Date("2026-07-07T09:04:00.000Z"),
  foregroundGps: true,
  gpsAccuracyM: 30,
  distanceToTargetM: 80,
  deviceIntegrityStatus: "pass",
  captureMode: "in_app_camera",
  durationMs: 8000
};
const proofPolicy = { maxUploadMinutes: 5, minDurationMs: 5000, minGpsAccuracyM: 100, maxDistanceToTargetM: 200 };

assert.equal(hasProofOfPresence(liveEvidence, proofPolicy), true);
assert.equal(hasProofOfPresence({ ...liveEvidence, evidenceType: "sensor" }, proofPolicy), true);
assert.equal(hasProofOfPresence({ ...liveEvidence, evidenceType: "material_media" }, proofPolicy), false);
assert.equal(hasProofOfPresence({ ...liveEvidence, captureMode: "gallery" }, proofPolicy), false);
assert.equal(hasProofOfPresence({ ...liveEvidence, captureMode: "external_link" }, proofPolicy), false);
assert.equal(hasProofOfPresence({ ...liveEvidence, durationMs: 1000 }, proofPolicy), false);
assert.equal(hasProofOfPresence({ ...liveEvidence, deviceIntegrityStatus: "unknown" }, proofPolicy), true);
assert.equal(hasProofOfPresence({ ...liveEvidence, deviceIntegrityStatus: "fail" }, proofPolicy), false);

assert.equal(
  canAutoMergeCandidate(
    { targetType: "occurrence", issueId: "issue_1", areaClusterId: "seoul", startsAt: now, relationHint: "possibly_duplicate" },
    { targetType: "occurrence", issueId: "issue_1", areaClusterId: "busan", startsAt: now, relationHint: "possibly_duplicate" }
  ),
  false
);

assert.equal(
  canAutoMergeCandidate(
    { targetType: "occurrence", issueId: "issue_1", areaClusterId: "seoul", startsAt: now, relationHint: "counter_assembly" },
    { targetType: "occurrence", issueId: "issue_1", areaClusterId: "seoul", startsAt: now, relationHint: "possibly_duplicate" }
  ),
  false
);

assert.equal(shouldNotify("claim_collected"), false);
assert.equal(shouldNotify("raw_report_volume_increased"), false);
assert.equal(shouldNotify("report_count_increased"), false);
assert.equal(shouldNotify("donation_increased"), false);
assert.equal(shouldNotify("single_source_claim"), false);
assert.equal(shouldNotify("state_changed"), true);
assert.equal(shouldNotify("route_changed"), true);
assert.equal(shouldNotify("transit_impact_changed"), true);
assert.equal(shouldNotify("rebuttal_added"), true);
assert.equal(shouldNotify("correction_reflected"), true);

assert.equal(
  moderationDecisionFromRightsReports({ count: 1000, highestRiskLevel: "rights_risk", coordinatedAttackSuspected: true }),
  "keep_with_review"
);
assert.equal(
  moderationDecisionFromRightsReports({ count: 1, highestRiskLevel: "must_hold_private", coordinatedAttackSuspected: false }),
  "mask_or_hold_for_review"
);

assert.equal(
  calculatePriorityScore({
    recency: 10,
    updateVelocity: 5,
    proofOfPresenceGrowth: 4,
    publicImpact: 3,
    safetyOrTransitImpact: 2,
    sourceDiversity: 2,
    claimConflict: 1,
    evidenceStrength: 5,
    manipulationSuspicion: 3,
    massReportPenalty: 2,
    singleSourcePenalty: 1
  }),
  26
);
