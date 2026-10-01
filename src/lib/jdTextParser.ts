// JD 원문 붙여넣기용 규칙 기반 섹션 파서. AI/API 없이, 명확한 한국어/영어 섹션 헤더 줄만 인식해
// 담당업무/자격요건/우대사항 세 구간으로 나눈다. 헤더로 보이지 않는 줄(예: 회사 소개, 모호한 문장)은
// 어느 섹션에도 넣지 않는다 — 사실을 추측/보정하지 않는다. 사용자가 파싱 결과를 검토·수정한 뒤 저장한다.
import type { RequirementSourceSection } from "@/types/career";

const HEADER_KEYWORDS: Record<RequirementSourceSection, string[]> = {
  responsibility: [
    "담당업무",
    "주요업무",
    "업무내용",
    "담당 업무",
    "주요 업무",
    "업무 내용",
    "직무내용",
    "직무 내용",
    "하는일",
    "하는 일",
    "responsibilities",
    "what you'll do",
  ],
  qualification: [
    "자격요건",
    "지원자격",
    "필수요건",
    "자격 요건",
    "지원 자격",
    "필수 요건",
    "requirements",
    "qualifications",
    "must have",
  ],
  preferred: ["우대사항", "우대조건", "우대 사항", "우대 조건", "preferred", "nice to have", "plus"],
};

export interface ParsedJdSections {
  responsibilities: string;
  qualifications: string;
  preferredQualifications: string;
  /** 실제로 헤더를 찾아 인식한 섹션들. UI에서 "O개 섹션 인식" 안내에 쓴다. */
  matchedSections: RequirementSourceSection[];
}

/** 불릿/괄호/콜론 등 흔한 꾸밈을 벗겨내고 소문자로 비교한다. */
function normalizeHeaderCandidate(line: string): string {
  return line
    .trim()
    .replace(/^[-*•■▶\[\]【】<>:：.\d]+/, "")
    .replace(/[-*•■▶\[\]【】<>:：]+$/, "")
    .trim()
    .toLowerCase();
}

/** 한 줄이 섹션 헤더로 보이면 그 섹션을, 아니면 null을 돌려준다. 긴 문장은 헤더로 보지 않는다. */
function matchHeaderLine(line: string): RequirementSourceSection | null {
  const normalized = normalizeHeaderCandidate(line);
  if (!normalized || normalized.length > 20) return null;
  for (const [section, keywords] of Object.entries(HEADER_KEYWORDS) as [RequirementSourceSection, string[]][]) {
    if (keywords.some((keyword) => normalized === keyword.toLowerCase())) return section;
  }
  return null;
}

export function parseRawJdText(text: string): ParsedJdSections {
  const lines = text.split(/\r\n|\r|\n/);
  const buckets: Record<RequirementSourceSection, string[]> = {
    responsibility: [],
    qualification: [],
    preferred: [],
  };
  const matched = new Set<RequirementSourceSection>();
  let current: RequirementSourceSection | null = null;

  for (const line of lines) {
    const section = matchHeaderLine(line);
    if (section) {
      current = section;
      matched.add(section);
      continue; // 헤더 줄 자체는 본문에 포함하지 않는다
    }
    if (current) buckets[current].push(line);
  }

  return {
    responsibilities: buckets.responsibility.join("\n").trim(),
    qualifications: buckets.qualification.join("\n").trim(),
    preferredQualifications: buckets.preferred.join("\n").trim(),
    matchedSections: [...matched],
  };
}
