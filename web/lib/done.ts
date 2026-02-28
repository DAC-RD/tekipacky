import { prisma } from "@/lib/prisma";
import { toDoneItemResponse } from "@/lib/server/transforms";
import { DoneItem } from "@/lib/types";

/**
 * DoneAction の count を delta 分増減する。
 * 0以下になった場合はレコードを削除し、User.points を増減する。
 * 当日レコードが存在しない場合は何もしない。
 * DBに保存済みの pt を使用（クライアント値を信頼しない）。
 */
export async function adjustDoneAction(
  userId: string,
  actionId: number,
  today: string,
  delta: number,
): Promise<void> {
  const existing = await prisma.doneAction.findUnique({
    where: { userId_actionId_date: { userId, actionId, date: today } },
  });
  if (!existing) return;

  const newCount = existing.count + delta;
  await prisma.$transaction(async (tx) => {
    if (newCount <= 0) {
      await tx.doneAction.delete({ where: { id: existing.id } });
    } else {
      await tx.doneAction.update({
        where: { id: existing.id },
        data: { count: newCount },
      });
    }
    await tx.user.update({
      where: { id: userId },
      data: { points: { increment: existing.pt * delta } },
    });
  });
}

/**
 * DoneReward の count を delta 分増減する。
 * 0以下になった場合はレコードを削除し、User.points を増減する。
 * 当日レコードが存在しない場合は何もしない。
 * DBに保存済みの pt を使用（クライアント値を信頼しない）。
 * ご褒美は delta が + なら消費増加（decrement）、- なら消費減少（実質 increment）。
 */
export async function adjustDoneReward(
  userId: string,
  rewardId: number,
  today: string,
  delta: number,
): Promise<void> {
  const existing = await prisma.doneReward.findUnique({
    where: { userId_rewardId_date: { userId, rewardId, date: today } },
  });
  if (!existing) return;

  const newCount = existing.count + delta;
  await prisma.$transaction(async (tx) => {
    if (newCount <= 0) {
      await tx.doneReward.delete({ where: { id: existing.id } });
    } else {
      await tx.doneReward.update({
        where: { id: existing.id },
        data: { count: newCount },
      });
    }
    await tx.user.update({
      where: { id: userId },
      data: { points: { decrement: existing.pt * delta } },
    });
  });
}

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
  const done = await prisma.$transaction(async (tx) => {
    const done = await tx.doneAction.upsert({
      where: { userId_actionId_date: { userId, actionId, date: today } },
      create: { userId, actionId, title, pt, count: 1, date: today },
      update: { count: { increment: 1 } },
    });
    await tx.user.update({
      where: { id: userId },
      data: { points: { increment: pt } },
    });
    return done;
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
  const done = await prisma.$transaction(async (tx) => {
    const done = await tx.doneReward.upsert({
      where: { userId_rewardId_date: { userId, rewardId, date: today } },
      create: { userId, rewardId, title, pt, count: 1, date: today },
      update: { count: { increment: 1 } },
    });
    await tx.user.update({
      where: { id: userId },
      data: { points: { decrement: pt } },
    });
    return done;
  });

  return toDoneItemResponse(done);
}
