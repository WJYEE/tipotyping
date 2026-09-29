import { Button } from "@/components/ui/Button";

export function BottomCtas() {
  return (
    <div className="flex justify-center gap-4 pt-2">
      <Button variant="secondary" className="!px-4 !py-2 font-body text-sm font-bold">
        문제 추가
      </Button>
      <Button variant="secondary" className="!px-4 !py-2 font-body text-sm font-bold">
        문제 관리
      </Button>
      <Button variant="secondary" className="!px-4 !py-2 font-body text-sm font-bold">
        기록 전체보기
      </Button>
    </div>
  );
}
