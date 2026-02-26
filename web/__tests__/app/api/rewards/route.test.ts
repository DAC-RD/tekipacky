import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

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

function makeRequest(body: unknown): NextRequest {
  return new NextRequest("http://localhost/api/rewards", {
    method: "POST",
    headers: {
      "x-user-id": USER_ID,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
}

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
    };
    mockPrisma.reward.create.mockResolvedValue(created as never);

    const req = makeRequest({ title: "Netflixを見る", satisfaction: 2, time: 2, price: 1 });
    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.title).toBe("Netflixを見る");
    expect(json.satisfaction).toBe(2);
  });

  it("desc が省略されたときデフォルト空文字が設定される", async () => {
    const created = { id: 1, userId: USER_ID, title: "テスト", desc: "", tags: [], satisfaction: 1, time: 1, price: 1 };
    mockPrisma.reward.create.mockResolvedValue(created as never);

    const req = makeRequest({ title: "テスト", satisfaction: 1, time: 1, price: 1 });
    await POST(req);

    expect(mockPrisma.reward.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ desc: "" }),
      }),
    );
  });

  it("tags が省略されたときデフォルト空配列が設定される", async () => {
    const created = { id: 1, userId: USER_ID, title: "テスト", desc: "", tags: [], satisfaction: 1, time: 1, price: 1 };
    mockPrisma.reward.create.mockResolvedValue(created as never);

    const req = makeRequest({ title: "テスト", satisfaction: 1, time: 1, price: 1 });
    await POST(req);

    expect(mockPrisma.reward.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ tags: [] }),
      }),
    );
  });
});
