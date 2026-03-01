import { test, expect } from "@playwright/test";
import {
  resetTestUser,
  setTestUserPoints,
  cleanTestUserData,
  createTestAction,
  createTestReward,
} from "./db-helpers";

// ─────────────────────────────────────────────────────────────────────────────
// 認証済み API フロー E2E テスト
//
// auth.setup.ts が作成したセッション Cookie を使い、実際の HTTP リクエストで
// 行動完了 → ポイント加算 → 調整 → ご褒美消費 → 残高チェック → 削除後フィルタ
// というユーザーワークフローをエンドツーエンドで検証する。
//
// ※ test.describe.serial: 状態依存のフローのため順序実行する
// ※ DB 操作は Prisma ではなく db-helpers.ts（pg 直接）を使用する
//   （Playwright は Prisma クライアントの ESM をロードできないため）
// ─────────────────────────────────────────────────────────────────────────────

// auth.setup.ts と同じ値（プロジェクト間で共有できないため定数として複製）
const TEST_USER_ID = "e2e-test-user";

// hurdle=2, time=3, NORMAL モード → pt = Math.round(2 * 3 * 1.0) = 6
const ACTION_HURDLE = 2;
const ACTION_TIME = 3;
const EXPECTED_ACTION_PT = 6;

// satisfaction=2, time=2, price=2, NORMAL モード → pt = Math.round(2*2*2*1.0) = 8
const REWARD_SATISFACTION = 2;
const REWARD_TIME = 2;
const REWARD_PRICE = 2;
const EXPECTED_REWARD_PT = 8;

test.describe.serial("認証済み API フロー", () => {
  let actionId: number;
  let rewardId: number;

  test.beforeAll(async () => {
    // ユーザーをリセットしてクリーンな状態から開始（pg 経由）
    await resetTestUser(TEST_USER_ID);
    await cleanTestUserData(TEST_USER_ID);

    actionId = await createTestAction(TEST_USER_ID, {
      title: "E2Eテスト行動",
      hurdle: ACTION_HURDLE,
      time: ACTION_TIME,
    });

    rewardId = await createTestReward(TEST_USER_ID, {
      title: "E2Eテストご褒美",
      satisfaction: REWARD_SATISFACTION,
      time: REWARD_TIME,
      price: REWARD_PRICE,
    });
  });

  test.afterAll(async () => {
    // テストデータをクリーンアップ（ユーザー自体は auth.setup.ts が管理）
    await cleanTestUserData(TEST_USER_ID);
    await resetTestUser(TEST_USER_ID);
  });

  test("GET /api/state → 200 で正しい構造が返ること", async ({ request }) => {
    const res = await request.get("/api/state");
    expect(res.ok()).toBe(true);

    const body = await res.json();
    expect(body).toMatchObject({
      points: 0,
      mode: "normal",
      actions: expect.arrayContaining([
        expect.objectContaining({ id: actionId, title: "E2Eテスト行動" }),
      ]),
      rewards: expect.arrayContaining([
        expect.objectContaining({ id: rewardId, title: "E2Eテストご褒美" }),
      ]),
      doneActions: [],
      doneRewards: [],
    });
  });

  test("POST /api/done/actions → 200 でポイントが加算されること (count=1)", async ({
    request,
  }) => {
    const res = await request.post("/api/done/actions", {
      data: { actionId },
    });
    expect(res.ok()).toBe(true);

    const doneItem = await res.json();
    expect(doneItem.pt).toBe(EXPECTED_ACTION_PT);
    expect(doneItem.count).toBe(1);

    const stateRes = await request.get("/api/state");
    const state = await stateRes.json();
    expect(state.points).toBe(EXPECTED_ACTION_PT);
    expect(state.doneActions).toHaveLength(1);
    expect(state.doneActions[0]).toMatchObject({
      id: actionId,
      pt: EXPECTED_ACTION_PT,
      count: 1,
    });
  });

  test("POST /api/done/actions 2回目 → count=2 に upsert されること", async ({
    request,
  }) => {
    const res = await request.post("/api/done/actions", {
      data: { actionId },
    });
    expect(res.ok()).toBe(true);

    const doneItem = await res.json();
    expect(doneItem.count).toBe(2);

    const stateRes = await request.get("/api/state");
    const state = await stateRes.json();
    expect(state.points).toBe(EXPECTED_ACTION_PT * 2);
    expect(state.doneActions[0].count).toBe(2);
  });

  test("PATCH /api/done/actions/[id] delta=+1 → count・ポイントが増加すること", async ({
    request,
  }) => {
    const before = await (await request.get("/api/state")).json();
    const beforeDone = before.doneActions.find(
      (d: { id: number }) => d.id === actionId,
    );

    const res = await request.patch(`/api/done/actions/${actionId}`, {
      data: { delta: 1 },
    });
    expect(res.ok()).toBe(true);

    const after = await (await request.get("/api/state")).json();
    const afterDone = after.doneActions.find(
      (d: { id: number }) => d.id === actionId,
    );
    expect(afterDone.count).toBe(beforeDone.count + 1);
    expect(after.points).toBe(before.points + beforeDone.pt);
  });

  test("POST /api/done/rewards (ポイント不足) → 400 と insufficient points エラー", async ({
    request,
  }) => {
    // ポイントを強制的に 0 に設定してから試みる（pg 経由）
    await setTestUserPoints(TEST_USER_ID, 0);

    const res = await request.post("/api/done/rewards", {
      data: { rewardId },
    });
    expect(res.status()).toBe(400);

    const body = await res.json();
    expect(body.error).toBe("insufficient points");
  });

  test("POST /api/done/rewards (ポイント十分) → 200 でポイントが減算されること", async ({
    request,
  }) => {
    // 十分なポイントを設定（pg 経由）
    await setTestUserPoints(TEST_USER_ID, 100);

    const res = await request.post("/api/done/rewards", {
      data: { rewardId },
    });
    expect(res.ok()).toBe(true);

    const doneItem = await res.json();
    expect(doneItem.pt).toBe(EXPECTED_REWARD_PT);
    expect(doneItem.count).toBe(1);

    const stateRes = await request.get("/api/state");
    const state = await stateRes.json();
    expect(state.points).toBe(100 - EXPECTED_REWARD_PT);
    expect(state.doneRewards[0]).toMatchObject({
      id: rewardId,
      pt: EXPECTED_REWARD_PT,
      count: 1,
    });
  });

  test("DELETE /api/actions/[id] → actions から消え、doneActions も SetNull+フィルタで除外されること", async ({
    request,
  }) => {
    const deleteRes = await request.delete(`/api/actions/${actionId}`);
    expect(deleteRes.ok()).toBe(true);

    const stateRes = await request.get("/api/state");
    const state = await stateRes.json();

    // actions 配列から削除済みアクションが消えていること
    expect(
      state.actions.find((a: { id: number }) => a.id === actionId),
    ).toBeUndefined();

    // doneActions から SetNull + filter で除外されていること
    expect(
      state.doneActions.find((d: { id: number }) => d.id === actionId),
    ).toBeUndefined();
  });
});
