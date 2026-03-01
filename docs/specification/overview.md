# アプリ概要・アーキテクチャ

## プロダクト概要

**名称:** テキパッキー (tekipacky)
**目的:** 脳疲弊によって日常行動に着手できない人が、小さな行動を積み重ねられるようにする
**コンセプト:** 行動をポイントとして管理し、そのポイントをご褒美に消費する

---

## 技術スタック

| カテゴリ | 技術 |
|---|---|
| フレームワーク | Next.js 16 (App Router) |
| UI | React 19, Tailwind CSS v4 |
| データベース | PostgreSQL + Prisma 7 |
| DBドライバ | `@prisma/adapter-pg` + `pg` |
| 認証 | NextAuth v5 (next-auth@beta) + Resend |
| 単体テスト | Vitest 4 + @testing-library/react |
| E2Eテスト | Playwright |
| 実行環境 | Docker Compose |

---

## ディレクトリ構造

```
web/
├── app/                          # Next.js App Router
│   ├── api/                      # APIルート
│   │   ├── actions/              # 行動CRUD
│   │   │   ├── route.ts          # POST（作成）
│   │   │   └── [id]/route.ts     # PUT（更新）/ DELETE（削除）
│   │   ├── rewards/              # ご褒美CRUD
│   │   │   ├── route.ts          # POST（作成）
│   │   │   └── [id]/route.ts     # PUT（更新）/ DELETE（削除）
│   │   ├── done/
│   │   │   ├── actions/          # 行動完了ログ
│   │   │   │   ├── route.ts      # POST（完了記録・ポイント付与）
│   │   │   │   └── [actionId]/route.ts   # PATCH（回数調整）
│   │   │   └── rewards/          # ご褒美消費ログ
│   │   │       ├── route.ts      # POST（消費記録・ポイント減算）
│   │   │       └── [rewardId]/route.ts   # PATCH（回数調整）
│   │   ├── state/route.ts        # GET（全状態取得）
│   │   ├── user/
│   │   │   ├── route.ts          # GET（ユーザー情報取得）/ PATCH（モード変更）/ DELETE（アカウント削除）
│   │   │   └── email/route.ts    # POST（メールアドレス変更リクエスト・Resend送信）
│   │   └── auth/
│   │       └── [...nextauth]/route.ts  # NextAuth ハンドラ（GET / POST）
│   ├── layout.tsx                # ルートレイアウト（フォント設定）
│   ├── page.tsx                  # ルートページ（認証状態で LandingPage / Dashboard を振り分け）
│   ├── signin/
│   │   ├── page.tsx              # メールアドレス入力・マジックリンク送信
│   │   └── verify/page.tsx       # メール送信完了・確認画面
│   └── settings/
│       ├── page.tsx              # 設定ページ（未認証は /signin にリダイレクト）
│       └── email-verify/page.tsx # メール変更確認リンク処理
├── components/                   # Reactコンポーネント
│   ├── Dashboard.tsx             # メインUIコンテナ（状態管理・ルーティング）
│   ├── ActionCardList.tsx        # 行動カード一覧
│   ├── RewardCardList.tsx        # ご褒美カード一覧
│   ├── LandingPage.tsx           # 未認証ユーザー向けランディングページ
│   ├── PointDisplay.tsx          # ポイント表示（フラッシュアニメーション付き）
│   ├── FilterArea.tsx            # 検索・ソート・タグフィルター
│   ├── ItemModal.tsx             # 行動・ご褒美の追加・編集モーダル
│   ├── ActionForm.tsx            # 行動フォームフィールド（ItemModal サブ）
│   ├── RewardForm.tsx            # ご褒美フォームフィールド（ItemModal サブ）
│   ├── DoneAccordion.tsx         # 今日のログ（アコーディオン）
│   ├── ModeSelector.tsx          # モード選択・ヘルプ・設定/サインアウトメニュー
│   ├── SettingsPage.tsx          # 設定ページUI（メール変更・アカウント削除）
│   └── WelcomeToast.tsx          # ウェルカム/エラートースト
├── hooks/
│   ├── useStore.ts               # アプリ状態管理フック（API連携）
│   ├── useFilteredItems.ts       # フィルタ・検索・ソート共通フック
│   └── useTagManager.ts          # タグ管理フック（ItemModal用）
├── lib/
│   ├── types.ts                  # TypeScript型定義
│   ├── constants.ts              # モード設定・デフォルトデータ（50行動・50ご褒美）
│   ├── utils.ts                  # ポイント計算・ユーティリティ関数
│   ├── user.ts                   # ユーザーID抽出（ヘッダーから）
│   ├── auth.ts                   # NextAuth 初期化（Resend Provider・PrismaAdapter）
│   ├── done.ts                   # Done系共通処理（upsertDoneAction/upsertDoneReward）
│   ├── tokens.ts                 # メール変更トークン（build/parse）
│   ├── validate.ts               # 入力バリデーションヘルパー（assertInt等）
│   ├── prisma.ts                 # Prismaクライアントシングルトン
│   ├── generated/prisma/         # 自動生成Prismaクライアント
│   └── server/
│       └── transforms.ts         # DB→API型変換・タイムゾーン日付変換
├── prisma/
│   ├── schema.prisma             # DBスキーマ
│   ├── seed.ts                   # シードデータ
│   └── migrations/               # マイグレーションファイル
├── __tests__/                    # 単体テスト（Vitest）
│   ├── lib/                      # ユーティリティ関数テスト
│   ├── components/               # コンポーネントテスト
│   ├── hooks/                    # カスタムフックテスト
│   └── app/api/                  # APIルートテスト
├── __tests__/integration/        # 統合テスト（Vitest + 実 PostgreSQL）
│   ├── done.test.ts              # upsertDoneAction/Reward・adjust 系の実DB検証
│   └── state.test.ts             # SetNull cascade・日付フィルタの実DB検証
├── e2e/                          # E2Eテスト（Playwright）
│   ├── auth.setup.ts             # JWE Cookie 生成・storageState 書き込み
│   ├── api-flow.spec.ts          # 認証済み API フロー（serial）
│   ├── public.spec.ts            # 認証保護スモーク
│   └── db-helpers.ts             # pg 直接利用の DB ヘルパー
├── auth.config.ts                # Edge Runtime 用 Auth.js 設定（Prisma 非依存）
├── vitest.config.ts              # 単体テスト設定
├── vitest.config.integration.ts  # 統合テスト設定（実 PostgreSQL）
├── vitest.globalsetup.integration.ts  # 統合テスト前 DB リセット
├── vitest.setup.ts               # テスト環境セットアップ
├── docker-compose.test.yml       # テスト用 PostgreSQL（port 5433, tmpfs）
├── playwright.config.ts          # E2Eテスト設定（3プロジェクト構成）
└── proxy.ts                      # Next.js Middleware（JWT認証・x-user-idヘッダー注入）
```

---

## 認証・セッション管理

**NextAuth v5（Auth.js）+ Resend** によるメールマジックリンク認証を採用。

- 未認証ユーザーは `LandingPage` を表示（`/signin` でメール送信 → マジックリンクでログイン）
- `proxy.ts`（Next.js Middleware）が Edge Runtime で JWT を検証し、認証済みリクエストに `x-user-id` ヘッダーを注入
- `/api/auth/**` は NextAuth が処理するためミドルウェアをスルー
- 未認証で `/api/**` にアクセスすると HTTP 401 を返す
- 各 API ルートは `getUserId(req)` でヘッダーからユーザー ID を取得（変更なし）

```
ブラウザ → proxy.ts（JWT検証 + x-user-idヘッダー注入）→ APIルート
未認証アクセス → proxy.ts → 401 Unauthorized
未認証ページ → app/page.tsx（auth()呼び出し）→ LandingPage
```

詳細は [authentication.md](./authentication.md) を参照。

---

## データフロー

```
[UI操作]
   ↓
[useStore（楽観的更新）]
   ↓ 即時 state 更新（UX向上）
   ↓ 非同期 fetch
[APIルート]
   ↓
[Prisma → PostgreSQL]
```

**楽観的更新の方針:**
- ポイント計算はフロント側でも行い即時反映
- サーバー側でも計算し直す（クライアント値を信頼しない）
- API失敗時は楽観的更新をロールバックして元の状態に戻す

---

## テスト実行

```bash
# ─── 単体テスト ───
# コンテナに入る
cd web
docker compose exec app sh

# 全テスト実行
npx vitest run

# ウォッチモード（開発時）
npx vitest

# 特定ファイル
npx vitest run __tests__/lib/utils.test.ts

# ─── 統合テスト（実 PostgreSQL 必須）───
# テスト用 DB を起動（port 5433）
docker compose -f docker-compose.test.yml up -d

# 統合テスト実行
docker compose -f docker-compose.test.yml exec app \
  npx vitest run --config vitest.config.integration.ts

# テスト後に DB を停止
docker compose -f docker-compose.test.yml down

# ─── E2Eテスト（開発サーバー必須）───
# 開発 DB + 開発サーバーを起動
docker compose up -d

# E2Eテスト実行
docker compose exec app npx playwright test --reporter=line

# 特定プロジェクトのみ
docker compose exec app npx playwright test --project=public
docker compose exec app npx playwright test --project=authenticated
```
