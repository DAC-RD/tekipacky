"use client";

import { Action, Mode } from "@/lib/types";
import { calcActionPt } from "@/lib/utils";

interface Props {
  actions: Action[];
  mode: Mode;
  hydrated: boolean;
  totalCount: number;
  hasFilter: boolean;
  onComplete: (id: number, x: number, y: number) => void;
  onEdit: (id: number) => void;
}

export default function ActionCardList({
  actions,
  mode,
  hydrated,
  totalCount,
  hasFilter,
  onComplete,
  onEdit,
}: Props) {
  return (
    <div>
      <p className="section-title">
        タップしてポイント獲得
        {hasFilter && ` (${actions.length}/${totalCount}件)`}
      </p>
      {!hydrated ? (
        <p className="empty-state">読み込み中...</p>
      ) : actions.length === 0 ? (
        <p className="empty-state">
          まだ行動がありません
          <br />
          ＋ボタンで追加しましょう
        </p>
      ) : (
        actions.map((a) => {
          const pt = calcActionPt(a.hurdle, a.time, mode);
          return (
            <div
              key={a.id}
              className="action-card mb-3"
              onClick={(e) => onComplete(a.id, e.clientX, e.clientY)}
            >
              <div className="flex-1 min-w-0">
                <div className="font-bold text-sm truncate">{a.title}</div>
                {a.desc && (
                  <div className="text-xs mt-0.5 truncate text-muted">
                    {a.desc}
                  </div>
                )}
                {a.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-1">
                    {a.tags.map((t) => (
                      <span key={t} className="action-tag">
                        {t}
                      </span>
                    ))}
                  </div>
                )}
              </div>
              <span className="pt-badge">+{pt}pt</span>
              <button
                className="card-edit-btn"
                onClick={(e) => {
                  e.stopPropagation();
                  onEdit(a.id);
                }}
              >
                ✎
              </button>
            </div>
          );
        })
      )}
    </div>
  );
}
