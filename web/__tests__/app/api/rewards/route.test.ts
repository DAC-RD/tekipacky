import { describe, it, expect, vi, beforeEach } from "vitest";
import { makeRequest } from "../../../helpers/request";
import type { RewardModel } from "@/app/generated/prisma/models";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    reward: {
      create: vi.fn(),
    },
  },
}));

import { prisma } from "@/lib/prisma";
import { POST } from "@/app/api/rewards/route";

const mockPrisma = vi.mocked(prisma, true);
const USER_ID = "test-user-123";

describe("POST /api/rewards", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("正常なリクエストでリワードが作成される", async () => {
    const created = {
      id: 1,
      userId: USER_ID,
      title: "Netflixを見る",
      desc: "",
      tags: [],
      satisfaction: 2,
      time: 2,
      price: 1,
      createdAt: new Date(),
      updatedAt: new Date(),
    } satisfies RewardModel;
    mockPrisma.reward.create.mockResolvedValue(created as never);

    const req = makeRequest("POST", "/api/rewards", {
      title: "Netflixを見る",
      satisfaction: 2,
      time: 2,
      price: 1,
    });
    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.title).toBe("Netflixを見る");
    expect(json.satisfaction).toBe(2);
  });

  it("desc が省略されたときデフォルト空文字が設定される", async () => {
    const created = {
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
    mockPrisma.reward.create.mockResolvedValue(created as never);

    const req = makeRequest("POST", "/api/rewards", {
      title: "テスト",
      satisfaction: 1,
      time: 1,
      price: 1,
    });
    await POST(req);

    expect(mockPrisma.reward.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ desc: "" }),
      }),
    );
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
      const req = makeRequest("POST", "/api/rewards", body);
      const res = await POST(req);
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.error).toBeDefined();
    });
  });

  it("tags が省略されたときデフォルト空配列が設定される", async () => {
    const created = {
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
    mockPrisma.reward.create.mockResolvedValue(created as never);

    const req = makeRequest("POST", "/api/rewards", {
      title: "テスト",
      satisfaction: 1,
      time: 1,
      price: 1,
    });
    await POST(req);

    expect(mockPrisma.reward.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ tags: [] }),
      }),
    );
  });
});
