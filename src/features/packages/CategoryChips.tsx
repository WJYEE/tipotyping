export interface CategoryChip {
  key: string;
  label: string;
  count?: number;
  /** 칩 옆에 보조로 보여줄 텍스트(예: 3/10) */
  hint?: string;
}

interface CategoryChipsProps {
  chips: CategoryChip[];
  value: string;
  onChange: (key: string) => void;
  allLabel?: string;
}

/** 카테고리 선택 칩 목록. 빈 문자열 key는 "전체". 키보드(탭/엔터)와 스크린리더(aria-pressed)로 조작할 수 있다. */
export function CategoryChips({ chips, value, onChange, allLabel = "전체" }: CategoryChipsProps) {
  const total = chips.reduce((sum, c) => sum + (c.count ?? 0), 0);
  const base = "rounded-pill border px-3 py-1.5 font-body text-sm";
  const on = "border-border-strong bg-accent-soft font-semibold text-text-primary";
  const off = "border-border text-text-secondary hover:text-text-primary";
  return (
    <div className="flex flex-wrap gap-2" role="group" aria-label="카테고리 선택">
      <button type="button" aria-pressed={value === ""} onClick={() => onChange("")} className={`${base} ${value === "" ? on : off}`}>
        {allLabel}
        {total > 0 && <span className="ml-1 text-xs text-text-muted">{total}</span>}
      </button>
      {chips.map((c) => (
        <button
          key={c.key}
          type="button"
          aria-pressed={value === c.key}
          onClick={() => onChange(c.key)}
          className={`${base} ${value === c.key ? on : off}`}
        >
          {c.label}
          {c.hint ? (
            <span className="ml-1 text-xs text-text-muted">{c.hint}</span>
          ) : c.count !== undefined ? (
            <span className="ml-1 text-xs text-text-muted">{c.count}</span>
          ) : null}
        </button>
      ))}
    </div>
  );
}

export function SearchBox({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
}) {
  return (
    <input
      type="search"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      aria-label={placeholder}
      className="w-full rounded-badge border border-border bg-surface px-3 py-2 font-body text-sm text-text-primary outline-none focus:border-accent"
    />
  );
}
