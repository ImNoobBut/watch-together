/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SOCKET_URL: string;
  /** JSON array of RTCIceServer for WebRTC screen share (optional TURN). */
  readonly VITE_WEBRTC_ICE_SERVERS?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
