export function AuthLoading() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-canvas">
      <div className="w-full max-w-sm animate-pulse rounded-[28px] bg-white p-10 shadow-soft">
        <div className="mx-auto h-14 w-14 rounded-[18px] bg-violet-100" />
        <div className="mx-auto mt-6 h-5 w-40 rounded-full bg-slate-100" />
        <div className="mx-auto mt-3 h-3 w-56 rounded-full bg-slate-100" />
        <div className="mt-8 h-12 rounded-[16px] bg-violet-100" />
      </div>
    </main>
  );
}
