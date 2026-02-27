"use client";

import { useEffect, useState } from "react";
import { Action, Mode, Reward, Tab } from "@/lib/types";
import { MODES } from "@/lib/constants";
import { calcActionPt, calcRewardPt } from "@/lib/utils";
import { useTagManager } from "@/hooks/useTagManager";
import ActionForm from "@/components/ActionForm";
import RewardForm from "@/components/RewardForm";

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
  const [hurdle, setHurdle] = useState(editAction?.hurdle ?? 1);
  const [time, setTime] = useState(editAction?.time ?? 1);
  const [satisfaction, setSatisfaction] = useState(
    editReward?.satisfaction ?? 1,
  );
  const [rewardTime, setRewardTime] = useState(editReward?.time ?? 1);
  const [price, setPrice] = useState(editReward?.price ?? 1);

  const isAction = modalType === "action";

  const existingTagPool = isAction
    ? [...new Set(actions.flatMap((a) => a.tags))].sort()
    : [...new Set(rewards.flatMap((r) => r.tags))].sort();

  const {
    tags,
    tagInput,
    setTagInput,
    filteredTagSuggestions,
    addTag,
    removeTag,
    toggleExistingTag,
  } = useTagManager(editItem ? [...editItem.tags] : [], existingTagPool);

  // Scroll lock when modal is open
  useEffect(() => {
    if (!open) return;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  if (!open) return null;

  const modeConfig = MODES[mode];
  const emoji = modeConfig.emoji;

  const previewPt = isAction
    ? calcActionPt(hurdle, time, mode)
    : calcRewardPt(satisfaction, rewardTime, price, mode);

  const modeBadgeText = isAction
    ? `${emoji} 獲得 ×${modeConfig.earnMul}`
    : `${emoji} 消費 ×${modeConfig.spendMul}`;

  const activeColor = isAction ? "var(--accent)" : "var(--reward)";
  const activeBg = isAction ? "rgba(255,107,53,0.15)" : "rgba(6,214,160,0.15)";

  function handleActionChange(field: "hurdle" | "time", value: number) {
    if (field === "hurdle") setHurdle(value);
    else setTime(value);
  }

  function handleRewardChange(
    field: "satisfaction" | "time" | "price",
    value: number,
  ) {
    if (field === "satisfaction") setSatisfaction(value);
    else if (field === "time") setRewardTime(value);
    else setPrice(value);
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

          {/* Action / Reward fields */}
          {isAction ? (
            <ActionForm
              hurdle={hurdle}
              time={time}
              onChange={handleActionChange}
            />
          ) : (
            <RewardForm
              satisfaction={satisfaction}
              time={rewardTime}
              price={price}
              onChange={handleRewardChange}
            />
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
