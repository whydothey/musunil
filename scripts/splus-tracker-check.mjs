import { existsSync, readFileSync, statSync } from "node:fs";
import { resolve } from "node:path";

const cwd = resolve(import.meta.dirname, "..");
const failures = [];

const master = readFileSync(resolve(cwd, "docs/splus-master-tracker.md"), "utf8");
const national = readFileSync(resolve(cwd, "docs/national-issue-splus-tracker.md"), "utf8");
const launch = readFileSync(resolve(cwd, "docs/launch-readiness-checklist.md"), "utf8");
const audit = readFileSync(resolve(cwd, "docs/splus-completion-audit.md"), "utf8");
const localStatus = readFileSync(resolve(cwd, "docs/local-completion-status.md"), "utf8");
const ux = readFileSync(resolve(cwd, "docs/splus-ux-tracker.md"), "utf8");
const userInputsManual = readFileSync(resolve(cwd, "docs/user-inputs-manual.md"), "utf8");
const packageJson = readFileSync(resolve(cwd, "package.json"), "utf8");

if (!master.includes("Active goal status: 진행 중")) failures.push("master tracker must keep the active goal marked in progress while Active rows remain");
if (!master.includes("## Element Execution Board")) failures.push("master tracker is missing Element Execution Board");
if (!master.includes("## Evidence Gates")) failures.push("master tracker is missing Evidence Gates");
if (!master.includes("docs/splus-completion-audit.md")) failures.push("master tracker must link completion audit");
if (!national.includes("## Scorecard")) failures.push("national issue tracker is missing Scorecard");
if (!audit.includes("Status: 완료 아님.")) failures.push("completion audit must state the goal is not complete");
if (!audit.includes("## Requirement Audit")) failures.push("completion audit missing Requirement Audit");
if (!audit.includes("## Required Final Evidence")) failures.push("completion audit missing Required Final Evidence");
if (!localStatus.includes("pnpm launch:ready")) failures.push("local completion status missing launch:ready");
if (!localStatus.includes("docs/splus-completion-audit.md")) failures.push("local completion status missing completion audit");
if (!localStatus.includes("18개 권역 공식 일정 parser")) failures.push("local completion status missing 18-region source coverage");

const boardRows = parseTable(master, "## Element Execution Board");
const auditRows = parseTable(audit, "## Requirement Audit");
const activeRows = boardRows.filter((row) => row["상태"] === "Active");
const guardRows = boardRows.filter((row) => row["상태"] === "Guard");
const visualEvidenceFiles = [
  ...new Set(`${master}\n${national}\n${ux}`.match(/docs\/[^`\s|]+\.(?:png|jpe?g|webp)/g) ?? []),
];
const auditByRequirement = new Map(auditRows.map((row) => [row["요구사항"], row]));
const activeAuditRequirements = new Map([
  ["상업용 UI/UX 재설계", "알권리 중심 UX"],
  ["데스크톱·모바일 디자인", "알권리 중심 UX"],
  ["지도·지역 UX", "지도·지역 UX"],
  ["운영형 현장 인증", "실시간 현장 인증"],
  ["운영 배포 준비", "운영 배포 준비"],
  ["법안·개정안 연결", "법안·개정안 연결"],
  ["본인확인 기반 쓰기 경계", "본인확인 기반 쓰기 경계"],
  ["규모 실시간 추정", "규모 실시간 추정"],
  ["개인정보·권리 보호", "개인정보/권리 보호"],
]);

if (boardRows.length < 10) failures.push("Element Execution Board must track the full product surface, not a small subset");
if (activeRows.length === 0) failures.push("Element Execution Board must keep external-blocked work as Active until real smoke checks pass");
if (guardRows.length === 0) failures.push("Element Execution Board must keep completed S+ items under Guard");
if (auditRows.length < 10) failures.push("completion audit must track every product-wide requirement");
if (activeRows.length > 0 && /현재 전체 등급은 S\+|Active goal status:\s*완료/.test(master)) {
  failures.push("master tracker must not claim whole-product S+ while Active rows remain");
}

for (const row of boardRows) {
  for (const key of ["순서", "요소", "상태", "S+ 차단 요인", "다음 active goal", "S+ 판정 증거"]) {
    if (!row[key]) failures.push(`Element Execution Board row missing ${key}: ${JSON.stringify(row)}`);
  }
  if (!["Active", "Guard"].includes(row["상태"])) failures.push(`Element Execution Board row has invalid state: ${row["상태"]}`);
}

for (const row of activeRows) {
  if (/^(없음|완료|N\/A)$/i.test(row["S+ 차단 요인"])) failures.push(`Active row must name a real blocker: ${row["요소"]}`);
  if (/유지|회귀 방지/.test(row["다음 active goal"])) failures.push(`Active row must name a forward active goal, not only maintenance: ${row["요소"]}`);
}

for (const row of activeRows) {
  const auditRequirement = activeAuditRequirements.get(row["요소"]);
  if (!auditRequirement) {
    failures.push(`Active row must be mapped into completion audit: ${row["요소"]}`);
    continue;
  }
  const auditRow = auditByRequirement.get(auditRequirement);
  if (!auditRow) {
    failures.push(`completion audit missing Active requirement: ${auditRequirement}`);
    continue;
  }
  if (/S\+/.test(auditRow["현재 판정"])) {
    failures.push(`completion audit must not mark an Active board row S+: ${row["요소"]}`);
  }
  if (!/Active/.test(auditRow["현재 판정"])) {
    failures.push(`completion audit must keep Active board row active: ${row["요소"]}`);
  }
}

for (const row of auditRows) {
  if (/Active/.test(row["현재 판정"]) && ![...activeAuditRequirements.values()].includes(row["요구사항"])) {
    failures.push(`completion audit Active row is not tracked in Element Execution Board: ${row["요구사항"]}`);
  }
}

if (visualEvidenceFiles.length < 10) failures.push("S+ trackers must keep desktop/mobile visual evidence references");
for (const file of visualEvidenceFiles) {
  const path = resolve(cwd, file);
  if (!existsSync(path)) {
    failures.push(`visual evidence file missing: ${file}`);
    continue;
  }
  if (statSync(path).size < 8) {
    failures.push(`visual evidence file is empty: ${file}`);
    continue;
  }
  if (!isRasterImage(readFileSync(path))) {
    failures.push(`visual evidence file is not a recognized raster image: ${file}`);
  }
}

for (const term of [
  "실제 `pnpm storage:smoke` 실행",
  "실제 `pnpm redaction:smoke` 실행",
  "운영 DB",
  "모바일 앱 무결성 provider dry-run"
]) {
  if (!master.includes(term)) failures.push(`master tracker missing external S+ blocker: ${term}`);
}

const lawBoardRow = boardRows.find((row) => row["요소"] === "법안·개정안 연결");
if (!lawBoardRow || !["Active", "Guard"].includes(lawBoardRow["상태"])) {
  failures.push("master tracker must track the law feed as Active or Guard");
} else if (lawBoardRow["상태"] === "Guard" && !/national_assembly_bill_api_key|law_go_kr_oc|실제 공개 API key|실제 원천/.test(`${lawBoardRow["S+ 차단 요인"]} ${lawBoardRow["다음 active goal"]}`)) {
  failures.push("Guard law feed must retain its real official-source credential blocker");
}

for (const term of [
  "실제 storage credential 입력 후 `pnpm storage:smoke` 통과",
  "실제 비식별 엔진 명령 입력 후 `pnpm redaction:smoke` 통과",
  "실제 PortOne 본인확인 완료 ID로 `pnpm identity:smoke` 통과",
  "모바일 LIVE 제보 출시 전 실제 기기에서 무결성 verifier dry-run"
]) {
  if (!launch.includes(term)) failures.push(`launch checklist missing manual S+ gate: ${term}`);
}

if (!national.includes("현재 종합 등급은 A+다.")) failures.push("national issue tracker must not claim S+ before external live verification gates pass");
if (!national.includes("실제 모바일 attestation provider/storage/redaction/identity smoke 실행 남음")) {
  failures.push("national issue tracker missing remaining live verification blocker");
}
if (!packageJson.includes('"launch:external-smoke"')) failures.push("package.json missing launch:external-smoke");
if (!packageJson.includes('"mobile:integrity-smoke"')) failures.push("package.json missing mobile:integrity-smoke");
if (!packageJson.includes('"identity:smoke"')) failures.push("package.json missing identity:smoke");
if (!packageJson.includes('"launch:ready"')) failures.push("package.json missing launch:ready");
if (!packageJson.includes('"launch:post-deploy-smoke"')) failures.push("package.json missing launch:post-deploy-smoke");
if (!packageJson.includes('"launch:final-gate"')) failures.push("package.json missing launch:final-gate");
if (!launch.includes("`pnpm launch:external-smoke`")) failures.push("launch checklist missing unified external smoke command");
if (!launch.includes("`pnpm mobile:integrity-smoke`")) failures.push("launch checklist missing mobile integrity smoke command");
if (!launch.includes("`pnpm identity:smoke`")) failures.push("launch checklist missing identity smoke command");
if (!launch.includes("`pnpm launch:ready`")) failures.push("launch checklist missing unified launch-ready command");
if (!launch.includes("`pnpm launch:post-deploy-smoke`")) failures.push("launch checklist missing post-deploy smoke command");
if (!launch.includes("`pnpm launch:final-gate`")) failures.push("launch checklist missing final gate command");
for (const term of ["pnpm launch:ready -- config/musunil.user-inputs.local.yaml --post-laws", "pnpm sources:refresh-preflight", "pnpm launch:post-deploy-smoke -- --require-laws --require-source-refreshes", "pnpm launch:final-gate"]) {
  if (!userInputsManual.includes(term)) failures.push(`user inputs manual missing final launch command: ${term}`);
}
for (const term of ["pnpm launch:ready", "pnpm launch:post-deploy-smoke", "pnpm launch:final-gate", "sample gate", "실제 `pnpm storage:smoke`", "실제 `pnpm redaction:smoke`", "실제 `pnpm mobile:integrity-smoke`", "실제 `pnpm identity:smoke`", "운영 DB/Redis/Render `/ready`"]) {
  if (!audit.includes(term)) failures.push(`completion audit missing final evidence term: ${term}`);
}

if (failures.length > 0) {
  console.error(["S+ tracker check failed:", ...failures.map((failure) => `- ${failure}`)].join("\n"));
  process.exit(1);
}

console.log(`S+ tracker check passed: ${activeRows.length} Active, ${guardRows.length} Guard, ${visualEvidenceFiles.length} visual evidence files.`);

function parseTable(source, heading) {
  const start = source.indexOf(heading);
  if (start === -1) return [];
  const rest = source.slice(start + heading.length);
  const end = rest.search(/\n## /);
  const section = end === -1 ? rest : rest.slice(0, end);
  const lines = section.split("\n").filter((line) => line.startsWith("|"));
  if (lines.length < 2) return [];
  const headers = splitRow(lines[0]);
  return lines
    .slice(2)
    .map(splitRow)
    .filter((cells) => cells.length === headers.length)
    .map((cells) => Object.fromEntries(headers.map((header, index) => [header, cells[index]])));
}

function splitRow(line) {
  return line.slice(1, -1).split("|").map((cell) => cell.trim());
}

function isRasterImage(bytes) {
  return bytes.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) ||
    bytes.subarray(0, 3).equals(Buffer.from([0xff, 0xd8, 0xff])) ||
    bytes.subarray(0, 4).toString("ascii") === "RIFF" && bytes.subarray(8, 12).toString("ascii") === "WEBP";
}
