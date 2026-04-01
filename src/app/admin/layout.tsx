import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import AdminSidebar from "@/components/admin/AdminSidebar";

export const dynamic = "force-dynamic";
export const metadata = { title: "Admin — HavenInLipa" };

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  // Login page is public — all other /admin routes require auth
  return (
    <div className="min-h-screen bg-[#F4F6F8] flex">
      {session && <AdminSidebar user={session.user} />}
      <main className={`flex-1 ${session ? "ml-0 lg:ml-64" : ""} min-h-screen`}>
        {children}
      </main>
    </div>
  );
}
