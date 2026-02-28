import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserId } from "@/lib/user";
import { getDateForTimezone } from "@/lib/server/transforms";
import { ValidationError, assertNonZeroInt } from "@/lib/validate";
import { adjustDoneAction } from "@/lib/done";

/** count を delta 分増減する。0以下になったレコードを削除する */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ actionId: string }> },
) {
  const userId = getUserId(req);
  const { actionId } = await params;
  const body = await req.json();
  const { delta } = body;

  try {
    assertNonZeroInt(delta, "delta");
  } catch (e) {
    if (e instanceof ValidationError) {
      return NextResponse.json({ error: e.message }, { status: 400 });
    }
    throw e;
  }

  const user = await prisma.user.findUniqueOrThrow({
    where: { id: userId },
    select: { timezone: true },
  });
  const today = getDateForTimezone(user.timezone);

  await adjustDoneAction(userId, Number(actionId), today, delta);

  return NextResponse.json({ ok: true });
}
