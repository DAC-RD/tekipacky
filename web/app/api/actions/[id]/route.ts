import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getOrCreateUser, applyUserCookie } from "@/lib/user";

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { userId, isNew } = await getOrCreateUser(req);
  const { id } = await params;
  const body = await req.json();
  const { title, desc, tags, hurdle, time } = body;

  const action = await prisma.action.update({
    where: { id: Number(id), userId },
    data: { title, desc: desc ?? "", tags: tags ?? [], hurdle, time },
  });

  const res = NextResponse.json({
    id: action.id,
    title: action.title,
    desc: action.desc,
    tags: action.tags,
    hurdle: action.hurdle,
    time: action.time,
  });
  if (isNew) applyUserCookie(res, userId);
  return res;
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { userId, isNew } = await getOrCreateUser(req);
  const { id } = await params;

  await prisma.action.delete({ where: { id: Number(id), userId } });

  const res = NextResponse.json({ ok: true });
  if (isNew) applyUserCookie(res, userId);
  return res;
}
