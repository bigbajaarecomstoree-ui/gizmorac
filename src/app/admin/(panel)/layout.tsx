import { redirect } from "next/navigation";
import { isAuthenticated } from "@/lib/auth";
import { AdminNav } from "@/components/admin/admin-nav";

export default async function AdminPanelLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  if (!(await isAuthenticated())) {
    redirect("/admin/login");
  }

  return (
    <div className="min-h-screen bg-background md:grid md:grid-cols-[240px_1fr]">
      <aside className="border-b border-border bg-surface md:sticky md:top-0 md:h-screen md:border-b-0 md:border-r">
        <AdminNav />
      </aside>
      <main className="p-5 sm:p-8">{children}</main>
    </div>
  );
}
