import { describe, it, expect, vi, beforeEach } from "vitest";
import { makeRequest } from "../../../../helpers/request";
import type { RewardModel } from "@/app/generated/prisma/models";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    reward: {
      update: vi.fn(),
      delete: vi.fn(),
    },
  },
}));

import { prisma } from "@/lib/prisma";
import { PUT, DELETE } from "@/app/api/rewards/[id]/route";

const mockPrisma = vi.mocked(prisma, true);
const USER_ID = "test-user-123";

describe("PUT /api/rewards/[id]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("正常な更新でリワードが返される", async () => {
    const updated = {
      id: 1,
      userId: USER_ID,
      title: "更新されたご褒美",
      desc: "",
      tags: [],
      satisfaction: 3,
      time: 2,
      price: 2,
      createdAt: new Date(),
      updatedAt: new Date(),
    } satisfies RewardModel;
    mockPrisma.reward.update.mockResolvedValue(updated as never);

    const req = makeRequest("PUT", "/api/rewards/1", {
      title: "更新されたご褒美",
      satisfaction: 3,
      time: 2,
      price: 2,
    });
    const res = await PUT(req, { params: Promise.resolve({ id: "1" }) });
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.title).toBe("更新されたご褒美");
    expect(json.satisfaction).toBe(3);
  });

  describe("バリデーション - 不正値で 400 を返す", () => {
    it.each([
      [{ title: "", satisfaction: 1, time: 1, price: 1 }, "title が空文字"],
      [{ satisfaction: 1, time: 1, price: 1 }, "title が欠如"],
      [{ title: "x", satisfaction: 0, time: 1, price: 1 }, "satisfaction が 0"],
      [{ title: "x", satisfaction: 6, time: 1, price: 1 }, "satisfaction が 6"],
      [{ title: "x", satisfaction: 1, time: 0, price: 1 }, "time が 0"],
      [{ title: "x", satisfaction: 1, time: 481, price: 1 }, "time が 481"],
      [{ title: "x", satisfaction: 1, time: 1, price: 0 }, "price が 0"],
    ])("400 を返す: %s", async (body) => {
      const req = makeRequest("PUT", "/api/rewards/1", body);
      const res = await PUT(req, { params: Promise.resolve({ id: "1" }) });
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.error).toBeDefined();
    });
  });

  it("update の where に userId が含まれる（オーナーシップ確認）", async () => {
    const updated = {
      id: 1,
      userId: USER_ID,
      title: "テスト",
      desc: "",
      tags: [],
      satisfaction: 1,
      time: 1,
      price: 1,
      createdAt: new Date(),
      updatedAt: new Date(),
    } satisfies RewardModel;
    mockPrisma.reward.update.mockResolvedValue(updated as never);

    const req = makeRequest("PUT", "/api/rewards/1", {
      title: "テスト",
      satisfaction: 1,
      time: 1,
      price: 1,
    });
    await PUT(req, { params: Promise.resolve({ id: "1" }) });

    expect(mockPrisma.reward.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ userId: USER_ID }),
      }),
    );
  });
});

describe("DELETE /api/rewards/[id]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("正常な削除で { ok: true } が返される", async () => {
    mockPrisma.reward.delete.mockResolvedValue({} as never);

    const req = makeRequest("DELETE", "/api/rewards/1");
    const res = await DELETE(req, { params: Promise.resolve({ id: "1" }) });
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.ok).toBe(true);
  });

  it("delete の where に userId が含まれる（オーナーシップ確認）", async () => {
    mockPrisma.reward.delete.mockResolvedValue({} as never);

    const req = makeRequest("DELETE", "/api/rewards/5");
    await DELETE(req, { params: Promise.resolve({ id: "5" }) });

    expect(mockPrisma.reward.delete).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ userId: USER_ID, id: 5 }),
      }),
    );
  });
});
