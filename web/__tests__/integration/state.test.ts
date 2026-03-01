import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { randomUUID } from "node:crypto";
import { prisma } from "@/lib/prisma";
import { getDateForTimezone } from "@/lib/server/transforms";

// ─────────────────────────────────────────────────────────────────────────────
// 統合テスト: SetNull cascade × 日付フィルタリング × 実 PostgreSQL
// /api/state が依存する DB 整合性を実際のクエリで検証する
// ─────────────────────────────────────────────────────────────────────────────

describe("state フィルタリング (integration)", () => {
  let userId: string;
  let actionId: number;
  let rewardId: number;
  const today = getDateForTimezone("Asia/Tokyo");
  const pastDate = "2024-01-01"; // 明らかに今日ではない日付

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
    await prisma.user.delete({ where: { id: userId } });
  });

  // ─────────────────────────────────────────────
  // SetNull cascade + /api/state フィルタリング
  // /api/state は `.filter((d) => d.actionId !== null)` でフィルタする
  // ─────────────────────────────────────────────
  describe("SetNull cascade + フィルタリング", () => {
    it("Action 削除後、DoneAction.actionId が NULL になること", async () => {
      await prisma.doneAction.create({
        data: {
          userId,
          actionId,
          title: "テスト行動",
          pt: 6,
          count: 1,
          date: today,
        },
      });

      await prisma.action.delete({ where: { id: actionId } });

      const done = await prisma.doneAction.findFirst({ where: { userId } });
      expect(done).not.toBeNull();
      expect(done?.actionId).toBeNull();
    });

    it("actionId=NULL の DoneAction は /api/state のフィルタで除外されること", async () => {
      await prisma.doneAction.create({
        data: {
          userId,
          actionId,
          title: "テスト行動",
          pt: 6,
          count: 1,
          date: today,
        },
      });
      await prisma.action.delete({ where: { id: actionId } });

      const allDones = await prisma.doneAction.findMany({
        where: { userId, date: today },
      });
      // /api/state と同じフィルタを適用
      const filtered = allDones.filter((d) => d.actionId !== null);
      expect(filtered).toHaveLength(0);
    });

    it("actionId=NULL の DoneAction がある場合でも有効な DoneAction は除外されないこと", async () => {
      const action2 = await prisma.action.create({
        data: { userId, title: "行動2", hurdle: 1, time: 1, tags: [] },
      });
      await prisma.doneAction.create({
        data: {
          userId,
          actionId,
          title: "テスト行動",
          pt: 6,
          count: 1,
          date: today,
        },
      });
      await prisma.doneAction.create({
        data: {
          userId,
          actionId: action2.id,
          title: "行動2",
          pt: 1,
          count: 1,
          date: today,
        },
      });

      await prisma.action.delete({ where: { id: actionId } });

      const allDones = await prisma.doneAction.findMany({
        where: { userId, date: today },
      });
      const filtered = allDones.filter((d) => d.actionId !== null);
      expect(filtered).toHaveLength(1);
      expect(filtered[0].actionId).toBe(action2.id);
    });

    it("Reward 削除後、DoneReward.rewardId が NULL になること", async () => {
      await prisma.user.update({ where: { id: userId }, data: { points: 10 } });
      await prisma.doneReward.create({
        data: {
          userId,
          rewardId,
          title: "テストご褒美",
          pt: 4,
          count: 1,
          date: today,
        },
      });

      await prisma.reward.delete({ where: { id: rewardId } });

      const done = await prisma.doneReward.findFirst({ where: { userId } });
      expect(done).not.toBeNull();
      expect(done?.rewardId).toBeNull();
    });

    it("rewardId=NULL の DoneReward は /api/state のフィルタで除外されること", async () => {
      await prisma.user.update({ where: { id: userId }, data: { points: 10 } });
      await prisma.doneReward.create({
        data: {
          userId,
          rewardId,
          title: "テストご褒美",
          pt: 4,
          count: 1,
          date: today,
        },
      });
      await prisma.reward.delete({ where: { id: rewardId } });

      const allDones = await prisma.doneReward.findMany({
        where: { userId, date: today },
      });
      const filtered = allDones.filter((d) => d.rewardId !== null);
      expect(filtered).toHaveLength(0);
    });
  });

  // ─────────────────────────────────────────────
  // 日付フィルタリング
  // /api/state は `where: { userId, date: today }` で当日分のみ返す
  // ─────────────────────────────────────────────
  describe("日付フィルタリング", () => {
    it("過去の DoneAction は今日のフィルタで取得されないこと", async () => {
      await prisma.doneAction.create({
        data: {
          userId,
          actionId,
          title: "過去の行動",
          pt: 6,
          count: 1,
          date: pastDate,
        },
      });

      const todayDones = await prisma.doneAction.findMany({
        where: { userId, date: today },
      });
      expect(todayDones).toHaveLength(0);
    });

    it("今日の DoneAction は今日のフィルタで取得されること", async () => {
      await prisma.doneAction.create({
        data: {
          userId,
          actionId,
          title: "今日の行動",
          pt: 6,
          count: 1,
          date: today,
        },
      });

      const todayDones = await prisma.doneAction.findMany({
        where: { userId, date: today },
      });
      expect(todayDones).toHaveLength(1);
    });

    it("過去と今日の DoneAction が混在しても today のみ返ること", async () => {
      const action2 = await prisma.action.create({
        data: { userId, title: "行動2", hurdle: 1, time: 1, tags: [] },
      });
      await prisma.doneAction.create({
        data: {
          userId,
          actionId,
          title: "過去の行動",
          pt: 6,
          count: 1,
          date: pastDate,
        },
      });
      await prisma.doneAction.create({
        data: {
          userId,
          actionId: action2.id,
          title: "今日の行動",
          pt: 1,
          count: 1,
          date: today,
        },
      });

      const todayDones = await prisma.doneAction.findMany({
        where: { userId, date: today },
      });
      expect(todayDones).toHaveLength(1);
      expect(todayDones[0].title).toBe("今日の行動");
    });

    it("過去の DoneReward は今日のフィルタで取得されないこと", async () => {
      await prisma.user.update({ where: { id: userId }, data: { points: 10 } });
      await prisma.doneReward.create({
        data: {
          userId,
          rewardId,
          title: "過去のご褒美",
          pt: 4,
          count: 1,
          date: pastDate,
        },
      });

      const todayDones = await prisma.doneReward.findMany({
        where: { userId, date: today },
      });
      expect(todayDones).toHaveLength(0);
    });

    it("今日の DoneReward は今日のフィルタで取得されること", async () => {
      await prisma.user.update({ where: { id: userId }, data: { points: 10 } });
      await prisma.doneReward.create({
        data: {
          userId,
          rewardId,
          title: "今日のご褒美",
          pt: 4,
          count: 1,
          date: today,
        },
      });

      const todayDones = await prisma.doneReward.findMany({
        where: { userId, date: today },
      });
      expect(todayDones).toHaveLength(1);
    });
  });
});
