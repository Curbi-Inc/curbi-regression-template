import {readFile, mkdir, writeFile, rm} from 'node:fs/promises';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';

export async function seed(profile, destination) {
  const catalog = JSON.parse(await readFile(new URL('./seeds/profiles.json', import.meta.url), 'utf8'));
  if (!Object.hasOwn(catalog, profile)) throw Error('Unknown profile. Use --list.');
  if (!destination) throw Error('Choose a NEW destination directory.');
  const files = new Map();
  for (const name of ['regression.test.mjs', 'check.mjs', 'package.json', 'LICENSE', '.gitignore', '.github/workflows/regression.yml', 'rules/curbi.mdc']) {
    files.set(name === 'rules/curbi.mdc' ? '.cursor/rules/curbi.mdc' : name, await readFile(new URL(name, import.meta.url)));
  }
  files.set('cases.json', JSON.stringify(catalog[profile], null, 2) + '\n');
  files.set('README.md', `# ${profile} reply checks\n\nSynthetic examples. Review and adapt the policy before use.\n\nRun: node --test\n\nCheck your own reply and keep it as a test: node check.mjs "<reply>" --save <case-id>\n\nNode 20+, no dependency install or API key. Tests send cases.json policy, replies and records to https://api.curbi.io/v1/check. Do not add private data or secrets. Network or API errors fail the run; they are not checker verdicts.\n\nA pass means no configured rule fired, not authorization or provider completion. Cursor rules guide the assistant; they do not intercept execution.\n`);
  const target = resolve(destination);
  // Exclusive creation: never merge into or replace an existing project or symlink.
  await mkdir(target);
  try {
    await mkdir(resolve(target, '.github/workflows'), {recursive:true});
    await mkdir(resolve(target, '.cursor/rules'), {recursive:true});
    for (const [name, content] of files) await writeFile(resolve(target, name), content, {flag:'wx'});
  } catch (error) { await rm(target, {recursive:true, force:true}); throw error; }
  return target;
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  try {
    if (process.argv[2] === '--list' && process.argv.length === 3) {
      console.log(Object.keys(JSON.parse(await readFile(new URL('./seeds/profiles.json', import.meta.url), 'utf8'))).join('\n'));
    } else {
      if (process.argv.length !== 4) throw Error('Usage: node seed.mjs <profile> <new-directory>, or --list');
      console.log('Created ' + await seed(process.argv[2], process.argv[3]));
    }
  } catch (error) { console.error(error.message); process.exitCode = 1; }
}
