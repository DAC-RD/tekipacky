import { NextRequest } from "next/server";

/**
 * API テスト用の NextRequest を生成するヘルパー
 * @param method - HTTP メソッド
 * @param url - パスのみ（例: "/api/actions"）
 * @param body - リクエストボディ（省略時は body なし）
 * @param userId - x-user-id ヘッダーの値（デフォルト: "test-user-123"）
 * @param extraHeaders - 追加ヘッダー
 */
export function makeRequest(
  method: string,
  url: string,
  body?: unknown,
  userId = "test-user-123",
  extraHeaders?: Record<string, string>,
): NextRequest {
  const headers: Record<string, string> = {
    "x-user-id": userId,
    ...extraHeaders,
  };
  if (body !== undefined) {
    headers["Content-Type"] = "application/json";
  }
  return new NextRequest(`http://localhost${url}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
}
