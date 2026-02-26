import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";

// Server Component 依存のモック
vi.mock("@/lib/auth", () => ({ auth: vi.fn() }));
vi.mock("@/lib/prisma", () => ({
  prisma: { user: { findUnique: vi.fn() } },
}));
vi.mock("@/components/LandingPage", () => ({
  default: () => <div data-testid="landing-page" />,
}));
vi.mock("@/components/Dashboard", () => ({
  default: ({ welcomeMessage }: { welcomeMessage?: string | null }) => (
    <div data-testid="dashboard" data-welcome={welcomeMessage ?? ""} />
  ),
}));

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import Home from "@/app/page";

const mockAuth = vi.mocked(auth);
const mockFindUnique = vi.mocked(prisma.user.findUnique);

function makeSession(userId = "user-1") {
  return {
    user: { id: userId, email: "test@example.com", name: null, image: null },
    expires: new Date(Date.now() + 3600_000).toISOString(),
  };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("Home (app/page.tsx)", () => {
  it("未ログインのとき LandingPage を表示する", async () => {
    mockAuth.mockResolvedValue(null as never);
    const jsx = await Home({ searchParams: Promise.resolve({}) });
    render(jsx);
    expect(screen.getByTestId("landing-page")).toBeInTheDocument();
  });

  it("ログイン済み・welcome なしのとき Dashboard(welcomeMessage=null) を表示する", async () => {
    mockAuth.mockResolvedValue(makeSession() as never);
    const jsx = await Home({ searchParams: Promise.resolve({}) });
    render(jsx);
    const dashboard = screen.getByTestId("dashboard");
    expect(dashboard).toBeInTheDocument();
    expect(dashboard.dataset.welcome).toBe("");
  });

  it("welcome=1 のとき prisma.user.findUnique を呼ぶ", async () => {
    mockAuth.mockResolvedValue(makeSession() as never);
    mockFindUnique.mockResolvedValue({ createdAt: new Date() } as never);
    await Home({ searchParams: Promise.resolve({ welcome: "1" }) });
    expect(mockFindUnique).toHaveBeenCalledTimes(1);
  });

  it("welcome=1 かつ新規ユーザー（createdAt が 10 秒前）→ welcomeMessage=new", async () => {
    mockAuth.mockResolvedValue(makeSession() as never);
    mockFindUnique.mockResolvedValue({
      createdAt: new Date(Date.now() - 10_000),
    } as never);
    const jsx = await Home({ searchParams: Promise.resolve({ welcome: "1" }) });
    render(jsx);
    const dashboard = screen.getByTestId("dashboard");
    expect(dashboard.dataset.welcome).toBe("new");
  });

  it("welcome=1 かつ既存ユーザー（createdAt が 5 分前）→ welcomeMessage=returning", async () => {
    mockAuth.mockResolvedValue(makeSession() as never);
    mockFindUnique.mockResolvedValue({
      createdAt: new Date(Date.now() - 5 * 60_000),
    } as never);
    const jsx = await Home({ searchParams: Promise.resolve({ welcome: "1" }) });
    render(jsx);
    const dashboard = screen.getByTestId("dashboard");
    expect(dashboard.dataset.welcome).toBe("returning");
  });

  it("welcome=1 以外のとき prisma.user.findUnique を呼ばない", async () => {
    mockAuth.mockResolvedValue(makeSession() as never);
    await Home({ searchParams: Promise.resolve({ welcome: "0" }) });
    expect(mockFindUnique).not.toHaveBeenCalled();
  });
});
