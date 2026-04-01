"use client";
import { useState } from "react";

type Testimonial = {
  id: number;
  name: string;
  location: string;
  rating: number;
  message: string;
};

const PAGE = 6;

export default function TestimonialList({ testimonials }: { testimonials: Testimonial[] }) {
  const [visible, setVisible] = useState(PAGE);
  const shown = testimonials.slice(0, visible);
  const hasMore = visible < testimonials.length;

  return (
    <>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        {shown.map((t) => (
          <div
            key={t.id}
            className="bg-white rounded-[20px] p-7 relative shadow-[0_4px_24px_rgba(44,44,44,.08)] hover:shadow-[0_12px_40px_rgba(44,44,44,.14)] hover:-translate-y-1 transition-[transform,box-shadow] duration-300"
          >
            <div className="flex gap-1 mb-4">
              {Array.from({ length: 5 }).map((_, j) => (
                <i key={j} className={`fa-solid fa-star text-[13px] ${j < t.rating ? "text-[#FF5371]" : "text-black/15"}`} />
              ))}
            </div>
            <div className="absolute top-5 right-6 text-[#FF5371] opacity-10" style={{ fontSize: 52, fontFamily: "Georgia", lineHeight: 1 }}>&ldquo;</div>
            <p className="text-charcoal/70 text-[14px] leading-[1.75] mb-6 relative z-[1]">
              &ldquo;{t.message}&rdquo;
            </p>
            <div className="flex items-center gap-3 border-t border-black/[.06] pt-4">
              <div className="w-9 h-9 rounded-full bg-[#3B5323] flex items-center justify-center text-white font-bold text-[13px] flex-shrink-0">
                {t.name.charAt(0)}
              </div>
              <div>
                <div className="font-semibold text-charcoal text-[13.5px]">{t.name}</div>
                <div className="text-charcoal/45 text-[11.5px] flex items-center gap-1.5 mt-0.5">
                  <i className="fa-solid fa-location-dot text-[#FF5371] text-[10px]" />{t.location}
                </div>
              </div>
              <div className="ml-auto">
                <span className="text-[10px] font-semibold text-[#3B5323] bg-[#3B5323]/10 px-2.5 py-1 rounded-full tracking-wide uppercase">Verified</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {hasMore && (
        <div className="mt-7 text-center">
          <button
            onClick={() => setVisible((v) => v + PAGE)}
            className="inline-flex items-center gap-2 px-7 py-3 rounded-full text-[13px] font-semibold text-forest border-2 border-forest/30 hover:bg-forest hover:text-white hover:border-forest transition-[background,color,border-color] duration-300"
          >
            Show more reviews
            <i className="fa-solid fa-chevron-down text-[11px]" />
          </button>
          <p className="text-charcoal/35 text-[12px] mt-2">
            Showing {shown.length} of {testimonials.length} reviews
          </p>
        </div>
      )}
    </>
  );
}
