import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

// Only data is loaded. Never execute pasted replies or policies as code.
const suite=JSON.parse(readFileSync(new URL('./cases.json',import.meta.url),'utf8'));
assert.ok(Array.isArray(suite.cases)&&suite.cases.length>0&&suite.cases.length<=50);
assert.equal(new Set(suite.cases.map(c=>c.id)).size,suite.cases.length,'case IDs must be unique');
const endpoint=process.env.CURBI_API||'https://curbi.io/api/v1/check';
const response=fetch(endpoint,{
 method:'POST',signal:AbortSignal.timeout(15000),redirect:'error',
 headers:{'Content-Type':'application/json'},
 body:JSON.stringify({version:suite.version,policy:suite.policy,cases:suite.cases.map(({id,reply,record})=>({id,reply,...(record?{record}:{})}))}),
}).then(async r=>{const body=await r.json();assert.equal(r.status,200,JSON.stringify(body.error||body));assert.ok(Array.isArray(body.results));assert.equal(body.results.length,suite.cases.length);assert.equal(new Set(body.results.map(c=>c.id)).size,body.results.length,'response IDs must be unique');return body;});

for(const c of suite.cases)test(c.id,async()=>{
 const {results}=await response,r=results.find(r=>r.id===c.id);
 assert.ok(r,'missing result for '+c.id);
 assert.equal(r.pass,c.expectedPass);
 assert.deepEqual(r.findings.map(f=>f.rule).sort(),[...c.expectedRules].sort());
});
