"use client";

import { Mode, Reward } from "@/lib/types";
import { calcRewardPt } from "@/lib/utils";

interface Props {
  rewards: Reward[];
  mode: Mode;
  points: number;
  hydrated: boolean;
  totalCount: number;
  hasFilter: boolean;
  onComplete: (id: number, x: number, y: number) => void;
  onEdit: (id: number) => void;
}

export default function RewardCardList({
  rewards,
  mode,
  points,
  hydrated,
  totalCount,
  hasFilter,
  onComplete,
  onEdit,
}: Props) {
  return (
    <div>
      <p className="section-title">
        タップしてポイント消費
        {hasFilter && ` (${rewards.length}/${totalCount}件)`}
      </p>
      {!hydrated ? (
        <p className="empty-state">読み込み中...</p>
      ) : rewards.length === 0 ? (
        <p className="empty-state">
          まだご褒美がありません
          <br />
          ＋ボタンで追加しましょう
        </p>
      ) : (
        rewards.map((r) => {
          const pt = calcRewardPt(r.satisfaction, r.time, r.price, mode);
          const canAfford = points >= pt;
          return (
            <div
              key={r.id}
              className={`action-card reward-card mb-3 ${!canAfford ? "opacity-40" : ""}`}
              onClick={(e) => onComplete(r.id, e.clientX, e.clientY)}
            >
              <div className="flex-1 min-w-0">
                <div className="font-bold text-sm truncate">{r.title}</div>
                {r.desc && (
                  <div className="text-xs mt-0.5 truncate text-muted">
                    {r.desc}
                  </div>
                )}
                {r.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-1">
                    {r.tags.map((t) => (
                      <span key={t} className="reward-tag">
                        {t}
                      </span>
                    ))}
                  </div>
                )}
              </div>
              <span className="pt-badge reward">-{pt}pt</span>
              <button
                className="card-edit-btn"
                onClick={(e) => {
                  e.stopPropagation();
                  onEdit(r.id);
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
