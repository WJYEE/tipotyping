import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { questionRepo } from "@/db/repositories";
import { formatAnswerForEditing, parseAnswerFromEditing } from "@/lib/answerAlternatives";
import type { Question } from "@/types/domain";

const inputClass =
  "rounded-badge border border-border bg-surface px-3 py-2 font-body text-sm text-text-primary outline-none focus:border-accent";

interface AnswerEditModalProps {
  question: Question;
  onClose: () => void;
}

/**
 * Game Typing 중 "정답이 잘못됐다"고 판단했을 때 Question Management로 이동하지 않고
 * 정답 필드만 바로 고치는 작은 편집창. 문제 내용/태그/해설 등 나머지는 건드리지 않는다.
 * questionRepo.update는 payload만 바꾸므로 seedHash 기반 "사용자 수정 보존" 정책과
 * 기존 Attempt/학습기록 재채점 금지 정책을 그대로 따른다(추가 처리 불필요).
 */
export function AnswerEditModal({ question, onClose }: AnswerEditModalProps) {
  const [saving, setSaving] = useState(false);

  const [blankAnswers, setBlankAnswers] = useState(() =>
    question.type === "blank" ? question.payload.blanks.map((b) => ({ ...b })) : [],
  );
  const [termOrDef, setTermOrDef] = useState(() =>
    question.type === "term-to-def"
      ? question.payload.definition
      : question.type === "def-to-term"
        ? question.payload.term
        : "",
  );
  const [answerText, setAnswerText] = useState(() =>
    question.type === "answer-input"
      ? formatAnswerForEditing(question.payload.answer)
      : question.type === "essay"
        ? question.payload.answer
        : "",
  );
  const [correctIndex, setCorrectIndex] = useState(() =>
    question.type === "multiple-choice" ? question.payload.correctIndex : 0,
  );

  async function handleSave() {
    setSaving(true);
    try {
      let payload: Question["payload"];
      switch (question.type) {
        case "blank":
          payload = { ...question.payload, blanks: blankAnswers };
          break;
        case "term-to-def":
          payload = { ...question.payload, definition: termOrDef };
          break;
        case "def-to-term":
          payload = { ...question.payload, term: termOrDef };
          break;
        case "answer-input":
          payload = { ...question.payload, answer: parseAnswerFromEditing(answerText) };
          break;
        case "multiple-choice":
          payload = { ...question.payload, correctIndex };
          break;
        case "essay":
          payload = { ...question.payload, answer: answerText };
          break;
      }
      await questionRepo.update(question.id, { payload });
      onClose();
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-text-primary/40 p-6">
      <Card className="w-full max-w-md">
        <h2 className="font-display text-lg font-extrabold text-text-primary">정답 수정</h2>
        <p className="mt-1 font-body text-xs text-text-secondary">
          정답만 바로 고칩니다. 문제 내용/태그/해설은 바뀌지 않고, 이미 기록된 학습 기록도 그대로
          유지됩니다.
        </p>

        <div className="mt-4 flex flex-col gap-3">
          {question.type === "blank" && (
            <div className="flex flex-col gap-2">
              {blankAnswers.map((blank, i) => (
                <label key={blank.id} className="flex items-center gap-2">
                  <span className="w-10 font-body text-xs text-text-secondary">{blank.id}</span>
                  <input
                    value={blank.answer}
                    onChange={(e) => {
                      const next = [...blankAnswers];
                      next[i] = { ...next[i], answer: e.target.value };
                      setBlankAnswers(next);
                    }}
                    className={`${inputClass} flex-1`}
                  />
                </label>
              ))}
            </div>
          )}

          {(question.type === "term-to-def" || question.type === "def-to-term") && (
            <label className="flex flex-col gap-1.5">
              <span className="font-body text-[13px] font-semibold text-text-secondary">
                {question.type === "term-to-def" ? "정의" : "용어"}
              </span>
              <textarea
                value={termOrDef}
                onChange={(e) => setTermOrDef(e.target.value)}
                className={`${inputClass} min-h-16`}
              />
            </label>
          )}

          {question.type === "answer-input" && (
            <label className="flex flex-col gap-1.5">
              <span className="font-body text-[13px] font-semibold text-text-secondary">
                정답 (줄바꿈으로 복수 정답/동의어 입력 가능)
              </span>
              <textarea
                value={answerText}
                onChange={(e) => setAnswerText(e.target.value)}
                className={`${inputClass} min-h-20`}
              />
            </label>
          )}

          {question.type === "multiple-choice" && (
            <div className="flex flex-col gap-2">
              <span className="font-body text-[13px] font-semibold text-text-secondary">
                정답 보기 선택
              </span>
              {question.payload.options.map((opt, i) => (
                <label key={i} className="flex items-center gap-2">
                  <input
                    type="radio"
                    checked={correctIndex === i}
                    onChange={() => setCorrectIndex(i)}
                    className="h-4 w-4 accent-accent"
                  />
                  <span className="font-body text-sm text-text-primary">{opt}</span>
                </label>
              ))}
            </div>
          )}

          {question.type === "essay" && (
            <label className="flex flex-col gap-1.5">
              <span className="font-body text-[13px] font-semibold text-text-secondary">모범답안</span>
              <textarea
                value={answerText}
                onChange={(e) => setAnswerText(e.target.value)}
                className={`${inputClass} min-h-20`}
              />
            </label>
          )}
        </div>

        <div className="mt-4 flex justify-end gap-2">
          <Button type="button" variant="secondary" className="!px-4 !py-2 text-sm" onClick={onClose}>
            취소
          </Button>
          <Button
            type="button"
            variant="primary"
            className="!px-4 !py-2 text-sm"
            onClick={handleSave}
            disabled={saving}
          >
            저장
          </Button>
        </div>
      </Card>
    </div>
  );
}
