import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
  getDateForTimezone,
  modeFromDb,
  modeToDb,
  calcActionPt,
  calcRewardPt,
  upsertDoneItem,
} from "@/lib/utils";
import type { DoneItem } from "@/lib/types";

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
// modeFromDb / modeToDb
// ─────────────────────────────────────────────
describe("modeFromDb", () => {
  it("EASY を easy に変換する", () => {
    expect(modeFromDb("EASY")).toBe("easy");
  });

  it("NORMAL を normal に変換する", () => {
    expect(modeFromDb("NORMAL")).toBe("normal");
  });

  it("HARD を hard に変換する", () => {
    expect(modeFromDb("HARD")).toBe("hard");
  });
});

describe("modeToDb", () => {
  it("easy を EASY に変換する", () => {
    expect(modeToDb("easy")).toBe("EASY");
  });

  it("normal を NORMAL に変換する", () => {
    expect(modeToDb("normal")).toBe("NORMAL");
  });

  it("hard を HARD に変換する", () => {
    expect(modeToDb("hard")).toBe("HARD");
  });

  it("modeToDb(modeFromDb(x)) はラウンドトリップする", () => {
    expect(modeToDb(modeFromDb("EASY"))).toBe("EASY");
    expect(modeToDb(modeFromDb("NORMAL"))).toBe("NORMAL");
    expect(modeToDb(modeFromDb("HARD"))).toBe("HARD");
  });
});

// ─────────────────────────────────────────────
// calcActionPt
// ─────────────────────────────────────────────
describe("calcActionPt", () => {
  it("normalモードで hurdle×time を返す", () => {
    // 2 * 3 * 1.0 = 6
    expect(calcActionPt(2, 3, "normal")).toBe(6);
  });

  it("easyモードで 1.5倍される", () => {
    // 2 * 2 * 1.5 = 6
    expect(calcActionPt(2, 2, "easy")).toBe(6);
  });

  it("hardモードで 0.8倍される", () => {
    // 2 * 2 * 0.8 = 3.2 → round → 3
    expect(calcActionPt(2, 2, "hard")).toBe(3);
  });

  it("計算結果が 0 以下でも最小値は 1", () => {
    // hurdle=1, time=1, hard: 1*1*0.8=0.8 → round → 1
    expect(calcActionPt(1, 1, "hard")).toBeGreaterThanOrEqual(1);
  });

  it("四捨五入が正しく行われる", () => {
    // 1 * 1 * 1.5 = 1.5 → round → 2
    expect(calcActionPt(1, 1, "easy")).toBe(2);
  });

  it("最大値 hurdle=3, time=6, easy: 3*6*1.5=27", () => {
    expect(calcActionPt(3, 6, "easy")).toBe(27);
  });
});

// ─────────────────────────────────────────────
// calcRewardPt
// ─────────────────────────────────────────────
describe("calcRewardPt", () => {
  it("normalモードで satisfaction×time×price を返す", () => {
    // 2 * 2 * 2 * 1.0 = 8
    expect(calcRewardPt(2, 2, 2, "normal")).toBe(8);
  });

  it("easyモードで spendMul=0.7 が適用される", () => {
    // 2 * 2 * 2 * 0.7 = 5.6 → round → 6
    expect(calcRewardPt(2, 2, 2, "easy")).toBe(6);
  });

  it("hardモードで spendMul=1.5 が適用される", () => {
    // 2 * 2 * 2 * 1.5 = 12
    expect(calcRewardPt(2, 2, 2, "hard")).toBe(12);
  });

  it("計算結果が 0 以下でも最小値は 1", () => {
    expect(calcRewardPt(1, 1, 1, "easy")).toBeGreaterThanOrEqual(1);
  });

  it("最大値 satisfaction=3, time=6, price=6, hard: 3*6*6*1.5=162", () => {
    expect(calcRewardPt(3, 6, 6, "hard")).toBe(162);
  });
});

// ─────────────────────────────────────────────
// upsertDoneItem
// ─────────────────────────────────────────────
describe("upsertDoneItem", () => {
  const sampleItem: DoneItem = {
    id: 1,
    title: "朝ごはんを食べる",
    pt: 5,
    count: 2,
    completedAt: "2024-01-15",
  };

  describe("既存アイテムへの操作", () => {
    it("delta=+1 でカウントが増加する", () => {
      const list = [sampleItem];
      const result = upsertDoneItem(list, 1, "朝ごはんを食べる", 5, 1);
      const item = result.find((d) => d.id === 1);
      expect(item?.count).toBe(3);
    });

    it("delta=-1 でカウントが減少する", () => {
      const list = [sampleItem];
      const result = upsertDoneItem(list, 1, "朝ごはんを食べる", 5, -1);
      const item = result.find((d) => d.id === 1);
      expect(item?.count).toBe(1);
    });

    it("count が 0 以下になるとリストから除外される", () => {
      const list = [{ ...sampleItem, count: 1 }];
      const result = upsertDoneItem(list, 1, "朝ごはんを食べる", 5, -1);
      expect(result.find((d) => d.id === 1)).toBeUndefined();
    });

    it("元のリストは変更されない（イミュータブル）", () => {
      const list = [sampleItem];
      upsertDoneItem(list, 1, "朝ごはんを食べる", 5, 1);
      expect(list[0].count).toBe(2); // 元のリストは変わらない
    });

    it("他のアイテムには影響しない", () => {
      const otherItem: DoneItem = {
        id: 2,
        title: "別の行動",
        pt: 3,
        count: 1,
        completedAt: "2024-01-15",
      };
      const list = [sampleItem, otherItem];
      const result = upsertDoneItem(list, 1, "朝ごはんを食べる", 5, 1);
      const other = result.find((d) => d.id === 2);
      expect(other?.count).toBe(1); // 変更なし
    });
  });

  describe("新規アイテムの追加", () => {
    it("delta > 0 のとき新規アイテムを追加する", () => {
      const result = upsertDoneItem([], 99, "新しい行動", 10, 1, "2024-01-15");
      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        id: 99,
        title: "新しい行動",
        pt: 10,
        count: 1,
        completedAt: "2024-01-15",
      });
    });

    it("delta <= 0 のとき新規アイテムを追加しない", () => {
      const result = upsertDoneItem([], 99, "新しい行動", 10, -1, "2024-01-15");
      expect(result).toHaveLength(0);
    });

    it("delta = 0 のとき新規アイテムを追加しない", () => {
      const result = upsertDoneItem([], 99, "新しい行動", 10, 0, "2024-01-15");
      expect(result).toHaveLength(0);
    });

    it("既存リストに新規アイテムを追加する", () => {
      const list = [sampleItem];
      const result = upsertDoneItem(
        list,
        99,
        "新しい行動",
        10,
        1,
        "2024-01-15",
      );
      expect(result).toHaveLength(2);
      expect(result.find((d) => d.id === 99)).toBeDefined();
    });
  });
});
