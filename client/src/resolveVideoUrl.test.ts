import { describe, expect, it } from "vitest";
import { resolveVideoUrl } from "./resolveVideoUrl";

describe("resolveVideoUrl", () => {
  it("resolves standard YouTube watch URLs", () => {
    const r = resolveVideoUrl("https://www.youtube.com/watch?v=dQw4w9WgXcQ");
    expect(r).toEqual({
      ok: true,
      provider: "youtube",
      source: "dQw4w9WgXcQ",
    });
  });

  it("resolves youtube-nocookie watch URLs", () => {
    const r = resolveVideoUrl(
      "https://www.youtube-nocookie.com/watch?v=dQw4w9WgXcQ",
    );
    expect(r).toEqual({
      ok: true,
      provider: "youtube",
      source: "dQw4w9WgXcQ",
    });
  });

  it("resolves YouTube /live/ URLs", () => {
    const r = resolveVideoUrl("https://www.youtube.com/live/jfKfPfyJRdk");
    expect(r).toEqual({
      ok: true,
      provider: "youtube",
      source: "jfKfPfyJRdk",
    });
  });

  it("resolves YouTube shorts", () => {
    const r = resolveVideoUrl(
      "https://www.youtube.com/shorts/abcdefghijk",
    );
    expect(r).toEqual({
      ok: true,
      provider: "youtube",
      source: "abcdefghijk",
    });
  });

  it("resolves youtu.be with query params", () => {
    const r = resolveVideoUrl(
      "https://youtu.be/dQw4w9WgXcQ?si=abc123",
    );
    expect(r).toEqual({
      ok: true,
      provider: "youtube",
      source: "dQw4w9WgXcQ",
    });
  });

  it("resolves YouTube embed URLs", () => {
    const r = resolveVideoUrl(
      "https://www.youtube.com/embed/dQw4w9WgXcQ",
    );
    expect(r).toEqual({
      ok: true,
      provider: "youtube",
      source: "dQw4w9WgXcQ",
    });
  });

  it("resolves Vimeo video and player URLs", () => {
    expect(resolveVideoUrl("https://vimeo.com/123456789")).toEqual({
      ok: true,
      provider: "vimeo",
      source: "123456789",
    });
    expect(
      resolveVideoUrl("https://player.vimeo.com/video/123456789"),
    ).toEqual({
      ok: true,
      provider: "vimeo",
      source: "123456789",
    });
  });

  it("resolves direct media URLs", () => {
    const r = resolveVideoUrl("https://example.com/media/clip.mp4");
    expect(r).toEqual({
      ok: true,
      provider: "html5",
      source: "https://example.com/media/clip.mp4",
    });
  });

  it("resolves scheme-less host as https", () => {
    const r = resolveVideoUrl("youtube.com/watch?v=dQw4w9WgXcQ");
    expect(r).toEqual({
      ok: true,
      provider: "youtube",
      source: "dQw4w9WgXcQ",
    });
  });

  it("rejects empty and invalid input", () => {
    expect(resolveVideoUrl("").ok).toBe(false);
    expect(resolveVideoUrl("   ").ok).toBe(false);
    expect(resolveVideoUrl("not a url").ok).toBe(false);
  });

  it("rejects unsupported https URLs", () => {
    const r = resolveVideoUrl("https://example.com/page");
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.reason).toContain("Unsupported URL");
    }
  });
});
