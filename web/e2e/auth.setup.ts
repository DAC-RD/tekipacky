import { test as setup } from "@playwright/test";
import { encode } from "next-auth/jwt";
import { upsertTestUser } from "./db-helpers";
import { mkdirSync, writeFileSync } from "fs";

// ─────────────────────────────────────────────────────────────────────────────
// 認証セットアップ
// Playwright の storageState として有効な JWT Cookie を生成・保存する。
//
// NextAuth v5 は strategy: "jwt" を使用しており、セッションは DB には保存されない。
// AUTH_SECRET と同じ鍵で encode した JWE を Cookie に設定することで、
// ミドルウェア（proxy.ts）が認証済みと判断し、x-user-id ヘッダーを注入する。
//
// ※ ブラウザバイナリが不要になるよう storageState JSON を直接書き込む。
//   `request` フィクスチャは browser を必要としないため、このセットアップも
//   ブラウザなしで完結する。
// ─────────────────────────────────────────────────────────────────────────────

export const TEST_USER_ID = "e2e-test-user";

// playwright.config.ts の storageState と同じパス（config ファイル起点の相対パス）
const STORAGE_STATE = "playwright/.auth/user.json";

setup("authenticate", async () => {
  // 1. テストユーザーを DB に作成（pg 経由）
  await upsertTestUser(TEST_USER_ID);

  // 2. NextAuth v5 互換の JWE トークンを生成
  //    salt は Cookie 名に合わせる（proxy.ts が decode 時に同じ salt を使用）
  const token = await encode({
    token: { sub: TEST_USER_ID },
    secret: process.env.AUTH_SECRET!,
    salt: "authjs.session-token",
    maxAge: 24 * 60 * 60, // 1 日
  });

  // 3. storageState JSON をブラウザなしで直接書き込む
  mkdirSync("playwright/.auth", { recursive: true });
  writeFileSync(
    STORAGE_STATE,
    JSON.stringify({
      cookies: [
        {
          name: "authjs.session-token",
          value: token,
          domain: "localhost",
          path: "/",
          expires: -1,
          httpOnly: true,
          secure: false,
          sameSite: "Lax",
        },
      ],
      origins: [],
    }),
  );
});
