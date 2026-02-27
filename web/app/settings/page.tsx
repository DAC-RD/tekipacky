import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import SettingsPage from "@/components/SettingsPage";

type Props = {
  searchParams: Promise<{ success?: string }>;
};

export default async function Settings({ searchParams }: Props) {
  const [session, params] = await Promise.all([auth(), searchParams]);

  if (!session?.user?.id) redirect("/signin");

  const user = await prisma.user.findUniqueOrThrow({
    where: { id: session.user.id },
    select: { email: true },
  });

  return <SettingsPage email={user.email} successMessage={params.success} />;
}
