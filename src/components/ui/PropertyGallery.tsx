"use client";
import { useState } from "react";
import Image from "next/image";

// Served through next/image (Vercel image optimization) rather than raw <img>:
// the Blob originals are 1–4.6 MB phone JPEGs, and the page renders this
// gallery twice (desktop copy + CSS-hidden mobile copy). Raw <img> tags were
// all fetched eagerly — even inside the hidden copy — for ~21 MB per listing
// page (2026-09-30 SEO audit). Lazy next/image skips hidden and off-screen
// images and serves resized WebP/AVIF.
//
// `sizes` must stay identical between the two copies so the `priority` preload
// resolves to one URL instead of two.
const MAIN_SIZES = "(max-width: 1023px) 60vw, 650px";
const SIDE_SIZES = "(max-width: 1023px) 40vw, 460px";
const SINGLE_SIZES = "(max-width: 1023px) 100vw, 1104px";

type Props = {
  images: string[];
  name: string;
  /**
   * Optional descriptive alt text per image, parallel to `images`. Used for
   * SEO / accessibility. Falls back to a property-name + Lipa keyword pattern
   * when an entry is missing.
   */
  imageAlts?: string[];
  /** City/region used in the fallback alt pattern. */
  location?: string;
};

export default function PropertyGallery({ images, name, imageAlts, location }: Props) {
  const [lightbox, setLightbox] = useState<number | null>(null);

  const altFor = (index: number) => {
    const explicit = imageAlts?.[index]?.trim();
    if (explicit) return explicit;
    const place = location ? `${location}, Batangas` : "Lipa City, Batangas";
    return `${name} vacation rental in ${place} — image ${index + 1}`;
  };

  const prev = (e: React.MouseEvent) => { e.stopPropagation(); setLightbox((l) => Math.max(0, (l ?? 0) - 1)); };
  const next = (e: React.MouseEvent) => { e.stopPropagation(); setLightbox((l) => Math.min(images.length - 1, (l ?? 0) + 1)); };

  if (images.length === 0) {
    return (
      <div className="w-full h-[420px] rounded-[16px] overflow-hidden flex items-center justify-center"
        style={{ background: "linear-gradient(135deg,#1e3310,#3B5323)" }}>
        <i className="fa-solid fa-house text-white/10" style={{ fontSize: 100 }} />
      </div>
    );
  }

  const slots = images.slice(0, 5);

  return (
    <>
      {/* Grid */}
      <div className="relative rounded-[16px] overflow-hidden" style={{ height: 480 }}>
        {images.length === 1 ? (
          // Single image — full width
          <div className="relative w-full h-full cursor-pointer" onClick={() => setLightbox(0)}>
            <Image src={slots[0]} alt={altFor(0)} fill priority sizes={SINGLE_SIZES} className="object-cover hover:scale-[1.02] transition-transform duration-500" />
          </div>
        ) : (
          // Multi-image grid: 1 large left + up to 4 right
          <div className="grid h-full gap-2" style={{ gridTemplateColumns: "1.4fr 1fr", gridTemplateRows: "1fr 1fr" }}>
            {/* Main image — spans 2 rows */}
            <div className="row-span-2 relative cursor-pointer overflow-hidden group" onClick={() => setLightbox(0)}>
              <Image src={slots[0]} alt={altFor(0)} fill priority sizes={MAIN_SIZES} className="object-cover group-hover:scale-[1.02] transition-transform duration-500" />
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/08 transition-colors duration-200" />
            </div>

            {/* Up to 4 thumbnails on the right */}
            {slots.slice(1).map((url, i) => {
              const isLast = i === slots.slice(1).length - 1 && images.length > 5;
              return (
                <div key={url} className="relative cursor-pointer overflow-hidden group" onClick={() => setLightbox(i + 1)}>
                  <Image src={url} alt={altFor(i + 1)} fill sizes={SIDE_SIZES} className="object-cover group-hover:scale-[1.03] transition-transform duration-500" />
                  {isLast ? (
                    <div className="absolute inset-0 bg-black/55 flex flex-col items-center justify-center text-white gap-1">
                      <span className="text-[1.8rem] font-bold leading-none">+{images.length - 5}</span>
                      <span className="text-[11px] font-medium opacity-75">more photos</span>
                    </div>
                  ) : (
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors duration-200" />
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Show all photos button */}
        <button
          onClick={() => setLightbox(0)}
          className="absolute bottom-4 right-4 flex items-center gap-2 bg-white/95 backdrop-blur-sm text-charcoal text-[12px] font-semibold px-4 py-2.5 rounded-full shadow-lg hover:bg-white hover:shadow-xl transition-all duration-200 border border-black/[.08]"
        >
          <i className="fa-solid fa-images text-forest" />
          Show all {images.length} photo{images.length !== 1 ? "s" : ""}
        </button>
      </div>

      {/* Thumbnail strip (shows when > 5 photos) */}
      {images.length > 5 && (
        <div className="flex gap-2 mt-2 overflow-x-auto pb-1">
          {images.map((url, i) => (
            <button key={url} onClick={() => setLightbox(i)} aria-label={`Open photo ${i + 1} of ${images.length}`}
              className={`flex-shrink-0 w-16 h-12 rounded-[6px] overflow-hidden border-2 transition-all duration-150 ${lightbox === i ? "border-coral" : "border-transparent hover:border-coral/50"}`}>
              <Image src={url} alt="" width={64} height={48} sizes="64px" className="w-full h-full object-cover" />
            </button>
          ))}
        </div>
      )}

      {/* Lightbox */}
      {lightbox !== null && (
        <div className="fixed inset-0 z-50 bg-black/95 flex flex-col" onClick={() => setLightbox(null)}>
          {/* Top bar */}
          <div className="flex items-center justify-between px-6 py-4 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
            <span className="text-white/60 text-[13px] font-medium">{name}</span>
            <div className="flex items-center gap-3">
              <span className="text-white/40 text-[13px]">{lightbox + 1} / {images.length}</span>
              <button
                className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors"
                aria-label="Close photos"
                onClick={() => setLightbox(null)}
              >
                <i className="fa-solid fa-xmark text-[16px]" />
              </button>
            </div>
          </div>

          {/* Main image */}
          <div className="flex-1 flex items-center justify-center relative px-16 min-h-0">
            {lightbox > 0 && (
              <button
                className="absolute left-4 w-12 h-12 rounded-full bg-white/10 hover:bg-white/25 text-white flex items-center justify-center transition-colors"
                aria-label="Previous photo"
                onClick={prev}
              >
                <i className="fa-solid fa-chevron-left text-[18px]" />
              </button>
            )}

            {/* width/height are only an aspect hint: w-auto/h-auto + max-* keep the
                original contain-within-the-viewport sizing, so clicks on the dark
                backdrop around the photo still close the lightbox. */}
            <Image
              key={images[lightbox]}
              src={images[lightbox]}
              alt={altFor(lightbox)}
              width={1600}
              height={1200}
              sizes="100vw"
              className="w-auto h-auto max-h-full max-w-full object-contain select-none rounded-[8px]"
              onClick={(e) => e.stopPropagation()}
            />

            {lightbox < images.length - 1 && (
              <button
                className="absolute right-4 w-12 h-12 rounded-full bg-white/10 hover:bg-white/25 text-white flex items-center justify-center transition-colors"
                aria-label="Next photo"
                onClick={next}
              >
                <i className="fa-solid fa-chevron-right text-[18px]" />
              </button>
            )}
          </div>

          {/* Thumbnail strip */}
          <div className="flex-shrink-0 flex gap-2 px-6 py-4 overflow-x-auto justify-center" onClick={(e) => e.stopPropagation()}>
            {images.map((url, i) => (
              <button key={url} onClick={() => setLightbox(i)} aria-label={`Show photo ${i + 1} of ${images.length}`}
                className={`flex-shrink-0 w-14 h-10 rounded-[6px] overflow-hidden border-2 transition-all duration-150 ${i === lightbox ? "border-[#FF5371] opacity-100" : "border-transparent opacity-50 hover:opacity-80"}`}>
                <Image src={url} alt="" width={56} height={40} sizes="56px" className="w-full h-full object-cover" />
              </button>
            ))}
          </div>
        </div>
      )}
    </>
  );
}
