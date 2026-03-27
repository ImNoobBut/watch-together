import Player from "@vimeo/player";
import { createEmitCooldown } from "./emitCooldown";
import type { CreateAdapterOptions, VideoAdapter } from "./types";
import { withTimeout } from "./withTimeout";

export async function createVimeoAdapter(
  opts: CreateAdapterOptions
): Promise<VideoAdapter> {
  let suppress = false;
  const emitCooldown = createEmitCooldown(350);
  let player: Player | null = null;

  return {
    provider: "vimeo",

    setSuppressEmit(value: boolean) {
      suppress = value;
    },

    mount(container: HTMLElement) {
      container.innerHTML = "";
      const div = document.createElement("div");
      div.style.width = "100%";
      div.style.height = "100%";
      div.style.opacity = "1";
      div.style.pointerEvents = "auto";
      container.appendChild(div);

      const id = Number(opts.source);
      if (!Number.isFinite(id)) throw new Error("Invalid Vimeo id");

      player = new Player(div, { id });

      player.on("play", async () => {
        if (suppress || emitCooldown.isActive() || !player) return;
        const time = await player.getCurrentTime();
        opts.onUserEvent({ type: "play", time });
      });
      player.on("pause", async () => {
        if (suppress || emitCooldown.isActive() || !player) return;
        const time = await player.getCurrentTime();
        opts.onUserEvent({ type: "pause", time });
      });
      player.on("seeked", async () => {
        if (suppress || emitCooldown.isActive() || !player) return;
        const time = await player.getCurrentTime();
        opts.onUserEvent({ type: "seek", time });
      });
    },

    async waitUntilReady() {
      if (!player) throw new Error("No Vimeo player.");
      await withTimeout(
        player.ready(),
        30_000,
        "Vimeo player did not load in time.",
      );
    },

    destroy() {
      if (player) {
        void player.destroy().catch(() => {});
      }
      player = null;
    },

    async applySeek(time: number) {
      if (!player) return;
      await player.setCurrentTime(time);
      emitCooldown.bump();
    },

    async applyPlay(time: number) {
      if (!player) return;
      await player.setCurrentTime(time);
      await player.play().catch((e: unknown) => {
        const detail = e instanceof Error ? e.message : String(e);
        opts.onPlaybackError?.(
          `Playback could not start (${detail}). Try pressing play on the controls.`,
        );
      });
      emitCooldown.bump();
    },

    async applyPause(time: number) {
      if (!player) return;
      await player.setCurrentTime(time);
      await player.pause().catch(() => {});
      emitCooldown.bump();
    },
  };
}
