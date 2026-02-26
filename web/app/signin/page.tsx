"use client";

import { useState } from "react";
import Link from "next/link";
import { signIn } from "next-auth/react";

export default function SignInPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;
    setLoading(true);
    setError("");

    const result = await signIn("resend", {
      email,
      redirect: false,
      callbackUrl: "/?welcome=1",
    });

    if (result?.error) {
      setError("送信に失敗しました。もう一度お試しください。");
      setLoading(false);
    } else {
      // 成功: verify ページへリダイレクト
      window.location.href = "/signin/verify";
    }
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center px-6"
      style={{ background: "var(--bg)" }}
    >
      <div className="w-full max-w-sm">
        {/* Back link */}
        <div className="mb-6">
          <Link href="/" className="text-sm" style={{ color: "var(--muted)" }}>
            ← トップへ戻る
          </Link>
        </div>

        {/* Logo */}
        <div className="text-center mb-8">
          <span
            className="text-3xl font-black"
            style={{ color: "var(--accent)" }}
          >
            ✦
          </span>
          <h1
            className="text-2xl font-black mt-1"
            style={{ color: "var(--text)" }}
          >
            テキパッキー
          </h1>
          <p className="text-sm mt-1" style={{ color: "var(--muted)" }}>
            メールアドレスでサインイン
          </p>
        </div>

        {/* Form */}
        <form
          onSubmit={handleSubmit}
          className="rounded-2xl p-6"
          style={{ background: "var(--surface)" }}
        >
          <label htmlFor="email" className="form-label">
            メールアドレス
          </label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            required
            disabled={loading}
            className="form-input mb-4"
          />

          {error && (
            <p className="text-xs mb-3" style={{ color: "#ff5050" }}>
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading || !email.trim()}
            className="w-full py-3 rounded-xl font-bold text-sm transition-all"
            style={{
              background:
                loading || !email.trim() ? "var(--surface2)" : "var(--accent)",
              color: loading || !email.trim() ? "var(--muted)" : "#fff",
              border: "none",
              cursor: loading || !email.trim() ? "not-allowed" : "pointer",
              boxShadow:
                loading || !email.trim()
                  ? "none"
                  : "0 4px 16px rgba(255,107,53,0.35)",
            }}
          >
            {loading ? "送信中…" : "マジックリンクを送る"}
          </button>
        </form>

        <p
          className="text-center text-xs mt-4"
          style={{ color: "var(--muted)" }}
        >
          リンクをクリックするだけでログインできます。
          <br />
          パスワードは不要です。
        </p>
      </div>
    </div>
  );
}
