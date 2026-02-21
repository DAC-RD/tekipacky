"use client";

import { useCallback, useEffect, useState } from "react";
import { INITIAL_STATE, STORAGE_KEY } from "@/lib/constants";
import { AppState } from "@/lib/types";
import { getTodayJST } from "@/lib/utils";

function loadState(): AppState {
  if (typeof window === "undefined") return INITIAL_STATE;
  const today = getTodayJST();
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved) as AppState;
      const state = { ...INITIAL_STATE, ...parsed };
      if (state.lastDate !== today) {
        return { ...state, doneActions: [], doneRewards: [], lastDate: today };
      }
      return state;
    }
  } catch {
    // ignore
  }
  return { ...INITIAL_STATE, lastDate: today };
}

export function useStore() {
  const [state, setState] = useState<AppState>(INITIAL_STATE);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setState(loadState());
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      // ignore
    }
  }, [state, hydrated]);

  const updateState = useCallback((updater: (prev: AppState) => AppState) => {
    setState(updater);
  }, []);

  return { state, updateState, hydrated };
}
