export interface Action {
  id: number;
  title: string;
  desc: string;
  tags: string[];
  hurdle: number;
  time: number;
}

export interface Reward {
  id: number;
  title: string;
  desc: string;
  tags: string[];
  satisfaction: number;
  time: number;
  price: number;
}

export interface DoneItem {
  id: number;
  title: string;
  pt: number;
  count: number;
  completedAt: string; // UTC ISO 8601
}

export type Mode = "easy" | "normal" | "hard";
export type Tab = "action" | "reward";
export type SortOrder = "default" | "pt-desc" | "pt-asc";

export interface AppState {
  points: number;
  mode: Mode;
  actions: Action[];
  rewards: Reward[];
  doneActions: DoneItem[];
  doneRewards: DoneItem[];
  nextId: number;
  lastDate: string; // JST date "YYYY-MM-DD"
}

export interface FloatItem {
  id: number;
  x: number;
  y: number;
  text: string;
  color: string;
}

export interface ModeConfig {
  earnMul: number;
  spendMul: number;
  label: string;
  emoji: string;
}
