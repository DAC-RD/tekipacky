import { describe, expect, it } from "vitest";
import {
  buildEmailChangeIdentifier,
  buildEmailChangeUserPrefix,
  parseEmailChangeIdentifier,
} from "@/lib/tokens";

describe("buildEmailChangeIdentifier", () => {
  it("正しい形式の識別子を返す", () => {
    expect(buildEmailChangeIdentifier("user-123", "new@example.com")).toBe(
      "email-change:user-123|new@example.com",
    );
  });
});

describe("buildEmailChangeUserPrefix", () => {
  it("ユーザー用プレフィックスを返す", () => {
    expect(buildEmailChangeUserPrefix("user-123")).toBe(
      "email-change:user-123|",
    );
  });

  it("buildEmailChangeIdentifier の先頭と一致する", () => {
    const prefix = buildEmailChangeUserPrefix("user-123");
    const identifier = buildEmailChangeIdentifier(
      "user-123",
      "new@example.com",
    );
    expect(identifier.startsWith(prefix)).toBe(true);
  });
});

describe("parseEmailChangeIdentifier", () => {
  it("正しい識別子をパースする", () => {
    const result = parseEmailChangeIdentifier(
      "email-change:user-123|new@example.com",
    );
    expect(result).toEqual({ userId: "user-123", newEmail: "new@example.com" });
  });

  it("buildとparseが往復する", () => {
    const identifier = buildEmailChangeIdentifier(
      "user-abc",
      "test@example.com",
    );
    expect(parseEmailChangeIdentifier(identifier)).toEqual({
      userId: "user-abc",
      newEmail: "test@example.com",
    });
  });

  it("プレフィックスが違う場合はnullを返す", () => {
    expect(
      parseEmailChangeIdentifier("other:user-123|new@example.com"),
    ).toBeNull();
  });

  it("セパレータがない場合はnullを返す", () => {
    expect(
      parseEmailChangeIdentifier("email-change:user-123-no-sep"),
    ).toBeNull();
  });

  it("空文字はnullを返す", () => {
    expect(parseEmailChangeIdentifier("")).toBeNull();
  });
});
