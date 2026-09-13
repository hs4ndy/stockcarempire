/* Build a single-file, offline version of Stock Car Empire for local play. */
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const sourceHtml = path.join(root, 'index.html');
const outDir = path.join(root, 'releases');
const outFile = path.join(outDir, 'Stock-Car-Empire.html');
const threeSource = path.join(root, 'node_modules', 'three', 'build', 'three.min.js');

function readRelative(source) {
  if (source === 'https://cdnjs.cloudflare.com/ajax/libs/three.js/r134/three.min.js') {
    return fs.readFileSync(threeSource, 'utf8');
  }
  if (/^https?:\/\//i.test(source)) {
    throw new Error(`The standalone build cannot embed remote script: ${source}`);
  }
  return fs.readFileSync(path.resolve(root, source), 'utf8');
}

let html = fs.readFileSync(sourceHtml, 'utf8');
const css = fs.readFileSync(path.join(root, 'style.css'), 'utf8');

// A local copy must not depend on Google Fonts. The existing system fallbacks
// in style.css preserve legibility when the original web fonts are unavailable.
html = html.replace(/\s*<link rel="preconnect"[^>]*>\s*/g, '\n');
html = html.replace(/\s*<link href="https:\/\/fonts\.googleapis\.com[^>]*>\s*/g, '\n');
html = html.replace(
  /<link rel="stylesheet" href="style\.css">/,
  `<style>\n${css}\n</style>`,
);
html = html.replace(/<script\s+src="([^"]+)"\s*><\/script>/g, (_tag, source) => {
  const code = readRelative(source);
  if (/<\/script/i.test(code)) {
    throw new Error(`Cannot safely embed ${source}: it contains a closing script tag.`);
  }
  return `<script>\n/* ${source} */\n${code}\n</script>`;
});

if (/<script\s+src=/i.test(html) || /<link[^>]+href=/i.test(html)) {
  throw new Error('Standalone build still contains a remote or external dependency.');
}

fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(outFile, html, 'utf8');
console.log(`Built ${path.relative(root, outFile)} (${Math.ceil(fs.statSync(outFile).size / 1024)} KiB)`);
