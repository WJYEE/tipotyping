// 개념 이름의 "완전히 동일함" 판정용 정규화. 의미 병합이 아니다.
// NFKC(전각/호환 문자 통일) → 앞뒤 공백 제거 → 연속 공백 하나로 → 소문자.
// "JOIN"과 "join", "GROUP  BY"와 "group by"는 같은 이름이지만 "JOIN"과 "SQL JOIN"은 다른 이름이다(자동 semantic merge 금지).

export function normalizeConceptName(name: string): string {
  return name.normalize("NFKC").trim().replace(/\s+/g, " ").toLowerCase();
}

/** 표시용 이름 정리: 앞뒤 공백 제거와 연속 공백 정리만 한다(대소문자는 사용자가 쓴 그대로 둔다). */
export function cleanConceptName(name: string): string {
  return name.normalize("NFKC").trim().replace(/\s+/g, " ");
}

/** aliases 정리: 비어 있거나 이름 자신과 같거나 서로 중복인 항목을 제거한다. 순서는 처음 등장한 순서를 유지한다. */
export function cleanAliases(aliases: readonly string[], name: string): string[] {
  const own = normalizeConceptName(name);
  const seen = new Set<string>([own]);
  const out: string[] = [];
  for (const raw of aliases) {
    const alias = cleanConceptName(raw);
    const key = normalizeConceptName(alias);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    out.push(alias);
  }
  return out;
}
