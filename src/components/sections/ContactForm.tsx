"use client";
import { useState } from "react";

const SUBJECTS = [
  "Booking Inquiry",
  "Property Information",
  "Rates & Availability",
  "Amenities Question",
  "Other",
];

export default function ContactForm() {
  const [form, setForm] = useState({ name: "", email: "", phone: "", subject: "", message: "" });
  const [status, setStatus] = useState<"idle" | "sending" | "success" | "error">("idle");

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setForm((p) => ({ ...p, [e.target.name]: e.target.value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus("sending");
    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      setStatus(res.ok ? "success" : "error");
      if (res.ok) setForm({ name: "", email: "", phone: "", subject: "", message: "" });
    } catch {
      setStatus("error");
    }
  };

  const inputCls =
    "w-full px-4 py-3 rounded-[10px] border border-black/[.10] bg-offwhite text-[14px] text-charcoal placeholder-charcoal/30 focus:outline-none focus:border-forest focus:ring-2 focus:ring-forest/10 transition-all duration-200";

  return (
    <section id="contact" className="py-28 bg-offwhite relative overflow-hidden">
      <div className="absolute inset-0 pointer-events-none opacity-40" style={{ backgroundImage: "radial-gradient(circle at 1px 1px,rgba(59,83,35,.06) 1px,transparent 0)", backgroundSize: "28px 28px" }} />
      <div className="absolute top-0 right-0 w-[420px] h-[420px] rounded-full pointer-events-none" style={{ background: "radial-gradient(circle at top right,rgba(255,83,113,.07) 0%,transparent 65%)", transform: "translate(30%,-30%)" }} />

      <div className="relative z-[1] max-w-6xl mx-auto px-6">

        <div className="flex flex-col items-center text-center reveal mb-14">
          <span className="flex items-center gap-2 text-forest text-[11px] font-semibold tracking-[.18em] uppercase mb-3">
            <span className="block w-7 h-0.5 bg-[#FF5371] rounded" />Get in Touch
            <span className="block w-7 h-0.5 bg-[#FF5371] rounded" />
          </span>
          <h2 className="font-serif font-semibold text-charcoal leading-tight mb-3" style={{ fontSize: "clamp(2rem,4vw,3rem)" }}>Contact Us</h2>
          <div className="coral-line mx-auto" />
          <p className="text-charcoal/55 text-[16px] leading-[1.7] max-w-[520px] mt-5">
            Have questions about our properties? We&apos;d love to hear from you.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-12 items-start">

          {/* Info panel */}
          <div className="lg:col-span-2 reveal reveal-d1">
            <div className="bg-white rounded-[20px] p-9 shadow-[0_4px_24px_rgba(44,44,44,.08)] border border-black/[.04] h-full flex flex-col gap-7">
              {[
                { icon: "fa-location-dot", title: "Our Location", content: <>Lipa City, Batangas<br />Philippines</> },
                { icon: "fa-phone", title: "Phone / WhatsApp", content: <a href="tel:+639066554415" className="hover:text-forest transition-colors">+63 906 655 4415</a> },
                { icon: "fa-envelope", title: "Email", content: <a href="mailto:customerservice@haveninlipa.com" className="hover:text-forest transition-colors break-all">customerservice@haveninlipa.com</a> },
              ].map((item, i) => (
                <div key={item.title}>
                  {i > 0 && <div className="w-full h-px bg-black/[.06] -mt-3.5 mb-3.5" />}
                  <div className="flex items-start gap-4">
                    <div className="w-11 h-11 rounded-[12px] bg-forest/10 flex items-center justify-center flex-shrink-0">
                      <i className={`fa-solid ${item.icon} text-forest text-[17px]`} />
                    </div>
                    <div>
                      <div className="font-semibold text-charcoal text-[14px] mb-0.5">{item.title}</div>
                      <div className="text-charcoal/55 text-[13.5px] leading-[1.65]">{item.content}</div>
                    </div>
                  </div>
                </div>
              ))}
              <div className="w-full h-px bg-black/[.06]" />
              <div>
                <div className="font-semibold text-charcoal text-[14px] mb-3">Find Us Online</div>
                <div className="flex gap-3">
                  {[
                    ["fa-facebook-f", "https://www.facebook.com/profile.php?id=61572535599006"],
                    ["fa-instagram",  "https://www.instagram.com/haven_inlipa/"],
                    ["fa-tiktok",     "https://www.tiktok.com/@haven_inlipa"],
                    ["fa-airbnb",     "https://airbnb.com/h/fullhousebellavita"],
                  ].map(([icon, href]) => (
                    <a key={icon} href={href} target="_blank" rel="noopener noreferrer" className="w-10 h-10 rounded-full bg-forest/10 text-forest flex items-center justify-center text-[14px] hover:bg-forest hover:text-white transition-all duration-300">
                      <i className={`fa-brands ${icon}`} />
                    </a>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Form */}
          <div className="lg:col-span-3 reveal reveal-d2">
            <form onSubmit={handleSubmit} className="bg-white rounded-[20px] p-9 shadow-[0_4px_24px_rgba(44,44,44,.08)] border border-black/[.04]">

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 mb-5">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[12.5px] font-semibold text-charcoal/70 tracking-wide uppercase">Full Name <span className="text-red-500">*</span></label>
                  <input type="text" name="name" required value={form.name} onChange={handleChange} placeholder="Juan dela Cruz" className={inputCls} />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-[12.5px] font-semibold text-charcoal/70 tracking-wide uppercase">Email Address <span className="text-red-500">*</span></label>
                  <input type="email" name="email" required value={form.email} onChange={handleChange} placeholder="you@example.com" className={inputCls} />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 mb-5">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[12.5px] font-semibold text-charcoal/70 tracking-wide uppercase">Phone Number <span className="text-red-500">*</span></label>
                  <input type="tel" name="phone" required value={form.phone} onChange={handleChange} placeholder="+63 9XX XXX XXXX" className={inputCls} />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-[12.5px] font-semibold text-charcoal/70 tracking-wide uppercase">Subject <span className="text-red-500">*</span></label>
                  <select name="subject" required value={form.subject} onChange={handleChange} className={`${inputCls} appearance-none cursor-pointer`}>
                    <option value="" disabled>Select a subject</option>
                    {SUBJECTS.map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
              </div>

              <div className="flex flex-col gap-1.5 mb-7">
                <label className="text-[12.5px] font-semibold text-charcoal/70 tracking-wide uppercase">Message / Comments</label>
                <textarea name="message" rows={5} value={form.message} onChange={handleChange} placeholder="Tell us about your stay plans, dates, group size, or any questions…" className={`${inputCls} resize-none`} />
              </div>

              {status === "success" && (
                <div className="mb-5 p-4 rounded-[10px] bg-green-50 border border-green-200 text-green-700 text-[14px] flex items-center gap-2">
                  <i className="fa-solid fa-circle-check" /> Message sent! We&apos;ll get back to you within 24 hours.
                </div>
              )}
              {status === "error" && (
                <div className="mb-5 p-4 rounded-[10px] bg-red-50 border border-red-200 text-red-600 text-[14px] flex items-center gap-2">
                  <i className="fa-solid fa-circle-exclamation" /> Something went wrong. Please try again or email us directly.
                </div>
              )}

              <button
                type="submit"
                disabled={status === "sending"}
                className="w-full inline-flex items-center justify-center gap-2.5 px-8 py-4 rounded-full text-[14px] font-semibold text-white transition-all duration-300 hover:-translate-y-0.5 disabled:opacity-60 disabled:cursor-not-allowed"
                style={{ background: "linear-gradient(135deg,#FF5371,#E03D5A)", boxShadow: "0 4px 20px rgba(255,83,113,.35)" }}
              >
                <i className={`fa-solid ${status === "sending" ? "fa-spinner fa-spin" : "fa-paper-plane"}`} />
                {status === "sending" ? "Sending…" : "Send Message"}
              </button>

              <p className="text-center text-[12px] text-charcoal/35 mt-4">
                We typically reply within 24 hours. Fields marked <span className="text-red-400">*</span> are required.
              </p>
            </form>
          </div>

        </div>
      </div>
    </section>
  );
}
