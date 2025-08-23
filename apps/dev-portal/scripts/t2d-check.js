
#!/usr/bin/env node
/**
 * T2D checker: validates that a quickstart runs on a clean machine in <10 min.
 * It:
 *  - installs deps
 *  - runs the example
 *  - asserts known outputs
 *  - prints a single JSON with timings and pass/fail
 */
const { execSync } = require('node:child_process');
const { performance } = require('node:perf_hooks');
const path = require('node:path');
const fs = require('node:fs');

function run(cmd, cwd) {
  return execSync(cmd, { stdio: 'pipe', cwd, env: process.env });
}

(async () => {
  const example = process.argv.includes('--example') ? process.argv[process.argv.indexOf('--example') + 1] : 'js';
  const start = performance.now();
  const root = path.resolve(__dirname, '../../..');
  const dir = example === 'py'
    ? path.join(root, 'examples/hello-gnew-py')
    : path.join(root, 'examples/hello-gnew-js');

  const out = { example, steps: [], ok: false, minutes: 0 };

  try {
    if (example === 'py') {
      run('python -m venv .venv', dir);
      const act = process.platform === 'win32' ? '.venv\\Scripts\\activate && ' : 'source .venv/bin/activate && ';
      run(`${act}pip install -e ../../packages/sdk-python`, dir);
      const res = run(`${act}python main.py`, dir).toString();
      out.steps.push({ step: 'run', output: res.slice(-400) });
      if (!/health:\s*ok/i.test(res) || !/echo:\s*pong/i.test(res)) throw new Error('Unexpected output');
    } else {
      run('pnpm i', dir);
      const res = run('pnpm start', dir).toString();
      out.steps.push({ step: 'run', output: res.slice(-400) });
      if (!/health:\s*ok/i.test(res) || !/echo:\s*pong/i.test(res)) throw new Error('Unexpected output');
    }
    out.ok = true;
  } catch (e) {
    out.steps.push({ step: 'error', error: String(e) });
  } finally {
    out.minutes = (performance.now() - start) / 60000;
    console.log(JSON.stringify(out, null, 2));
    process.exit(out.ok && out.minutes <= 10 ? 0 : 1);
  }
})();


