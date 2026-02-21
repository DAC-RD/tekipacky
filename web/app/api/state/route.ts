import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getOrCreateUser, applyUserCookie } from "@/lib/user";
import { getDateForTimezone, modeFromDb } from "@/lib/utils";

export async function GET(req: NextRequest) {
  const { userId, isNew } = await getOrCreateUser(req);

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

  const state = {
    points: user.points,
    mode: modeFromDb(user.mode),
    actions: actions.map((a) => ({
      id: a.id,
      title: a.title,
      desc: a.desc,
      tags: a.tags,
      hurdle: a.hurdle,
      time: a.time,
    })),
    rewards: rewards.map((r) => ({
      id: r.id,
      title: r.title,
      desc: r.desc,
      tags: r.tags,
      satisfaction: r.satisfaction,
      time: r.time,
      price: r.price,
    })),
    // actionId が null（行動削除済み）のものは除外
    doneActions: doneActions
      .filter((d) => d.actionId !== null)
      .map((d) => ({
        id: d.actionId!,
        title: d.title,
        pt: d.pt,
        count: d.count,
        completedAt: d.date,
      })),
    doneRewards: doneRewards
      .filter((d) => d.rewardId !== null)
      .map((d) => ({
        id: d.rewardId!,
        title: d.title,
        pt: d.pt,
        count: d.count,
        completedAt: d.date,
      })),
  };

  const res = NextResponse.json(state);
  if (isNew) applyUserCookie(res, userId);
  return res;
}
