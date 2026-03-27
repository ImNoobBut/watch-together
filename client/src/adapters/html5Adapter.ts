import { createEmitCooldown } from "./emitCooldown";
import type { CreateAdapterOptions, VideoAdapter } from "./types";
import { withTimeout } from "./withTimeout";

const HAVE_CURRENT_DATA = 2;

export async function createHtml5Adapter(
  opts: CreateAdapterOptions
): Promise<VideoAdapter> {
  let suppress = false;
  const emitCooldown = createEmitCooldown(350);
  let media: HTMLVideoElement | null = null;

  return {
    provider: "html5",

    setSuppressEmit(value: boolean) {
      suppress = value;
    },

    mount(container: HTMLElement) {
      container.innerHTML = "";
      const el = document.createElement("video");
      el.controls = true;
      el.playsInline = true;
      el.style.width = "100%";
      el.style.height = "100%";
      el.src = opts.source;
      // Do not set crossOrigin: "anonymous" here — many CDNs serve video without
      // Access-Control-Allow-Origin, which breaks decode and yields a black player.
      el.preload = "auto";

      const onPlay = () => {
        if (suppress || emitCooldown.isActive() || !media) return;
        opts.onUserEvent({ type: "play", time: media.currentTime });
      };
      const onPause = () => {
        if (suppress || emitCooldown.isActive() || !media) return;
        opts.onUserEvent({ type: "pause", time: media.currentTime });
      };
      const onSeeked = () => {
        if (suppress || emitCooldown.isActive() || !media) return;
        opts.onUserEvent({ type: "seek", time: media.currentTime });
      };

      el.addEventListener("play", onPlay);
      el.addEventListener("pause", onPause);
      el.addEventListener("seeked", onSeeked);

      media = el;
      container.appendChild(el);
    },

    async waitUntilReady() {
      const el = media;
      if (!el) {
        throw new Error("No media element.");
      }

      const onLaterError = () => {
        opts.onMediaError?.(
          "Playback error. The media may have stopped or the network failed.",
        );
      };

      if (el.readyState >= HAVE_CURRENT_DATA) {
        el.addEventListener("error", onLaterError, { passive: true });
        return;
      }

      const loadPromise = new Promise<void>((resolve, reject) => {
        const onLoaded = () => {
          el.removeEventListener("error", onErr);
          resolve();
        };
        const onErr = () => {
          el.removeEventListener("loadeddata", onLoaded);
          opts.onMediaError?.(
            "This media could not be played. Try another URL or format.",
          );
          reject(new Error("Media failed to load."));
        };
        el.addEventListener("loadeddata", onLoaded, { once: true });
        el.addEventListener("error", onErr, { once: true });
      });

      await withTimeout(
        loadPromise,
        45_000,
        "Media did not load in time. Check the URL and your connection.",
      );
      el.addEventListener("error", onLaterError, { passive: true });
    },

    destroy() {
      media?.pause();
      media?.remove();
      media = null;
    },

    async applySeek(time: number) {
      if (!media) return;
      media.currentTime = time;
      emitCooldown.bump();
    },

    async applyPlay(time: number) {
      if (!media) return;
      media.currentTime = time;
      await media.play().catch((e: unknown) => {
        const detail = e instanceof Error ? e.message : String(e);
        opts.onPlaybackError?.(
          `Playback could not start (${detail}). Try pressing play on the controls.`,
        );
      });
      emitCooldown.bump();
    },

    async applyPause(time: number) {
      if (!media) return;
      media.currentTime = time;
      media.pause();
      emitCooldown.bump();
    },
  };
}
