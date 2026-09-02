import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// Lightweight health endpoint — no external network calls, no secrets.
export function GET() {
  const version =
    process.env.APP_VERSION ||
    process.env.NEXT_PUBLIC_APP_VERSION ||
    process.env.GIT_COMMIT_SHA?.slice(0, 7) ||
    process.env.GITHUB_SHA?.slice(0, 7) ||
    "0.1.0";

  const commit =
    process.env.GIT_COMMIT_SHA?.slice(0, 7) ||
    process.env.GITHUB_SHA?.slice(0, 7) ||
    undefined;

  const body: Record<string, string> = {
    status: "ok",
    service: "ANIMEKU",
    timestamp: new Date().toISOString(),
    version,
  };

  if (commit && commit !== version) {
    body.commit = commit;
  }

  return NextResponse.json(body, {
    status: 200,
    headers: {
      "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
    },
  });
}
