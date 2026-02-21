import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const COOKIE_NAME = "userId";
const COOKIE_MAX_AGE = 365 * 24 * 60 * 60; // 1年

/**
 * /api/* へのリクエストに対して userId を解決し、ルートハンドラに x-user-id ヘッダーで渡す。
 * Cookie が未設定または無効な場合は新規 User を作成して Cookie をセットする。
 */
export async function proxy(req: NextRequest) {
  const cookieUserId = req.cookies.get(COOKIE_NAME)?.value;

  let userId: string;
  let isNew = false;

  if (cookieUserId) {
    const exists = await prisma.user.findUnique({
      where: { id: cookieUserId },
      select: { id: true },
    });
    if (exists) {
      userId = cookieUserId;
    } else {
      const user = await prisma.user.create({ data: {} });
      userId = user.id;
      isNew = true;
    }
  } else {
    const user = await prisma.user.create({ data: {} });
    userId = user.id;
    isNew = true;
  }

  // 後続のルートハンドラに userId を渡す
  const requestHeaders = new Headers(req.headers);
  requestHeaders.set("x-user-id", userId);

  const res = NextResponse.next({
    request: { headers: requestHeaders },
  });

  if (isNew) {
    res.cookies.set(COOKIE_NAME, userId, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      maxAge: COOKIE_MAX_AGE,
      path: "/",
    });
  }

  return res;
}

export const config = {
  matcher: ["/api/:path*"],
};
