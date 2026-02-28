import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserId } from "@/lib/user";
import { toRewardResponse } from "@/lib/utils";
import {
  ValidationError,
  assertStringInRange,
  assertInt,
  assertOptionalString,
  assertOptionalStringArray,
} from "@/lib/validate";

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const userId = getUserId(req);
  const { id } = await params;
  const body = await req.json();
  const { title, desc, tags, satisfaction, time, price } = body;

  try {
    assertStringInRange(title, "title", 1, 200);
    assertInt(satisfaction, "satisfaction", 1, 5);
    assertInt(time, "time", 1, 480);
    assertInt(price, "price", 1, 100000);
    assertOptionalString(desc, "desc");
    assertOptionalStringArray(tags, "tags");
  } catch (e) {
    if (e instanceof ValidationError) {
      return NextResponse.json({ error: e.message }, { status: 400 });
    }
    throw e;
  }

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
