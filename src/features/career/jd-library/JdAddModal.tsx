import { useRef, useState } from "react";
import { CopyIcon, UploadIcon } from "@/components/ui/icons";
import { CareerModal } from "@/features/career/components/CareerModal";
import { JD_IMPORT_PROMPT } from "@/features/career/jdImportPrompt";
import { requirementSourceSectionLabel } from "@/features/career/jobPostingLabels";
import { JdForm } from "@/features/career/jd-library/JdForm";
import { importJobPostings, parseJdImportJson, type JdImportResult } from "@/lib/importJobPostings";
import { parseRawJdText, type ParsedJdSections } from "@/lib/jdTextParser";

type Mode = "manual" | "paste" | "json";

const MODE_LABEL: Record<Mode, string> = { manual: "직접 입력", paste: "JD 원문 붙여넣기", json: "JSON Import" };

interface JdAddModalProps {
  onClose: () => void;
}

/** "JD 추가" 진입점. 직접 입력/원문 붙여넣기/JSON Import 세 방식을 탭으로 묶는다. */
export function JdAddModal({ onClose }: JdAddModalProps) {
  const [mode, setMode] = useState<Mode>("manual");

  return (
    <CareerModal title="JD 추가" onClose={onClose}>
      <div className="mb-4 flex gap-1 border-b border-career-border">
        {(Object.keys(MODE_LABEL) as Mode[]).map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => setMode(m)}
            className={`-mb-px border-b-2 px-3 py-2 font-body text-sm ${
              mode === m
                ? "border-career-blue font-bold text-career-text-primary"
                : "border-transparent text-career-text-secondary hover:text-career-text-primary"
            }`}
          >
            {MODE_LABEL[m]}
          </button>
        ))}
      </div>

      {mode === "manual" && <JdForm onClose={onClose} />}
      {mode === "paste" && <RawPasteTab onClose={onClose} />}
      {mode === "json" && <JsonImportTab onClose={onClose} />}
    </CareerModal>
  );
}

function RawPasteTab({ onClose }: { onClose: () => void }) {
  const [text, setText] = useState("");
  const [parsed, setParsed] = useState<ParsedJdSections | null>(null);

  if (parsed) {
    return (
      <div className="flex flex-col gap-3">
        <p className="font-body text-xs text-career-text-secondary">
          {parsed.matchedSections.length > 0
            ? `${parsed.matchedSections.map((s) => requirementSourceSectionLabel[s]).join("/")} 섹션을 인식했습니다. 아래 내용을 검토하고 필요하면 수정한 뒤 저장하세요.`
            : "담당업무/자격요건/우대사항 섹션 헤더를 찾지 못했습니다. 원문을 참고해 아래 필드에 직접 옮겨주세요."}
        </p>
        <details className="rounded-[6px] border border-career-border p-3">
          <summary className="cursor-pointer font-body text-xs font-semibold text-career-text-secondary">원문 전체 보기</summary>
          <p className="mt-2 whitespace-pre-wrap font-body text-xs text-career-text-tertiary">{text}</p>
        </details>
        <JdForm
          prefill={{
            responsibilities: parsed.responsibilities,
            qualifications: parsed.qualifications,
            preferredQualifications: parsed.preferredQualifications,
          }}
          onClose={onClose}
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <p className="font-body text-xs text-career-text-secondary">
        JD 원문을 그대로 붙여넣으면, "담당업무/자격요건/우대사항" 같은 명확한 섹션 제목이 있는 부분만 규칙
        기반으로 구분해 미리 채워줍니다(AI 추측 없음). 회사명/직무명 등 나머지 항목은 직접 입력해야 합니다.
      </p>
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="채용 공고 페이지에서 복사한 JD 원문을 붙여넣으세요"
        className="min-h-40 rounded-[6px] border border-career-border bg-career-surface px-3 py-2 font-body text-sm text-career-text-primary outline-none focus:border-career-blue"
      />
      <div className="flex justify-end gap-2">
        <button
          type="button"
          onClick={onClose}
          className="rounded-[6px] border border-career-border px-4 py-2 font-body text-sm font-semibold text-career-text-secondary"
        >
          취소
        </button>
        <button
          type="button"
          disabled={!text.trim()}
          onClick={() => setParsed(parseRawJdText(text))}
          className="rounded-[6px] bg-career-text-primary px-4 py-2 font-body text-sm font-bold text-white disabled:opacity-60"
        >
          섹션 인식하기
        </button>
      </div>
    </div>
  );
}

function JsonImportTab({ onClose }: { onClose: () => void }) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<JdImportResult | null>(null);
  const [copyState, setCopyState] = useState<"idle" | "copied" | "error">("idle");

  async function handleFile(file: File) {
    setBusy(true);
    setResult(null);
    try {
      const text = await file.text();
      const rows = parseJdImportJson(text);
      setResult(await importJobPostings(rows));
    } catch (err) {
      setResult({ imported: 0, duplicates: 0, errors: [{ index: -1, reason: err instanceof Error ? err.message : "Import 실패" }] });
    } finally {
      setBusy(false);
    }
  }

  async function handleCopyPrompt() {
    try {
      await navigator.clipboard.writeText(JD_IMPORT_PROMPT);
      setCopyState("copied");
    } catch {
      setCopyState("error");
    } finally {
      setTimeout(() => setCopyState("idle"), 2000);
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-2 rounded-[6px] border border-career-border bg-career-bg p-3">
        <p className="font-body text-xs text-career-text-secondary">
          JD 원문/PDF와 함께 ChatGPT에 전달하면, 이 Import 형식에 맞는 JSON을 바로 만들어줍니다.
        </p>
        <button
          type="button"
          onClick={handleCopyPrompt}
          className="flex items-center justify-center gap-2 self-start rounded-[6px] border border-career-border bg-career-surface px-3 py-2 font-body text-xs font-semibold text-career-text-primary"
        >
          <CopyIcon className="h-3.5 w-3.5" />
          ChatGPT용 프롬프트 복사
        </button>
        {copyState === "copied" && (
          <span className="font-body text-xs font-semibold text-career-green">복사했습니다 ✓</span>
        )}
        {copyState === "error" && (
          <span className="font-body text-xs font-semibold text-career-red">복사에 실패했습니다. 브라우저 권한을 확인해주세요.</span>
        )}
      </div>

      <p className="font-body text-xs text-career-text-secondary">
        JD 객체 하나 또는 배열(여러 JD)을 담은 JSON 파일을 올리세요. 필수 필드: companyName, postingTitle,
        positionTitle.
      </p>
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
      <button
        type="button"
        disabled={busy}
        onClick={() => fileInputRef.current?.click()}
        className="flex items-center justify-center gap-2 rounded-[6px] border border-career-border px-4 py-3 font-body text-sm font-semibold text-career-text-primary disabled:opacity-60"
      >
        <UploadIcon className="h-4 w-4" />
        {busy ? "가져오는 중..." : "JSON 파일 선택"}
      </button>

      {result && (
        <div className="flex flex-col gap-1.5 rounded-[6px] border border-career-border p-3">
          <p className="font-body text-xs text-career-text-primary">
            성공 {result.imported}개 · 중복 {result.duplicates}개 · 실패 {result.errors.length}개
          </p>
          {result.errors.length > 0 && (
            <ul className="flex flex-col gap-0.5">
              {result.errors.map((e, i) => (
                <li key={i} className="font-body text-[11px] text-career-red">
                  {e.index >= 0 ? `${e.index + 1}번째 항목: ` : ""}
                  {e.reason}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      <div className="flex justify-end">
        <button
          type="button"
          onClick={onClose}
          className="rounded-[6px] border border-career-border px-4 py-2 font-body text-sm font-semibold text-career-text-secondary"
        >
          닫기
        </button>
      </div>
    </div>
  );
}
