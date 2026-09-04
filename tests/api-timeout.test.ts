import { describe, it, expect, vi, afterEach } from "vitest";
import {
  fetchWithTimeout,
  UpstreamTimeoutError,
  hostOf,
  FETCH_TIMEOUTS_MS,
} from "@/lib/fetch-timeout";

afterEach(() => {
  vi.unstubAllGlobals();
});

function pendingFetch(signalCapture: { signal: AbortSignal | null }): Promise<Response> {
  return new Promise((_resolve, reject) => {
    // Capture the signal; the test below drives abort via real timers.
    // The promise only settles when the helper aborts it.
    const poll = setInterval(() => {
      const sig = signalCapture.signal;
      if (sig?.aborted) {
        clearInterval(poll);
        reject(Object.assign(new Error("aborted"), { name: "AbortError" }));
      }
    }, 1);
  });
}

describe("fetchWithTimeout", () => {
  it("rejects with UpstreamTimeoutError when the upstream hangs", async () => {
    const capture: { signal: AbortSignal | null } = { signal: null };
    vi.stubGlobal(
      "fetch",
      vi.fn((_url: string, init?: RequestInit) => {
        capture.signal = init?.signal ?? null;
        return pendingFetch(capture);
      }),
    );
    await expect(fetchWithTimeout("https://example.com/slow", {}, 25)).rejects.toBeInstanceOf(
      UpstreamTimeoutError,
    );
    expect(capture.signal?.aborted).toBe(true);
  });

  it("timeout error carries budget + host, never body content", async () => {
    const capture: { signal: AbortSignal | null } = { signal: null };
    vi.stubGlobal(
      "fetch",
      vi.fn((_url: string, init?: RequestInit) => {
        capture.signal = init?.signal ?? null;
        return pendingFetch(capture);
      }),
    );
    const err = await fetchWithTimeout("https://graphql.anilist.co", {}, 25).catch((e) => e);
    expect(err).toBeInstanceOf(UpstreamTimeoutError);
    expect((err as UpstreamTimeoutError).timeoutMs).toBe(25);
    expect((err as UpstreamTimeoutError).host).toBe("graphql.anilist.co");
    expect((err as Error).message).not.toContain("secret");
  });

  it("passes through successful responses untouched", async () => {
    const res = new Response(JSON.stringify({ ok: true }), { status: 200 });
    vi.stubGlobal("fetch", vi.fn(async () => res));
    const out = await fetchWithTimeout("https://example.com/fast", {}, 1000);
    expect(out.status).toBe(200);
    expect(await out.json()).toEqual({ ok: true });
  });

  it("passes through non-timeout network errors unwrapped", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        throw new TypeError("network down");
      }),
    );
    await expect(fetchWithTimeout("https://example.com/x", {}, 1000)).rejects.toThrow(
      "network down",
    );
  });

  it("centralized budgets sit inside the audit guidance bands", () => {
    expect(FETCH_TIMEOUTS_MS.anilist).toBeGreaterThanOrEqual(8000);
    expect(FETCH_TIMEOUTS_MS.anilist).toBeLessThanOrEqual(10000);
    expect(FETCH_TIMEOUTS_MS.youtubeTimedtext).toBeGreaterThanOrEqual(10000);
    expect(FETCH_TIMEOUTS_MS.youtubeTimedtext).toBeLessThanOrEqual(15000);
    expect(FETCH_TIMEOUTS_MS.youtubeWatch).toBeGreaterThanOrEqual(10000);
    expect(FETCH_TIMEOUTS_MS.youtubeWatch).toBeLessThanOrEqual(15000);
  });
});

describe("hostOf", () => {
  it("extracts host, falls back to unknown", () => {
    expect(hostOf("https://www.youtube.com/watch?v=abc12345")).toBe("www.youtube.com");
    expect(hostOf("not a url")).toBe("unknown");
  });
});
