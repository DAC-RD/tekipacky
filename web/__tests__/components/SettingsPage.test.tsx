import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";

vi.mock("next-auth/react", () => ({
  signOut: vi.fn(),
}));

vi.mock("next/link", () => ({
  default: ({
    href,
    children,
  }: {
    href: string;
    children: React.ReactNode;
  }) => <a href={href}>{children}</a>,
}));

import SettingsPage from "@/components/SettingsPage";
import { signOut } from "next-auth/react";

const mockSignOut = vi.mocked(signOut);

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ ok: true }),
    }),
  );
});

describe("SettingsPage - メールアドレス変更", () => {
  it("現在のメールアドレスが表示される", () => {
    render(<SettingsPage email="user@example.com" />);
    expect(screen.getByText(/user@example\.com/)).toBeInTheDocument();
  });

  it("email が null のとき「未設定」が表示される", () => {
    render(<SettingsPage email={null} />);
    expect(screen.getByText(/未設定/)).toBeInTheDocument();
  });

  it("successMessage=emailChanged のとき成功バナーが表示される", () => {
    render(
      <SettingsPage email="user@example.com" successMessage="emailChanged" />,
    );
    expect(
      screen.getByText(/メールアドレスを変更しました/),
    ).toBeInTheDocument();
  });

  it("successMessage なしのとき成功バナーが表示されない", () => {
    render(<SettingsPage email="user@example.com" />);
    expect(
      screen.queryByText(/メールアドレスを変更しました/),
    ).not.toBeInTheDocument();
  });

  it("フォーム送信後に「確認メールを送りました」が表示される", async () => {
    render(<SettingsPage email="user@example.com" />);

    fireEvent.change(screen.getByPlaceholderText("new@example.com"), {
      target: { value: "new@example.com" },
    });
    fireEvent.submit(
      screen.getByRole("button", { name: "確認メールを送る" }).closest("form")!,
    );

    await waitFor(() => {
      expect(screen.getByText(/確認メールを送りました/)).toBeInTheDocument();
    });
  });

  it("API エラー時にエラーメッセージが表示される", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        json: async () => ({
          error: "このメールアドレスは既に使用されています",
        }),
      }),
    );

    render(<SettingsPage email="user@example.com" />);

    fireEvent.change(screen.getByPlaceholderText("new@example.com"), {
      target: { value: "taken@example.com" },
    });
    fireEvent.submit(
      screen.getByRole("button", { name: "確認メールを送る" }).closest("form")!,
    );

    await waitFor(() => {
      expect(
        screen.getByText(/このメールアドレスは既に使用されています/),
      ).toBeInTheDocument();
    });
  });
});

describe("SettingsPage - アカウント削除", () => {
  it("「アカウントを削除」ボタンをクリックすると確認ダイアログが表示される", () => {
    render(<SettingsPage email="user@example.com" />);
    fireEvent.click(screen.getByRole("button", { name: "アカウントを削除" }));
    expect(screen.getByText(/アカウントを削除しますか？/)).toBeInTheDocument();
  });

  it("確認ダイアログのキャンセルでダイアログが閉じる", () => {
    render(<SettingsPage email="user@example.com" />);
    fireEvent.click(screen.getByRole("button", { name: "アカウントを削除" }));
    fireEvent.click(screen.getByRole("button", { name: "キャンセル" }));
    expect(
      screen.queryByText(/アカウントを削除しますか？/),
    ).not.toBeInTheDocument();
  });

  it("「削除する」と入力しないと削除ボタンが disabled", () => {
    render(<SettingsPage email="user@example.com" />);
    fireEvent.click(screen.getByRole("button", { name: "アカウントを削除" }));

    const confirmBtn = screen.getAllByRole("button", { name: "削除する" })[0];
    expect(confirmBtn).toBeDisabled();
  });

  it("「削除する」と入力すると削除ボタンが有効になる", () => {
    render(<SettingsPage email="user@example.com" />);
    fireEvent.click(screen.getByRole("button", { name: "アカウントを削除" }));

    fireEvent.change(screen.getByPlaceholderText("削除する"), {
      target: { value: "削除する" },
    });

    const confirmBtn = screen.getAllByRole("button", { name: "削除する" })[0];
    expect(confirmBtn).not.toBeDisabled();
  });

  it("削除確定後に DELETE /api/user が呼ばれ signOut が実行される", async () => {
    mockSignOut.mockResolvedValue(undefined as never);

    render(<SettingsPage email="user@example.com" />);
    fireEvent.click(screen.getByRole("button", { name: "アカウントを削除" }));

    fireEvent.change(screen.getByPlaceholderText("削除する"), {
      target: { value: "削除する" },
    });
    fireEvent.click(screen.getAllByRole("button", { name: "削除する" })[0]);

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith(
        "/api/user",
        expect.objectContaining({ method: "DELETE" }),
      );
      expect(mockSignOut).toHaveBeenCalledWith({ callbackUrl: "/" });
    });
  });
});
