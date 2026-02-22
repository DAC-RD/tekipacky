import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserId } from "@/lib/user";
import { toRewardResponse } from "@/lib/utils";

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const userId = getUserId(req);
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

  return NextResponse.json(toRewardResponse(reward));
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const userId = getUserId(req);
  const { id } = await params;

  await prisma.reward.delete({ where: { id: Number(id), userId } });

  return NextResponse.json({ ok: true });
}
