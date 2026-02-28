import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserId } from "@/lib/user";
import { getDateForTimezone } from "@/lib/utils";

/** count を delta 分増減する。0以下になったレコードを削除する */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ actionId: string }> },
) {
  const userId = getUserId(req);
  const { actionId } = await params;
  const body = await req.json();
  const { delta } = body as { delta: number };

  const user = await prisma.user.findUniqueOrThrow({
    where: { id: userId },
    select: { timezone: true },
  });
  const today = getDateForTimezone(user.timezone);

  const existing = await prisma.doneAction.findUnique({
    where: {
      userId_actionId_date: {
        userId,
        actionId: Number(actionId),
        date: today,
      },
    },
  });

  if (!existing) {
    return NextResponse.json({ ok: true });
  }

  const newCount = existing.count + delta;

  // DBに保存済みのptを使用（クライアント値を信頼しない）
  await prisma.$transaction(async (tx) => {
    if (newCount <= 0) {
      await tx.doneAction.delete({ where: { id: existing.id } });
    } else {
      await tx.doneAction.update({
        where: { id: existing.id },
        data: { count: newCount },
      });
    }
    await tx.user.update({
      where: { id: userId },
      data: { points: { increment: existing.pt * delta } },
    });
  });

  return NextResponse.json({ ok: true });
}
