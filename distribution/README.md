# Distribution packet

Status: prepared, not submitted. No directory listing or benchmark acceptance is implied.

## One reproducible entry point

Repository: https://github.com/Curbi-Inc/curbi-regression-template
Check API: https://api.curbi.io/v1/check
Remote MCP: https://api.curbi.io/mcp
Required MCP Accept: application/json, text/event-stream
Setup: https://curbi.io/connect/
Privacy: https://curbi.io/privacy/
Support: hello@curbi.io

## Directory description

Curbi checks agent replies against configured prices, forbidden phrases and
caller-supplied action records. Findings identify the original text and rule.
Keep failures as runnable regression tests. Public HTTP and six read-only MCP
tools are rate-limited; no model inference is used by the checker. A passing
check does not authorize an action or independently confirm provider completion.
The free starter includes ten synthetic policy profiles and a Cursor project rule.

Use this text with the existing registry/directory work; do not create duplicate
submissions. Before submitting, read that destination's current contribution
rules, search for an existing Curbi entry, check the exact public URLs, and record
the submission URL and date. A prepared description is not an accepted listing.
Do not claim an approved Chrome Store listing while it is pending review.

## Benchmark handoff

Run `node scripts/verify-seeds.mjs` from a clean copy with Node 20+.
It creates ten fresh projects and runs their 30 synthetic checks against the public
API. It has no managed key and never sends a billable managed request.
The JSON report records Node version, time, endpoint, result and wall time per
profile. Save the exact source commit beside a report when sharing it.

These are regression smoke cases, not an independent security benchmark or a
model evaluation. Process startup, network and three checks contribute to each
wall time. Do not publish these times as p50/p99 or a universal latency claim.
No third-party benchmark submission has been made from this packet.

## Adoption boundary

The ten profiles can seed ten independent repositories; no empty repositories
are created to inflate distribution. Use `seed.mjs` to create the one needed.
Cursor project rules follow https://cursor.com/docs/rules (checked 2026-11-03).
Use `.cursor/rules/curbi.mdc`; `rules/.cursorrules` is an optional legacy copy.
Rules guide an assistant. They do not install a runtime interception layer.
