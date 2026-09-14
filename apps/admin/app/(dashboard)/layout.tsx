import { DashboardNav } from "@/components/dashboard-nav";

export default function DashboardLayout({ children }: LayoutProps<"/">) {
  return (
    <div className="flex min-h-screen">
      <aside className="w-52 shrink-0 border-r border-border">
        <div className="flex h-12 items-center px-4">
          <span className="text-sm font-bold">다시집 운영</span>
        </div>
        <DashboardNav />
      </aside>
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-12 items-center justify-between border-b border-border px-5">
          <span className="text-xs text-muted-foreground">관리자</span>
          <form action="/api/auth/logout" method="post">
            <button
              type="submit"
              className="text-xs text-muted-foreground hover:text-foreground"
            >
              로그아웃
            </button>
          </form>
        </header>
        <main className="flex flex-col gap-5 p-5">{children}</main>
      </div>
    </div>
  );
}
