"use client";

import { useCallback, useEffect, useState } from "react";
import { INITIAL_STATE } from "@/lib/constants";
import { AppState, Mode, Tab } from "@/lib/types";
import { calcActionPt, calcRewardPt, upsertDoneItem } from "@/lib/utils";
import { ModalSaveData } from "@/components/ItemModal";

const JSON_HEADERS = { "Content-Type": "application/json" };

export function useStore() {
  const [state, setState] = useState<AppState>(INITIAL_STATE);
  const [hydrated, setHydrated] = useState(false);

  // 初回マウント時にAPIから全状態を取得
  useEffect(() => {
    fetch("/api/state")
      .then((r) => r.json())
      .then(setState)
      .catch(console.error)
      .finally(() => setHydrated(true));
  }, []);

  /** 行動を完了する。獲得ptを返す */
  const completeAction = useCallback(
    async (id: number): Promise<number> => {
      const action = state.actions.find((a) => a.id === id);
      if (!action) return 0;
      const pt = calcActionPt(action.hurdle, action.time, state.mode);

      // 楽観的更新
      setState((prev) => ({
        ...prev,
        points: prev.points + pt,
        doneActions: upsertDoneItem(prev.doneActions, id, action.title, pt, 1),
      }));

      fetch("/api/done/actions", {
        method: "POST",
        headers: JSON_HEADERS,
        body: JSON.stringify({ actionId: id, pt }),
      }).catch(console.error);

      return pt;
    },
    [state],
  );

  /** ご褒美を使用する。消費ptと残高不足フラグを返す */
  const completeReward = useCallback(
    async (
      id: number,
    ): Promise<{ pt: number; insufficient: boolean }> => {
      const reward = state.rewards.find((r) => r.id === id);
      if (!reward) return { pt: 0, insufficient: false };
      const pt = calcRewardPt(
        reward.satisfaction,
        reward.time,
        reward.price,
        state.mode,
      );
      if (state.points < pt) return { pt, insufficient: true };

      // 楽観的更新
      setState((prev) => ({
        ...prev,
        points: prev.points - pt,
        doneRewards: upsertDoneItem(
          prev.doneRewards,
          id,
          reward.title,
          pt,
          1,
        ),
      }));

      fetch("/api/done/rewards", {
        method: "POST",
        headers: JSON_HEADERS,
        body: JSON.stringify({ rewardId: id, pt }),
      }).catch(console.error);

      return { pt, insufficient: false };
    },
    [state],
  );

  /** 今日の行動ログのカウントを増減する */
  const adjustDoneAction = useCallback(
    (id: number, delta: number) => {
      const done = state.doneActions.find((d) => d.id === id);
      if (!done) return;

      setState((prev) => ({
        ...prev,
        points: prev.points + done.pt * delta,
        doneActions: upsertDoneItem(
          prev.doneActions,
          id,
          done.title,
          done.pt,
          delta,
        ),
      }));

      fetch(`/api/done/actions/${id}`, {
        method: "PATCH",
        headers: JSON_HEADERS,
        body: JSON.stringify({ delta, pt: done.pt }),
      }).catch(console.error);
    },
    [state],
  );

  /** 今日のご褒美ログのカウントを増減する */
  const adjustDoneReward = useCallback(
    (id: number, delta: number) => {
      const done = state.doneRewards.find((d) => d.id === id);
      if (!done) return;

      setState((prev) => ({
        ...prev,
        points: prev.points - done.pt * delta,
        doneRewards: upsertDoneItem(
          prev.doneRewards,
          id,
          done.title,
          done.pt,
          delta,
        ),
      }));

      fetch(`/api/done/rewards/${id}`, {
        method: "PATCH",
        headers: JSON_HEADERS,
        body: JSON.stringify({ delta, pt: done.pt }),
      }).catch(console.error);
    },
    [state],
  );

  /** 行動・ご褒美を追加または更新する。DBが発行したIDで状態を更新する */
  const saveItem = useCallback(async (data: ModalSaveData): Promise<void> => {
    if (data.type === "action") {
      if (data.id !== null) {
        const res = await fetch(`/api/actions/${data.id}`, {
          method: "PUT",
          headers: JSON_HEADERS,
          body: JSON.stringify(data),
        });
        const updated = await res.json();
        setState((prev) => ({
          ...prev,
          actions: prev.actions.map((a) => (a.id === data.id ? updated : a)),
        }));
      } else {
        const res = await fetch("/api/actions", {
          method: "POST",
          headers: JSON_HEADERS,
          body: JSON.stringify(data),
        });
        const created = await res.json();
        setState((prev) => ({
          ...prev,
          actions: [...prev.actions, created],
        }));
      }
    } else {
      if (data.id !== null) {
        const res = await fetch(`/api/rewards/${data.id}`, {
          method: "PUT",
          headers: JSON_HEADERS,
          body: JSON.stringify(data),
        });
        const updated = await res.json();
        setState((prev) => ({
          ...prev,
          rewards: prev.rewards.map((r) => (r.id === data.id ? updated : r)),
        }));
      } else {
        const res = await fetch("/api/rewards", {
          method: "POST",
          headers: JSON_HEADERS,
          body: JSON.stringify(data),
        });
        const created = await res.json();
        setState((prev) => ({
          ...prev,
          rewards: [...prev.rewards, created],
        }));
      }
    }
  }, []);

  /** 行動・ご褒美を削除する */
  const deleteItem = useCallback(
    async (type: Tab, id: number): Promise<void> => {
      const url =
        type === "action" ? `/api/actions/${id}` : `/api/rewards/${id}`;
      await fetch(url, { method: "DELETE" });

      setState((prev) => ({
        ...prev,
        actions:
          type === "action"
            ? prev.actions.filter((a) => a.id !== id)
            : prev.actions,
        rewards:
          type === "reward"
            ? prev.rewards.filter((r) => r.id !== id)
            : prev.rewards,
      }));
    },
    [],
  );

  /** 難易度モードを変更する */
  const changeMode = useCallback((mode: Mode) => {
    setState((prev) => ({ ...prev, mode }));
    fetch("/api/user", {
      method: "PATCH",
      headers: JSON_HEADERS,
      body: JSON.stringify({ mode }),
    }).catch(console.error);
  }, []);

  return {
    state,
    hydrated,
    completeAction,
    completeReward,
    adjustDoneAction,
    adjustDoneReward,
    saveItem,
    deleteItem,
    changeMode,
  };
}
