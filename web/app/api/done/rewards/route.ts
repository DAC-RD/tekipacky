import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserId } from "@/lib/user";
import {
  calcRewardPt,
  getDateForTimezone,
  modeFromDb,
  toDoneItemResponse,
} from "@/lib/utils";

export async function POST(req: NextRequest) {
  const userId = getUserId(req);
  const body = await req.json();
  const { rewardId } = body as { rewardId: number };

  const user = await prisma.user.findUniqueOrThrow({
    where: { id: userId },
    select: { timezone: true, mode: true, points: true },
  });
  const today = getDateForTimezone(user.timezone);

  const reward = await prisma.reward.findUniqueOrThrow({
    where: { id: rewardId, userId },
  });

  // サーバー側でptを計算（クライアント値を信頼しない）
  const pt = calcRewardPt(
    reward.satisfaction,
    reward.time,
    reward.price,
    modeFromDb(user.mode),
  );

  // サーバー側でも残高チェック
  if (user.points < pt) {
    return NextResponse.json({ error: "insufficient points" }, { status: 400 });
  }

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

  return NextResponse.json(toDoneItemResponse(done));
}
