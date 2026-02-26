# 純粋関数テストパターン

副作用を持たない純粋関数は最も書きやすく、最も信頼性の高いテストの対象。

**実装例:** `web/__tests__/lib/utils.test.ts`

---

## パターン1: 基本的な入出力テスト

```typescript
describe("calcActionPt", () => {
  it("normalモードで hurdle×time を返す", () => {
    // 2 * 3 * 1.0 = 6
    expect(calcActionPt(2, 3, "normal")).toBe(6);
  });
});
```

**ポイント:**
- 期待値をコメントで計算式とともに記載する
- テスト名に「何をテストしているか」を明確に書く

---

## パターン2: 境界値テスト

```typescript
it("計算結果が 0 以下でも最小値は 1", () => {
  // hurdle=1, time=1, hard: 1*1*0.8=0.8 → round → 1
  expect(calcActionPt(1, 1, "hard")).toBeGreaterThanOrEqual(1);
});
```

**ポイント:**
- `toBe(1)` より `toBeGreaterThanOrEqual(1)` の方が意図を表現できる場合がある
- 最小値・最大値・ゼロ・負数などの境界値を必ず網羅する

---

## パターン3: 全パラメータバリエーションのテスト

```typescript
describe("modeFromDb", () => {
  it("EASY を easy に変換する", () => { expect(modeFromDb("EASY")).toBe("easy"); });
  it("NORMAL を normal に変換する", () => { expect(modeFromDb("NORMAL")).toBe("normal"); });
  it("HARD を hard に変換する", () => { expect(modeFromDb("HARD")).toBe("hard"); });
});
```

**ポイント:**
- enum や union 型の全ケースを網羅する
- 各テストは独立して1つの値だけをテストする

---

## パターン4: ラウンドトリップテスト

```typescript
it("modeToDb(modeFromDb(x)) はラウンドトリップする", () => {
  expect(modeToDb(modeFromDb("EASY"))).toBe("EASY");
  expect(modeToDb(modeFromDb("NORMAL"))).toBe("NORMAL");
});
```

**ポイント:**
- 変換関数のペア（fromDb/toDb）は逆変換の確認も行う

---

## パターン5: イミュータビリティの確認

```typescript
it("元のリストは変更されない（イミュータブル）", () => {
  const list = [sampleItem];
  upsertDoneItem(list, 1, "朝ごはん", 5, 1);
  expect(list[0].count).toBe(2); // 元のリストは変わらない
});
```

**ポイント:**
- リストを操作する関数では、元のリストが変更されていないことを確認する
- React の状態更新はイミュータブルであることが重要

---

## パターン6: 時刻依存関数のテスト

`new Date()` を内部で使用する関数は、フェイクタイマーで固定する。

```typescript
describe("getDateForTimezone", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2024-01-15T00:00:00Z")); // UTC 00:00 に固定
  });

  afterEach(() => {
    vi.useRealTimers(); // 必ず元に戻す
  });

  it("UTC では 2024-01-15 を返す", () => {
    expect(getDateForTimezone("UTC")).toBe("2024-01-15");
  });

  it("America/New_York (UTC-5) では 2024-01-14 を返す", () => {
    // UTCの00:00はNYの前日19:00
    expect(getDateForTimezone("America/New_York")).toBe("2024-01-14");
  });
});
```

**ポイント:**
- `beforeEach` で `vi.useFakeTimers()` + `vi.setSystemTime()`
- `afterEach` で必ず `vi.useRealTimers()` を呼ぶ
- タイムゾーンをまたぐケースは日付が変わることを確認する

---

## パターン7: リスト操作の複合テスト

```typescript
describe("upsertDoneItem", () => {
  const sampleItem = { id: 1, title: "テスト", pt: 5, count: 2, completedAt: "2024-01-15" };

  describe("既存アイテムへの操作", () => {
    it("delta=+1 でカウントが増加する", () => {
      const result = upsertDoneItem([sampleItem], 1, "テスト", 5, 1);
      expect(result.find(d => d.id === 1)?.count).toBe(3);
    });

    it("count が 0 以下になるとリストから除外される", () => {
      const result = upsertDoneItem([{ ...sampleItem, count: 1 }], 1, "テスト", 5, -1);
      expect(result.find(d => d.id === 1)).toBeUndefined();
    });
  });

  describe("新規アイテムの追加", () => {
    it("delta > 0 のとき新規アイテムを追加する", () => {
      const result = upsertDoneItem([], 99, "新しい行動", 10, 1, "2024-01-15");
      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({ id: 99, title: "新しい行動", pt: 10, count: 1, completedAt: "2024-01-15" });
    });

    it("delta <= 0 のとき新規アイテムを追加しない", () => {
      const result = upsertDoneItem([], 99, "新しい行動", 10, -1, "2024-01-15");
      expect(result).toHaveLength(0);
    });
  });
});
```

**ポイント:**
- `describe` をネストして「既存/新規」などの条件グループを整理する
- `toEqual` でオブジェクト全体の一致を確認する（`toBe` は参照比較のため不向き）
