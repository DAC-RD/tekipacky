import { describe, it, expect } from "vitest";
import { renderHook } from "@testing-library/react";
import { useFilteredItems } from "@/hooks/useFilteredItems";

type Item = {
  id: number;
  title: string;
  desc: string;
  tags: string[];
  pt: number;
};

const items: Item[] = [
  {
    id: 1,
    title: "朝ごはん",
    desc: "健康的な食事",
    tags: ["食事", "健康"],
    pt: 3,
  },
  { id: 2, title: "散歩", desc: "", tags: ["運動"], pt: 5 },
  { id: 3, title: "読書", desc: "本を読む", tags: ["学習", "健康"], pt: 2 },
  { id: 4, title: "筋トレ", desc: "腕立て伏せ", tags: ["運動", "健康"], pt: 8 },
];

const calcPt = (item: Item) => item.pt;
const noFilters: string[] = [];

describe("useFilteredItems", () => {
  describe("フィルタなし・クエリなし・ソートなし", () => {
    it("全アイテムをそのまま返す", () => {
      const { result } = renderHook(() =>
        useFilteredItems(items, noFilters, "", "default", calcPt),
      );
      expect(result.current).toHaveLength(4);
      expect(result.current[0].id).toBe(1);
    });
  });

  describe("タグフィルタ", () => {
    it("1タグでフィルタできる", () => {
      const { result } = renderHook(() =>
        useFilteredItems(items, ["運動"], "", "default", calcPt),
      );
      expect(result.current).toHaveLength(2);
      expect(result.current.map((i) => i.id)).toEqual([2, 4]);
    });

    it("複数タグはAND条件でフィルタされる", () => {
      const { result } = renderHook(() =>
        useFilteredItems(items, ["運動", "健康"], "", "default", calcPt),
      );
      expect(result.current).toHaveLength(1);
      expect(result.current[0].id).toBe(4); // 筋トレのみ
    });

    it("マッチしないタグは空配列を返す", () => {
      const { result } = renderHook(() =>
        useFilteredItems(items, ["存在しないタグ"], "", "default", calcPt),
      );
      expect(result.current).toHaveLength(0);
    });
  });

  describe("テキスト検索", () => {
    it("タイトルで検索できる", () => {
      const { result } = renderHook(() =>
        useFilteredItems(items, noFilters, "朝", "default", calcPt),
      );
      expect(result.current).toHaveLength(1);
      expect(result.current[0].id).toBe(1);
    });

    it("説明文で検索できる", () => {
      const { result } = renderHook(() =>
        useFilteredItems(items, noFilters, "腕立て", "default", calcPt),
      );
      expect(result.current).toHaveLength(1);
      expect(result.current[0].id).toBe(4);
    });

    it("タグで検索できる", () => {
      const { result } = renderHook(() =>
        useFilteredItems(items, noFilters, "学習", "default", calcPt),
      );
      expect(result.current).toHaveLength(1);
      expect(result.current[0].id).toBe(3);
    });

    it("大文字小文字を区別しない（英字）", () => {
      const englishItems: Item[] = [
        { id: 1, title: "Morning Walk", desc: "", tags: [], pt: 1 },
      ];
      const { result } = renderHook(() =>
        useFilteredItems(englishItems, noFilters, "morning", "default", calcPt),
      );
      expect(result.current).toHaveLength(1);
    });

    it("クエリが空白のみの場合はフィルタしない", () => {
      const { result } = renderHook(() =>
        useFilteredItems(items, noFilters, "   ", "default", calcPt),
      );
      expect(result.current).toHaveLength(4);
    });
  });

  describe("ソート", () => {
    it("pt-desc で pt の高い順にソートされる", () => {
      const { result } = renderHook(() =>
        useFilteredItems(items, noFilters, "", "pt-desc", calcPt),
      );
      const pts = result.current.map((i) => i.pt);
      expect(pts).toEqual([8, 5, 3, 2]);
    });

    it("pt-asc で pt の低い順にソートされる", () => {
      const { result } = renderHook(() =>
        useFilteredItems(items, noFilters, "", "pt-asc", calcPt),
      );
      const pts = result.current.map((i) => i.pt);
      expect(pts).toEqual([2, 3, 5, 8]);
    });

    it("default では元の順序を保持する", () => {
      const { result } = renderHook(() =>
        useFilteredItems(items, noFilters, "", "default", calcPt),
      );
      expect(result.current.map((i) => i.id)).toEqual([1, 2, 3, 4]);
    });

    it("元の配列を破壊しない", () => {
      const original = [...items];
      renderHook(() =>
        useFilteredItems(items, noFilters, "", "pt-desc", calcPt),
      );
      expect(items.map((i) => i.id)).toEqual(original.map((i) => i.id));
    });
  });

  describe("フィルタ + ソートの組み合わせ", () => {
    it("タグフィルタ後に pt-desc ソートできる", () => {
      const { result } = renderHook(() =>
        useFilteredItems(items, ["健康"], "", "pt-desc", calcPt),
      );
      // 健康タグ: 朝ごはん(3pt), 読書(2pt), 筋トレ(8pt) → pt-desc: 8, 3, 2
      expect(result.current.map((i) => i.pt)).toEqual([8, 3, 2]);
    });
  });
});
