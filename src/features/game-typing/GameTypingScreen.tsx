import { useEffect, useRef, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/Card";
import { EditIcon, StarIcon, FlagIcon, TrashIcon } from "@/components/ui/icons";
import { attemptRepo, questionRecordRepo, questionRepo, sessionRepo } from "@/db/repositories";
import { sessionQualifies } from "@/db/repositories/sessionRepo";
import { evaluateAnswer, requiresSelfGrading } from "@/lib/evaluateAnswer";
import { shouldAdvanceOnEnter } from "@/lib/keyboard";
import {
  buildCycleQueue,
  filterQuestions,
  removeFromCycleQueue,
  type GameConfig,
} from "@/lib/questionSelection";
import { formatUserAnswerText, getCorrectAnswerText, getQuestionPromptText } from "@/lib/questionSummary";
import type { Question, QuestionRecord } from "@/types/domain";
import { AnswerEditModal } from "@/features/game-typing/AnswerEditModal";
import { FeedbackPanel } from "@/features/game-typing/FeedbackPanel";
import { QuestionView } from "@/features/game-typing/QuestionView";
import { SelfGradingPanel } from "@/features/game-typing/SelfGradingPanel";

interface FeedbackData {
  isCorrect: boolean;
  displayCode: string;
  questionText: string;
  userAnswerText: string;
  correctAnswerText: string;
  explanation?: string;
}

function formatClock(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}

export function GameTypingScreen() {
  const location = useLocation();
  const navigate = useNavigate();
  const config = (location.state as { config?: GameConfig } | null)?.config ?? null;

  const questions = useLiveQuery(() => questionRepo.list(), []) ?? [];
  const records = useLiveQuery(() => questionRecordRepo.list(), []) ?? [];
  const recordMap = new Map<string, QuestionRecord>(records.map((r) => [r.questionId, r]));

  const sessionIdRef = useRef<string | null>(null);
  const [sessionReady, setSessionReady] = useState(false);
  const [cycleQueue, setCycleQueue] = useState<Question[]>([]);
  const [cursor, setCursor] = useState(0);
  const [phase, setPhase] = useState<"answering" | "self-grading" | "feedback">("answering");
  const [feedback, setFeedback] = useState<FeedbackData | null>(null);
  const [essayAnswer, setEssayAnswer] = useState("");
  const [editingAnswer, setEditingAnswer] = useState(false);
  const [running, setRunning] = useState(true);
  const [elapsedMs, setElapsedMs] = useState(0);
  const elapsedMsRef = useRef(0);
  const endedRef = useRef(false);
  const [memoDraft, setMemoDraft] = useState("");

  useEffect(() => {
    elapsedMsRef.current = elapsedMs;
  }, [elapsedMs]);

  // 타이머: Pause 중에는 interval을 세우지 않아 자연스럽게 시간이 제외된다.
  useEffect(() => {
    if (!running) return;
    const id = setInterval(() => setElapsedMs((v) => v + 1000), 1000);
    return () => clearInterval(id);
  }, [running]);

  // Session row는 화면 진입(START) 시 1회만 생성한다.
  // sessionRepo.create()는 비동기라 완료 전까지 sessionIdRef.current가 비어있다. 이 guard만으로는
  // React StrictMode의 effect 이중 실행(마운트 시 setup→cleanup→setup)처럼 두 번째 호출이 첫 번째
  // create()의 완료를 기다리지 않고 들어오는 경우를 막지 못해 Session이 중복 생성된다.
  // → create()를 시작하기 "전"에 동기적으로 잠그는 별도 ref로 막는다.
  const sessionCreateStartedRef = useRef(false);
  useEffect(() => {
    if (!config || sessionCreateStartedRef.current) return;
    sessionCreateStartedRef.current = true;
    sessionRepo
      .create({
        startedAt: Date.now(),
        endedAt: null,
        totalDurationMs: 0,
        themeIds: config.themeIds,
        tagIds: config.tagIds,
        questionTypes: config.questionTypes,
        difficulties: config.difficulties,
        orderMode: config.orderMode,
        totalAttempts: 0,
        correctCount: 0,
        wrongCount: 0,
        accuracy: 0,
      })
      .then((session) => {
        sessionIdRef.current = session.id;
        setSessionReady(true);
      });
  }, [config]);

  function startNewCycle(excludeId?: string) {
    if (!config) return;
    // excludeId: 방금 삭제한 문제. useLiveQuery(questions) 갱신이 아직 반영되지 않았을 수 있어 명시적으로 제외한다.
    const pool = excludeId ? questions.filter((q) => q.id !== excludeId) : questions;
    const eligible = filterQuestions(pool, config);
    const queue = buildCycleQueue(
      eligible,
      config.themeIds,
      config.questionTypes,
      config.orderMode,
      recordMap,
    );
    setCycleQueue(queue);
    setCursor(0);
  }

  // 최초 1회, 문제 데이터가 로드되면 첫 사이클을 만든다.
  useEffect(() => {
    if (config && questions.length > 0 && cycleQueue.length === 0 && cursor === 0 && phase === "answering") {
      startNewCycle();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [config, questions.length]);

  const currentQueued = cycleQueue[cursor];
  const currentQuestion = currentQueued
    ? (questions.find((q) => q.id === currentQueued.id) ?? currentQueued)
    : null;

  useEffect(() => {
    setMemoDraft(currentQuestion?.memo ?? "");
  }, [currentQuestion?.id]);

  async function finishSession(navigateAway: boolean) {
    if (endedRef.current) return;
    endedRef.current = true;
    setRunning(false);
    const sessionId = sessionIdRef.current;
    if (!sessionId) {
      if (navigateAway) navigate("/");
      return;
    }
    // totalAttempts는 attemptRepo.record가 매 제출마다 Session에 실시간으로 반영해두므로 DB에서 바로 읽는다.
    const session = await sessionRepo.get(sessionId);
    const qualifies = sessionQualifies(session?.totalAttempts ?? 0, elapsedMsRef.current);
    if (qualifies) {
      await sessionRepo.update(sessionId, {
        endedAt: Date.now(),
        totalDurationMs: elapsedMsRef.current,
      });
    } else {
      await sessionRepo.discard(sessionId);
    }
    if (navigateAway) {
      navigate("/play/result", { state: { sessionId: qualifies ? sessionId : null } });
    }
  }

  function handleEnd() {
    if (!confirm("학습을 종료할까요?")) return;
    finishSession(true);
  }

  // ESC로 종료 (정답 수정 모달이 열려있으면 전역 단축키를 막아 모달과 충돌하지 않게 한다)
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (editingAnswer) return;
      if (e.key === "Escape") handleEnd();
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editingAnswer]);

  // Feedback 화면에서 Enter → 다음 문제.
  // 전역 리스너이지만 실제 진행 여부는 shouldAdvanceOnEnter가 판단한다:
  // IME 조합 중 / answering 단계 / Pause 중 / 메모 등 입력창에 포커스가 있으면 무시한다.
  // 정답 수정 모달이 열려있을 때도 막는다(모달의 저장 버튼 Enter가 다음 문제로도 넘어가 버리는 것 방지).
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (editingAnswer) return;
      const advance = shouldAdvanceOnEnter({
        key: e.key,
        isComposing: e.isComposing || e.keyCode === 229,
        phase,
        running,
        focusedTag: document.activeElement?.tagName ?? null,
      });
      if (advance) advanceToNext();
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, running, editingAnswer]);

  function advanceToNext() {
    setFeedback(null);
    setPhase("answering");
    if (cursor + 1 >= cycleQueue.length) {
      startNewCycle();
    } else {
      setCursor((c) => c + 1);
    }
  }

  async function handleAnswer(userAnswer: string | Record<string, string>) {
    if (!currentQuestion || !sessionIdRef.current) return;

    // 서술형: 자동 채점 없이 자가 채점 화면으로 넘어간다 (Attempt는 아직 기록하지 않는다).
    if (requiresSelfGrading(currentQuestion)) {
      setEssayAnswer(userAnswer as string);
      setPhase("self-grading");
      return;
    }

    const evaluation = evaluateAnswer(currentQuestion, userAnswer);
    await attemptRepo.record({
      sessionId: sessionIdRef.current,
      questionId: currentQuestion.id,
      questionType: currentQuestion.type,
      isCorrect: evaluation.isCorrect,
      userAnswer: typeof userAnswer === "string" ? userAnswer : JSON.stringify(userAnswer),
      blankResults: evaluation.blankResults,
      attemptedAt: Date.now(),
    });
    // Feedback에 보여줄 내용은 채점 시점 스냅샷이다 — 이후 "정답 수정"으로 문제가 바뀌어도
    // 이미 기록된 이 Attempt에 대한 Feedback 표시는 바뀌지 않는다(재채점 아님).
    setFeedback({
      isCorrect: evaluation.isCorrect,
      displayCode: currentQuestion.displayCode,
      questionText: getQuestionPromptText(currentQuestion),
      userAnswerText: formatUserAnswerText(currentQuestion, userAnswer),
      correctAnswerText: getCorrectAnswerText(currentQuestion),
      explanation: currentQuestion.explanation,
    });
    setPhase("feedback");
  }

  async function handleSelfGrade(isCorrect: boolean) {
    if (!currentQuestion || !sessionIdRef.current) return;
    await attemptRepo.record({
      sessionId: sessionIdRef.current,
      questionId: currentQuestion.id,
      questionType: currentQuestion.type,
      isCorrect,
      userAnswer: essayAnswer,
      attemptedAt: Date.now(),
    });
    setFeedback({
      isCorrect,
      displayCode: currentQuestion.displayCode,
      questionText: getQuestionPromptText(currentQuestion),
      userAnswerText: essayAnswer,
      correctAnswerText: getCorrectAnswerText(currentQuestion),
      explanation: currentQuestion.explanation,
    });
    setPhase("feedback");
  }

  function handleSkip() {
    advanceToNext();
  }

  async function toggleFavorite() {
    if (!currentQuestion) return;
    await questionRepo.update(currentQuestion.id, { favorite: !currentQuestion.favorite });
  }

  async function toggleFlag() {
    if (!currentQuestion) return;
    await questionRepo.update(currentQuestion.id, { flagged: !currentQuestion.flagged });
  }

  async function saveMemo() {
    if (!currentQuestion) return;
    if (memoDraft === (currentQuestion.memo ?? "")) return;
    await questionRepo.update(currentQuestion.id, { memo: memoDraft || undefined });
  }

  async function handleDeleteQuestion() {
    if (!currentQuestion) return;
    if (!confirm("이 문제를 삭제할까요?")) return;

    const idToRemove = currentQuestion.id;
    await questionRepo.remove(idToRemove);

    setFeedback(null);
    setPhase("answering");

    const { queue: remainingQueue, needsNewCycle } = removeFromCycleQueue(cycleQueue, cursor, idToRemove);
    if (needsNewCycle) {
      startNewCycle(idToRemove);
    } else {
      setCycleQueue(remainingQueue);
    }
  }

  if (!config) {
    return (
      <div className="mx-auto flex max-w-[640px] flex-col items-center gap-4 px-6 py-20 text-center">
        <p className="font-body text-sm text-text-secondary">게임 설정 정보가 없습니다.</p>
        <Link to="/play" className="font-body text-sm font-semibold text-accent">
          테마 선택으로 이동
        </Link>
      </div>
    );
  }

  if (!sessionReady || !currentQuestion) {
    return (
      <div className="mx-auto flex max-w-[640px] flex-col items-center gap-4 px-6 py-20 text-center">
        <p className="font-body text-sm text-text-secondary">문제를 준비하는 중...</p>
      </div>
    );
  }

  return (
    <div className="mx-auto flex max-w-[720px] flex-col gap-6 px-6 py-10 md:px-10">
      <div className="flex items-center justify-between">
        <span className="font-display text-2xl font-extrabold text-text-primary">
          {formatClock(elapsedMs)}
        </span>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setRunning((r) => !r)}
            className="rounded-pill border-2 border-border-strong px-4 py-1.5 font-body text-sm font-semibold text-text-primary"
          >
            {running ? "Pause" : "Resume"}
          </button>
          <button
            type="button"
            onClick={handleEnd}
            className="rounded-pill border-2 border-border-strong px-4 py-1.5 font-body text-sm font-semibold text-text-primary"
          >
            학습 종료
          </button>
        </div>
      </div>

      <Card className="flex flex-col gap-6">
        <div className="flex items-center justify-between">
          <span className="rounded-badge border border-border px-1.5 py-0.5 font-mono text-[11px] font-semibold text-text-secondary">
            {currentQuestion.displayCode}
          </span>
          <div className="flex items-center gap-3">
            <button type="button" onClick={toggleFavorite} aria-label="favorite">
              <StarIcon
                filled={currentQuestion.favorite}
                className={`h-5 w-5 ${currentQuestion.favorite ? "text-warning" : "text-text-muted"}`}
              />
            </button>
            <button type="button" onClick={toggleFlag} aria-label="flag">
              <FlagIcon
                className={`h-5 w-5 ${currentQuestion.flagged ? "text-danger" : "text-text-muted"}`}
              />
            </button>
            <button type="button" onClick={() => setEditingAnswer(true)} aria-label="정답 수정">
              <EditIcon className="h-5 w-5 text-text-muted hover:text-accent" />
            </button>
            <button type="button" onClick={handleDeleteQuestion} aria-label="문제 삭제">
              <TrashIcon className="h-5 w-5 text-text-muted hover:text-danger" />
            </button>
          </div>
        </div>

        {running ? (
          phase === "answering" ? (
            <QuestionView key={currentQuestion.id} question={currentQuestion} onSubmit={handleAnswer} />
          ) : phase === "self-grading" ? (
            <SelfGradingPanel
              userAnswer={essayAnswer}
              correctAnswerText={getCorrectAnswerText(currentQuestion)}
              explanation={currentQuestion.explanation}
              onGrade={handleSelfGrade}
            />
          ) : (
            feedback && (
              <FeedbackPanel
                isCorrect={feedback.isCorrect}
                displayCode={feedback.displayCode}
                questionText={feedback.questionText}
                userAnswerText={feedback.userAnswerText}
                correctAnswerText={feedback.correctAnswerText}
                explanation={feedback.explanation}
              />
            )
          )
        ) : (
          <p className="py-10 text-center font-body text-sm text-text-secondary">일시정지됨</p>
        )}

        {phase === "answering" && running && (
          <button
            type="button"
            onClick={handleSkip}
            className="self-start font-body text-xs font-semibold text-text-secondary hover:text-text-primary"
          >
            Skip
          </button>
        )}

        <label className="flex flex-col gap-1.5 border-t border-border pt-4">
          <span className="font-body text-[13px] font-semibold text-text-secondary">개인 메모</span>
          <textarea
            value={memoDraft}
            onChange={(e) => setMemoDraft(e.target.value)}
            onBlur={saveMemo}
            className="min-h-12 rounded-badge border border-border bg-surface px-3 py-2 font-body text-sm text-text-primary outline-none focus:border-accent"
          />
        </label>
      </Card>

      {editingAnswer && currentQuestion && (
        <AnswerEditModal question={currentQuestion} onClose={() => setEditingAnswer(false)} />
      )}
    </div>
  );
}
