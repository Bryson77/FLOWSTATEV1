import fs from 'node:fs';
import path from 'node:path';

// OpenNext expects pages-manifest.json even in App-Router-only Next.js 15 apps
const manifestPaths = [
  path.resolve('.next/server/pages-manifest.json'),
  path.resolve('.next/standalone/apps/web/.next/server/pages-manifest.json'),
  path.resolve('.next/standalone/.next/server/pages-manifest.json'),
];

for (const p of manifestPaths) {
  try {
    const dir = path.dirname(p);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    if (!fs.existsSync(p)) {
      fs.writeFileSync(p, JSON.stringify({}));
      console.log('Created placeholder pages-manifest.json at:', p);
    }
  } catch (err) {
    console.warn('Could not create placeholder manifest:', err);
  }
}
