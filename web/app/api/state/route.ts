import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserId } from "@/lib/user";
import { modeFromDb } from "@/lib/utils";
import {
  getDateForTimezone,
  toActionResponse,
  toRewardResponse,
  toDoneItemResponse,
} from "@/lib/server/transforms";

export async function GET(req: NextRequest) {
  const userId = getUserId(req);

  const user = await prisma.user.findUniqueOrThrow({
    where: { id: userId },
  });

  const today = getDateForTimezone(user.timezone);

  const [actions, rewards, doneActions, doneRewards] = await Promise.all([
    prisma.action.findMany({ where: { userId }, orderBy: { id: "asc" } }),
    prisma.reward.findMany({ where: { userId }, orderBy: { id: "asc" } }),
    prisma.doneAction.findMany({ where: { userId, date: today } }),
    prisma.doneReward.findMany({ where: { userId, date: today } }),
  ]);

  return NextResponse.json({
    points: user.points,
    mode: modeFromDb(user.mode),
    actions: actions.map(toActionResponse),
    rewards: rewards.map(toRewardResponse),
    // actionId/rewardId が null のレコードは「Action/Reward が削除されたが過去ログとして残っているもの」。
    // schema.prisma の onDelete: SetNull により、Action/Reward 削除時に外部キーが NULL 化される。
    // フロント側では削除済みのマスタに紐づく Done ログは表示できないため除外する。
    // ※このフィルタを外したり、nullable 制約を外したりすると整合性が崩れるので注意。
    doneActions: doneActions
      .filter((d) => d.actionId !== null)
      .map(toDoneItemResponse),
    doneRewards: doneRewards
      .filter((d) => d.rewardId !== null)
      .map(toDoneItemResponse),
  });
}
