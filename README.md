# Check what your AI agent says before your customer sees it

**Paste once. Under a second. No signup.**

```sh
curl -s https://curbi.io/api/v1/check -H 'Content-Type: application/json' -d '{"policy":{"prices":[{"item":"Pro","amount":49}],"forbid":[{"id":"guarantee","phrases":["guarantee"]}],"actions":{"refunded":"billing.refund"}},"reply":"Done! I'\''ve refunded you, Pro is just $29, and we guarantee it."}'
```

You get three findings, each with the exact text and why:

| Rule | Text | Why |
|---|---|---|
| `action:unrecorded` | I've refunded | the agent claims a refund, but no refund is on record |
| `price:mismatch` | $29 | Pro is $49 |
| `forbid:guarantee` | guarantee | not approved by your policy |

The request took 442–571 ms in three independent live runs (2026-10-29). Deterministic, no model calls.

## Keep every catch as a test, in under a minute

1. Click **Use this template** (or fork).
2. Run `node --test`. Node 20+, no install, no API key.
3. Push. The included GitHub Actions workflow runs the same four checks on every push and pull request.

The four synthetic cases are a correct price, a wrong price, a refund the agent claims but never made, and a refund with a DONE record. Edit one expected rule and the run fails; restore it and it passes. That's your regression suite.

**Add your own catch:**
1. Check a reply on [Policy Check](https://curbi.io/check/) or ask your AI through the [Curbi connector](https://curbi.io/connect/).
2. Choose **Download this regression test**.
3. Drop the `.test.mjs` file here and run `node --test`.

## Curbi checks its own team

On 2026-10-29, Curbi's AI engineer (Claude Code) wrote a ship report. Before posting it, the report went through Curbi, live, with a policy of what it was allowed to claim and a record of what actually happened (it pushed code, it did not deploy):

- **The honest report passed.**
- **A hype version got 3 findings:** "I deployed" (no deploy on record), "now live" and "listed in the directory" (both forbidden overclaims).
- **It also found a real bug:** in "I've merged #169 and submitted us to Anthropic", only the first claim was caught. The fix, test-first, went live the same night, and the second claim is caught now.

That's the product: an AI claiming more than its record shows gets caught, including ours.

## Connect your assistant

Claude, Claude Code, ChatGPT, LangChain and Vercel AI SDK setups: **[curbi.io/connect](https://curbi.io/connect/)**. One URL, six read-only MCP tools, no sign-in during the preview:

```sh
claude mcp add --transport http curbi https://curbi.io/api/mcp
```

**From Python,** set a descriptive User-Agent. Cloudflare refuses library defaults such as `Python-urllib` at the edge on this host; `curbi-quickstart/1.0` works. A dedicated API host that accepts defaults is in progress.

## What a pass does and does not mean

- **A pass means no configured rule fired.** It is not general truth and not permission to act.
- **Records you supply are unverified:** a DONE you pass in is your assertion, not provider proof. Production signing is off; this template does not supply signed receipts or a hosted ledger.
- **A regression captures observed behavior,** so it can preserve a checker bug. Review its expectations.

## Data and limits

- **What leaves your machine:** the tests send your policy, replies and supplied records to the endpoint. Only synthetic data is included; don't commit secrets, real customer records or private replies to a public fork.
- **Logging:** the checker does not persist request bodies (this is not a guarantee about every infrastructure log).
- **Preview limits:** 50 cases per batch, 4,000 characters per reply, a 64 KiB request, a 15-second timeout.
- **CI endpoint:** CI uses the same deployment through `https://curbi-landing.pages.dev/api/v1/check`, because the canonical domain refused the first hosted runner. `CURBI_API` selects your own endpoint; it receives the same data.
- **Failures:** non-200 or non-JSON responses fail closed with an endpoint or access error, not a changed verdict. The preview can change, so a failure may mean API drift or network trouble rather than an agent defect.

MIT licensed. Demo tests only, not Curbi's private implementation. Support: [hello@curbi.io](mailto:hello@curbi.io) · [status.json](https://curbi.io/status.json) (an unsigned Curbi-published release report) · `agent-start.json` here is a discovery snapshot; refresh it from [the live manifest](https://curbi.io/agent-start.json).
