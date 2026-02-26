# ポイントシステム仕様

## 概要

ユーザーは**行動を完了するとポイントを獲得**し、**ご褒美を消費するとポイントを使用**する。
ポイントはユーザーアカウントに累積され、日付をまたいでも持ち越される。

---

## 難易度モード

ユーザーはアカウント単位でモードを選択できる。モードによってポイントの獲得・消費倍率が変わる。

| モード | `earnMul`（獲得倍率） | `spendMul`（消費倍率） | 用途 |
|--------|----------------------|----------------------|------|
| イージー 🟢 | ×1.5 | ×0.7 | 励まし・リハビリ向け |
| ノーマル 🟡 | ×1.0 | ×1.0 | 標準 |
| ハード 🔴 | ×0.8 | ×1.5 | チャレンジ向け |

---

## ポイント計算式

### 行動ポイント（獲得）

```
pt = max(1, round(hurdle × time × earnMul))
```

| パラメータ | 説明 | 選択肢 |
|---|---|---|
| `hurdle` | 面倒くささ | 低=1, 中=2, 高=3 |
| `time` | かかる時間 | 5分=1, 15分=2, 30分=3, 1時間=4, 3時間=5, 3時間以上=6 |
| `earnMul` | モード倍率 | easy=1.5, normal=1.0, hard=0.8 |

**計算例（ノーマルモード）:**

| hurdle | time | pt |
|--------|------|----|
| 1 | 1 | 1 |
| 2 | 3 | 6 |
| 3 | 6 | 18 |

**実装箇所:** `web/lib/utils.ts` `calcActionPt()`

---

### ご褒美ポイント（消費）

```
pt = max(1, round(satisfaction × time × price × spendMul))
```

| パラメータ | 説明 | 選択肢 |
|---|---|---|
| `satisfaction` | 満足度 | 小=1, 中=2, 大=3 |
| `time` | かかる時間 | 行動と同じ6択 |
| `price` | 金額 | 0円=1, 500円以内=2, 1000円=3, 5000円=4, 1万円=5, 1万円以上=6 |
| `spendMul` | モード倍率 | easy=0.7, normal=1.0, hard=1.5 |

**計算例（ノーマルモード）:**

| satisfaction | time | price | pt |
|---|---|---|---|
| 1 | 1 | 1 | 1 |
| 2 | 2 | 1 | 4 |
| 3 | 6 | 6 | 108 |

**実装箇所:** `web/lib/utils.ts` `calcRewardPt()`

---

## サーバーサイド計算の原則

**ポイントは必ずサーバー側で計算する。クライアントの送信値は使用しない。**

```typescript
// ✅ サーバーで hurdle/time を取得して計算
const action = await prisma.action.findUniqueOrThrow({ where: { id: actionId } });
const pt = calcActionPt(action.hurdle, action.time, modeFromDb(user.mode));

// ❌ クライアントから pt を受け取ることはしない
// const { pt } = await req.json(); // ← やらない
```

理由: クライアント側でポイントを操作する不正を防ぐため。

---

## ポイント残高チェック

ご褒美消費時はサーバー側でも残高確認を行う。

```typescript
// web/app/api/done/rewards/route.ts
if (user.points < pt) {
  return NextResponse.json({ error: "insufficient points" }, { status: 400 });
}
```

フロント側（`useStore.ts`）でも事前チェックを行い楽観的更新を制御する：

```typescript
if (state.points < pt) return { pt, insufficient: true };
```

---

## 今日のログ（DoneAction / DoneReward）

- 行動・ご褒美の完了は日次ログとして記録する
- 同日・同行動の2回目完了は新規作成ではなく `count` をインクリメントする
- ユニーク制約: `(userId, actionId, date)` / `(userId, rewardId, date)`

```typescript
// upsert: 既存あれば count+1、なければ新規作成
await prisma.doneAction.upsert({
  where: { userId_actionId_date: { userId, actionId, date: today } },
  create: { userId, actionId, title, pt, count: 1, date: today },
  update: { count: { increment: 1 } },
});
```

### ログのカウント調整

ユーザーは今日のログの回数を手動で増減できる（誤操作の取り消し）。

- `count` が 0以下になった場合はレコードごと削除
- ポイント計算は**DBに保存済みの `pt` 値**を使用（再計算しない）

```typescript
// web/app/api/done/actions/[actionId]/route.ts
await prisma.user.update({
  data: { points: { increment: existing.pt * delta } },
});
```

### タイムゾーン対応

「今日」の判定はユーザーのタイムゾーンに基づく。

```typescript
// web/lib/utils.ts
export function getDateForTimezone(timezone: string): string {
  return new Intl.DateTimeFormat("ja-JP", {
    timeZone: timezone,
    year: "numeric", month: "2-digit", day: "2-digit",
  }).format(new Date()).replace(/\//g, "-"); // → "YYYY-MM-DD"
}
```

- ユーザーごとに `timezone` フィールドを持つ（デフォルト: `"Asia/Tokyo"`）
- 日付をまたいでも**ポイント残高は持ち越し**、ログのみリセット

---

## フロントエンドの楽観的更新

APIレスポンスを待たずに UI を即時更新する（UX向上）。

```typescript
// useStore.ts - completeAction
setState((prev) => ({
  ...prev,
  points: prev.points + pt,          // ← 即時反映
  doneActions: upsertDoneItem(...),   // ← 即時反映
}));
fetch("/api/done/actions", { ... }); // ← 非同期（待たない）
```
