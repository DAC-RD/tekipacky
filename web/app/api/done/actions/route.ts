import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getOrCreateUser, applyUserCookie } from "@/lib/user";
import { getDateForTimezone } from "@/lib/utils";

export async function POST(req: NextRequest) {
  const { userId, isNew } = await getOrCreateUser(req);
  const body = await req.json();
  const { actionId, pt } = body as { actionId: number; pt: number };

  const user = await prisma.user.findUniqueOrThrow({
    where: { id: userId },
    select: { timezone: true },
  });
  const today = getDateForTimezone(user.timezone);

  const action = await prisma.action.findUniqueOrThrow({
    where: { id: actionId, userId },
  });

  // 既存レコードがあればcountを+1、なければ新規作成
  const done = await prisma.doneAction.upsert({
    where: { userId_actionId_date: { userId, actionId, date: today } },
    create: {
      userId,
      actionId,
      title: action.title,
      pt,
      count: 1,
      date: today,
    },
    update: { count: { increment: 1 } },
  });

  // ポイントを更新
  await prisma.user.update({
    where: { id: userId },
    data: { points: { increment: pt } },
  });

  const res = NextResponse.json({
    id: done.actionId,
    title: done.title,
    pt: done.pt,
    count: done.count,
    completedAt: done.date,
  });
  if (isNew) applyUserCookie(res, userId);
  return res;
}
