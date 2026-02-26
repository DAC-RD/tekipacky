import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import PointDisplay from "@/components/PointDisplay";

const defaultProps = {
  points: 100,
  mode: "normal" as const,
  todayEarned: 30,
  todaySpent: 10,
  flashKey: 0,
};

describe("PointDisplay", () => {
  it("現在のポイントが表示される", () => {
    render(<PointDisplay {...defaultProps} points={250} />);
    expect(screen.getByText("250")).toBeInTheDocument();
  });

  it("今日の獲得ポイントが +xx 形式で表示される", () => {
    render(<PointDisplay {...defaultProps} todayEarned={42} />);
    expect(screen.getByText("+42")).toBeInTheDocument();
  });

  it("今日の消費ポイントが -xx 形式で表示される", () => {
    render(<PointDisplay {...defaultProps} todaySpent={15} />);
    expect(screen.getByText("-15")).toBeInTheDocument();
  });

  it("normal モードのラベルが表示される", () => {
    render(<PointDisplay {...defaultProps} mode="normal" />);
    expect(screen.getByText("ノーマルモード")).toBeInTheDocument();
  });

  it("easy モードのラベルが表示される", () => {
    render(<PointDisplay {...defaultProps} mode="easy" />);
    expect(screen.getByText("イージーモード")).toBeInTheDocument();
  });

  it("hard モードのラベルが表示される", () => {
    render(<PointDisplay {...defaultProps} mode="hard" />);
    expect(screen.getByText("ハードモード")).toBeInTheDocument();
  });

  it("'現在のポイント' ラベルが表示される", () => {
    render(<PointDisplay {...defaultProps} />);
    expect(screen.getByText("現在のポイント")).toBeInTheDocument();
  });

  it("'今日の獲得' ラベルが表示される", () => {
    render(<PointDisplay {...defaultProps} />);
    expect(screen.getByText("今日の獲得")).toBeInTheDocument();
  });

  it("'今日の消費' ラベルが表示される", () => {
    render(<PointDisplay {...defaultProps} />);
    expect(screen.getByText("今日の消費")).toBeInTheDocument();
  });

  it("ポイントが 0 のときも正しく表示される", () => {
    render(<PointDisplay {...defaultProps} points={0} todayEarned={0} todaySpent={0} />);
    expect(screen.getByText("0")).toBeInTheDocument();
    expect(screen.getByText("+0")).toBeInTheDocument();
    expect(screen.getByText("-0")).toBeInTheDocument();
  });
});
