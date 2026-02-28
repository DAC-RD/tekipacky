"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useFilteredItems } from "@/hooks/useFilteredItems";
import { useStore } from "@/hooks/useStore";
import { FloatItem, SortOrder, Tab } from "@/lib/types";
import { calcActionPt, calcRewardPt } from "@/lib/utils";
import PointDisplay from "@/components/PointDisplay";
import DoneAccordion from "@/components/DoneAccordion";
import FilterArea from "@/components/FilterArea";
import ItemModal, { ModalSaveData } from "@/components/ItemModal";
import WelcomeToast from "@/components/WelcomeToast";
import ModeSelector from "@/components/ModeSelector";
import ActionCardList from "@/components/ActionCardList";
import RewardCardList from "@/components/RewardCardList";

interface DashboardProps {
  welcomeMessage?: "new" | "returning" | null;
}

export default function Dashboard({ welcomeMessage }: DashboardProps) {
  // トースト（ウェルカム & エラー共用）— useStore より先に宣言して onError コールバックに渡す
  const [toast, setToast] = useState<{
    message: string;
    isError?: boolean;
  } | null>(
    welcomeMessage === "new"
      ? { message: "アカウントを作成しました" }
      : welcomeMessage === "returning"
        ? { message: "ログインしました" }
        : null,
  );

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
  } = useStore((msg) => setToast({ message: msg, isError: true }));

  // UI state
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
  const [modalKey, setModalKey] = useState(0);
  const [flashKey, setFlashKey] = useState(0);
  const [floats, setFloats] = useState<FloatItem[]>([]);
  const floatIdRef = useRef(0);
  useEffect(() => {
    if (!toast) return;
    if (!toast.isError) window.history.replaceState({}, "", "/");
    const timer = setTimeout(() => setToast(null), 3000);
    return () => clearTimeout(timer);
  }, [toast]);

  // Computed
  const todayEarned = state.doneActions.reduce(
    (sum, d) => sum + d.pt * d.count,
    0,
  );
  const todaySpent = state.doneRewards.reduce(
    (sum, d) => sum + d.pt * d.count,
    0,
  );

  const filteredActions = useFilteredItems(
    state.actions,
    activeFilterTags.action,
    searchQuery.action,
    sortOrder.action,
    (a) => calcActionPt(a.hurdle, a.time, state.mode),
  );
  const filteredRewards = useFilteredItems(
    state.rewards,
    activeFilterTags.reward,
    searchQuery.reward,
    sortOrder.reward,
    (r) => calcRewardPt(r.satisfaction, r.time, r.price, state.mode),
  );

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
    setTimeout(
      () => setFloats((prev) => prev.filter((f) => f.id !== id)),
      1000,
    );
  }

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
    setModalKey((k) => k + 1);
  }

  async function handleModalSave(data: ModalSaveData) {
    try {
      await saveItem(data);
      setModalOpen(false);
    } catch {
      setToast({ message: "保存に失敗しました", isError: true });
    }
  }

  async function handleModalDelete(type: Tab, id: number) {
    try {
      await deleteItem(type, id);
      setModalOpen(false);
    } catch {
      setToast({ message: "削除に失敗しました", isError: true });
    }
  }

  function toggleFilterTag(tab: Tab, tag: string) {
    setActiveFilterTags((prev) => {
      const filters = prev[tab];
      const idx = filters.indexOf(tag);
      return idx >= 0
        ? { ...prev, [tab]: filters.filter((t) => t !== tag) }
        : { ...prev, [tab]: [...filters, tag] };
    });
  }

  const isActionTab = currentTab === "action";
  const allTags = isActionTab ? actionTags : rewardTags;
  const hasFilter =
    activeFilterTags[currentTab].length > 0 ||
    searchQuery[currentTab].trim().length > 0;

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 md:py-10">
      <WelcomeToast toast={toast} />

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-black tracking-tight">
            テキパッキー <span className="text-accent">✦</span>
          </h1>
          <p className="text-xs mt-0.5 text-muted">今日もテキパキいこう</p>
        </div>
        <ModeSelector mode={state.mode} onModeChange={changeMode} />
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
          className="fab fab-sm"
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
        <ActionCardList
          actions={filteredActions}
          mode={state.mode}
          hydrated={hydrated}
          totalCount={state.actions.length}
          hasFilter={hasFilter}
          onComplete={handleCompleteAction}
          onEdit={(id) => openModal("action", id)}
        />
      ) : (
        <RewardCardList
          rewards={filteredRewards}
          mode={state.mode}
          points={state.points}
          hydrated={hydrated}
          totalCount={state.rewards.length}
          hasFilter={hasFilter}
          onComplete={handleCompleteReward}
          onEdit={(id) => openModal("reward", id)}
        />
      )}

      {/* Modal */}
      <ItemModal
        key={modalKey}
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
