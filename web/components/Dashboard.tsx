"use client";

import { useMemo, useRef, useState } from "react";
import { useStore } from "@/hooks/useStore";
import { FloatItem, Mode, SortOrder, Tab } from "@/lib/types";
import { MODES } from "@/lib/constants";
import { calcActionPt, calcRewardPt } from "@/lib/utils";
import PointDisplay from "@/components/PointDisplay";
import DoneAccordion from "@/components/DoneAccordion";
import FilterArea from "@/components/FilterArea";
import ItemModal, { ModalSaveData } from "@/components/ItemModal";

export default function Dashboard() {
  const {
    state,
    hydrated,
    completeAction,
    completeReward,
    adjustDoneAction,
    adjustDoneReward,
    saveItem,
    deleteItem,
    changeMode,
  } = useStore();

  // UI state (not persisted)
  const [currentTab, setCurrentTab] = useState<Tab>("action");
  const [activeFilterTags, setActiveFilterTags] = useState<
    Record<Tab, string[]>
  >({ action: [], reward: [] });
  const [searchQuery, setSearchQuery] = useState<Record<Tab, string>>({
    action: "",
    reward: "",
  });
  const [sortOrder, setSortOrder] = useState<Record<Tab, SortOrder>>({
    action: "default",
    reward: "default",
  });
  const [modalOpen, setModalOpen] = useState(false);
  const [modalInitialType, setModalInitialType] = useState<Tab>("action");
  const [modalEditId, setModalEditId] = useState<number | null>(null);
  const [flashKey, setFlashKey] = useState(0);
  const [floats, setFloats] = useState<FloatItem[]>([]);
  const [modeTooltipOpen, setModeTooltipOpen] = useState(false);
  const floatIdRef = useRef(0);

  // Computed
  const todayEarned = state.doneActions.reduce(
    (sum, d) => sum + d.pt * d.count,
    0,
  );
  const todaySpent = state.doneRewards.reduce(
    (sum, d) => sum + d.pt * d.count,
    0,
  );

  const filteredActions = useMemo(() => {
    let items = state.actions;
    const filters = activeFilterTags.action;
    const query = searchQuery.action.trim().toLowerCase();
    if (filters.length)
      items = items.filter((a) => filters.every((t) => a.tags.includes(t)));
    if (query)
      items = items.filter(
        (a) =>
          a.title.toLowerCase().includes(query) ||
          a.desc.toLowerCase().includes(query) ||
          a.tags.some((t) => t.toLowerCase().includes(query)),
      );
    if (sortOrder.action === "pt-desc")
      items = [...items].sort(
        (a, b) =>
          calcActionPt(b.hurdle, b.time, state.mode) -
          calcActionPt(a.hurdle, a.time, state.mode),
      );
    if (sortOrder.action === "pt-asc")
      items = [...items].sort(
        (a, b) =>
          calcActionPt(a.hurdle, a.time, state.mode) -
          calcActionPt(b.hurdle, b.time, state.mode),
      );
    return items;
  }, [
    state.actions,
    state.mode,
    activeFilterTags.action,
    searchQuery.action,
    sortOrder.action,
  ]);

  const filteredRewards = useMemo(() => {
    let items = state.rewards;
    const filters = activeFilterTags.reward;
    const query = searchQuery.reward.trim().toLowerCase();
    if (filters.length)
      items = items.filter((r) => filters.every((t) => r.tags.includes(t)));
    if (query)
      items = items.filter(
        (r) =>
          r.title.toLowerCase().includes(query) ||
          r.desc.toLowerCase().includes(query) ||
          r.tags.some((t) => t.toLowerCase().includes(query)),
      );
    if (sortOrder.reward === "pt-desc")
      items = [...items].sort(
        (a, b) =>
          calcRewardPt(b.satisfaction, b.time, b.price, state.mode) -
          calcRewardPt(a.satisfaction, a.time, a.price, state.mode),
      );
    if (sortOrder.reward === "pt-asc")
      items = [...items].sort(
        (a, b) =>
          calcRewardPt(a.satisfaction, a.time, a.price, state.mode) -
          calcRewardPt(b.satisfaction, b.time, b.price, state.mode),
      );
    return items;
  }, [
    state.rewards,
    state.mode,
    activeFilterTags.reward,
    searchQuery.reward,
    sortOrder.reward,
  ]);

  const actionTags = useMemo(
    () => [...new Set(state.actions.flatMap((a) => a.tags))].sort(),
    [state.actions],
  );
  const rewardTags = useMemo(
    () => [...new Set(state.rewards.flatMap((r) => r.tags))].sort(),
    [state.rewards],
  );

  // Float animation
  function showFloat(x: number, y: number, text: string, color: string) {
    const id = ++floatIdRef.current;
    setFloats((prev) => [...prev, { id, x, y, text, color }]);
    setTimeout(() => {
      setFloats((prev) => prev.filter((f) => f.id !== id));
    }, 1000);
  }

  // Actions
  async function handleCompleteAction(
    id: number,
    clientX: number,
    clientY: number,
  ) {
    const pt = await completeAction(id);
    if (pt > 0) {
      setFlashKey((k) => k + 1);
      showFloat(clientX, clientY, `+${pt}pt`, "#ffd166");
    }
  }

  async function handleCompleteReward(
    id: number,
    clientX: number,
    clientY: number,
  ) {
    const { pt, insufficient } = await completeReward(id);
    if (insufficient) {
      showFloat(
        window.innerWidth / 2,
        window.innerHeight / 2,
        "ポイント不足！",
        "#ff5050",
      );
    } else {
      showFloat(clientX, clientY, `-${pt}pt`, "#06d6a0");
    }
  }

  function openModal(type: Tab, editId: number | null = null) {
    setModalInitialType(type);
    setModalEditId(editId);
    setModalOpen(true);
  }

  async function handleModalSave(data: ModalSaveData) {
    await saveItem(data);
    setModalOpen(false);
  }

  async function handleModalDelete(type: Tab, id: number) {
    await deleteItem(type, id);
    setModalOpen(false);
  }

  function toggleFilterTag(tab: Tab, tag: string) {
    setActiveFilterTags((prev) => {
      const filters = prev[tab];
      const idx = filters.indexOf(tag);
      if (idx >= 0) {
        return { ...prev, [tab]: filters.filter((t) => t !== tag) };
      } else {
        return { ...prev, [tab]: [...filters, tag] };
      }
    });
  }

  const isActionTab = currentTab === "action";
  const allTags = isActionTab ? actionTags : rewardTags;
  const hasFilter =
    activeFilterTags[currentTab].length > 0 ||
    searchQuery[currentTab].trim().length > 0;

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 md:py-10">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1
            className="text-xl font-black tracking-tight"
            style={{ letterSpacing: "-0.02em" }}
          >
            テキパッキー <span style={{ color: "var(--accent)" }}>✦</span>
          </h1>
          <p className="text-xs mt-0.5" style={{ color: "var(--muted)" }}>
            今日もテキパキいこう
          </p>
        </div>
        <div className="flex items-center gap-2">
          {/* Mode selector */}
          <div className="relative inline-flex items-center">
            <select
              value={state.mode}
              onChange={(e) => changeMode(e.target.value as Mode)}
              className="text-xs font-bold rounded-xl pl-3 pr-7 py-2 border-none outline-none cursor-pointer appearance-none"
              style={{ background: "var(--surface2)", color: "var(--text)" }}
            >
              <option value="easy">🟢 イージー</option>
              <option value="normal">🟡 ノーマル</option>
              <option value="hard">🔴 ハード</option>
            </select>
            <span
              className="absolute right-2 pointer-events-none text-base"
              style={{ color: "var(--muted)" }}
            >
              ▾
            </span>
          </div>

          {/* Mode help */}
          <div className="relative">
            <button
              onClick={() => setModeTooltipOpen((v) => !v)}
              style={{
                width: 24,
                height: 24,
                borderRadius: "50%",
                background: "var(--surface2)",
                border: "none",
                color: "var(--muted)",
                cursor: "pointer",
                fontSize: "0.8rem",
                fontWeight: 700,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              ?
            </button>
            {modeTooltipOpen && (
              <>
                <div
                  style={{
                    position: "fixed",
                    inset: 0,
                    zIndex: 40,
                  }}
                  onClick={() => setModeTooltipOpen(false)}
                />
                <div
                  style={{
                    position: "absolute",
                    right: 0,
                    top: 32,
                    background: "var(--surface)",
                    border: "1.5px solid var(--surface2)",
                    borderRadius: 14,
                    padding: "14px 16px",
                    width: 240,
                    zIndex: 50,
                    fontSize: "0.82rem",
                    lineHeight: 1.7,
                    boxShadow: "0 8px 32px rgba(0,0,0,0.4)",
                  }}
                >
                  <div
                    className="font-black mb-2"
                    style={{ color: "var(--text)" }}
                  >
                    モードについて
                  </div>
                  <div className="mb-1">
                    🟢 <b>イージー</b>
                  </div>
                  <div style={{ color: "var(--muted)" }} className="mb-2">
                    獲得 ×1.5 ／ 消費 ×0.7
                    <br />
                    ポイントが貯まりやすい
                  </div>
                  <div className="mb-1">
                    🟡 <b>ノーマル</b>
                  </div>
                  <div style={{ color: "var(--muted)" }} className="mb-2">
                    獲得 ×1.0 ／ 消費 ×1.0
                    <br />
                    標準バランス
                  </div>
                  <div className="mb-1">
                    🔴 <b>ハード</b>
                  </div>
                  <div style={{ color: "var(--muted)" }}>
                    獲得 ×0.8 ／ 消費 ×1.5
                    <br />
                    ポイントが貯まりにくい
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Point display */}
      <PointDisplay
        points={state.points}
        mode={state.mode}
        todayEarned={todayEarned}
        todaySpent={todaySpent}
        flashKey={flashKey}
      />

      {/* Today's logs */}
      <DoneAccordion
        type="action"
        items={state.doneActions}
        totalPt={todayEarned}
        onAdjust={adjustDoneAction}
      />
      <DoneAccordion
        type="reward"
        items={state.doneRewards}
        totalPt={todaySpent}
        onAdjust={adjustDoneReward}
      />

      {/* Tab bar + FAB */}
      <div className="flex items-center gap-2 mb-4">
        <div
          className="flex gap-2 flex-1 p-1.5 rounded-2xl"
          style={{ background: "var(--surface)" }}
        >
          <button
            className={`tab-btn ${isActionTab ? "active-action" : ""}`}
            onClick={() => setCurrentTab("action")}
          >
            ⚡ 行動リスト
          </button>
          <button
            className={`tab-btn ${!isActionTab ? "active-reward" : ""}`}
            onClick={() => setCurrentTab("reward")}
          >
            🎁 ご褒美
          </button>
        </div>
        <button
          className="fab"
          style={{ width: 40, height: 40, fontSize: "1.2rem", flexShrink: 0 }}
          onClick={() => openModal(currentTab)}
          title="追加"
        >
          ＋
        </button>
      </div>

      {/* Filter area */}
      <FilterArea
        tab={currentTab}
        allTags={allTags}
        activeFilterTags={activeFilterTags[currentTab]}
        searchQuery={searchQuery[currentTab]}
        sortOrder={sortOrder[currentTab]}
        onSearchChange={(q) =>
          setSearchQuery((prev) => ({ ...prev, [currentTab]: q }))
        }
        onSortChange={(order) =>
          setSortOrder((prev) => ({ ...prev, [currentTab]: order }))
        }
        onToggleTag={(tag) => toggleFilterTag(currentTab, tag)}
      />

      {/* Item lists */}
      {isActionTab ? (
        <div>
          <p className="section-title">
            タップしてポイント獲得
            {hasFilter &&
              ` (${filteredActions.length}/${state.actions.length}件)`}
          </p>
          {!hydrated ? (
            <p
              style={{
                color: "var(--muted)",
                fontSize: "0.9rem",
                textAlign: "center",
                padding: "20px 0",
              }}
            >
              読み込み中...
            </p>
          ) : filteredActions.length === 0 ? (
            <p
              style={{
                color: "var(--muted)",
                fontSize: "0.9rem",
                textAlign: "center",
                padding: "20px 0",
              }}
            >
              まだ行動がありません
              <br />
              ＋ボタンで追加しましょう
            </p>
          ) : (
            filteredActions.map((a) => {
              const pt = calcActionPt(a.hurdle, a.time, state.mode);
              return (
                <div
                  key={a.id}
                  className="action-card mb-3"
                  onClick={(e) =>
                    handleCompleteAction(a.id, e.clientX, e.clientY)
                  }
                >
                  <div className="flex-1 min-w-0">
                    <div className="font-bold text-sm truncate">{a.title}</div>
                    {a.desc && (
                      <div
                        className="text-xs mt-0.5 truncate"
                        style={{ color: "var(--muted)" }}
                      >
                        {a.desc}
                      </div>
                    )}
                    {a.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-1">
                        {a.tags.map((t) => (
                          <span
                            key={t}
                            style={{
                              fontSize: "0.7rem",
                              fontWeight: 700,
                              padding: "2px 7px",
                              borderRadius: 20,
                              background: "rgba(255,107,53,0.15)",
                              color: "var(--accent)",
                            }}
                          >
                            {t}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  <span className="pt-badge">+{pt}pt</span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      openModal("action", a.id);
                    }}
                    style={{
                      background: "var(--surface2)",
                      border: "none",
                      color: "var(--muted)",
                      borderRadius: 8,
                      width: 28,
                      height: 28,
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: "0.85rem",
                      flexShrink: 0,
                    }}
                  >
                    ✎
                  </button>
                </div>
              );
            })
          )}
        </div>
      ) : (
        <div>
          <p className="section-title">
            タップしてポイント消費
            {hasFilter &&
              ` (${filteredRewards.length}/${state.rewards.length}件)`}
          </p>
          {!hydrated ? (
            <p
              style={{
                color: "var(--muted)",
                fontSize: "0.9rem",
                textAlign: "center",
                padding: "20px 0",
              }}
            >
              読み込み中...
            </p>
          ) : filteredRewards.length === 0 ? (
            <p
              style={{
                color: "var(--muted)",
                fontSize: "0.9rem",
                textAlign: "center",
                padding: "20px 0",
              }}
            >
              まだご褒美がありません
              <br />
              ＋ボタンで追加しましょう
            </p>
          ) : (
            filteredRewards.map((r) => {
              const pt = calcRewardPt(
                r.satisfaction,
                r.time,
                r.price,
                state.mode,
              );
              const canAfford = state.points >= pt;
              return (
                <div
                  key={r.id}
                  className={`action-card reward-card mb-3 ${!canAfford ? "opacity-40" : ""}`}
                  onClick={(e) =>
                    handleCompleteReward(r.id, e.clientX, e.clientY)
                  }
                >
                  <div className="flex-1 min-w-0">
                    <div className="font-bold text-sm truncate">{r.title}</div>
                    {r.desc && (
                      <div
                        className="text-xs mt-0.5 truncate"
                        style={{ color: "var(--muted)" }}
                      >
                        {r.desc}
                      </div>
                    )}
                    {r.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-1">
                        {r.tags.map((t) => (
                          <span
                            key={t}
                            style={{
                              fontSize: "0.7rem",
                              fontWeight: 700,
                              padding: "2px 7px",
                              borderRadius: 20,
                              background: "rgba(6,214,160,0.15)",
                              color: "var(--reward)",
                            }}
                          >
                            {t}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  <span className="pt-badge reward">-{pt}pt</span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      openModal("reward", r.id);
                    }}
                    style={{
                      background: "var(--surface2)",
                      border: "none",
                      color: "var(--muted)",
                      borderRadius: 8,
                      width: 28,
                      height: 28,
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: "0.85rem",
                      flexShrink: 0,
                    }}
                  >
                    ✎
                  </button>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* Modal */}
      <ItemModal
        open={modalOpen}
        initialType={modalInitialType}
        editId={modalEditId}
        mode={state.mode}
        actions={state.actions}
        rewards={state.rewards}
        onSave={handleModalSave}
        onDelete={handleModalDelete}
        onClose={() => setModalOpen(false)}
      />

      {/* Float animations */}
      {floats.map((f) => (
        <div
          key={f.id}
          className="float-pt"
          style={{ color: f.color, left: f.x - 20, top: f.y - 10 }}
        >
          {f.text}
        </div>
      ))}
    </div>
  );
}
