# API仕様

全エンドポイントは `x-user-id` ヘッダーが必須（proxy.ts が自動注入）。

---

## 状態取得

### `GET /api/state`

ユーザーの全状態を一括取得する。アプリ起動時に1回呼ぶ。

**レスポンス:**
```json
{
  "points": 150,
  "mode": "normal",
  "actions": [
    { "id": 1, "title": "朝ごはんを食べる", "desc": "", "tags": ["食事", "朝"], "hurdle": 1, "time": 1 }
  ],
  "rewards": [
    { "id": 1, "title": "Netflixを見る", "desc": "", "tags": ["動画"], "satisfaction": 2, "time": 2, "price": 1 }
  ],
  "doneActions": [
    { "id": 1, "title": "朝ごはんを食べる", "pt": 1, "count": 2, "completedAt": "2024-01-15" }
  ],
  "doneRewards": [
    { "id": 1, "title": "Netflixを見る", "pt": 4, "count": 1, "completedAt": "2024-01-15" }
  ]
}
```

**注意:**
- `doneActions` / `doneRewards` は今日（ユーザーTZ基準）のログのみ
- `actionId` が null（行動削除済み）の doneAction は除外される

---

## 行動 CRUD

### `POST /api/actions`

行動を新規作成する。

**リクエストボディ:**
```json
{ "title": "朝ごはんを食べる", "desc": "任意", "tags": ["食事"], "hurdle": 1, "time": 2 }
```
`desc`・`tags` は省略可（デフォルト: `""` / `[]`）

**レスポンス:** 作成された Action オブジェクト

---

### `PUT /api/actions/[id]`

行動を更新する。

**リクエストボディ:** POST と同じ形式

**レスポンス:** 更新された Action オブジェクト

**注意:** `where` に `userId` を含む（他ユーザーの行動は更新不可）

---

### `DELETE /api/actions/[id]`

行動を削除する。

**レスポンス:** `{ "ok": true }`

**注意:**
- 関連する `DoneAction` の `actionId` は `null` に設定される（ソフト参照）
- `DoneAction` レコード自体は残る（履歴保持）

---

## ご褒美 CRUD

### `POST /api/rewards`

ご褒美を新規作成する。

**リクエストボディ:**
```json
{ "title": "Netflixを見る", "desc": "任意", "tags": ["動画"], "satisfaction": 2, "time": 2, "price": 1 }
```

**レスポンス:** 作成された Reward オブジェクト

---

### `PUT /api/rewards/[id]`

ご褒美を更新する。

**リクエストボディ:** POST と同じ形式

---

### `DELETE /api/rewards/[id]`

ご褒美を削除する。

**レスポンス:** `{ "ok": true }`

---

## 行動完了ログ

### `POST /api/done/actions`

行動を完了し、ポイントを付与する。

**リクエストボディ:**
```json
{ "actionId": 1 }
```

**レスポンス:**
```json
{ "id": 1, "title": "朝ごはんを食べる", "pt": 1, "count": 1, "completedAt": "2024-01-15" }
```

**サーバー側処理:**
1. ユーザーの timezone・mode を取得
2. 行動の hurdle・time を取得
3. `calcActionPt(hurdle, time, mode)` でポイントを計算
4. `DoneAction` を upsert（同日2回目以降は count をインクリメント）
5. `User.points` をインクリメント

---

### `PATCH /api/done/actions/[actionId]`

今日の行動ログの回数を増減する。

**リクエストボディ:**
```json
{ "delta": 1 }   // +1 または -1
```

**レスポンス:** `{ "ok": true }`

**サーバー側処理:**
- `newCount = existing.count + delta`
- `newCount <= 0` の場合は DoneAction レコードを削除
- `newCount > 0` の場合は count を更新
- `User.points` を `existing.pt × delta` 分インクリメント（DBの pt 値を使用）

---

## ご褒美消費ログ

### `POST /api/done/rewards`

ご褒美を消費し、ポイントを減算する。

**リクエストボディ:**
```json
{ "rewardId": 1 }
```

**レスポンス（成功）:**
```json
{ "id": 1, "title": "Netflixを見る", "pt": 4, "count": 1, "completedAt": "2024-01-15" }
```

**レスポンス（ポイント不足）:**
```
HTTP 400
{ "error": "insufficient points" }
```

**サーバー側処理:**
1. ユーザーの timezone・mode・points を取得
2. ご褒美の satisfaction・time・price を取得
3. `calcRewardPt(satisfaction, time, price, mode)` でコストを計算
4. **残高チェック:** `user.points < pt` なら 400 を返す
5. `DoneReward` を upsert
6. `User.points` をデクリメント

---

### `PATCH /api/done/rewards/[rewardId]`

今日のご褒美ログの回数を増減する。

**リクエストボディ:**
```json
{ "delta": 1 }   // +1（消費増加）または -1（消費キャンセル）
```

**レスポンス:** `{ "ok": true }`

**注意:** `User.points` は**デクリメント**（行動と逆）。`delta=-1` のときはポイントが戻る。

---

## ユーザー設定

### `PATCH /api/user`

難易度モードを変更する。

**リクエストボディ:**
```json
{ "mode": "hard" }   // "easy" | "normal" | "hard"
```

**レスポンス:** `{ "ok": true }`

---

## 共通仕様

| 項目 | 仕様 |
|---|---|
| 認証 | `x-user-id` ヘッダー（proxy.ts が注入） |
| Content-Type | `application/json` |
| エラーレスポンス | `{ "error": "メッセージ" }` + HTTPステータス |
| オーナーシップ確認 | 全 WHERE 条件に `userId` を含める |
| ポイント計算 | 常にサーバー側で計算（クライアント値不使用） |
