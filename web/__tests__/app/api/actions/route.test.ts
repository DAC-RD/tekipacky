import { describe, it, expect, vi, beforeEach } from "vitest";
import { makeRequest } from "../../../helpers/request";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    action: {
      create: vi.fn(),
    },
  },
}));

import { prisma } from "@/lib/prisma";
import { POST } from "@/app/api/actions/route";

const mockPrisma = vi.mocked(prisma, true);
const USER_ID = "test-user-123";

describe("POST /api/actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("正常なリクエストでアクションが作成される", async () => {
    const created = {
      id: 1,
      userId: USER_ID,
      title: "朝ごはんを食べる",
      desc: "",
      tags: [],
      hurdle: 1,
      time: 1,
    };
    mockPrisma.action.create.mockResolvedValue(created as never);

    const req = makeRequest("POST", "/api/actions", {
      title: "朝ごはんを食べる",
      hurdle: 1,
      time: 1,
    });
    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.title).toBe("朝ごはんを食べる");
    expect(json.id).toBe(1);
  });

  it("desc が省略されたときデフォルト空文字が設定される", async () => {
    const created = {
      id: 1,
      userId: USER_ID,
      title: "テスト",
      desc: "",
      tags: [],
      hurdle: 1,
      time: 1,
    };
    mockPrisma.action.create.mockResolvedValue(created as never);

    const req = makeRequest("POST", "/api/actions", {
      title: "テスト",
      hurdle: 1,
      time: 1,
    }); // desc 省略
    await POST(req);

    expect(mockPrisma.action.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ desc: "" }),
      }),
    );
  });

  it("tags が省略されたときデフォルト空配列が設定される", async () => {
    const created = {
      id: 1,
      userId: USER_ID,
      title: "テスト",
      desc: "",
      tags: [],
      hurdle: 1,
      time: 1,
    };
    mockPrisma.action.create.mockResolvedValue(created as never);

    const req = makeRequest("POST", "/api/actions", {
      title: "テスト",
      hurdle: 1,
      time: 1,
    }); // tags 省略
    await POST(req);

    expect(mockPrisma.action.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ tags: [] }),
      }),
    );
  });

  it("userId が create データに含まれる", async () => {
    const created = {
      id: 1,
      userId: USER_ID,
      title: "テスト",
      desc: "",
      tags: [],
      hurdle: 1,
      time: 1,
    };
    mockPrisma.action.create.mockResolvedValue(created as never);

    const req = makeRequest("POST", "/api/actions", {
      title: "テスト",
      hurdle: 1,
      time: 1,
    });
    await POST(req);

    expect(mockPrisma.action.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ userId: USER_ID }),
      }),
    );
  });
});
