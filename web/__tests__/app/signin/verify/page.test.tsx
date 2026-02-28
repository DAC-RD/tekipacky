import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import VerifyRequestPage from "@/app/signin/verify/page";

describe("VerifyRequestPage", () => {
  it("見出しが表示される", () => {
    render(<VerifyRequestPage />);
    expect(screen.getByText("メールを確認してください")).toBeInTheDocument();
  });

  it("メール送信の説明文が表示される", () => {
    render(<VerifyRequestPage />);
    expect(
      screen.getByText(/ログインリンクをメールで送信しました/),
    ).toBeInTheDocument();
  });

  it("1 時間の有効期限の注意文が表示される", () => {
    render(<VerifyRequestPage />);
    expect(screen.getByText(/1 時間/)).toBeInTheDocument();
  });

  it("「別のメールアドレスで試す」リンクが /signin を指す", () => {
    render(<VerifyRequestPage />);
    const link = screen.getByRole("link", { name: /別のメールアドレスで試す/ });
    expect(link).toHaveAttribute("href", "/signin");
  });
});
