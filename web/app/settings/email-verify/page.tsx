import { redirect } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";

type Props = {
  searchParams: Promise<{ token?: string }>;
};

export default async function EmailVerifyPage({ searchParams }: Props) {
  const { token } = await searchParams;

  if (!token) {
    return <ErrorPage message="トークンが見つかりません。" />;
  }

  const vt = await prisma.verificationToken.findFirst({ where: { token } });

  if (!vt || !vt.identifier.startsWith("email-change:")) {
    return <ErrorPage message="無効なリンクです。" />;
  }

  if (vt.expires < new Date()) {
    return (
      <ErrorPage message="リンクの有効期限が切れています。設定ページから再度お試しください。" />
    );
  }

  // identifier = "email-change:${userId}|${newEmail}"
  const rest = vt.identifier.replace("email-change:", "");
  const pipeIndex = rest.indexOf("|");
  if (pipeIndex === -1) {
    return <ErrorPage message="無効なトークンです。" />;
  }
  const userId = rest.slice(0, pipeIndex);
  const newEmail = rest.slice(pipeIndex + 1);

  // 新しいメールが既に使用されていないか再確認
  const existing = await prisma.user.findUnique({ where: { email: newEmail } });
  if (existing && existing.id !== userId) {
    await prisma.verificationToken.delete({
      where: { identifier_token: { identifier: vt.identifier, token } },
    });
    return <ErrorPage message="このメールアドレスは既に使用されています。" />;
  }

  await prisma.user.update({
    where: { id: userId },
    data: { email: newEmail },
  });

  await prisma.verificationToken.delete({
    where: { identifier_token: { identifier: vt.identifier, token } },
  });

  redirect("/settings?success=emailChanged");
}

function ErrorPage({ message }: { message: string }) {
  return (
    <div
      className="min-h-screen flex items-center justify-center px-6"
      style={{ background: "var(--bg)" }}
    >
      <div className="w-full max-w-sm text-center">
        <p className="text-lg font-bold mb-4" style={{ color: "var(--text)" }}>
          {message}
        </p>
        <Link href="/settings" style={{ color: "var(--accent)" }}>
          設定ページへ戻る
        </Link>
      </div>
    </div>
  );
}
