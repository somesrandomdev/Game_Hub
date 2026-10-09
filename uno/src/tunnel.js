'use strict';

// Online mode: a Cloudflare quick tunnel gives this PC a public https://….trycloudflare.com
// address. No account, no router port forwarding. cloudflared is used from PATH, or
// downloaded once into ./bin on Windows/Linux.

const { spawn, spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const BIN_DIR = path.join(__dirname, '..', 'bin');
const RELEASES = 'https://github.com/cloudflare/cloudflared/releases/latest/download/';
const URL_RE = /https:\/\/[a-z0-9-]+\.trycloudflare\.com/i;

function onPath() {
  const r = spawnSync('cloudflared', ['--version'], { stdio: 'ignore', windowsHide: true });
  return r.status === 0;
}

function assetName() {
  const arch = { x64: 'amd64', arm64: 'arm64', ia32: '386', arm: 'arm' }[process.arch];
  if (!arch) return null;
  if (process.platform === 'win32') return `cloudflared-windows-${arch}.exe`;
  if (process.platform === 'linux') return `cloudflared-linux-${arch}`;
  return null; // macOS ships as a .tgz: `brew install cloudflared` is simpler
}

async function findCloudflared(log) {
  if (onPath()) return 'cloudflared';
  const asset = assetName();
  if (!asset) throw new Error('Install cloudflared first (macOS: brew install cloudflared), then run again.');
  const file = path.join(BIN_DIR, process.platform === 'win32' ? 'cloudflared.exe' : 'cloudflared');
  if (fs.existsSync(file)) return file;

  log(`  Downloading cloudflared (one time, ~20 MB)...`);
  const res = await fetch(RELEASES + asset);
  if (!res.ok) throw new Error(`Download failed (HTTP ${res.status}). Check the internet connection.`);
  fs.mkdirSync(BIN_DIR, { recursive: true });
  const tmp = `${file}.part`;
  fs.writeFileSync(tmp, Buffer.from(await res.arrayBuffer()));
  fs.renameSync(tmp, file);
  if (process.platform !== 'win32') fs.chmodSync(file, 0o755);
  return file;
}

// Starts the tunnel and keeps it up. onUrl fires with each new public URL
// (a restarted quick tunnel gets a new address).
async function startTunnel(port, { onUrl, log = console.log } = {}) {
  const bin = await findCloudflared(log);
  let child = null;
  let stopped = false;
  let failures = 0;

  const run = () => {
    let found = false;
    child = spawn(bin, ['tunnel', '--no-autoupdate', '--url', `http://localhost:${port}`], { windowsHide: true });
    const scan = chunk => {
      if (found) return;
      const m = String(chunk).match(URL_RE);
      if (m) { found = true; failures = 0; onUrl?.(m[0]); }
    };
    child.stdout.on('data', scan);
    child.stderr.on('data', scan);
    child.on('error', err => log(`  Tunnel error: ${err.message}`));
    child.on('exit', () => {
      if (stopped) return;
      onUrl?.(null);
      failures++;
      const wait = Math.min(30, 2 ** failures);
      log(`  Online link dropped, reconnecting in ${wait}s...`);
      setTimeout(() => { if (!stopped) run(); }, wait * 1000);
    });
  };
  run();

  const stop = () => { stopped = true; child?.kill(); };
  process.on('exit', stop);
  for (const sig of ['SIGINT', 'SIGTERM', 'SIGHUP']) process.on(sig, () => { stop(); process.exit(0); });
  return { stop };
}

module.exports = { startTunnel };
