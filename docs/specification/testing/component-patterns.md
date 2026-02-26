# Reactコンポーネントテストパターン

`@testing-library/react` を使用してコンポーネントをテストする。

**実装例:** `web/__tests__/components/`

---

## セットアップ

```typescript
import { render, screen, fireEvent } from "@testing-library/react";
import MyComponent from "@/components/MyComponent";
```

---

## パターン1: テキスト表示の確認

```typescript
it("points の値が正しく表示される", () => {
  render(<PointDisplay points={250} mode="normal" todayEarned={30} todaySpent={10} flashKey={0} />);
  expect(screen.getByText("250")).toBeInTheDocument();
});
```

**ポイント:**
- `screen.getByText()` は完全一致またはregex
- `toBeInTheDocument()` は `@testing-library/jest-dom` のマッチャー

---

## パターン2: 条件分岐の確認（要素あり/なし）

```typescript
it("open=true のときモーダルが表示される", () => {
  render(<ItemModal {...props} open={true} />);
  expect(screen.getByText("行動を追加")).toBeInTheDocument();
});

it("open=false のときモーダルが表示されない", () => {
  render(<ItemModal {...props} open={false} />);
  expect(screen.queryByText("行動を追加")).not.toBeInTheDocument();
});
```

**ポイント:**
- 「要素が存在しないこと」の確認は `queryByText()` + `.not.toBeInTheDocument()`
- `getByText()` は要素が見つからないとエラーになる

---

## パターン3: デフォルトPropsの活用

```typescript
// 共通 Props を定義しておく
const defaultProps = {
  tab: "action" as const,
  allTags: ["食事", "運動"],
  activeFilterTags: [],
  searchQuery: "",
  sortOrder: "default" as const,
  onSearchChange: vi.fn(),
  onSortChange: vi.fn(),
  onToggleTag: vi.fn(),
};

it("タグボタンをクリックすると onToggleTag が呼ばれる", () => {
  const onToggleTag = vi.fn();
  // 一部だけ上書き
  render(<FilterArea {...defaultProps} onToggleTag={onToggleTag} />);
  fireEvent.click(screen.getByText("食事"));
  expect(onToggleTag).toHaveBeenCalledWith("食事");
});
```

**ポイント:**
- デフォルト Props を定義してコードの重複を減らす
- 各テストでは必要な Props のみを上書きする
- コールバック Props は `vi.fn()` でモック化する

---

## パターン4: クリックイベントのテスト

```typescript
it("ソートボタンをクリックすると onSortChange が呼ばれる", () => {
  const onSortChange = vi.fn();
  render(<FilterArea {...defaultProps} sortOrder="default" onSortChange={onSortChange} />);

  fireEvent.click(screen.getByText("↕ 並び替え"));

  expect(onSortChange).toHaveBeenCalledWith("pt-desc");
  expect(onSortChange).toHaveBeenCalledOnce();
});
```

**ポイント:**
- `fireEvent.click()` でクリックをシミュレート
- `toHaveBeenCalledWith()` で引数を確認
- `toHaveBeenCalledOnce()` で1回だけ呼ばれたことを確認

---

## パターン5: 入力イベントのテスト

```typescript
it("文字を入力すると onSearchChange が呼ばれる", () => {
  const onSearchChange = vi.fn();
  render(<FilterArea {...defaultProps} onSearchChange={onSearchChange} />);

  const input = screen.getByPlaceholderText("キーワードで検索");
  fireEvent.change(input, { target: { value: "朝食" } });

  expect(onSearchChange).toHaveBeenCalledWith("朝食");
});

it("入力値が反映される", () => {
  render(<FilterArea {...defaultProps} searchQuery="テスト" />);
  const input = screen.getByPlaceholderText("キーワードで検索") as HTMLInputElement;
  expect(input.value).toBe("テスト");
});
```

**ポイント:**
- `screen.getByPlaceholderText()` でinput要素を取得
- `fireEvent.change()` で入力イベントをシミュレート
- input要素の値を確認するときは `as HTMLInputElement` でキャスト

---

## パターン6: アコーディオン（状態変化）のテスト

```typescript
it("ヘッダーをクリックすると展開する", () => {
  render(<DoneAccordion type="action" items={[]} totalPt={0} onAdjust={vi.fn()} />);
  const btn = screen.getByRole("button", { name: /今日の行動ログ/ });

  // 初期状態: 閉じている
  expect(btn).toHaveAttribute("aria-expanded", "false");

  fireEvent.click(btn);

  // クリック後: 開いている
  expect(btn).toHaveAttribute("aria-expanded", "true");
});
```

**ポイント:**
- `aria-expanded` 属性でアクセシブルな開閉状態を確認
- `getByRole("button", { name: /.../ })` でアクセシブルな名前で要素を取得

---

## パターン7: 複数要素の取得

```typescript
it("＋ボタンをクリックすると onAdjust(id, +1) が呼ばれる", () => {
  const onAdjust = vi.fn();
  render(<DoneAccordion type="action" items={sampleItems} totalPt={13} onAdjust={onAdjust} />);
  fireEvent.click(screen.getByRole("button", { name: /今日の行動ログ/ }));

  // 複数の「＋」ボタンが存在する場合は getAllByText
  const plusButtons = screen.getAllByText("＋");
  fireEvent.click(plusButtons[0]); // 最初のアイテムのボタン

  expect(onAdjust).toHaveBeenCalledWith(1, 1);
});
```

**ポイント:**
- 同じテキストの要素が複数ある場合は `getAllByText()` を使う
- `getByText()` は複数ヒットするとエラーになる

---

## パターン8: テキストの曖昧さ回避

```typescript
// ❌ 失敗する例: "/1/" が複数要素にマッチする
expect(screen.getByText(/1/)).toBeInTheDocument();

// ✅ 正しい例: より具体的なテキストを指定
expect(screen.getByText(/pt 獲得/)).toBeInTheDocument();
```

**ポイント:**
- 正規表現は意図せず複数要素にマッチすることがある
- エラーメッセージに「Found multiple elements」と出たら、より具体的なセレクタを使う
- `getAllByText()` に変更して配列で扱う方法もある

---

## パターン9: フォームの初期値確認

```typescript
it("編集モードでアクションの初期値がフォームに設定される", () => {
  render(<ItemModal {...props} initialType="action" editId={1} />);
  const titleInput = screen.getByPlaceholderText("例: 朝ごはんを食べる") as HTMLInputElement;
  expect(titleInput.value).toBe("朝ごはんを食べる");
});
```

---

## パターン10: キーボードイベント

```typescript
it("Enterキーでタグが追加される", () => {
  render(<ItemModal {...props} />);
  const tagInput = screen.getByPlaceholderText("新しいタグを入力してEnter");

  fireEvent.change(tagInput, { target: { value: "新タグ" } });
  fireEvent.keyDown(tagInput, { key: "Enter" });

  expect(screen.getByText("設定済みタグ")).toBeInTheDocument();
});
```

**ポイント:**
- `fireEvent.keyDown()` でキーボードイベントをシミュレート
- `{ key: "Enter" }` でキー名を指定する
