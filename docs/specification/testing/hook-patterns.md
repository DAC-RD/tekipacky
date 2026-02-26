# カスタムフックテストパターン

`@testing-library/react` の `renderHook` と `act` を使用してカスタムフックをテストする。

**実装例:** `web/__tests__/hooks/useStore.test.ts`

---

## セットアップ（fetchのグローバルモック）

```typescript
import { renderHook, act } from "@testing-library/react";
import { vi, describe, it, expect, beforeEach, afterEach } from "vitest";
import { useStore } from "@/hooks/useStore";

// fetch をグローバルにモック
const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

// テスト後にモックをリセット
afterEach(() => {
  vi.clearAllMocks();
});
```

---

## パターン1: 初期状態の確認

```typescript
it("初期状態は points=0, mode=normal", () => {
  // fetch が永遠に pending になるよう設定（hydration を起こさない）
  mockFetch.mockReturnValue(new Promise(() => {}));

  const { result } = renderHook(() => useStore());

  expect(result.current.state.points).toBe(0);
  expect(result.current.state.mode).toBe("normal");
});
```

**ポイント:**
- 初期状態を確認するときは fetch が pending のままにする
- `new Promise(() => {})` は永遠に resolve しない Promise

---

## パターン2: 非同期の hydration テスト

```typescript
function mockFetchJson(data: unknown) {
  mockFetch.mockResolvedValue({
    ok: true,
    json: () => Promise.resolve(data),
  });
}

it("fetch 完了後に state が hydrate される", async () => {
  mockFetchJson(sampleState);
  const { result } = renderHook(() => useStore());

  // マイクロタスクを消化（fetchの解決を待つ）
  await act(async () => {
    await new Promise((r) => setTimeout(r, 0));
  });

  expect(result.current.state.points).toBe(50);
  expect(result.current.hydrated).toBe(true);
});
```

**ポイント:**
- `act()` で React の状態更新をラップする
- `await new Promise((r) => setTimeout(r, 0))` でマイクロタスクを消化

---

## パターン3: 非同期アクションのテスト

```typescript
it("completeAction でポイントが増加する", async () => {
  mockFetchJson(sampleState); // points=50, actions=[{id:1, hurdle:1, time:1}]
  const { result } = renderHook(() => useStore());

  // hydrate を待つ
  await act(async () => {
    await new Promise((r) => setTimeout(r, 0));
  });

  // 次の fetch呼び出しをモック（completeAction内のPOST）
  mockFetch.mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({}) });

  await act(async () => {
    await result.current.completeAction(1); // hurdle=1, time=1, normal: 1pt
  });

  expect(result.current.state.points).toBe(51); // 50 + 1
});
```

**ポイント:**
- `mockResolvedValueOnce()` で次の1回分のfetchだけをモック
- `await act(async () => { ... })` で非同期処理を待つ

---

## パターン4: 楽観的更新の確認

楽観的更新（APIを待たずにUI更新）のテスト方法:

```typescript
it("completeAction は fetch 前にポイントを更新する（楽観的更新）", async () => {
  mockFetchJson(sampleState);
  const { result } = renderHook(() => useStore());
  await act(async () => { await new Promise((r) => setTimeout(r, 0)); });

  // fetch を遅延させる（永遠に pending）
  mockFetch.mockReturnValueOnce(new Promise(() => {}));

  act(() => {
    result.current.completeAction(1); // awaitしない
  });

  // fetch完了前でもポイントが更新されている
  expect(result.current.state.points).toBe(51);
});
```

---

## パターン5: エラーケース・残高不足のテスト

```typescript
it("ポイント不足のとき insufficient=true を返す", async () => {
  mockFetchJson({ ...sampleState, points: 0 }); // ポイント0
  const { result } = renderHook(() => useStore());
  await act(async () => { await new Promise((r) => setTimeout(r, 0)); });

  let response: { pt: number; insufficient: boolean } = { pt: 0, insufficient: false };
  await act(async () => {
    response = await result.current.completeReward(1); // コスト4pt
  });

  expect(response.insufficient).toBe(true);
  expect(result.current.state.points).toBe(0); // 状態は変化しない
});
```

---

## パターン6: API呼び出しのURL・メソッド確認

```typescript
it("PATCH /api/user が正しく呼ばれる", async () => {
  mockFetchJson(sampleState);
  const { result } = renderHook(() => useStore());
  await act(async () => { await new Promise((r) => setTimeout(r, 0)); });

  mockFetch.mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({ ok: true }) });

  act(() => {
    result.current.changeMode("easy");
  });

  expect(mockFetch).toHaveBeenCalledWith(
    "/api/user",
    expect.objectContaining({ method: "PATCH" }),
  );
});
```

**ポイント:**
- `expect.objectContaining()` で部分一致を確認
- URL とメソッドを確認することで、正しいAPIを呼んでいるか検証

---

## パターン7: リスト操作の確認

```typescript
it("deleteItem 後に actions から除外される", async () => {
  mockFetchJson(sampleState); // actions=[{id:1}, {id:2}]
  const { result } = renderHook(() => useStore());
  await act(async () => { await new Promise((r) => setTimeout(r, 0)); });

  mockFetch.mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({ ok: true }) });

  await act(async () => {
    await result.current.deleteItem("action", 1);
  });

  expect(result.current.state.actions.find((a) => a.id === 1)).toBeUndefined();
  expect(result.current.state.actions).toHaveLength(1); // id=2のみ残る
});
```

---

## act() の使い分け

| 処理の種類 | 書き方 |
|---|---|
| 同期的な状態更新 | `act(() => { ... })` |
| 非同期の状態更新（fetch等） | `await act(async () => { await ... })` |
| マイクロタスクの消化 | `await act(async () => { await new Promise(r => setTimeout(r, 0)) })` |

**警告について:**
「An update to TestComponent inside a test was not wrapped in act」という警告は、テスト終了後に非同期の状態更新が発生したことを示す。初期状態を確認する際など、fetchの非同期解決を意図的に待たない場合に出ることがあるが、テスト自体は正しく動作する。
