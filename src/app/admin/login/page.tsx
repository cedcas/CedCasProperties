"use client";
import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import Image from "next/image";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail]       = useState("");
  const [password, setPassword] = useState("");
  const [error, setError]       = useState("");
  const [loading, setLoading]   = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    const res = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });
    setLoading(false);
    if (res?.ok) {
      router.push("/admin/dashboard");
    } else {
      setError("Invalid email or password.");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: "linear-gradient(135deg,#17260f 0%,#2d4820 50%,#2C2C2C 100%)" }}>
      <div className="w-full max-w-md mx-4">
        {/* Card */}
        <div className="bg-white rounded-[24px] shadow-[0_24px_80px_rgba(0,0,0,.35)] overflow-hidden">
          {/* Header */}
          <div className="px-10 pt-10 pb-7 border-b border-black/[.06] flex flex-col items-center text-center">
            <div style={{ width: 160, height: 46, overflow: "hidden" }} className="mb-4">
              <Image
                src="/brand-assets/Transparent Logo.png"
                alt="HavenInLipa"
                width={160}
                height={113}
                style={{ marginTop: -29 }}
                priority
              />
            </div>
            <h1 className="font-serif font-semibold text-charcoal text-[1.4rem]">Admin Portal</h1>
            <p className="text-charcoal/45 text-[13px] mt-1">Sign in to manage your properties</p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="px-10 py-8 flex flex-col gap-5">
            <div className="flex flex-col gap-1.5">
              <label className="text-[12px] font-semibold text-charcoal/60 tracking-wide uppercase">Email</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@haveninlipa.com"
                className="w-full px-4 py-3 rounded-[10px] border border-black/[.10] bg-offwhite text-[14px] text-charcoal placeholder-charcoal/30 focus:outline-none focus:border-forest focus:ring-2 focus:ring-forest/10 transition-all duration-200"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[12px] font-semibold text-charcoal/60 tracking-wide uppercase">Password</label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-4 py-3 rounded-[10px] border border-black/[.10] bg-offwhite text-[14px] text-charcoal placeholder-charcoal/30 focus:outline-none focus:border-forest focus:ring-2 focus:ring-forest/10 transition-all duration-200"
              />
            </div>

            {error && (
              <div className="flex items-center gap-2 text-red-600 text-[13px] bg-red-50 border border-red-200 rounded-[8px] px-4 py-2.5">
                <i className="fa-solid fa-circle-exclamation" /> {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 rounded-full text-[14px] font-semibold text-white transition-all duration-300 hover:-translate-y-0.5 disabled:opacity-60"
              style={{ background: "linear-gradient(135deg,#C4A862,#A8893F)", boxShadow: "0 4px 20px rgba(196,168,98,.35)" }}
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <i className="fa-solid fa-spinner fa-spin" /> Signing in…
                </span>
              ) : (
                "Sign In"
              )}
            </button>
          </form>
        </div>

        <p className="text-center text-white/30 text-[12px] mt-5">
          HavenInLipa Admin &copy; {new Date().getFullYear()}
        </p>
      </div>

      <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css" crossOrigin="anonymous" />
    </div>
  );
}
