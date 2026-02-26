# 認証システム仕様

Sprint 02 で導入した NextAuth v5 (Auth.js) + Resend によるメールマジックリンク認証の設計と仕様。

---

## 認証フロー概要

```
[未認証ユーザー]
     │
     ▼
 app/page.tsx ──auth()── セッションなし ──→ LandingPage
                │
                └── セッションあり ──→ Dashboard（welcomeMessage 渡し）

[サインインフロー]
  LandingPage
     │ 「メールで始める」クリック
     ▼
  /signin ─── メールアドレス入力 ─── signIn("resend") ─→ Resend がメール送信
     │
     ▼
  /signin/verify ─── 「メールを確認してください」画面
     │
     ▼
  [ユーザーがメール内リンクをクリック]
     │
     ▼
  /?welcome=1 ─── Dashboard（新規/既存ウェルカムトースト）

[API認証フロー]
  ブラウザ ─→ proxy.ts（JWT検証）──認証済みなら──→ x-user-id ヘッダー注入 ─→ APIルート
                            └──未認証なら──→ 401 Unauthorized
```

---

## ファイル構成

| ファイル | 役割 |
|---|---|
| `web/lib/auth.ts` | NextAuth 初期化（Node.js環境、Prisma Adapter、Resend Provider） |
| `web/auth.config.ts` | Edge Runtime 用 Auth.js 設定（Prisma 非依存） |
| `web/proxy.ts` | Next.js Middleware（Edge Runtime、JWT検証・ヘッダー注入） |
| `web/app/api/auth/[...nextauth]/route.ts` | NextAuth ハンドラ（GET / POST） |
| `web/app/page.tsx` | ルートページ（認証状態で LandingPage / Dashboard を振り分け） |
| `web/components/LandingPage.tsx` | 未認証ユーザー向けランディングページ |
| `web/app/signin/page.tsx` | メールアドレス入力・マジックリンク送信フォーム |
| `web/app/signin/verify/page.tsx` | メール送信完了・確認画面 |

---

## NextAuth 設定

### `lib/auth.ts`（Node.js 環境）

```typescript
import NextAuth from "next-auth";
import { PrismaAdapter } from "@auth/prisma-adapter";
import Resend from "next-auth/providers/resend";
import { prisma } from "@/lib/prisma";
import { authConfig } from "@/auth.config";

export const { handlers, signIn, signOut, auth } = NextAuth({
  ...authConfig,
  adapter: PrismaAdapter(prisma),
  providers: [Resend({ from: process.env.AUTH_EMAIL_FROM })],
  session: { strategy: "jwt" },
});
```

**設計ポイント:**
- Prisma Adapter: DB にセッション・アカウント情報を保存
- JWT 戦略: セッション情報をサーバー DB に持たず JWT に格納（パフォーマンス）
- `session` callback: `token.sub`（ユーザーID）を `session.user.id` に格納

### `auth.config.ts`（Edge Runtime 対応）

```typescript
export const authConfig = {
  pages: {
    signIn: "/signin",
    verifyRequest: "/signin/verify",
  },
  providers: [],
  callbacks: {
    session({ session, token }) {
      if (token.sub) session.user.id = token.sub;
      return session;
    },
  },
} satisfies NextAuthConfig;
```

**設計ポイント:**
- Edge Runtime（proxy.ts）で使用するため Prisma 非依存
- `providers: []` — トークン照合は Node.js 側の `auth.ts` が担う
- カスタムページ設定で `/signin` と `/signin/verify` を指定

---

## ミドルウェア（`proxy.ts`）

Next.js Middleware として Edge Runtime で動作。

```
ルーティング:
  /api/auth/**  → 素通し（NextAuth が処理）
  /api/**       → JWT 検証必須 → x-user-id ヘッダー注入
  その他        → 素通し（page.tsx 側で auth() を呼んで制御）
```

**実装の特徴:**
- `NextAuth(authConfig)` で Edge 対応の `auth()` ラッパーを生成
- 認証済みの場合のみ `x-user-id` ヘッダーを注入し、APIルートに転送
- 未認証で `/api/**` にアクセスすると HTTP 401 を返す
- ページルート（`/`, `/signin` など）はミドルウェアで保護しない（Server Component 側で制御）

**マッチャー設定:**
```typescript
export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
```
静的ファイルと画像最適化パスは除外。

---

## ルートページ（`app/page.tsx`）

**Server Component** として動作。

```typescript
export default async function Home({ searchParams }: Props) {
  const [session, params] = await Promise.all([auth(), searchParams]);

  if (!session) return <LandingPage />;

  // welcome=1 のときだけ新規ユーザー判定（60秒以内に作成）
  let welcomeMessage: "new" | "returning" | null = null;
  if (params.welcome === "1") {
    const user = await prisma.user.findUnique({ ... });
    welcomeMessage = isNew ? "new" : "returning";
  }

  return <Dashboard welcomeMessage={welcomeMessage} />;
}
```

**振り分けロジック:**
| 状態 | レンダリング |
|---|---|
| 未認証 | `<LandingPage />` |
| 認証済み・通常アクセス | `<Dashboard welcomeMessage={null} />` |
| 認証済み・`?welcome=1`・新規ユーザー（60秒以内） | `<Dashboard welcomeMessage="new" />` |
| 認証済み・`?welcome=1`・既存ユーザー | `<Dashboard welcomeMessage="returning" />` |

---

## 環境変数

| 変数 | 説明 | 取得方法 |
|---|---|---|
| `AUTH_SECRET` | JWT 署名・暗号化用シークレット（32バイト以上推奨） | `openssl rand -base64 32` |
| `AUTH_RESEND_KEY` | Resend API キー | Resend ダッシュボード → API Keys |
| `AUTH_EMAIL_FROM` | 送信元メールアドレス | Resend で確認済みのドメインのアドレス |

`.env.example` に記載済み。本番環境では `.env.local` に設定する。

---

## データモデル（認証関連テーブル）

NextAuth の PrismaAdapter が使用する標準テーブル。詳細は [data-model.md](./data-model.md) を参照。

| テーブル | 役割 |
|---|---|
| `Account` | OAuth / Email プロバイダーのアカウント情報 |
| `Session` | DB セッション（JWT 戦略では実質不使用） |
| `VerificationToken` | メールマジックリンクの検証トークン |

User テーブルに追加されたフィールド:
- `email: String? @unique` — メールアドレス（Resend 認証で使用）
- `emailVerified: DateTime?` — メール確認日時
- `name: String?` — 表示名（未使用・NextAuth 標準フィールド）
- `updatedAt: DateTime @updatedAt` — 更新日時

---

## セキュリティ設計

| 項目 | 設計 |
|---|---|
| セッション | JWT（Cookie に格納）。サーバー DB に依存しない |
| トークン有効期限 | マジックリンク: 24時間（Resend デフォルト） |
| API 認証 | ミドルウェアで JWT を検証し `x-user-id` ヘッダーを注入。APIルートはヘッダーのみ参照 |
| ユーザー識別 | `session.user.id` = Prisma User の CUID（`token.sub` から取得） |
| パスワード | 不要（マジックリンクのみ） |
