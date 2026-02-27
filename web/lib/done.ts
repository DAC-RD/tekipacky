import { prisma } from "@/lib/prisma";
import { toDoneItemResponse } from "@/lib/utils";
import { DoneItem } from "@/lib/types";

/**
 * DoneAction を upsert してポイントを加算する。
 * 既存レコードがあれば count を +1、なければ新規作成。
 */
export async function upsertDoneAction(
  userId: string,
  actionId: number,
  today: string,
  title: string,
  pt: number,
): Promise<DoneItem> {
  const done = await prisma.doneAction.upsert({
    where: { userId_actionId_date: { userId, actionId, date: today } },
    create: { userId, actionId, title, pt, count: 1, date: today },
    update: { count: { increment: 1 } },
  });

  await prisma.user.update({
    where: { id: userId },
    data: { points: { increment: pt } },
  });

  return toDoneItemResponse(done);
}

/**
 * DoneReward を upsert してポイントを減算する。
 * 既存レコードがあれば count を +1、なければ新規作成。
 */
export async function upsertDoneReward(
  userId: string,
  rewardId: number,
  today: string,
  title: string,
  pt: number,
): Promise<DoneItem> {
  const done = await prisma.doneReward.upsert({
    where: { userId_rewardId_date: { userId, rewardId, date: today } },
    create: { userId, rewardId, title, pt, count: 1, date: today },
    update: { count: { increment: 1 } },
  });

  await prisma.user.update({
    where: { id: userId },
    data: { points: { decrement: pt } },
  });

  return toDoneItemResponse(done);
}
