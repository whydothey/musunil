import type { LocationResolutionStatus, PublicLocation } from "../../../packages/schemas/src/index.ts";

export type LocationEvidencePoint = {
  evidenceId: string;
  lng: number;
  lat: number;
  gpsAccuracyM: number;
  capturedAt: Date;
};

export type LocationResolutionDecision = {
  status: LocationResolutionStatus;
  location?: PublicLocation;
  fieldEvidenceCount: number;
  reason: string;
};

type LocationAnchor = {
  patterns: string[];
  lng: number;
  lat: number;
  uncertaintyRadiusM: number;
  precision: PublicLocation["precision"];
};

const localityAnchors: Record<string, LocationAnchor[]> = {
  daegu: [
    { patterns: ["본동"], lng: 128.541, lat: 35.834, uncertaintyRadiusM: 1_500, precision: "area" },
    { patterns: ["범어동", "대구지방법원"], lng: 128.631, lat: 35.858, uncertaintyRadiusM: 1_500, precision: "area" },
    { patterns: ["남산동", "중구 선거관리위원회"], lng: 128.59, lat: 35.864, uncertaintyRadiusM: 1_500, precision: "area" },
    { patterns: ["동성로", "중앙파출소"], lng: 128.596, lat: 35.868, uncertaintyRadiusM: 1_500, precision: "area" }
  ],
  gyeongbuk: [
    { patterns: ["포항시"], lng: 129.3435, lat: 36.019, uncertaintyRadiusM: 8_000, precision: "region" },
    { patterns: ["경주시"], lng: 129.2247, lat: 35.8562, uncertaintyRadiusM: 8_000, precision: "region" },
    { patterns: ["구미시"], lng: 128.3446, lat: 36.1196, uncertaintyRadiusM: 8_000, precision: "region" },
    { patterns: ["김천시"], lng: 128.1136, lat: 36.1398, uncertaintyRadiusM: 8_000, precision: "region" },
    { patterns: ["안동시"], lng: 128.7294, lat: 36.5684, uncertaintyRadiusM: 8_000, precision: "region" },
    { patterns: ["경산시"], lng: 128.7415, lat: 35.825, uncertaintyRadiusM: 8_000, precision: "region" },
    { patterns: ["의성군"], lng: 128.697, lat: 36.3527, uncertaintyRadiusM: 12_000, precision: "region" },
    { patterns: ["성주군"], lng: 128.283, lat: 35.919, uncertaintyRadiusM: 12_000, precision: "region" }
  ]
};

const regionAnchors: Record<string, Omit<LocationAnchor, "patterns">> = {
  seoul: { lng: 126.978, lat: 37.5665, uncertaintyRadiusM: 12_000, precision: "region" },
  busan: { lng: 129.0756, lat: 35.1796, uncertaintyRadiusM: 16_000, precision: "region" },
  daegu: { lng: 128.6014, lat: 35.8714, uncertaintyRadiusM: 12_000, precision: "region" },
  incheon: { lng: 126.7052, lat: 37.4563, uncertaintyRadiusM: 20_000, precision: "region" },
  gwangju: { lng: 126.8526, lat: 35.1595, uncertaintyRadiusM: 12_000, precision: "region" },
  daejeon: { lng: 127.3845, lat: 36.3504, uncertaintyRadiusM: 12_000, precision: "region" },
  ulsan: { lng: 129.3114, lat: 35.5384, uncertaintyRadiusM: 18_000, precision: "region" },
  sejong: { lng: 127.289, lat: 36.4801, uncertaintyRadiusM: 14_000, precision: "region" },
  gyeonggi_south: { lng: 127.05, lat: 37.25, uncertaintyRadiusM: 45_000, precision: "region" },
  gyeonggi_north: { lng: 127.04, lat: 37.75, uncertaintyRadiusM: 40_000, precision: "region" },
  gangwon: { lng: 128.2, lat: 37.7, uncertaintyRadiusM: 60_000, precision: "region" },
  chungbuk: { lng: 127.7, lat: 36.8, uncertaintyRadiusM: 45_000, precision: "region" },
  chungnam: { lng: 126.8, lat: 36.5, uncertaintyRadiusM: 45_000, precision: "region" },
  jeonbuk: { lng: 127.15, lat: 35.72, uncertaintyRadiusM: 45_000, precision: "region" },
  jeonnam: { lng: 126.95, lat: 34.87, uncertaintyRadiusM: 55_000, precision: "region" },
  gyeongbuk: { lng: 128.9, lat: 36.3, uncertaintyRadiusM: 65_000, precision: "region" },
  gyeongnam: { lng: 128.25, lat: 35.25, uncertaintyRadiusM: 55_000, precision: "region" },
  jeju: { lng: 126.53, lat: 33.38, uncertaintyRadiusM: 40_000, precision: "region" }
};

export function resolveOfficialLocationEstimate(regionCode: string, locationText: string, now = new Date()): PublicLocation | undefined {
  const normalized = locationText.replace(/\s+/g, " ").trim();
  if (normalized.length < 2 || normalized.length > 120) return undefined;
  const local = localityAnchors[regionCode]?.find((anchor) => anchor.patterns.some((pattern) => normalized.includes(pattern)));
  const anchor = local ?? regionAnchors[regionCode];
  if (!anchor) return undefined;
  const publicRadiusM = 300;
  const blurred = blurPublicCoordinate(anchor.lng, anchor.lat, publicRadiusM);
  return {
    ...blurred,
    label: normalized,
    precision: anchor.precision,
    source: "public_source",
    status: "SOURCE_GEOCODED",
    publicRadiusM,
    uncertaintyRadiusM: anchor.uncertaintyRadiusM,
    fieldEvidenceCount: 0,
    updatedAt: now
  };
}

export function reconcileLocationFromFieldEvidence(
  current: PublicLocation | undefined,
  sourceLocation: PublicLocation | undefined,
  points: LocationEvidencePoint[],
  label: string,
  now = new Date()
): LocationResolutionDecision {
  const valid = points.filter((point) => isSouthKoreaCoordinate(point.lng, point.lat) && point.gpsAccuracyM > 0 && point.gpsAccuracyM <= 100);
  if (valid.length < 2) {
    const fallback = sourceLocation ?? (current?.source === "operator_review" ? current : undefined);
    return {
      status: fallback?.status ?? (fallback ? "SOURCE_GEOCODED" : "TEXT_ONLY"),
      location: fallback,
      fieldEvidenceCount: valid.length,
      reason: "독립적인 현장 위치 근거가 2건 미만이라 공개 좌표를 유지했습니다."
    };
  }

  const clusters = distinctClusters(valid, 600).sort((left, right) => right.length - left.length);
  const strongest = clusters[0] ?? [];
  const strongestCenter = averagePoint(strongest);
  const competing = clusters.find((cluster) => cluster !== strongest && cluster.length >= 2 && metersBetween(strongestCenter, averagePoint(cluster)) > 1_000);
  if (strongest.length < 2 || competing) {
    const disputedFallback = sourceLocation ?? current;
    return {
      status: "LOCATION_DISPUTED",
      location: disputedFallback ? { ...disputedFallback, status: "LOCATION_DISPUTED", fieldEvidenceCount: valid.length, updatedAt: now } : undefined,
      fieldEvidenceCount: valid.length,
      reason: "서로 떨어진 현장 위치 근거가 확인되어 기존 좌표를 유지하고 위치 확인 중으로 전환했습니다."
    };
  }

  const fieldRadiusM = 300;
  const blurred = blurPublicCoordinate(strongestCenter.lng, strongestCenter.lat, fieldRadiusM);
  const baseline = sourceLocation ?? (current?.source !== "field_evidence" ? current : undefined);
  const sourceDistanceM = baseline ? metersBetween(baseline, strongestCenter) : 0;
  const sourceToleranceM = Math.max(1_000, Math.min(15_000, baseline?.uncertaintyRadiusM ?? 1_000));
  const corrected = !baseline || sourceDistanceM <= sourceToleranceM || strongest.length >= 3;
  if (!corrected) {
    return {
      status: "LOCATION_DISPUTED",
      location: baseline ? { ...baseline, status: "LOCATION_DISPUTED", fieldEvidenceCount: strongest.length, updatedAt: now } : undefined,
      fieldEvidenceCount: strongest.length,
      reason: "공개자료 기반 위치와 현장 위치 근거가 크게 달라 자동 수정하지 않고 위치 확인 중으로 전환했습니다."
    };
  }

  const status: Exclude<LocationResolutionStatus, "TEXT_ONLY"> = baseline && sourceDistanceM > 750 && strongest.length >= 3
    ? "CORRECTED"
    : current?.status === "CORRECTED"
      ? "CORRECTED"
      : "FIELD_CORROBORATED";
  return {
    status,
    location: {
      ...blurred,
      label,
      precision: "area",
      source: "field_evidence",
      status,
      publicRadiusM: fieldRadiusM,
      uncertaintyRadiusM: fieldRadiusM,
      fieldEvidenceCount: strongest.length,
      updatedAt: now
    },
    fieldEvidenceCount: strongest.length,
    reason: status === "CORRECTED"
      ? `독립적인 현장 위치 근거 ${strongest.length}건이 일치해 공개 좌표를 보정했습니다.`
      : `독립적인 현장 위치 근거 ${strongest.length}건이 일치해 공개 좌표를 현장 확인 상태로 전환했습니다.`
  };
}

export function locationStatusLabel(status: LocationResolutionStatus | undefined): string {
  if (status === "SOURCE_GEOCODED") return "공개자료 기반 예상 위치";
  if (status === "FIELD_CORROBORATED") return "현장 근거로 확인된 위치";
  if (status === "CORRECTED") return "현장 근거로 보정된 위치";
  if (status === "LOCATION_DISPUTED") return "위치 확인 중";
  return "좌표 확인 중";
}

export function blurPublicCoordinate(lng: number, lat: number, radiusM = 300): { lng: number; lat: number } {
  const gridM = Math.max(100, Math.min(300, radiusM));
  const latStep = gridM / 110_540;
  const lngStep = gridM / (111_320 * Math.max(0.2, Math.cos((lat * Math.PI) / 180)));
  return {
    lng: roundCoord(Math.round(lng / lngStep) * lngStep),
    lat: roundCoord(Math.round(lat / latStep) * latStep)
  };
}

export function metersBetween(left: { lng: number; lat: number }, right: { lng: number; lat: number }): number {
  const earthRadiusM = 6_371_000;
  const lat1 = left.lat * Math.PI / 180;
  const lat2 = right.lat * Math.PI / 180;
  const dLat = lat2 - lat1;
  const dLng = (right.lng - left.lng) * Math.PI / 180;
  const value = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * earthRadiusM * Math.asin(Math.min(1, Math.sqrt(value)));
}

function distinctClusters(points: LocationEvidencePoint[], radiusM: number): LocationEvidencePoint[][] {
  const candidates = points.map((center) => points.filter((point) => metersBetween(center, point) <= radiusM));
  const unique = new Map<string, LocationEvidencePoint[]>();
  for (const cluster of candidates) {
    const key = cluster.map((point) => point.evidenceId).sort().join(":");
    if (key && !unique.has(key)) unique.set(key, cluster);
  }
  return [...unique.values()];
}

function averagePoint(points: Array<{ lng: number; lat: number }>): { lng: number; lat: number } {
  return {
    lng: points.reduce((sum, point) => sum + point.lng, 0) / Math.max(points.length, 1),
    lat: points.reduce((sum, point) => sum + point.lat, 0) / Math.max(points.length, 1)
  };
}

function isSouthKoreaCoordinate(lng: number, lat: number): boolean {
  return Number.isFinite(lng) && Number.isFinite(lat) && lng >= 124.4 && lng <= 132 && lat >= 32.8 && lat <= 38.7;
}

function roundCoord(value: number): number {
  return Number(value.toFixed(6));
}
