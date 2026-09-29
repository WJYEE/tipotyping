import type { Question } from "@/types/domain";
import {
  BlankQuestionView,
  EssayView,
  MultipleChoiceView,
  SingleInputView,
} from "@/features/game-typing/QuestionTypeViews";

interface QuestionViewProps {
  question: Question;
  onSubmit: (userAnswer: string | Record<string, string>) => void;
}

export function QuestionView({ question, onSubmit }: QuestionViewProps) {
  switch (question.type) {
    case "blank":
      return <BlankQuestionView payload={question.payload} onComplete={onSubmit} />;
    case "term-to-def":
      return <SingleInputView label="용어" text={question.payload.term} onSubmit={onSubmit} />;
    case "def-to-term":
      return <SingleInputView label="정의" text={question.payload.definition} onSubmit={onSubmit} />;
    case "answer-input":
      return <SingleInputView label="문제" text={question.payload.prompt} onSubmit={onSubmit} />;
    case "essay":
      return <EssayView prompt={question.payload.prompt} onSubmit={onSubmit} />;
    case "multiple-choice":
      return <MultipleChoiceView payload={question.payload} onSubmit={onSubmit} />;
  }
}
