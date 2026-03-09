"use client";
import { useState } from "react";

export default function PropertyGallery({ images, name }: { images: string[]; name: string }) {
  const [lightbox, setLightbox] = useState<number | null>(null);

  const prev = () => setLightbox((l) => (l !== null ? Math.max(0, l - 1) : 0));
  const next = () => setLightbox((l) => (l !== null ? Math.min(images.length - 1, l + 1) : 0));

  if (images.length === 0) return null;

  const main = images[0];
  const thumbs = images.slice(1, 5);
  const extraCount = images.length - 5;

  return (
    <>
      <div className={`grid gap-2 rounded-[16px] overflow-hidden ${thumbs.length > 0 ? "grid-cols-[2fr_1fr] grid-rows-2" : ""}`}
        style={{ height: thumbs.length > 0 ? 460 : 380 }}>
        {/* Main image */}
        <div
          className={`relative cursor-pointer overflow-hidden ${thumbs.length > 0 ? "row-span-2" : ""}`}
          onClick={() => setLightbox(0)}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={main} alt={name} className="w-full h-full object-cover hover:scale-[1.02] transition-transform duration-500" />
          <div className="absolute inset-0 bg-black/0 hover:bg-black/10 transition-colors duration-200" />
          {images.length === 1 && (
            <button className="absolute bottom-4 right-4 bg-white/90 backdrop-blur-sm text-charcoal text-[12px] font-semibold px-4 py-2 rounded-full shadow-md hover:bg-white transition-colors">
              <i className="fa-solid fa-expand mr-1.5" /> View Photo
            </button>
          )}
        </div>

        {/* Thumbnails */}
        {thumbs.map((url, i) => (
          <div key={url} className="relative cursor-pointer overflow-hidden" onClick={() => setLightbox(i + 1)}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={url} alt={`${name} ${i + 2}`} className="w-full h-full object-cover hover:scale-[1.03] transition-transform duration-500" />
            {i === 3 && extraCount > 0 && (
              <div className="absolute inset-0 bg-black/55 flex flex-col items-center justify-center text-white">
                <span className="text-[1.5rem] font-bold">+{extraCount}</span>
                <span className="text-[11px] font-medium opacity-80">more photos</span>
              </div>
            )}
            {!(i === 3 && extraCount > 0) && (
              <div className="absolute inset-0 bg-black/0 hover:bg-black/10 transition-colors duration-200" />
            )}
          </div>
        ))}

        {/* Show all photos button */}
        {images.length > 1 && (
          <button
            onClick={() => setLightbox(0)}
            className="absolute bottom-4 right-4 bg-white/90 backdrop-blur-sm text-charcoal text-[12px] font-semibold px-4 py-2 rounded-full shadow-md hover:bg-white transition-colors z-10"
            style={{ position: "absolute" }}
          >
            <i className="fa-solid fa-images mr-1.5" /> Show all {images.length} photos
          </button>
        )}
      </div>

      {/* Lightbox */}
      {lightbox !== null && (
        <div
          className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center"
          onClick={() => setLightbox(null)}
        >
          {/* Close */}
          <button
            className="absolute top-5 right-5 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors"
            onClick={() => setLightbox(null)}
          >
            <i className="fa-solid fa-xmark text-[18px]" />
          </button>

          {/* Prev */}
          {lightbox > 0 && (
            <button
              className="absolute left-4 w-12 h-12 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors"
              onClick={(e) => { e.stopPropagation(); prev(); }}
            >
              <i className="fa-solid fa-chevron-left text-[18px]" />
            </button>
          )}

          {/* Image */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={images[lightbox]}
            alt={`${name} ${lightbox + 1}`}
            className="max-h-[88vh] max-w-[88vw] object-contain select-none"
            onClick={(e) => e.stopPropagation()}
          />

          {/* Next */}
          {lightbox < images.length - 1 && (
            <button
              className="absolute right-4 w-12 h-12 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors"
              onClick={(e) => { e.stopPropagation(); next(); }}
            >
              <i className="fa-solid fa-chevron-right text-[18px]" />
            </button>
          )}

          {/* Counter */}
          <div className="absolute bottom-5 left-1/2 -translate-x-1/2 text-white/50 text-[13px]">
            {lightbox + 1} / {images.length}
          </div>
        </div>
      )}
    </>
  );
}
