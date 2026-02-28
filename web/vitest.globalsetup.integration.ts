import { execSync } from "node:child_process";

/** 統合テスト実行前にテスト用DBのスキーマをリセット＆再デプロイ */
export function setup() {
  execSync("npx prisma db push --force-reset --accept-data-loss", {
    stdio: "inherit",
  });
}
