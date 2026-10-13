import { useState } from "react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { packageRepo } from "@/db/repositories";
import { CategoryChips, SearchBox, type CategoryChip } from "@/features/packages/CategoryChips";
import { MarkdownText } from "@/features/packages/MarkdownText";
import type { PackageData } from "@/features/packages/usePackageData";
import { isHttpUrl } from "@/lib/packages/url";
import type { Memo, MemoLink, PackageId } from "@/types/package";

interface Props {
  packageId: PackageId;
  data: PackageData;
}

interface Draft {
  id: string | null;
  category: string;
  title: string;
  body: string;
  tags: string;
  source: string;
  links: string;
}

const EMPTY_DRAFT: Draft = { id: null, category: "", title: "", body: "", tags: "", source: "", links: "" };

function parseLinks(text: string): MemoLink[] {
  return text
    .split("\n")
    .map((l) => l.trim())
    .filter(isHttpUrl)
    .map((url) => ({ label: url, url }));
}

function toDraft(m: Memo): Draft {
  return {
    id: m.id,
    category: m.category,
    title: m.title,
    body: m.body,
    tags: m.tags.join(", "),
    source: m.source,
    links: m.links.map((l) => l.url).join("\n"),
  };
}

const inputClass =
  "w-full rounded-badge border border-border bg-surface px-3 py-2 font-body text-sm text-text-primary outline-none focus:border-accent";

export function MemosTab({ packageId, data }: Props) {
  const [category, setCategory] = useState("");
  const [search, setSearch] = useState("");
  const [openId, setOpenId] = useState<string | null>(null);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const labels = [...new Set(data.memos.map((m) => m.category))];
  const chips: CategoryChip[] = labels.map((l) => ({
    key: l,
    label: l,
    count: data.memos.filter((m) => m.category === l).length,
  }));
  const needle = search.trim().toLowerCase();
  const visible = data.memos.filter(
    (m) =>
      (!category || m.category === category) &&
      (!needle || `${m.title} ${m.body} ${m.tags.join(" ")} ${m.category}`.toLowerCase().includes(needle)),
  );

  const canSave = draft !== null && draft.title.trim() !== "" && draft.body.trim() !== "";

  async function save() {
    if (!draft || !canSave) return;
    const tags = draft.tags.split(",").map((t) => t.trim()).filter(Boolean);
    const links = parseLinks(draft.links);
    if (draft.id) {
      await packageRepo.updateMemo(draft.id, {
        category: draft.category.trim() || "기타",
        title: draft.title.trim(),
        body: draft.body.trim(),
        tags,
        source: draft.source.trim(),
        links,
      });
    } else {
      await packageRepo.createMemo(packageId, {
        category: draft.category,
        title: draft.title,
        body: draft.body,
        tags,
        source: draft.source,
        links,
      });
    }
    setDraft(null);
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        {chips.length > 0 ? <CategoryChips chips={chips} value={category} onChange={setCategory} /> : <span />}
        <Button variant="success" className="!px-4 !py-2 text-sm" onClick={() => setDraft({ ...EMPTY_DRAFT })}>
          + 메모 추가
        </Button>
      </div>

      {draft && (
        <Card className="flex flex-col gap-3 !p-4">
          <h2 className="font-display text-base font-extrabold text-text-primary">{draft.id ? "메모 수정" : "새 메모"}</h2>
          <div className="grid gap-3 md:grid-cols-2">
            <label className="flex flex-col gap-1 font-body text-xs font-semibold text-text-secondary">
              카테고리
              <input
                list="memo-categories"
                className={inputClass}
                value={draft.category}
                onChange={(e) => setDraft({ ...draft, category: e.target.value })}
                placeholder="예: 취업·커리어"
              />
              <datalist id="memo-categories">
                {labels.map((l) => (
                  <option key={l} value={l} />
                ))}
              </datalist>
            </label>
            <label className="flex flex-col gap-1 font-body text-xs font-semibold text-text-secondary">
              제목
              <input className={inputClass} value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} />
            </label>
          </div>
          <label className="flex flex-col gap-1 font-body text-xs font-semibold text-text-secondary">
            내용
            <textarea rows={5} className={inputClass} value={draft.body} onChange={(e) => setDraft({ ...draft, body: e.target.value })} />
          </label>
          <div className="grid gap-3 md:grid-cols-2">
            <label className="flex flex-col gap-1 font-body text-xs font-semibold text-text-secondary">
              태그 (쉼표로 구분)
              <input className={inputClass} value={draft.tags} onChange={(e) => setDraft({ ...draft, tags: e.target.value })} />
            </label>
            <label className="flex flex-col gap-1 font-body text-xs font-semibold text-text-secondary">
              출처
              <input className={inputClass} value={draft.source} onChange={(e) => setDraft({ ...draft, source: e.target.value })} />
            </label>
          </div>
          <label className="flex flex-col gap-1 font-body text-xs font-semibold text-text-secondary">
            관련 링크 (한 줄에 URL 하나, http/https만 저장돼요)
            <textarea rows={2} className={inputClass} value={draft.links} onChange={(e) => setDraft({ ...draft, links: e.target.value })} />
          </label>
          <div className="flex gap-2">
            <Button variant="success" className="!px-4 !py-2 text-sm" disabled={!canSave} onClick={() => void save()}>
              저장
            </Button>
            <Button variant="secondary" className="!px-4 !py-2 text-sm" onClick={() => setDraft(null)}>
              취소
            </Button>
          </div>
        </Card>
      )}

      {data.memos.length === 0 && !draft ? (
        <Card className="font-body text-sm text-text-secondary">
          아직 메모가 없습니다. "+ 메모 추가"로 학습·취업 메모를 남겨 보세요.
        </Card>
      ) : (
        <>
          <SearchBox value={search} onChange={setSearch} placeholder="메모 제목·내용·태그 검색" />
          <ul className="flex flex-col gap-3">
            {visible.map((m) => {
              const open = openId === m.id;
              return (
                <li key={m.id}>
                  <Card className="flex flex-col gap-2 !p-4">
                    <button
                      type="button"
                      aria-expanded={open}
                      onClick={() => setOpenId(open ? null : m.id)}
                      className="flex flex-col gap-1.5 text-left"
                    >
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge>{m.category}</Badge>
                        {m.origin === "user" && <Badge tone="success">내 메모</Badge>}
                        {!m.verified && m.origin === "bundled" && <Badge tone="warning">사실 확인 전</Badge>}
                      </div>
                      <h3 className="font-display text-base font-extrabold text-text-primary">{m.title}</h3>
                      {!open && <p className="line-clamp-2 font-body text-sm text-text-secondary">{m.body}</p>}
                    </button>
                    {open && (
                      <div className="flex flex-col gap-3 border-t border-border pt-3">
                        <MarkdownText source={m.body} />
                        {m.tags.length > 0 && (
                          <div className="flex flex-wrap gap-1.5">
                            {m.tags.map((t) => (
                              <span key={t} className="rounded-pill border border-border px-2 py-0.5 font-body text-xs text-text-secondary">
                                #{t}
                              </span>
                            ))}
                          </div>
                        )}
                        {m.source && <p className="font-body text-xs text-text-secondary">출처: {m.source}</p>}
                        {m.links.length > 0 && (
                          <ul className="flex flex-col gap-1">
                            {m.links.map((l) => (
                              <li key={l.url}>
                                <a href={l.url} target="_blank" rel="noopener noreferrer" className="font-body text-xs font-semibold text-accent hover:underline">
                                  {l.label} ↗
                                </a>
                              </li>
                            ))}
                          </ul>
                        )}
                        <div className="flex items-center gap-3 font-body text-xs font-semibold">
                          <button type="button" className="text-accent" onClick={() => setDraft(toDraft(m))}>
                            수정
                          </button>
                          {confirmDeleteId === m.id ? (
                            <>
                              <button
                                type="button"
                                className="text-danger"
                                onClick={async () => {
                                  await packageRepo.removeMemo(m.id);
                                  setConfirmDeleteId(null);
                                  setOpenId(null);
                                }}
                              >
                                정말 삭제
                              </button>
                              <button type="button" className="text-text-secondary" onClick={() => setConfirmDeleteId(null)}>
                                취소
                              </button>
                            </>
                          ) : (
                            <button type="button" className="text-danger" onClick={() => setConfirmDeleteId(m.id)}>
                              삭제
                            </button>
                          )}
                        </div>
                      </div>
                    )}
                  </Card>
                </li>
              );
            })}
          </ul>
          {visible.length === 0 && data.memos.length > 0 && (
            <Card className="font-body text-sm text-text-secondary">조건에 맞는 메모가 없습니다.</Card>
          )}
        </>
      )}
    </div>
  );
}
