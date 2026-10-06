import {fileURLToPath} from 'node:url';
import {dirname, resolve} from 'node:path';
import {openDatabase, assertRuntime} from './database.mjs';
import {createAccount} from './auth.mjs';
import {createApplication} from './http.mjs';
import {LearningStore} from './domain.mjs';
import {assertNotServing, backupDatabase, rebuildSummaries, restoreDatabase, verifyDatabase} from './integrity.mjs';

function options(argv) {
  const result = {command:argv[0] || 'help'};
  for (let index = 1; index < argv.length; index++) {
    const arg = argv[index];
    if (!arg.startsWith('--')) throw new Error(`Unexpected argument ${arg}`);
    const equals = arg.indexOf('='), name = arg.slice(2, equals < 0 ? undefined : equals);
    if (name === 'password') throw new Error('Passwords must use the hidden prompt or --password-stdin');
    const value = equals >= 0 ? arg.slice(equals+1) : argv[index+1]?.startsWith('--') || index+1===argv.length ? true : argv[++index];
    if (Object.hasOwn(result,name)) throw new Error(`Repeated option --${name}`);
    result[name] = value;
  }
  return result;
}
function hiddenPassword(prompt) {
  if (!process.stdin.isTTY || !process.stdin.setRawMode) throw new Error('Use --password-stdin when stdin is not an interactive terminal');
  process.stdout.write(prompt); process.stdin.setRawMode(true); process.stdin.resume();
  return new Promise((resolve, reject) => {
    let value = '';
    const finish = error => { process.stdin.removeListener('data',onData); process.stdin.setRawMode(false); process.stdin.pause(); process.stdout.write('\n'); error ? reject(error) : resolve(value); };
    const onData = buffer => {
      for (const character of buffer.toString('utf8')) {
        if (character === '\u0003') { finish(new Error('Cancelled')); return; }
        if (character === '\r' || character === '\n') { finish(); return; }
        if (character === '\u007f' || character === '\b') value = [...value].slice(0,-1).join('');
        else if (character >= ' ') value += character;
        if (Buffer.byteLength(value) > 1024) { finish(new Error('Password is too long')); return; }
      }
    };
    process.stdin.on('data',onData);
  });
}
async function passwordFromStdin() {
  const chunks = []; let bytes = 0;
  for await (const chunk of process.stdin) { bytes += chunk.length; if (bytes > 2048) throw new Error('Password input too long'); chunks.push(chunk); }
  const value = Buffer.concat(chunks).toString('utf8').replace(/\r?\n$/,'');
  if (/\r|\n/.test(value)) throw new Error('Password stdin must contain exactly one line');
  return value;
}
export async function main(argv = process.argv.slice(2)) {
  assertRuntime(); const args = options(argv);
  const staticRoot = resolve(args.root || fileURLToPath(new URL('../',import.meta.url)));
  const databasePath = resolve(args.db || resolve(dirname(staticRoot),'runtime','mathphysics.sqlite3'));
  const known = new Set(['command','root','db','username','label','password-stdin','port','host','production','public-origin','out','from','replace','profile','attempt','reason','grader-version','help']);
  for (const option of Object.keys(args)) if (!known.has(option)) throw new Error(`Unknown option --${option}`);
  for (const flag of ['production','replace','password-stdin','help']) if (Object.hasOwn(args,flag) && args[flag]!==true) throw new Error(`--${flag} is a switch; do not supply a value`);
  if (args.command === 'help' || args.help) {
    process.stdout.write(`MathPhysics Node 24.14.0 + SQLite 3.51.2\n\n`+
      `init --username NAME [--label LABEL] [--password-stdin] [--db OUTSIDE_PUBLIC_ROOT]\n`+
      `account-add --username NAME [--password-stdin] [--db PATH]\n`+
      `serve [--db PATH] [--port 8000] [--host 127.0.0.1]\n`+
      `serve --production --public-origin https://YOUR_HOST [--db PATH]\n`+
      `verify | rebuild [--db PATH]\nbackup --out NEW_BACKUP [--db PATH]\n`+
      `restore --from BACKUP [--db NEW_PATH] [--replace]\n`+
      `regrade --profile UUID --attempt UUID --reason TEXT --grader-version VERSION [--db PATH]\n`+
      `Passwords are never accepted in argv. Default data is a sibling runtime directory outside the static root. Stop serve before restore/rebuild/regrade.\n`);
    return;
  }
  if (args.command === 'serve') {
    const port = args.port === undefined ? 8000 : Number(args.port);
    if (!Number.isInteger(port) || port < 0 || port > 65535) throw new Error('Invalid --port');
    let app;
    try {
      app = await createApplication({databasePath,staticRoot,host:args.host || '127.0.0.1',production:args.production === true,publicOrigin:args['public-origin'] || null,
        onError:error => process.stderr.write(`API failure: ${error.name}\n`)});
      const address = await app.listen(port);
      process.stdout.write(`MathPhysics API listening on ${address.address}:${address.port}; data ${databasePath}\n`);
    } catch (error) { if (app) await app.close(); throw error; }
    let stopping = false;
    const stop = async () => { if (stopping) return; stopping = true; await app.close(); };
    process.once('SIGINT',stop); process.once('SIGTERM',stop); return;
  }
  if (args.command === 'restore') {
    if (typeof args.from !== 'string') throw new Error('--from backup path is required');
    process.stdout.write(`${JSON.stringify(await restoreDatabase(args.from,databasePath,{staticRoot,replace:args.replace===true}),null,2)}\n`); return;
  }
  if (['regrade','rebuild','init','account-add'].includes(args.command)) assertNotServing(databasePath);
  const supported = ['init','account-add','verify','backup','rebuild','regrade'];
  if (!supported.includes(args.command)) throw new Error('Unknown command; run help');
  const db = openDatabase(databasePath,{staticRoot,readOnly:args.command==='verify'});
  try {
    let result;
    if (args.command === 'init' || args.command === 'account-add') {
      if (typeof args.username !== 'string') throw new Error('--username is required');
      let password;
      if (args['password-stdin']===true) password = await passwordFromStdin();
      else { password = await hiddenPassword('Password (hidden): '); const confirmation = await hiddenPassword('Repeat password (hidden): '); if (password!==confirmation) throw new Error('Passwords do not match'); }
      result = await createAccount(db,{username:args.username,password,label:args.label || '默认学习档案',firstOnly:args.command==='init'});
      password = null;
    } else if (args.command === 'verify') {
      result = verifyDatabase(db); if (!result.ok) process.exitCode = 1;
    } else if (args.command === 'backup') {
      if (typeof args.out !== 'string') throw new Error('--out new backup path is required');
      result = await backupDatabase(db,args.out,{staticRoot});
    } else if (args.command === 'rebuild') result = rebuildSummaries(db);
    else {
      if (![args.profile,args.attempt,args.reason,args['grader-version']].every(value=>typeof value==='string')) throw new Error('regrade requires --profile, --attempt, --reason and --grader-version');
      const registry = await import('./assessments.mjs');
      if (args['grader-version']!==registry.GRADING_RULE_VERSION) throw new Error(`--grader-version must match the installed server registry: ${registry.GRADING_RULE_VERSION}`);
      const store = new LearningStore(db,registry);
      result = store.regrade(args.profile,args.attempt,{reason:args.reason,graderVersion:args['grader-version']});
      const validation = verifyDatabase(db); if (!validation.ok) throw new Error(`Post-regrade verification failed: ${validation.errors.join('; ')}`);
    }
    process.stdout.write(`${JSON.stringify(result,null,2)}\n`);
  } finally { db.close(); }
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main().catch(error=>{ process.stderr.write(`${error.message}\n`); process.exitCode=1; });
