import Link from "next/link";

export default function VerifyRequestPage() {
  return (
    <div
      className="min-h-screen flex items-center justify-center px-6"
      style={{ background: "var(--bg)" }}
    >
      <div className="w-full max-w-sm text-center">
        <div className="text-4xl mb-4">📬</div>

        <h1
          className="text-2xl font-black mb-3"
          style={{ color: "var(--text)" }}
        >
          メールを確認してください
        </h1>

        <p
          className="text-sm leading-relaxed mb-6"
          style={{ color: "var(--muted)" }}
        >
          ログインリンクをメールで送信しました。
          <br />
          受信トレイを確認してリンクをクリックしてください。
        </p>

        <div
          className="rounded-2xl p-4 mb-6 text-sm"
          style={{ background: "var(--surface)", color: "var(--muted)" }}
        >
          リンクの有効期限は 24 時間です。
          <br />
          メールが届かない場合は迷惑メールフォルダもご確認ください。
        </div>

        <Link
          href="/signin"
          className="text-sm"
          style={{ color: "var(--accent)" }}
        >
          ← 別のメールアドレスで試す
        </Link>
      </div>
    </div>
  );
}
