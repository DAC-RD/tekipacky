import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserId } from "@/lib/user";
import {
  calcActionPt,
  getDateForTimezone,
  modeFromDb,
  toDoneItemResponse,
} from "@/lib/utils";

export async function POST(req: NextRequest) {
  const userId = getUserId(req);
  const body = await req.json();
  const { actionId } = body as { actionId: number };

  const user = await prisma.user.findUniqueOrThrow({
    where: { id: userId },
    select: { timezone: true, mode: true },
  });
  const today = getDateForTimezone(user.timezone);

  const action = await prisma.action.findUniqueOrThrow({
    where: { id: actionId, userId },
  });

  // サーバー側でptを計算（クライアント値を信頼しない）
  const pt = calcActionPt(action.hurdle, action.time, modeFromDb(user.mode));

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

  return NextResponse.json(toDoneItemResponse(done));
}
