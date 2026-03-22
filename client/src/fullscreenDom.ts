/** Cross-browser fullscreen helpers (Safari webkit prefixes). */

export function getFullscreenElement(): Element | null {
  const d = document as Document & {
    webkitFullscreenElement?: Element | null;
  };
  return document.fullscreenElement ?? d.webkitFullscreenElement ?? null;
}

/**
 * Tries standard / webkit / legacy-MS fullscreen on `el`. Returns whether this
 * element is now the fullscreen element (mobile Safari often rejects divs).
 */
export async function tryEnterDomFullscreen(el: HTMLElement): Promise<boolean> {
  const anyEl = el as HTMLElement & {
    webkitRequestFullscreen?: () => Promise<void> | void;
    msRequestFullscreen?: () => void;
  };

  const tryCall = async (fn: () => void | Promise<void> | undefined) => {
    const ret = fn();
    if (ret && typeof (ret as Promise<void>).then === "function") {
      await (ret as Promise<void>);
    }
  };

  if (typeof el.requestFullscreen === "function") {
    try {
      await tryCall(() => el.requestFullscreen());
      if (getFullscreenElement() === el) return true;
    } catch {
      /* try webkit */
    }
  }

  if (typeof anyEl.webkitRequestFullscreen === "function") {
    try {
      await tryCall(() => anyEl.webkitRequestFullscreen!());
      if (getFullscreenElement() === el) return true;
    } catch {
      /* try ms */
    }
  }

  if (typeof anyEl.msRequestFullscreen === "function") {
    try {
      anyEl.msRequestFullscreen();
      if (getFullscreenElement() === el) return true;
    } catch {
      /* no-op */
    }
  }

  return false;
}

/** iOS Safari: fullscreen the first usable `<video>` inside the container. */
export function tryEnterIosNativeVideoFullscreen(
  container: HTMLElement,
): HTMLVideoElement | null {
  const list = container.querySelectorAll("video");
  for (const node of list) {
    if (!(node instanceof HTMLVideoElement)) continue;
    const wk = node as HTMLVideoElement & {
      webkitEnterFullscreen?: () => void;
    };
    if (typeof wk.webkitEnterFullscreen !== "function") continue;
    const hasMedia =
      node.srcObject != null ||
      !!node.src ||
      node.readyState >= HTMLMediaElement.HAVE_METADATA;
    if (hasMedia || list.length === 1) {
      try {
        wk.webkitEnterFullscreen();
        return node;
      } catch {
        continue;
      }
    }
  }
  return null;
}

export function enterFullscreen(el: HTMLElement): Promise<void> | undefined {
  const anyEl = el as HTMLElement & {
    webkitRequestFullscreen?: () => Promise<void>;
    msRequestFullscreen?: () => Promise<void>;
  };
  return (
    el.requestFullscreen?.() ??
    anyEl.webkitRequestFullscreen?.() ??
    anyEl.msRequestFullscreen?.()
  );
}

export function exitFullscreen(): Promise<void> | undefined {
  const d = document as Document & {
    webkitExitFullscreen?: () => Promise<void>;
    msExitFullscreen?: () => Promise<void>;
  };
  return (
    document.exitFullscreen?.() ??
    d.webkitExitFullscreen?.() ??
    d.msExitFullscreen?.()
  );
}
