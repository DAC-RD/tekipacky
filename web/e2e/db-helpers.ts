import { Pool } from "pg";

// ─────────────────────────────────────────────────────────────────────────────
// E2E テスト用 DB ヘルパー（pg 直接利用）
//
// Playwright は Prisma クライアント（ESM + import.meta.url）をロードできないため、
// E2E ファイル内では Prisma の代わりに pg を直接使用する。
// ─────────────────────────────────────────────────────────────────────────────

function createPool(): Pool {
  return new Pool({ connectionString: process.env.DATABASE_URL! });
}

/** テストユーザーを作成する（既存なら何もしない） */
export async function upsertTestUser(userId: string): Promise<void> {
  const pool = createPool();
  try {
    await pool.query(
      `INSERT INTO "User" (id, timezone, mode, points, "createdAt", "updatedAt")
       VALUES ($1, 'Asia/Tokyo', 'NORMAL', 0, NOW(), NOW())
       ON CONFLICT (id) DO NOTHING`,
      [userId],
    );
  } finally {
    await pool.end();
  }
}

/** テストユーザーの state をリセットする */
export async function resetTestUser(userId: string): Promise<void> {
  const pool = createPool();
  try {
    await pool.query(
      `UPDATE "User" SET points = 0, mode = 'NORMAL', "updatedAt" = NOW() WHERE id = $1`,
      [userId],
    );
  } finally {
    await pool.end();
  }
}

/** テストユーザーのポイントを設定する */
export async function setTestUserPoints(
  userId: string,
  points: number,
): Promise<void> {
  const pool = createPool();
  try {
    await pool.query(
      `UPDATE "User" SET points = $2, "updatedAt" = NOW() WHERE id = $1`,
      [userId, points],
    );
  } finally {
    await pool.end();
  }
}

/** テストユーザーに紐づく行動・ご褒美・完了ログを全削除する */
export async function cleanTestUserData(userId: string): Promise<void> {
  const pool = createPool();
  try {
    await pool.query(`DELETE FROM "DoneAction" WHERE "userId" = $1`, [userId]);
    await pool.query(`DELETE FROM "DoneReward" WHERE "userId" = $1`, [userId]);
    await pool.query(`DELETE FROM "Action"     WHERE "userId" = $1`, [userId]);
    await pool.query(`DELETE FROM "Reward"     WHERE "userId" = $1`, [userId]);
  } finally {
    await pool.end();
  }
}

/** テスト用行動を作成し、採番された id を返す */
export async function createTestAction(
  userId: string,
  params: { title: string; hurdle: number; time: number },
): Promise<number> {
  const pool = createPool();
  try {
    const result = await pool.query(
      `INSERT INTO "Action" ("userId", title, "desc", tags, hurdle, time, "createdAt", "updatedAt")
       VALUES ($1, $2, '', ARRAY[]::text[], $3, $4, NOW(), NOW()) RETURNING id`,
      [userId, params.title, params.hurdle, params.time],
    );
    return result.rows[0].id as number;
  } finally {
    await pool.end();
  }
}

/** テスト用ご褒美を作成し、採番された id を返す */
export async function createTestReward(
  userId: string,
  params: {
    title: string;
    satisfaction: number;
    time: number;
    price: number;
  },
): Promise<number> {
  const pool = createPool();
  try {
    const result = await pool.query(
      `INSERT INTO "Reward" ("userId", title, "desc", tags, satisfaction, time, price, "createdAt", "updatedAt")
       VALUES ($1, $2, '', ARRAY[]::text[], $3, $4, $5, NOW(), NOW()) RETURNING id`,
      [userId, params.title, params.satisfaction, params.time, params.price],
    );
    return result.rows[0].id as number;
  } finally {
    await pool.end();
  }
}
