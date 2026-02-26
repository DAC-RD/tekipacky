import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: {
      findUniqueOrThrow: vi.fn(),
      update: vi.fn(),
    },
    doneAction: {
      findUnique: vi.fn(),
      delete: vi.fn(),
      update: vi.fn(),
    },
  },
}));

import { prisma } from "@/lib/prisma";
import { PATCH } from "@/app/api/done/actions/[actionId]/route";

const mockPrisma = vi.mocked(prisma, true);
const USER_ID = "test-user-123";

function makeRequest(actionId: string, body: unknown): NextRequest {
  return new NextRequest(`http://localhost/api/done/actions/${actionId}`, {
    method: "PATCH",
    headers: {
      "x-user-id": USER_ID,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
}

const existingDoneAction = {
  id: 10,
  actionId: 1,
  userId: USER_ID,
  title: "朝ごはんを食べる",
  pt: 5,
  count: 2,
  date: "2024-01-15",
};

describe("PATCH /api/done/actions/[actionId]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockPrisma.user.findUniqueOrThrow.mockResolvedValue({
      id: USER_ID,
      timezone: "UTC",
      mode: "NORMAL",
      points: 50,
      createdAt: new Date(),
    } as never);
  });

  it("delta=+1 で count が増加し user.points が increment される", async () => {
    mockPrisma.doneAction.findUnique.mockResolvedValue(existingDoneAction as never);
    mockPrisma.doneAction.update.mockResolvedValue({} as never);
    mockPrisma.user.update.mockResolvedValue({} as never);

    const req = makeRequest("1", { delta: 1 });
    const res = await PATCH(req, { params: Promise.resolve({ actionId: "1" }) });
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
    mockPrisma.doneAction.findUnique.mockResolvedValue(existingDoneAction as never); // count=2
    mockPrisma.doneAction.update.mockResolvedValue({} as never);
    mockPrisma.user.update.mockResolvedValue({} as never);

    const req = makeRequest("1", { delta: -1 });
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
    } as never);
    mockPrisma.doneAction.delete.mockResolvedValue({} as never);
    mockPrisma.user.update.mockResolvedValue({} as never);

    const req = makeRequest("1", { delta: -1 });
    await PATCH(req, { params: Promise.resolve({ actionId: "1" }) });

    expect(mockPrisma.doneAction.delete).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: existingDoneAction.id } }),
    );
    expect(mockPrisma.doneAction.update).not.toHaveBeenCalled();
  });

  it("doneAction が存在しない場合は { ok: true } を返す", async () => {
    mockPrisma.doneAction.findUnique.mockResolvedValue(null as never);

    const req = makeRequest("99", { delta: 1 });
    const res = await PATCH(req, { params: Promise.resolve({ actionId: "99" }) });
    const json = await res.json();

    expect(json.ok).toBe(true);
    expect(mockPrisma.doneAction.update).not.toHaveBeenCalled();
    expect(mockPrisma.user.update).not.toHaveBeenCalled();
  });

  it("DB保存済みの pt を使用する（クライアント値を信頼しない）", async () => {
    mockPrisma.doneAction.findUnique.mockResolvedValue({
      ...existingDoneAction,
      pt: 8, // DB に保存された pt
    } as never);
    mockPrisma.doneAction.update.mockResolvedValue({} as never);
    mockPrisma.user.update.mockResolvedValue({} as never);

    const req = makeRequest("1", { delta: 1 });
    await PATCH(req, { params: Promise.resolve({ actionId: "1" }) });

    // DB の pt=8 で計算される
    expect(mockPrisma.user.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { points: { increment: 8 } } }),
    );
  });
});
