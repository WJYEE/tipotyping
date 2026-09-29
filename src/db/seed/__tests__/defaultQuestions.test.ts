import { describe, expect, it } from "vitest";
import { defaultCategories } from "@/db/seed/defaultCategories";
import { defaultQuestions } from "@/db/seed/defaultQuestions";

const ALL_THEME_NAMES = new Set(defaultCategories.flatMap((c) => c.themes.map((t) => t.name)));
const ALL_TYPES = ["blank", "term-to-def", "def-to-term", "answer-input", "multiple-choice", "essay"];

describe("defaultQuestions", () => {
  it("모든 문제가 defaultCategories에 실제로 존재하는 테마를 참조한다", () => {
    for (const q of defaultQuestions) {
      expect(ALL_THEME_NAMES.has(q.themeName), `알 수 없는 테마: ${q.themeName}`).toBe(true);
    }
  });

  it("모든 테마가 최소 1개 이상의 기본 문제를 갖는다", () => {
    const covered = new Set(defaultQuestions.map((q) => q.themeName));
    const missing = [...ALL_THEME_NAMES].filter((name) => !covered.has(name));
    expect(missing, `문제가 없는 테마: ${missing.join(", ")}`).toEqual([]);
  });

  it("6개 문제 유형이 전체 문제은행에 모두 등장한다", () => {
    const types = new Set(defaultQuestions.map((q) => q.type));
    for (const t of ALL_TYPES) {
      expect(types.has(t as never), `등장하지 않은 유형: ${t}`).toBe(true);
    }
  });

  it("multiple-choice는 정답 index가 options 범위 안에 있다", () => {
    for (const q of defaultQuestions) {
      if (q.type !== "multiple-choice") continue;
      const payload = q.payload as { options: string[]; correctIndex: number };
      expect(payload.correctIndex).toBeGreaterThanOrEqual(0);
      expect(payload.correctIndex).toBeLessThan(payload.options.length);
    }
  });

  it("blank는 template 안에 정의된 모든 blank id가 등장한다", () => {
    for (const q of defaultQuestions) {
      if (q.type !== "blank") continue;
      const payload = q.payload as { template: string; blanks: { id: string; answer: string }[] };
      for (const blank of payload.blanks) {
        expect(payload.template.includes(`{{${blank.id}}}`)).toBe(true);
      }
    }
  });

  it("문제 수가 최소 100개 이상이다 (기본 문제은행 수준)", () => {
    expect(defaultQuestions.length).toBeGreaterThanOrEqual(100);
  });
});
