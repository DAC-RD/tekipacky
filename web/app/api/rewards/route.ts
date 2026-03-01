import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserId } from "@/lib/user";
import { toRewardResponse } from "@/lib/server/transforms";
import {
  ValidationError,
  assertStringInRange,
  assertInt,
  assertOptionalString,
  assertOptionalStringArray,
} from "@/lib/validate";

export async function POST(req: NextRequest) {
  const userId = getUserId(req);
  const body = await req.json();
  const { title, desc, tags, satisfaction, time, price } = body;

  try {
    assertStringInRange(title, "title", 1, 200);
    assertInt(satisfaction, "satisfaction", 1, 3);
    assertInt(time, "time", 1, 6);
    assertInt(price, "price", 1, 6);
    assertOptionalString(desc, "desc");
    assertOptionalStringArray(tags, "tags");
  } catch (e) {
    if (e instanceof ValidationError) {
      return NextResponse.json({ error: e.message }, { status: 400 });
    }
    throw e;
  }

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
