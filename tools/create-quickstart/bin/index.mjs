
#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const kind = process.argv[2] ?? 'js';
const root = path.resolve(process.cwd(), '..', '..'); // monorepo root
if (kind === 'js') {
  const src = path.join(root, 'examples/hello-gnew-js');
  const dst = path.resolve(process.cwd(), 'hello-gnew-js');
  cpDir(src, dst);
  console.log('✔ JS quickstart scaffolded at', dst);
} else {
  const src = path.join(root, 'examples/hello-gnew-py');
  const dst = path.resolve(process.cwd(), 'hello-gnew-py');
  cpDir(src, dst);
  console.log('✔ PY quickstart scaffolded at', dst);
}

function cpDir(src, dst) {
  fs.mkdirSync(dst, { recursive: true });
  for (const e of fs.readdirSync(src)) {
    const s = path.join(src, e), d = path.join(dst, e);
    const st = fs.statSync(s);
    if (st.isDirectory()) cpDir(s, d);
    else fs.copyFileSync(s, d);
  }
}

Validación en entorno limpio (CI)

