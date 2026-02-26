import { Action, DoneItem, Mode, Reward } from "./types";
import { MODES } from "./constants";

type DbMode = "EASY" | "NORMAL" | "HARD";

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

/** PrismaのActionレコードをAPIレスポンス形式に変換 */
export function toActionResponse(a: {
  id: number;
  title: string;
  desc: string;
  tags: string[];
  hurdle: number;
  time: number;
}): Action {
  return {
    id: a.id,
    title: a.title,
    desc: a.desc,
    tags: a.tags,
    hurdle: a.hurdle,
    time: a.time,
  };
}

/** PrismaのRewardレコードをAPIレスポンス形式に変換 */
export function toRewardResponse(r: {
  id: number;
  title: string;
  desc: string;
  tags: string[];
  satisfaction: number;
  time: number;
  price: number;
}): Reward {
  return {
    id: r.id,
    title: r.title,
    desc: r.desc,
    tags: r.tags,
    satisfaction: r.satisfaction,
    time: r.time,
    price: r.price,
  };
}

/** PrismaのDoneAction/DoneRewardレコードをAPIレスポンス形式に変換 */
export function toDoneItemResponse(item: {
  actionId?: number | null;
  rewardId?: number | null;
  title: string;
  pt: number;
  count: number;
  date: string;
}): DoneItem {
  return {
    id: (item.actionId ?? item.rewardId)!,
    title: item.title,
    pt: item.pt,
    count: item.count,
    completedAt: item.date,
  };
}
