"use client";

import { useEffect, useRef } from "react";
import { Mode } from "@/lib/types";
import { MODES } from "@/lib/constants";

interface Props {
  points: number;
  mode: Mode;
  todayEarned: number;
  todaySpent: number;
  flashKey: number;
}

export default function PointDisplay({
  points,
  mode,
  todayEarned,
  todaySpent,
  flashKey,
}: Props) {
  const displayRef = useRef<HTMLDivElement>(null);
  const prevFlashKey = useRef(0);

  useEffect(() => {
    if (flashKey > prevFlashKey.current) {
      prevFlashKey.current = flashKey;
      const el = displayRef.current;
      if (el) {
        el.classList.remove("flash");
        void el.offsetWidth;
        el.classList.add("flash");
      }
    }
  }, [flashKey]);

  return (
    <div
      ref={displayRef}
      className="point-display p-5 mb-5 flex items-center justify-between"
    >
      <div className="relative z-10">
        <div className="text-xs font-bold opacity-80 mb-1 uppercase tracking-widest">
          現在のポイント
        </div>
        <div className="flex items-end gap-2">
          <span className="point-number">{points}</span>
          <span className="text-2xl font-black mb-1 opacity-90">pt</span>
        </div>
        <div className="text-xs opacity-70 mt-1">{MODES[mode].label}</div>
      </div>
      <div className="relative z-10 flex gap-4 text-right">
        <div>
          <div className="text-xs font-bold opacity-70 mb-1">今日の獲得</div>
          <div className="font-black text-xl font-space">
            +{todayEarned}
            <span className="text-sm font-bold ml-0.5">pt</span>
          </div>
        </div>
        <div>
          <div className="text-xs font-bold opacity-70 mb-1">今日の消費</div>
          <div className="font-black text-xl font-space">
            -{todaySpent}
            <span className="text-sm font-bold ml-0.5">pt</span>
          </div>
        </div>
      </div>
    </div>
  );
}
