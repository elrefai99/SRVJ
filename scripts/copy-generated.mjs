// Cross-platform replacement for `rm -rf dist/src/generated && cp -r src/generated dist/src/`.
// tsc excludes src/generated from the build, so the Prisma client must be copied
// into dist/ after compilation. Runs identically on Windows and Linux.
import { rmSync, cpSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

const src = resolve('src/generated');
const dest = resolve('dist/src/generated');

if (!existsSync(src)) {
     console.error(`[copy-generated] source not found: ${src}\nRun \`prisma generate\` first.`);
     process.exit(1);
}

rmSync(dest, { recursive: true, force: true });
cpSync(src, dest, { recursive: true });

console.log(`[copy-generated] copied ${src} -> ${dest}`);
