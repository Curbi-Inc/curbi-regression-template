# Curbi regression starter

Keep an agent failure as a test. Four synthetic examples, no dependencies, no API key during preview.

## First green run

Use this template or fork this repository, then run:

```sh
node --test
```

Requires Node 20+ and network access to `https://curbi.io`. No install step. The included GitHub Actions workflow runs the same command on pushes and pull requests with read-only repository permissions.

The four cases check an approved price, a wrong price, an unrecorded refund claim, and a caller-supplied DONE assertion. A failed expectation exits nonzero. Edit one expected rule to prove the test fails, then restore it.

## Keep your own catch

1. Open [Policy Check](https://curbi.io/check/) or the [MCP console](https://curbi.io/mcp/#console).
2. Check a synthetic reply against your policy.
3. Choose **Download this regression test** on the result. Add that `.test.mjs` file here.
4. Run `node --test`. Commit only data you are authorized to share.

The downloaded file carries its captured policy, reply, record and expected rules. It runs independently of `cases.json`. You can also edit `cases.json` directly; expected results are your contract, not a universal truth label.

## For an agent

`agent-start.json` is a published discovery snapshot: six read-only MCP tools, endpoint, headers and limits. Refresh it from [Curbi's live manifest](https://curbi.io/agent-start.json) when integrating. [status.json](https://curbi.io/status.json) is an unsigned Curbi-published release report, not continuous health monitoring.

```sh
curl -s https://curbi.io/api/mcp \
  -H 'Content-Type: application/json' \
  -H 'Accept: application/json, text/event-stream' \
  -H 'MCP-Protocol-Version: 2025-06-18' \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/list","params":{}}'
```

## Data and limits

These tests send your policy, replies and supplied records to the configured endpoint. Only synthetic data is included. Do not commit secrets, real customer records or private replies to a public fork. The checker does not persist request bodies; this is not a guarantee about every infrastructure log.

Preview limits include 50 cases per batch, 4,000 characters per reply and a 64 KiB request. The test makes one batch request and times out after 15 seconds. No provider action is executed. `CURBI_API` can explicitly select your own staging endpoint; it receives the same data.

A pass means no configured rule fired. A supplied DONE assertion is not independent provider proof. A regression captures observed behavior and can preserve a checker bug; review its expectations. Production signing and a hosted ledger are not supplied by this template. Required-signature and receipt-bearing checks are not supported by this unsigned replay path.

This repository contains demo tests only, not Curbi's private implementation. MIT licensed. Public preview can change; a failure may mean API drift or network trouble rather than an agent defect.

Verified against the live preview API on October 29, 2026: four synthetic cases passed locally. Hosted CI is qualified separately by its run result; a local pass is not proof that every network can reach the API. Non-200 or non-JSON responses fail closed with an endpoint/access error, rather than being treated as changed verdicts. Support: [hello@curbi.io](mailto:hello@curbi.io).
