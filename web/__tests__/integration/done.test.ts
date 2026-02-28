import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { randomUUID } from "node:crypto";
import { prisma } from "@/lib/prisma";
import {
  upsertDoneAction,
  adjustDoneAction,
  upsertDoneReward,
  adjustDoneReward,
} from "@/lib/done";

// ─────────────────────────────────────────────────────────────────────────────
// 統合テスト: lib/done.ts × 実PostgreSQL
// ※ Prismaモックでは検証できないトランザクション・制約の実挙動を確認する
// ─────────────────────────────────────────────────────────────────────────────

describe("done.ts (integration)", () => {
  let userId: string;
  let actionId: number;
  let rewardId: number;

  beforeEach(async () => {
    userId = randomUUID();
    await prisma.user.create({
      data: { id: userId, timezone: "Asia/Tokyo", mode: "NORMAL", points: 0 },
    });
    const action = await prisma.action.create({
      data: { userId, title: "テスト行動", hurdle: 2, time: 3, tags: [] },
    });
    actionId = action.id;
    const reward = await prisma.reward.create({
      data: {
        userId,
        title: "テストご褒美",
        satisfaction: 2,
        time: 2,
        price: 2,
        tags: [],
      },
    });
    rewardId = reward.id;
  });

  afterEach(async () => {
    // User の CASCADE DELETE で関連レコードも全削除
    await prisma.user.delete({ where: { id: userId } });
  });

  // ─────────────────────────────────────────────
  // upsertDoneAction
  // ─────────────────────────────────────────────
  describe("upsertDoneAction", () => {
    it("DoneAction を新規作成し User.points を加算する", async () => {
      await upsertDoneAction(userId, actionId, "2024-01-15", "テスト行動", 6);

      const user = await prisma.user.findUniqueOrThrow({
        where: { id: userId },
      });
      expect(user.points).toBe(6);

      const done = await prisma.doneAction.findFirst({ where: { userId } });
      expect(done?.count).toBe(1);
      expect(done?.pt).toBe(6);
    });

    it("同日同行動の2回目は count を +1 して points を加算する", async () => {
      await upsertDoneAction(userId, actionId, "2024-01-15", "テスト行動", 6);
      await upsertDoneAction(userId, actionId, "2024-01-15", "テスト行動", 6);

      const user = await prisma.user.findUniqueOrThrow({
        where: { id: userId },
      });
      expect(user.points).toBe(12);

      const records = await prisma.doneAction.findMany({ where: { userId } });
      expect(records).toHaveLength(1); // @@unique でレコードは1件のみ
      expect(records[0].count).toBe(2);
    });
  });

  // ─────────────────────────────────────────────
  // adjustDoneAction
  // ─────────────────────────────────────────────
  describe("adjustDoneAction", () => {
    it("delta=+1 で count と points を増加させる", async () => {
      await upsertDoneAction(userId, actionId, "2024-01-15", "テスト行動", 6);
      await adjustDoneAction(userId, actionId, "2024-01-15", 1);

      const user = await prisma.user.findUniqueOrThrow({
        where: { id: userId },
      });
      expect(user.points).toBe(12); // 6（initial）+ 6（adjust）

      const done = await prisma.doneAction.findFirst({ where: { userId } });
      expect(done?.count).toBe(2);
    });

    it("delta=-1 で count=0 になるとレコードを削除し points を減算する", async () => {
      await upsertDoneAction(userId, actionId, "2024-01-15", "テスト行動", 6);
      await adjustDoneAction(userId, actionId, "2024-01-15", -1);

      const user = await prisma.user.findUniqueOrThrow({
        where: { id: userId },
      });
      expect(user.points).toBe(0); // 6 + (-6) = 0

      const done = await prisma.doneAction.findFirst({ where: { userId } });
      expect(done).toBeNull(); // レコード削除済み
    });
  });

  // ─────────────────────────────────────────────
  // upsertDoneReward / adjustDoneReward
  // ─────────────────────────────────────────────
  describe("upsertDoneReward", () => {
    it("DoneReward を新規作成し User.points を減算する", async () => {
      await prisma.user.update({
        where: { id: userId },
        data: { points: 10 },
      });
      await upsertDoneReward(userId, rewardId, "2024-01-15", "テストご褒美", 4);

      const user = await prisma.user.findUniqueOrThrow({
        where: { id: userId },
      });
      expect(user.points).toBe(6); // 10 - 4

      const done = await prisma.doneReward.findFirst({ where: { userId } });
      expect(done?.count).toBe(1);
      expect(done?.pt).toBe(4);
    });
  });

  describe("adjustDoneReward", () => {
    it("delta=-1 で count=0 になるとレコードを削除し points を復元する", async () => {
      await prisma.user.update({
        where: { id: userId },
        data: { points: 10 },
      });
      await upsertDoneReward(userId, rewardId, "2024-01-15", "テストご褒美", 4);
      await adjustDoneReward(userId, rewardId, "2024-01-15", -1);

      const user = await prisma.user.findUniqueOrThrow({
        where: { id: userId },
      });
      expect(user.points).toBe(10); // 10 - 4 + 4 = 10（ご褒美取り消しでポイント返還）

      const done = await prisma.doneReward.findFirst({ where: { userId } });
      expect(done).toBeNull(); // レコード削除済み
    });
  });
});
