import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserId } from "@/lib/user";
import { calcRewardPt, modeFromDb } from "@/lib/utils";
import { getDateForTimezone } from "@/lib/server/transforms";
import { upsertDoneReward } from "@/lib/done";

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

  const doneItem = await upsertDoneReward(
    userId,
    rewardId,
    today,
    reward.title,
    pt,
  );

  return NextResponse.json(doneItem);
}
