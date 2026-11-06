// Check one reply against this project's policy, and keep it as a regression case if you want.
//   node check.mjs "Starter is $29 a month."                      prints what Curbi caught, and why
//   node check.mjs "Starter is $29 a month." --save quoted-29     also appends it to cases.json with the verdict it got
//   node check.mjs "I refunded you." --done billing.refund        the same reply with a DONE record you supply
// Only data leaves your machine: cases.json's policy, your reply and any record go to the Check API. Nothing you paste is
// executed. A saved case records what the checker said today; review it before you commit it.
import {readFileSync, writeFileSync, renameSync, rmSync} from 'node:fs';
import {fileURLToPath, pathToFileURL} from 'node:url';
import {resolve} from 'node:path';
import {isDeepStrictEqual} from 'node:util';

const USAGE = 'Usage: node check.mjs "<reply>" [--save <case-id>] [--done <operation>]...';

export function parseArgs(argv) {
  const out = {reply: null, save: null, done: []};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--save' || a === '--done') {
      const v = argv[++i];
      if (v === undefined || v.startsWith('--')) throw Error(`${a} needs a value. ${USAGE}`);
      if (a === '--save') { if (out.save !== null) throw Error('--save given twice.'); out.save = v; } else out.done.push(v);
    } else if (a.startsWith('--')) throw Error(`Unknown option ${a}. ${USAGE}`);
    else if (out.reply === null) out.reply = a;
    else throw Error(`Put the reply in one quoted argument. ${USAGE}`);
  }
  if (!out.reply || out.reply.length > 4000) throw Error(`A reply of 1-4000 characters is required. ${USAGE}`);
  if (out.save !== null && !/^[A-Za-z0-9._-]{1,60}$/.test(out.save)) throw Error('A case id is 1-60 letters, digits, dots, dashes or underscores.');
  for (const op of out.done) if (!/^[a-z][a-z0-9_.-]{0,59}$/.test(op)) throw Error(`Not an operation name: ${op}`);
  return out;
}

// Terminal-safe: no control characters from a reply or a finding reach your terminal.
const clean = s => String(s).replace(/[\u0000-\u001f\u007f-\u009f‪-‮⁦-⁩]/g, ' ').slice(0, 160);
export const render = findings => findings.length
  ? findings.map(f => `caught ${clean(f.rule)}: "${clean(f.text)}" (${clean(f.why)})`)
  : ['clean: no configured rule fired (not a guarantee, not permission to act)'];

// The case the regression runner expects: rules sorted with duplicates kept, exactly as it compares them.
export function caseFrom(id, reply, record, result) {
  return {id, reply, ...(record ? {record} : {}), expectedPass: result.pass, expectedRules: result.findings.map(f => f.rule).sort()};
}

// Encoded size of the one request regression.test.mjs sends for the whole suite. The Check API caps a body at 64 KiB.
export const BATCH_LIMIT = 65536;
export const batchBytes = suite => Buffer.byteLength(JSON.stringify({version: suite.version, policy: suite.policy,
  cases: suite.cases.map(({id, reply, record}) => ({id, reply, ...(record ? {record} : {})}))}), 'utf8');

export function addCase(suite, c) {
  if (!Array.isArray(suite.cases)) throw Error('cases.json has no cases array.');
  if (suite.cases.some(x => x.id === c.id)) throw Error(`A case named ${c.id} already exists; pick another id.`);
  if (suite.cases.length >= 50) throw Error('cases.json already holds 50 cases, the per-request limit.');
  const next = {...suite, cases: [...suite.cases, c]}, bytes = batchBytes(next);
  if (bytes > BATCH_LIMIT) throw Error(`Saving this case would make the regression batch ${bytes} bytes, past the 64 KiB API limit. Remove a case or shorten a reply first.`);
  return next;
}

// One save at a time: an exclusive lock file, then cases.json is read again under the lock, so a save made meanwhile
// is kept rather than overwritten by a stale copy.
async function withLock(path, fn, waitMs = 5000) {
  const lock = path + '.lock', until = Date.now() + waitMs;
  for (;;) {
    try { writeFileSync(lock, String(process.pid), {flag: 'wx'}); break; }
    catch (e) {
      if (e.code !== 'EEXIST') throw e;
      if (Date.now() > until) throw Error(`Another save holds ${lock}. If no save is running, delete that file and retry.`);
      await new Promise(r => setTimeout(r, 25));
    }
  }
  try { return fn(); } finally { rmSync(lock, {force: true}); }
}

// One case per line, so a saved catch is a one-line diff.
export function serialize(suite) {
  return '{\n' + Object.entries(suite).map(([k, v]) => '  ' + JSON.stringify(k) + ':' + (k === 'cases'
    ? '[\n' + v.map(c => '    ' + JSON.stringify(c)).join(',\n') + '\n  ]'
    : JSON.stringify(v))).join(',\n') + '\n}\n';
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const file = new URL('./cases.json', import.meta.url), suite = JSON.parse(readFileSync(file, 'utf8'));
  const record = args.done.length ? {effects: args.done.map(operation => ({operation, status: 'DONE'}))} : null;
  // A taken id, a full file or an oversized batch fails here, before any request.
  if (args.save !== null) addCase(suite, {id: args.save, reply: args.reply, ...(record ? {record} : {})});
  const endpoint = process.env.CURBI_API || 'https://api.curbi.io/v1/check';
  const r = await fetch(endpoint, {method: 'POST', signal: AbortSignal.timeout(15000), redirect: 'error',
    headers: {'Content-Type': 'application/json', Accept: 'application/json', 'User-Agent': 'Curbi-Regression-Starter/1.0'},
    body: JSON.stringify({version: suite.version, policy: suite.policy, reply: args.reply, ...(record ? {record} : {})})});
  if (r.status !== 200) throw Error(`Check API HTTP ${r.status}. This is an endpoint, rate-limit or access error, not a verdict.`);
  const result = await r.json();
  if (!Array.isArray(result.findings) || typeof result.pass !== 'boolean') throw Error('Unexpected response from the Check API; no verdict.');
  for (const line of render(result.findings)) console.log(line);
  if (record) console.log('record: supplied by you, not verified by Curbi');
  if (args.save !== null) {
    const path = fileURLToPath(file);
    await withLock(path, () => {
      const current = JSON.parse(readFileSync(path, 'utf8'));
      if (current.version !== suite.version || !isDeepStrictEqual(current.policy, suite.policy)) {
        throw Error('The policy or version changed during this check. Run it again before saving.');
      }
      const next = addCase(current, caseFrom(args.save, args.reply, record, result)), tmp = `${path}.${process.pid}.tmp`;
      writeFileSync(tmp, serialize(next), {flag: 'wx'}); renameSync(tmp, path);
    });
    console.log(`saved ${args.save} to cases.json. Run node --test; review the expected verdict before you commit it.`);
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href)
  main().catch(e => { console.error(e.message); process.exitCode = 1; });
