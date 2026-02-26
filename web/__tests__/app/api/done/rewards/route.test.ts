import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: {
      findUniqueOrThrow: vi.fn(),
      update: vi.fn(),
    },
    reward: {
      findUniqueOrThrow: vi.fn(),
    },
    doneReward: {
      upsert: vi.fn(),
    },
  },
}));

import { prisma } from "@/lib/prisma";
import { POST } from "@/app/api/done/rewards/route";

const mockPrisma = vi.mocked(prisma, true);
const USER_ID = "test-user-123";

function makeRequest(body: unknown, extraHeaders?: Record<string, string>): NextRequest {
  return new NextRequest("http://localhost/api/done/rewards", {
    method: "POST",
    headers: {
      "x-user-id": USER_ID,
      "Content-Type": "application/json",
      ...extraHeaders,
    },
    body: JSON.stringify(body),
  });
}

const mockReward = {
  id: 1,
  userId: USER_ID,
  title: "Netflixを見る",
  satisfaction: 2,
  time: 2,
  price: 1,
  desc: "",
  tags: [],
};

describe("POST /api/done/rewards", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("ポイントが十分な場合にリワードが消費できる", async () => {
    mockPrisma.user.findUniqueOrThrow.mockResolvedValue({
      id: USER_ID,
      timezone: "Asia/Tokyo",
      mode: "NORMAL",
      points: 100,
      createdAt: new Date(),
    } as never);
    mockPrisma.reward.findUniqueOrThrow.mockResolvedValue(mockReward as never);
    mockPrisma.doneReward.upsert.mockResolvedValue({
      id: 1,
      rewardId: 1,
      title: "Netflixを見る",
      pt: 4, // 2 * 2 * 1 * 1.0 = 4
      count: 1,
      date: "2024-01-15",
      userId: USER_ID,
    } as never);
    mockPrisma.user.update.mockResolvedValue({} as never);

    const req = makeRequest({ rewardId: 1 });
    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.pt).toBe(4);
    expect(json.title).toBe("Netflixを見る");
  });

  it("ポイント不足の場合に 400 を返す", async () => {
    mockPrisma.user.findUniqueOrThrow.mockResolvedValue({
      id: USER_ID,
      timezone: "Asia/Tokyo",
      mode: "NORMAL",
      points: 0, // 残高不足
      createdAt: new Date(),
    } as never);
    mockPrisma.reward.findUniqueOrThrow.mockResolvedValue(mockReward as never);

    const req = makeRequest({ rewardId: 1 });
    const res = await POST(req);

    expect(res.status).toBe(400);
  });

  it("ポイント不足の場合に insufficient points エラーを返す", async () => {
    mockPrisma.user.findUniqueOrThrow.mockResolvedValue({
      id: USER_ID,
      timezone: "Asia/Tokyo",
      mode: "NORMAL",
      points: 0,
      createdAt: new Date(),
    } as never);
    mockPrisma.reward.findUniqueOrThrow.mockResolvedValue(mockReward as never);

    const req = makeRequest({ rewardId: 1 });
    const res = await POST(req);
    const json = await res.json();

    expect(json.error).toBe("insufficient points");
  });

  it("ポイント不足の場合は doneReward.upsert が呼ばれない", async () => {
    mockPrisma.user.findUniqueOrThrow.mockResolvedValue({
      id: USER_ID,
      timezone: "Asia/Tokyo",
      mode: "NORMAL",
      points: 3, // pt=4 には足りない
      createdAt: new Date(),
    } as never);
    mockPrisma.reward.findUniqueOrThrow.mockResolvedValue(mockReward as never);

    const req = makeRequest({ rewardId: 1 });
    await POST(req);

    expect(mockPrisma.doneReward.upsert).not.toHaveBeenCalled();
  });

  it("サーバーサイドでポイントを計算する（upsert の pt はサーバー計算値）", async () => {
    mockPrisma.user.findUniqueOrThrow.mockResolvedValue({
      id: USER_ID,
      timezone: "UTC",
      mode: "HARD", // spendMul=1.5
      points: 200,
      createdAt: new Date(),
    } as never);
    // satisfaction=2, time=2, price=2: 2*2*2*1.5 = 12
    mockPrisma.reward.findUniqueOrThrow.mockResolvedValue({
      ...mockReward,
      satisfaction: 2,
      time: 2,
      price: 2,
    } as never);
    mockPrisma.doneReward.upsert.mockResolvedValue({
      id: 1,
      rewardId: 1,
      title: "Netflixを見る",
      pt: 12,
      count: 1,
      date: "2024-01-15",
      userId: USER_ID,
    } as never);
    mockPrisma.user.update.mockResolvedValue({} as never);

    const req = makeRequest({ rewardId: 1 });
    await POST(req);

    expect(mockPrisma.doneReward.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        create: expect.objectContaining({ pt: 12 }),
      }),
    );
  });

  it("user.update でポイントが decrement される", async () => {
    mockPrisma.user.findUniqueOrThrow.mockResolvedValue({
      id: USER_ID,
      timezone: "UTC",
      mode: "NORMAL",
      points: 100,
      createdAt: new Date(),
    } as never);
    mockPrisma.reward.findUniqueOrThrow.mockResolvedValue(mockReward as never); // pt=4
    mockPrisma.doneReward.upsert.mockResolvedValue({
      id: 1,
      rewardId: 1,
      title: "Netflixを見る",
      pt: 4,
      count: 1,
      date: "2024-01-15",
      userId: USER_ID,
    } as never);
    mockPrisma.user.update.mockResolvedValue({} as never);

    const req = makeRequest({ rewardId: 1 });
    await POST(req);

    expect(mockPrisma.user.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: { points: { decrement: 4 } },
      }),
    );
  });
});
