"use client";

import { Tab, SortOrder } from "@/lib/types";

const SORT_LABELS: Record<SortOrder, string> = {
  default: "↕ 並び替え",
  "pt-desc": "↓ pt 高い順",
  "pt-asc": "↑ pt 低い順",
};

const SORT_CYCLE: SortOrder[] = ["default", "pt-desc", "pt-asc"];

interface Props {
  tab: Tab;
  allTags: string[];
  activeFilterTags: string[];
  searchQuery: string;
  sortOrder: SortOrder;
  onSearchChange: (q: string) => void;
  onSortChange: (order: SortOrder) => void;
  onToggleTag: (tag: string) => void;
}

export default function FilterArea({
  tab,
  allTags,
  activeFilterTags,
  searchQuery,
  sortOrder,
  onSearchChange,
  onSortChange,
  onToggleTag,
}: Props) {
  const isAction = tab === "action";
  const activeColor = isAction ? "var(--accent)" : "var(--reward)";
  const activeBg = isAction ? "rgba(255,107,53,0.2)" : "rgba(6,214,160,0.2)";
  const isActive = sortOrder !== "default";

  function cycleSortOrder() {
    const cur = SORT_CYCLE.indexOf(sortOrder);
    onSortChange(SORT_CYCLE[(cur + 1) % SORT_CYCLE.length]);
  }

  return (
    <div className="mb-3">
      {/* 検索・ソート */}
      <div className="flex gap-2 mb-2">
        <div className="relative flex-1">
          <span
            style={{
              position: "absolute",
              left: 10,
              top: "50%",
              transform: "translateY(-50%)",
              color: "var(--muted)",
              fontSize: "0.9rem",
              pointerEvents: "none",
            }}
          >
            🔍
          </span>
          <input
            type="text"
            value={searchQuery}
            placeholder="キーワードで検索"
            onChange={(e) => onSearchChange(e.target.value)}
            style={{
              width: "100%",
              background: "var(--surface)",
              border: "1.5px solid transparent",
              borderRadius: 10,
              padding: "8px 12px 8px 32px",
              color: "var(--text)",
              fontFamily: "inherit",
              fontSize: "0.85rem",
              outline: "none",
              transition: "border-color 0.15s",
            }}
            onFocus={(e) => (e.target.style.borderColor = "var(--accent)")}
            onBlur={(e) => (e.target.style.borderColor = "transparent")}
          />
        </div>
        <button
          onClick={cycleSortOrder}
          style={{
            padding: "0 14px",
            borderRadius: 10,
            border: `1.5px solid ${isActive ? activeColor : "var(--surface2)"}`,
            background: isActive
              ? isAction
                ? "rgba(255,107,53,0.1)"
                : "rgba(6,214,160,0.1)"
              : "transparent",
            color: isActive ? activeColor : "var(--muted)",
            cursor: "pointer",
            fontSize: "0.8rem",
            fontWeight: 700,
            whiteSpace: "nowrap",
            transition: "all 0.15s",
            flexShrink: 0,
          }}
        >
          {SORT_LABELS[sortOrder]}
        </button>
      </div>

      {/* タグフィルター */}
      {allTags.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {allTags.map((tag) => {
            const active = activeFilterTags.includes(tag);
            return (
              <button
                key={tag}
                onClick={() => onToggleTag(tag)}
                style={{
                  fontSize: "0.78rem",
                  fontWeight: 700,
                  padding: "4px 12px",
                  borderRadius: 20,
                  cursor: "pointer",
                  transition: "all 0.15s",
                  border: `1.5px solid ${active ? activeColor : "var(--surface2)"}`,
                  background: active ? activeBg : "transparent",
                  color: active ? activeColor : "var(--muted)",
                }}
              >
                {tag}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
