import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getOrCreateUser, applyUserCookie } from "@/lib/user";
import { modeToDb } from "@/lib/utils";
import { Mode } from "@/lib/types";

export async function PATCH(req: NextRequest) {
  const { userId, isNew } = await getOrCreateUser(req);
  const body = await req.json();
  const { mode } = body as { mode: Mode };

  await prisma.user.update({
    where: { id: userId },
    data: { mode: modeToDb(mode) },
  });

  const res = NextResponse.json({ ok: true });
  if (isNew) applyUserCookie(res, userId);
  return res;
}
