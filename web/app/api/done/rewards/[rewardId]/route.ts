import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getOrCreateUser, applyUserCookie } from "@/lib/user";
import { getDateForTimezone } from "@/lib/utils";

/** count を delta 分増減する。0以下になったレコードを削除する */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ rewardId: string }> },
) {
  const { userId, isNew } = await getOrCreateUser(req);
  const { rewardId } = await params;
  const body = await req.json();
  const { delta, pt } = body as { delta: number; pt: number };

  const user = await prisma.user.findUniqueOrThrow({
    where: { id: userId },
    select: { timezone: true },
  });
  const today = getDateForTimezone(user.timezone);

  const existing = await prisma.doneReward.findUnique({
    where: {
      userId_rewardId_date: {
        userId,
        rewardId: Number(rewardId),
        date: today,
      },
    },
  });

  if (!existing) {
    const res = NextResponse.json({ ok: true });
    if (isNew) applyUserCookie(res, userId);
    return res;
  }

  const newCount = existing.count + delta;

  if (newCount <= 0) {
    await prisma.doneReward.delete({ where: { id: existing.id } });
  } else {
    await prisma.doneReward.update({
      where: { id: existing.id },
      data: { count: newCount },
    });
  }

  // ポイントを調整（delta × pt）: ご褒美はdeltaが+なら消費増加（減算）
  await prisma.user.update({
    where: { id: userId },
    data: { points: { decrement: pt * delta } },
  });

  const res = NextResponse.json({ ok: true });
  if (isNew) applyUserCookie(res, userId);
  return res;
}
