import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { IconPlate } from "@/components/ui/IconPlate";

export default function App() {
  return (
    <main className="mx-auto flex max-w-3xl flex-col gap-8 p-10">
      <h1 className="font-display text-3xl font-extrabold">AnkiTyping UI Primitives</h1>

      <Card emphasized className="flex flex-col gap-4">
        <div className="flex items-center gap-3">
          <IconPlate tone="accent">⏱️</IconPlate>
          <div>
            <p className="font-body text-sm text-text-secondary">학습시간</p>
            <p className="font-display text-xl font-extrabold">01:24:15</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Badge tone="accent">MAIN</Badge>
          <Badge tone="success">정답</Badge>
          <Badge tone="danger">오답</Badge>
          <Badge tone="warning">Flag</Badge>
        </div>
        <div className="flex gap-3">
          <Button variant="success">게임 시작 👉</Button>
          <Button variant="primary">+ 문제 추가</Button>
          <Button variant="secondary">취소</Button>
        </div>
      </Card>
    </main>
  );
}
