export default function DashboardLayout({ children }: LayoutProps<"/">) {
  return (
    <div className="flex min-h-full flex-col">
      <header className="border-foreground/10 border-b px-5 py-3">
        <span className="text-sm font-semibold">다시집 운영</span>
      </header>
      {children}
    </div>
  );
}
