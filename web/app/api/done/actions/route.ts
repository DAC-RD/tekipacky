import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserId } from "@/lib/user";
import { calcActionPt, getDateForTimezone, modeFromDb } from "@/lib/utils";
import { upsertDoneAction } from "@/lib/done";

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

  const doneItem = await upsertDoneAction(
    userId,
    actionId,
    today,
    action.title,
    pt,
  );

  return NextResponse.json(doneItem);
}
