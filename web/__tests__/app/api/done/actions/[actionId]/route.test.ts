import { describe, it, expect, vi, beforeEach } from "vitest";
import { makeRequest } from "../../../../../helpers/request";
import type { UserModel, DoneActionModel } from "@/app/generated/prisma/models";

vi.mock("@/lib/prisma", () => {
  const $transaction = vi.fn();
  const prismaMock = {
    user: {
      findUniqueOrThrow: vi.fn(),
      update: vi.fn(),
    },
    doneAction: {
      findUnique: vi.fn(),
      delete: vi.fn(),
      update: vi.fn(),
    },
    $transaction,
  };
  $transaction.mockImplementation((fn: (tx: unknown) => Promise<unknown>) =>
    fn(prismaMock),
  );
  return { prisma: prismaMock };
});

import { prisma } from "@/lib/prisma";
import { PATCH } from "@/app/api/done/actions/[actionId]/route";

const mockPrisma = vi.mocked(prisma, true);
const USER_ID = "test-user-123";

const existingDoneAction = {
  id: 10,
  actionId: 1,
  userId: USER_ID,
  title: "朝ごはんを食べる",
  pt: 5,
  count: 2,
  date: "2024-01-15",
} satisfies DoneActionModel;

describe("PATCH /api/done/actions/[actionId]", () => {
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

  it("delta=+1 で count が増加し user.points が increment される", async () => {
    mockPrisma.doneAction.findUnique.mockResolvedValue(
      existingDoneAction as never,
    );
    mockPrisma.doneAction.update.mockResolvedValue({} as never);
    mockPrisma.user.update.mockResolvedValue({} as never);

    const req = makeRequest("PATCH", "/api/done/actions/1", { delta: 1 });
    const res = await PATCH(req, {
      params: Promise.resolve({ actionId: "1" }),
    });
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.ok).toBe(true);
    // count: 2 + 1 = 3 → update が呼ばれる
    expect(mockPrisma.doneAction.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { count: 3 } }),
    );
    // points: increment(pt * delta) = increment(5 * 1) = +5
    expect(mockPrisma.user.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { points: { increment: 5 } } }),
    );
  });

  it("delta=-1 で count が減少する", async () => {
    mockPrisma.doneAction.findUnique.mockResolvedValue(
      existingDoneAction as never,
    ); // count=2
    mockPrisma.doneAction.update.mockResolvedValue({} as never);
    mockPrisma.user.update.mockResolvedValue({} as never);

    const req = makeRequest("PATCH", "/api/done/actions/1", { delta: -1 });
    await PATCH(req, { params: Promise.resolve({ actionId: "1" }) });

    // count: 2 - 1 = 1 → update
    expect(mockPrisma.doneAction.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { count: 1 } }),
    );
  });

  it("count が 0 以下になったとき doneAction を削除する", async () => {
    mockPrisma.doneAction.findUnique.mockResolvedValue({
      ...existingDoneAction,
      count: 1, // count=1 で delta=-1 → 0 以下
    } satisfies DoneActionModel as never);
    mockPrisma.doneAction.delete.mockResolvedValue({} as never);
    mockPrisma.user.update.mockResolvedValue({} as never);

    const req = makeRequest("PATCH", "/api/done/actions/1", { delta: -1 });
    await PATCH(req, { params: Promise.resolve({ actionId: "1" }) });

    expect(mockPrisma.doneAction.delete).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: existingDoneAction.id } }),
    );
    expect(mockPrisma.doneAction.update).not.toHaveBeenCalled();
  });

  describe("バリデーション - 不正値で 400 を返す", () => {
    it.each([
      [{ delta: 0 }, "delta が 0"],
      [{ delta: 1.5 }, "delta が小数"],
      [{ delta: "1" }, "delta が文字列"],
      [{}, "delta が欠如"],
    ])("400 を返す: %s", async (body) => {
      const req = makeRequest("PATCH", "/api/done/actions/1", body);
      const res = await PATCH(req, {
        params: Promise.resolve({ actionId: "1" }),
      });
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.error).toBeDefined();
    });
  });

  it("doneAction が存在しない場合は { ok: true } を返す", async () => {
    mockPrisma.doneAction.findUnique.mockResolvedValue(null);

    const req = makeRequest("PATCH", "/api/done/actions/99", { delta: 1 });
    const res = await PATCH(req, {
      params: Promise.resolve({ actionId: "99" }),
    });
    const json = await res.json();

    expect(json.ok).toBe(true);
    expect(mockPrisma.doneAction.update).not.toHaveBeenCalled();
    expect(mockPrisma.user.update).not.toHaveBeenCalled();
  });

  it("DB保存済みの pt を使用する（クライアント値を信頼しない）", async () => {
    mockPrisma.doneAction.findUnique.mockResolvedValue({
      ...existingDoneAction,
      pt: 8, // DB に保存された pt
    } satisfies DoneActionModel as never);
    mockPrisma.doneAction.update.mockResolvedValue({} as never);
    mockPrisma.user.update.mockResolvedValue({} as never);

    const req = makeRequest("PATCH", "/api/done/actions/1", { delta: 1 });
    await PATCH(req, { params: Promise.resolve({ actionId: "1" }) });

    // DB の pt=8 で計算される
    expect(mockPrisma.user.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { points: { increment: 8 } } }),
    );
  });
});
