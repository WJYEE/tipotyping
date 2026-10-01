// "ChatGPT용 프롬프트 복사" 버튼이 클립보드에 넣는 프롬프트 본문.
//
// 규칙을 여기서 새로 지어내지 않는다 — 전부 실제 Import 구현(src/lib/importJobPostings.ts)과
// 스펙 문서(docs/JD_IMPORT_SPEC.md)에서 가져온 canonical 값/라벨을 그대로 보간한다. enum 값이나
// 라벨이 코드에서 바뀌면 이 프롬프트도 자동으로 같이 바뀐다 — 손으로 다시 맞출 필요가 없다.
// (src/lib/__tests__/jdImportPrompt.test.ts가 실제 importer와 어긋나지 않는지 검증한다.)
import { competencyCategoryLabel } from "@/features/career/competencyLabels";
import {
  employmentTypeLabel,
  experienceLevelLabel,
  requirementSourceSectionLabel,
} from "@/features/career/jobPostingLabels";
import { COMPETENCY_CATEGORIES, EMPLOYMENT_TYPES, EXPERIENCE_LEVELS, REQUIREMENT_SOURCE_SECTIONS } from "@/types/career";

function listEnumWithAlias(values: readonly string[], labels: Record<string, string>): string {
  return values.map((v) => `"${v}" (한국어: "${labels[v]}")`).join(", ");
}

function buildJdImportPrompt(): string {
  const employmentTypeList = listEnumWithAlias(EMPLOYMENT_TYPES, employmentTypeLabel);
  const experienceLevelList = listEnumWithAlias(EXPERIENCE_LEVELS, experienceLevelLabel);
  const sourceSectionList = REQUIREMENT_SOURCE_SECTIONS.map(
    (s) => `"${s}" (${requirementSourceSectionLabel[s]})`,
  ).join(", ");
  const categoryList = COMPETENCY_CATEGORIES.map((c) => `"${c}" (${competencyCategoryLabel[c]})`).join(", ");

  return `당신은 채용공고(JD) 원문을 읽고, TipoTyping Career 기능의 JSON Import 형식에 맞는 데이터를 만드는 작업을 합니다.

# 입력
JD 원문(텍스트 또는 PDF)이 함께 제공됩니다.

# 출력 JSON 스키마

최상위는 JD 객체 하나, 또는 JD 객체의 배열입니다. 둘 다 허용됩니다 — JD가 1개면 객체 하나,
여러 개면 배열로 출력하세요.

\`\`\`ts
// JD 객체 (JdImportRow)
{
  companyName: string;        // 필수
  postingTitle: string;       // 필수 — 공고명
  positionTitle: string;      // 필수 — 직무명
  jdUrl?: string;              // 선택 — 원문 링크
  responsibilities?: string;   // 선택 — 담당업무 원문 (없으면 생략)
  qualifications?: string;     // 선택 — 자격요건 원문
  preferredQualifications?: string; // 선택 — 우대사항 원문
  applicationStartDate?: string; // 선택 — "YYYY-MM-DD" 형식만 허용
  applicationEndDate?: string;   // 선택 — "YYYY-MM-DD" 형식만 허용
  employmentType?: string;     // 선택 — 아래 "employmentType 허용값" 참고
  experienceLevel?: string;    // 선택 — 아래 "experienceLevel 허용값" 참고
  workLocation?: string;       // 선택
  requirements?: Requirement[]; // 선택 — 아래 "requirements 구조" 참고
}

// Requirement 객체 — 딱 이 4개 필드만 사용합니다
{
  rawText: string;             // 필수 — JD 원문 문장을 그대로 옮긴 것 (요약/의역 금지)
  sourceSection?: string;      // 선택 — 아래 "sourceSection 허용값" 참고
  competencies?: { name: string; category: string }[]; // 선택 — 아래 "Competency 작성 규칙" 참고
  roles?: string[];            // 선택 — 아래 "Role 작성 규칙" 참고
}
\`\`\`

## employmentType 허용값 (영문 키 또는 한국어 표현 모두 가능)

${employmentTypeList}

영문 키와 한국어 표현 중 편한 쪽으로 쓰면 됩니다(대소문자/앞뒤 공백은 자동으로 무시됩니다).
위 목록에 없는 값은 쓰지 마세요.

## experienceLevel 허용값 (영문 키 또는 한국어 표현 모두 가능)

${experienceLevelList}

"무관"이라고만 써도 "any"로 인식됩니다.

## requirements 구조

JD의 담당업무/자격요건/우대사항 각 항목을 위 "Requirement 객체" 형태로 하나씩 만듭니다.
- \`rawText\`: JD에 적힌 문장을 **그대로** 옮깁니다 — 요약하거나 다른 말로 바꾸지 않습니다.
- \`sourceSection\`: 그 문장이 어느 섹션에서 나왔는지 표시합니다.
- \`competencies\`/\`roles\`: 아래 규칙대로 표준화된 키워드만 넣습니다.

## sourceSection 허용값

${sourceSectionList}

## Competency category 허용값

${categoryList}

## Competency 작성 규칙

- \`competencies\`는 **자연어 문장이 아니라, 여러 JD에서 재사용 가능한 짧은 표준 키워드**입니다.
  예: "SQL", "Python", "A/B Testing", "KPI 설계", "데이터 검증", "문제 해결", "문서화", "협업".
- "SQL을 활용해 데이터를 추출할 수 있는 능력" 같은 문장이 아니라 "SQL"처럼 짧게 정제합니다.
- 같은 역량은 JD마다 표현이 달라도 **항상 같은 키워드**로 통일하세요(예: "SQL 능숙"과 "SQL 활용
  경험"은 둘 다 "SQL"로). 키워드가 제각각이면 같은 역량인데도 다른 Competency로 취급됩니다.
- \`category\`는 위 ${COMPETENCY_CATEGORIES.length}종 중 하나를 반드시 지정합니다. 도메인 지식이 아니라
  커뮤니케이션/문서화/협업/문제 해결/우선순위 관리 같은 범용 역량은 \`soft-skill\`로 분류합니다.

## Role 작성 규칙

- \`roles\`는 \`category\` 없이 **이름 문자열만** 담는 배열입니다(예: "Business DA", "PM").
- 공고 제목이 아니라 **그 Requirement가 실제로 어떤 역할 성격의 일인지** 기준으로 판단합니다.
- Competency와 마찬가지로, 같은 역할 성격은 항상 같은 이름으로 통일하세요.

# 지켜야 할 원칙

1. \`rawText\`는 JD 원문을 그대로 보존합니다 — 절대 의역/요약/재작성하지 않습니다.
2. \`competencies\`는 문장이 아니라 재사용 가능한 표준 키워드로 정제합니다(위 규칙 참고).
3. **JD에 명시돼 있지 않거나 불확실한 사실은 추측해서 채우지 않습니다.** 예를 들어 고용형태나
   경력조건이 JD에 명확히 적혀 있지 않으면 해당 필드를 아예 생략하세요(빈 문자열이나 임의의 값을
   넣지 않습니다).
4. 최종 답변에는 **설명·주석·인사말 없이 Import 가능한 JSON만** 출력합니다. JSON 앞뒤에 다른 문장을
   붙이지 마세요.
`;
}

export const JD_IMPORT_PROMPT = buildJdImportPrompt();
