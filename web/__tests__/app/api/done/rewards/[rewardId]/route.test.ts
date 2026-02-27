import { describe, it, expect, vi, beforeEach } from "vitest";
import { makeRequest } from "../../../../../helpers/request";
import type { UserModel, DoneRewardModel } from "@/app/generated/prisma/models";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: {
      findUniqueOrThrow: vi.fn(),
      update: vi.fn(),
    },
    doneReward: {
      findUnique: vi.fn(),
      delete: vi.fn(),
      update: vi.fn(),
    },
  },
}));

import { prisma } from "@/lib/prisma";
import { PATCH } from "@/app/api/done/rewards/[rewardId]/route";

const mockPrisma = vi.mocked(prisma, true);
const USER_ID = "test-user-123";

const existingDoneReward = {
  id: 20,
  rewardId: 1,
  userId: USER_ID,
  title: "Netflixを見る",
  pt: 4,
  count: 2,
  date: "2024-01-15",
} satisfies DoneRewardModel;

describe("PATCH /api/done/rewards/[rewardId]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockPrisma.user.findUniqueOrThrow.mockResolvedValue({
      id: USER_ID,
      name: null,
      email: null,
      emailVerified: null,
      timezone: "UTC",
      mode: "NORMAL",
      points: 50,
      createdAt: new Date(),
      updatedAt: new Date(),
    } satisfies UserModel as never);
  });

  it("delta=+1 で count が増加し user.points が decrement される（リワードのため逆）", async () => {
    mockPrisma.doneReward.findUnique.mockResolvedValue(
      existingDoneReward as never,
    );
    mockPrisma.doneReward.update.mockResolvedValue({} as never);
    mockPrisma.user.update.mockResolvedValue({} as never);

    const req = makeRequest("PATCH", "/api/done/rewards/1", { delta: 1 });
    const res = await PATCH(req, {
      params: Promise.resolve({ rewardId: "1" }),
    });
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.ok).toBe(true);
    // count: 2 + 1 = 3 → update
    expect(mockPrisma.doneReward.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { count: 3 } }),
    );
    // ご褒美は decrement（消費増加）
    expect(mockPrisma.user.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { points: { decrement: 4 } } }),
    );
  });

  it("delta=-1 で count が減少し user.points が増加する（消費キャンセル）", async () => {
    mockPrisma.doneReward.findUnique.mockResolvedValue(
      existingDoneReward as never,
    );
    mockPrisma.doneReward.update.mockResolvedValue({} as never);
    mockPrisma.user.update.mockResolvedValue({} as never);

    const req = makeRequest("PATCH", "/api/done/rewards/1", { delta: -1 });
    await PATCH(req, { params: Promise.resolve({ rewardId: "1" }) });

    // count: 2 - 1 = 1
    expect(mockPrisma.doneReward.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { count: 1 } }),
    );
    // delta=-1: decrement(4 * -1) = decrement(-4) = ポイント増加
    expect(mockPrisma.user.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { points: { decrement: -4 } } }),
    );
  });

  it("count が 0 以下になったとき doneReward を削除する", async () => {
    mockPrisma.doneReward.findUnique.mockResolvedValue({
      ...existingDoneReward,
      count: 1,
    } satisfies DoneRewardModel as never);
    mockPrisma.doneReward.delete.mockResolvedValue({} as never);
    mockPrisma.user.update.mockResolvedValue({} as never);

    const req = makeRequest("PATCH", "/api/done/rewards/1", { delta: -1 });
    await PATCH(req, { params: Promise.resolve({ rewardId: "1" }) });

    expect(mockPrisma.doneReward.delete).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: existingDoneReward.id } }),
    );
    expect(mockPrisma.doneReward.update).not.toHaveBeenCalled();
  });

  it("doneReward が存在しない場合は { ok: true } を返す", async () => {
    mockPrisma.doneReward.findUnique.mockResolvedValue(null);

    const req = makeRequest("PATCH", "/api/done/rewards/99", { delta: 1 });
    const res = await PATCH(req, {
      params: Promise.resolve({ rewardId: "99" }),
    });
    const json = await res.json();

    expect(json.ok).toBe(true);
    expect(mockPrisma.doneReward.update).not.toHaveBeenCalled();
    expect(mockPrisma.user.update).not.toHaveBeenCalled();
  });
});
