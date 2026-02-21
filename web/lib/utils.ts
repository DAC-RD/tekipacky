import { DoneItem, Mode } from "./types";
import { MODES } from "./constants";

type DbMode = "EASY" | "NORMAL" | "HARD";

export function getTodayJST(): string {
  return getDateForTimezone("Asia/Tokyo");
}

/** ユーザーのタイムゾーンでの今日の日付を "YYYY-MM-DD" 形式で返す */
export function getDateForTimezone(timezone: string): string {
  return new Intl.DateTimeFormat("ja-JP", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  })
    .format(new Date())
    .replace(/\//g, "-");
}

/** PrismaのMode列挙型をフロントエンドのMode型に変換 */
export function modeFromDb(mode: DbMode): Mode {
  return mode.toLowerCase() as Mode;
}

/** フロントエンドのMode型をPrismaのMode列挙型に変換 */
export function modeToDb(mode: Mode): DbMode {
  return mode.toUpperCase() as DbMode;
}

export function calcActionPt(hurdle: number, time: number, mode: Mode): number {
  return Math.max(1, Math.round(hurdle * time * MODES[mode].earnMul));
}

export function calcRewardPt(
  satisfaction: number,
  time: number,
  price: number,
  mode: Mode,
): number {
  return Math.max(
    1,
    Math.round(satisfaction * time * price * MODES[mode].spendMul),
  );
}

export function upsertDoneItem(
  list: DoneItem[],
  id: number,
  title: string,
  pt: number,
  delta: number,
  completedAt: string = new Date().toISOString(),
): DoneItem[] {
  const existing = list.find((d) => d.id === id);
  if (existing) {
    const newCount = existing.count + delta;
    if (newCount <= 0) return list.filter((d) => d.id !== id);
    return list.map((d) => (d.id === id ? { ...d, count: newCount } : d));
  }
  if (delta <= 0) return list;
  return [...list, { id, title, pt, count: delta, completedAt }];
}
