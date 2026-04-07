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

  const deploymentId = process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) ?? "local";
  const deploymentDate = process.env.VERCEL_GIT_COMMIT_DATE
    ? new Date(process.env.VERCEL_GIT_COMMIT_DATE).toLocaleDateString("en-PH", { month: "short", day: "numeric", year: "numeric" })
    : new Date().toLocaleDateString("en-PH", { month: "short", day: "numeric", year: "numeric" });

  return (
    <AdminLayoutClient user={session?.user} deploymentId={deploymentId} deploymentDate={deploymentDate}>
      {children}
    </AdminLayoutClient>
  );
}
