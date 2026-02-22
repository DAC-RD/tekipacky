import { NextRequest } from "next/server";

/**
 * proxy が注入した x-user-id ヘッダーから userId を取得する。
 * userId の解決・Cookie 付与は proxy.ts で一元管理している。
 */
export function getUserId(req: NextRequest): string {
  const userId = req.headers.get("x-user-id");
  if (!userId) throw new Error("x-user-id header missing");
  return userId;
}
