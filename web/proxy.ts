import NextAuth from "next-auth";
import { authConfig } from "./auth.config";
import { NextResponse } from "next/server";

const { auth } = NextAuth(authConfig);

/**
 * Next.js 16 ミドルウェア（proxy.ts）。
 * Edge Runtime で動作するため、Prisma / Node.js 専用モジュールを含まない
 * authConfig を使って JWT セッションを検証する。
 *
 * - /api/auth/** → NextAuth が処理するため素通り
 * - /api/**      → 認証必須。JWT から取得した userId を x-user-id ヘッダーで注入
 * - その他       → 素通り（page.tsx 側で auth() を呼んでコンテンツを切り替える）
 */
export default auth((req) => {
  const session = req.auth;
  const { pathname } = req.nextUrl;

  // NextAuth の認証エンドポイントは保護しない
  if (pathname.startsWith("/api/auth")) {
    return NextResponse.next();
  }

  // API ルートは認証必須 + x-user-id ヘッダーを注入
  if (pathname.startsWith("/api/")) {
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const headers = new Headers(req.headers);
    headers.set("x-user-id", session.user.id);
    return NextResponse.next({ request: { headers } });
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
