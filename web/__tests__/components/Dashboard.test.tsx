import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, act } from "@testing-library/react";
import { INITIAL_STATE } from "@/lib/constants";

vi.mock("next-auth/react", () => ({
  signIn: vi.fn(),
  signOut: vi.fn(),
}));

vi.mock("@/hooks/useStore", () => ({
  useStore: () => ({
    state: { ...INITIAL_STATE },
    hydrated: true,
    completeAction: vi.fn(),
    completeReward: vi.fn(),
    adjustDoneAction: vi.fn(),
    adjustDoneReward: vi.fn(),
    saveItem: vi.fn(),
    deleteItem: vi.fn(),
    changeMode: vi.fn(),
  }),
}));

// 子コンポーネントのモック（テスト対象外）
vi.mock("@/components/PointDisplay", () => ({
  default: () => <div data-testid="point-display" />,
}));
vi.mock("@/components/DoneAccordion", () => ({
  default: () => <div data-testid="done-accordion" />,
}));
vi.mock("@/components/FilterArea", () => ({
  default: () => <div data-testid="filter-area" />,
}));
vi.mock("@/components/ItemModal", () => ({
  default: () => <div data-testid="item-modal" />,
}));

import Dashboard from "@/components/Dashboard";

beforeEach(() => {
  vi.useFakeTimers();
  vi.spyOn(window.history, "replaceState").mockImplementation(() => {});
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe("Dashboard - welcomeMessage toast", () => {
  it("welcomeMessage=new のとき「アカウントを作成しました」が表示される", () => {
    render(<Dashboard welcomeMessage="new" />);
    expect(screen.getByText(/アカウントを作成しました/)).toBeInTheDocument();
  });

  it("welcomeMessage=returning のとき「ログインしました」が表示される", () => {
    render(<Dashboard welcomeMessage="returning" />);
    expect(screen.getByText(/ログインしました/)).toBeInTheDocument();
  });

  it("welcomeMessage=null のときトーストが表示されない", () => {
    render(<Dashboard welcomeMessage={null} />);
    expect(
      screen.queryByText(/アカウントを作成しました/),
    ).not.toBeInTheDocument();
    expect(screen.queryByText(/ログインしました/)).not.toBeInTheDocument();
  });

  it("toast 表示時に window.history.replaceState で URL がクリーンアップされる", () => {
    render(<Dashboard welcomeMessage="new" />);
    expect(window.history.replaceState).toHaveBeenCalledWith({}, "", "/");
  });

  it("3000ms 後に toast が消える", () => {
    render(<Dashboard welcomeMessage="returning" />);
    expect(screen.getByText(/ログインしました/)).toBeInTheDocument();
    act(() => {
      vi.advanceTimersByTime(3000);
    });
    expect(screen.queryByText(/ログインしました/)).not.toBeInTheDocument();
  });

  it("welcomeMessage なし（undefined）のときトーストが表示されない", () => {
    render(<Dashboard />);
    expect(
      screen.queryByText(/アカウントを作成しました/),
    ).not.toBeInTheDocument();
    expect(screen.queryByText(/ログインしました/)).not.toBeInTheDocument();
  });
});
