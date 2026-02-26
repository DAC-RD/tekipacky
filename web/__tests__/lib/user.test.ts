import { describe, it, expect } from "vitest";
import { NextRequest } from "next/server";
import { getUserId } from "@/lib/user";

describe("getUserId", () => {
  it("x-user-id ヘッダーが存在するとき正しく userId を返す", () => {
    const req = new NextRequest("http://localhost/api/test", {
      headers: { "x-user-id": "user-abc-123" },
    });
    expect(getUserId(req)).toBe("user-abc-123");
  });

  it("x-user-id ヘッダーが存在しないときエラーをスローする", () => {
    const req = new NextRequest("http://localhost/api/test");
    expect(() => getUserId(req)).toThrow("x-user-id header missing");
  });

  it("UUID 形式の userId を正しく返す", () => {
    const uuid = "550e8400-e29b-41d4-a716-446655440000";
    const req = new NextRequest("http://localhost/api/test", {
      headers: { "x-user-id": uuid },
    });
    expect(getUserId(req)).toBe(uuid);
  });
});
