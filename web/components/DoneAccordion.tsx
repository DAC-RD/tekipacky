"use client";

import { useState } from "react";
import { DoneItem } from "@/lib/types";

interface Props {
  type: "action" | "reward";
  items: DoneItem[];
  totalPt: number;
  onAdjust: (id: number, delta: number) => void;
}

export default function DoneAccordion({
  type,
  items,
  totalPt,
  onAdjust,
}: Props) {
  const [open, setOpen] = useState(false);

  const isAction = type === "action";
  const label = isAction ? "📋 今日の行動ログ" : "🎁 今日のご褒美ログ";
  const badgeColor = isAction ? "var(--accent2)" : "var(--reward)";
  const sign = isAction ? "+" : "-";
  const badgeText = totalPt > 0 ? `${sign}${totalPt}pt` : "";
  const ptColor = isAction ? "var(--accent)" : "var(--reward)";

  return (
    <div className="done-section mb-5">
      <button
        type="button"
        className="done-header"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
      >
        <span>{label}</span>
        <div className="flex items-center gap-2">
          <span className="text-xs font-black" style={{ color: badgeColor }}>
            {badgeText}
          </span>
          <span className={`chevron ${open ? "open" : ""}`}>▼</span>
        </div>
      </button>

      {open && (
        <div>
          {items.length === 0 ? (
            <div
              className="done-item"
              style={{ color: "var(--muted)", fontSize: "0.85rem" }}
            >
              まだ記録なし
            </div>
          ) : (
            items.map((d) => (
              <div key={d.id} className="done-item">
                <div>
                  <span className="font-bold text-sm">{d.title}</span>
                  <span className="text-xs ml-2" style={{ color: ptColor }}>
                    {sign}
                    {d.pt * d.count}pt
                  </span>
                </div>
                <div className="count-ctrl">
                  <button
                    className="count-btn"
                    onClick={() => onAdjust(d.id, -1)}
                  >
                    −
                  </button>
                  <span className="count-num">{d.count}</span>
                  <button
                    className="count-btn"
                    onClick={() => onAdjust(d.id, 1)}
                  >
                    ＋
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
