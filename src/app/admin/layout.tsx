import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import AdminSidebar from "@/components/admin/AdminSidebar";

export const dynamic = "force-dynamic";
export const metadata = { title: "Admin — HavenInLipa" };

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [session, headersList] = await Promise.all([auth(), headers()]);
  const pathname = headersList.get("x-pathname") ?? "";
  const isLoginPage = pathname === "/admin/login";

  return (
    <div className="min-h-screen bg-[#F4F6F8] flex">
      {!isLoginPage && <AdminSidebar user={session?.user} />}
      <main className={`flex-1 ${!isLoginPage ? "ml-0 lg:ml-64" : ""} min-h-screen`}>
        {children}
      </main>
    </div>
  );
}
