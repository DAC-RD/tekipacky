# UIコンポーネント仕様

全コンポーネントは `"use client"` ディレクティブ付き（クライアントサイドレンダリング）。

---

## Dashboard.tsx

**役割:** アプリ全体のメインコンテナ。状態管理・UI制御の中枢。

**依存:** `useStore` フック

**管理する状態:**
| 状態 | 型 | 説明 |
|---|---|---|
| `tab` | `"action" \| "reward"` | 現在のタブ |
| `searchQuery` | `string` | 検索クエリ（タブ別独立） |
| `sortOrder` | `SortOrder` | ソート順（タブ別独立） |
| `activeFilterTags` | `string[]` | 選択中タグ（タブ別独立） |
| `modalOpen` | `boolean` | モーダルの開閉 |
| `editItem` | `{type, id} \| null` | 編集対象アイテム |
| `floats` | `FloatItem[]` | ポイント浮き上がりエフェクト |
| `flashKey` | `number` | PointDisplay のフラッシュトリガー |

**主な処理:**
- 行動カードタップ → `completeAction()` → ポイント浮き上がりアニメーション
- ご褒美カードタップ → `completeReward()` → 残高不足ガイドまたは消費成功
- フィルタリング: `searchQuery` + `activeFilterTags` で actions/rewards を絞り込み
- ソート: pt高い順・低い順・デフォルト順をトグル

---

## PointDisplay.tsx

**役割:** 現在のポイント・今日の獲得・消費を表示。ポイント変化時にフラッシュアニメーション。

**Props:**
| Prop | 型 | 説明 |
|---|---|---|
| `points` | `number` | 現在のポイント残高 |
| `mode` | `Mode` | 現在のモード |
| `todayEarned` | `number` | 今日の獲得ポイント合計 |
| `todaySpent` | `number` | 今日の消費ポイント合計 |
| `flashKey` | `number` | 増加するたびにフラッシュ発火 |

**アニメーション:**
- `flashKey` が前回より大きくなったとき `"flash"` クラスを付与（CSS アニメーション）
- `el.offsetWidth` でリフローを強制してアニメーションをリセット

---

## FilterArea.tsx

**役割:** 検索・ソート・タグフィルターのUIを提供。

**Props:**
| Prop | 型 | 説明 |
|---|---|---|
| `tab` | `Tab` | 現在のタブ（スタイルに影響） |
| `allTags` | `string[]` | 表示するタグ一覧 |
| `activeFilterTags` | `string[]` | 選択中のタグ |
| `searchQuery` | `string` | 検索クエリ |
| `sortOrder` | `SortOrder` | 現在のソート順 |
| `onSearchChange` | `(q: string) => void` | 検索変更コールバック |
| `onSortChange` | `(order: SortOrder) => void` | ソート変更コールバック |
| `onToggleTag` | `(tag: string) => void` | タグ選択トグルコールバック |

**ソートサイクル:** `"default"` → `"pt-desc"` → `"pt-asc"` → `"default"` ...

**スタイル:** `tab === "action"` でオレンジ系、`"reward"` でグリーン系に切り替わる

---

## ItemModal.tsx

**役割:** 行動・ご褒美の追加・編集フォーム。モーダルとして表示。

**Props:**
| Prop | 型 | 説明 |
|---|---|---|
| `open` | `boolean` | モーダルの表示/非表示 |
| `initialType` | `Tab` | 初期タイプ（action/reward） |
| `editId` | `number \| null` | 編集対象のID（nullで新規作成） |
| `mode` | `Mode` | 現在のモード（ポイントプレビューに使用） |
| `actions` | `Action[]` | タグサジェスト用の既存行動一覧 |
| `rewards` | `Reward[]` | タグサジェスト用の既存ご褒美一覧 |
| `onSave` | `(data: ModalSaveData) => void` | 保存コールバック |
| `onDelete` | `(type, id) => void` | 削除コールバック |
| `onClose` | `() => void` | 閉じるコールバック |

**フォームフィールド（行動）:** タイトル, 説明, タグ, ハードル(1-3), かかる時間(1-6)

**フォームフィールド（ご褒美）:** タイトル, 説明, タグ, 満足度(1-3), かかる時間(1-6), 金額(1-6)

**ポイントプレビュー:** フォーム値の変化に応じてリアルタイム計算・表示

**タグ操作:**
- 既存タグをサジェスト表示（入力中はインクリメンタル絞り込み）
- 既存タグはクリックでトグル追加/削除
- 新規タグは入力欄に入力→Enterまたは+ボタンで追加
- 追加済みタグの✕で削除

**バリデーション:** タイトルが空の場合は保存ボタンを押しても `onSave` を呼ばない

**編集モード判定:** `editId !== null` で編集モード。削除ボタンが表示される。

---

## DoneAccordion.tsx

**役割:** 今日の完了行動・消費ご褒美のログをアコーディオン形式で表示。

**Props:**
| Prop | 型 | 説明 |
|---|---|---|
| `type` | `"action" \| "reward"` | ログの種類 |
| `items` | `DoneItem[]` | 表示するログ一覧 |
| `totalPt` | `number` | 今日の合計ポイント |
| `onAdjust` | `(id, delta) => void` | カウント増減コールバック |

**表示仕様:**
- アコーディオンヘッダーに合計ポイントを `+xxpt` / `-xxpt` で表示（0ptは非表示）
- 展開時に各アイテムを表示: タイトル, 合計ポイント（pt × count）, カウント調整ボタン
- アイテムが0件の場合は「まだ記録なし」を表示

---

## useStore.ts（カスタムフック）

**役割:** アプリの全状態管理とAPI通信。Dashboard がこれを利用する。

**返却値:**
| キー | 型 | 説明 |
|---|---|---|
| `state` | `AppState` | 全アプリ状態 |
| `hydrated` | `boolean` | 初回API取得完了フラグ |
| `completeAction` | `(id) => Promise<number>` | 行動完了（返り値: 獲得pt） |
| `completeReward` | `(id) => Promise<{pt, insufficient}>` | ご褒美消費 |
| `adjustDoneAction` | `(id, delta) => void` | 行動ログ回数調整 |
| `adjustDoneReward` | `(id, delta) => void` | ご褒美ログ回数調整 |
| `saveItem` | `(data) => Promise<void>` | 行動・ご褒美の作成/更新 |
| `deleteItem` | `(type, id) => Promise<void>` | 行動・ご褒美の削除 |
| `changeMode` | `(mode) => void` | モード変更 |

**AppState の型:**
```typescript
interface AppState {
  points: number;
  mode: Mode;           // "easy" | "normal" | "hard"
  actions: Action[];
  rewards: Reward[];
  doneActions: DoneItem[];
  doneRewards: DoneItem[];
}
```

**初期化:** `INITIAL_STATE`（points=0, mode="normal", 全リスト空）から始まり、マウント後に `/api/state` で hydrate する。
