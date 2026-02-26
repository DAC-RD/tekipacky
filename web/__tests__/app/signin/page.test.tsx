import { describe, it, expect, vi, beforeAll, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

vi.mock("next-auth/react", () => ({
  signIn: vi.fn(),
  signOut: vi.fn(),
}));

import { signIn } from "next-auth/react";
const mockSignIn = vi.mocked(signIn);

import SignInPage from "@/app/signin/page";

beforeAll(() => {
  Object.defineProperty(window, "location", {
    configurable: true,
    value: { href: "" },
  });
});

beforeEach(() => {
  vi.clearAllMocks();
  window.location.href = "";
});

describe("SignInPage", () => {
  it("フォームが表示される", () => {
    render(<SignInPage />);
    expect(screen.getByPlaceholderText("you@example.com")).toBeInTheDocument();
  });

  it("メールアドレス未入力時はボタンが disabled", () => {
    render(<SignInPage />);
    const button = screen.getByRole("button", { name: "マジックリンクを送る" });
    expect(button).toBeDisabled();
  });

  it("メールアドレス入力後はボタンが enabled", async () => {
    render(<SignInPage />);
    const input = screen.getByPlaceholderText("you@example.com");
    await userEvent.type(input, "test@example.com");
    const button = screen.getByRole("button", { name: "マジックリンクを送る" });
    expect(button).not.toBeDisabled();
  });

  it("「トップへ戻る」リンクが / を指す", () => {
    render(<SignInPage />);
    const link = screen.getByRole("link", { name: /トップへ戻る/ });
    expect(link).toHaveAttribute("href", "/");
  });

  it("送信時に signIn が正しい引数で呼ばれる", async () => {
    mockSignIn.mockResolvedValue({ error: null } as never);
    render(<SignInPage />);
    const input = screen.getByPlaceholderText("you@example.com");
    await userEvent.type(input, "test@example.com");
    const button = screen.getByRole("button", { name: "マジックリンクを送る" });
    await userEvent.click(button);
    expect(mockSignIn).toHaveBeenCalledWith("resend", {
      email: "test@example.com",
      redirect: false,
      callbackUrl: "/?welcome=1",
    });
  });

  it("送信中は「送信中…」表示でボタンが disabled", async () => {
    // signIn を pending のまま止める
    let resolve: (v: unknown) => void;
    mockSignIn.mockReturnValue(
      new Promise((r) => {
        resolve = r;
      }) as never,
    );
    render(<SignInPage />);
    const input = screen.getByPlaceholderText("you@example.com");
    await userEvent.type(input, "test@example.com");
    const button = screen.getByRole("button", { name: "マジックリンクを送る" });
    fireEvent.click(button);
    await waitFor(() =>
      expect(screen.getByRole("button", { name: "送信中…" })).toBeDisabled(),
    );
    resolve!({ error: null });
  });

  it("signIn がエラーを返したらエラーメッセージが表示される", async () => {
    mockSignIn.mockResolvedValue({ error: "EmailSignin" } as never);
    render(<SignInPage />);
    const input = screen.getByPlaceholderText("you@example.com");
    await userEvent.type(input, "test@example.com");
    await userEvent.click(
      screen.getByRole("button", { name: "マジックリンクを送る" }),
    );
    await waitFor(() =>
      expect(
        screen.getByText("送信に失敗しました。もう一度お試しください。"),
      ).toBeInTheDocument(),
    );
  });

  it("成功時に window.location.href が /signin/verify になる", async () => {
    mockSignIn.mockResolvedValue({ error: null } as never);
    render(<SignInPage />);
    const input = screen.getByPlaceholderText("you@example.com");
    await userEvent.type(input, "test@example.com");
    await userEvent.click(
      screen.getByRole("button", { name: "マジックリンクを送る" }),
    );
    await waitFor(() => expect(window.location.href).toBe("/signin/verify"));
  });
});
