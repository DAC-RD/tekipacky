import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import FilterArea from "@/components/FilterArea";

const defaultProps = {
  tab: "action" as const,
  allTags: ["食事", "運動", "仕事"],
  activeFilterTags: [],
  searchQuery: "",
  sortOrder: "default" as const,
  onSearchChange: vi.fn(),
  onSortChange: vi.fn(),
  onToggleTag: vi.fn(),
};

describe("FilterArea", () => {
  describe("検索入力", () => {
    it("検索入力欄が表示される", () => {
      render(<FilterArea {...defaultProps} />);
      expect(screen.getByPlaceholderText("キーワードで検索")).toBeInTheDocument();
    });

    it("searchQuery の値が入力欄に反映される", () => {
      render(<FilterArea {...defaultProps} searchQuery="テスト" />);
      const input = screen.getByPlaceholderText("キーワードで検索") as HTMLInputElement;
      expect(input.value).toBe("テスト");
    });

    it("文字を入力すると onSearchChange が呼ばれる", () => {
      const onSearchChange = vi.fn();
      render(<FilterArea {...defaultProps} onSearchChange={onSearchChange} />);
      const input = screen.getByPlaceholderText("キーワードで検索");
      fireEvent.change(input, { target: { value: "朝食" } });
      expect(onSearchChange).toHaveBeenCalledWith("朝食");
    });
  });

  describe("ソートボタン", () => {
    it("default ソート時に '↕ 並び替え' が表示される", () => {
      render(<FilterArea {...defaultProps} sortOrder="default" />);
      expect(screen.getByText("↕ 並び替え")).toBeInTheDocument();
    });

    it("pt-desc ソート時に '↓ pt 高い順' が表示される", () => {
      render(<FilterArea {...defaultProps} sortOrder="pt-desc" />);
      expect(screen.getByText("↓ pt 高い順")).toBeInTheDocument();
    });

    it("pt-asc ソート時に '↑ pt 低い順' が表示される", () => {
      render(<FilterArea {...defaultProps} sortOrder="pt-asc" />);
      expect(screen.getByText("↑ pt 低い順")).toBeInTheDocument();
    });

    it("ソートボタンをクリックすると onSortChange が呼ばれる", () => {
      const onSortChange = vi.fn();
      render(<FilterArea {...defaultProps} sortOrder="default" onSortChange={onSortChange} />);
      fireEvent.click(screen.getByText("↕ 並び替え"));
      expect(onSortChange).toHaveBeenCalledWith("pt-desc");
    });

    it("pt-desc → pt-asc へサイクルする", () => {
      const onSortChange = vi.fn();
      render(<FilterArea {...defaultProps} sortOrder="pt-desc" onSortChange={onSortChange} />);
      fireEvent.click(screen.getByText("↓ pt 高い順"));
      expect(onSortChange).toHaveBeenCalledWith("pt-asc");
    });

    it("pt-asc → default へサイクルする", () => {
      const onSortChange = vi.fn();
      render(<FilterArea {...defaultProps} sortOrder="pt-asc" onSortChange={onSortChange} />);
      fireEvent.click(screen.getByText("↑ pt 低い順"));
      expect(onSortChange).toHaveBeenCalledWith("default");
    });
  });

  describe("タグフィルター", () => {
    it("allTags に指定したタグが表示される", () => {
      render(<FilterArea {...defaultProps} />);
      expect(screen.getByText("食事")).toBeInTheDocument();
      expect(screen.getByText("運動")).toBeInTheDocument();
      expect(screen.getByText("仕事")).toBeInTheDocument();
    });

    it("allTags が空のときタグボタンが表示されない", () => {
      render(<FilterArea {...defaultProps} allTags={[]} />);
      expect(screen.queryByText("食事")).not.toBeInTheDocument();
    });

    it("タグボタンをクリックすると onToggleTag が呼ばれる", () => {
      const onToggleTag = vi.fn();
      render(<FilterArea {...defaultProps} onToggleTag={onToggleTag} />);
      fireEvent.click(screen.getByText("食事"));
      expect(onToggleTag).toHaveBeenCalledWith("食事");
    });

    it("activeFilterTags に含まれるタグが表示される", () => {
      render(<FilterArea {...defaultProps} activeFilterTags={["食事"]} />);
      // タグが存在することのみ確認（スタイルはDOM上で変わる）
      expect(screen.getByText("食事")).toBeInTheDocument();
    });
  });
});
