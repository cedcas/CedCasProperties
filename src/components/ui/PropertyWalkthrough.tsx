/**
 * Optional per-unit walkthrough-video slot (DEC-034), rendered near the
 * gallery on a listing page. Renders nothing when `url` is undefined — the
 * caller passes `getWalkthroughVideoUrl(slug)`, and src/lib/walkthrough-videos.ts
 * ships with an empty map, so this is a no-op everywhere today until a real,
 * no-people unit-walkthrough URL is added for a slug.
 */
export function toEmbedUrl(url: string): string | null {
  const youtube = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([\w-]+)/);
  if (youtube) return `https://www.youtube.com/embed/${youtube[1]}`;
  const vimeo = url.match(/vimeo\.com\/(?:video\/)?(\d+)/);
  if (vimeo) return `https://player.vimeo.com/video/${vimeo[1]}`;
  return null;
}

export default function PropertyWalkthrough({ url, name }: { url?: string; name: string }) {
  if (!url) return null;
  const embedUrl = toEmbedUrl(url);

  return (
    <div>
      <h2 className="font-serif font-semibold text-charcoal text-[1.3rem] mb-4">Walkthrough video</h2>
      <div className="rounded-[12px] overflow-hidden border border-black/[.06] aspect-video bg-black">
        {embedUrl ? (
          <iframe
            src={embedUrl}
            title={`Walkthrough video of ${name}`}
            loading="lazy"
            allow="accelerometer; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            className="w-full h-full border-0 block"
          />
        ) : (
          <video controls preload="metadata" className="w-full h-full">
            <source src={url} />
          </video>
        )}
      </div>
    </div>
  );
}
