import { describe, it, expect } from "vitest";
import { getActiveCue, getCustomSubs, customSubs, type Cue } from "@/lib/customSubs";

describe("getCustomSubs", () => {
  it("returns cues for known videoId", () => {
    const cues = getCustomSubs("EIVVnLlhzr0");
    expect(cues).not.toBeNull();
    expect(cues!.length).toBeGreaterThan(0);
  });

  it("trims whitespace around videoId", () => {
    expect(getCustomSubs("  EIVVnLlhzr0  ")).not.toBeNull();
  });

  it("returns null for unknown videoId", () => {
    expect(getCustomSubs("unknown123")).toBeNull();
    expect(getCustomSubs("")).toBeNull();
  });

  it("video Gp-H_YOcYTM has cues starting at 16s", () => {
    const cues = getCustomSubs("Gp-H_YOcYTM")!;
    expect(cues[0].start).toBe(16.0);
  });
});

describe("getActiveCue", () => {
  const cues: Cue[] = [
    { start: 0, end: 3, text: "first" },
    { start: 3, end: 6, text: "second" },
    { start: 6, end: 10, text: "third" },
  ];

  it("returns correct cue at start boundary (inclusive)", () => {
    expect(getActiveCue(cues, 0)).toBe("first");
    expect(getActiveCue(cues, 3)).toBe("second");
    expect(getActiveCue(cues, 6)).toBe("third");
  });

  it("returns null at end boundary (exclusive)", () => {
    expect(getActiveCue(cues, 3 - 1e-9)).toBe("first");
    // t == end is exclusive, so at exactly 3, first cue no longer active
    expect(getActiveCue(cues, 3)).not.toBe("first");
    expect(getActiveCue(cues, 10)).toBeNull();
  });

  it("returns null before first cue and after last cue", () => {
    expect(getActiveCue(cues, -1)).toBeNull();
    expect(getActiveCue(cues, 11)).toBeNull();
  });

  it("returns null for empty cues", () => {
    expect(getActiveCue([], 5)).toBeNull();
  });

  it("handles delaySec correctly", () => {
    // delaySec shifts effective time backwards: t = current - delay
    // cues[0] is 0-3, so with delay 1, current=1 => t=0 => first
    expect(getActiveCue(cues, 1, 1)).toBe("first");
    // current=4, delay=1 => t=3 => second
    expect(getActiveCue(cues, 4, 1)).toBe("second");
    // current=0, delay=1 => t=-1 => null
    expect(getActiveCue(cues, 0, 1)).toBeNull();
  });

  it("uses first matching cue when overlapping (find semantics)", () => {
    const overlapping: Cue[] = [
      { start: 0, end: 5, text: "a" },
      { start: 2, end: 4, text: "b" },
    ];
    expect(getActiveCue(overlapping, 3)).toBe("a"); // first match wins
  });

  it("handles real customSubs timing boundaries", () => {
    const real = customSubs["EIVVnLlhzr0"];
    // 0 inclusive, 3 exclusive
    expect(getActiveCue(real, 0)).toBe(real[0].text);
    expect(getActiveCue(real, 2.9)).toBe(real[0].text);
    expect(getActiveCue(real, 3)).toBe(real[1].text);
    expect(getActiveCue(real, 22)).toBeNull(); // after last end 22
  });

  it("handles fractional seconds from k4xGqY5IDBE", () => {
    const real = customSubs["k4xGqY5IDBE"];
    expect(getActiveCue(real, 2.4)).toBe(real[0].text);
    expect(getActiveCue(real, 5.23)).toBe(real[1].text); // inclusive start of second cue
    expect(getActiveCue(real, 5.229)).toBe(real[0].text); // just before boundary
  });
});
