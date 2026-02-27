"use client";

const HURDLE_OPTIONS = [
  { value: 1, label: "低 (×1)" },
  { value: 2, label: "中 (×2)" },
  { value: 3, label: "高 (×3)" },
];

const TIME_OPTIONS = [
  { value: 1, label: "5分以内 (×1)" },
  { value: 2, label: "15分以内 (×2)" },
  { value: 3, label: "30分以内 (×3)" },
  { value: 4, label: "1時間以内 (×4)" },
  { value: 5, label: "3時間以内 (×5)" },
  { value: 6, label: "3時間以上 (×6)" },
];

interface ActionFormProps {
  hurdle: number;
  time: number;
  onChange: (field: "hurdle" | "time", value: number) => void;
}

export default function ActionForm({
  hurdle,
  time,
  onChange,
}: ActionFormProps) {
  return (
    <>
      <div>
        <label className="form-label">ハードル（面倒くささ）</label>
        <div className="option-group">
          {HURDLE_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              className={`option-btn ${hurdle === opt.value ? "selected-action" : ""}`}
              onClick={() => onChange("hurdle", opt.value)}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>
      <div>
        <label className="form-label">かかる時間</label>
        <div className="grid grid-cols-3 gap-1.5">
          {TIME_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              className={`option-btn ${time === opt.value ? "selected-action" : ""}`}
              onClick={() => onChange("time", opt.value)}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>
    </>
  );
}
