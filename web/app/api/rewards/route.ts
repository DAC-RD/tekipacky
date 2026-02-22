import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserId } from "@/lib/user";
import { toRewardResponse } from "@/lib/utils";

export async function POST(req: NextRequest) {
  const userId = getUserId(req);
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

  return NextResponse.json(toRewardResponse(reward));
}
