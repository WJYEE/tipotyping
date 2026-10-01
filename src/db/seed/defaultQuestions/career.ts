// 취업: NCS / 인적성
import type { SeedQuestion } from "@/db/seed/seedTypes";

export const careerQuestions: SeedQuestion[] = [
  // ───────────── NCS ─────────────
  {
    seedId: "ncs-0001",
    themeName: "NCS",
    type: "multiple-choice",
    tagNames: ["NCS", "수리"],
    payload: {
      prompt: "정가 20,000원인 물건을 20% 할인해 판매할 때 판매 가격은?",
      options: ["14,000원", "16,000원", "18,000원", "19,000원"],
      correctIndex: 1,
    },
  },
  {
    seedId: "ncs-0002",
    themeName: "NCS",
    type: "multiple-choice",
    tagNames: ["NCS", "언어"],
    payload: {
      prompt: "다음 중 문맥상 나머지와 관계가 없는 단어는?",
      options: ["기획", "전략", "실행", "수면"],
      correctIndex: 3,
    },
  },
  {
    seedId: "ncs-0003",
    themeName: "NCS",
    type: "answer-input",
    tagNames: ["NCS", "수리"],
    payload: { prompt: "시속 60km로 90km를 이동하면 걸리는 시간은 몇 분인가? (숫자만 답)", answer: "90" },
  },
  {
    seedId: "ncs-0004",
    themeName: "NCS",
    type: "answer-input",
    difficulty: "intermediate",
    tagNames: ["NCS", "수리"],
    payload: { prompt: "원가 8,000원인 상품에 25%의 이익을 붙여 정가를 매기면 정가는 얼마인가? (원 단위 숫자만)", answer: "10000" },
  },
  {
    seedId: "ncs-0005",
    themeName: "NCS",
    type: "def-to-term",
    difficulty: "intermediate",
    tagNames: ["NCS"],
    payload: { term: "의사소통능력", definition: "문서와 언어로 정보를 정확히 이해하고 전달하는 NCS 직업기초능력 영역" },
  },
  {
    seedId: "ncs-0006",
    themeName: "NCS",
    type: "def-to-term",
    difficulty: "intermediate",
    tagNames: ["NCS"],
    payload: { term: "문제해결능력", definition: "업무 중 발생한 문제의 원인을 파악하고 합리적으로 해결하는 NCS 직업기초능력 영역" },
  },
  {
    seedId: "ncs-0007",
    themeName: "NCS",
    type: "multiple-choice",
    difficulty: "intermediate",
    tagNames: ["NCS", "추리"],
    payload: {
      prompt: "A는 B보다 크고, B는 C보다 크다. 다음 중 항상 참인 것은?",
      options: ["C가 가장 크다", "A가 가장 크다", "B가 가장 크다", "알 수 없다"],
      correctIndex: 1,
    },
  },
  {
    seedId: "ncs-0008",
    themeName: "NCS",
    type: "def-to-term",
    difficulty: "intermediate",
    tagNames: ["NCS"],
    payload: { term: "자원관리능력", definition: "시간, 예산, 인력 등 업무에 필요한 자원을 효율적으로 배분하고 활용하는 NCS 직업기초능력 영역" },
  },
  {
    seedId: "ncs-0009",
    themeName: "NCS",
    type: "answer-input",
    difficulty: "intermediate",
    tagNames: ["NCS", "수리"],
    payload: { prompt: "A, B 두 사람이 함께 일하면 6일, A 혼자면 10일 걸리는 일을 B 혼자 하면 며칠 걸리는가? (숫자만 답)", answer: "15" },
  },

  // ───────────── 인적성 ─────────────
  {
    seedId: "apti-0001",
    themeName: "인적성",
    type: "multiple-choice",
    tagNames: ["인적성"],
    payload: {
      prompt: "1, 4, 9, 16, 25 다음에 올 숫자는?",
      options: ["30", "32", "36", "49"],
      correctIndex: 2,
    },
  },
  {
    seedId: "apti-0002",
    themeName: "인적성",
    type: "def-to-term",
    tagNames: ["인적성"],
    payload: { term: "상황판단능력", definition: "주어진 상황에서 가장 합리적인 대응을 판단하는 능력을 평가하는 영역" },
  },
  {
    seedId: "apti-0003",
    themeName: "인적성",
    type: "multiple-choice",
    tagNames: ["인적성"],
    payload: {
      prompt: "팀 프로젝트에서 의견 충돌이 생겼을 때 가장 바람직한 태도는?",
      options: ["다수결로만 결정한다", "근거를 공유하며 합의점을 찾는다", "상사에게 즉시 보고한다", "본인 의견을 관철한다"],
      correctIndex: 1,
    },
  },
  {
    seedId: "apti-0004",
    themeName: "인적성",
    type: "multiple-choice",
    difficulty: "intermediate",
    tagNames: ["인적성"],
    payload: {
      prompt: "2, 6, 12, 20, 30 다음에 올 숫자는? (앞뒤 차이의 규칙을 찾으시오)",
      options: ["36", "40", "42", "44"],
      correctIndex: 2,
    },
  },
  {
    seedId: "apti-0005",
    themeName: "인적성",
    type: "def-to-term",
    difficulty: "advanced",
    tagNames: ["인적성"],
    payload: { term: "조직적합성", definition: "지원자의 가치관과 행동 양식이 조직 문화와 얼마나 부합하는지 평가하는 항목" },
  },
  {
    seedId: "apti-0006",
    themeName: "인적성",
    type: "multiple-choice",
    difficulty: "advanced",
    tagNames: ["인적성"],
    payload: {
      prompt: "세모, 네모, 세모, 네모, 네모, 세모, 네모, 네모, 네모, ? 다음에 올 도형은? (규칙: 세모 뒤 네모 개수가 1개씩 늘어남)",
      options: ["세모", "네모", "원", "오각형"],
      correctIndex: 0,
    },
  },
];
