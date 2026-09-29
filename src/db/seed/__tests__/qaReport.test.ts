import { describe, it } from "vitest";
import { defaultCategories } from "@/db/seed/defaultCategories";
import { defaultQuestions } from "@/db/seed/defaultQuestions";
import { getQuestionSummary } from "@/lib/questionSummary";

// 콘텐츠 QA용 일회성 리포트. 실패 조건이 없는 순수 출력 스크립트.
function normalize(s: string): string {
  return s.toLowerCase().replace(/\s+/g, "").replace(/[.,!?()]/g, "");
}

describe("QA report", () => {
  it("prints distribution + suspicious content", () => {
    console.log("\n=== 총 문제 수:", defaultQuestions.length, "===\n");

    // Theme별 개수
    const byTheme = new Map<string, number>();
    for (const q of defaultQuestions) byTheme.set(q.themeName, (byTheme.get(q.themeName) ?? 0) + 1);
    console.log("--- Theme별 문제 수 ---");
    for (const cat of defaultCategories) {
      for (const t of cat.themes) {
        console.log(`${cat.name} > ${t.name}: ${byTheme.get(t.name) ?? 0}`);
      }
    }

    // 유형별 개수
    const byType = new Map<string, number>();
    for (const q of defaultQuestions) byType.set(q.type, (byType.get(q.type) ?? 0) + 1);
    console.log("\n--- 유형별 문제 수 ---");
    for (const [type, count] of byType) console.log(`${type}: ${count}`);

    // 난이도 분포 (difficulty 있는 것만)
    const byDifficulty = new Map<string, number>();
    for (const q of defaultQuestions) {
      if (q.difficulty) byDifficulty.set(q.difficulty, (byDifficulty.get(q.difficulty) ?? 0) + 1);
    }
    console.log("\n--- 난이도 분포 (지정된 것만) ---");
    for (const [d, count] of byDifficulty) console.log(`${d}: ${count}`);
    const noDifficulty = defaultQuestions.filter((q) => !q.difficulty).length;
    console.log(`난이도 미지정: ${noDifficulty}`);

    // PLACEHOLDER/TODO 스캔
    console.log("\n--- PLACEHOLDER/TODO 텍스트 스캔 ---");
    const suspiciousWords = /placeholder|todo|fixme|lorem ipsum|xxx|임시\s*텍스트/i;
    for (const q of defaultQuestions) {
      const text = JSON.stringify(q.payload) + (q.explanation ?? "");
      if (suspiciousWords.test(text)) {
        console.log(`[FOUND] ${q.themeName} / ${q.type}: ${text}`);
      }
    }

    // 근접 중복 탐지: 같은 테마 내에서 term/summary 정규화 후 동일하면 의심
    console.log("\n--- 근접 중복 의심 (같은 Theme 내 term/summary 정규화 일치) ---");
    const seenByTheme = new Map<string, Map<string, string[]>>();
    for (const q of defaultQuestions) {
      const key =
        q.type === "term-to-def" || q.type === "def-to-term"
          ? normalize((q.payload as { term: string }).term)
          : normalize(getQuestionSummary({ ...q, id: "x", createdAt: 0, updatedAt: 0, flagged: false, favorite: false, categoryId: "", displayCode: "" } as never));
      const themeMap = seenByTheme.get(q.themeName) ?? new Map<string, string[]>();
      const list = themeMap.get(key) ?? [];
      list.push(q.type);
      themeMap.set(key, list);
      seenByTheme.set(q.themeName, themeMap);
    }
    for (const [theme, map] of seenByTheme) {
      for (const [key, types] of map) {
        if (types.length > 1) {
          console.log(`[DUP?] ${theme}: "${key}" 가 ${types.length}번 (${types.join(", ")})`);
        }
      }
    }

    // 정답 과다 반복 탐지 (answer-input/essay의 answer 값이 여러 테마에 걸쳐 과도하게 반복되는지)
    console.log("\n--- answer 값 반복 빈도 상위 (5회 이상) ---");
    const answerCount = new Map<string, number>();
    for (const q of defaultQuestions) {
      if (q.type === "answer-input" || q.type === "essay") {
        const a = normalize((q.payload as { answer: string }).answer);
        answerCount.set(a, (answerCount.get(a) ?? 0) + 1);
      }
    }
    for (const [a, count] of answerCount) {
      if (count >= 5) console.log(`"${a}": ${count}회`);
    }
  });
});
