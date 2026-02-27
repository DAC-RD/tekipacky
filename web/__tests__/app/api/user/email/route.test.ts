import { describe, it, expect, vi, beforeEach } from "vitest";
import { makeRequest } from "../../../../helpers/request";
import type { UserModel } from "@/app/generated/prisma/models";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: {
      findUniqueOrThrow: vi.fn(),
      findUnique: vi.fn(),
    },
    verificationToken: {
      deleteMany: vi.fn(),
      create: vi.fn(),
    },
  },
}));

import { prisma } from "@/lib/prisma";
import { POST } from "@/app/api/user/email/route";

const mockPrisma = vi.mocked(prisma, true);
const USER_ID = "test-user-123";
const CURRENT_EMAIL = "current@example.com";

const mockUser: UserModel = {
  id: USER_ID,
  name: null,
  email: CURRENT_EMAIL,
  emailVerified: null,
  timezone: "Asia/Tokyo",
  mode: "NORMAL",
  points: 0,
  createdAt: new Date(),
  updatedAt: new Date(),
};

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true }));
  mockPrisma.user.findUniqueOrThrow.mockResolvedValue(mockUser as never);
  mockPrisma.user.findUnique.mockResolvedValue(null);
  mockPrisma.verificationToken.deleteMany.mockResolvedValue({ count: 0 });
  mockPrisma.verificationToken.create.mockResolvedValue({} as never);
});

describe("POST /api/user/email", () => {
  it("正常なリクエストで { ok: true } が返される", async () => {
    const req = makeRequest("POST", "/api/user/email", {
      newEmail: "new@example.com",
    });
    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.ok).toBe(true);
  });

  it("VerificationToken が作成される", async () => {
    const req = makeRequest("POST", "/api/user/email", {
      newEmail: "new@example.com",
    });
    await POST(req);

    expect(mockPrisma.verificationToken.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          identifier: expect.stringContaining("email-change:"),
        }),
      }),
    );
  });

  it("Resend API が呼ばれる", async () => {
    const req = makeRequest("POST", "/api/user/email", {
      newEmail: "new@example.com",
    });
    await POST(req);

    expect(fetch).toHaveBeenCalledWith(
      "https://api.resend.com/emails",
      expect.objectContaining({ method: "POST" }),
    );
  });

  it("不正なメール形式は 400 を返す", async () => {
    const req = makeRequest("POST", "/api/user/email", {
      newEmail: "not-an-email",
    });
    const res = await POST(req);

    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toBeTruthy();
  });

  it("現在と同じメールアドレスは 400 を返す", async () => {
    const req = makeRequest("POST", "/api/user/email", {
      newEmail: CURRENT_EMAIL,
    });
    const res = await POST(req);

    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toContain("同じ");
  });

  it("既に使用済みのメールアドレスは 400 を返す", async () => {
    mockPrisma.user.findUnique.mockResolvedValue(mockUser as never);

    const req = makeRequest("POST", "/api/user/email", {
      newEmail: "taken@example.com",
    });
    const res = await POST(req);

    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toContain("使用されています");
  });

  it("newEmail が空文字のとき 400 を返す", async () => {
    const req = makeRequest("POST", "/api/user/email", { newEmail: "" });
    const res = await POST(req);

    expect(res.status).toBe(400);
  });
});
