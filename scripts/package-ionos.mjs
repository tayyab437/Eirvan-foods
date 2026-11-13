import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');
const distDir = path.join(rootDir, 'dist');
const publicHtmlDir = path.join(rootDir, 'public_html');

if (!fs.existsSync(distDir)) {
  console.error('Error: dist/ directory not found. Run `npm run build` first.');
  process.exit(1);
}

// Clean old compiled Vite files inside public_html while preserving api/ and .htaccess
const entries = fs.readdirSync(publicHtmlDir, { withFileTypes: true });
for (const entry of entries) {
  if (entry.name === 'api' || entry.name === '.htaccess') {
    continue;
  }
  fs.rmSync(path.join(publicHtmlDir, entry.name), { recursive: true, force: true });
}

function copyRecursive(src, dest) {
  const stat = fs.statSync(src);
  if (stat.isDirectory()) {
    fs.mkdirSync(dest, { recursive: true });
    for (const child of fs.readdirSync(src)) {
      copyRecursive(path.join(src, child), path.join(dest, child));
    }
  } else {
    fs.copyFileSync(src, dest);
  }
}

copyRecursive(distDir, publicHtmlDir);
console.log('Successfully synced Vite production build (dist/) into public_html/ while preserving PHP api/ and .htaccess.');
