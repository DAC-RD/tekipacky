import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import LandingPage from "@/components/LandingPage";

describe("LandingPage", () => {
  it("アプリ名が表示される", () => {
    render(<LandingPage />);
    expect(screen.getByText("テキパッキー")).toBeInTheDocument();
  });

  it("キャッチコピーが表示される", () => {
    render(<LandingPage />);
    expect(
      screen.getByText("行動をポイント化して、ご褒美を楽しもう"),
    ).toBeInTheDocument();
  });

  it("「メールで始める」リンクが /signin を指す", () => {
    render(<LandingPage />);
    const link = screen.getByRole("link", { name: "メールで始める" });
    expect(link).toHaveAttribute("href", "/signin");
  });

  it("行動メニューの特徴カードが表示される", () => {
    render(<LandingPage />);
    expect(screen.getByText("行動メニュー")).toBeInTheDocument();
  });

  it("ポイント獲得の特徴カードが表示される", () => {
    render(<LandingPage />);
    expect(screen.getByText("ポイント獲得")).toBeInTheDocument();
  });

  it("ご褒美の特徴カードが表示される", () => {
    render(<LandingPage />);
    expect(screen.getByText("ご褒美")).toBeInTheDocument();
  });

  it("フッターに © 2026 が表示される", () => {
    render(<LandingPage />);
    expect(screen.getByText("© 2026 テキパッキー")).toBeInTheDocument();
  });
});
