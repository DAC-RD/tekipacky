# Next.js APIルートテストパターン

Prismaをモックして Next.js App Router のAPIルートをテストする。

**実装例:** `web/__tests__/app/api/`

---

## セットアップ（Prismaのモック）

```typescript
import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// モジュールをモック化（importより前に記述）
vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: {
      findUniqueOrThrow: vi.fn(),
      update: vi.fn(),
    },
    action: {
      findUniqueOrThrow: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      findMany: vi.fn(),
    },
    doneAction: {
      upsert: vi.fn(),
      findUnique: vi.fn(),
      delete: vi.fn(),
      update: vi.fn(),
    },
    // ... 使用するモデルのみ定義
  },
}));

// モック後にimport
import { prisma } from "@/lib/prisma";
import { POST } from "@/app/api/done/actions/route";

// 型付きモック
const mockPrisma = vi.mocked(prisma, true);
```

**ポイント:**
- `vi.mock()` は `import` より前（ホイスティング）に実行される
- `vi.mocked(prisma, true)` で深いネストのモックも型付きになる
- テストで使うメソッドのみ定義すればよい

---

## パターン1: リクエストの作成

```typescript
const USER_ID = "test-user-123";

function makeRequest(body: unknown): NextRequest {
  return new NextRequest("http://localhost/api/done/actions", {
    method: "POST",
    headers: {
      "x-user-id": USER_ID,               // proxy が注入するヘッダー
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
}
```

**ポイント:**
- `new NextRequest()` でNext.jsのリクエストを作成できる
- `x-user-id` ヘッダーは proxy.ts が注入するため、テストでは手動でセット

---

## パターン2: 動的ルートのパラメータ渡し

動的ルート（`[id]`, `[actionId]` など）はパラメータを明示的に渡す:

```typescript
import { PUT, DELETE } from "@/app/api/actions/[id]/route";

it("PUT /api/actions/1 が呼ばれる", async () => {
  // params は Promise<{ id: string }> 形式
  const res = await PUT(req, { params: Promise.resolve({ id: "1" }) });
  const json = await res.json();
  expect(json.title).toBe("更新後のタイトル");
});
```

**ポイント:**
- Next.js 15+ では `params` が `Promise` 形式になった
- `Promise.resolve({ id: "1" })` で同期的に解決される Promise を渡す

---

## パターン3: Prismaモックの設定

```typescript
beforeEach(() => {
  vi.clearAllMocks(); // 各テスト前にモックをリセット

  // デフォルトのモック値を設定
  mockPrisma.user.findUniqueOrThrow.mockResolvedValue({
    id: USER_ID,
    timezone: "Asia/Tokyo",
    mode: "NORMAL",
    points: 100,
    createdAt: new Date(),
  } as never);
});

it("正常なリクエストで 200 を返す", async () => {
  // テスト固有のモックは it の中で設定
  mockPrisma.action.findUniqueOrThrow.mockResolvedValue({
    id: 1,
    userId: USER_ID,
    title: "朝ごはんを食べる",
    hurdle: 2,
    time: 3,
    desc: "",
    tags: [],
  } as never);
  mockPrisma.doneAction.upsert.mockResolvedValue({ ... } as never);
  mockPrisma.user.update.mockResolvedValue({} as never);

  const req = makeRequest({ actionId: 1 });
  const res = await POST(req);

  expect(res.status).toBe(200);
});
```

**ポイント:**
- `as never` でPrismaの返却型の厳密な一致を回避する
- `beforeEach` で共通モックを設定し、テスト固有のモックは `it` 内で設定
- `vi.clearAllMocks()` で各テスト間のモック状態をリセット

---

## パターン4: ビジネスロジックの検証（呼び出し引数の確認）

```typescript
it("サーバーサイドでポイントを計算する", async () => {
  // hurdle=3, time=4, normal: 3*4*1.0=12
  mockPrisma.action.findUniqueOrThrow.mockResolvedValue({
    id: 1, hurdle: 3, time: 4, ...
  } as never);
  mockPrisma.doneAction.upsert.mockResolvedValue({ pt: 12, ... } as never);
  mockPrisma.user.update.mockResolvedValue({} as never);

  const req = makeRequest({ actionId: 1 });
  await POST(req);

  // upsert の create.pt がサーバー計算値であることを確認
  expect(mockPrisma.doneAction.upsert).toHaveBeenCalledWith(
    expect.objectContaining({
      create: expect.objectContaining({ pt: 12 }),
    }),
  );
});
```

**ポイント:**
- `expect.objectContaining()` で部分一致を確認
- ネストした `objectContaining()` で深い構造も検証できる

---

## パターン5: エラーケースのテスト

```typescript
it("ポイント不足のとき 400 を返す", async () => {
  mockPrisma.user.findUniqueOrThrow.mockResolvedValue({
    points: 0, // 残高不足
    ...
  } as never);
  mockPrisma.reward.findUniqueOrThrow.mockResolvedValue({ ... } as never);

  const req = makeRequest({ rewardId: 1 });
  const res = await POST(req);

  expect(res.status).toBe(400);
  const json = await res.json();
  expect(json.error).toBe("insufficient points");
});

it("ポイント不足のとき doneReward.upsert が呼ばれない", async () => {
  // ...モック設定...
  const req = makeRequest({ rewardId: 1 });
  await POST(req);

  expect(mockPrisma.doneReward.upsert).not.toHaveBeenCalled();
});
```

---

## パターン6: セキュリティ検証（オーナーシップ確認）

```typescript
it("delete の where に userId が含まれる", async () => {
  mockPrisma.action.delete.mockResolvedValue({} as never);

  const req = makeDeleteRequest("42");
  await DELETE(req, { params: Promise.resolve({ id: "42" }) });

  expect(mockPrisma.action.delete).toHaveBeenCalledWith(
    expect.objectContaining({
      where: expect.objectContaining({
        id: 42,       // 数値に変換されること
        userId: USER_ID, // オーナーシップ確認のためuserIdが含まれること
      }),
    }),
  );
});
```

---

## パターン7: x-user-id ヘッダーなしのエラー

```typescript
it("x-user-id ヘッダーがない場合はエラー", async () => {
  const req = new NextRequest("http://localhost/api/done/actions", {
    method: "POST",
    headers: { "Content-Type": "application/json" }, // x-user-id を含まない
    body: JSON.stringify({ actionId: 1 }),
  });

  await expect(POST(req)).rejects.toThrow("x-user-id header missing");
});
```

---

## パターン8: NULL値の扱い（ソフト削除の確認）

```typescript
it("actionId が null の doneAction は除外される", async () => {
  mockPrisma.doneAction.findMany.mockResolvedValue([
    { id: 1, actionId: 1,    title: "存在する", pt: 1, count: 1, date: "...", userId: USER_ID },
    { id: 2, actionId: null, title: "削除済み", pt: 2, count: 1, date: "...", userId: USER_ID },
  ] as never);

  const req = makeRequest();
  const res = await GET(req);
  const json = await res.json();

  expect(json.doneActions).toHaveLength(1);
  expect(json.doneActions[0].title).toBe("存在する");
});
```

---

## Prismaモックの型エラー回避

Prismaのモックは返却型が厳密でエラーが出る場合がある。

```typescript
// ❌ 型エラーになる場合
mockPrisma.user.findUniqueOrThrow.mockResolvedValue({ id: "x", points: 100 });

// ✅ as never で回避
mockPrisma.user.findUniqueOrThrow.mockResolvedValue({ id: "x", points: 100 } as never);
```

テストで使用するフィールドのみを含む最小限のオブジェクトを渡す。

---

## 各APIルートで必要なモック一覧

| エンドポイント | 必要なPrismaモック |
|---|---|
| `GET /api/state` | user.findUniqueOrThrow, action.findMany, reward.findMany, doneAction.findMany, doneReward.findMany |
| `POST /api/done/actions` | user.findUniqueOrThrow, action.findUniqueOrThrow, doneAction.upsert, user.update |
| `POST /api/done/rewards` | user.findUniqueOrThrow, reward.findUniqueOrThrow, doneReward.upsert, user.update |
| `PATCH /api/done/actions/[id]` | user.findUniqueOrThrow, doneAction.findUnique, doneAction.delete/update, user.update |
| `PATCH /api/done/rewards/[id]` | user.findUniqueOrThrow, doneReward.findUnique, doneReward.delete/update, user.update |
| `POST /api/actions` | action.create |
| `PUT /api/actions/[id]` | action.update |
| `DELETE /api/actions/[id]` | action.delete |
| `POST /api/rewards` | reward.create |
| `PUT /api/rewards/[id]` | reward.update |
| `DELETE /api/rewards/[id]` | reward.delete |
| `PATCH /api/user` | user.update |
