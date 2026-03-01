import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserId } from "@/lib/user";
import { toActionResponse } from "@/lib/server/transforms";
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
  const { title, desc, tags, hurdle, time } = body;

  try {
    assertStringInRange(title, "title", 1, 200);
    assertInt(hurdle, "hurdle", 1, 3);
    assertInt(time, "time", 1, 6);
    assertOptionalString(desc, "desc");
    assertOptionalStringArray(tags, "tags");
  } catch (e) {
    if (e instanceof ValidationError) {
      return NextResponse.json({ error: e.message }, { status: 400 });
    }
    throw e;
  }

  const action = await prisma.action.create({
    data: { userId, title, desc: desc ?? "", tags: tags ?? [], hurdle, time },
  });

  return NextResponse.json(toActionResponse(action));
}
