import {existsSync, readFileSync} from 'node:fs';
import {join} from 'node:path';

export function runtimeConfig(root) {
  const path = join(root, 'config', 'runtime.json');
  if (!existsSync(path)) return {accountsEnabled: false};
  const config = JSON.parse(readFileSync(path, 'utf8'));
  if (config.schemaVersion !== 1 || typeof config.accountsEnabled !== 'boolean') throw Error('Invalid runtime configuration');
  return {accountsEnabled: config.accountsEnabled};
}
