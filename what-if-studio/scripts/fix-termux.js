const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');

const studio = path.resolve(__dirname, '..');
const nm = path.join(studio, 'node_modules');
const prefix = process.env.PREFIX || '/data/data/com.termux/files/usr';
const glibcLib = path.join(prefix, 'glibc', 'lib');
const ldso = path.join(glibcLib, 'ld-linux-aarch64.so.1');
const browser = process.env.REMOTION_BROWSER_EXECUTABLE || path.join(prefix, 'lib', 'chromium', 'headless_shell');
const compositor = path.join(nm, '@remotion', 'compositor-linux-arm64-gnu');

function read(p) {
  return fs.readFileSync(p, 'utf8');
}

function write(p, s) {
  fs.writeFileSync(p, s);
}

function fixShebangs() {
  const env = path.join(prefix, 'bin', 'env');
  const binDir = path.join(nm, '.bin');
  if (!fs.existsSync(binDir)) return;

  const seen = new Set();
  for (const name of fs.readdirSync(binDir)) {
    let target;
    try {
      target = fs.realpathSync(path.join(binDir, name));
    } catch {
      continue;
    }
    if (seen.has(target)) continue;
    seen.add(target);

    const text = read(target);
    if (!text.startsWith('#!')) continue;
    const nl = text.indexOf('\n');
    const first = text.slice(0, nl === -1 ? text.length : nl);
    if (!/^#!\s*\/usr\/bin\/env\b/.test(first)) continue;

    const rest = first.replace(/^#!\s*\/usr\/bin\/env\s*/, '');
    write(target, `#!${env} ${rest}`.trimEnd() + (nl === -1 ? '' : text.slice(nl)));
    console.log('fixed shebang:', path.relative(studio, target));
  }
}

function patchRspack() {
  const p = path.join(nm, '@remotion', 'bundler', 'dist', 'rspack-config.js');
  if (!fs.existsSync(p)) return;
  let s = read(p);
  if (s.includes('getRspack')) return;

  s = s.replace(
    'const core_1 = require("@rspack/core");',
    'const getRspack = () => require("@rspack/core").rspack;',
  );
  s = s.replace(
    'const plugin_react_refresh_1 = __importDefault(require("@rspack/plugin-react-refresh"));',
    'const getPluginReactRefresh = () => { const mod = require("@rspack/plugin-react-refresh"); return mod.default || mod; };',
  );
  s = s.replace(/new plugin_react_refresh_1\.default\(/g, 'new (getPluginReactRefresh())(');
  s = s.replace(/new core_1\.rspack\.HotModuleReplacementPlugin\(\)/g, 'new (getRspack().HotModuleReplacementPlugin)()');
  s = s.replace(/new core_1\.ProgressPlugin\(/g, 'new (getRspack().ProgressPlugin)(');
  s = s.replace(/return \(0, core_1\.rspack\)\(config\);/g, 'return (getRspack())(config);');
  write(p, s);
  console.log('patched rspack to load lazily');
}

function patchCompositorPath() {
  const p = path.join(nm, '@remotion', 'renderer', 'dist', 'compositor', 'get-executable-path.js');
  if (!fs.existsSync(p)) return;
  let s = read(p);
  if (s.includes("case 'android':")) return;

  const original = "        default:\n            throw new Error(`Unsupported OS: ${process.platform}, architecture: ${process.arch}`);";
  const replacement = [
    "        case 'android':",
    '            switch (process.arch) {',
    "                case 'arm64':",
    "                    return require('@remotion/compositor-linux-arm64-gnu').dir;",
    '                default:',
    '                    throw new Error(`Unsupported architecture on Android: ${process.arch}`);',
    '            }',
    original,
  ].join('\n');

  if (!s.includes(original)) return;
  s = s.replace(original, replacement);
  write(p, s);
  console.log('patched compositor path for Android');
}

function patchBrowserFallback() {
  const files = [
    ['ensure-browser.js', 'fs_1.default.existsSync'],
    ['get-local-browser-executable.js', 'node_fs_1.default.existsSync'],
  ];

  for (const [file, exists] of files) {
    const p = path.join(nm, '@remotion', 'renderer', 'dist', file);
    if (!fs.existsSync(p)) continue;
    let s = read(p);
    if (s.includes('REMOTION_BROWSER_EXECUTABLE')) continue;

    const needle = '    const revision = (0, BrowserFetcher_1.getRevisionInfo)(chromeMode);';
    if (!s.includes(needle)) continue;

    const insert = [
      "    if (process.platform === 'android') {",
      `        const androidBrowser = process.env.REMOTION_BROWSER_EXECUTABLE || '${browser}';`,
      `        if (${exists}(androidBrowser)) {`,
      "            return { path: androidBrowser, type: 'user-defined-path' };",
      '        }',
      '    }',
      needle,
    ].join('\n');

    s = s.replace(needle, insert);
    write(p, s);
    console.log('patched Android browser fallback in', file);
  }
}

function ensureCompositor() {
  const version = JSON.parse(read(path.join(nm, '@remotion', 'renderer', 'package.json'))).version;

  if (!fs.existsSync(path.join(compositor, 'remotion.bin'))) {
    if (!fs.existsSync(path.join(compositor, 'remotion'))) {
      const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'remotion-compositor-'));
      const tgz = execFileSync('npm', ['pack', `@remotion/compositor-linux-arm64-gnu@${version}`], {
        cwd: tmp,
        encoding: 'utf8',
      })
        .trim()
        .split('\n')
        .pop();
      execFileSync('tar', ['-xzf', path.join(tmp, tgz), '-C', tmp]);
      fs.mkdirSync(compositor, { recursive: true });
      fs.cpSync(path.join(tmp, 'package'), compositor, { recursive: true });
      fs.rmSync(tmp, { recursive: true, force: true });
      console.log('installed compositor', version);
    }

    for (const name of ['remotion', 'ffmpeg', 'ffprobe']) {
      const real = path.join(compositor, `${name}.bin`);
      if (!fs.existsSync(real)) fs.renameSync(path.join(compositor, name), real);
    }
  }

  for (const name of ['remotion', 'ffmpeg', 'ffprobe']) {
    const wrapper = path.join(compositor, name);
    const body = [
      '#!/data/data/com.termux/files/usr/bin/sh',
      'DIR=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)',
      `exec ${ldso} --library-path "$DIR:${glibcLib}" "$DIR/${name}.bin" "$@"`,
      '',
    ].join('\n');
    if (!fs.existsSync(wrapper) || !read(wrapper).startsWith('#!/data/data/com.termux/files/usr/bin/sh')) {
      write(wrapper, body);
    }
    fs.chmodSync(wrapper, 0o700);
  }
  console.log('compositor wrappers ready');
}

function main() {
  if (!fs.existsSync(nm)) {
    console.error('node_modules not found. Run npm install first.');
    process.exit(1);
  }
  if (process.platform !== 'android') {
    console.log('Not Android, nothing to fix.');
    return;
  }
  fixShebangs();
  patchRspack();
  patchCompositorPath();
  patchBrowserFallback();
  ensureCompositor();
  console.log('Termux fixes applied.');
}

main();
