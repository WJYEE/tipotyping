import { useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { KB_BRIDGE_CONTENT_VERSION, packageRepo, type KbBridgeImportResult } from "@/db/repositories/packageRepo";

/** KB-Bridge 콘텐츠 가져오기 안내. 가져오기는 이 버튼으로만 시작하며(자동 seed 없음), 여러 번 눌러도 중복되지 않는다. */
export function KbBridgeImportBanner() {
  const state = useLiveQuery(async () => ({ value: await packageRepo.getKbBridgeImportState() }), []);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<KbBridgeImportResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (!state) return null;
  const imported = state.value;
  const upToDate = imported?.version === KB_BRIDGE_CONTENT_VERSION;
  if (upToDate && !result) return null;

  async function run() {
    setBusy(true);
    setError(null);
    try {
      // 큰 JSON은 이 시점에만 내려받는다.
      const [{ loadKbBridgeRaw }, { buildKbBridgeBundle }] = await Promise.all([
        import("@/lib/packages/kbBridgeSource"),
        import("@/lib/packages/kbBridgeBundle"),
      ]);
      const bundle = buildKbBridgeBundle(await loadKbBridgeRaw());
      setResult(await packageRepo.importKbBridge(bundle));
    } catch (e) {
      setError(e instanceof Error ? e.message : "가져오기에 실패했습니다. 기존 데이터는 변경되지 않았습니다.");
    } finally {
      setBusy(false);
    }
  }

  if (result) {
    const added =
      result.questions.added +
      result.derived.added +
      result.concepts.added +
      result.tasks.added +
      result.memos.added +
      result.resources.added;
    return (
      <Card className="flex flex-col gap-2 !p-4" role="status">
        <p className="font-display text-sm font-extrabold text-text-primary">
          {added > 0 ? `가져오기 완료 — 새로 ${added}개 항목을 추가했습니다.` : "이미 모두 가져와져 있습니다. 변경 사항이 없습니다."}
        </p>
        <p className="font-body text-xs text-text-secondary">
          문제 {result.questions.added}(기존 {result.questions.existing}) · 파생질문 {result.derived.added} · 개념 정리{" "}
          {result.concepts.added} · 실습 {result.tasks.added} · 메모 {result.memos.added} · 사이트 {result.resources.added}
        </p>
        {result.issues.length > 0 && (
          <details className="font-body text-xs text-danger">
            <summary className="cursor-pointer font-semibold">검증에서 제외된 항목 {result.issues.length}개</summary>
            <ul className="mt-1 list-disc pl-5">
              {result.issues.map((i) => (
                <li key={`${i.kind}-${i.id}`}>
                  [{i.kind}] {i.id}: {i.message}
                </li>
              ))}
            </ul>
          </details>
        )}
      </Card>
    );
  }

  return (
    <Card className="flex flex-col gap-3 !p-4 md:flex-row md:items-center md:justify-between">
      <div className="flex flex-col gap-1">
        <p className="font-display text-sm font-extrabold text-text-primary">
          {imported ? "KB-Bridge 콘텐츠 업데이트가 있습니다" : "KB-Bridge 콘텐츠를 가져오세요"}
        </p>
        <p className="font-body text-xs text-text-secondary">
          문제 123 · 파생질문 246 · 개념 정리 11 · 실습 17 · 메모 · 추천 사이트를 이 기기에 저장합니다. 기존 문제와 학습 기록은
          변경되지 않으며, 여러 번 가져와도 중복되지 않습니다. 모든 문제는 검수 전 초안입니다.
        </p>
        {error && <p className="font-body text-xs text-danger">{error}</p>}
      </div>
      <Button variant="success" className="shrink-0 !px-5 !py-2.5 text-sm" disabled={busy} onClick={run}>
        {busy ? "가져오는 중…" : imported ? "업데이트 가져오기" : "콘텐츠 가져오기"}
      </Button>
    </Card>
  );
}
