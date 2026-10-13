import type { ReactNode } from "react";

// 의존성 없이 학습 정리/메모 본문을 읽기 좋게 보여주는 최소 마크다운 렌더러.
// 지원: # ~ ### 제목, - / 1. 목록, > 인용, **굵게**, `코드`, 빈 줄 단락. 원본 HTML은 절대 해석하지 않는다(React 텍스트로만 출력).

function inline(text: string): ReactNode[] {
  return text.split(/(\*\*[^*]+\*\*|`[^`]+`)/g).map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**") && part.length > 4) {
      return <strong key={i}>{part.slice(2, -2)}</strong>;
    }
    if (part.startsWith("`") && part.endsWith("`") && part.length > 2) {
      return (
        <code key={i} className="rounded bg-accent-soft px-1 py-0.5 font-mono text-[0.9em]">
          {part.slice(1, -1)}
        </code>
      );
    }
    return part;
  });
}

type Block =
  | { type: "heading"; level: number; text: string }
  | { type: "list"; ordered: boolean; items: string[] }
  | { type: "quote"; text: string }
  | { type: "paragraph"; text: string };

export function parseMarkdown(source: string): Block[] {
  const blocks: Block[] = [];
  const lines = source.replace(/\r\n/g, "\n").split("\n");
  let paragraph: string[] = [];
  const flush = () => {
    if (paragraph.length > 0) blocks.push({ type: "paragraph", text: paragraph.join(" ") });
    paragraph = [];
  };
  for (const raw of lines) {
    const line = raw.trimEnd();
    const heading = /^(#{1,3})\s+(.*)$/.exec(line);
    const bullet = /^\s*[-*]\s+(.*)$/.exec(line);
    const numbered = /^\s*\d+\.\s+(.*)$/.exec(line);
    const quote = /^>\s?(.*)$/.exec(line);
    if (!line.trim()) {
      flush();
    } else if (heading) {
      flush();
      blocks.push({ type: "heading", level: heading[1].length, text: heading[2] });
    } else if (bullet || numbered) {
      flush();
      const ordered = !!numbered;
      const text = (bullet ?? numbered)![1];
      const last = blocks[blocks.length - 1];
      if (last?.type === "list" && last.ordered === ordered) last.items.push(text);
      else blocks.push({ type: "list", ordered, items: [text] });
    } else if (quote) {
      flush();
      blocks.push({ type: "quote", text: quote[1] });
    } else {
      paragraph.push(line.trim());
    }
  }
  flush();
  return blocks;
}

export function MarkdownText({ source, className = "" }: { source: string; className?: string }) {
  const blocks = parseMarkdown(source);
  return (
    <div className={`flex flex-col gap-2.5 font-body text-sm leading-relaxed text-text-primary ${className}`}>
      {blocks.map((b, i) => {
        if (b.type === "heading") {
          const size = b.level === 1 ? "text-lg" : b.level === 2 ? "text-base" : "text-sm";
          return (
            <p key={i} className={`mt-1 font-display ${size} font-extrabold`}>
              {inline(b.text)}
            </p>
          );
        }
        if (b.type === "list") {
          const Tag = b.ordered ? "ol" : "ul";
          return (
            <Tag key={i} className={`flex flex-col gap-1 pl-5 ${b.ordered ? "list-decimal" : "list-disc"}`}>
              {b.items.map((item, j) => (
                <li key={j}>{inline(item)}</li>
              ))}
            </Tag>
          );
        }
        if (b.type === "quote") {
          return (
            <blockquote key={i} className="border-l-4 border-border-strong pl-3 text-text-secondary">
              {inline(b.text)}
            </blockquote>
          );
        }
        return <p key={i}>{inline(b.text)}</p>;
      })}
    </div>
  );
}
