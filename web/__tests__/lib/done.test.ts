import { describe, it, expect, vi, beforeEach } from "vitest";
import type {
  DoneActionModel,
  DoneRewardModel,
} from "@/lib/generated/prisma/models";

vi.mock("@/lib/prisma", () => {
  const $transaction = vi.fn();
  const prismaMock = {
    user: { update: vi.fn() },
    doneAction: { findUnique: vi.fn(), delete: vi.fn(), update: vi.fn() },
    doneReward: { findUnique: vi.fn(), delete: vi.fn(), update: vi.fn() },
    $transaction,
  };
  $transaction.mockImplementation((fn: (tx: unknown) => Promise<unknown>) =>
    fn(prismaMock),
  );
  return { prisma: prismaMock };
});

import { prisma } from "@/lib/prisma";
import { adjustDoneAction, adjustDoneReward } from "@/lib/done";

const mockPrisma = vi.mocked(prisma, true);
const USER_ID = "test-user";
const TODAY = "2024-01-15";

const existingDoneAction = {
  id: 10,
  actionId: 1,
  userId: USER_ID,
  title: "朝ごはんを食べる",
  pt: 5,
  count: 2,
  date: TODAY,
} satisfies DoneActionModel;

const existingDoneReward = {
  id: 20,
  rewardId: 1,
  userId: USER_ID,
  title: "Netflixを見る",
  pt: 4,
  count: 2,
  date: TODAY,
} satisfies DoneRewardModel;

describe("adjustDoneAction", () => {
  beforeEach(() => vi.clearAllMocks());

  it("レコードが存在しない場合は何もしない", async () => {
    mockPrisma.doneAction.findUnique.mockResolvedValue(null);

    await adjustDoneAction(USER_ID, 1, TODAY, 1);

    expect(mockPrisma.$transaction).not.toHaveBeenCalled();
  });

  it("delta=+1 で count が増加し User.points が increment される", async () => {
    mockPrisma.doneAction.findUnique.mockResolvedValue(
      existingDoneAction as never,
    );
    mockPrisma.doneAction.update.mockResolvedValue({} as never);
    mockPrisma.user.update.mockResolvedValue({} as never);

    await adjustDoneAction(USER_ID, 1, TODAY, 1);

    // count: 2 + 1 = 3
    expect(mockPrisma.doneAction.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { count: 3 } }),
    );
    // pt=5, delta=+1 → increment(5)
    expect(mockPrisma.user.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { points: { increment: 5 } } }),
    );
  });

  it("delta=-1 で count が減少する", async () => {
    mockPrisma.doneAction.findUnique.mockResolvedValue(
      existingDoneAction as never,
    );
    mockPrisma.doneAction.update.mockResolvedValue({} as never);
    mockPrisma.user.update.mockResolvedValue({} as never);

    await adjustDoneAction(USER_ID, 1, TODAY, -1);

    // count: 2 - 1 = 1
    expect(mockPrisma.doneAction.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { count: 1 } }),
    );
    // pt=5, delta=-1 → increment(-5)
    expect(mockPrisma.user.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { points: { increment: -5 } } }),
    );
  });

  it("count が 0 以下になった場合 doneAction を削除する", async () => {
    mockPrisma.doneAction.findUnique.mockResolvedValue({
      ...existingDoneAction,
      count: 1,
    } satisfies DoneActionModel as never);
    mockPrisma.doneAction.delete.mockResolvedValue({} as never);
    mockPrisma.user.update.mockResolvedValue({} as never);

    await adjustDoneAction(USER_ID, 1, TODAY, -1);

    expect(mockPrisma.doneAction.delete).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 10 } }),
    );
    expect(mockPrisma.doneAction.update).not.toHaveBeenCalled();
  });

  it("DBに保存済みの pt を使用する（クライアント値を信頼しない）", async () => {
    mockPrisma.doneAction.findUnique.mockResolvedValue({
      ...existingDoneAction,
      pt: 8,
    } satisfies DoneActionModel as never);
    mockPrisma.doneAction.update.mockResolvedValue({} as never);
    mockPrisma.user.update.mockResolvedValue({} as never);

    await adjustDoneAction(USER_ID, 1, TODAY, 1);

    expect(mockPrisma.user.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { points: { increment: 8 } } }),
    );
  });
});

describe("adjustDoneReward", () => {
  beforeEach(() => vi.clearAllMocks());

  it("レコードが存在しない場合は何もしない", async () => {
    mockPrisma.doneReward.findUnique.mockResolvedValue(null);

    await adjustDoneReward(USER_ID, 1, TODAY, 1);

    expect(mockPrisma.$transaction).not.toHaveBeenCalled();
  });

  it("delta=+1 で count が増加し User.points が decrement される（消費増加）", async () => {
    mockPrisma.doneReward.findUnique.mockResolvedValue(
      existingDoneReward as never,
    );
    mockPrisma.doneReward.update.mockResolvedValue({} as never);
    mockPrisma.user.update.mockResolvedValue({} as never);

    await adjustDoneReward(USER_ID, 1, TODAY, 1);

    // count: 2 + 1 = 3
    expect(mockPrisma.doneReward.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { count: 3 } }),
    );
    // pt=4, delta=+1 → decrement(4)（消費増加）
    expect(mockPrisma.user.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { points: { decrement: 4 } } }),
    );
  });

  it("delta=-1 で count が減少し User.points が実質加算される（消費キャンセル）", async () => {
    mockPrisma.doneReward.findUnique.mockResolvedValue(
      existingDoneReward as never,
    );
    mockPrisma.doneReward.update.mockResolvedValue({} as never);
    mockPrisma.user.update.mockResolvedValue({} as never);

    await adjustDoneReward(USER_ID, 1, TODAY, -1);

    // pt=4, delta=-1 → decrement(-4) = ポイント増加
    expect(mockPrisma.user.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { points: { decrement: -4 } } }),
    );
  });

  it("count が 0 以下になった場合 doneReward を削除する", async () => {
    mockPrisma.doneReward.findUnique.mockResolvedValue({
      ...existingDoneReward,
      count: 1,
    } satisfies DoneRewardModel as never);
    mockPrisma.doneReward.delete.mockResolvedValue({} as never);
    mockPrisma.user.update.mockResolvedValue({} as never);

    await adjustDoneReward(USER_ID, 1, TODAY, -1);

    expect(mockPrisma.doneReward.delete).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 20 } }),
    );
    expect(mockPrisma.doneReward.update).not.toHaveBeenCalled();
  });
});
