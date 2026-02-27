# Sprint 03 計画

## 概要

| 項目 | 内容 |
|------|------|
| テーマ | アカウント管理機能 |
| ゴール | 設定ページを新設し、メールアドレス変更とアカウント削除を実装する |

---

## スプリントの目標

- 設定ページ（/settings）を新設する
- メールアドレス変更フロー（確認メール → リンククリック → メール更新）を実装する
- アカウント削除機能（全データカスケード削除 → サインアウト）を実装する
- 既存の 237 本のテストが引き続き通ることを確認し、新規テストを追加する

---

## アーキテクチャ方針

### 変更しないもの

- `web/prisma/schema.prisma` — 全関連テーブルに `onDelete: Cascade` 設定済みのためスキーマ変更不要
- `web/proxy.ts` — /settings は既存の page 扱い（認証済み確認は Server Component 側で行う）
- 既存 API ルート群

### 変更・新規作成するもの

| ファイル | 種別 | 内容 |
|----------|------|------|
| `web/app/api/user/route.ts` | 変更 | GET（ユーザー情報取得）+ DELETE（アカウント削除）を追加 |
| `web/app/api/user/email/route.ts` | 新規 | POST: メール変更リクエスト受付・VerificationToken 生成・Resend 送信 |
| `web/app/settings/page.tsx` | 新規 | Server Component: `auth()` で認証確認、ユーザー情報取得 |
| `web/app/settings/email-verify/page.tsx` | 新規 | Server Component: トークン検証・User.email 更新・サインアウト |
| `web/components/SettingsPage.tsx` | 新規 | Client Component: メールアドレス変更フォーム + アカウント削除 UI |
| `web/components/ModeSelector.tsx` | 変更 | 設定ページへのリンク（歯車アイコン）を追加 |

---

## メールアドレス変更フロー

```
設定ページで新メールアドレス入力
  → POST /api/user/email { newEmail }
  → バリデーション（形式・現在と同一・重複チェック）
  → VerificationToken に保存
      identifier = "email-change:${userId}"
      token      = crypto.randomUUID()
      expires    = 24時間後
  → Resend でメール送信
      リンク: ${AUTH_URL}/settings/email-verify?token=xxx
  → クライアント: "確認メールを送りました" 表示

ユーザーがリンクをクリック
  → /app/settings/email-verify/page.tsx (Server Component)
  → prisma.verificationToken.findFirst({ where: { token } })
  → identifier から userId を抽出（"email-change:${userId}"）
  → 有効期限チェック
  → prisma.user.update({ data: { email: newEmail } })
  → VerificationToken 削除
  → signOut() → /signin?message=emailChanged にリダイレクト
```

---

## アカウント削除フロー

```
設定ページの「アカウントを削除」ボタン
  → 確認ダイアログ（「削除する」と入力して確定）
  → DELETE /api/user
  → prisma.user.delete({ where: { id: userId } })
      ※ onDelete: Cascade により全関連データが自動削除
  → 200 OK
  → クライアント: signOut({ callbackUrl: '/' })
  → ランディングページへ
```

---

## タスク

### フェーズA：API 実装

- [x] `web/app/api/user/route.ts` を変更
  - `GET`: `prisma.user.findUniqueOrThrow` でメールアドレス取得 → `{ email }` を返す
  - `DELETE`: `prisma.user.delete({ where: { id: userId } })` → `{ ok: true }`

- [x] `web/app/api/user/email/route.ts` を新規作成（POST）
  - バリデーション: メール形式・現在と同一・重複チェック（`prisma.user.findUnique({ where: { email: newEmail } })`）
  - `VerificationToken` を upsert（identifier=`email-change:${userId}`, token=`crypto.randomUUID()`, expires=24h後）
  - Resend でメール送信（本文にリンク: `${process.env.AUTH_URL}/settings/email-verify?token=xxx`）
  - `{ ok: true }` を返す

### フェーズB：確認メールリンク処理

- [x] `web/app/settings/email-verify/page.tsx` を新規作成（Server Component）
  - `searchParams.token` を読み取り
  - `prisma.verificationToken.findFirst({ where: { token } })` でトークン取得
  - バリデーション: 存在・`identifier.startsWith('email-change:')` チェック・有効期限チェック
  - 有効なら:
    - `identifier.replace('email-change:', '')` で userId を取得
    - `prisma.user.update({ data: { email: newEmail } })` + token 削除
    - `/settings?success=emailChanged` にリダイレクト
  - 無効なら: エラーメッセージ + `/settings` へのリンクを表示

### フェーズC：設定ページ UI

- [x] `web/app/settings/page.tsx` を新規作成（Server Component）
  - `auth()` でセッション確認 → 未認証は `redirect('/signin')`
  - Prisma でユーザー情報取得 → `SettingsPage` コンポーネントに渡す

- [x] `web/components/SettingsPage.tsx` を新規作成（Client Component）
  - **メールアドレス変更セクション**
    - 現在のメールアドレスを表示
    - 新しいメールアドレスの入力フォーム
    - 「確認メールを送る」ボタン → POST `/api/user/email`
    - 送信後: "確認メールを送りました。メールを確認してください" を表示
  - **アカウント削除セクション（デンジャーゾーン）**
    - 警告: "削除すると全データが失われます。この操作は取り消せません。"
    - 「アカウントを削除」ボタン → 確認ダイアログ
    - ダイアログ: 「削除する」と入力させて確定
    - DELETE `/api/user` → 成功後 `signOut({ callbackUrl: '/' })`

- [x] `web/components/ModeSelector.tsx` を変更
  - ⚙ をドロップダウン化し、「設定」リンクと「サインアウト」をまとめる（4→3アイテム）

### フェーズD：テスト追加

- [x] `web/__tests__/app/api/user/route.test.ts` を更新
  - GET: メールアドレスを正常取得できること
  - DELETE: ユーザー削除が呼ばれること

- [x] `web/__tests__/app/api/user/email/route.test.ts` を新規作成（7テスト）
  - POST: 正常リクエスト → VerificationToken 作成・Resend 送信
  - POST: 不正メール形式 → 400
  - POST: 現在のメールと同一 → 400
  - POST: 既に使用済みメール → 400

- [x] `web/__tests__/components/SettingsPage.test.tsx` を新規作成（11テスト）
  - メール変更フォームの入力・送信動作
  - アカウント削除の確認ダイアログ表示・「削除する」入力の検証

### フェーズE：検証

- [x] ローカルで手動 E2E フローを確認
  - /settings が未認証でアクセスすると /signin にリダイレクトされる
  - メールアドレス変更: 確認メール受信 → リンククリック → /settings?success=emailChanged → 成功バナー表示
  - アカウント削除: 「削除する」入力 → 全データ削除 → ランディングページ
- [x] テスト（259本 = 既存 237 + 新規 22）がすべて通ることを確認

---

## 成果物

- `docs/sprints/sprint_03/plan.md` — 本ファイル
- `web/app/api/user/route.ts` — GET + DELETE 追加
- `web/app/api/user/email/route.ts` — メール変更リクエスト API
- `web/app/settings/page.tsx` — 設定ページ
- `web/app/settings/email-verify/page.tsx` — メール変更確認ページ
- `web/components/SettingsPage.tsx` — 設定 UI コンポーネント

---

## 環境変数（既存・追加不要）

| 変数 | 説明 | 用途 |
|------|------|------|
| `AUTH_RESEND_KEY` | Resend API キー | メール変更確認メール送信 |
| `AUTH_EMAIL_FROM` | 送信元メールアドレス | 同上 |
| `AUTH_URL` | アプリの URL | メール内リンク生成 |

---

## 次スプリントへの課題（持ち越し候補）

### 機能追加

- [ ] 過去のポイント推移・行動統計ページ
- [ ] Google / GitHub 等の OAuth ログイン追加

### 改善

- [ ] メールアドレス変更後のセッション更新（現在はサインアウト→再ログインを促す）
