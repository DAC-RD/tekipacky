import type { NextAuthConfig } from "next-auth";

/**
 * Edge Runtime (proxy.ts) で使用できる Auth.js 設定。
 * Prisma / Node.js 専用ライブラリを含まないため Edge で安全にインポートできる。
 * providers は [] のみ（メール検証トークンの照合は Node.js 側の auth.ts が担う）。
 */
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
