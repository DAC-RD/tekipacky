"use client";

import { useState } from "react";
import { signOut } from "next-auth/react";
import Link from "next/link";

interface Props {
  email: string | null;
  successMessage?: string;
}

export default function SettingsPage({ email, successMessage }: Props) {
  // Email change state
  const [newEmail, setNewEmail] = useState("");
  const [emailLoading, setEmailLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const [emailError, setEmailError] = useState("");

  // Account deletion state
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deleteInput, setDeleteInput] = useState("");
  const [deleteLoading, setDeleteLoading] = useState(false);

  async function handleEmailChange(e: React.FormEvent) {
    e.preventDefault();
    if (!newEmail.trim()) return;
    setEmailLoading(true);
    setEmailError("");
    setEmailSent(false);

    const res = await fetch("/api/user/email", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ newEmail: newEmail.trim() }),
    });

    if (res.ok) {
      setEmailSent(true);
      setNewEmail("");
    } else {
      const data = (await res.json()) as { error?: string };
      setEmailError(data.error ?? "送信に失敗しました。");
    }
    setEmailLoading(false);
  }

  async function handleDeleteAccount() {
    if (deleteInput !== "削除する") return;
    setDeleteLoading(true);
    const res = await fetch("/api/user", { method: "DELETE" });
    if (res.ok) {
      await signOut({ callbackUrl: "/" });
    } else {
      setDeleteLoading(false);
      alert("削除に失敗しました。もう一度お試しください。");
    }
  }

  return (
    <div className="min-h-screen px-4 py-8" style={{ background: "var(--bg)" }}>
      <div className="max-w-lg mx-auto">
        {/* Header */}
        <div className="mb-8">
          <Link href="/" className="text-sm" style={{ color: "var(--muted)" }}>
            ← ダッシュボードへ
          </Link>
        </div>

        <h1
          className="text-2xl font-black mb-8"
          style={{ color: "var(--text)" }}
        >
          設定
        </h1>

        {/* Success banner */}
        {successMessage === "emailChanged" && (
          <div
            className="rounded-xl px-4 py-3 mb-6 text-sm font-bold"
            style={{ background: "var(--surface)", color: "var(--accent)" }}
          >
            メールアドレスを変更しました。
          </div>
        )}

        {/* Email change section */}
        <section
          className="rounded-2xl p-6 mb-6"
          style={{ background: "var(--surface)" }}
        >
          <h2
            className="text-base font-black mb-1"
            style={{ color: "var(--text)" }}
          >
            メールアドレス
          </h2>
          <p className="text-sm mb-4" style={{ color: "var(--muted)" }}>
            現在: {email ?? "未設定"}
          </p>

          {emailSent ? (
            <p className="text-sm" style={{ color: "var(--muted)" }}>
              確認メールを送りました。メールを確認してください。
            </p>
          ) : (
            <form onSubmit={handleEmailChange}>
              <label htmlFor="new-email" className="form-label">
                新しいメールアドレス
              </label>
              <input
                id="new-email"
                type="email"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                placeholder="new@example.com"
                required
                disabled={emailLoading}
                className="form-input mb-3"
              />
              {emailError && (
                <p className="text-xs mb-3" style={{ color: "#ff5050" }}>
                  {emailError}
                </p>
              )}
              <button
                type="submit"
                disabled={emailLoading || !newEmail.trim()}
                className="px-4 py-2 rounded-xl text-sm font-bold"
                style={{
                  background:
                    emailLoading || !newEmail.trim()
                      ? "var(--surface2)"
                      : "var(--accent)",
                  color:
                    emailLoading || !newEmail.trim() ? "var(--muted)" : "#fff",
                  border: "none",
                  cursor:
                    emailLoading || !newEmail.trim()
                      ? "not-allowed"
                      : "pointer",
                }}
              >
                {emailLoading ? "送信中…" : "確認メールを送る"}
              </button>
            </form>
          )}
        </section>

        {/* Danger zone */}
        <section
          className="rounded-2xl p-6"
          style={{
            background: "var(--surface)",
            border: "1px solid #ff505033",
          }}
        >
          <h2
            className="text-base font-black mb-1"
            style={{ color: "#ff5050" }}
          >
            デンジャーゾーン
          </h2>
          <p className="text-sm mb-4" style={{ color: "var(--muted)" }}>
            削除すると全データが失われます。この操作は取り消せません。
          </p>
          <button
            onClick={() => setShowDeleteDialog(true)}
            className="px-4 py-2 rounded-xl text-sm font-bold"
            style={{
              background: "transparent",
              border: "1px solid #ff5050",
              color: "#ff5050",
              cursor: "pointer",
            }}
          >
            アカウントを削除
          </button>
        </section>
      </div>

      {/* Delete confirmation dialog */}
      {showDeleteDialog && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center px-4"
          style={{ background: "rgba(0,0,0,0.5)" }}
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowDeleteDialog(false);
          }}
        >
          <div
            className="w-full max-w-sm rounded-2xl p-6"
            style={{ background: "var(--surface)" }}
          >
            <h3
              className="text-base font-black mb-2"
              style={{ color: "#ff5050" }}
            >
              アカウントを削除しますか？
            </h3>
            <p className="text-sm mb-4" style={{ color: "var(--muted)" }}>
              すべての行動・ご褒美・ログが削除されます。
              <br />
              確認のため「
              <b style={{ color: "var(--text)" }}>削除する</b>
              」と入力してください。
            </p>
            <input
              type="text"
              value={deleteInput}
              onChange={(e) => setDeleteInput(e.target.value)}
              placeholder="削除する"
              className="form-input mb-4"
            />
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowDeleteDialog(false);
                  setDeleteInput("");
                }}
                className="flex-1 py-2 rounded-xl text-sm font-bold"
                style={{
                  background: "var(--surface2)",
                  color: "var(--muted)",
                  border: "none",
                  cursor: "pointer",
                }}
              >
                キャンセル
              </button>
              <button
                onClick={handleDeleteAccount}
                disabled={deleteInput !== "削除する" || deleteLoading}
                className="flex-1 py-2 rounded-xl text-sm font-bold"
                style={{
                  background:
                    deleteInput === "削除する" && !deleteLoading
                      ? "#ff5050"
                      : "var(--surface2)",
                  color:
                    deleteInput === "削除する" && !deleteLoading
                      ? "#fff"
                      : "var(--muted)",
                  border: "none",
                  cursor:
                    deleteInput === "削除する" && !deleteLoading
                      ? "pointer"
                      : "not-allowed",
                }}
              >
                {deleteLoading ? "削除中…" : "削除する"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
