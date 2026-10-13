import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { CandidateRow } from "@/features/concept-bootstrap/CandidateRow";
import type { ConceptCandidate } from "@/lib/knowledge/bootstrap/buildDraft";

// 브라우저 없이 확인할 수 있는 최소한의 렌더 smoke test(상호작용·레이아웃은 실제 화면에서 확인해야 한다).
const base: ConceptCandidate = {
  key: "t::tag",
  themeId: "t",
  sourceTagId: "tag",
  name: "JOIN",
  status: "NEW",
  confidence: "HIGH",
  reasons: [],
  mappings: [],
  stats: { taggedCount: 12, textMatchedTagged: 10, textOnlyCount: 3, themeShare: 0.1, themeSpread: 1 },
};
const props = {
  included: true,
  name: "JOIN",
  excludedQuestionIds: [],
  questionById: new Map(),
  onToggle: () => {},
  onRename: () => {},
  onToggleQuestion: () => {},
};

describe("CandidateRow (render smoke)", () => {
  it("새 개념 후보: 이름, 새 개념 배지, 문제 수, 근거 요약을 보여 준다", () => {
    const html = renderToStaticMarkup(<CandidateRow candidate={{ ...base, mappings: [{ questionId: "q1", evidence: "tag+text", alreadyLinked: false }] }} {...props} />);
    expect(html).toContain("JOIN");
    expect(html).toContain("새 개념");
    expect(html).toContain("Tag 12 + 본문 3");
    expect(html).toContain("1문제");
  });

  it("검토 필요 이유와 오류를 보여 주고, 보관된 개념은 선택할 수 없다", () => {
    const html = renderToStaticMarkup(
      <CandidateRow
        candidate={{ ...base, status: "EXISTING", existingArchived: true, confidence: "REVIEW", reasons: ["existing-archived", "low-text-evidence"] }}
        {...props}
        error="보관된 개념에는 문제를 연결할 수 없습니다."
      />,
    );
    expect(html).toContain("보관된 개념");
    expect(html).toContain("문제 본문 근거 부족");
    expect(html).toContain("disabled");
    expect(html).toContain("보관된 개념에는 문제를 연결할 수 없습니다.");
  });
});
