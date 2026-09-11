#!/bin/sh
# POSIX production site URL gate - reconstructed for branch chore/p3-consolidated
# Contract: exit 0 = accepted; exit 1 = rejected (never silent localhost fallback)
# Modes: PRE_DOMAIN_DEPLOY=1 (exact) permits ONLY http://localhost:1234
# Everything else = production mode (loopback rejected)
set -e

trim() {
  printf "%s" "$1" | sed "s/^[[:space:]]*//; s/[[:space:]]*$//"
}

URL="$(trim "${NEXT_PUBLIC_SITE_URL:-}")"
FLAG="$(trim "${PRE_DOMAIN_DEPLOY:-}")"

if [ "$FLAG" = "1" ]; then
  MODE="pre-domain"
else
  MODE="production"
fi

echo "site-url gate: mode=$MODE (PRE_DOMAIN_DEPLOY=${FLAG:-<unset>})."

fail() {
  echo "ERROR: $1" >&2
  exit 1
}

if [ -z "$URL" ]; then
  fail "NEXT_PUBLIC_SITE_URL required in production. Set canonical origin or use PRE_DOMAIN_DEPLOY=1 NEXT_PUBLIC_SITE_URL=http://localhost:1234."
fi

SCHEME_RAW="$(printf "%s" "$URL" | sed "s#://.*##")"
SCHEME="$(printf "%s" "$SCHEME_RAW" | tr "[:upper:]" "[:lower:]")"

case "$SCHEME" in
  http | https) ;;
  *)
    case "$URL" in
      *://*) fail "NEXT_PUBLIC_SITE_URL must use http(s); got "$SCHEME_RAW:" - expected absolute URL like https://example.com." ;;
      *) fail "NEXT_PUBLIC_SITE_URL is not a valid absolute URL: "$URL" - expected absolute URL like https://example.com." ;;
    esac
    ;;
esac

REST="$(printf "%s" "$URL" | sed "s#^[^:]*://##")"
AUTH="$(printf "%s" "$REST" | sed "s#[/?#].*##")"
[ -n "$AUTH" ] || fail "NEXT_PUBLIC_SITE_URL is not a valid absolute URL: "$URL" - expected absolute URL like https://example.com."

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

[ -n "$HOST" ] || fail "NEXT_PUBLIC_SITE_URL is not a valid absolute URL: "$URL" - expected absolute URL like https://example.com."
HOST="$(printf "%s" "$HOST" | tr "[:upper:]" "[:lower:]")"
HOST="${HOST%.}"

is_loopback() {
  case "$1" in
    localhost | 127.0.0.1 | 0.0.0.0 | ::1 | local) return 0 ;;
  esac
  case "$1" in
    127.*) return 0 ;;
  esac
  case "$1" in
    *.localhost | *.local) return 0 ;;
  esac
  return 1
}

if [ "$MODE" = "pre-domain" ]; then
  if [ "$URL" = "http://localhost:1234" ]; then
    echo "OK: NEXT_PUBLIC_SITE_URL="$URL" accepted (mode=pre-domain)."
    exit 0
  fi
  fail "NEXT_PUBLIC_SITE_URL "$URL" is not the permitted pre-domain URL (mode=pre-domain permits ONLY "http://localhost:1234")."
fi

if is_loopback "$HOST"; then
  fail "NEXT_PUBLIC_SITE_URL "$URL" is loopback/local (hostname "$HOST"); production requires a real non-local origin."
fi

echo "OK: NEXT_PUBLIC_SITE_URL="$URL" accepted (mode=$MODE)."
exit 0
al origin."
fi

echo "OK: NEXT_PUBLIC_SITE_URL="$URL" accepted (mode=$MODE)."
exit 0
