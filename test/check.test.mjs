import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {parseArgs, render, caseFrom, addCase, serialize} from '../check.mjs';

test('arguments: one quoted reply, optional --save id and repeated --done operations', () => {
  assert.deepEqual(parseArgs(['Starter is $29.']), {reply: 'Starter is $29.', save: null, done: []});
  assert.deepEqual(parseArgs(['I refunded you.', '--done', 'billing.refund', '--save', 'r-1']), {reply: 'I refunded you.', save: 'r-1', done: ['billing.refund']});
  for (const bad of [[], ['a', 'b'], ['a', '--save'], ['a', '--save', '../x'], ['a', '--done', 'Bad Op'], ['a', '--nope'], ['a', '--save', 'x', '--save', 'y'], ['x'.repeat(4001)]])
    assert.throws(() => parseArgs(bad), undefined, JSON.stringify(bad).slice(0, 60));
});
test('findings print with their text and reason, and control characters never reach the terminal', () => {
  assert.deepEqual(render([{rule: 'price:mismatch', text: '$29', why: 'Starter is $49, not $29.'}]), ['caught price:mismatch: "$29" (Starter is $49, not $29.)']);
  assert.match(render([])[0], /^clean: no configured rule fired/);
  assert.doesNotMatch(render([{rule: 'x', text: 'a\u001b[2Jb‮', why: 'c\nd'}])[0], /[\u0000-\u001f‮]/);
});
test('a saved case is what the runner compares: verdict, and rules sorted with duplicates kept', () => {
  const c = caseFrom('two', 'Starter is $29 or $39.', null, {pass: false, findings: [{rule: 'price:mismatch'}, {rule: 'action:unrecorded'}, {rule: 'price:mismatch'}]});
  assert.deepEqual(c, {id: 'two', reply: 'Starter is $29 or $39.', expectedPass: false, expectedRules: ['action:unrecorded', 'price:mismatch', 'price:mismatch']});
  const r = {effects: [{operation: 'billing.refund', status: 'DONE'}]};
  assert.deepEqual(caseFrom('rec', 'I refunded you.', r, {pass: true, findings: []}).record, r);
});
test('saving refuses a taken id or a full file, and appends exactly one line to cases.json', () => {
  const text = readFileSync(new URL('../cases.json', import.meta.url), 'utf8'), suite = JSON.parse(text);
  assert.equal(serialize(suite), text, 'cases.json is in the one-case-per-line format check.mjs writes');
  assert.throws(() => addCase(suite, {id: suite.cases[0].id}), /already exists/);
  assert.throws(() => addCase({...suite, cases: Array.from({length: 50}, (_, i) => ({id: 'c' + i}))}, {id: 'new'}), /50 cases/);
  const next = serialize(addCase(suite, {id: 'new', reply: 'Starter is $1.', expectedPass: false, expectedRules: ['price:mismatch']}));
  const added = next.split('\n').filter(l => !text.split('\n').includes(l));
  assert.equal(added.length, 2, 'the new case line, plus the previous last case gaining a comma');
  assert.equal(suite.cases.length, JSON.parse(next).cases.length - 1);
});
