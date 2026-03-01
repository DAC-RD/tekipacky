# E2Eテストパターン（Playwright）

実際の HTTP リクエストで認証フロー・API 保護・ビジネスロジック（ポイント増減）を
エンドツーエンドで検証する。`request` フィクスチャを使用するためブラウザ起動は不要。

- 実行環境: Playwright + 開発サーバー (port 3000) + 開発DB (port 5432)
- 設定ファイル: `web/playwright.config.ts`
- 実装例: `web/e2e/`

---

## プロジェクト構成（playwright.config.ts）

3 プロジェクト構成で、`setup` が先行実行されてから `public` と `authenticated` が実行される。

```typescript
projects: [
  // 1. 認証セットアップ（他のプロジェクトより先に実行）
  {
    name: "setup",
    testMatch: /auth\.setup\.ts/,
    use: { ...devices["Desktop Chrome"] },
  },
  // 2. 認証不要テスト（API 保護スモーク）
  {
    name: "public",
    testMatch: /public\.spec\.ts/,
    use: { ...devices["Desktop Chrome"] },
  },
  // 3. 認証済み API フロー（setup に依存）
  {
    name: "authenticated",
    testMatch: /api-flow\.spec\.ts/,
    dependencies: ["setup"],
    use: {
      ...devices["Desktop Chrome"],
      storageState: "playwright/.auth/user.json",
    },
  },
],
webServer: {
  command: "npm run dev",
  url: "http://localhost:3000",
  reuseExistingServer: true,
},
```

**ポイント:**
- `authenticated` プロジェクトは `setup` の完了後に実行される（`dependencies`）
- `storageState` で認証済み Cookie を全テストに適用する
- `reuseExistingServer: true` で既存の開発サーバーを再利用できる

---

## パターン1: DB ヘルパー（e2e/db-helpers.ts）

Playwright は Prisma ESM クライアント（`import.meta.url` を使用）をロードできないため、
`pg` を直接使用して DB 操作を行う。

```typescript
import { Pool } from "pg";

function createPool(): Pool {
  return new Pool({ connectionString: process.env.DATABASE_URL! });
}

export async function createTestAction(
  userId: string,
  params: { title: string; hurdle: number; time: number },
): Promise<number> {
  const pool = createPool();
  try {
    const result = await pool.query(
      // "desc" は PostgreSQL 予約語のためダブルクォートが必須
      `INSERT INTO "Action" ("userId", title, "desc", tags, hurdle, time, "createdAt", "updatedAt")
       VALUES ($1, $2, '', ARRAY[]::text[], $3, $4, NOW(), NOW()) RETURNING id`,
      [userId, params.title, params.hurdle, params.time],
    );
    return result.rows[0].id as number;
  } finally {
    await pool.end(); // 1 操作ごとに接続を閉じる
  }
}
```

**ポイント:**
- `pg` を Prisma の代わりに使用する（ESM 互換性のため）
- `Pool` は 1 操作ごとに `createPool()` → `pool.end()` で作成・破棄する
- PostgreSQL 予約語（`desc`）はダブルクォートでエスケープする
- `DATABASE_URL` は開発 DB（port 5432）を指す

**提供するヘルパー関数:**

| 関数 | 説明 |
|------|------|
| `upsertTestUser(userId)` | User を INSERT（ON CONFLICT DO NOTHING） |
| `resetTestUser(userId)` | User.points=0, mode='NORMAL' にリセット |
| `setTestUserPoints(userId, points)` | User.points を任意の値に設定 |
| `cleanTestUserData(userId)` | DoneAction/DoneReward/Action/Reward を全削除 |
| `createTestAction(userId, params)` | Action を INSERT して id を返す |
| `createTestReward(userId, params)` | Reward を INSERT して id を返す |

実装例: [`web/e2e/db-helpers.ts`](../../../web/e2e/db-helpers.ts)

---

## パターン2: 認証セットアップ（e2e/auth.setup.ts）

NextAuth v5 の JWT strategy に合わせ、`next-auth/jwt` の `encode()` で JWE トークンを生成し、
storageState JSON として直接書き込む（ブラウザ起動不要）。

```typescript
import { test as setup } from "@playwright/test";
import { encode } from "next-auth/jwt";
import { upsertTestUser } from "./db-helpers";
import { mkdirSync, writeFileSync } from "fs";

export const TEST_USER_ID = "e2e-test-user";
const STORAGE_STATE = "playwright/.auth/user.json";

setup("authenticate", async () => {
  // 1. テストユーザーを DB に作成
  await upsertTestUser(TEST_USER_ID);

  // 2. NextAuth v5 互換の JWE トークンを生成
  //    salt は proxy.ts が decode 時に使う Cookie 名と合わせる
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
```

**ポイント:**
- `proxy.ts`（NextAuth ミドルウェア）が `authjs.session-token` Cookie を decode して認証判定する
- `encode()` の `salt` は Cookie 名と同じ `"authjs.session-token"` にする（decode 時の salt と一致が必要）
- `browser` フィクスチャが不要なため高速。`writeFileSync` で storageState を直接書き込む
- `playwright/.auth/` は `.gitignore` に追加する（セッション情報のため）

実装例: [`web/e2e/auth.setup.ts`](../../../web/e2e/auth.setup.ts)

---

## パターン3: 認証保護スモーク（e2e/public.spec.ts）

ミドルウェアが未認証リクエストを正しく拒否することを確認する。
storageState を使用しない（`public` プロジェクトで実行）。

```typescript
import { test, expect } from "@playwright/test";

test.describe("認証保護された API エンドポイント", () => {
  test("GET /api/state は認証なしでアクセス拒否される", async ({ request }) => {
    const response = await request.get("/api/state");
    // 200 以外（401 またはリダイレクト）が返ること
    expect(response.status()).not.toBe(200);
  });

  test("POST /api/done/actions は認証なしでアクセス拒否される", async ({ request }) => {
    const response = await request.post("/api/done/actions", {
      data: { actionId: 1 },
    });
    expect(response.status()).not.toBe(200);
  });
});
```

**ポイント:**
- `request` フィクスチャのみ使用（ブラウザ不要）
- 具体的なステータスコード（401 など）ではなく `not.toBe(200)` でテストする
  （リダイレクト挙動が変わっても壊れにくい）

実装例: [`web/e2e/public.spec.ts`](../../../web/e2e/public.spec.ts)

---

## パターン4: 認証済み API フロー（e2e/api-flow.spec.ts）

状態依存のフロー（ポイント増加 → 消費 → 削除）を `test.describe.serial` で順序実行する。

### セットアップ・クリーンアップ

```typescript
const TEST_USER_ID = "e2e-test-user"; // auth.setup.ts と同じ値

test.describe.serial("認証済み API フロー", () => {
  let actionId: number;
  let rewardId: number;

  test.beforeAll(async () => {
    // クリーンな状態から開始
    await resetTestUser(TEST_USER_ID);
    await cleanTestUserData(TEST_USER_ID);

    actionId = await createTestAction(TEST_USER_ID, {
      title: "E2Eテスト行動",
      hurdle: 2,
      time: 3,
    });
    rewardId = await createTestReward(TEST_USER_ID, {
      title: "E2Eテストご褒美",
      satisfaction: 2,
      time: 2,
      price: 2,
    });
  });

  test.afterAll(async () => {
    await cleanTestUserData(TEST_USER_ID);
    await resetTestUser(TEST_USER_ID);
  });
});
```

### GET /api/state の構造確認

```typescript
test("GET /api/state → 200 で正しい構造が返ること", async ({ request }) => {
  const res = await request.get("/api/state");
  expect(res.ok()).toBe(true);

  const body = await res.json();
  expect(body).toMatchObject({
    points: 0,
    mode: "normal",
    actions: expect.arrayContaining([
      expect.objectContaining({ id: actionId, title: "E2Eテスト行動" }),
    ]),
    doneActions: [],
    doneRewards: [],
  });
});
```

### POST /api/done/actions とポイント加算確認

```typescript
test("POST /api/done/actions → 200 でポイントが加算されること", async ({ request }) => {
  const res = await request.post("/api/done/actions", { data: { actionId } });
  expect(res.ok()).toBe(true);

  const doneItem = await res.json();
  expect(doneItem.pt).toBe(6);  // hurdle=2, time=3, normal → 2*3*1.0 = 6
  expect(doneItem.count).toBe(1);

  // GET /api/state でポイント反映を確認
  const stateRes = await request.get("/api/state");
  const state = await stateRes.json();
  expect(state.points).toBe(6);
});
```

### ポイント不足時の 400 エラー確認

```typescript
test("POST /api/done/rewards (ポイント不足) → 400 と insufficient points エラー", async ({ request }) => {
  // DB ヘルパーでポイントを 0 に強制設定
  await setTestUserPoints(TEST_USER_ID, 0);

  const res = await request.post("/api/done/rewards", { data: { rewardId } });
  expect(res.status()).toBe(400);

  const body = await res.json();
  expect(body.error).toBe("insufficient points");
});
```

### DELETE と SetNull cascade の確認

```typescript
test(
  "DELETE /api/actions/[id] → actions から消え、doneActions も SetNull+フィルタで除外されること",
  async ({ request }) => {
    const deleteRes = await request.delete(`/api/actions/${actionId}`);
    expect(deleteRes.ok()).toBe(true);

    const stateRes = await request.get("/api/state");
    const state = await stateRes.json();

    // actions 配列から削除済みアクションが消えていること
    expect(
      state.actions.find((a: { id: number }) => a.id === actionId),
    ).toBeUndefined();

    // doneActions から SetNull + filter で除外されること
    expect(
      state.doneActions.find((d: { id: number }) => d.id === actionId),
    ).toBeUndefined();
  },
);
```

**ポイント:**
- `test.describe.serial` で各テストが前のテストの DB 状態に依存する順序フロー
- `setTestUserPoints` で DB ヘルパーから直接ポイントを操作して境界値ケースを作る
- `beforeAll` / `afterAll` でテストデータを管理（`beforeEach` ではなく `beforeAll`）
- E2E の DB は開発 DB なので `cleanTestUserData` で必ずクリーンアップする

実装例: [`web/e2e/api-flow.spec.ts`](../../../web/e2e/api-flow.spec.ts)

---

## テスト実行コマンド

```bash
# 開発サーバーが必要（事前に起動）
docker compose up -d

# 全 E2E テスト
docker compose exec app npx playwright test --reporter=line

# プロジェクト別
docker compose exec app npx playwright test --project=setup
docker compose exec app npx playwright test --project=public
docker compose exec app npx playwright test --project=authenticated

# 失敗時のデバッグ（HTML レポート）
docker compose exec app npx playwright test --reporter=html
```

---

## 注意事項

| 項目 | 内容 |
|------|------|
| DB 汚染対策 | `beforeAll` / `afterAll` で `cleanTestUserData` + `resetTestUser` を必ず呼ぶ |
| 固定ユーザー ID | `"e2e-test-user"` を使用（auth.setup.ts と api-flow.spec.ts で同じ値） |
| Prisma 使用禁止 | E2E ファイルでは `@/lib/prisma` をインポートしない（ESM 非互換） |
| storageState | `playwright/.auth/` は `.gitignore` に追加済み |
| 並列実行 | `api-flow.spec.ts` は `serial` のため並列不可。`public.spec.ts` は並列可 |
