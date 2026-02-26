"use client";

import { useEffect, useState } from "react";
import { Action, Mode, Reward, Tab } from "@/lib/types";
import { MODES } from "@/lib/constants";
import { calcActionPt, calcRewardPt } from "@/lib/utils";

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

const SATISFACTION_OPTIONS = [
  { value: 1, label: "小 (×1)" },
  { value: 2, label: "中 (×2)" },
  { value: 3, label: "大 (×3)" },
];

const PRICE_OPTIONS = [
  { value: 1, label: "0円 (×1)" },
  { value: 2, label: "500円以内 (×2)" },
  { value: 3, label: "1000円以内 (×3)" },
  { value: 4, label: "5000円以内 (×4)" },
  { value: 5, label: "1万円以内 (×5)" },
  { value: 6, label: "1万円以上 (×6)" },
];

export interface ModalSaveData {
  type: Tab;
  id: number | null;
  title: string;
  desc: string;
  tags: string[];
  hurdle?: number;
  time?: number;
  satisfaction?: number;
  rewardTime?: number;
  price?: number;
}

interface Props {
  open: boolean;
  initialType: Tab;
  editId: number | null;
  mode: Mode;
  actions: Action[];
  rewards: Reward[];
  onSave: (data: ModalSaveData) => void;
  onDelete: (type: Tab, id: number) => void;
  onClose: () => void;
}

function OptionButton({
  label,
  selected,
  onClick,
  variant,
}: {
  label: string;
  selected: boolean;
  onClick: () => void;
  variant: "action" | "reward";
}) {
  const selectedClass =
    variant === "action" ? "selected-action" : "selected-reward";
  return (
    <button
      type="button"
      className={`option-btn ${selected ? selectedClass : ""}`}
      onClick={onClick}
    >
      {label}
    </button>
  );
}

export default function ItemModal({
  open,
  initialType,
  editId,
  mode,
  actions,
  rewards,
  onSave,
  onDelete,
  onClose,
}: Props) {
  const isEditMode = editId !== null;

  const editAction =
    initialType === "action" && editId !== null
      ? actions.find((a) => a.id === editId)
      : undefined;
  const editReward =
    initialType === "reward" && editId !== null
      ? rewards.find((r) => r.id === editId)
      : undefined;
  const editItem = editAction ?? editReward;

  const [modalType, setModalType] = useState<Tab>(initialType);
  const [title, setTitle] = useState(editItem?.title ?? "");
  const [desc, setDesc] = useState(editItem?.desc ?? "");
  const [tags, setTags] = useState<string[]>(
    editItem ? [...editItem.tags] : [],
  );
  const [tagInput, setTagInput] = useState("");
  const [hurdle, setHurdle] = useState(editAction?.hurdle ?? 1);
  const [time, setTime] = useState(editAction?.time ?? 1);
  const [satisfaction, setSatisfaction] = useState(
    editReward?.satisfaction ?? 1,
  );
  const [rewardTime, setRewardTime] = useState(editReward?.time ?? 1);
  const [price, setPrice] = useState(editReward?.price ?? 1);

  // Scroll lock when modal is open
  useEffect(() => {
    if (!open) return;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  if (!open) return null;

  const isAction = modalType === "action";
  const modeConfig = MODES[mode];
  const emoji = modeConfig.emoji;

  const previewPt = isAction
    ? calcActionPt(hurdle, time, mode)
    : calcRewardPt(satisfaction, rewardTime, price, mode);

  const modeBadgeText = isAction
    ? `${emoji} 獲得 ×${modeConfig.earnMul}`
    : `${emoji} 消費 ×${modeConfig.spendMul}`;

  const existingTagPool = isAction
    ? [...new Set(actions.flatMap((a) => a.tags))].sort()
    : [...new Set(rewards.flatMap((r) => r.tags))].sort();

  const filteredTagSuggestions = tagInput
    ? existingTagPool.filter((t) =>
        t.toLowerCase().includes(tagInput.toLowerCase()),
      )
    : existingTagPool;

  function addTag(tag: string) {
    if (!tag.trim() || tags.includes(tag.trim())) return;
    setTags((prev) => [...prev, tag.trim()]);
  }

  function removeTag(tag: string) {
    setTags((prev) => prev.filter((t) => t !== tag));
  }

  function toggleExistingTag(tag: string) {
    if (tags.includes(tag)) {
      removeTag(tag);
    } else {
      addTag(tag);
    }
  }

  function handleTagKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") {
      e.preventDefault();
      addTag(tagInput);
      setTagInput("");
    }
  }

  function handleAddTagBtn() {
    addTag(tagInput);
    setTagInput("");
  }

  function handleSave() {
    if (!title.trim()) return;
    onSave({
      type: modalType,
      id: editId,
      title: title.trim(),
      desc: desc.trim(),
      tags,
      hurdle,
      time: isAction ? time : rewardTime,
      satisfaction,
      rewardTime,
      price,
    });
  }

  function handleDelete() {
    if (editId === null) return;
    if (!confirm("本当に削除しますか？")) return;
    onDelete(modalType, editId);
  }

  const activeColor = isAction ? "var(--accent)" : "var(--reward)";
  const activeBg = isAction ? "rgba(255,107,53,0.15)" : "rgba(6,214,160,0.15)";

  return (
    <div
      className="modal-overlay"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="modal-box">
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-black">
            {isEditMode
              ? isAction
                ? "行動を編集"
                : "ご褒美を編集"
              : isAction
                ? "行動を追加"
                : "ご褒美を追加"}
          </h2>
          <div className="flex items-center gap-2">
            <span
              className="mode-badge"
              style={{ background: "var(--surface2)", color: "var(--accent2)" }}
            >
              {modeBadgeText}
            </span>
            <button
              onClick={onClose}
              style={{
                color: "var(--muted)",
                background: "var(--surface2)",
                border: "none",
                width: 32,
                height: 32,
                borderRadius: "50%",
                cursor: "pointer",
                fontSize: "1.1rem",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              ✕
            </button>
          </div>
        </div>

        {/* Type switcher (add mode only) */}
        {!isEditMode && (
          <div
            className="flex gap-2 mb-5 p-1 rounded-xl"
            style={{ background: "var(--surface2)" }}
          >
            <button
              className={`tab-btn ${isAction ? "active-action" : ""}`}
              style={{ padding: "8px", fontSize: "0.85rem" }}
              onClick={() => setModalType("action")}
            >
              ⚡ 行動
            </button>
            <button
              className={`tab-btn ${!isAction ? "active-reward" : ""}`}
              style={{ padding: "8px", fontSize: "0.85rem" }}
              onClick={() => setModalType("reward")}
            >
              🎁 ご褒美
            </button>
          </div>
        )}

        <div className="flex flex-col gap-4">
          {/* Title */}
          <div>
            <label className="form-label">タイトル</label>
            <input
              type="text"
              className="form-input"
              placeholder={
                isAction ? "例: 朝ごはんを食べる" : "例: Netflixを1話見る"
              }
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>

          {/* Description */}
          <div>
            <label className="form-label">説明（任意）</label>
            <input
              type="text"
              className="form-input"
              placeholder="メモや詳細"
              value={desc}
              onChange={(e) => setDesc(e.target.value)}
            />
          </div>

          {/* Tags */}
          <div>
            <label className="form-label">タグ（任意）</label>

            {/* Existing tag suggestions */}
            {filteredTagSuggestions.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-2">
                {filteredTagSuggestions.map((tag) => {
                  const selected = tags.includes(tag);
                  return (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => toggleExistingTag(tag)}
                      style={{
                        fontSize: "0.78rem",
                        fontWeight: 700,
                        padding: "4px 12px",
                        borderRadius: 20,
                        cursor: "pointer",
                        transition: "all 0.15s",
                        border: `1.5px solid ${selected ? activeColor : "var(--surface2)"}`,
                        background: selected ? activeBg : "transparent",
                        color: selected ? activeColor : "var(--muted)",
                      }}
                    >
                      {tag}
                      {selected ? " ✕" : " +"}
                    </button>
                  );
                })}
              </div>
            )}

            {/* New tag input */}
            <div className="flex gap-2 mb-2">
              <input
                type="text"
                className="form-input"
                placeholder="新しいタグを入力してEnter"
                style={{ flex: 1 }}
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={handleTagKeyDown}
              />
              <button
                type="button"
                onClick={handleAddTagBtn}
                style={{
                  padding: "0 16px",
                  borderRadius: 10,
                  border: "none",
                  background: "var(--surface2)",
                  color: "var(--muted)",
                  cursor: "pointer",
                  fontSize: "1.1rem",
                  flexShrink: 0,
                }}
              >
                ＋
              </button>
            </div>

            {/* Selected tags */}
            {tags.length > 0 && (
              <div className="flex flex-wrap gap-2">
                <p
                  style={{
                    fontSize: "0.75rem",
                    color: "var(--muted)",
                    width: "100%",
                    marginBottom: 4,
                  }}
                >
                  設定済みタグ
                </p>
                {tags.map((tag) => (
                  <span
                    key={tag}
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 5,
                      background: activeBg,
                      border: `1.5px solid ${activeColor}`,
                      borderRadius: 20,
                      padding: "4px 10px",
                      fontSize: "0.8rem",
                      fontWeight: 700,
                      color: activeColor,
                    }}
                  >
                    {tag}
                    <button
                      type="button"
                      onClick={() => removeTag(tag)}
                      style={{
                        background: "none",
                        border: "none",
                        color: activeColor,
                        cursor: "pointer",
                        fontSize: "0.85rem",
                        padding: 0,
                        lineHeight: 1,
                        display: "flex",
                        alignItems: "center",
                        opacity: 0.7,
                      }}
                    >
                      ✕
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Action fields */}
          {isAction && (
            <>
              <div>
                <label className="form-label">ハードル（面倒くささ）</label>
                <div className="option-group">
                  {HURDLE_OPTIONS.map((opt) => (
                    <OptionButton
                      key={opt.value}
                      label={opt.label}
                      selected={hurdle === opt.value}
                      onClick={() => setHurdle(opt.value)}
                      variant="action"
                    />
                  ))}
                </div>
              </div>
              <div>
                <label className="form-label">かかる時間</label>
                <div
                  className="option-group"
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(3, 1fr)",
                    gap: 6,
                  }}
                >
                  {TIME_OPTIONS.map((opt) => (
                    <OptionButton
                      key={opt.value}
                      label={opt.label}
                      selected={time === opt.value}
                      onClick={() => setTime(opt.value)}
                      variant="action"
                    />
                  ))}
                </div>
              </div>
            </>
          )}

          {/* Reward fields */}
          {!isAction && (
            <>
              <div>
                <label className="form-label">満足度</label>
                <div className="option-group">
                  {SATISFACTION_OPTIONS.map((opt) => (
                    <OptionButton
                      key={opt.value}
                      label={opt.label}
                      selected={satisfaction === opt.value}
                      onClick={() => setSatisfaction(opt.value)}
                      variant="reward"
                    />
                  ))}
                </div>
              </div>
              <div>
                <label className="form-label">かかる時間</label>
                <div
                  className="option-group"
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(3, 1fr)",
                    gap: 6,
                  }}
                >
                  {TIME_OPTIONS.map((opt) => (
                    <OptionButton
                      key={opt.value}
                      label={opt.label}
                      selected={rewardTime === opt.value}
                      onClick={() => setRewardTime(opt.value)}
                      variant="reward"
                    />
                  ))}
                </div>
              </div>
              <div>
                <label className="form-label">金額</label>
                <div
                  className="option-group"
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(3, 1fr)",
                    gap: 6,
                  }}
                >
                  {PRICE_OPTIONS.map((opt) => (
                    <OptionButton
                      key={opt.value}
                      label={opt.label}
                      selected={price === opt.value}
                      onClick={() => setPrice(opt.value)}
                      variant="reward"
                    />
                  ))}
                </div>
              </div>
            </>
          )}

          {/* Point preview */}
          <div className={`pt-preview ${!isAction ? "reward-preview" : ""}`}>
            <span>{previewPt}</span>
            {isAction ? " pt 獲得" : " pt 消費"}
          </div>

          {/* Buttons */}
          <div className="flex gap-3 mt-1">
            {isEditMode && (
              <button
                type="button"
                onClick={handleDelete}
                className="px-4 py-3 rounded-xl font-bold text-sm flex-1"
                style={{
                  background: "rgba(255,80,80,0.1)",
                  color: "#ff5050",
                  border: "none",
                  cursor: "pointer",
                }}
              >
                削除
              </button>
            )}
            <button
              type="button"
              onClick={handleSave}
              className="px-4 py-3 rounded-xl font-bold text-sm flex-1"
              style={{
                background: "var(--accent)",
                color: "white",
                border: "none",
                cursor: "pointer",
              }}
            >
              {isEditMode ? "保存する" : "追加する"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
