import { createHash } from "node:crypto";
import type { LawCoreTopic, LawGroup, LawGroupMembership, LawItem } from "../../../packages/schemas/src/index.ts";

export const lawGroupClassificationVersion = "exact-title-groups-v2";

type TopicRule = {
  key: string;
  label: string;
  keywords: string[];
  patterns: RegExp[];
};

const topicRules: TopicRule[] = [
  rule("peaceful-unreported-assembly", "평화적 미신고 집회·처벌", ["평화적 집회", "미신고 집회", "형사처벌"], ["미신고.{0,12}(집회|시위)", "평화.{0,8}(집회|시위)", "형사처벌"]),
  rule("ballot-supply", "투표용지·공급 대응", ["투표용지", "공급 대응", "비상 물류"], ["투표용지.{0,10}(부족|고갈|수량|인쇄|배분|공급)", "(부족|고갈).{0,10}투표용지", "예비투표용지", "선거물류"]),
  rule("advance-voting", "사전투표·관리 제도", ["사전투표", "투표함 관리", "선거 신뢰"], ["사전투표", "사전 투표", "사전투표함"]),
  rule("election-management-oversight", "선거관리·감독 책임", ["선거관리", "감독", "사고 대응"], ["선거관리.{0,12}(감독|책임|사고|검증|통제)", "선거관리위원회.{0,12}(감독|조사|책임|보고)", "투.?개표.{0,10}(감독|검증|투명)"]),
  rule("voter-identity-and-records", "투표 본인확인·기록", ["본인확인", "선거인명부", "투표 기록"], ["본인.{0,6}확인", "선거인명부", "신분증명서"]),
  rule("voting-accessibility", "투표 접근성·기표 편의", ["투표 접근성", "기표 편의", "취약계층"], ["기표칸", "고령.{0,8}(유권자|선거인)", "취약계층.{0,8}(투표|기표)"]),
  rule("presidential-runoff", "대통령선거·결선투표", ["대통령선거", "결선투표", "과반 득표"], ["결선투표", "과반.{0,8}(득표|지지)", "상대다수투표"]),
  rule("election-districts", "선거구·보궐선거", ["선거구 획정", "보궐선거", "후보 사퇴"], ["선거구.{0,8}(획정|분할)", "보궐선거", "직을 그만두", "후보자.{0,6}사퇴"]),
  rule("local-government-election-restrictions", "지자체 행사·지원 제한", ["지자체 행사", "현금성 지원", "선거 전 제한"], ["지방자치단체.{0,14}(행사|축제|지원|쿠폰|지역화폐)", "선거일 전.{0,10}(행사|지원|보고회)", "현금성 지원"]),
  rule("candidate-information", "후보자·정당 정보 공개", ["후보자 정보", "정당 정보", "유권자 알권리"], ["후보자정보", "후보자.{0,10}(정보|탈당|공개)", "자진 탈당"]),
  rule("campaign-expression", "선거운동·표현 매체", ["선거운동", "현수막", "딥페이크"], ["선거운동", "선거공보", "선거벽보", "현수막", "딥페이크", "인공지능.{0,8}(영상|홍보|풍자)"]),
  rule("candidate-debates", "후보자 토론", ["후보자 토론", "대담", "유권자 검증"], ["후보자.{0,8}(대담|토론)", "선거방송토론위원회"]),
  rule("election-media-review", "선거보도·심의", ["선거보도", "심의위원회", "상시 심의"], ["선거방송심의위원회", "선거기사심의위원회", "불공정 선거보도"]),
  rule("public-official-election-neutrality", "공직자·선거 중립", ["공직자", "선거 중립", "정치 활동"], ["공무원.{0,10}(선거운동|정치적 중립)", "공직자.{0,12}(기부행위|공연|정치)"]),
  rule("election-disputes", "선거 무효·증거 보전", ["선거 무효", "증거 보전", "선거 물품"], ["선거.{0,8}무효", "증거보전", "선거물품.{0,10}(보관|폐기)"]),
  rule("assembly-election-commission-oversight", "국회·선관위 감독", ["국회 감독", "선거관리위원회", "청문·조사"], ["국회.{0,24}선거관리", "선거관리.{0,24}(국정감사|청문회|조사위원회|감독위원회|상임위원회)", "(국정감사|청문회).{0,30}(각급|중앙)?선거관리", "행정안전위원회.{0,24}(소관|선거관리)", "선거관리위원회법.{0,12}일부개정"]),
  rule("assembly-committee-operation", "국회 위원회·의사 운영", ["위원회 운영", "안건조정", "회의 개회"], ["안건조정위원회", "위원회.{0,10}(개회|의사진행|안건 심사|제안설명)", "임시회.{0,8}소집"]),
  rule("assembly-organization", "국회 원 구성·위원장", ["원 구성", "위원장 배분", "교섭단체"], ["원.?구성", "위원장.{0,8}(배분|교체)", "교섭단체.{0,10}(구성|요건)"]),
  rule("assembly-settlement-review", "결산 심사", ["결산", "예산안", "심의 기한"], ["결산.{0,10}(심의|의결|심사)", "예산안.{0,10}(편성|제출)"]),
  rule("assembly-ethics", "국회 윤리특별위원회", ["윤리특별위원회", "의원 징계", "자격심사"], ["윤리특별위원회", "의원.{0,8}(징계|자격심사)"]),
  rule("assembly-audit-followup", "국정감사·후속조치", ["국정감사", "결과보고서", "시정요구"], ["국정감사.{0,12}(결과보고서|시정요구|후속)", "결과보고서.{0,8}(채택|제출)"])
];

const stopwords = new Set([
  "제안이유", "주요내용", "현행법", "현행", "법률", "법률안", "개정", "일부개정", "규정", "경우", "사항", "필요", "문제", "지적", "따라", "통하여", "대하여", "위하여", "하도록", "하려는", "하고자", "이에", "있음", "없음", "있는", "없는", "등을", "대한", "관한", "국민", "최근", "제도", "위원회"
]);

export type LawGroupBuild = {
  groups: LawGroup[];
  memberships: LawGroupMembership[];
  assignments: Map<string, { groupId: string; coreTopicKey: string; coreTopicLabel: string }>;
};

export function buildLawGroups(laws: LawItem[]): LawGroupBuild {
  const groupsById = new Map<string, LawGroup>();
  const coreTopicsByGroup = new Map<string, Map<string, LawCoreTopic>>();
  const memberships: LawGroupMembership[] = [];
  const assignments = new Map<string, { groupId: string; coreTopicKey: string; coreTopicLabel: string }>();

  for (const law of laws) {
    const classification = classifyLaw(law);
    const groupId = lawGroupId(law);
    const existing = groupsById.get(groupId);
    const date = law.effectiveDate ?? law.statusDate ?? law.proposedDate ?? new Date(0);
    const group = existing ?? {
      id: groupId,
      lawName: law.lawName,
      billTitle: law.billTitle?.trim() || law.lawName,
      billIds: [],
      coreTopics: [],
      classificationVersion: lawGroupClassificationVersion,
      updatedAt: date
    };
    group.billIds.push(law.id);
    if (date.getTime() > group.updatedAt.getTime()) group.updatedAt = date;
    groupsById.set(groupId, group);

    const groupTopics = coreTopicsByGroup.get(groupId) ?? new Map<string, LawCoreTopic>();
    const existingCoreTopic = groupTopics.get(classification.key);
    groupTopics.set(classification.key, {
      key: classification.key,
      label: classification.label,
      representativeKeywords: rankedKeywords([...(existingCoreTopic?.representativeKeywords ?? []), ...classification.keywords]),
      billCount: (existingCoreTopic?.billCount ?? 0) + 1
    });
    coreTopicsByGroup.set(groupId, groupTopics);
    memberships.push({
      lawItemId: law.id,
      lawGroupId: groupId,
      classificationVersion: lawGroupClassificationVersion,
      coreTopicKey: classification.key,
      coreTopicLabel: classification.label,
      classificationBasis: classification.basis
    });
    assignments.set(law.id, { groupId, coreTopicKey: classification.key, coreTopicLabel: classification.label });
  }

  const groups = [...groupsById.values()]
    .map((group) => ({
      ...group,
      billIds: [...new Set(group.billIds)].sort(),
      coreTopics: [...(coreTopicsByGroup.get(group.id)?.values() ?? [])]
        .sort((left, right) => right.billCount - left.billCount || left.label.localeCompare(right.label, "ko"))
    }))
    .sort((left, right) => right.updatedAt.getTime() - left.updatedAt.getTime() || left.billTitle.localeCompare(right.billTitle, "ko"));
  return { groups, memberships, assignments };
}

function classifyLaw(law: LawItem): { key: string; label: string; keywords: string[]; basis: LawGroupMembership["classificationBasis"] } {
  if (law.source === "law_effective") return { key: "effective-law", label: "현행 법령", keywords: ["현행 법령"], basis: "effective_law" };
  const summary = normalize(`${law.proposalSummary ?? ""} ${law.billTitle ?? ""}`);
  if (!law.proposalSummary?.trim()) return { key: "summary-pending", label: "세부 내용 확인 중", keywords: ["공식 요약 확인 중"], basis: "summary_pending" };
  const actionText = summary.split(/[.!?。\n]/u).filter((sentence) => /(이에|하도록|신설|마련|개정|하려는|하고자|규정함)/u.test(sentence)).join(" ");
  const scored = topicRules.map((candidate) => {
    const baseHits = candidate.patterns.reduce((sum, pattern) => sum + matchCount(summary, pattern), 0);
    const actionHits = candidate.patterns.reduce((sum, pattern) => sum + matchCount(actionText, pattern), 0);
    const domainBoost = law.lawName === "국회법" && candidate.key.startsWith("assembly-") && baseHits > 0 ? 4 : 0;
    return { candidate, score: baseHits + actionHits * 2 + domainBoost };
  }).filter((item) => item.score > 0).sort((left, right) => right.score - left.score || right.candidate.label.length - left.candidate.label.length || left.candidate.key.localeCompare(right.candidate.key));
  if (scored[0]) return { key: scored[0].candidate.key, label: scored[0].candidate.label, keywords: scored[0].candidate.keywords, basis: "official_summary_rule" };

  return { key: "summary-pending", label: "세부 내용 확인 중", keywords: ["공식 요약 규칙 검토 중"], basis: "summary_pending" };
}

function extractFallbackKeywords(value: string, lawName: string): string[] {
  const cleaned = normalize(value).replaceAll(normalize(lawName), " ").replace(/제\s*\d+조(?:의\d+)?/gu, " ");
  const tokens = cleaned.split(/[^가-힣A-Za-z0-9]+/u).map(stripKoreanSuffix).filter((token) => token.length >= 2 && !stopwords.has(token));
  const counts = new Map<string, number>();
  for (let index = 0; index < tokens.length; index += 1) {
    counts.set(tokens[index], (counts.get(tokens[index]) ?? 0) + 1);
    if (index + 1 < tokens.length) {
      const phrase = `${tokens[index]} ${tokens[index + 1]}`;
      counts.set(phrase, (counts.get(phrase) ?? 0) + 2);
    }
  }
  return [...counts.entries()].sort((left, right) => right[1] - left[1] || right[0].length - left[0].length || left[0].localeCompare(right[0], "ko")).map(([keyword]) => keyword).slice(0, 3);
}

function rankedKeywords(values: string[]): string[] {
  const counts = new Map<string, number>();
  for (const value of values) counts.set(value, (counts.get(value) ?? 0) + 1);
  return [...counts.entries()].sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0], "ko")).map(([value]) => value).slice(0, 3);
}

function lawGroupId(law: LawItem): string {
  const key = law.billTitle?.trim() ? normalize(law.billTitle) : `${law.source}:${normalize(law.lawName)}`;
  return `law_group_${createHash("sha1").update(key).digest("hex").slice(0, 16)}`;
}

function rule(key: string, label: string, keywords: string[], sources: string[]): TopicRule {
  return { key, label, keywords, patterns: sources.map((source) => new RegExp(source, "gu")) };
}

function matchCount(value: string, pattern: RegExp): number {
  pattern.lastIndex = 0;
  return [...value.matchAll(pattern)].length;
}

function normalize(value: string): string {
  return value.normalize("NFKC").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

function stripKoreanSuffix(value: string): string {
  if (value.length <= 3) return value;
  return value.replace(/(으로부터|에게서는|에서는|으로서|으로써|에게서|까지는|부터는|이라는|라고는|에는|에서|으로|에게|보다|처럼|만큼|이라|라고|이며|이고|이나|거나|과의|와의|들이|들을|으로|를|을|이|가|은|는|의|에|도|만)$/u, "");
}
