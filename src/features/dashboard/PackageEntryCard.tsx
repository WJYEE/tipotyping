import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { ChevronRightIcon } from "@/components/ui/icons";

/** Home에서 학습 패키지(WJYEE / KB-Bridge / Self-Study) 선택 화면으로 들어가는 진입 카드. */
export function PackageEntryCard() {
  const navigate = useNavigate();

  return (
    <Card className="flex items-center justify-between gap-6">
      <div className="flex flex-col gap-1">
        <h2 className="font-display text-xl font-extrabold text-text-primary">학습 패키지</h2>
        <p className="font-body text-sm text-text-secondary">
          WJYEE · KB-Bridge · Self-Study — 문제은행, 개념 정리, 실습, 메모를 한곳에서
        </p>
      </div>
      <Button variant="secondary" className="shrink-0 !px-5 !py-2.5 text-sm" onClick={() => navigate("/packages")}>
        열기
        <ChevronRightIcon className="h-4 w-4" />
      </Button>
    </Card>
  );
}
