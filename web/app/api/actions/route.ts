import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserId } from "@/lib/user";
import { toActionResponse } from "@/lib/utils";

export async function POST(req: NextRequest) {
  const userId = getUserId(req);
  const body = await req.json();
  const { title, desc, tags, hurdle, time } = body;

  const action = await prisma.action.create({
    data: { userId, title, desc: desc ?? "", tags: tags ?? [], hurdle, time },
  });

  return NextResponse.json(toActionResponse(action));
}
