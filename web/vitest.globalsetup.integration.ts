import { execSync } from "node:child_process";

// node_modules がホストに存在しないため @types/node を参照できない。
// TypeScript の型チェックのためにモジュールスコープで宣言する（実行時は Node.js グローバルを使用）。
declare const process: { env: Record<string, string | undefined> };

/** 統合テスト実行前にテスト用DBのスキーマをリセット＆再デプロイ */
export function setup() {
  const url = process.env.DATABASE_URL ?? "";

  // 誤って開発/本番DBに接続しないためのガード。
  // 統合テストは必ず npm run test:integration 経由で実行すること（dotenv-cli が .env.test を読み込む）。
  if (!url.includes("tekipacky_test")) {
    throw new Error(
      `[globalSetup] DATABASE_URL がテスト用DBを指していません。\n` +
        `現在の値: ${url || "(未設定)"}\n` +
        `統合テストは npm run test:integration で実行してください。`,
    );
  }

  execSync("npx prisma db push --force-reset --accept-data-loss", {
    stdio: "inherit",
  });
}
