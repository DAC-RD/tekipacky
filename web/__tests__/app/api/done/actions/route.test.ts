import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { makeRequest } from "../../../../helpers/request";

// Prisma をモック（DB接続なしでテスト）
vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: {
      findUniqueOrThrow: vi.fn(),
      update: vi.fn(),
    },
    action: {
      findUniqueOrThrow: vi.fn(),
    },
    doneAction: {
      upsert: vi.fn(),
    },
  },
}));

import { prisma } from "@/lib/prisma";
import { POST } from "@/app/api/done/actions/route";

const mockPrisma = vi.mocked(prisma, true);

const USER_ID = "test-user-123";

describe("POST /api/done/actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("normalモードで hurdle×time のポイントを計算して付与する", async () => {
    mockPrisma.user.findUniqueOrThrow.mockResolvedValue({
      id: USER_ID,
      timezone: "Asia/Tokyo",
      mode: "NORMAL",
      points: 0,
      createdAt: new Date(),
    } as never);
    mockPrisma.action.findUniqueOrThrow.mockResolvedValue({
      id: 1,
      userId: USER_ID,
      title: "朝ごはんを食べる",
      hurdle: 2,
      time: 3,
      desc: "",
      tags: [],
    } as never);
    mockPrisma.doneAction.upsert.mockResolvedValue({
      id: 1,
      actionId: 1,
      title: "朝ごはんを食べる",
      pt: 6, // 2 * 3 * 1.0 = 6
      count: 1,
      date: "2024-01-15",
      userId: USER_ID,
    } as never);
    mockPrisma.user.update.mockResolvedValue({} as never);

    const req = makeRequest("POST", "/api/done/actions", { actionId: 1 });
    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.pt).toBe(6);
    expect(json.title).toBe("朝ごはんを食べる");
    expect(json.count).toBe(1);
  });

  it("easyモードで earnMul=1.5 が適用される", async () => {
    mockPrisma.user.findUniqueOrThrow.mockResolvedValue({
      id: USER_ID,
      timezone: "Asia/Tokyo",
      mode: "EASY",
      points: 0,
      createdAt: new Date(),
    } as never);
    mockPrisma.action.findUniqueOrThrow.mockResolvedValue({
      id: 1,
      userId: USER_ID,
      title: "散歩する",
      hurdle: 2,
      time: 2,
      desc: "",
      tags: [],
    } as never);
    // 2 * 2 * 1.5 = 6
    mockPrisma.doneAction.upsert.mockResolvedValue({
      id: 1,
      actionId: 1,
      title: "散歩する",
      pt: 6,
      count: 1,
      date: "2024-01-15",
      userId: USER_ID,
    } as never);
    mockPrisma.user.update.mockResolvedValue({} as never);

    const req = makeRequest("POST", "/api/done/actions", { actionId: 1 });
    const res = await POST(req);
    const json = await res.json();

    expect(json.pt).toBe(6);
  });

  it("サーバー側でポイント計算される（upsert の pt はサーバー計算値）", async () => {
    mockPrisma.user.findUniqueOrThrow.mockResolvedValue({
      id: USER_ID,
      timezone: "Asia/Tokyo",
      mode: "NORMAL",
      points: 0,
      createdAt: new Date(),
    } as never);
    mockPrisma.action.findUniqueOrThrow.mockResolvedValue({
      id: 1,
      userId: USER_ID,
      title: "テスト行動",
      hurdle: 3,
      time: 4,
      desc: "",
      tags: [],
    } as never);
    mockPrisma.doneAction.upsert.mockResolvedValue({
      id: 1,
      actionId: 1,
      title: "テスト行動",
      pt: 12, // 3 * 4 * 1.0 = 12
      count: 1,
      date: "2024-01-15",
      userId: USER_ID,
    } as never);
    mockPrisma.user.update.mockResolvedValue({} as never);

    const req = makeRequest("POST", "/api/done/actions", { actionId: 1 });
    await POST(req);

    // upsert の create.pt がサーバー計算値
    expect(mockPrisma.doneAction.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        create: expect.objectContaining({ pt: 12 }),
      }),
    );
  });

  it("user.update で points が increment される", async () => {
    mockPrisma.user.findUniqueOrThrow.mockResolvedValue({
      id: USER_ID,
      timezone: "UTC",
      mode: "NORMAL",
      points: 0,
      createdAt: new Date(),
    } as never);
    mockPrisma.action.findUniqueOrThrow.mockResolvedValue({
      id: 1,
      userId: USER_ID,
      title: "テスト",
      hurdle: 1,
      time: 1,
      desc: "",
      tags: [],
    } as never);
    mockPrisma.doneAction.upsert.mockResolvedValue({
      id: 1,
      actionId: 1,
      title: "テスト",
      pt: 1,
      count: 1,
      date: "2024-01-15",
      userId: USER_ID,
    } as never);
    mockPrisma.user.update.mockResolvedValue({} as never);

    const req = makeRequest("POST", "/api/done/actions", { actionId: 1 });
    await POST(req);

    expect(mockPrisma.user.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: { points: { increment: 1 } },
      }),
    );
  });

  it("x-user-id ヘッダーがない場合はエラー", async () => {
    const req = new NextRequest("http://localhost/api/done/actions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ actionId: 1 }),
    });
    await expect(POST(req)).rejects.toThrow("x-user-id header missing");
  });
});
