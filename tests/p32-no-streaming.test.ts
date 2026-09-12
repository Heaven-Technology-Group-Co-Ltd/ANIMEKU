// @vitest-environment node
import { describe, it, expect } from "vitest";
import { existsSync } from "node:fs";
import { resolve } from "node:path";

// P3.2 — No product expansion: full-episode streaming components must not
// come back. Runs in node env (not jsdom) so node:fs is available — the
// jsdom suite cannot import node builtins (vite externalizes them).

describe("P3.2 no episode streaming", () => {
  it("does not reintroduce VideoPlayer.tsx or EpisodeList.tsx", () => {
    expect(
      existsSync(resolve(process.cwd(), "src/components/VideoPlayer.tsx"))
    ).toBe(false);
    expect(
      existsSync(resolve(process.cwd(), "src/components/EpisodeList.tsx"))
    ).toBe(false);
  });
});
