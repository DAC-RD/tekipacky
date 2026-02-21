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
  const { title, desc, tags, satisfaction, time, price } = body;

  const reward = await prisma.reward.update({
    where: { id: Number(id), userId },
    data: {
      title,
      desc: desc ?? "",
      tags: tags ?? [],
      satisfaction,
      time,
      price,
    },
  });

  const res = NextResponse.json({
    id: reward.id,
    title: reward.title,
    desc: reward.desc,
    tags: reward.tags,
    satisfaction: reward.satisfaction,
    time: reward.time,
    price: reward.price,
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

  await prisma.reward.delete({ where: { id: Number(id), userId } });

  const res = NextResponse.json({ ok: true });
  if (isNew) applyUserCookie(res, userId);
  return res;
}
