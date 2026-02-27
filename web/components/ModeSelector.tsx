"use client";

import { useState } from "react";
import { signOut } from "next-auth/react";
import { Mode } from "@/lib/types";

interface Props {
  mode: Mode;
  onModeChange: (mode: Mode) => void;
}

export default function ModeSelector({ mode, onModeChange }: Props) {
  const [tooltipOpen, setTooltipOpen] = useState(false);

  return (
    <div className="flex items-center gap-2">
      {/* Mode select */}
      <div className="relative inline-flex items-center">
        <select
          value={mode}
          onChange={(e) => onModeChange(e.target.value as Mode)}
          className="text-xs font-bold rounded-xl pl-3 pr-7 py-2 border-none outline-none cursor-pointer appearance-none"
          style={{ background: "var(--surface2)", color: "var(--text)" }}
        >
          <option value="easy">🟢 イージー</option>
          <option value="normal">🟡 ノーマル</option>
          <option value="hard">🔴 ハード</option>
        </select>
        <span className="absolute right-2 pointer-events-none text-base text-muted">
          ▾
        </span>
      </div>

      {/* Mode help */}
      <div className="relative">
        <button onClick={() => setTooltipOpen((v) => !v)} className="icon-btn">
          ?
        </button>
        {tooltipOpen && (
          <>
            <div
              className="fixed inset-0 z-40"
              onClick={() => setTooltipOpen(false)}
            />
            <div className="tooltip-panel">
              <div className="font-black mb-2">モードについて</div>
              <div className="mb-1">
                🟢 <b>イージー</b>
              </div>
              <div className="text-muted mb-2">
                獲得 ×1.5 ／ 消費 ×0.7
                <br />
                ポイントが貯まりやすい
              </div>
              <div className="mb-1">
                🟡 <b>ノーマル</b>
              </div>
              <div className="text-muted mb-2">
                獲得 ×1.0 ／ 消費 ×1.0
                <br />
                標準バランス
              </div>
              <div className="mb-1">
                🔴 <b>ハード</b>
              </div>
              <div className="text-muted">
                獲得 ×0.8 ／ 消費 ×1.5
                <br />
                ポイントが貯まりにくい
              </div>
            </div>
          </>
        )}
      </div>

      {/* Sign out */}
      <button
        onClick={() => signOut({ callbackUrl: "/" })}
        title="サインアウト"
        className="icon-btn"
      >
        ↩
      </button>
    </div>
  );
}
