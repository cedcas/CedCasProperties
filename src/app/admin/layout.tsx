import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import AdminLayoutClient from "@/components/admin/AdminLayoutClient";

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

  if (isLoginPage) {
    return (
      <div className="min-h-screen bg-[#F4F6F8]">
        {children}
      </div>
    );
  }

  return (
    <AdminLayoutClient user={session?.user}>
      {children}
    </AdminLayoutClient>
  );
}
