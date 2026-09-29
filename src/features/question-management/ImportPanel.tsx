import { useRef, useState } from "react";
import { Button } from "@/components/ui/Button";
import { UploadIcon } from "@/components/ui/icons";
import { importQuestions, parseImportCsv, parseImportJson, type ImportResult } from "@/lib/importQuestions";

export function ImportPanel() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [busy, setBusy] = useState(false);

  async function handleFile(file: File) {
    setBusy(true);
    setResult(null);
    try {
      const text = await file.text();
      const rows = file.name.toLowerCase().endsWith(".csv")
        ? parseImportCsv(text)
        : parseImportJson(text);
      const res = await importQuestions(rows);
      setResult(res);
    } catch (err) {
      setResult({
        imported: 0,
        skipped: 0,
        errors: [{ row: 0, reason: err instanceof Error ? err.message : "Import 실패" }],
      });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <input
        ref={fileInputRef}
        type="file"
        accept=".json,.csv"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleFile(file);
          e.target.value = "";
        }}
      />
      <Button
        type="button"
        variant="secondary"
        className="!px-4 !py-2 text-sm"
        disabled={busy}
        onClick={() => fileInputRef.current?.click()}
      >
        <UploadIcon className="h-4 w-4" />
        {busy ? "가져오는 중..." : "JSON/CSV 가져오기"}
      </Button>

      {result && (
        <p className="font-body text-xs text-text-secondary">
          가져옴 {result.imported}개 · 중복 스킵 {result.skipped}개
          {result.errors.length > 0 && ` · 오류 ${result.errors.length}개`}
        </p>
      )}
    </div>
  );
}
