import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";
import { CareerTopNav } from "@/components/layout/CareerTopNav";
import { TopNav } from "@/components/layout/TopNav";
import { StellationEntryCard } from "@/features/dashboard/StellationEntryCard";

function render(node: React.ReactNode, path = "/") {
  return renderToStaticMarkup(<MemoryRouter initialEntries={[path]}>{node}</MemoryRouter>);
}

describe("Stellation 진입점", () => {
  it("Learning TopNav에서 /stellation으로 이동할 수 있다", () => {
    expect(render(<TopNav />)).toContain('href="/stellation"');
  });

  it("Career TopNav에서도 /stellation으로 이동할 수 있다", () => {
    expect(render(<CareerTopNav />, "/career")).toContain('href="/stellation"');
  });

  it("Home 진입 카드는 Stellation 이름과 한 줄 설명을 보여준다", () => {
    const html = render(<StellationEntryCard />);
    expect(html).toContain("Stellation");
    expect(html).toContain("Knowledge Universe");
  });
});
