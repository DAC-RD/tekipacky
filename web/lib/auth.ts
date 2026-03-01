import NextAuth from "next-auth";
import { PrismaAdapter } from "@auth/prisma-adapter";
import Resend from "next-auth/providers/resend";
import { prisma } from "@/lib/prisma";
import { authConfig } from "@/auth.config";
import { magicLinkEmailHtml } from "@/lib/email-templates";

export const { handlers, signIn, signOut, auth } = NextAuth({
  ...authConfig,
  adapter: PrismaAdapter(prisma),
  providers: [
    Resend({
      from: process.env.AUTH_EMAIL_FROM,
      maxAge: 60 * 60, // 1時間（秒単位）
      sendVerificationRequest: async ({ identifier: email, url, provider }) => {
        const { subject, html } = magicLinkEmailHtml(url);
        const res = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${provider.apiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            from: provider.from,
            to: [email],
            subject,
            html,
          }),
        });
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(`メール送信に失敗しました: ${JSON.stringify(err)}`);
        }
      },
    }),
  ],
  session: { strategy: "jwt" },
});
