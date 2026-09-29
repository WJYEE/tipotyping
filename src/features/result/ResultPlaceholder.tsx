import { Link, useLocation } from "react-router-dom";

// Result 화면은 다음 단계에서 구현 예정. 지금은 라우트만 연결해 게임 종료 후 이동할 곳을 마련한다.
export function ResultPlaceholder() {
  const location = useLocation();
  const sessionId = (location.state as { sessionId?: string | null } | null)?.sessionId ?? null;

  return (
    <div className="mx-auto flex max-w-[640px] flex-col items-center gap-4 px-6 py-20 text-center">
      <h1 className="font-display text-xl font-extrabold text-text-primary">학습이 종료되었습니다</h1>
      <p className="font-body text-sm text-text-secondary">
        {sessionId ? "결과 화면은 다음 단계에서 준비될 예정입니다." : "10초 미만 학습은 기록되지 않았습니다."}
      </p>
      <Link to="/" className="font-body text-sm font-semibold text-accent">
        홈으로 돌아가기
      </Link>
    </div>
  );
}
