// Photos are stored with absolute URLs built from the server's PUBLIC_URL
// (e.g. http://192.168.1.50:4000/uploads/abc.jpg). On an HTTPS page those are
// blocked as mixed content, and they break when the app is opened through
// another host. Every image URL coming from the API goes through
// normalizeImageUrl: our own /uploads/<file> becomes a same-origin relative
// path; external posters (TMDB, RAWG, Open Library) are left alone.
export function normalizeImageUrl(raw: unknown): string | null {
  if (typeof raw !== 'string' || !raw.trim()) return null;
  const url = raw.trim();
  try {
    const u = new URL(url, window.location.origin);
    const m = u.pathname.match(/^\/uploads\/([^/]+)$/);
    if (m) return `/uploads/${m[1]}`;
    return u.href;
  } catch {
    return null;
  }
}

export function isOwnUpload(url: string | null): url is string {
  return !!url && url.startsWith('/uploads/');
}

// Server-side resized copy for grids and small previews; the original is
// only used for the hero and the lightbox. External URLs are used as-is.
export function thumbUrl(url: string | null, width: 200 | 400 | 800 = 400): string | null {
  if (!url) return null;
  if (!isOwnUpload(url)) return url;
  return `/api/thumb?path=${encodeURIComponent(url)}&w=${width}`;
}

export function thumbSrcSet(url: string | null): string | undefined {
  if (!isOwnUpload(url)) return undefined;
  return `${thumbUrl(url, 400)} 400w, ${thumbUrl(url, 800)} 800w`;
}
