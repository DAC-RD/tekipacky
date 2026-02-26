import Link from "next/link";

export default function LandingPage() {
  return (
    <div
      className="min-h-screen flex flex-col"
      style={{ background: "var(--bg)" }}
    >
      {/* Hero */}
      <main className="flex-1 flex flex-col items-center justify-center px-6 py-16 text-center">
        <div className="mb-4">
          <span
            className="text-5xl font-black tracking-tight"
            style={{
              fontFamily:
                "var(--font-space-grotesk), 'Space Grotesk', sans-serif",
              color: "var(--accent)",
            }}
          >
            ✦
          </span>
        </div>

        <h1
          className="text-4xl font-black tracking-tight mb-3"
          style={{ letterSpacing: "-0.02em", color: "var(--text)" }}
        >
          テキパッキー
        </h1>

        <p className="text-lg mb-2" style={{ color: "var(--muted)" }}>
          行動をポイント化して、ご褒美を楽しもう
        </p>

        <p
          className="text-sm mb-10 max-w-sm leading-relaxed"
          style={{ color: "var(--muted)" }}
        >
          脳疲弊で日常行動に着手できないあなたへ。
          <br />
          小さな一歩を積み重ねて、自分にご褒美をあげよう。
        </p>

        <Link
          href="/signin"
          className="inline-block px-8 py-3 rounded-2xl font-bold text-base transition-all"
          style={{
            background: "var(--accent)",
            color: "#fff",
            boxShadow: "0 4px 20px rgba(255, 107, 53, 0.4)",
          }}
        >
          メールで始める
        </Link>
      </main>

      {/* Features */}
      <section className="max-w-2xl mx-auto w-full px-6 pb-20 grid gap-4 sm:grid-cols-3">
        <FeatureCard
          emoji="✅"
          title="行動メニュー"
          desc="食器を洗う、風呂に入るなど、日常行動を登録してポイントを貯める。"
        />
        <FeatureCard
          emoji="⭐"
          title="ポイント獲得"
          desc="行動のハードルと時間に応じてポイントが自動計算される。"
        />
        <FeatureCard
          emoji="🎁"
          title="ご褒美"
          desc="貯めたポイントを動画視聴・外食などのご褒美に交換して楽しもう。"
        />
      </section>

      {/* Footer */}
      <footer className="text-center pb-8" style={{ color: "var(--muted)" }}>
        <p className="text-xs">© 2026 テキパッキー</p>
      </footer>
    </div>
  );
}

function FeatureCard({
  emoji,
  title,
  desc,
}: {
  emoji: string;
  title: string;
  desc: string;
}) {
  return (
    <div className="rounded-2xl p-5" style={{ background: "var(--surface)" }}>
      <div className="text-2xl mb-2">{emoji}</div>
      <h3 className="font-bold text-sm mb-1" style={{ color: "var(--text)" }}>
        {title}
      </h3>
      <p className="text-xs leading-relaxed" style={{ color: "var(--muted)" }}>
        {desc}
      </p>
    </div>
  );
}
