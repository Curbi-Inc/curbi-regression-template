import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp, readFile, writeFile, mkdir, rm, symlink, readdir} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {seed} from '../seed.mjs';
const profiles = JSON.parse(await readFile(new URL('../seeds/profiles.json',import.meta.url),'utf8'));
test('ten independent seeds produce runnable projects with matching policies', async () => {
  assert.equal(Object.keys(profiles).length,10);
  const dir=await mkdtemp(join(tmpdir(),'curbi-seed-'));
  try { for (const [id,suite] of Object.entries(profiles)) {
    const target=await seed(id,join(dir,id));
    assert.deepEqual(JSON.parse(await readFile(join(target,'cases.json'),'utf8')),suite);
    assert.equal(await readFile(join(target,'regression.test.mjs'),'utf8'),await readFile(new URL('../regression.test.mjs',import.meta.url),'utf8'));
    assert.match(await readFile(join(target,'.cursor/rules/curbi.mdc'),'utf8'),/alwaysApply: true/);
    assert.match(await readFile(join(target,'.github/workflows/regression.yml'),'utf8'),/https:\/\/api.curbi.io\/v1\/check/);
    assert.equal(new Set(suite.cases.map(c=>c.id)).size,suite.cases.length);
  }} finally {await rm(dir,{recursive:true,force:true});}
});
test('existing directory and symlink are refused without changing contents', async()=>{
  const dir=await mkdtemp(join(tmpdir(),'curbi-preserve-'));
  try {const existing=join(dir,'existing');await mkdir(existing);await writeFile(join(existing,'keep'),'unchanged');
    await assert.rejects(seed('saas',existing),/EEXIST/);
    await symlink(existing,join(dir,'link'));await assert.rejects(seed('saas',join(dir,'link')),/EEXIST/);
    assert.deepEqual(await readdir(existing),['keep']);assert.equal(await readFile(join(existing,'keep'),'utf8'),'unchanged');
  }finally{await rm(dir,{recursive:true,force:true});}
});
test('unknown and path-traversal profiles cannot create a project',async()=>{
  for(const name of ['../cases','__proto__','constructor','not-a-profile'])await assert.rejects(seed(name,'unused'),/Unknown profile/);
});
