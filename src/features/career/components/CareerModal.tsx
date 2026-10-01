import type { ReactNode } from "react";
import { XIcon } from "@/components/ui/icons";

interface CareerModalProps {
  title: string;
  onClose: () => void;
  children: ReactNode;
}

/** 고정 오버레이 모달 껍데기. JdForm/JdAddModal이 공유한다(QuestionForm.tsx의 모달 패턴과 동일). */
export function CareerModal({ title, onClose, children }: CareerModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-career-text-primary/40 p-6">
      <div className="max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-[8px] border border-career-border bg-career-surface p-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-display text-lg font-bold text-career-text-primary">{title}</h2>
          <button type="button" onClick={onClose} aria-label="닫기">
            <XIcon className="h-4 w-4 text-career-text-muted hover:text-career-text-primary" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
