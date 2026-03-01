# テスト方針

## 概要

tekipacky のテストは **3 層構成** で実施する。

| 層 | ツール | 対象 | 環境 |
|---|---|---|---|
| 単体テスト | Vitest | 純粋関数・コンポーネント・フック・APIルート | jsdom / node（Prismaモック） |
| 統合テスト | Vitest + 実DB | トランザクション・CASCADE・日付フィルタ | node（実 PostgreSQL port 5433） |
| E2Eテスト | Playwright | 認証フロー・HTTP API の実挙動 | 開発サーバー + 開発DB |

---

## ディレクトリ構造

```
web/__tests__/             ← 単体テスト（vitest.config.ts）
├── helpers/
│   └── request.ts                         # 共通リクエストヘルパー（makeRequest）
├── lib/
│   ├── utils.test.ts                      # 純粋関数（ポイント計算・変換・リスト操作）
│   ├── user.test.ts                       # getUserId ヘッダー抽出
│   ├── done.test.ts                       # adjustDoneAction/Reward（Prismaモック）
│   ├── tokens.test.ts                     # メール変更トークン build/parse
│   └── server/
│       └── transforms.test.ts             # DB→API 型変換・タイムゾーン日付変換
├── components/
│   ├── Dashboard.test.tsx                 # ウェルカムトースト（fakeTimers）
│   ├── PointDisplay.test.tsx              # ポイント表示・モードラベル
│   ├── FilterArea.test.tsx                # 検索・ソート・タグフィルター
│   ├── DoneAccordion.test.tsx             # アコーディオン・カウント調整
│   ├── ItemModal.test.tsx                 # フォームモーダル（32テスト）
│   ├── LandingPage.test.tsx               # ランディングページ表示
│   └── SettingsPage.test.tsx              # メール変更・アカウント削除フォーム
├── hooks/
│   ├── useStore.test.ts                   # 状態管理フック（fetch モック・楽観更新）
│   ├── useFilteredItems.test.ts           # タグ/テキストフィルタ・ソート
│   └── useTagManager.test.ts              # タグ追加/削除/切り替え
├── app/
│   ├── page.test.tsx                      # Home: LandingPage/Dashboard 分岐
│   └── signin/
│       ├── page.test.tsx                  # SignInPage: マジックリンク送信フロー
│       └── verify/page.test.tsx           # VerifyRequestPage
└── app/api/
    ├── state/route.test.ts                # GET /api/state
    ├── user/
    │   ├── route.test.ts                  # GET/PATCH/DELETE /api/user
    │   └── email/route.test.ts            # POST /api/user/email（メール変更）
    ├── actions/
    │   ├── route.test.ts                  # POST /api/actions
    │   └── [id]/route.test.ts             # PUT/DELETE /api/actions/[id]
    ├── rewards/
    │   ├── route.test.ts                  # POST /api/rewards
    │   └── [id]/route.test.ts             # PUT/DELETE /api/rewards/[id]
    └── done/
        ├── actions/
        │   ├── route.test.ts              # POST /api/done/actions
        │   └── [actionId]/route.test.ts   # PATCH /api/done/actions/[id]
        └── rewards/
            ├── route.test.ts              # POST /api/done/rewards
            └── [rewardId]/route.test.ts   # PATCH /api/done/rewards/[id]

web/__tests__/integration/ ← 統合テスト（vitest.config.integration.ts）
├── done.test.ts           # upsertDoneAction/Reward・adjust 系の実DB検証（11テスト）
└── state.test.ts          # SetNull cascade・日付フィルタの実DB検証（10テスト）

web/e2e/                   ← E2Eテスト（playwright.config.ts）
├── auth.setup.ts          # JWE Cookie 生成・storageState 書き込み
├── api-flow.spec.ts       # 認証済み API フロー（8テスト、serial）
├── public.spec.ts         # 認証保護スモーク（3テスト）
└── db-helpers.ts          # pg 直接利用の DB ヘルパー
```

**テスト数:**
- 単体テスト: **325テスト** / 29ファイル
- 統合テスト: **21テスト** / 2ファイル
- E2Eテスト: **11テスト** / 2ファイル（setup 除く）

---

## テストの種類と優先度

| 優先度 | 種類 | 対象 | 理由 |
|:---:|---|---|---|
| A | 純粋関数テスト | `lib/utils.ts`, `lib/user.ts`, `lib/tokens.ts`, `lib/server/transforms.ts` | 副作用なし・高信頼性 |
| B | コンポーネントテスト | `components/*.tsx`, `app/(page).tsx` | UIの動作確認・回帰防止 |
| C | フックテスト | `hooks/*.ts` | API呼び出しパターンの確認 |
| C | APIルートテスト | `app/api/**/*.ts` | サーバーロジック・バリデーション確認 |
| D | 統合テスト | `__tests__/integration/` | トランザクション・CASCADE など実DB挙動 |
| D | E2Eテスト | `e2e/` | エンドツーエンドの認証フロー・HTTP 挙動 |

---

## テスト実行

### 単体テスト

```bash
# Docker コンテナに入る（web ディレクトリから）
docker compose exec app sh

# 全テスト実行
npx vitest run

# 特定ファイル・ディレクトリを実行
npx vitest run __tests__/lib/utils.test.ts
npx vitest run __tests__/components/
npx vitest run __tests__/app/api/

# ウォッチモード（開発時）
npx vitest
```

### 統合テスト（実 PostgreSQL 必須）

```bash
# テスト用 DB を起動（port 5433）
docker compose -f docker-compose.test.yml up -d

# 統合テスト実行（メイン app コンテナから。dotenv-cli が .env.test を読み込み test DB に接続）
docker compose exec app npm run test:integration

# 終了後にテスト用 DB を停止
docker compose -f docker-compose.test.yml down
```

**注意:** `npx vitest run --config vitest.config.integration.ts` を直接実行すると `.env.test` が読み込まれず、
開発用 DB に `db push --force-reset` が走る危険があります。必ず `npm run test:integration` を使用してください。
`vitest.globalsetup.integration.ts` はガードを持っており、`DATABASE_URL` が `tekipacky_test` を含まない場合は即座にエラーを throw します。

### E2Eテスト（開発サーバー必須）

```bash
# 開発 DB + 開発サーバーを起動
docker compose up -d

# E2E テスト実行（全プロジェクト）
docker compose exec app npx playwright test --reporter=line

# 特定プロジェクトのみ実行
docker compose exec app npx playwright test --project=public
docker compose exec app npx playwright test --project=authenticated
```

---

## Vitest 設定

### 単体テスト: `web/vitest.config.ts`

```typescript
export default defineConfig({
  plugins: [react()],
  resolve: { alias: { "@": path.resolve(__dirname, ".") } },
  test: {
    environment: "jsdom",
    setupFiles: ["./vitest.setup.ts"],
    globals: true,
    exclude: ["node_modules", "e2e/**", "__tests__/integration/**"],
  },
});
```

### 統合テスト: `web/vitest.config.integration.ts`

```typescript
export default defineConfig({
  resolve: { alias: { "@": path.resolve(__dirname, ".") } },
  test: {
    environment: "node",
    include: ["__tests__/integration/**/*.test.ts"],
    globalSetup: ["./vitest.globalsetup.integration.ts"],
  },
});
```

`vitest.globalsetup.integration.ts` でテスト実行前に `prisma db push --force-reset` を実行してスキーマをクリーンにする。

### `web/vitest.setup.ts`
```typescript
import "@testing-library/jest-dom";  // toBeInTheDocument() などのマッチャー追加
```

---

## Playwright 設定

`playwright.config.ts` は 3 プロジェクト構成:

| プロジェクト | テストファイル | 依存 |
|---|---|---|
| `setup` | `auth.setup.ts` | なし（先行実行） |
| `public` | `public.spec.ts` | なし |
| `authenticated` | `api-flow.spec.ts` | `setup`（storageState 使用） |

---

## テストパターン詳細

各パターンの具体的なコード例は以下を参照:

- [pure-function-patterns.md](./pure-function-patterns.md) — 純粋関数テスト
- [component-patterns.md](./component-patterns.md) — Reactコンポーネントテスト
- [hook-patterns.md](./hook-patterns.md) — カスタムフックテスト
- [api-route-patterns.md](./api-route-patterns.md) — Next.js APIルートテスト
- [integration-patterns.md](./integration-patterns.md) — 統合テスト（実DB）
- [e2e-patterns.md](./e2e-patterns.md) — E2Eテスト（Playwright）
