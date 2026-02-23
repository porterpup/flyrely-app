/**
 * Fixes nested @tanstack/router-generator version conflicts.
 */
import { execSync } from 'child_process';
import { existsSync } from 'fs';
import { resolve, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const root = resolve(__dirname, '..');
const nodeModules = join(root, 'node_modules');

const correctVersion = join(nodeModules, '@tanstack', 'router-generator');

const nestedPaths = [
  join(nodeModules, '@tanstack', 'router-plugin', 'node_modules', '@tanstack', 'router-generator'),
];

for (const nested of nestedPaths) {
  if (existsSync(nested)) {
    console.log(`Patching nested router-generator at ${nested.replace(root, '.')}`);
    try {
      execSync(`rm -rf "${nested}" && cp -r "${correctVersion}" "${nested}"`, { stdio: 'inherit' });
    } catch (e) {
      // Try with chmod if permission denied
      execSync(`chmod -R u+w "${nested}" 2>/dev/null || true && rm -rf "${nested}" && cp -r "${correctVersion}" "${nested}"`, { stdio: 'inherit' });
    }
  }
}

console.log('✓ Nested dependency patches applied');
