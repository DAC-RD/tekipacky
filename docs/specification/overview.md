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
│   │   └── user/
│   │       ├── route.ts          # GET（ユーザー情報取得）/ PATCH（モード変更）/ DELETE（アカウント削除）
│   │       └── email/route.ts    # POST（メールアドレス変更リクエスト・Resend送信）
│   ├── api/
│   │   └── auth/[...nextauth]/route.ts  # NextAuth ハンドラ（GET / POST）
│   ├── generated/prisma/         # 自動生成Prismaクライアント
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
│   ├── LandingPage.tsx           # 未認証ユーザー向けランディングページ
│   ├── PointDisplay.tsx          # ポイント表示（フラッシュアニメーション付き）
│   ├── FilterArea.tsx            # 検索・ソート・タグフィルター
│   ├── ItemModal.tsx             # 行動・ご褒美の追加・編集モーダル
│   ├── DoneAccordion.tsx         # 今日のログ（アコーディオン）
│   ├── ModeSelector.tsx          # モード選択・ヘルプ・設定/サインアウトメニュー
│   └── SettingsPage.tsx          # 設定ページUI（メール変更・アカウント削除）
├── hooks/
│   └── useStore.ts               # アプリ状態管理フック（API連携）
├── lib/
│   ├── types.ts                  # TypeScript型定義
│   ├── constants.ts              # モード設定・デフォルトデータ（50行動・50ご褒美）
│   ├── utils.ts                  # ポイント計算・ユーティリティ関数
│   ├── user.ts                   # ユーザーID抽出（ヘッダーから）
│   ├── auth.ts                   # NextAuth 初期化（Resend Provider・PrismaAdapter）
│   ├── done.ts                   # Done系共通処理（upsertDoneAction/upsertDoneReward）
│   ├── validate.ts               # 入力バリデーションヘルパー（assertInt等）
│   └── prisma.ts                 # Prismaクライアントシングルトン
├── prisma/
│   ├── schema.prisma             # DBスキーマ
│   ├── seed.ts                   # シードデータ
│   └── migrations/               # マイグレーションファイル
├── __tests__/                    # 単体テスト（Vitest）
│   ├── lib/                      # ユーティリティ関数テスト
│   ├── components/               # コンポーネントテスト
│   ├── hooks/                    # カスタムフックテスト
│   └── app/api/                  # APIルートテスト
├── auth.config.ts                # Edge Runtime 用 Auth.js 設定（Prisma 非依存）
├── vitest.config.ts              # Vitestの設定
├── vitest.setup.ts               # テスト環境セットアップ
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
- API失敗時のロールバックは未実装（フェーズ1では許容）

---

## テスト実行

```bash
# コンテナに入る
cd web
docker compose exec app sh

# 全テスト実行
npx vitest run

# ウォッチモード（開発時）
npx vitest

# 特定ファイル
npx vitest run __tests__/lib/utils.test.ts

# E2Eテスト
npx playwright test
```
