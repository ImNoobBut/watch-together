/** Max length for video source strings (URLs, ids, embed params). */
export const MAX_VIDEO_SOURCE_LEN = 4096;

/**
 * Validates `source` for a `load_video` payload after `isValidProvider(provider)`.
 * @param {string} provider
 * @param {string} source
 * @returns {boolean}
 */
export function isValidLoadVideoSource(provider, source) {
  if (typeof source !== "string" || source.length === 0) {
    return false;
  }
  if (source.length > MAX_VIDEO_SOURCE_LEN) {
    return false;
  }

  switch (provider) {
    case "youtube":
      return /^[\w-]{11}$/.test(source);
    case "vimeo":
      return /^\d{6,}$/.test(source);
    case "html5": {
      try {
        const u = new URL(source);
        return u.protocol === "https:" || u.protocol === "http:";
      } catch {
        return false;
      }
    }
    case "iframe": {
      try {
        const u = new URL(source);
        return u.protocol === "https:" || u.protocol === "http:";
      } catch {
        return false;
      }
    }
    case "screenshare":
      return source === "stream";
    default:
      return false;
  }
}
