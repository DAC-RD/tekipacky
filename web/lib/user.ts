import { NextRequest, NextResponse } from "next/server";
import { prisma } from "./prisma";

const COOKIE_NAME = "userId";
const COOKIE_MAX_AGE = 365 * 24 * 60 * 60; // 1年

/**
 * Cookieからユーザーを取得、存在しなければ空で新規作成する。
 * ルートハンドラの先頭で呼び出し、isNew が true の場合はレスポンスにCookieをセットすること。
 */
export async function getOrCreateUser(
  req: NextRequest,
): Promise<{ userId: string; isNew: boolean }> {
  const userId = req.cookies.get(COOKIE_NAME)?.value;

  if (userId) {
    const exists = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true },
    });
    if (exists) return { userId, isNew: false };
  }

  const user = await prisma.user.create({ data: {} });
  return { userId: user.id, isNew: true };
}

/** 新規ユーザーのCookieをレスポンスにセットする */
export function applyUserCookie<T>(
  res: NextResponse<T>,
  userId: string,
): NextResponse<T> {
  res.cookies.set(COOKIE_NAME, userId, {
    httpOnly: true,
    sameSite: "lax",
    maxAge: COOKIE_MAX_AGE,
    path: "/",
  });
  return res;
}
