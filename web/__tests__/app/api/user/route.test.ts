import { describe, it, expect, vi, beforeEach } from "vitest";
import { makeRequest } from "../../../helpers/request";
import type { UserModel } from "@/app/generated/prisma/models";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: {
      update: vi.fn(),
      findUniqueOrThrow: vi.fn(),
      delete: vi.fn(),
    },
  },
}));

import { prisma } from "@/lib/prisma";
import { GET, PATCH, DELETE } from "@/app/api/user/route";

const mockPrisma = vi.mocked(prisma, true);
const USER_ID = "test-user-123";

describe("PATCH /api/user", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockPrisma.user.update.mockResolvedValue({} as never);
  });

  it("正常なモード変更で { ok: true } が返される", async () => {
    const req = makeRequest("PATCH", "/api/user", { mode: "hard" });
    const res = await PATCH(req);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.ok).toBe(true);
  });

  it("easy モードに変更するとき EASY が DB に書き込まれる", async () => {
    const req = makeRequest("PATCH", "/api/user", { mode: "easy" });
    await PATCH(req);

    expect(mockPrisma.user.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: { mode: "EASY" },
      }),
    );
  });

  it("normal モードに変更するとき NORMAL が DB に書き込まれる", async () => {
    const req = makeRequest("PATCH", "/api/user", { mode: "normal" });
    await PATCH(req);

    expect(mockPrisma.user.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: { mode: "NORMAL" },
      }),
    );
  });

  it("hard モードに変更するとき HARD が DB に書き込まれる", async () => {
    const req = makeRequest("PATCH", "/api/user", { mode: "hard" });
    await PATCH(req);

    expect(mockPrisma.user.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: { mode: "HARD" },
      }),
    );
  });

  it("userId が where 条件に含まれる", async () => {
    const req = makeRequest("PATCH", "/api/user", { mode: "normal" });
    await PATCH(req);

    expect(mockPrisma.user.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: USER_ID },
      }),
    );
  });
});

describe("GET /api/user", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockPrisma.user.findUniqueOrThrow.mockResolvedValue({
      id: USER_ID,
      name: null,
      email: "test@example.com",
      emailVerified: null,
      timezone: "Asia/Tokyo",
      mode: "NORMAL",
      points: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    } satisfies UserModel as never);
  });

  it("{ email } が返される", async () => {
    const req = makeRequest("GET", "/api/user");
    const res = await GET(req);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.email).toBe("test@example.com");
  });

  it("userId が where 条件に含まれる", async () => {
    const req = makeRequest("GET", "/api/user");
    await GET(req);

    expect(mockPrisma.user.findUniqueOrThrow).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: USER_ID },
      }),
    );
  });
});

describe("DELETE /api/user", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockPrisma.user.delete.mockResolvedValue({} as never);
  });

  it("{ ok: true } が返される", async () => {
    const req = makeRequest("DELETE", "/api/user");
    const res = await DELETE(req);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.ok).toBe(true);
  });

  it("userId を条件に user.delete が呼ばれる", async () => {
    const req = makeRequest("DELETE", "/api/user");
    await DELETE(req);

    expect(mockPrisma.user.delete).toHaveBeenCalledWith({
      where: { id: USER_ID },
    });
  });
});
