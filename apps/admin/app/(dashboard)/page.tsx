export default function DashboardPage() {
  return (
    <main className="flex flex-1 flex-col gap-2 p-5">
      <h1 className="text-lg font-semibold">개요</h1>
      <p className="text-foreground/60 text-sm">
        제보 검수와 운영 지표는 P1입니다. P0 기간에는 Supabase 대시보드로 직접
        처리합니다.
      </p>
    </main>
  );
}
