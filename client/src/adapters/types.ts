import type { VideoProvider } from "../resolveVideoUrl";

export type UserVideoEvent =
  | { type: "load"; provider: VideoProvider; source: string }
  | { type: "play"; time: number }
  | { type: "pause"; time: number }
  | { type: "seek"; time: number };

export interface VideoAdapter {
  readonly provider: VideoProvider;
  mount(container: HTMLElement): void;
  /** Resolve when the player can accept initial sync; reject on load/timeout/abort. */
  waitUntilReady(): Promise<void>;
  destroy(): void;
  setSuppressEmit(value: boolean): void;
  applyPlay(time: number): Promise<void>;
  applyPause(time: number): Promise<void>;
  applySeek(time: number): Promise<void>;
}

export type CreateAdapterOptions = {
  source: string;
  onUserEvent: (e: UserVideoEvent) => void;
  /** HTML5 only: decode/network failure */
  onMediaError?: (message: string) => void;
  /** HTML5 / Vimeo: play() blocked or failed (e.g. autoplay policy) */
  onPlaybackError?: (message: string) => void;
};

export type AdapterFactory = (
  opts: CreateAdapterOptions
) => Promise<VideoAdapter>;
