// CTO review of #4: a saved case must keep the regression batch within the API body limit, and two saves at once must
// not lose a case (each used to write back its own stale snapshot).
import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp, cp, readFile, rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {spawn} from 'node:child_process';
import {createServer} from 'node:http';
import {addCase, batchBytes} from '../check.mjs';

test('a save that would push the regression batch past the 64 KiB API limit is refused', () => {
  const big = 'Starter is $29. ' + 'x'.repeat(3900);
  let suite = {version: '2026-11-01', policy: {prices: [{item: 'Starter', amount: 49}]}, cases: []};
  // Fill to just under the limit directly, then ask addCase for one more.
  for (let i = 0; ; i++) { const next = {...suite, cases: [...suite.cases, {id: 'c' + i, reply: big, expectedPass: false, expectedRules: []}]}; if (batchBytes(next) > 65536) break; suite = next; }
  assert.ok(batchBytes(suite) <= 65536);
  assert.throws(() => addCase(suite, {id: 'over', reply: big, expectedPass: false, expectedRules: []}), /64 KiB/);
  // Multi-byte text counts as encoded bytes, not characters.
  const wide = {...suite, cases: []};
  assert.ok(batchBytes({...wide, cases: [{id: 'w', reply: 'é'.repeat(100)}]}) > batchBytes({...wide, cases: [{id: 'w', reply: 'e'.repeat(100)}]}));
});

test('two saves at the same moment both land in cases.json', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'curbi-save-'));
  let waiting = [];
  // Hold every response until both checks have arrived, so both processes have read cases.json before either writes.
  const server = createServer((req, res) => { let b = ''; req.on('data', d => b += d); req.on('end', () => {
    waiting.push(() => { res.writeHead(200, {'Content-Type': 'application/json'}); res.end(JSON.stringify({pass: false, findings: [{rule: 'price:mismatch', text: '$29', why: 'test'}]})); });
    if (waiting.length === 2) { for (const send of waiting) send(); waiting = []; } }); });
  await new Promise(r => server.listen(0, '127.0.0.1', r));
  try {
    for (const f of ['check.mjs', 'cases.json']) await cp(new URL('../' + f, import.meta.url), join(dir, f));
    const env = {...process.env, CURBI_API: `http://127.0.0.1:${server.address().port}/v1/check`};
    const run = id => new Promise(res => { const p = spawn(process.execPath, [join(dir, 'check.mjs'), 'Starter is $29.', '--save', id], {env});
      let err = ''; p.stderr.on('data', d => err += d); p.on('close', code => res({code, err})); });
    const results = await Promise.all([run('first-save'), run('second-save')]);
    assert.deepEqual(results.map(r => r.code), [0, 0], JSON.stringify(results));
    const ids = JSON.parse(await readFile(join(dir, 'cases.json'), 'utf8')).cases.map(c => c.id);
    assert.ok(ids.includes('first-save') && ids.includes('second-save'), ids.join(','));
  } finally { server.close(); await rm(dir, {recursive: true, force: true}); }
});
