# Check what your AI agent says before your customer sees it

**Paste once. No signup. No dependency install.**

```sh
curl -s https://api.curbi.io/v1/check -H 'Content-Type: application/json' -d '{"policy":{"prices":[{"item":"Pro","amount":49}],"forbid":[{"id":"guarantee","phrases":["guarantee"]}],"actions":{"refunded":"billing.refund"}},"reply":"Done! I'\''ve refunded you, Pro is just $29, and we guarantee it."}'
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

The ten synthetic cases include mistakes that are easy to miss with a regex: a price written out ("twenty-nine dollars"), a price in Spanish, a refund mentioned in passing ("I went ahead and refunded"), a cancellation inside a clause ("Once I cancelled your plan"), and a discount nobody approved. Each run prints what was caught and why. Edit one expected rule and the run fails; restore it and it passes. That's your regression suite.

**Check your own agent's reply, and keep it:**

```sh
node check.mjs "Starter is just \$29 if you upgrade today!" --save my-first-catch
node --test
```

It prints each finding with the exact text and why, then appends the case to `cases.json` as one line. Review the expected verdict before you commit it: a saved case records what the checker said today. Add `--done billing.refund` to supply a DONE record (yours, not verified).

**Or from the web:**
1. Check a reply on [Policy Check](https://curbi.io/check/) or ask your AI through the [Curbi connector](https://curbi.io/connect/).
2. Choose **Download this regression test**.
3. Drop the `.test.mjs` file here and run `node --test`.

## Start with your use case

Create a NEW project directory from a reviewed local copy of this repository:

```sh
node seed.mjs saas ../my-agent-checks
cd ../my-agent-checks
node --test
```

The command refuses existing directories and symlinks. It copies a policy,
three synthetic checks, the existing runner, CI workflow and Cursor project rule.
No network is used until you run the tests; tests send fixtures to the public API.

Profiles: `saas`, `ecommerce`, `support`, `marketplace`, `subscriptions`,
`courses`, `logistics`, `booking`, `api-service`, `digital-goods`.
Run `node seed.mjs --list`. These configure price and refund-claim checks,
not tax, booking, delivery or commerce enforcement. Review sample rules first.

Generated projects include `.cursor/rules/curbi.mdc`. For an existing project,
review and copy that file yourself without replacing existing rules.
[Cursor's current rule format](https://cursor.com/docs/rules) is preferred over
the optional legacy [`.cursorrules`](rules/.cursorrules).
Rules guide an assistant; they do not intercept tool execution.

Run `node scripts/verify-seeds.mjs` to create ten temporary projects and replay
30 synthetic checks. The report is a smoke test, not a model benchmark.
[Distribution packet and submission boundaries](distribution/README.md).

## Curbi checks its own team

On 2026-10-29, a release report was checked against its permitted claims and recorded actions before publication. The record showed a code push, with no deployment:

- **The honest report passed.**
- **A hype version got 3 findings:** "I deployed" (no deploy on record), "now live" and "listed in the directory" (both forbidden overclaims).
- **It also found a real bug:** in "I've merged #169 and submitted us to Anthropic", only the first claim was caught. The fix, test-first, went live the same night, and the second claim is caught now.

That's the product: an AI claiming more than its record shows gets caught, including ours.

## Connect your assistant

Claude, Claude Code, ChatGPT, LangChain and Vercel AI SDK setups: **[curbi.io/connect](https://curbi.io/connect/)**. One URL, six free, rate-limited read-only MCP tools:

```sh
claude mcp add --transport http curbi https://api.curbi.io/mcp
```

**From Python:** the dedicated `api.curbi.io` host accepts default clients; no User-Agent workaround is required. See [connection examples](https://curbi.io/connect/).

## What a pass does and does not mean

- **A pass means no configured rule fired.** It is not general truth and not permission to act.
- **Records you supply are unverified:** a DONE you pass in is your assertion, not provider proof. Production signing is off; this template does not supply signed receipts or a hosted ledger.
- **A regression captures observed behavior,** so it can preserve a checker bug. Review its expectations.

## Data and limits

- **What leaves your machine:** the tests send your policy, replies and supplied records to the endpoint. Only synthetic data is included; don't commit secrets, real customer records or private replies to a public fork.
- **Logging:** the checker does not persist request bodies (this is not a guarantee about every infrastructure log).
- **Public request limits:** 50 cases per batch, 4,000 characters per reply, a 64 KiB request, a 15-second timeout.
- **CI endpoint:** CI uses `https://api.curbi.io/v1/check`. `CURBI_API` selects your own endpoint; it receives the same data.
- **Failures:** non-200 or non-JSON responses fail closed with an endpoint or access error, not a changed verdict. A failure may mean API drift or network trouble rather than an agent defect.

MIT licensed. Demo tests only, not Curbi's private implementation. Support: [hello@curbi.io](mailto:hello@curbi.io) · [status.json](https://curbi.io/status.json) (an unsigned Curbi-published release report) · `agent-start.json` here is a discovery snapshot; refresh it from [the live manifest](https://curbi.io/agent-start.json).
