# データモデル

Prismaスキーマ（`web/prisma/schema.prisma`）に基づくデータモデルの説明。

---

## ER図（概略）

```
User
 ├── Action[]         (1:N) ─→ DoneAction  (1:N, nullable)
 ├── Reward[]         (1:N) ─→ DoneReward  (1:N, nullable)
 ├── DoneAction[]     (1:N)
 ├── DoneReward[]     (1:N)
 ├── Account[]        (1:N) ← NextAuth 認証アカウント
 └── Session[]        (1:N) ← NextAuth セッション（JWT戦略では実質不使用）

VerificationToken  ← NextAuth メールマジックリンクトークン（UserとのFK無し）
```

---

## テーブル定義

### User（ユーザー）

| カラム | 型 | デフォルト | 説明 |
|---|---|---|---|
| `id` | String (CUID) | 自動生成 | プライマリキー |
| `name` | String? | null | 表示名（NextAuth 標準フィールド、未使用） |
| `email` | String? @unique | null | メールアドレス（Resend 認証で使用） |
| `emailVerified` | DateTime? | null | メール確認日時（NextAuth 管理） |
| `timezone` | String | `"Asia/Tokyo"` | タイムゾーン（IANA形式） |
| `points` | Int | `0` | 現在のポイント残高 |
| `mode` | Enum (Mode) | `NORMAL` | 難易度モード |
| `createdAt` | DateTime | now() | 作成日時 |
| `updatedAt` | DateTime | 自動更新 | 更新日時 |

**リレーション:** actions, rewards, doneActions, doneRewards（全てカスケード削除）、accounts, sessions（NextAuth 用、カスケード削除）

**認証:** NextAuth v5 + Resend によるメールマジックリンク認証。JWT セッション戦略を採用。

---

### Account（認証アカウント）

NextAuth の PrismaAdapter が管理する標準テーブル。

| カラム | 型 | 説明 |
|---|---|---|
| `userId` | String | ユーザーFK |
| `type` | String | プロバイダー種別（"email" 等） |
| `provider` | String | プロバイダー名（"resend" 等） |
| `providerAccountId` | String | プロバイダー側のアカウントID |
| `createdAt` | DateTime | 作成日時 |
| `updatedAt` | DateTime | 更新日時 |

**プライマリキー:** `(provider, providerAccountId)`

---

### Session（セッション）

NextAuth の PrismaAdapter が管理する標準テーブル。JWT 戦略を採用しているため実質的には未使用。

| カラム | 型 | 説明 |
|---|---|---|
| `sessionToken` | String @unique | セッショントークン |
| `userId` | String | ユーザーFK |
| `expires` | DateTime | 有効期限 |

---

### VerificationToken（メール検証トークン）

マジックリンク認証のトークン管理。User との FK はなく、NextAuth が自動管理する。

| カラム | 型 | 説明 |
|---|---|---|
| `identifier` | String | 識別子（メールアドレス等） |
| `token` | String | 検証トークン |
| `expires` | DateTime | 有効期限（マジックリンク・メール変更トークンともに **1時間**） |

**プライマリキー:** `(identifier, token)`

---

### Action（行動）

| カラム | 型 | デフォルト | 説明 |
|---|---|---|---|
| `id` | Int (autoincrement) | 自動 | プライマリキー |
| `userId` | String | - | ユーザーFK |
| `title` | String | - | タイトル |
| `desc` | String | `""` | 説明 |
| `tags` | String[] | `[]` | タグ（PostgreSQL配列型） |
| `hurdle` | Int | - | 面倒くささ（1〜3） |
| `time` | Int | - | 所要時間（1〜6） |

**インデックス:** `userId`

---

### Reward（ご褒美）

| カラム | 型 | デフォルト | 説明 |
|---|---|---|---|
| `id` | Int (autoincrement) | 自動 | プライマリキー |
| `userId` | String | - | ユーザーFK |
| `title` | String | - | タイトル |
| `desc` | String | `""` | 説明 |
| `tags` | String[] | `[]` | タグ（PostgreSQL配列型） |
| `satisfaction` | Int | - | 満足度（1〜3） |
| `time` | Int | - | 所要時間（1〜6） |
| `price` | Int | - | 金額（1〜6） |

**インデックス:** `userId`

---

### DoneAction（完了した行動ログ）

| カラム | 型 | 説明 |
|---|---|---|
| `id` | Int (autoincrement) | プライマリキー |
| `userId` | String | ユーザーFK |
| `actionId` | Int? | 行動FK（**nullable**: 行動削除後も履歴保持） |
| `title` | String | 完了時点のタイトルスナップショット |
| `pt` | Int | 付与されたポイント（完了時に確定） |
| `count` | Int | 当日の実行回数 |
| `date` | String | 完了日（YYYY-MM-DD、ユーザーTZ基準） |

**ユニーク制約:** `(userId, actionId, date)` — 同日・同行動は1レコードに集約

**インデックス:** `(userId, date)`

**設計ポイント:** `actionId` が nullable なのは、行動を削除しても過去の完了ログを残すため。`/api/state` ではこの null なレコードを除外して返す。

---

### DoneReward（消費したご褒美ログ）

| カラム | 型 | 説明 |
|---|---|---|
| `id` | Int (autoincrement) | プライマリキー |
| `userId` | String | ユーザーFK |
| `rewardId` | Int? | ご褒美FK（nullable） |
| `title` | String | 消費時点のタイトルスナップショット |
| `pt` | Int | 消費したポイント（消費時に確定） |
| `count` | Int | 当日の使用回数 |
| `date` | String | 消費日（YYYY-MM-DD、ユーザーTZ基準） |

**ユニーク制約:** `(userId, rewardId, date)`

**インデックス:** `(userId, date)`

---

## Enum

```prisma
enum Mode {
  EASY
  NORMAL
  HARD
}
```

フロントエンドとの変換:

| DB (Enum) | フロントエンド (型) |
|---|---|
| `EASY` | `"easy"` |
| `NORMAL` | `"normal"` |
| `HARD` | `"hard"` |

変換関数: `modeFromDb()` / `modeToDb()` in `web/lib/utils.ts`

---

## デフォルトデータ（シード）

初回起動時（または `npm run seed`）で以下を投入:

- **50件の DEFAULT_ACTIONS** — 食事・衛生・運動・家事・仕事・学習・メンタルケアなどカテゴリ別
- **50件の DEFAULT_REWARDS** — 動画・ゲーム・食事・ショッピング・お出かけなどカテゴリ別
- テスト用ユーザー `"seed-test-user"` を作成

定義箇所: `web/lib/constants.ts`

---

## Prismaクライアント

`web/lib/prisma.ts` でシングルトンとして管理。

```typescript
// PostgreSQLアダプター使用（接続プーリング）
const adapter = new PrismaPg(new Pool({ connectionString: process.env.DATABASE_URL }));
export const prisma = new PrismaClient({ adapter });
```

開発環境では HMR によるクライアント多重生成を防ぐため `globalThis` にキャッシュ。
