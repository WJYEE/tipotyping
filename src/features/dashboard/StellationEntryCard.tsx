import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { ChevronRightIcon } from "@/components/ui/icons";
import { STELLATION_PATH } from "@/lib/routes";

/** Home에서 Stellation(Knowledge Universe)으로 들어가는 진입 카드. WelcomeHero와 같은 Card/Button 패턴을 쓴다. */
export function StellationEntryCard() {
  const navigate = useNavigate();

  return (
    <Card className="flex items-center justify-between gap-6">
      <div className="flex flex-col gap-1">
        <h2 className="font-display text-xl font-extrabold text-text-primary">Stellation ✦</h2>
        <p className="font-body text-sm text-text-secondary">
          나의 학습과 커리어가 만들어가는 Knowledge Universe
        </p>
      </div>
      <Button variant="secondary" className="shrink-0 !px-5 !py-2.5 text-sm" onClick={() => navigate(STELLATION_PATH)}>
        열기
        <ChevronRightIcon className="h-4 w-4" />
      </Button>
    </Card>
  );
}
