/** Optional JSON array of RTCIceServer (e.g. Coturn). See README. */
export function getIceServers(): RTCIceServer[] {
  const raw = import.meta.env.VITE_WEBRTC_ICE_SERVERS;
  if (typeof raw === "string" && raw.trim()) {
    try {
      const parsed = JSON.parse(raw) as unknown;
      if (Array.isArray(parsed)) return parsed as RTCIceServer[];
    } catch {
      /* use default */
    }
  }
  return [{ urls: "stun:stun.l.google.com:19302" }];
}
