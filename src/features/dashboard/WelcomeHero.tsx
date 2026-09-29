import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";

export function WelcomeHero() {
  return (
    <Card emphasized className="flex items-center justify-between gap-8">
      <div className="flex flex-col gap-2">
        <h1 className="font-display text-[28px] font-extrabold text-text-primary">
          오늘도 힘차게 타이핑 학습! ⚡️
        </h1>
        <p className="font-body text-[15px] text-text-secondary">
          Anki 암기 카드와 영타/한타 타이핑 테스트가 결합된 효율적인 학습을 시작해보세요.
        </p>
      </div>
      <Button variant="success" className="shrink-0 !px-8 !py-4 font-display text-xl font-extrabold">
        게임 시작 👉
      </Button>
    </Card>
  );
}
