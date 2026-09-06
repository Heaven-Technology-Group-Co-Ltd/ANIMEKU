// P3.2 — Shared YouTube IFrame API loader (single source of truth).
//
// Extracted verbatim from TrailerPlayer's singleton so the player and the
// admin subs tooling share one loader: one <script> tag, one promise, no
// duplicated loader logic, no clobbered onYouTubeIframeAPIReady handlers.
// Behavior preserved: SSR guard, YT-ready fast path, existing-script wait
// path (chains prev handler), fresh-insert path (chains prev handler).

// Singleton promise for YT IFrame API — prevents duplicate script tags
let ytApiPromise: Promise<void> | null = null;

export function loadYouTubeAPI(): Promise<void> {
  if (typeof window === "undefined") return Promise.resolve();
  if (window.YT && window.YT.Player) return Promise.resolve();
  if (ytApiPromise) return ytApiPromise;

  const existingScript = document.querySelector('script[src="https://www.youtube.com/iframe_api"]');
  if (existingScript) {
    // Script already inserted by another instance — wait for ready
    ytApiPromise = new Promise((res) => {
      const prev = window.onYouTubeIframeAPIReady;
      window.onYouTubeIframeAPIReady = () => {
        prev?.();
        res();
      };
      // If YT already ready after script load, resolve immediately
      if (window.YT?.Player) res();
    });
    return ytApiPromise;
  }

  ytApiPromise = new Promise((res) => {
    const tag = document.createElement("script");
    tag.src = "https://www.youtube.com/iframe_api";
    document.head.appendChild(tag);
    const prev = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      prev?.();
      res();
    };
  });
  return ytApiPromise;
}

/** Test-only: clears the singleton so loader tests stay isolated. */
export function resetYoutubeLoaderForTests(): void {
  ytApiPromise = null;
}
