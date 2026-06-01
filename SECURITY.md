# Security Policy

## Threat model

splitjar has **no authentication**. It's designed to run on your own network behind whatever trust boundary you already use (LAN, VPN, reverse proxy with auth). **Do not expose it directly to the public internet** — anyone who can reach it can read and modify all data.

The HTTP API is also unauthenticated. The same caveat applies.

## Supported versions

The `:latest` tag and the most recent minor tag receive fixes. Older tags do not.

## Reporting a vulnerability

If you find a vulnerability that goes beyond the "no auth by design" trade-off (e.g. a way to escape the SQLite sandbox, an XSS in stored data, a path traversal in the static file server), please:

1. Open a GitHub Security Advisory on this repo, **or**
2. Open an issue titled "SECURITY" with minimal detail and a request to be contacted privately.

Please do not file public PoCs before a fix is released.
