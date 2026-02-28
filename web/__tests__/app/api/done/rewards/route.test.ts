import { describe, it, expect, vi, beforeEach } from "vitest";
import { makeRequest } from "../../../../helpers/request";
import type {
  UserModel,
  RewardModel,
  DoneRewardModel,
} from "@/app/generated/prisma/models";

vi.mock("@/lib/prisma", () => {
  const $transaction = vi.fn();
  const prismaMock = {
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
    $transaction,
  };
  $transaction.mockImplementation((fn: (tx: unknown) => Promise<unknown>) =>
    fn(prismaMock),
  );
  return { prisma: prismaMock };
});

import { prisma } from "@/lib/prisma";
import { POST } from "@/app/api/done/rewards/route";

const mockPrisma = vi.mocked(prisma, true);
const USER_ID = "test-user-123";

const mockReward = {
  id: 1,
  userId: USER_ID,
  title: "Netflixを見る",
  satisfaction: 2,
  time: 2,
  price: 1,
  desc: "",
  tags: [],
  createdAt: new Date(),
  updatedAt: new Date(),
} satisfies RewardModel;

describe("POST /api/done/rewards", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("ポイントが十分な場合にリワードが消費できる", async () => {
    mockPrisma.user.findUniqueOrThrow.mockResolvedValue({
      id: USER_ID,
      name: null,
      email: null,
      emailVerified: null,
      timezone: "Asia/Tokyo",
      mode: "NORMAL",
      points: 100,
      createdAt: new Date(),
      updatedAt: new Date(),
    } satisfies UserModel as never);
    mockPrisma.reward.findUniqueOrThrow.mockResolvedValue(mockReward as never);
    mockPrisma.doneReward.upsert.mockResolvedValue({
      id: 1,
      rewardId: 1,
      userId: USER_ID,
      title: "Netflixを見る",
      pt: 4, // 2 * 2 * 1 * 1.0 = 4
      count: 1,
      date: "2024-01-15",
    } satisfies DoneRewardModel as never);
    mockPrisma.user.update.mockResolvedValue({} as never);

    const req = makeRequest("POST", "/api/done/rewards", { rewardId: 1 });
    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.pt).toBe(4);
    expect(json.title).toBe("Netflixを見る");
  });

  it("ポイント不足の場合に 400 を返す", async () => {
    mockPrisma.user.findUniqueOrThrow.mockResolvedValue({
      id: USER_ID,
      name: null,
      email: null,
      emailVerified: null,
      timezone: "Asia/Tokyo",
      mode: "NORMAL",
      points: 0, // 残高不足
      createdAt: new Date(),
      updatedAt: new Date(),
    } satisfies UserModel as never);
    mockPrisma.reward.findUniqueOrThrow.mockResolvedValue(mockReward as never);

    const req = makeRequest("POST", "/api/done/rewards", { rewardId: 1 });
    const res = await POST(req);

    expect(res.status).toBe(400);
  });

  it("ポイント不足の場合に insufficient points エラーを返す", async () => {
    mockPrisma.user.findUniqueOrThrow.mockResolvedValue({
      id: USER_ID,
      name: null,
      email: null,
      emailVerified: null,
      timezone: "Asia/Tokyo",
      mode: "NORMAL",
      points: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    } satisfies UserModel as never);
    mockPrisma.reward.findUniqueOrThrow.mockResolvedValue(mockReward as never);

    const req = makeRequest("POST", "/api/done/rewards", { rewardId: 1 });
    const res = await POST(req);
    const json = await res.json();

    expect(json.error).toBe("insufficient points");
  });

  it("ポイント不足の場合は doneReward.upsert が呼ばれない", async () => {
    mockPrisma.user.findUniqueOrThrow.mockResolvedValue({
      id: USER_ID,
      name: null,
      email: null,
      emailVerified: null,
      timezone: "Asia/Tokyo",
      mode: "NORMAL",
      points: 3, // pt=4 には足りない
      createdAt: new Date(),
      updatedAt: new Date(),
    } satisfies UserModel as never);
    mockPrisma.reward.findUniqueOrThrow.mockResolvedValue(mockReward as never);

    const req = makeRequest("POST", "/api/done/rewards", { rewardId: 1 });
    await POST(req);

    expect(mockPrisma.doneReward.upsert).not.toHaveBeenCalled();
  });

  it("サーバーサイドでポイントを計算する（upsert の pt はサーバー計算値）", async () => {
    mockPrisma.user.findUniqueOrThrow.mockResolvedValue({
      id: USER_ID,
      name: null,
      email: null,
      emailVerified: null,
      timezone: "UTC",
      mode: "HARD", // spendMul=1.5
      points: 200,
      createdAt: new Date(),
      updatedAt: new Date(),
    } satisfies UserModel as never);
    // satisfaction=2, time=2, price=2: 2*2*2*1.5 = 12
    mockPrisma.reward.findUniqueOrThrow.mockResolvedValue({
      ...mockReward,
      satisfaction: 2,
      time: 2,
      price: 2,
    } satisfies RewardModel as never);
    mockPrisma.doneReward.upsert.mockResolvedValue({
      id: 1,
      rewardId: 1,
      userId: USER_ID,
      title: "Netflixを見る",
      pt: 12,
      count: 1,
      date: "2024-01-15",
    } satisfies DoneRewardModel as never);
    mockPrisma.user.update.mockResolvedValue({} as never);

    const req = makeRequest("POST", "/api/done/rewards", { rewardId: 1 });
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
      name: null,
      email: null,
      emailVerified: null,
      timezone: "UTC",
      mode: "NORMAL",
      points: 100,
      createdAt: new Date(),
      updatedAt: new Date(),
    } satisfies UserModel as never);
    mockPrisma.reward.findUniqueOrThrow.mockResolvedValue(mockReward as never); // pt=4
    mockPrisma.doneReward.upsert.mockResolvedValue({
      id: 1,
      rewardId: 1,
      userId: USER_ID,
      title: "Netflixを見る",
      pt: 4,
      count: 1,
      date: "2024-01-15",
    } satisfies DoneRewardModel as never);
    mockPrisma.user.update.mockResolvedValue({} as never);

    const req = makeRequest("POST", "/api/done/rewards", { rewardId: 1 });
    await POST(req);

    expect(mockPrisma.user.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: { points: { decrement: 4 } },
      }),
    );
  });
});
