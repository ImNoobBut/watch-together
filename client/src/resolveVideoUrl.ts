export type VideoProvider =
  | "youtube"
  | "vimeo"
  | "html5"
  | "iframe"
  | "screenshare";

export type ResolveResult =
  | { ok: true; provider: VideoProvider; source: string }
  | { ok: false; reason: string };

function tryParseUrl(raw: string): URL | null {
  const t = raw.trim();
  if (!t) return null;

  if (typeof URL !== "undefined" && typeof URL.canParse === "function") {
    if (!URL.canParse(t) && !URL.canParse(`https://${t}`)) {
      return null;
    }
  }

  try {
    return new URL(t);
  } catch {
    try {
      return new URL(`https://${t}`);
    } catch {
      return null;
    }
  }
}

/** youtube.com, m.youtube.com, music.youtube.com, youtube-nocookie.com, etc. */
function isYouTubeWebHost(host: string): boolean {
  return (
    host.endsWith("youtube.com") || host.endsWith("youtube-nocookie.com")
  );
}

function extractYouTubeId(url: URL): string | null {
  const host = url.hostname.replace(/^www\./, "").toLowerCase();

  if (host === "youtu.be") {
    const id = url.pathname.split("/").filter(Boolean)[0];
    return id && /^[\w-]{11}$/.test(id) ? id : null;
  }

  if (!isYouTubeWebHost(host)) return null;

  if (url.pathname.startsWith("/shorts/")) {
    const id = url.pathname.split("/")[2];
    return id && /^[\w-]{11}$/.test(id) ? id : null;
  }

  if (url.pathname.startsWith("/live/")) {
    const id = url.pathname.split("/")[2];
    return id && /^[\w-]{11}$/.test(id) ? id : null;
  }

  const v = url.searchParams.get("v");
  if (v && /^[\w-]{11}$/.test(v)) return v;

  const embed = url.pathname.match(/^\/embed\/([\w-]{11})/);
  if (embed) return embed[1];

  return null;
}

function extractVimeoId(url: URL): string | null {
  const host = url.hostname.replace(/^www\./, "");
  if (!host.endsWith("vimeo.com")) return null;
  const m = url.pathname.match(/\/(\d{6,})(?:\/|$)/);
  if (m) return m[1];
  return null;
}

/** Instagram reel/post/TV pages block raw iframes; /embed/ is the supported player URL. */
function instagramEmbedSource(url: URL): string | null {
  const host = url.hostname.replace(/^www\./, "").toLowerCase();
  if (host !== "instagram.com" && host !== "instagr.am") return null;
  const m = url.pathname.match(/^\/(p|reel|tv)\/([^/?#]+)\/?$/);
  if (!m) return null;
  const [, kind, code] = m;
  if (!code) return null;
  return `https://www.instagram.com/${kind}/${code}/embed/`;
}

/**
 * Facebook video/reel/watch permalinks often work via the official Video Player plugin.
 * Short links (fb.watch) and some pages still may not embed — use screen share instead.
 */
function facebookPluginEmbedSource(url: URL): string | null {
  const host = url.hostname.replace(/^www\./, "").toLowerCase();
  if (!host.endsWith("facebook.com")) return null;
  if (url.pathname.startsWith("/plugins/video.php")) return null;

  const path = url.pathname;
  const looksLikeVideo =
    /\/videos\/\d/.test(path) ||
    /\/reel\//i.test(path) ||
    path.toLowerCase().startsWith("/watch") ||
    url.searchParams.has("v") ||
    path.includes("/video.php");

  if (!looksLikeVideo) return null;

  const canonical = new URL(url.href);
  canonical.protocol = "https:";
  canonical.hostname = "www.facebook.com";
  const href = encodeURIComponent(canonical.href);
  return `https://www.facebook.com/plugins/video.php?href=${href}&show_text=false&width=560`;
}

const DIRECT_EXT = /\.(mp4|webm|ogg)(\?.*)?$/i;

function looksLikeDirectMediaUrl(url: URL): boolean {
  const pathOrHref = `${url.pathname}${url.search}`;
  if (DIRECT_EXT.test(url.pathname) || DIRECT_EXT.test(url.href)) return true;
  return DIRECT_EXT.test(pathOrHref);
}

export function resolveVideoUrl(input: string): ResolveResult {
  const trimmed = input.trim();
  if (!trimmed) return { ok: false, reason: "Empty URL" };

  const url = tryParseUrl(trimmed);
  if (!url) return { ok: false, reason: "Invalid URL" };

  const yt = extractYouTubeId(url);
  if (yt) return { ok: true, provider: "youtube", source: yt };

  const vm = extractVimeoId(url);
  if (vm) return { ok: true, provider: "vimeo", source: vm };

  const ig = instagramEmbedSource(url);
  if (ig) return { ok: true, provider: "iframe", source: ig };

  const fb = facebookPluginEmbedSource(url);
  if (fb) return { ok: true, provider: "iframe", source: fb };

  if (looksLikeDirectMediaUrl(url)) {
    return { ok: true, provider: "html5", source: url.href };
  }

  const proto = url.protocol.toLowerCase();
  if (proto === "http:" || proto === "https:") {
    return {
      ok: false,
      reason:
        "Unsupported URL. Use YouTube, Vimeo, a direct .mp4/.webm/.ogg link, or upload a video file.",
    };
  }

  return { ok: false, reason: "Unsupported URL" };
}
