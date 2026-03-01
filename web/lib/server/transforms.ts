import { Action, DoneItem, Reward } from "@/lib/types";

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
