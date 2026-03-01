# 統合テストパターン（実 PostgreSQL）

単体テスト（Prismaモック）では検証できない、トランザクション・DB制約・CASCADE の
実挙動を実 PostgreSQL で検証する。

- 実行環境: Vitest + 実 PostgreSQL (port 5433, tmpfs)
- 設定ファイル: `web/vitest.config.integration.ts`
- 実装例: `web/__tests__/integration/`

---

## テスト環境のセットアップ

### docker-compose.test.yml

port 5433 の PostgreSQL コンテナをテスト専用で起動する。
`tmpfs` を使用してテスト速度を向上させる。

```bash
# テスト用 DB 起動（port 5433, tmpfs）
docker compose -f docker-compose.test.yml up -d

# 統合テスト実行（メイン app コンテナから実行。dotenv-cli が .env.test を読み込む）
docker compose exec app npm run test:integration

# テスト後に DB を停止
docker compose -f docker-compose.test.yml down
```

**注意:** `vitest.config.integration.ts` を直接 `npx vitest run` しないこと。
`npm run test:integration` を使うことで `dotenv -e .env.test` が確実に読み込まれ、test DB（`tekipacky_test`）のみに接続される。

### vitest.globalsetup.integration.ts

テスト実行前にスキーマを毎回クリーンにする。

```typescript
import { execSync } from "node:child_process";

declare const process: { env: Record<string, string | undefined> };

export function setup() {
  const url = process.env.DATABASE_URL ?? "";
  // 誤って開発/本番DBに接続しないためのガード
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
```

---

## パターン1: ユーザー分離（randomUUID + CASCADE DELETE）

テストごとに一意な userId を生成することで、並列実行時もテスト同士が干渉しない。

```typescript
import { randomUUID } from "node:crypto";
import { prisma } from "@/lib/prisma";

describe("done.ts (integration)", () => {
  let userId: string;
  let actionId: number;

  beforeEach(async () => {
    userId = randomUUID();  // テストごとに一意な userId
    await prisma.user.create({
      data: { id: userId, timezone: "Asia/Tokyo", mode: "NORMAL", points: 0 },
    });
    const action = await prisma.action.create({
      data: { userId, title: "テスト行動", hurdle: 2, time: 3, tags: [] },
    });
    actionId = action.id;
  });

  afterEach(async () => {
    await prisma.user.delete({ where: { id: userId } });
    // User の CASCADE DELETE で DoneAction / DoneReward / Action / Reward も全削除
  });
});
```

**ポイント:**
- `randomUUID()` で毎回異なる userId を生成
- `afterEach` で user を削除するだけで関連レコードも CASCADE 削除される
- `beforeEach` / `afterEach` なので各テストが独立したクリーンな状態から開始する

---

## パターン2: SetNull cascade の検証

Action/Reward を削除すると `DoneAction.actionId` / `DoneReward.rewardId` が NULL になる
（Prisma の `onDelete: SetNull`）。`/api/state` はこの NULL レコードをフィルタで除外する。

```typescript
const today = getDateForTimezone("Asia/Tokyo");

it("Action 削除後、DoneAction.actionId が NULL になること", async () => {
  await prisma.doneAction.create({
    data: { userId, actionId, title: "テスト行動", pt: 6, count: 1, date: today },
  });

  await prisma.action.delete({ where: { id: actionId } });

  const done = await prisma.doneAction.findFirst({ where: { userId } });
  expect(done).not.toBeNull();       // レコード自体は残る
  expect(done?.actionId).toBeNull(); // actionId が NULL になっている
});

it("actionId=NULL の DoneAction は /api/state のフィルタで除外されること", async () => {
  await prisma.doneAction.create({
    data: { userId, actionId, title: "テスト行動", pt: 6, count: 1, date: today },
  });
  await prisma.action.delete({ where: { id: actionId } });

  const allDones = await prisma.doneAction.findMany({ where: { userId, date: today } });
  // /api/state と同じフィルタを適用
  const filtered = allDones.filter((d) => d.actionId !== null);
  expect(filtered).toHaveLength(0);
});

it("有効な DoneAction は SetNull の影響を受けないこと", async () => {
  const action2 = await prisma.action.create({
    data: { userId, title: "行動2", hurdle: 1, time: 1, tags: [] },
  });
  // actionId（削除対象）と action2.id（残す）の 2 件の DoneAction を作成
  await prisma.doneAction.create({
    data: { userId, actionId, title: "テスト行動", pt: 6, count: 1, date: today },
  });
  await prisma.doneAction.create({
    data: { userId, actionId: action2.id, title: "行動2", pt: 1, count: 1, date: today },
  });

  await prisma.action.delete({ where: { id: actionId } });

  const allDones = await prisma.doneAction.findMany({ where: { userId, date: today } });
  const filtered = allDones.filter((d) => d.actionId !== null);
  expect(filtered).toHaveLength(1);         // action2 の DoneAction が残る
  expect(filtered[0].actionId).toBe(action2.id);
});
```

**ポイント:**
- 単体テスト（モック）では CASCADE の実挙動を再現できないため統合テストで確認する
- `/api/state` と全く同じフィルタ式 `.filter((d) => d.actionId !== null)` を使ってテストする

実装例: [`web/__tests__/integration/state.test.ts`](../../../web/__tests__/integration/state.test.ts)

---

## パターン3: 日付フィルタリングの検証

`/api/state` は `where: { userId, date: today }` で当日分の Done のみ返す。
過去の Done が混入しないことを実 DB で確認する。

```typescript
import { getDateForTimezone } from "@/lib/server/transforms";

const today = getDateForTimezone("Asia/Tokyo");
const pastDate = "2024-01-01"; // 明らかに過去の日付

it("過去の DoneAction は today フィルタで取得されないこと", async () => {
  await prisma.doneAction.create({
    data: { userId, actionId, title: "過去の行動", pt: 6, count: 1, date: pastDate },
  });

  const todayDones = await prisma.doneAction.findMany({ where: { userId, date: today } });
  expect(todayDones).toHaveLength(0);
});

it("今日の DoneAction は today フィルタで取得されること", async () => {
  await prisma.doneAction.create({
    data: { userId, actionId, title: "今日の行動", pt: 6, count: 1, date: today },
  });

  const todayDones = await prisma.doneAction.findMany({ where: { userId, date: today } });
  expect(todayDones).toHaveLength(1);
});
```

**ポイント:**
- `date` カラムは `YYYY-MM-DD` 形式の文字列（`String` 型）で保存
- `getDateForTimezone` の単体テストでタイムゾーン変換ロジックはカバー済み
- 統合テストでは「Prismaクエリが正しくフィルタすること」を確認する

実装例: [`web/__tests__/integration/state.test.ts`](../../../web/__tests__/integration/state.test.ts)

---

## パターン4: モード別 earnMul/spendMul の DB 反映

API ルートはサーバー側で `calcActionPt` / `calcRewardPt` を呼んで pt を算出し、
`upsertDoneAction` / `upsertDoneReward` に渡す。
このテストでは「モード別に異なる pt が正しく DB に保存されること」を検証する。

```typescript
import { calcActionPt, calcRewardPt } from "@/lib/utils";
import { upsertDoneAction, upsertDoneReward } from "@/lib/done";

it("EASY モード(earnMul=1.5): calcActionPt の値が DB に保存されること", async () => {
  const pt = calcActionPt(2, 3, "easy"); // Math.round(2 * 3 * 1.5) = 9
  expect(pt).toBe(9);

  await upsertDoneAction(userId, actionId, today, "テスト行動", pt);

  const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
  expect(user.points).toBe(9);

  const done = await prisma.doneAction.findFirst({ where: { userId } });
  expect(done?.pt).toBe(9);
});

it("HARD モード(earnMul=0.8): calcActionPt の値が DB に保存されること", async () => {
  const pt = calcActionPt(2, 3, "hard"); // Math.round(2 * 3 * 0.8) = 5
  expect(pt).toBe(5);

  await upsertDoneAction(userId, actionId, today, "テスト行動", pt);

  const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
  expect(user.points).toBe(5);
});
```

**ポイント:**
- `calcActionPt` / `calcRewardPt` を import して期待値を動的に算出する（マジックナンバーを避ける）
- `User.points` の更新とDone レコードの `pt` 保存の両方を確認する

実装例: [`web/__tests__/integration/done.test.ts`](../../../web/__tests__/integration/done.test.ts)

---

## パターン5: 境界値テスト（count が閾値をまたぐ）

`adjustDoneReward` は count が 0 以下になるとレコードを削除し、そうでなければ更新する。
count=2→1 の場合（レコード残存）と count=1→0 の場合（レコード削除）を両方確認する。

```typescript
// count=1→0: レコード削除
it("delta=-1 で count=0 になるとレコードを削除し points を復元する", async () => {
  await prisma.user.update({ where: { id: userId }, data: { points: 10 } });
  await upsertDoneReward(userId, rewardId, today, "テストご褒美", 4); // points: 6, count: 1

  await adjustDoneReward(userId, rewardId, today, -1);

  const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
  expect(user.points).toBe(10); // 6 + 4 = 10（ポイント返還）

  const done = await prisma.doneReward.findFirst({ where: { userId } });
  expect(done).toBeNull(); // レコード削除済み
});

// count=2→1: レコード残存
it("delta=-1 で count=2→1 のとき、レコードが残り pt 分返還されること", async () => {
  await prisma.user.update({ where: { id: userId }, data: { points: 20 } });

  await upsertDoneReward(userId, rewardId, today, "テストご褒美", 4); // count=1
  await upsertDoneReward(userId, rewardId, today, "テストご褒美", 4); // count=2
  // points: 20 - 4 - 4 = 12

  await adjustDoneReward(userId, rewardId, today, -1);
  // delta=-1 → points: 12 + 4 = 16、count: 1

  const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
  expect(user.points).toBe(16);

  const done = await prisma.doneReward.findFirst({ where: { userId } });
  expect(done).not.toBeNull();   // レコードが残る
  expect(done?.count).toBe(1);
});
```

**ポイント:**
- count の閾値（0 以下でレコード削除）は単体テスト（モック）でも確認できるが、
  実際の `$transaction` とポイント演算の組み合わせは統合テストで確認する
- `points === pt` でちょうど 0 になる境界値ケースも確認する

実装例: [`web/__tests__/integration/done.test.ts`](../../../web/__tests__/integration/done.test.ts)
