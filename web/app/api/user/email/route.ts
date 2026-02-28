import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserId } from "@/lib/user";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const IDENTIFIER_PREFIX = "email-change:";

export async function POST(req: NextRequest) {
  const userId = getUserId(req);
  const body = await req.json();
  const { newEmail } = body as { newEmail: string };

  if (!newEmail || !EMAIL_REGEX.test(newEmail)) {
    return NextResponse.json(
      { error: "不正なメールアドレスです" },
      { status: 400 },
    );
  }

  const user = await prisma.user.findUniqueOrThrow({
    where: { id: userId },
    select: { email: true },
  });

  if (user.email === newEmail) {
    return NextResponse.json(
      { error: "現在と同じメールアドレスです" },
      { status: 400 },
    );
  }

  const existing = await prisma.user.findUnique({ where: { email: newEmail } });
  if (existing) {
    return NextResponse.json(
      { error: "このメールアドレスは既に使用されています" },
      { status: 400 },
    );
  }

  const token = crypto.randomUUID();
  const expires = new Date(Date.now() + 24 * 60 * 60 * 1000);
  const identifier = `${IDENTIFIER_PREFIX}${userId}|${newEmail}`;

  // ユーザーの既存トークンを削除して新しいトークンを作成
  await prisma.verificationToken.deleteMany({
    where: { identifier: { startsWith: `${IDENTIFIER_PREFIX}${userId}|` } },
  });
  await prisma.verificationToken.create({
    data: { identifier, token, expires },
  });

  // Resend でメール送信
  const baseUrl = process.env.AUTH_URL ?? "http://localhost:3000";
  const verifyUrl = `${baseUrl}/settings/email-verify?token=${token}`;
  const resendRes = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.AUTH_RESEND_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: process.env.AUTH_EMAIL_FROM,
      to: [newEmail],
      subject: "【テキパッキー】メールアドレス変更の確認",
      html: `
        <p>テキパッキーのメールアドレス変更リクエストを受け付けました。</p>
        <p>以下のリンクをクリックして、メールアドレスの変更を完了してください。</p>
        <p><a href="${verifyUrl}">${verifyUrl}</a></p>
        <p>このリンクは24時間有効です。</p>
        <p>このメールに心当たりがない場合は、無視してください。</p>
      `,
    }),
  });
  if (!resendRes.ok) {
    const err = await resendRes.json().catch(() => ({}));
    console.error("Resend error:", err);
    return NextResponse.json(
      { error: "メール送信に失敗しました。しばらく経ってから再試行してください。" },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true });
}
