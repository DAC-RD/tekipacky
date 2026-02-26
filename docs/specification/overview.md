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
│   │   └── user/route.ts         # PATCH（ユーザー設定更新）
│   ├── generated/prisma/         # 自動生成Prismaクライアント
│   ├── layout.tsx                # ルートレイアウト（フォント設定）
│   └── page.tsx                  # メインページ（Dashboardをレンダリング）
├── components/                   # Reactコンポーネント
│   ├── Dashboard.tsx             # メインUIコンテナ（状態管理・ルーティング）
│   ├── PointDisplay.tsx          # ポイント表示（フラッシュアニメーション付き）
│   ├── FilterArea.tsx            # 検索・ソート・タグフィルター
│   ├── ItemModal.tsx             # 行動・ご褒美の追加・編集モーダル
│   └── DoneAccordion.tsx         # 今日のログ（アコーディオン）
├── hooks/
│   └── useStore.ts               # アプリ状態管理フック（API連携）
├── lib/
│   ├── types.ts                  # TypeScript型定義
│   ├── constants.ts              # モード設定・デフォルトデータ（50行動・50ご褒美）
│   ├── utils.ts                  # ポイント計算・ユーティリティ関数
│   ├── user.ts                   # ユーザーID抽出（ヘッダーから）
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
├── vitest.config.ts              # Vitestの設定
├── vitest.setup.ts               # テスト環境セットアップ
└── proxy.ts                      # ミドルウェア（ユーザーセッション管理）
```

---

## ユーザーセッション管理

`proxy.ts`（Next.js Middleware）が担当。

- 全 `/api/*` リクエストに `x-user-id` ヘッダーを注入
- httpOnly セキュアクッキー（有効期限365日）でユーザーIDを永続化
- 初回アクセス時にDBユーザーを自動作成
- 各APIルートは `getUserId(req)` でヘッダーからユーザーIDを取得

```
ブラウザ → proxy.ts（cookie確認・x-user-idヘッダー注入）→ APIルート
```

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
