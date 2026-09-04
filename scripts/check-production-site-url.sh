#!/bin/sh
# check-production-site-url.sh — POSIX fail-closed production site-URL gate.
#
# Purpose: validate NEXT_PUBLIC_SITE_URL for production deploys WITHOUT a
# host-installed Node.js binary (the VPS has none). Needs only /bin/sh, sed,
# and tr — present on the VPS, in CI, and on localhost.
#
# Modes (explicit, deterministic, fail-closed):
#   PRE_DOMAIN_DEPLOY=1 -> pre-domain mode: permits ONLY the single documented
#                          temporary URL "http://localhost:1234", so ANIMEKU can
#                          deploy before a real public domain exists.
#   anything else (unset, empty, "0", "true", "yes", ...) -> real production
#                          mode: any loopback/local hostname is rejected.
#
# Contract:
#   exit 0 — URL accepted for the active mode (always logs mode=... + OK line)
#   exit 1 — rejected (logs an ERROR line; never silently falls back to
#            localhost; arbitrary localhost/loopback URLs are never allowed)
#
# Inputs: env NEXT_PUBLIC_SITE_URL, env PRE_DOMAIN_DEPLOY (exact "1" only).
# Takes no args, uses no network, mutates nothing.
set -eu

RAW_URL="${NEXT_PUBLIC_SITE_URL:-}"
RAW_FLAG="${PRE_DOMAIN_DEPLOY:-}"

# POSIX trim of leading/trailing whitespace.
trim() {
  printf '%s' "$1" | sed -e 's/^[[:space:]]*//' -e 's/[[:space:]]*$//'
}

URL="$(trim "$RAW_URL")"
FLAG="$(trim "$RAW_FLAG")"

if [ "$FLAG" = "1" ]; then
  MODE="pre-domain"
else
  MODE="production"
fi

# The active mode is logged on every invocation — deploys must show this.
echo "site-url gate: mode=$MODE (PRE_DOMAIN_DEPLOY=${FLAG:-<unset>})."

fail() {
  echo "ERROR: $1" >&2
  exit 1
}

# 1) Required in BOTH modes — never silently fall back to localhost.
if [ -z "$URL" ]; then
  fail "NEXT_PUBLIC_SITE_URL is required in production — set it to your canonical origin (e.g. https://example.com), or use explicit pre-domain mode (PRE_DOMAIN_DEPLOY=1 with NEXT_PUBLIC_SITE_URL=http://localhost:1234)."
fi

# 2) Scheme must be http(s). WHATWG URL lowercases the scheme, so compare
#    case-insensitively; distinguish "not a URL" from "wrong protocol".
SCHEME_RAW="$(printf '%s' "$URL" | sed -e 's#://.*##')"
SCHEME="$(printf '%s' "$SCHEME_RAW" | tr '[:upper:]' '[:lower:]')"
case "$SCHEME" in
  http | https) ;;
  *)
    case "$URL" in
      *://*) fail "NEXT_PUBLIC_SITE_URL must use http(s), got \"$SCHEME_RAW:\" — expected absolute URL like https://example.com." ;;
      *) fail "NEXT_PUBLIC_SITE_URL is not a valid absolute URL: \"$URL\" — expected absolute URL like https://example.com." ;;
    esac
    ;;
esac

# 3) Split authority (host[:port], optional userinfo/IPv6 brackets).
REST="$(printf '%s' "$URL" | sed -e 's#^[^:]*://##')"
AUTH="$(printf '%s' "$REST" | sed -e 's#[/?#].*##')"
[ -n "$AUTH" ] || fail "NEXT_PUBLIC_SITE_URL is not a valid absolute URL: \"$URL\" — expected absolute URL like https://example.com."
HOSTPORT="${AUTH##*@}"
case "$HOSTPORT" in
  \[*\]*)
    HOST="${HOSTPORT#[}"
    HOST="${HOST%%]*}"
    ;;
  *)
    HOST="${HOSTPORT%%:*}"
    ;;
esac
[ -n "$HOST" ] || fail "NEXT_PUBLIC_SITE_URL is not a valid absolute URL: \"$URL\" — expected absolute URL like https://example.com."
HOST="$(printf '%s' "$HOST" | tr '[:upper:]' '[:lower:]')"
# Strip one FQDN trailing dot (example.com. == example.com).
HOST="${HOST%.}"

# 4) Loopback/local test — mirrors src/lib/env.ts (fail-closed superset:
#    any "127.*" prefix counts, covering WHATWG shorthands like "127.1").
is_loopback() {
  _h="$1"
  case "$_h" in
    localhost | 127.0.0.1 | 0.0.0.0 | ::1 | local) return 0 ;;
  esac
  case "$_h" in
    127.*) return 0 ;;
  esac
  case "$_h" in
    *.localhost | *.local) return 0 ;;
  esac
  case "$_h" in
    *127.0.0.1*) return 0 ;;
  esac
  return 1
}

# 5) Pre-domain allowlist: ONLY the exact temporary origin http://localhost:1234
#    (path/query tolerated — getSiteUrl() canonicalizes to origin anyway).
#    A real (non-loopback) origin passes in BOTH modes.
if [ "$MODE" = "pre-domain" ]; then
  ORIGIN="$SCHEME://$(printf '%s' "$HOSTPORT" | tr '[:upper:]' '[:lower:]')"
  if [ "$ORIGIN" = "http://localhost:1234" ]; then
    echo "OK: NEXT_PUBLIC_SITE_URL=\"$URL\" accepted as explicit pre-domain temporary URL (mode=pre-domain)."
    exit 0
  fi
fi

if is_loopback "$HOST"; then
  if [ "$MODE" = "pre-domain" ]; then
    fail "NEXT_PUBLIC_SITE_URL \"$URL\" is loopback/local (hostname \"$HOST\"); pre-domain mode (PRE_DOMAIN_DEPLOY=1) permits only the temporary URL \"http://localhost:1234\"."
  else
    fail "NEXT_PUBLIC_SITE_URL must not be loopback/local in production (hostname \"$HOST\") — set it to your canonical origin."
  fi
fi

echo "OK: NEXT_PUBLIC_SITE_URL=\"$URL\" accepted (mode=$MODE)."
exit 0
