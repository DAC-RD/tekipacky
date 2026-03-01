import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useStore } from "@/hooks/useStore";

// fetch をモック
const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

// API state レスポンスのサンプル
const sampleState = {
  points: 50,
  mode: "normal",
  actions: [
    {
      id: 1,
      title: "朝ごはんを食べる",
      desc: "",
      tags: ["食事"],
      hurdle: 1,
      time: 1,
    },
    { id: 2, title: "散歩する", desc: "", tags: ["運動"], hurdle: 2, time: 2 },
  ],
  rewards: [
    {
      id: 1,
      title: "Netflixを見る",
      desc: "",
      tags: ["動画"],
      satisfaction: 2,
      time: 2,
      price: 1,
    },
  ],
  doneActions: [],
  doneRewards: [],
};

function mockFetchJson(data: unknown) {
  mockFetch.mockResolvedValue({
    ok: true,
    json: () => Promise.resolve(data),
  });
}

describe("useStore", () => {
  beforeEach(() => {
    mockFetch.mockReset();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe("初期状態と hydration", () => {
    it("初期状態は INITIAL_STATE（points=0, mode=normal）", () => {
      mockFetchJson(sampleState);
      const { result } = renderHook(() => useStore());
      expect(result.current.state.points).toBe(0);
      expect(result.current.state.mode).toBe("normal");
    });

    it("hydrated は初期値 false", () => {
      mockFetchJson(sampleState);
      const { result } = renderHook(() => useStore());
      expect(result.current.hydrated).toBe(false);
    });

    it("マウント後に /api/state を fetch する", async () => {
      mockFetchJson(sampleState);
      renderHook(() => useStore());
      await act(async () => {
        await new Promise((r) => setTimeout(r, 0));
      });
      expect(mockFetch).toHaveBeenCalledWith("/api/state");
    });

    it("fetch 完了後に state が hydrate される", async () => {
      mockFetchJson(sampleState);
      const { result } = renderHook(() => useStore());
      await act(async () => {
        await new Promise((r) => setTimeout(r, 0));
      });
      expect(result.current.state.points).toBe(50);
      expect(result.current.state.actions).toHaveLength(2);
    });

    it("fetch 完了後に hydrated が true になる", async () => {
      mockFetchJson(sampleState);
      const { result } = renderHook(() => useStore());
      await act(async () => {
        await new Promise((r) => setTimeout(r, 0));
      });
      expect(result.current.hydrated).toBe(true);
    });
  });

  describe("completeAction", () => {
    it("楽観的更新でポイントが増加する", async () => {
      mockFetchJson(sampleState);
      const { result } = renderHook(() => useStore());
      // hydrate
      await act(async () => {
        await new Promise((r) => setTimeout(r, 0));
      });

      // POST モックをセット
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({}),
      });

      await act(async () => {
        await result.current.completeAction(1); // hurdle=1, time=1, normal: 1pt
      });

      expect(result.current.state.points).toBe(51); // 50 + 1
    });

    it("完了した action が doneActions に追加される", async () => {
      mockFetchJson(sampleState);
      const { result } = renderHook(() => useStore());
      await act(async () => {
        await new Promise((r) => setTimeout(r, 0));
      });

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({}),
      });

      await act(async () => {
        await result.current.completeAction(1);
      });

      expect(result.current.state.doneActions).toHaveLength(1);
      expect(result.current.state.doneActions[0].id).toBe(1);
    });

    it("POST /api/done/actions が呼ばれる", async () => {
      mockFetchJson(sampleState);
      const { result } = renderHook(() => useStore());
      await act(async () => {
        await new Promise((r) => setTimeout(r, 0));
      });

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({}),
      });

      await act(async () => {
        await result.current.completeAction(1);
      });

      expect(mockFetch).toHaveBeenCalledWith(
        "/api/done/actions",
        expect.objectContaining({ method: "POST" }),
      );
    });

    it("存在しない action id では 0 を返す", async () => {
      mockFetchJson(sampleState);
      const { result } = renderHook(() => useStore());
      await act(async () => {
        await new Promise((r) => setTimeout(r, 0));
      });

      let pt: number = -1;
      await act(async () => {
        pt = await result.current.completeAction(999);
      });

      expect(pt).toBe(0);
    });
  });

  describe("completeReward", () => {
    it("ポイントが十分な場合にポイントが減少する", async () => {
      mockFetchJson(sampleState); // points=50
      const { result } = renderHook(() => useStore());
      await act(async () => {
        await new Promise((r) => setTimeout(r, 0));
      });

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({}),
      });

      await act(async () => {
        await result.current.completeReward(1); // satisfaction=2,time=2,price=1,normal: 2*2*1*1.0=4pt
      });

      expect(result.current.state.points).toBe(46); // 50 - 4
    });

    it("ポイント不足のとき insufficient=true を返す", async () => {
      mockFetchJson({ ...sampleState, points: 0 });
      const { result } = renderHook(() => useStore());
      await act(async () => {
        await new Promise((r) => setTimeout(r, 0));
      });

      let result2: { pt: number; insufficient: boolean } = {
        pt: 0,
        insufficient: false,
      };
      await act(async () => {
        result2 = await result.current.completeReward(1);
      });

      expect(result2.insufficient).toBe(true);
    });

    it("ポイント不足のとき state は変化しない", async () => {
      mockFetchJson({ ...sampleState, points: 0 });
      const { result } = renderHook(() => useStore());
      await act(async () => {
        await new Promise((r) => setTimeout(r, 0));
      });

      await act(async () => {
        await result.current.completeReward(1);
      });

      expect(result.current.state.points).toBe(0);
    });

    it("POST /api/done/rewards が呼ばれる", async () => {
      mockFetchJson(sampleState);
      const { result } = renderHook(() => useStore());
      await act(async () => {
        await new Promise((r) => setTimeout(r, 0));
      });

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({}),
      });

      await act(async () => {
        await result.current.completeReward(1);
      });

      expect(mockFetch).toHaveBeenCalledWith(
        "/api/done/rewards",
        expect.objectContaining({ method: "POST" }),
      );
    });
  });

  describe("adjustDoneAction", () => {
    it("PATCH /api/done/actions/{id} が呼ばれる", async () => {
      const stateWithDone = {
        ...sampleState,
        doneActions: [
          {
            id: 1,
            title: "朝ごはんを食べる",
            pt: 1,
            count: 1,
            completedAt: "2024-01-15",
          },
        ],
      };
      mockFetchJson(stateWithDone);
      const { result } = renderHook(() => useStore());
      await act(async () => {
        await new Promise((r) => setTimeout(r, 0));
      });

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ ok: true }),
      });

      act(() => {
        result.current.adjustDoneAction(1, 1);
      });

      expect(mockFetch).toHaveBeenCalledWith(
        "/api/done/actions/1",
        expect.objectContaining({ method: "PATCH" }),
      );
    });

    it("delta=+1 でポイントが増加する", async () => {
      const stateWithDone = {
        ...sampleState,
        doneActions: [
          {
            id: 1,
            title: "朝ごはんを食べる",
            pt: 5,
            count: 1,
            completedAt: "2024-01-15",
          },
        ],
      };
      mockFetchJson(stateWithDone);
      const { result } = renderHook(() => useStore());
      await act(async () => {
        await new Promise((r) => setTimeout(r, 0));
      });

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ ok: true }),
      });

      act(() => {
        result.current.adjustDoneAction(1, 1);
      });

      expect(result.current.state.points).toBe(55); // 50 + 5
    });
  });

  describe("changeMode", () => {
    it("楽観的更新でモードが変更される", async () => {
      mockFetchJson(sampleState);
      const { result } = renderHook(() => useStore());
      await act(async () => {
        await new Promise((r) => setTimeout(r, 0));
      });

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ ok: true }),
      });

      act(() => {
        result.current.changeMode("hard");
      });

      expect(result.current.state.mode).toBe("hard");
    });

    it("PATCH /api/user が呼ばれる", async () => {
      mockFetchJson(sampleState);
      const { result } = renderHook(() => useStore());
      await act(async () => {
        await new Promise((r) => setTimeout(r, 0));
      });

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ ok: true }),
      });

      act(() => {
        result.current.changeMode("easy");
      });

      expect(mockFetch).toHaveBeenCalledWith(
        "/api/user",
        expect.objectContaining({ method: "PATCH" }),
      );
    });
  });

  describe("deleteItem", () => {
    it("action削除後に actions から除外される", async () => {
      mockFetchJson(sampleState);
      const { result } = renderHook(() => useStore());
      await act(async () => {
        await new Promise((r) => setTimeout(r, 0));
      });

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ ok: true }),
      });

      await act(async () => {
        await result.current.deleteItem("action", 1);
      });

      expect(
        result.current.state.actions.find((a) => a.id === 1),
      ).toBeUndefined();
    });

    it("API が ok=false を返すと throw される", async () => {
      mockFetchJson(sampleState);
      const { result } = renderHook(() => useStore());
      await act(async () => {
        await new Promise((r) => setTimeout(r, 0));
      });

      mockFetch.mockResolvedValueOnce({ ok: false, status: 404 });

      await expect(
        act(async () => {
          await result.current.deleteItem("action", 1);
        }),
      ).rejects.toThrow("削除に失敗しました");
    });

    it("DELETE /api/actions/{id} が呼ばれる", async () => {
      mockFetchJson(sampleState);
      const { result } = renderHook(() => useStore());
      await act(async () => {
        await new Promise((r) => setTimeout(r, 0));
      });

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ ok: true }),
      });

      await act(async () => {
        await result.current.deleteItem("action", 1);
      });

      expect(mockFetch).toHaveBeenCalledWith(
        "/api/actions/1",
        expect.objectContaining({ method: "DELETE" }),
      );
    });
  });

  describe("ロールバック（API失敗時）", () => {
    it("completeAction: API 500のとき楽観的更新がロールバックされonErrorが呼ばれる", async () => {
      mockFetchJson(sampleState);
      const onError = vi.fn();
      const { result } = renderHook(() => useStore(onError));
      await act(async () => {
        await new Promise((r) => setTimeout(r, 0));
      });

      mockFetch.mockResolvedValueOnce({ ok: false, status: 500 });

      await act(async () => {
        await result.current.completeAction(1);
        await new Promise((r) => setTimeout(r, 0));
      });

      expect(result.current.state.points).toBe(50); // ロールバック済み
      expect(result.current.state.doneActions).toHaveLength(0); // ロールバック済み
      expect(onError).toHaveBeenCalledWith("行動の記録に失敗しました");
    });

    it("completeReward: API失敗のとき楽観的更新がロールバックされonErrorが呼ばれる", async () => {
      mockFetchJson(sampleState); // points=50
      const onError = vi.fn();
      const { result } = renderHook(() => useStore(onError));
      await act(async () => {
        await new Promise((r) => setTimeout(r, 0));
      });

      mockFetch.mockResolvedValueOnce({ ok: false, status: 500 });

      await act(async () => {
        await result.current.completeReward(1);
        await new Promise((r) => setTimeout(r, 0));
      });

      expect(result.current.state.points).toBe(50); // ロールバック済み
      expect(result.current.state.doneRewards).toHaveLength(0); // ロールバック済み
      expect(onError).toHaveBeenCalledWith("ご褒美の記録に失敗しました");
    });

    it("adjustDoneAction: API失敗のとき楽観的更新がロールバックされonErrorが呼ばれる", async () => {
      const stateWithDone = {
        ...sampleState,
        doneActions: [
          {
            id: 1,
            title: "朝ごはんを食べる",
            pt: 5,
            count: 2,
            completedAt: "2024-01-15",
          },
        ],
      };
      mockFetchJson(stateWithDone);
      const onError = vi.fn();
      const { result } = renderHook(() => useStore(onError));
      await act(async () => {
        await new Promise((r) => setTimeout(r, 0));
      });

      mockFetch.mockResolvedValueOnce({ ok: false, status: 500 });

      await act(async () => {
        result.current.adjustDoneAction(1, 1);
        await new Promise((r) => setTimeout(r, 0));
      });

      expect(result.current.state.points).toBe(50); // ロールバック済み
      expect(result.current.state.doneActions[0].count).toBe(2); // ロールバック済み
      expect(onError).toHaveBeenCalledWith("記録の更新に失敗しました");
    });

    it("adjustDoneAction: delta=-1でアイテム削除後にAPI失敗したらアイテムが復元される", async () => {
      const stateWithDone = {
        ...sampleState,
        doneActions: [
          {
            id: 1,
            title: "朝ごはんを食べる",
            pt: 5,
            count: 1,
            completedAt: "2024-01-15",
          },
        ],
      };
      mockFetchJson(stateWithDone);
      const onError = vi.fn();
      const { result } = renderHook(() => useStore(onError));
      await act(async () => {
        await new Promise((r) => setTimeout(r, 0));
      });

      mockFetch.mockResolvedValueOnce({ ok: false, status: 500 });

      await act(async () => {
        result.current.adjustDoneAction(1, -1);
        await new Promise((r) => setTimeout(r, 0));
      });

      expect(result.current.state.doneActions).toHaveLength(1); // 復元済み
      expect(result.current.state.doneActions[0].count).toBe(1);
      expect(result.current.state.points).toBe(50); // ロールバック済み
    });

    it("adjustDoneReward: API失敗のとき楽観的更新がロールバックされonErrorが呼ばれる", async () => {
      const stateWithDone = {
        ...sampleState,
        doneRewards: [
          {
            id: 1,
            title: "Netflixを見る",
            pt: 4,
            count: 1,
            completedAt: "2024-01-15",
          },
        ],
      };
      mockFetchJson(stateWithDone);
      const onError = vi.fn();
      const { result } = renderHook(() => useStore(onError));
      await act(async () => {
        await new Promise((r) => setTimeout(r, 0));
      });

      mockFetch.mockResolvedValueOnce({ ok: false, status: 500 });

      await act(async () => {
        result.current.adjustDoneReward(1, 1);
        await new Promise((r) => setTimeout(r, 0));
      });

      expect(result.current.state.points).toBe(50); // ロールバック済み
      expect(result.current.state.doneRewards[0].count).toBe(1); // ロールバック済み
      expect(onError).toHaveBeenCalledWith("記録の更新に失敗しました");
    });

    it("changeMode: API失敗のときモードがロールバックされonErrorが呼ばれる", async () => {
      mockFetchJson(sampleState); // mode=normal
      const onError = vi.fn();
      const { result } = renderHook(() => useStore(onError));
      await act(async () => {
        await new Promise((r) => setTimeout(r, 0));
      });

      mockFetch.mockResolvedValueOnce({ ok: false, status: 500 });

      await act(async () => {
        result.current.changeMode("hard");
        await new Promise((r) => setTimeout(r, 0));
      });

      expect(result.current.state.mode).toBe("normal"); // ロールバック済み
      expect(onError).toHaveBeenCalledWith("モードの変更に失敗しました");
    });
  });

  describe("saveItem", () => {
    it("新規アクション作成で POST /api/actions が呼ばれる", async () => {
      mockFetchJson(sampleState);
      const { result } = renderHook(() => useStore());
      await act(async () => {
        await new Promise((r) => setTimeout(r, 0));
      });

      const newAction = {
        id: 99,
        title: "新しい行動",
        desc: "",
        tags: [],
        hurdle: 1,
        time: 1,
      };
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(newAction),
      });

      await act(async () => {
        await result.current.saveItem({
          type: "action",
          id: null,
          title: "新しい行動",
          desc: "",
          tags: [],
          hurdle: 1,
          time: 1,
        });
      });

      expect(mockFetch).toHaveBeenCalledWith(
        "/api/actions",
        expect.objectContaining({ method: "POST" }),
      );
    });

    it("既存アクション更新で PUT /api/actions/{id} が呼ばれる", async () => {
      mockFetchJson(sampleState);
      const { result } = renderHook(() => useStore());
      await act(async () => {
        await new Promise((r) => setTimeout(r, 0));
      });

      const updatedAction = {
        id: 1,
        title: "更新された行動",
        desc: "",
        tags: [],
        hurdle: 2,
        time: 2,
      };
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(updatedAction),
      });

      await act(async () => {
        await result.current.saveItem({
          type: "action",
          id: 1,
          title: "更新された行動",
          desc: "",
          tags: [],
          hurdle: 2,
          time: 2,
        });
      });

      expect(mockFetch).toHaveBeenCalledWith(
        "/api/actions/1",
        expect.objectContaining({ method: "PUT" }),
      );
    });

    it("API が ok=false を返すと throw される", async () => {
      mockFetchJson(sampleState);
      const { result } = renderHook(() => useStore());
      await act(async () => {
        await new Promise((r) => setTimeout(r, 0));
      });

      mockFetch.mockResolvedValueOnce({ ok: false, status: 500 });

      await expect(
        act(async () => {
          await result.current.saveItem({
            type: "action",
            id: null,
            title: "失敗する行動",
            desc: "",
            tags: [],
            hurdle: 1,
            time: 1,
          });
        }),
      ).rejects.toThrow("保存に失敗しました");
    });

    it("新規アクション保存後に actions に追加される", async () => {
      mockFetchJson(sampleState);
      const { result } = renderHook(() => useStore());
      await act(async () => {
        await new Promise((r) => setTimeout(r, 0));
      });

      const newAction = {
        id: 99,
        title: "新しい行動",
        desc: "",
        tags: [],
        hurdle: 1,
        time: 1,
      };
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(newAction),
      });

      await act(async () => {
        await result.current.saveItem({
          type: "action",
          id: null,
          title: "新しい行動",
          desc: "",
          tags: [],
          hurdle: 1,
          time: 1,
        });
      });

      expect(result.current.state.actions).toHaveLength(3); // 元2 + 新規1
      expect(
        result.current.state.actions.find((a) => a.id === 99),
      ).toBeDefined();
    });
  });
});
