import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import ItemModal from "@/components/ItemModal";
import type { Action, Reward } from "@/lib/types";

const sampleActions: Action[] = [
  { id: 1, title: "朝ごはんを食べる", desc: "", tags: ["食事", "朝"], hurdle: 1, time: 1 },
  { id: 2, title: "散歩する", desc: "", tags: ["運動"], hurdle: 2, time: 2 },
];

const sampleRewards: Reward[] = [
  {
    id: 1,
    title: "Netflixを見る",
    desc: "",
    tags: ["動画"],
    satisfaction: 2,
    time: 2,
    price: 1,
  },
];

const baseProps = {
  open: true,
  initialType: "action" as const,
  editId: null,
  mode: "normal" as const,
  actions: sampleActions,
  rewards: sampleRewards,
  onSave: vi.fn(),
  onDelete: vi.fn(),
  onClose: vi.fn(),
};

describe("ItemModal", () => {
  describe("表示・非表示", () => {
    it("open=true のときモーダルが表示される", () => {
      render(<ItemModal {...baseProps} />);
      expect(screen.getByText("行動を追加")).toBeInTheDocument();
    });

    it("open=false のときモーダルが表示されない", () => {
      render(<ItemModal {...baseProps} open={false} />);
      expect(screen.queryByText("行動を追加")).not.toBeInTheDocument();
    });
  });

  describe("ヘッダータイトル", () => {
    it("新規追加・actionモードで '行動を追加' が表示される", () => {
      render(<ItemModal {...baseProps} initialType="action" editId={null} />);
      expect(screen.getByText("行動を追加")).toBeInTheDocument();
    });

    it("新規追加・rewardモードで 'ご褒美を追加' が表示される", () => {
      render(<ItemModal {...baseProps} initialType="reward" editId={null} />);
      expect(screen.getByText("ご褒美を追加")).toBeInTheDocument();
    });

    it("編集・actionモードで '行動を編集' が表示される", () => {
      render(<ItemModal {...baseProps} initialType="action" editId={1} />);
      expect(screen.getByText("行動を編集")).toBeInTheDocument();
    });

    it("編集・rewardモードで 'ご褒美を編集' が表示される", () => {
      render(<ItemModal {...baseProps} initialType="reward" editId={1} />);
      expect(screen.getByText("ご褒美を編集")).toBeInTheDocument();
    });
  });

  describe("タイプ切り替え（新規作成時）", () => {
    it("新規作成モードで '⚡ 行動' タブが表示される", () => {
      render(<ItemModal {...baseProps} editId={null} />);
      expect(screen.getByText("⚡ 行動")).toBeInTheDocument();
    });

    it("新規作成モードで '🎁 ご褒美' タブが表示される", () => {
      render(<ItemModal {...baseProps} editId={null} />);
      expect(screen.getByText("🎁 ご褒美")).toBeInTheDocument();
    });

    it("編集モードではタイプ切り替えタブが表示されない", () => {
      render(<ItemModal {...baseProps} editId={1} />);
      expect(screen.queryByText("⚡ 行動")).not.toBeInTheDocument();
    });
  });

  describe("action フォームフィールド", () => {
    it("'ハードル（面倒くささ）' ラベルが表示される", () => {
      render(<ItemModal {...baseProps} initialType="action" />);
      expect(screen.getByText("ハードル（面倒くささ）")).toBeInTheDocument();
    });

    it("hurdle の選択肢が表示される", () => {
      render(<ItemModal {...baseProps} initialType="action" />);
      expect(screen.getByText("低 (×1)")).toBeInTheDocument();
      expect(screen.getByText("中 (×2)")).toBeInTheDocument();
      expect(screen.getByText("高 (×3)")).toBeInTheDocument();
    });

    it("time の選択肢が表示される", () => {
      render(<ItemModal {...baseProps} initialType="action" />);
      expect(screen.getByText("5分以内 (×1)")).toBeInTheDocument();
    });

    it("actionモードで satisfaction / price フィールドは表示されない", () => {
      render(<ItemModal {...baseProps} initialType="action" />);
      expect(screen.queryByText("満足度")).not.toBeInTheDocument();
      expect(screen.queryByText("金額")).not.toBeInTheDocument();
    });
  });

  describe("reward フォームフィールド", () => {
    it("'満足度' ラベルが表示される", () => {
      render(<ItemModal {...baseProps} initialType="reward" />);
      expect(screen.getByText("満足度")).toBeInTheDocument();
    });

    it("satisfaction の選択肢が表示される", () => {
      render(<ItemModal {...baseProps} initialType="reward" />);
      expect(screen.getByText("小 (×1)")).toBeInTheDocument();
      expect(screen.getByText("中 (×2)")).toBeInTheDocument();
      expect(screen.getByText("大 (×3)")).toBeInTheDocument();
    });

    it("'金額' ラベルが表示される", () => {
      render(<ItemModal {...baseProps} initialType="reward" />);
      expect(screen.getByText("金額")).toBeInTheDocument();
    });

    it("price の選択肢が表示される", () => {
      render(<ItemModal {...baseProps} initialType="reward" />);
      expect(screen.getByText("0円 (×1)")).toBeInTheDocument();
    });

    it("rewardモードで hurdle フィールドは表示されない", () => {
      render(<ItemModal {...baseProps} initialType="reward" />);
      expect(screen.queryByText("ハードル（面倒くささ）")).not.toBeInTheDocument();
    });
  });

  describe("ポイントプレビュー", () => {
    it("normalモード・action のプレビューに 'pt 獲得' が表示される", () => {
      render(<ItemModal {...baseProps} mode="normal" initialType="action" />);
      expect(screen.getByText(/pt 獲得/)).toBeInTheDocument();
    });

    it("rewardモードで 'pt 消費' と表示される", () => {
      render(<ItemModal {...baseProps} initialType="reward" />);
      expect(screen.getByText(/pt 消費/)).toBeInTheDocument();
    });
  });

  describe("保存ボタン", () => {
    it("タイトルが空のとき onSave が呼ばれない", () => {
      const onSave = vi.fn();
      render(<ItemModal {...baseProps} onSave={onSave} />);
      fireEvent.click(screen.getByText("追加する"));
      expect(onSave).not.toHaveBeenCalled();
    });

    it("タイトルを入力して保存すると onSave が呼ばれる", () => {
      const onSave = vi.fn();
      render(<ItemModal {...baseProps} onSave={onSave} />);
      const titleInput = screen.getByPlaceholderText("例: 朝ごはんを食べる");
      fireEvent.change(titleInput, { target: { value: "テスト行動" } });
      fireEvent.click(screen.getByText("追加する"));
      expect(onSave).toHaveBeenCalledOnce();
      expect(onSave).toHaveBeenCalledWith(
        expect.objectContaining({ title: "テスト行動", type: "action" }),
      );
    });

    it("編集モードのボタンは '保存する' と表示される", () => {
      render(<ItemModal {...baseProps} editId={1} />);
      expect(screen.getByText("保存する")).toBeInTheDocument();
    });

    it("新規モードのボタンは '追加する' と表示される", () => {
      render(<ItemModal {...baseProps} editId={null} />);
      expect(screen.getByText("追加する")).toBeInTheDocument();
    });
  });

  describe("削除ボタン", () => {
    it("編集モードでは削除ボタンが表示される", () => {
      render(<ItemModal {...baseProps} editId={1} />);
      expect(screen.getByText("削除")).toBeInTheDocument();
    });

    it("新規モードでは削除ボタンが表示されない", () => {
      render(<ItemModal {...baseProps} editId={null} />);
      expect(screen.queryByText("削除")).not.toBeInTheDocument();
    });
  });

  describe("閉じるボタン", () => {
    it("✕ボタンをクリックすると onClose が呼ばれる", () => {
      const onClose = vi.fn();
      render(<ItemModal {...baseProps} onClose={onClose} />);
      fireEvent.click(screen.getByText("✕"));
      expect(onClose).toHaveBeenCalledOnce();
    });
  });

  describe("タグ操作", () => {
    it("既存タグの候補が表示される", () => {
      render(<ItemModal {...baseProps} initialType="action" />);
      // sampleActions のタグ: 食事, 朝, 運動
      expect(screen.getByText(/食事/)).toBeInTheDocument();
    });

    it("タグ候補をクリックするとタグが追加される", () => {
      render(<ItemModal {...baseProps} initialType="action" />);
      // 「食事 +」ボタンをクリック（候補タグ）
      const tagBtn = screen.getByText(/食事/);
      fireEvent.click(tagBtn);
      // 「設定済みタグ」セクションが表示される
      expect(screen.getByText("設定済みタグ")).toBeInTheDocument();
    });

    it("タグ入力欄にEnterで新規タグを追加できる", () => {
      render(<ItemModal {...baseProps} initialType="action" />);
      const tagInput = screen.getByPlaceholderText("新しいタグを入力してEnter");
      fireEvent.change(tagInput, { target: { value: "新タグ" } });
      fireEvent.keyDown(tagInput, { key: "Enter" });
      expect(screen.getByText("設定済みタグ")).toBeInTheDocument();
    });
  });

  describe("編集時の初期値", () => {
    it("編集モードでアクションの初期値がフォームに設定される", () => {
      render(<ItemModal {...baseProps} initialType="action" editId={1} />);
      const titleInput = screen.getByPlaceholderText("例: 朝ごはんを食べる") as HTMLInputElement;
      expect(titleInput.value).toBe("朝ごはんを食べる");
    });

    it("編集モードでリワードの初期値がフォームに設定される", () => {
      render(<ItemModal {...baseProps} initialType="reward" editId={1} />);
      const titleInput = screen.getByPlaceholderText("例: Netflixを1話見る") as HTMLInputElement;
      expect(titleInput.value).toBe("Netflixを見る");
    });
  });
});
