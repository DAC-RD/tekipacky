# UIコンポーネント仕様

---

## app/page.tsx（Server Component）

**役割:** ルートページ。認証状態に応じて `LandingPage` または `Dashboard` を返す。

**処理フロー:**
1. `auth()` でセッションを取得（NextAuth v5）
2. セッションなし → `<LandingPage />` を返す
3. セッションあり → `welcomeMessage` を判定して `<Dashboard />` を返す

**`welcomeMessage` の判定ロジック:**
- `?welcome=1` クエリパラメータがある場合のみ DB クエリを実行
- ユーザーの `createdAt` が 60 秒以内なら `"new"`、それ以外は `"returning"`

---

## LandingPage.tsx（Server Component）

**役割:** 未認証ユーザー向けのランディングページ。アプリの概要と CTA を表示。

**構成:**
- Hero セクション: アプリ名・キャッチコピー・「メールで始める」ボタン（`→ /signin`）
- Features セクション: 3枚の特徴カード（行動メニュー / ポイント獲得 / ご褒美）
- Footer: コピーライト

**ルーティング:**
- 「メールで始める」ボタン → `/signin`

---

## Dashboard.tsx

**役割:** アプリ全体のメインコンテナ。状態管理・UI制御の中枢。`"use client"` ディレクティブ付き。

**依存:** `useStore` フック

**Props:**
| Prop | 型 | 説明 |
|---|---|---|
| `welcomeMessage` | `"new" \| "returning" \| null` | ウェルカムトーストの種類（null で非表示） |

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
- サインアウト: `signOut()` ボタン（NextAuth v5 のサーバーアクションを呼び出す）
- ウェルカムトースト: `welcomeMessage` prop に応じて 3 秒間表示後フェードアウト
  - `"new"` → 「アカウントを作成しました」
  - `"returning"` → 「ログインしました」

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

---

## ModeSelector.tsx

**役割:** ダッシュボード右上のヘッダーコントロール。モード選択・モードヘルプ・設定/サインアウトメニューを提供する。

**Props:**
| Prop | 型 | 説明 |
|---|---|---|
| `mode` | `Mode` | 現在のモード |
| `onModeChange` | `(mode: Mode) => void` | モード変更コールバック |

**構成要素:**

1. **モードセレクト** — `<select>` でイージー/ノーマル/ハードを切り替え
2. **モードヘルプ（?）** — クリックで各モードの倍率説明ツールチップを表示/非表示（`tooltipOpen` state）
3. **設定メニュー（⚙）** — クリックでドロップダウンメニューを表示/非表示（`menuOpen` state）
   - 「⚙ 設定」 → `/settings` へリンク
   - 「↩ サインアウト」 → `signOut({ callbackUrl: '/' })`

**ドロップダウン挙動:**
- `tooltipOpen` / `menuOpen` それぞれ独立した state で管理
- 背景オーバーレイ（`fixed inset-0 z-40`）クリックで閉じる
- パネルは `tooltip-panel` クラス（既存スタイル流用）

---

## SettingsPage.tsx（Client Component）

**役割:** 設定ページの UI。メールアドレス変更とアカウント削除を提供する。

**Props:**
| Prop | 型 | 説明 |
|---|---|---|
| `email` | `string \| null` | 現在のメールアドレス |
| `successMessage` | `string \| undefined` | URLクエリから渡される成功メッセージキー |

**`successMessage` の表示:**
| 値 | 表示内容 |
|---|---|
| `"emailChanged"` | 「メールアドレスを変更しました」 |
| その他 | 非表示 |

**セクション構成:**

1. **メールアドレス変更**
   - 現在のメールアドレスを表示
   - 新しいメールアドレスの入力フォーム
   - 「確認メールを送る」ボタン → `POST /api/user/email`
   - 送信成功時: 「確認メールを送りました」メッセージを表示
   - エラー時: エラーメッセージを表示

2. **デンジャーゾーン（アカウント削除）**
   - 「削除すると全データが失われます。この操作は取り消せません。」の警告
   - 「アカウントを削除」ボタン → 確認ダイアログ表示
   - ダイアログ: 「削除する」と入力させて確定
   - `DELETE /api/user` → 成功後 `signOut({ callbackUrl: '/' })`
