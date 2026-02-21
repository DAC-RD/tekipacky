import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getOrCreateUser, applyUserCookie } from "@/lib/user";
import { getDateForTimezone } from "@/lib/utils";

export async function POST(req: NextRequest) {
  const { userId, isNew } = await getOrCreateUser(req);
  const body = await req.json();
  const { rewardId, pt } = body as { rewardId: number; pt: number };

  const user = await prisma.user.findUniqueOrThrow({
    where: { id: userId },
    select: { timezone: true },
  });
  const today = getDateForTimezone(user.timezone);

  const reward = await prisma.reward.findUniqueOrThrow({
    where: { id: rewardId, userId },
  });

  // 既存レコードがあればcountを+1、なければ新規作成
  const done = await prisma.doneReward.upsert({
    where: { userId_rewardId_date: { userId, rewardId, date: today } },
    create: {
      userId,
      rewardId,
      title: reward.title,
      pt,
      count: 1,
      date: today,
    },
    update: { count: { increment: 1 } },
  });

  // ポイントを減算
  await prisma.user.update({
    where: { id: userId },
    data: { points: { decrement: pt } },
  });

  const res = NextResponse.json({
    id: done.rewardId,
    title: done.title,
    pt: done.pt,
    count: done.count,
    completedAt: done.date,
  });
  if (isNew) applyUserCookie(res, userId);
  return res;
}
