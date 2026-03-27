import type { CreateAdapterOptions, VideoAdapter } from "./types";
import { withTimeout } from "./withTimeout";

export async function createIframeAdapter(
  opts: CreateAdapterOptions
): Promise<VideoAdapter> {
  let iframeEl: HTMLIFrameElement | null = null;

  return {
    provider: "iframe",

    setSuppressEmit() {},

    mount(container: HTMLElement) {
      container.innerHTML = "";
      const iframe = document.createElement("iframe");
      iframe.src = opts.source;
      iframe.style.width = "100%";
      iframe.style.height = "100%";
      iframe.style.opacity = "1";
      iframe.style.pointerEvents = "auto";
      iframe.style.border = "0";
      iframe.allowFullscreen = true;
      iframe.setAttribute(
        "allow",
        "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
      );
      container.appendChild(iframe);
      iframeEl = iframe;
    },

    async waitUntilReady() {
      const iframe = iframeEl;
      if (!iframe) throw new Error("No iframe.");
      const loadPromise = new Promise<void>((resolve, reject) => {
        iframe.addEventListener("load", () => resolve(), { once: true });
        iframe.addEventListener(
          "error",
          () => {
            reject(new Error("The embed could not be loaded."));
          },
          { once: true },
        );
      });
      await withTimeout(
        loadPromise,
        20_000,
        "Embed did not load in time. It may be blocked or the page may not allow embedding.",
      );
    },

    destroy() {
      iframeEl = null;
    },

    async applySeek() {},
    async applyPlay() {},
    async applyPause() {},
  };
}
