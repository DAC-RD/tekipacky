import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: {
      update: vi.fn(),
    },
  },
}));

import { prisma } from "@/lib/prisma";
import { PATCH } from "@/app/api/user/route";

const mockPrisma = vi.mocked(prisma, true);
const USER_ID = "test-user-123";

function makeRequest(body: unknown): NextRequest {
  return new NextRequest("http://localhost/api/user", {
    method: "PATCH",
    headers: {
      "x-user-id": USER_ID,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
}

describe("PATCH /api/user", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockPrisma.user.update.mockResolvedValue({} as never);
  });

  it("正常なモード変更で { ok: true } が返される", async () => {
    const req = makeRequest({ mode: "hard" });
    const res = await PATCH(req);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.ok).toBe(true);
  });

  it("easy モードに変更するとき EASY が DB に書き込まれる", async () => {
    const req = makeRequest({ mode: "easy" });
    await PATCH(req);

    expect(mockPrisma.user.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: { mode: "EASY" },
      }),
    );
  });

  it("normal モードに変更するとき NORMAL が DB に書き込まれる", async () => {
    const req = makeRequest({ mode: "normal" });
    await PATCH(req);

    expect(mockPrisma.user.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: { mode: "NORMAL" },
      }),
    );
  });

  it("hard モードに変更するとき HARD が DB に書き込まれる", async () => {
    const req = makeRequest({ mode: "hard" });
    await PATCH(req);

    expect(mockPrisma.user.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: { mode: "HARD" },
      }),
    );
  });

  it("userId が where 条件に含まれる", async () => {
    const req = makeRequest({ mode: "normal" });
    await PATCH(req);

    expect(mockPrisma.user.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: USER_ID },
      }),
    );
  });
});
