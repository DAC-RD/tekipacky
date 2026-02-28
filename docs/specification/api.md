# API仕様

アプリケーション API（`/api/actions`, `/api/rewards` 等）は全て `x-user-id` ヘッダーが必須。
`proxy.ts`（Next.js Middleware）が JWT セッションを検証し、認証済みリクエストに自動注入する。
未認証で `/api/**` にアクセスすると HTTP 401 が返る（`/api/auth/**` を除く）。

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

**バリデーション:**
| フィールド | 型 | 制約 |
|---|---|---|
| `title` | string | 1〜200文字 |
| `hurdle` | integer | 1〜5 |
| `time` | integer | 1〜480 |
| `desc` | string? | 省略可 |
| `tags` | string[]? | 省略可 |

バリデーション失敗時: `HTTP 400 { "error": "..." }`

**レスポンス:** 作成された Action オブジェクト

---

### `PUT /api/actions/[id]`

行動を更新する。

**リクエストボディ:** POST と同じ形式（バリデーションも同じ）

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

**バリデーション:**
| フィールド | 型 | 制約 |
|---|---|---|
| `title` | string | 1〜200文字 |
| `satisfaction` | integer | 1〜5 |
| `time` | integer | 1〜480 |
| `price` | integer | 1〜100000 |
| `desc` | string? | 省略可 |
| `tags` | string[]? | 省略可 |

バリデーション失敗時: `HTTP 400 { "error": "..." }`

**レスポンス:** 作成された Reward オブジェクト

---

### `PUT /api/rewards/[id]`

ご褒美を更新する。

**リクエストボディ:** POST と同じ形式（バリデーションも同じ）

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
{ "delta": 1 }   // 0以外の整数（+1 または -1 が典型）
```

**バリデーション:** `delta` は0以外の整数であること（0・小数・文字列は HTTP 400）

**レスポンス:** `{ "ok": true }`

**サーバー側処理:**
- `newCount = existing.count + delta`
- `newCount <= 0` の場合は DoneAction レコードを削除
- `newCount > 0` の場合は count を更新
- `User.points` を `existing.pt × delta` 分インクリメント（DBの pt 値を使用）
- DoneAction更新と User.points更新はトランザクション内で実行（アトミック）

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
{ "delta": 1 }   // 0以外の整数。+1（消費増加）または -1（消費キャンセル）が典型
```

**バリデーション:** `delta` は0以外の整数であること（0・小数・文字列は HTTP 400）

**レスポンス:** `{ "ok": true }`

**注意:**
- `User.points` は**デクリメント**（行動と逆）。`delta=-1` のときはポイントが戻る。
- DoneReward更新と User.points更新はトランザクション内で実行（アトミック）

---

## ユーザー設定

### `GET /api/user`

ログイン中のユーザーのメールアドレスを取得する。

**レスポンス:**
```json
{ "email": "user@example.com" }
```

---

### `PATCH /api/user`

難易度モードを変更する。

**リクエストボディ:**
```json
{ "mode": "hard" }   // "easy" | "normal" | "hard"
```

**バリデーション:** `mode` は `"easy"` / `"normal"` / `"hard"` のいずれかであること。それ以外は HTTP 400。

**レスポンス:** `{ "ok": true }`

---

### `DELETE /api/user`

アカウントと全関連データを削除する。

**レスポンス:** `{ "ok": true }`

**注意:**
- User レコード削除により `onDelete: Cascade` で Action / Reward / DoneAction / DoneReward / Account / Session も自動削除される
- クライアント側でレスポンス受信後に `signOut()` を呼ぶ

---

## メールアドレス変更

### `POST /api/user/email`

メールアドレス変更の確認メールを送信する。

**リクエストボディ:**
```json
{ "newEmail": "new@example.com" }
```

**レスポンス（成功）:** `{ "ok": true }`

**レスポンス（エラー）:**
```
HTTP 400  { "error": "不正なメールアドレスです" }
HTTP 400  { "error": "現在と同じメールアドレスです" }
HTTP 400  { "error": "このメールアドレスは既に使用されています" }
HTTP 500  { "error": "メール送信に失敗しました。しばらく経ってから再試行してください。" }
HTTP 500  { "error": "サーバー設定エラーが発生しました。管理者にお問い合わせください。" }  // 本番でAUTH_URL未設定時
```

**サーバー側処理:**
1. メール形式バリデーション
2. 現在のメールアドレスと同一チェック
3. 重複チェック（他ユーザーが使用中でないか）
4. `VerificationToken` を生成して保存
   - `identifier` = `email-change:${userId}|${newEmail}`
   - `token` = `crypto.randomUUID()`
   - `expires` = **1時間後**
5. Resend で確認メール送信（リンク: `${AUTH_URL}/settings/email-verify?token=xxx`）

**確認リンクの処理（`GET /settings/email-verify?token=xxx`）:**
- Server Component がトークンを検証し `User.email` を更新
- 完了後 `/settings?success=emailChanged` にリダイレクト

---

## 認証エンドポイント

### `GET|POST /api/auth/[...nextauth]`

NextAuth v5 が処理する認証エンドポイント。

- `POST /api/auth/signin/resend` — Resend へのメール送信リクエスト
- `GET /api/auth/callback/resend` — マジックリンクのコールバック処理
- `POST /api/auth/signout` — サインアウト

**注意:** このエンドポイント群はミドルウェアの認証チェックをスキップする。
詳細は [authentication.md](./authentication.md) を参照。

---

## 共通仕様

| 項目 | 仕様 |
|---|---|
| 認証 | NextAuth v5 JWT セッション。`proxy.ts` が検証し `x-user-id` ヘッダーを注入 |
| Content-Type | `application/json` |
| エラーレスポンス | `{ "error": "メッセージ" }` + HTTPステータス |
| 未認証エラー | HTTP 401 `{ "error": "Unauthorized" }`（`/api/auth/**` を除く） |
| バリデーションエラー | HTTP 400 `{ "error": "..." }`（`web/lib/validate.ts` で検証） |
| オーナーシップ確認 | 全 WHERE 条件に `userId` を含める |
| ポイント計算 | 常にサーバー側で計算（クライアント値不使用） |
| トランザクション | Done系の複数テーブル更新は `prisma.$transaction` でアトミックに実行 |
