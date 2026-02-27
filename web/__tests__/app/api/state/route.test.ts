import { describe, it, expect, vi, beforeEach } from "vitest";
import { makeRequest } from "../../../helpers/request";
import type {
  UserModel,
  ActionModel,
  RewardModel,
  DoneActionModel,
  DoneRewardModel,
} from "@/app/generated/prisma/models";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: {
      findUniqueOrThrow: vi.fn(),
    },
    action: {
      findMany: vi.fn(),
    },
    reward: {
      findMany: vi.fn(),
    },
    doneAction: {
      findMany: vi.fn(),
    },
    doneReward: {
      findMany: vi.fn(),
    },
  },
}));

import { prisma } from "@/lib/prisma";
import { GET } from "@/app/api/state/route";

const mockPrisma = vi.mocked(prisma, true);
const USER_ID = "test-user-123";

describe("GET /api/state", () => {
  beforeEach(() => {
    vi.clearAllMocks();
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
    mockPrisma.action.findMany.mockResolvedValue([
      {
        id: 1,
        userId: USER_ID,
        title: "朝ごはん",
        desc: "",
        tags: [],
        hurdle: 1,
        time: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
      } satisfies ActionModel,
    ] as never);
    mockPrisma.reward.findMany.mockResolvedValue([
      {
        id: 1,
        userId: USER_ID,
        title: "Netflix",
        desc: "",
        tags: [],
        satisfaction: 2,
        time: 2,
        price: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
      } satisfies RewardModel,
    ] as never);
    mockPrisma.doneAction.findMany.mockResolvedValue([
      {
        id: 1,
        actionId: 1,
        userId: USER_ID,
        title: "朝ごはん",
        pt: 1,
        count: 1,
        date: "2024-01-15",
      } satisfies DoneActionModel,
    ] as never);
    mockPrisma.doneReward.findMany.mockResolvedValue([
      {
        id: 1,
        rewardId: 1,
        userId: USER_ID,
        title: "Netflix",
        pt: 4,
        count: 1,
        date: "2024-01-15",
      } satisfies DoneRewardModel,
    ] as never);
  });

  it("ユーザーの全状態が返される", async () => {
    const req = makeRequest("GET", "/api/state");
    const res = await GET(req);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json).toHaveProperty("points", 100);
    expect(json).toHaveProperty("mode", "normal");
    expect(json).toHaveProperty("actions");
    expect(json).toHaveProperty("rewards");
    expect(json).toHaveProperty("doneActions");
    expect(json).toHaveProperty("doneRewards");
  });

  it("mode が DB enum から frontend 型に変換される", async () => {
    const req = makeRequest("GET", "/api/state");
    const res = await GET(req);
    const json = await res.json();

    expect(json.mode).toBe("normal"); // NORMAL → normal
  });

  it("actions が正しく返される", async () => {
    const req = makeRequest("GET", "/api/state");
    const res = await GET(req);
    const json = await res.json();

    expect(json.actions).toHaveLength(1);
    expect(json.actions[0].title).toBe("朝ごはん");
  });

  it("doneActions が正しく返される", async () => {
    const req = makeRequest("GET", "/api/state");
    const res = await GET(req);
    const json = await res.json();

    expect(json.doneActions).toHaveLength(1);
    expect(json.doneActions[0].id).toBe(1);
    expect(json.doneActions[0].pt).toBe(1);
  });

  it("actionId が null の done アクションは除外される（削除済み行動）", async () => {
    mockPrisma.doneAction.findMany.mockResolvedValue([
      {
        id: 1,
        actionId: 1,
        userId: USER_ID,
        title: "存在する",
        pt: 1,
        count: 1,
        date: "2024-01-15",
      } satisfies DoneActionModel,
      {
        id: 2,
        actionId: null,
        userId: USER_ID,
        title: "削除済み",
        pt: 2,
        count: 1,
        date: "2024-01-15",
      } satisfies DoneActionModel,
    ] as never);

    const req = makeRequest("GET", "/api/state");
    const res = await GET(req);
    const json = await res.json();

    expect(json.doneActions).toHaveLength(1);
    expect(json.doneActions[0].title).toBe("存在する");
  });

  it("rewardId が null の done リワードは除外される（削除済みリワード）", async () => {
    mockPrisma.doneReward.findMany.mockResolvedValue([
      {
        id: 1,
        rewardId: 1,
        userId: USER_ID,
        title: "存在する",
        pt: 4,
        count: 1,
        date: "2024-01-15",
      } satisfies DoneRewardModel,
      {
        id: 2,
        rewardId: null,
        userId: USER_ID,
        title: "削除済み",
        pt: 5,
        count: 1,
        date: "2024-01-15",
      } satisfies DoneRewardModel,
    ] as never);

    const req = makeRequest("GET", "/api/state");
    const res = await GET(req);
    const json = await res.json();

    expect(json.doneRewards).toHaveLength(1);
    expect(json.doneRewards[0].title).toBe("存在する");
  });

  it("points が正しく返される", async () => {
    mockPrisma.user.findUniqueOrThrow.mockResolvedValue({
      id: USER_ID,
      name: null,
      email: null,
      emailVerified: null,
      timezone: "UTC",
      mode: "HARD",
      points: 250,
      createdAt: new Date(),
      updatedAt: new Date(),
    } satisfies UserModel as never);

    const req = makeRequest("GET", "/api/state");
    const res = await GET(req);
    const json = await res.json();

    expect(json.points).toBe(250);
  });
});
