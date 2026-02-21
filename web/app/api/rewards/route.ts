import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getOrCreateUser, applyUserCookie } from "@/lib/user";

export async function POST(req: NextRequest) {
  const { userId, isNew } = await getOrCreateUser(req);
  const body = await req.json();
  const { title, desc, tags, satisfaction, time, price } = body;

  const reward = await prisma.reward.create({
    data: {
      userId,
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
