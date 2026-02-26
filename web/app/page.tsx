import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import Dashboard from "@/components/Dashboard";
import LandingPage from "@/components/LandingPage";

type Props = {
  searchParams: Promise<{ welcome?: string }>;
};

export default async function Home({ searchParams }: Props) {
  // eslint-disable-next-line react-hooks/purity -- Server Component は1リクエスト1回実行のみ、副作用なし
  const now = Date.now();
  const [session, params] = await Promise.all([auth(), searchParams]);

  if (!session) return <LandingPage />;

  // welcome=1 のときだけ DB で新規ユーザー判定（それ以外は余分なクエリを発行しない）
  let welcomeMessage: "new" | "returning" | null = null;
  if (params.welcome === "1") {
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { createdAt: true },
    });
    // 作成から 60 秒以内なら新規ユーザーとみなす
    const isNew = user && now - user.createdAt.getTime() < 60_000;
    welcomeMessage = isNew ? "new" : "returning";
  }

  return <Dashboard welcomeMessage={welcomeMessage} />;
}
