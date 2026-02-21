import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getOrCreateUser, applyUserCookie } from "@/lib/user";

export async function POST(req: NextRequest) {
  const { userId, isNew } = await getOrCreateUser(req);
  const body = await req.json();
  const { title, desc, tags, hurdle, time } = body;

  const action = await prisma.action.create({
    data: { userId, title, desc: desc ?? "", tags: tags ?? [], hurdle, time },
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
