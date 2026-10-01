import { useRef, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { DownloadIcon, UploadIcon } from "@/components/ui/icons";
import { backupFileName, createBackup, parseBackupFile, restoreBackup } from "@/db/backup";

export function BackupRestoreCard() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleBackup() {
    setError(null);
    const backup = await createBackup();
    const json = JSON.stringify(backup, null, 2);
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = backupFileName();
    a.click();
    URL.revokeObjectURL(url);
  }

  async function handleFile(file: File) {
    setError(null);
    if (
      !confirm(
        "백업 파일로 복원하면 현재 저장된 모든 데이터(문제, 학습 기록, 설정 등)가 백업 시점 상태로 바뀝니다. 계속할까요?",
      )
    ) {
      return;
    }
    setBusy(true);
    try {
      const text = await file.text();
      const backup = parseBackupFile(text);
      await restoreBackup(backup);
      // 전체 DB가 통째로 바뀌었으므로 화면 전체 상태를 새로 읽도록 새로고침한다.
      // (기본 문제은행 재동기화도 main.tsx 시작 로직을 그대로 다시 타게 되어, 복원된
      // deletedSeedIds를 존중한다 — 삭제했던 기본 문제가 되살아나지 않는다.)
      window.location.reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : "복원에 실패했습니다.");
      setBusy(false);
    }
  }

  return (
    <Card className="flex flex-col gap-3">
      <div className="flex flex-col gap-1">
        <h2 className="font-display text-lg font-extrabold text-text-primary">💾 백업 / 복원</h2>
        <p className="font-body text-[13px] text-text-secondary">
          문제·학습 기록·설정 등 모든 데이터를 JSON 파일 하나로 백업하거나 복원합니다.
        </p>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept=".json"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleFile(file);
          e.target.value = "";
        }}
      />

      <div className="flex gap-2">
        <Button type="button" variant="secondary" className="!px-4 !py-2 text-sm" onClick={handleBackup}>
          <DownloadIcon className="h-4 w-4" />
          전체 백업
        </Button>
        <Button
          type="button"
          variant="secondary"
          className="!px-4 !py-2 text-sm"
          disabled={busy}
          onClick={() => fileInputRef.current?.click()}
        >
          <UploadIcon className="h-4 w-4" />
          {busy ? "복원하는 중..." : "백업 복원"}
        </Button>
      </div>

      {error && <p className="font-body text-xs text-danger">{error}</p>}
    </Card>
  );
}
