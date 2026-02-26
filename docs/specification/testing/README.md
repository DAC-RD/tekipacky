# テスト方針

## 概要

tekipacky の単体テストは **Vitest** を使用し、`web/__tests__/` ディレクトリに配置する。
既存のディレクトリ構造を踏襲してテストファイルを作成する。

---

## ディレクトリ構造

```
web/__tests__/
├── lib/                              # ユーティリティ関数テスト
│   ├── utils.test.ts                 # 純粋関数（ポイント計算・変換・リスト操作）
│   └── user.test.ts                  # ヘッダー抽出関数
├── components/                       # Reactコンポーネントテスト
│   ├── PointDisplay.test.tsx         # 表示コンポーネント
│   ├── FilterArea.test.tsx           # 検索・ソート・タグフィルター
│   ├── DoneAccordion.test.tsx        # アコーディオン・カウント調整
│   └── ItemModal.test.tsx            # フォームモーダル
├── hooks/
│   └── useStore.test.ts              # カスタムフック（fetchモック）
└── app/api/                          # APIルートテスト（Prismaモック）
    ├── state/route.test.ts
    ├── user/route.test.ts
    ├── actions/
    │   ├── route.test.ts
    │   └── [id]/route.test.ts
    ├── rewards/
    │   ├── route.test.ts
    │   └── [id]/route.test.ts
    └── done/
        ├── actions/
        │   ├── route.test.ts
        │   └── [actionId]/route.test.ts
        └── rewards/
            ├── route.test.ts
            └── [rewardId]/route.test.ts
```

---

## テストの種類と優先度

| 優先度 | 種類 | 対象 | 理由 |
|:---:|---|---|---|
| A | 純粋関数テスト | `lib/utils.ts`, `lib/user.ts` | 副作用なし・高信頼性・最も書きやすい |
| B | コンポーネントテスト | `components/*.tsx` | UIの動作確認・回帰防止 |
| C | フックテスト | `hooks/useStore.ts` | API呼び出しパターンの確認 |
| C | APIルートテスト | `app/api/**/*.ts` | サーバーロジック・バリデーション確認 |

---

## テスト実行

```bash
# Docker コンテナに入る（webディレクトリから）
docker compose exec app sh

# 全テスト実行
npx vitest run

# 特定ファイル・ディレクトリを実行
npx vitest run __tests__/lib/utils.test.ts
npx vitest run __tests__/components/
npx vitest run __tests__/app/api/

# ウォッチモード（開発時）
npx vitest

# カバレッジ（未設定・将来対応）
npx vitest run --coverage
```

---

## Vitest 設定

`web/vitest.config.ts`:

```typescript
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "."),  // @/* → web/* のパスエイリアス
    },
  },
  test: {
    environment: "jsdom",           // ブラウザ環境エミュレート
    setupFiles: ["./vitest.setup.ts"],
    globals: true,                  // describe/it/expect をグローバルで使用可能
  },
});
```

`web/vitest.setup.ts`:
```typescript
import "@testing-library/jest-dom";  // toBeInTheDocument() などのマッチャー追加
```

---

## テストパターン詳細

各パターンの具体的なコード例は以下を参照:

- [pure-function-patterns.md](./pure-function-patterns.md) — 純粋関数テスト
- [component-patterns.md](./component-patterns.md) — Reactコンポーネントテスト
- [hook-patterns.md](./hook-patterns.md) — カスタムフックテスト
- [api-route-patterns.md](./api-route-patterns.md) — Next.js APIルートテスト
