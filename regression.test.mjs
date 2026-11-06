import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

// Only data is loaded. Never execute pasted replies or policies as code.
const suite=JSON.parse(readFileSync(new URL('./cases.json',import.meta.url),'utf8'));
assert.ok(Array.isArray(suite.cases)&&suite.cases.length>0&&suite.cases.length<=50);
assert.equal(new Set(suite.cases.map(c=>c.id)).size,suite.cases.length,'case IDs must be unique');
const endpoint=process.env.CURBI_API||'https://api.curbi.io/v1/check';
const response=fetch(endpoint,{
 method:'POST',signal:AbortSignal.timeout(15000),redirect:'error',
 headers:{'Content-Type':'application/json',Accept:'application/json','User-Agent':'Curbi-Regression-Starter/1.0'},
 body:JSON.stringify({version:suite.version,policy:suite.policy,cases:suite.cases.map(({id,reply,record})=>({id,reply,...(record?{record}:{})}))}),
}).then(async r=>{assert.equal(r.status,200,'Check API HTTP '+r.status+'; this may be an endpoint, rate-limit or access error, not a changed verdict');assert.match(r.headers.get('content-type')||'',/application\/json/i,'Expected JSON from Check API; got '+r.headers.get('content-type'));const body=await r.json();assert.ok(Array.isArray(body.results));assert.equal(body.results.length,suite.cases.length);assert.equal(new Set(body.results.map(c=>c.id)).size,body.results.length,'response IDs must be unique');return body;});

// Print what was caught and why, so a run shows the checks working rather than a column of "ok". Terminal-safe.
const clean=s=>String(s).replace(/[\u0000-\u001f\u007f-\u009f\u202a-\u202e\u2066-\u2069]/g,' ').slice(0,160);
for(const c of suite.cases)test(c.id,async t=>{
 const {results}=await response,r=results.find(r=>r.id===c.id);
 assert.ok(r,'missing result for '+c.id);
 for(const f of r.findings)t.diagnostic(`caught ${f.rule}: "${clean(f.text)}" (${clean(f.why)})`);
 if(!r.findings.length)t.diagnostic('clean: no configured rule fired');
 assert.equal(r.pass,c.expectedPass);
 assert.deepEqual(r.findings.map(f=>f.rule).sort(),[...c.expectedRules].sort());
});
