import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import DoneAccordion from "@/components/DoneAccordion";
import type { DoneItem } from "@/lib/types";

const sampleItems: DoneItem[] = [
  { id: 1, title: "朝ごはんを食べる", pt: 5, count: 2, completedAt: "2024-01-15" },
  { id: 2, title: "散歩する", pt: 3, count: 1, completedAt: "2024-01-15" },
];

describe("DoneAccordion", () => {
  describe("アコーディオンの開閉", () => {
    it("初期状態では閉じている", () => {
      render(
        <DoneAccordion type="action" items={sampleItems} totalPt={13} onAdjust={vi.fn()} />,
      );
      // aria-expanded が false
      const btn = screen.getByRole("button", { name: /今日の行動ログ/ });
      expect(btn).toHaveAttribute("aria-expanded", "false");
    });

    it("ヘッダーをクリックすると展開する", () => {
      render(
        <DoneAccordion type="action" items={sampleItems} totalPt={13} onAdjust={vi.fn()} />,
      );
      const btn = screen.getByRole("button", { name: /今日の行動ログ/ });
      fireEvent.click(btn);
      expect(btn).toHaveAttribute("aria-expanded", "true");
    });

    it("展開後にもう一度クリックすると折りたたまれる", () => {
      render(
        <DoneAccordion type="action" items={sampleItems} totalPt={13} onAdjust={vi.fn()} />,
      );
      const btn = screen.getByRole("button", { name: /今日の行動ログ/ });
      fireEvent.click(btn);
      fireEvent.click(btn);
      expect(btn).toHaveAttribute("aria-expanded", "false");
    });

    it("閉じているときアイテムは表示されない", () => {
      render(
        <DoneAccordion type="action" items={sampleItems} totalPt={13} onAdjust={vi.fn()} />,
      );
      expect(screen.queryByText("朝ごはんを食べる")).not.toBeInTheDocument();
    });

    it("展開するとアイテムが表示される", () => {
      render(
        <DoneAccordion type="action" items={sampleItems} totalPt={13} onAdjust={vi.fn()} />,
      );
      fireEvent.click(screen.getByRole("button", { name: /今日の行動ログ/ }));
      expect(screen.getByText("朝ごはんを食べる")).toBeInTheDocument();
      expect(screen.getByText("散歩する")).toBeInTheDocument();
    });
  });

  describe("ラベル表示", () => {
    it("type='action' のとき行動ログラベルが表示される", () => {
      render(<DoneAccordion type="action" items={[]} totalPt={0} onAdjust={vi.fn()} />);
      expect(screen.getByText(/今日の行動ログ/)).toBeInTheDocument();
    });

    it("type='reward' のときご褒美ログラベルが表示される", () => {
      render(<DoneAccordion type="reward" items={[]} totalPt={0} onAdjust={vi.fn()} />);
      expect(screen.getByText(/今日のご褒美ログ/)).toBeInTheDocument();
    });

    it("totalPt > 0 のとき action は +xxpt を表示する", () => {
      render(<DoneAccordion type="action" items={[]} totalPt={13} onAdjust={vi.fn()} />);
      expect(screen.getByText("+13pt")).toBeInTheDocument();
    });

    it("totalPt > 0 のとき reward は -xxpt を表示する", () => {
      render(<DoneAccordion type="reward" items={[]} totalPt={8} onAdjust={vi.fn()} />);
      expect(screen.getByText("-8pt")).toBeInTheDocument();
    });

    it("totalPt = 0 のときバッジは表示されない", () => {
      render(<DoneAccordion type="action" items={[]} totalPt={0} onAdjust={vi.fn()} />);
      expect(screen.queryByText(/\+0pt/)).not.toBeInTheDocument();
    });
  });

  describe("アイテム一覧", () => {
    it("空リストのとき '記録なし' メッセージが表示される", () => {
      render(<DoneAccordion type="action" items={[]} totalPt={0} onAdjust={vi.fn()} />);
      fireEvent.click(screen.getByRole("button", { name: /今日の行動ログ/ }));
      expect(screen.getByText("まだ記録なし")).toBeInTheDocument();
    });

    it("アイテムのタイトルが表示される", () => {
      render(
        <DoneAccordion type="action" items={sampleItems} totalPt={13} onAdjust={vi.fn()} />,
      );
      fireEvent.click(screen.getByRole("button", { name: /今日の行動ログ/ }));
      expect(screen.getByText("朝ごはんを食べる")).toBeInTheDocument();
    });

    it("アイテムのカウントが表示される", () => {
      render(
        <DoneAccordion type="action" items={sampleItems} totalPt={13} onAdjust={vi.fn()} />,
      );
      fireEvent.click(screen.getByRole("button", { name: /今日の行動ログ/ }));
      // sampleItems[0] の count=2 が表示される
      expect(screen.getByText("2")).toBeInTheDocument();
    });
  });

  describe("カウント調整ボタン", () => {
    it("＋ボタンをクリックすると onAdjust(id, +1) が呼ばれる", () => {
      const onAdjust = vi.fn();
      render(
        <DoneAccordion type="action" items={sampleItems} totalPt={13} onAdjust={onAdjust} />,
      );
      fireEvent.click(screen.getByRole("button", { name: /今日の行動ログ/ }));
      // 最初のアイテムの + ボタン
      const plusButtons = screen.getAllByText("＋");
      fireEvent.click(plusButtons[0]);
      expect(onAdjust).toHaveBeenCalledWith(1, 1);
    });

    it("− ボタンをクリックすると onAdjust(id, -1) が呼ばれる", () => {
      const onAdjust = vi.fn();
      render(
        <DoneAccordion type="action" items={sampleItems} totalPt={13} onAdjust={onAdjust} />,
      );
      fireEvent.click(screen.getByRole("button", { name: /今日の行動ログ/ }));
      const minusButtons = screen.getAllByText("−");
      fireEvent.click(minusButtons[0]);
      expect(onAdjust).toHaveBeenCalledWith(1, -1);
    });
  });
});
