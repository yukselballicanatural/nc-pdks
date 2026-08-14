import { redirect } from "next/navigation";
import { Suspense } from "react";
import Sidebar from "@/components/nav/Sidebar";
import { getSession } from "@/lib/auth/session";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  if (!session) redirect("/login");

  return (
    <div
      className="flex min-h-screen"
      style={{ color: "var(--tx-primary)" }}
    >
      <Suspense
        fallback={
          <div
            className="w-56 shrink-0"
            style={{
              background: "rgba(6,12,24,0.75)",
              borderRight: "1px solid rgba(255,255,255,0.07)",
            }}
          />
        }
      >
        <Sidebar role={session.role} username={session.username} />
      </Suspense>
      <main className="min-w-0 flex-1">{children}</main>
    </div>
  );
}
