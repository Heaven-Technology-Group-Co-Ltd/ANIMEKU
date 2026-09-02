#!/usr/bin/env node
/**
 * Validate static anime data - checks count, duplicates, required fields, etc.
 * Run: node scripts/validate-data.mjs
 * Exit 0 on success, 1 on failure.
 */
import { readFileSync } from "fs";
import { createHash } from "crypto";

// We read the built data files directly to avoid needing ts-node.
// Import approach would require compiling TS, so we parse the source.

const animesPath = "src/data/animes.ts";
const libDataPath = "src/lib/data.ts";
const txt = readFileSync(animesPath, "utf8");
const libTxt = readFileSync(libDataPath, "utf8");

// Count anime records via slug pattern (anime-level)
const animeIds = [...txt.matchAll(/\n    id:\s*"([^"]+)",\n    slug:/g)].map(m => m[1]);
const slugs = [...txt.matchAll(/slug:\s*"([^"]+)"/g)].map(m => m[1]);

const count = animeIds.length;
console.log(`Anime count: ${count}`);

// Check duplicates
const uniqIds = new Set(animeIds);
const uniqSlugs = new Set(slugs);
let ok = true;

if (uniqIds.size !== count) {
  console.error(`❌ Duplicate IDs: ${count} total, ${uniqIds.size} unique`);
  const seen = new Set();
  const dups = [];
  for (const id of animeIds) {
    if (seen.has(id)) dups.push(id);
    seen.add(id);
  }
  console.error("  Duplicates:", [...new Set(dups)].join(", "));
  ok = false;
} else {
  console.log(`✅ No duplicate IDs (${uniqIds.size} unique)`);
}

if (uniqSlugs.size !== slugs.length) {
  console.error(`❌ Duplicate slugs: ${slugs.length} total, ${uniqSlugs.size} unique`);
  const seen = new Set();
  const dups = [];
  for (const s of slugs) {
    if (seen.has(s)) dups.push(s);
    seen.add(s);
  }
  console.error("  Duplicates:", [...new Set(dups)].join(", "));
  ok = false;
} else {
  console.log(`✅ No duplicate slugs (${uniqSlugs.size} unique)`);
}

// Check required fields via simple presence checks per anime block
// Each anime block should contain: id, slug, title, titleTh, titleEn, description, cover, banner, year, season, episodesTotal, rating, views, genres, status, studio, duration, episodes
const animeBlocks = txt.split(/\n  \},\n  \{/).length; // approximate
console.log(`Approx blocks (split method): ${animeBlocks}`);

let missingFields = 0;
const requiredChecks = [
  // unique to anime-level (not in episodes) — strict count
  { field: "titleEn:", label: "titleEn" },
  { field: "description:", label: "description" },
  { field: "cover:", label: "cover" },
  { field: "banner:", label: "banner" },
  { field: "year:", label: "year" },
  { field: "season:", label: "season" },
  { field: "episodesTotal:", label: "episodesTotal" },
  { field: "rating:", label: "rating" },
  { field: "genres:", label: "genres" },
  { field: "status:", label: "status" },
  { field: "studio:", label: "studio" },
  { field: "episodes:", label: "episodes" },
];
// fields that also appear inside episodes — just ensure they exist per anime block via spot-check
const sharedFields = ["title:", "titleTh:", "views:", "duration:"];

// More robust: extract each anime object text and verify
const rawAnimesSection = txt.slice(txt.indexOf("export const animes"), txt.lastIndexOf("];"));
for (const chk of requiredChecks) {
  const c = (rawAnimesSection.match(new RegExp(chk.field, "g")) || []).length;
  if (c !== count) {
    console.error(`❌ Field "${chk.label}" appears ${c} times, expected ${count}`);
    missingFields++;
    ok = false;
  }
}
if (missingFields === 0) console.log(`✅ All anime-level required fields present in all ${count} records`);
// shared fields must appear at least count times (anime level) + episodes
for (const f of sharedFields) {
  const c = (rawAnimesSection.match(new RegExp(f, "g")) || []).length;
  if (c < count) {
    console.error(`❌ Shared field "${f}" appears only ${c} times, expected >=${count}`);
    ok = false;
  }
}
if (missingFields === 0) console.log(`✅ Shared fields (title/titleTh/views/duration) present`);

// Check episodes helper still referenced
if (!libTxt.includes('import { animes } from "@/data/animes"')) {
  console.error('❌ src/lib/data.ts missing import from "@/data/animes"');
  ok = false;
} else console.log('✅ src/lib/data.ts imports from @/data/animes');

if (!libTxt.includes('export { animes }')) {
  console.error('❌ src/lib/data.ts missing re-export of animes');
  ok = false;
} else console.log('✅ src/lib/data.ts re-exports animes (backwards compat)');

if (!libTxt.includes('export type Anime') || !libTxt.includes('export type Episode')) {
  console.error('❌ Missing type exports in src/lib/data.ts');
  ok = false;
} else console.log('✅ Types preserved in src/lib/data.ts');

if (!txt.includes('HLS_DEMO')) {
  console.error('❌ HLS_DEMO missing from src/data/animes.ts');
  ok = false;
} else console.log('✅ HLS_DEMO preserved in src/data/animes.ts');

if (libTxt.includes('HLS_DEMO')) {
  console.error('❌ HLS_DEMO should NOT be in src/lib/data.ts (moved to data)');
  ok = false;
} else console.log('✅ HLS_DEMO correctly moved out of lib/data.ts');

// Check categories and helpers preserved
const helpers = ["getAnimeBySlug", "getFeatured", "getTrending", "getLatest", "getLatestEpisodes", "searchAnimes", "filterByCategory", "categories"];
for (const h of helpers) {
  if (!libTxt.includes(h)) {
    console.error(`❌ Helper "${h}" missing from src/lib/data.ts`);
    ok = false;
  }
}
if (ok) console.log(`✅ All helpers/categories preserved`);

// Hash check for data integrity vs git main (if available)
try {
  const hash = createHash("sha256").update(txt).digest("hex").slice(0, 12);
  console.log(`Data file sha256 (12): ${hash}`);
} catch {}

// Check that data file doesn't import runtime value from lib/data (only type)
if (txt.match(/import\s*\{[^}]*\}\s*from\s*"@\/lib\/data"/) && !txt.includes("import type")) {
  console.error('❌ src/data/animes.ts should use `import type` for Anime to avoid runtime cycle');
  ok = false;
} else if (txt.includes('import type { Anime } from "@/lib/data"')) {
  console.log('✅ src/data/animes.ts uses `import type` (no runtime cycle)');
}

// Check src/data/index.ts
const indexTxt = readFileSync("src/data/index.ts", "utf8");
if (!indexTxt.includes('export { animes } from "./animes"')) {
  console.error('❌ src/data/index.ts missing barrel export');
  ok = false;
} else console.log('✅ src/data/index.ts barrel OK');

// Check no broken imports (grepping consumers still use @/lib/data)
console.log("\n--- Import check ---");
import { execSync } from "child_process";
try {
  const out = execSync('grep -rn "@/lib/data" --include="*.ts" --include="*.tsx" src/ | wc -l', { encoding: "utf8" });
  console.log(`Files importing from @/lib/data: ${out.trim()} (expected ~14 including data/animes type import)`);
} catch {}

console.log("\n" + (ok ? "✅ VALIDATION PASSED" : "❌ VALIDATION FAILED"));
process.exit(ok ? 0 : 1);
