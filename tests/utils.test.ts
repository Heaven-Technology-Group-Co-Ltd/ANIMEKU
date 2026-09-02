import { describe, it, expect } from "vitest";
import { cn, formatViews, slugify } from "@/lib/utils";

describe("formatViews", () => {
  it("formats millions with 1 decimal", () => {
    expect(formatViews(1_000_000)).toBe("1.0M");
    expect(formatViews(2_339_350)).toBe("2.3M");
    expect(formatViews(1_500_000)).toBe("1.5M");
    expect(formatViews(10_000_000)).toBe("10.0M");
  });

  it("formats thousands with 1 decimal", () => {
    expect(formatViews(1_000)).toBe("1.0K");
    expect(formatViews(1_500)).toBe("1.5K");
    expect(formatViews(999_999)).toBe("1000.0K"); // boundary: just under 1M
    expect(formatViews(15_000)).toBe("15.0K");
  });

  it("returns raw number string for < 1000", () => {
    expect(formatViews(0)).toBe("0");
    expect(formatViews(999)).toBe("999");
    expect(formatViews(42)).toBe("42");
  });

  it("handles 0 and small numbers", () => {
    expect(formatViews(0)).toBe("0");
    expect(formatViews(1)).toBe("1");
  });
});

describe("slugify", () => {
  it("lowercases and hyphenates", () => {
    expect(slugify("Hello World")).toBe("hello-world");
    expect(slugify("Attack on Titan")).toBe("attack-on-titan");
  });

  it("keeps Thai characters (\\u0E00-\\u0E7F) as valid slug chars", () => {
    expect(slugify("แอคชั่น")).toBe("แอคชั่น");
    expect(slugify("แอคชั่น ผจญภัย")).toBe("แอคชั่น-ผจญภัย");
  });

  it("replaces non-alphanumeric with single hyphen", () => {
    expect(slugify("hello___world!!")).toBe("hello-world");
    expect(slugify("a  b   c")).toBe("a-b-c");
    expect(slugify("foo@bar#baz")).toBe("foo-bar-baz");
  });

  it("trims leading/trailing hyphens", () => {
    expect(slugify("-hello-")).toBe("hello");
    expect(slugify("  hello  ")).toBe("hello");
    expect(slugify("---hello---world---")).toBe("hello-world");
  });

  it("handles empty and special-only strings", () => {
    expect(slugify("")).toBe("");
    expect(slugify("---")).toBe("");
    expect(slugify("!!!")).toBe("");
  });

  it("preserves numbers", () => {
    expect(slugify("Season 2")).toBe("season-2");
    expect(slugify("86 - Eighty Six")).toBe("86-eighty-six");
  });
});

describe("cn (clsx + tailwind-merge)", () => {
  it("merges class strings", () => {
    expect(cn("px-2", "py-1")).toBe("px-2 py-1");
  });

  it("handles conditional classes", () => {
    expect(cn("base", false && "hidden", "visible")).toContain("visible");
    expect(cn("base", false && "hidden")).not.toContain("hidden");
  });

  it("deduplicates tailwind conflicts via twMerge (last wins)", () => {
    // tailwind-merge should keep last px value
    expect(cn("px-2 px-4")).toBe("px-4");
    expect(cn("text-red-500 text-blue-500")).toBe("text-blue-500");
  });

  it("handles empty inputs", () => {
    expect(cn()).toBe("");
    expect(cn("")).toBe("");
  });

  it("handles object and array inputs via clsx", () => {
    expect(cn({ "font-bold": true, hidden: false })).toBe("font-bold");
    expect(cn(["px-2", "py-1"])).toBe("px-2 py-1");
  });
});
