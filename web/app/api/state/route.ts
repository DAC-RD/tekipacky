import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserId } from "@/lib/user";
import {
  getDateForTimezone,
  modeFromDb,
  toActionResponse,
  toRewardResponse,
  toDoneItemResponse,
} from "@/lib/utils";

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
    // actionId/rewardId が null（削除済み）のものは除外
    doneActions: doneActions
      .filter((d) => d.actionId !== null)
      .map(toDoneItemResponse),
    doneRewards: doneRewards
      .filter((d) => d.rewardId !== null)
      .map(toDoneItemResponse),
  });
}
