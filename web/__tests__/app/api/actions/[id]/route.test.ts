import { describe, it, expect, vi, beforeEach } from "vitest";
import { makeRequest } from "../../../../helpers/request";
import type { ActionModel } from "@/app/generated/prisma/models";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    action: {
      update: vi.fn(),
      delete: vi.fn(),
    },
  },
}));

import { prisma } from "@/lib/prisma";
import { PUT, DELETE } from "@/app/api/actions/[id]/route";

const mockPrisma = vi.mocked(prisma, true);
const USER_ID = "test-user-123";

describe("PUT /api/actions/[id]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("正常な更新でアクションが返される", async () => {
    const updated = {
      id: 1,
      userId: USER_ID,
      title: "更新された行動",
      desc: "説明",
      tags: ["食事"],
      hurdle: 2,
      time: 3,
      createdAt: new Date(),
      updatedAt: new Date(),
    } satisfies ActionModel;
    mockPrisma.action.update.mockResolvedValue(updated as never);

    const req = makeRequest("PUT", "/api/actions/1", {
      title: "更新された行動",
      desc: "説明",
      tags: ["食事"],
      hurdle: 2,
      time: 3,
    });
    const res = await PUT(req, { params: Promise.resolve({ id: "1" }) });
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.title).toBe("更新された行動");
    expect(json.hurdle).toBe(2);
  });

  describe("バリデーション - 不正値で 400 を返す", () => {
    it.each([
      { body: { title: "", hurdle: 1, time: 1 }, label: "title が空文字" },
      { body: { hurdle: 1, time: 1 }, label: "title が欠如" },
      { body: { title: "x", hurdle: 0, time: 1 }, label: "hurdle が 0" },
      { body: { title: "x", hurdle: 6, time: 1 }, label: "hurdle が 6" },
      { body: { title: "x", hurdle: 1.5, time: 1 }, label: "hurdle が小数" },
      { body: { title: "x", hurdle: 1, time: 0 }, label: "time が 0" },
      { body: { title: "x", hurdle: 1, time: 481 }, label: "time が 481" },
    ])(
      "400 を返す: $label",
      async ({ body }: { body: Record<string, unknown>; label: string }) => {
        const req = makeRequest("PUT", "/api/actions/1", body);
        const res = await PUT(req, { params: Promise.resolve({ id: "1" }) });
        expect(res.status).toBe(400);
        const json = await res.json();
        expect(json.error).toBeDefined();
      },
    );
  });

  it("update の where に userId が含まれる（オーナーシップ確認）", async () => {
    const updated = {
      id: 1,
      userId: USER_ID,
      title: "テスト",
      desc: "",
      tags: [],
      hurdle: 1,
      time: 1,
      createdAt: new Date(),
      updatedAt: new Date(),
    } satisfies ActionModel;
    mockPrisma.action.update.mockResolvedValue(updated as never);

    const req = makeRequest("PUT", "/api/actions/1", {
      title: "テスト",
      hurdle: 1,
      time: 1,
    });
    await PUT(req, { params: Promise.resolve({ id: "1" }) });

    expect(mockPrisma.action.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ userId: USER_ID }),
      }),
    );
  });
});

describe("DELETE /api/actions/[id]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("正常な削除で { ok: true } が返される", async () => {
    mockPrisma.action.delete.mockResolvedValue({} as never);

    const req = makeRequest("DELETE", "/api/actions/1");
    const res = await DELETE(req, { params: Promise.resolve({ id: "1" }) });
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.ok).toBe(true);
  });

  it("delete の where に userId が含まれる（オーナーシップ確認）", async () => {
    mockPrisma.action.delete.mockResolvedValue({} as never);

    const req = makeRequest("DELETE", "/api/actions/1");
    await DELETE(req, { params: Promise.resolve({ id: "1" }) });

    expect(mockPrisma.action.delete).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ userId: USER_ID }),
      }),
    );
  });

  it("delete に正しい id が渡される", async () => {
    mockPrisma.action.delete.mockResolvedValue({} as never);

    const req = makeRequest("DELETE", "/api/actions/42");
    await DELETE(req, { params: Promise.resolve({ id: "42" }) });

    expect(mockPrisma.action.delete).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ id: 42 }),
      }),
    );
  });
});
