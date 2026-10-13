// 번들된 KB-Bridge 원본 JSON/Markdown을 필요할 때만(가져오기 시) 내려받는다. 첫 화면 번들에 포함되지 않는다.
import type { RawKbBridgeBundle } from "@/lib/packages/kbBridgeBundle";

const guideLoaders = import.meta.glob("../../content/kbbridge/guides/*.md", {
  query: "?raw",
  import: "default",
}) as Record<string, () => Promise<string>>;

export async function loadKbBridgeRaw(): Promise<RawKbBridgeBundle> {
  const [categories, questions, derived, guides, tasks, notes, sites, cases] = await Promise.all([
    import("@/content/kbbridge/categories.json"),
    import("@/content/kbbridge/questions.json"),
    import("@/content/kbbridge/derived_questions.json"),
    import("@/content/kbbridge/category_study_guides.json"),
    import("@/content/kbbridge/practical_assignments.json"),
    import("@/content/kbbridge/learning_career_notes.json"),
    import("@/content/kbbridge/sites.json"),
    import("@/content/kbbridge/shared_conversation_cases.md?raw"),
  ]);

  const guideBodies: Record<string, string> = {};
  for (const [path, load] of Object.entries(guideLoaders)) {
    const key = path.split("/").pop()!.replace(/\.md$/, "");
    guideBodies[key] = await load();
  }

  return {
    categories: categories.default,
    questions: questions.default,
    derived: derived.default,
    guides: guides.default,
    guideBodies,
    tasks: tasks.default,
    notes: notes.default,
    sites: sites.default,
    casesMarkdown: cases.default,
  } as unknown as RawKbBridgeBundle;
}
