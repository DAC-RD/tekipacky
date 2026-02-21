import { DoneItem, Mode } from "./types";
import { MODES } from "./constants";

export function getTodayJST(): string {
  return new Intl.DateTimeFormat("ja-JP", {
    timeZone: "Asia/Tokyo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  })
    .format(new Date())
    .replace(/\//g, "-");
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
