"use client";
import { useState, useRef } from "react";

interface ImageManagerProps {
  propertyId: number;
  initialImages: string[];
  initialFeatured: string | null;
}

export default function ImageManager({ propertyId, initialImages, initialFeatured }: ImageManagerProps) {
  const [images, setImages] = useState<string[]>(initialImages);
  const [featured, setFeatured] = useState<string | null>(initialFeatured);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  const upload = async (files: FileList) => {
    setUploading(true);
    setError("");
    try {
      for (const file of Array.from(files)) {
        const fd = new FormData();
        fd.append("file", file);
        const res = await fetch(`/api/admin/properties/${propertyId}/images`, { method: "POST", body: fd });
        if (!res.ok) throw new Error("Upload failed");
        const data = await res.json();
        setImages(data.images);
        if (!featured) setFeatured(data.url);
      }
    } catch {
      setError("Upload failed. Make sure BLOB_READ_WRITE_TOKEN is set in your environment.");
    } finally {
      setUploading(false);
    }
  };

  const setAsFeatured = async (url: string) => {
    const res = await fetch(`/api/admin/properties/${propertyId}/images`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url }),
    });
    if (res.ok) setFeatured(url);
  };

  const remove = async (url: string) => {
    const res = await fetch(`/api/admin/properties/${propertyId}/images`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url }),
    });
    if (res.ok) {
      const data = await res.json();
      setImages(data.images);
      setFeatured(data.featuredImage);
    }
  };

  return (
    <div className="bg-white rounded-[16px] p-6 shadow-[0_2px_12px_rgba(44,44,44,.07)] border border-black/[.04]">
      <h3 className="font-serif font-semibold text-charcoal mb-1">Property Images</h3>
      <p className="text-[12px] text-charcoal/45 mb-5">Upload photos. Click the star to set the featured/cover image.</p>

      {error && (
        <div className="text-[12px] text-red-600 bg-red-50 border border-red-200 rounded-[8px] px-3 py-2 mb-4">
          {error}
        </div>
      )}

      {/* Upload button */}
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={(e) => e.target.files && upload(e.target.files)}
      />
      <button
        type="button"
        onClick={() => fileRef.current?.click()}
        disabled={uploading}
        className="flex items-center gap-2 px-5 py-2.5 rounded-full text-[13px] font-semibold border-2 border-dashed border-black/[.15] text-charcoal/60 hover:border-forest hover:text-forest transition-all duration-200 disabled:opacity-50 mb-5"
      >
        {uploading ? (
          <><i className="fa-solid fa-spinner fa-spin" /> Uploading…</>
        ) : (
          <><i className="fa-solid fa-cloud-arrow-up" /> Upload Images</>
        )}
      </button>

      {images.length === 0 ? (
        <p className="text-[13px] text-charcoal/35 italic">No images uploaded yet.</p>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {images.map((url) => {
            const isFeat = url === featured;
            return (
              <div key={url} className={`relative rounded-[10px] overflow-hidden group border-2 transition-all duration-200 ${isFeat ? "border-[#C4A862]" : "border-transparent"}`}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={url} alt="" className="w-full h-[110px] object-cover" />

                {/* Featured badge */}
                {isFeat && (
                  <div className="absolute top-2 left-2 bg-[#C4A862] text-white text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                    <i className="fa-solid fa-star text-[8px]" /> Featured
                  </div>
                )}

                {/* Action overlay */}
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-all duration-200 flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100">
                  {!isFeat && (
                    <button
                      type="button"
                      onClick={() => setAsFeatured(url)}
                      title="Set as featured"
                      className="w-8 h-8 rounded-full bg-[#C4A862] text-white flex items-center justify-center hover:bg-[#A8893F] transition-colors"
                    >
                      <i className="fa-solid fa-star text-[11px]" />
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => remove(url)}
                    title="Delete image"
                    className="w-8 h-8 rounded-full bg-red-500 text-white flex items-center justify-center hover:bg-red-600 transition-colors"
                  >
                    <i className="fa-solid fa-trash text-[11px]" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
