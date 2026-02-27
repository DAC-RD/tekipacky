import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserId } from "@/lib/user";
import { modeToDb } from "@/lib/utils";
import { Mode } from "@/lib/types";

export async function GET(req: NextRequest) {
  const userId = getUserId(req);
  const user = await prisma.user.findUniqueOrThrow({
    where: { id: userId },
    select: { email: true },
  });
  return NextResponse.json({ email: user.email });
}

export async function PATCH(req: NextRequest) {
  const userId = getUserId(req);
  const body = await req.json();
  const { mode } = body as { mode: Mode };

  await prisma.user.update({
    where: { id: userId },
    data: { mode: modeToDb(mode) },
  });

  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest) {
  const userId = getUserId(req);
  await prisma.user.delete({ where: { id: userId } });
  return NextResponse.json({ ok: true });
}
