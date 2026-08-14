import { redirect } from "next/navigation";
import { Suspense } from "react";
import Sidebar from "@/components/nav/Sidebar";
import { getSession } from "@/lib/auth/session";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  if (!session) redirect("/login");

  return (
    <div className="flex min-h-screen bg-slate-950 text-slate-100">
      <Suspense fallback={<div className="w-56 shrink-0 border-r border-slate-800 bg-slate-900" />}>
        <Sidebar role={session.role} username={session.username} />
      </Suspense>
      <main className="min-w-0 flex-1">{children}</main>
    </div>
  );
}
