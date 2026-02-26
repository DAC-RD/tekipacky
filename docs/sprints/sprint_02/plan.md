# Sprint 02 計画

## 概要

| 項目 | 内容 |
|------|------|
| テーマ | 認証機能の導入 |
| ゴール | NextAuth (Auth.js v5) + Resend でメールマジックリンク認証を実装し、未認証時はランディングページを表示する |

---

## スプリントの目標

- Auth.js v5 + Resend でメールマジックリンク認証を実装する
- 未認証ユーザー向けのランディングページを新規作成する
- 全 API ルートを認証必須にする（既存コードへの変更は最小限）
- 既存の 175 本のテストが引き続き通ることを確認する

---

## アーキテクチャ方針

### 変更しないもの
- `web/lib/user.ts` — `x-user-id` ヘッダーを読む `getUserId()` はそのまま
- `web/app/api/**` の全 API ルート — `getUserId(req)` 呼び出しはそのまま
- `web/components/Dashboard.tsx` 他の既存コンポーネント群

### 変更・新規作成するもの

| ファイル | 種別 | 内容 |
|----------|------|------|
| `web/prisma/schema.prisma` | 変更 | User に `email`, `emailVerified` 追加。`Account`, `Session`, `VerificationToken` テーブル新設 |
| `web/proxy.ts` | 新規 | NextAuth ミドルウェア。認証チェック + `x-user-id` ヘッダー注入 |
| `web/lib/auth.ts` | 新規 | Auth.js v5 設定（Resend プロバイダー・Prisma Adapter・JWT 戦略） |
| `web/app/api/auth/[...nextauth]/route.ts` | 新規 | NextAuth ハンドラ（GET / POST） |
| `web/app/page.tsx` | 変更 | 認証状態で `LandingPage` / `Dashboard` を切り替え |
| `web/components/LandingPage.tsx` | 新規 | アプリ概要・CTA |
| `web/app/signin/page.tsx` | 新規 | メールアドレス入力フォーム |
| `web/app/signin/verify/page.tsx` | 新規 | 「メールを確認してください」画面 |
| `.env.example` | 変更 | `AUTH_SECRET`, `AUTH_RESEND_KEY`, `AUTH_EMAIL_FROM` を追加 |

---

## タスク

### フェーズA：環境・スキーマ準備

- [x] `next-auth@beta` と `@auth/prisma-adapter` をインストール
- [x] `web/prisma/schema.prisma` に認証関連フィールド・テーブルを追加
  - User: `email String? @unique`, `emailVerified DateTime?`, `name String?`, リレーション追加
  - 新規: `Account`, `Session`, `VerificationToken`
- [x] Prisma マイグレーション実行（`add_auth_schema`）
- [x] `.env.example` に `AUTH_SECRET`, `AUTH_RESEND_KEY`, `AUTH_EMAIL_FROM` を追加

### フェーズB：Auth.js 設定

- [x] `web/auth.config.ts` を作成（Edge 対応の基本設定）、`web/lib/auth.ts` を作成（Resend プロバイダー・JWT 戦略・callbacks）
  - `session` callback: `token.sub` を `session.user.id` に格納
- [x] `web/app/api/auth/[...nextauth]/route.ts` を作成（handlers エクスポート）
- [x] `web/proxy.ts` を作成（NextAuth ミドルウェア）
  - API ルートの保護（未認証 → 401）
  - 認証済みリクエストへの `x-user-id` ヘッダー注入
  - サインインページ・`/api/auth/**` は認証不要

### フェーズC：画面実装

- [x] `web/app/page.tsx` を変更（`auth()` で条件分岐、welcome=1 時の新規/既存判定）
- [x] `web/components/LandingPage.tsx` を作成
  - ヒーローセクション（アプリ名・キャッチコピー）
  - 3つの特徴説明（行動メニュー / ポイント獲得 / ご褒美）
  - CTA ボタン（「始める」→ `/signin`）
- [x] `web/app/signin/page.tsx` を作成（メールアドレス入力・送信・トップへ戻るリンク）
- [x] `web/app/signin/verify/page.tsx` を作成（確認メッセージ）
- [x] ダッシュボードにサインアウトボタンを追加
- [x] ログイン後ウェルカムトースト（新規: 「アカウントを作成しました」/ 既存: 「ログインしました」、3秒で自動消滅）

### フェーズD：検証

- [x] ローカルで E2E フローを手動確認
  - 未認証で `/` → ランディングページが表示される
  - `/signin` でメール送信 → Resend でメール受信確認
  - マジックリンクをクリック → ダッシュボードにリダイレクト
  - 未認証で `GET /api/state` → 401 が返る
  - サインアウト → ランディングページに戻る
- [x] テスト 206 本がすべて通ることを確認（既存 175 + Sprint 02 新規 31）

---

## 成果物

- `docs/sprints/sprint_02/requirements.md` — 要件定義
- `docs/sprints/sprint_02/plan.md` — 本ファイル
- `web/lib/auth.ts` — Auth.js 設定
- `web/proxy.ts` — ミドルウェア
- `web/components/LandingPage.tsx` — ランディングページ
- `web/app/signin/` — サインイン関連ページ

---

## 環境変数（設定が必要なもの）

| 変数 | 説明 | 取得方法 |
|------|------|----------|
| `AUTH_SECRET` | JWT 署名用シークレット | `openssl rand -base64 32` で生成 |
| `AUTH_RESEND_KEY` | Resend API キー | Resend ダッシュボード → API Keys |
| `AUTH_EMAIL_FROM` | 送信元メールアドレス | Resend で確認済みのドメインのアドレス |

---

## 次スプリントへの課題（持ち越し候補）

- [ ] 過去のポイント推移・行動統計ページ
- [ ] メールアドレスの変更機能
- [ ] アカウント削除機能
- [ ] Google / GitHub 等の OAuth ログイン追加
