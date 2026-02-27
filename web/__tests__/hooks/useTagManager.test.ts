import { describe, it, expect } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useTagManager } from "@/hooks/useTagManager";

const tagPool = ["食事", "運動", "健康", "学習"];

describe("useTagManager", () => {
  describe("初期状態", () => {
    it("initialTags がセットされる", () => {
      const { result } = renderHook(() =>
        useTagManager(["食事", "運動"], tagPool),
      );
      expect(result.current.tags).toEqual(["食事", "運動"]);
    });

    it("tagInput は空文字", () => {
      const { result } = renderHook(() => useTagManager([], tagPool));
      expect(result.current.tagInput).toBe("");
    });

    it("tagInput が空のとき filteredTagSuggestions はすべて返す", () => {
      const { result } = renderHook(() => useTagManager([], tagPool));
      expect(result.current.filteredTagSuggestions).toEqual(tagPool);
    });
  });

  describe("filteredTagSuggestions", () => {
    it("tagInput でフィルタされる", () => {
      const { result } = renderHook(() => useTagManager([], tagPool));
      act(() => {
        result.current.setTagInput("健");
      });
      expect(result.current.filteredTagSuggestions).toEqual(["健康"]);
    });

    it("大文字小文字を区別しない", () => {
      const pool = ["Exercise", "Food"];
      const { result } = renderHook(() => useTagManager([], pool));
      act(() => {
        result.current.setTagInput("ex");
      });
      expect(result.current.filteredTagSuggestions).toEqual(["Exercise"]);
    });

    it("マッチしない場合は空配列", () => {
      const { result } = renderHook(() => useTagManager([], tagPool));
      act(() => {
        result.current.setTagInput("存在しない");
      });
      expect(result.current.filteredTagSuggestions).toHaveLength(0);
    });
  });

  describe("addTag", () => {
    it("新しいタグを追加できる", () => {
      const { result } = renderHook(() => useTagManager([], tagPool));
      act(() => {
        result.current.addTag("新タグ");
      });
      expect(result.current.tags).toContain("新タグ");
    });

    it("前後の空白はトリムされる", () => {
      const { result } = renderHook(() => useTagManager([], tagPool));
      act(() => {
        result.current.addTag("  新タグ  ");
      });
      expect(result.current.tags).toContain("新タグ");
    });

    it("空文字は追加されない", () => {
      const { result } = renderHook(() => useTagManager([], tagPool));
      act(() => {
        result.current.addTag("");
      });
      expect(result.current.tags).toHaveLength(0);
    });

    it("空白のみも追加されない", () => {
      const { result } = renderHook(() => useTagManager([], tagPool));
      act(() => {
        result.current.addTag("   ");
      });
      expect(result.current.tags).toHaveLength(0);
    });

    it("重複タグは追加されない", () => {
      const { result } = renderHook(() => useTagManager(["食事"], tagPool));
      act(() => {
        result.current.addTag("食事");
      });
      expect(result.current.tags).toHaveLength(1);
    });
  });

  describe("removeTag", () => {
    it("指定したタグを削除できる", () => {
      const { result } = renderHook(() =>
        useTagManager(["食事", "運動"], tagPool),
      );
      act(() => {
        result.current.removeTag("食事");
      });
      expect(result.current.tags).toEqual(["運動"]);
    });

    it("存在しないタグを削除しても変化しない", () => {
      const { result } = renderHook(() => useTagManager(["食事"], tagPool));
      act(() => {
        result.current.removeTag("存在しない");
      });
      expect(result.current.tags).toEqual(["食事"]);
    });
  });

  describe("toggleExistingTag", () => {
    it("未選択のタグを選択できる", () => {
      const { result } = renderHook(() => useTagManager([], tagPool));
      act(() => {
        result.current.toggleExistingTag("食事");
      });
      expect(result.current.tags).toContain("食事");
    });

    it("選択済みのタグを解除できる", () => {
      const { result } = renderHook(() => useTagManager(["食事"], tagPool));
      act(() => {
        result.current.toggleExistingTag("食事");
      });
      expect(result.current.tags).not.toContain("食事");
    });
  });
});
