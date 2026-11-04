import {readFile, mkdtemp, rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {spawnSync} from 'node:child_process';
import {seed} from '../seed.mjs';
const profiles=JSON.parse(await readFile(new URL('../seeds/profiles.json',import.meta.url),'utf8'));
const root=await mkdtemp(join(tmpdir(),'curbi-live-seeds-'));
const report={kind:'synthetic-seed-smoke',node:process.version,at:new Date().toISOString(),endpoint:'https://api.curbi.io/v1/check',results:[]};
try {
  for(const id of Object.keys(profiles)){
    const dir=await seed(id,join(root,id)); const start=performance.now();
    const run=spawnSync(process.execPath,['--test','regression.test.mjs'],{cwd:dir,encoding:'utf8',timeout:20000,env:{PATH:process.env.PATH,CURBI_API:report.endpoint}});
    report.results.push({profile:id,passed:run.status===0,cases:profiles[id].cases.length,wallMs:Math.round(performance.now()-start)});
    if(run.status!==0){console.error(id+': '+(run.stderr||run.stdout));process.exitCode=1;break;}
  }
}finally{await rm(root,{recursive:true,force:true});}
console.log(JSON.stringify(report,null,2));
