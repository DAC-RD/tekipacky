import { test, expect } from "@playwright/test";

// ─────────────────────────────────────────────────────────────────────────────
// API スモークテスト（認証保護の確認）
// request fixture を使用するためブラウザのインストール不要で実行可能
// ─────────────────────────────────────────────────────────────────────────────

test.describe("認証保護された API エンドポイント", () => {
  test("GET /api/state は認証なしでアクセス拒否される", async ({ request }) => {
    const response = await request.get("/api/state");
    // NextAuth ミドルウェアが認証なしのリクエストを拒否すること（200 以外）
    expect(response.status()).not.toBe(200);
  });

  test("POST /api/done/actions は認証なしでアクセス拒否される", async ({
    request,
  }) => {
    const response = await request.post("/api/done/actions", {
      data: { actionId: 1 },
    });
    expect(response.status()).not.toBe(200);
  });

  test("PATCH /api/user は認証なしでアクセス拒否される", async ({
    request,
  }) => {
    const response = await request.patch("/api/user", {
      data: { mode: "easy" },
    });
    expect(response.status()).not.toBe(200);
  });
});
