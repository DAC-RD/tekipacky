import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
  getDateForTimezone,
  toActionResponse,
  toRewardResponse,
  toDoneItemResponse,
} from "@/lib/server/transforms";

// ─────────────────────────────────────────────
// getDateForTimezone
// ─────────────────────────────────────────────
describe("getDateForTimezone", () => {
  beforeEach(() => {
    // 2024-01-15 00:00:00 UTC に固定
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2024-01-15T00:00:00Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("YYYY-MM-DD 形式で返す", () => {
    const result = getDateForTimezone("UTC");
    expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it("UTC では 2024-01-15 を返す", () => {
    expect(getDateForTimezone("UTC")).toBe("2024-01-15");
  });

  it("Asia/Tokyo (UTC+9) では 2024-01-15 を返す (UTCの00:00は東京の09:00)", () => {
    expect(getDateForTimezone("Asia/Tokyo")).toBe("2024-01-15");
  });

  it("America/New_York (UTC-5) では 2024-01-14 を返す (UTCの00:00はNYの前日19:00)", () => {
    expect(getDateForTimezone("America/New_York")).toBe("2024-01-14");
  });

  it("日付が変わるタイミングでタイムゾーンごとに異なる日付を返す", () => {
    // 2024-01-15 10:00:00 UTC
    vi.setSystemTime(new Date("2024-01-15T10:00:00Z"));
    const utc = getDateForTimezone("UTC");
    const tokyo = getDateForTimezone("Asia/Tokyo");
    // 東京は UTC+9 なので同じ日（19:00）
    expect(utc).toBe("2024-01-15");
    expect(tokyo).toBe("2024-01-15");
  });
});

// ─────────────────────────────────────────────
// toActionResponse
// ─────────────────────────────────────────────
describe("toActionResponse", () => {
  it("Prismaレコードを Action 型に変換する", () => {
    const result = toActionResponse({
      id: 1,
      title: "朝ごはんを食べる",
      desc: "説明",
      tags: ["健康"],
      hurdle: 2,
      time: 3,
    });
    expect(result).toEqual({
      id: 1,
      title: "朝ごはんを食べる",
      desc: "説明",
      tags: ["健康"],
      hurdle: 2,
      time: 3,
    });
  });
});

// ─────────────────────────────────────────────
// toRewardResponse
// ─────────────────────────────────────────────
describe("toRewardResponse", () => {
  it("Prismaレコードを Reward 型に変換する", () => {
    const result = toRewardResponse({
      id: 2,
      title: "Netflixを見る",
      desc: "",
      tags: [],
      satisfaction: 3,
      time: 2,
      price: 1000,
    });
    expect(result).toEqual({
      id: 2,
      title: "Netflixを見る",
      desc: "",
      tags: [],
      satisfaction: 3,
      time: 2,
      price: 1000,
    });
  });
});

// ─────────────────────────────────────────────
// toDoneItemResponse
// ─────────────────────────────────────────────
describe("toDoneItemResponse", () => {
  it("DoneAction レコードを DoneItem 型に変換する（actionId を id にする）", () => {
    const result = toDoneItemResponse({
      actionId: 5,
      rewardId: null,
      title: "朝ごはん",
      pt: 6,
      count: 2,
      date: "2024-01-15",
    });
    expect(result).toEqual({
      id: 5,
      title: "朝ごはん",
      pt: 6,
      count: 2,
      completedAt: "2024-01-15",
    });
  });

  it("DoneReward レコードを DoneItem 型に変換する（rewardId を id にする）", () => {
    const result = toDoneItemResponse({
      actionId: null,
      rewardId: 7,
      title: "Netflix",
      pt: 4,
      count: 1,
      date: "2024-01-15",
    });
    expect(result).toEqual({
      id: 7,
      title: "Netflix",
      pt: 4,
      count: 1,
      completedAt: "2024-01-15",
    });
  });
});
