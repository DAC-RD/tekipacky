"use client";

const SATISFACTION_OPTIONS = [
  { value: 1, label: "小 (×1)" },
  { value: 2, label: "中 (×2)" },
  { value: 3, label: "大 (×3)" },
];

const TIME_OPTIONS = [
  { value: 1, label: "5分以内 (×1)" },
  { value: 2, label: "15分以内 (×2)" },
  { value: 3, label: "30分以内 (×3)" },
  { value: 4, label: "1時間以内 (×4)" },
  { value: 5, label: "3時間以内 (×5)" },
  { value: 6, label: "3時間以上 (×6)" },
];

const PRICE_OPTIONS = [
  { value: 1, label: "0円 (×1)" },
  { value: 2, label: "500円以内 (×2)" },
  { value: 3, label: "1000円以内 (×3)" },
  { value: 4, label: "5000円以内 (×4)" },
  { value: 5, label: "1万円以内 (×5)" },
  { value: 6, label: "1万円以上 (×6)" },
];

interface RewardFormProps {
  satisfaction: number;
  time: number;
  price: number;
  onChange: (field: "satisfaction" | "time" | "price", value: number) => void;
}

export default function RewardForm({
  satisfaction,
  time,
  price,
  onChange,
}: RewardFormProps) {
  return (
    <>
      <div>
        <label className="form-label">満足度</label>
        <div className="option-group">
          {SATISFACTION_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              className={`option-btn ${satisfaction === opt.value ? "selected-reward" : ""}`}
              onClick={() => onChange("satisfaction", opt.value)}
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
              className={`option-btn ${time === opt.value ? "selected-reward" : ""}`}
              onClick={() => onChange("time", opt.value)}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>
      <div>
        <label className="form-label">金額</label>
        <div className="grid grid-cols-3 gap-1.5">
          {PRICE_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              className={`option-btn ${price === opt.value ? "selected-reward" : ""}`}
              onClick={() => onChange("price", opt.value)}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>
    </>
  );
}
