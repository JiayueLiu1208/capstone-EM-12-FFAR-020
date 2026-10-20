// Inline the shared engines into each page.
//   dist/artifact/<name>.html   fragment for the Artifact host (it adds the document skeleton)
//   dist/site/<name>.html       complete standalone page for any static host (GitHub Pages etc.)
import fs from 'fs';
const lib = Object.fromEntries(['plotter.js', 'arm3d.js', 'hero-3d.js'].map((n) => [n, fs.readFileSync(`src/${n}`, 'utf8')]));
// comparison variant: the portrait page with the arm below the title
const portrait = fs.readFileSync('src/portrait.html', 'utf8');
fs.writeFileSync('src/portrait-bottom.html', portrait.replace('const ARM_AT_TOP = true;', 'const ARM_AT_TOP = false;'));
// 3D variant: same page, with three.js and the 3D hero loaded ahead of the page script
fs.writeFileSync('src/portrait-3d.html', portrait.replace('<script src="plotter.js"></script>',
  '<script src="https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js"></script>\n<script src="plotter.js"></script>\n<script src="arm3d.js"></script>\n<script src="hero-3d.js"></script>'));
const pages = fs.readdirSync('src').filter((f) => f.endsWith('.html'));
fs.mkdirSync('dist/artifact', { recursive: true });
fs.mkdirSync('dist/site', { recursive: true });
if (fs.existsSync('src/media')) fs.cpSync('src/media', 'dist/site/media', { recursive: true });
for (const f of pages) {
  let html = fs.readFileSync(`src/${f}`, 'utf8');
  for (const [name, code] of Object.entries(lib)) {
    html = html.replace(`<script src="${name}"></script>`, () => `<script>\n${code}</script>`);
  }
  if (/<script src="(plotter|arm3d|hero-3d)\.js">/.test(html)) throw new Error(`${f}: engine tag left over`);
  fs.writeFileSync(`dist/artifact/${f}`, html);
  const cut = html.indexOf('</style>') + '</style>'.length;
  fs.writeFileSync(`dist/site/${f}`,
    `<!doctype html>\n<html lang="en">\n<head>\n<meta charset="utf-8">\n<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">\n` +
    `${html.slice(0, cut)}\n</head>\n<body>\n${html.slice(cut)}\n</body>\n</html>\n`);
  console.log('built', f, `${(html.length / 1024).toFixed(0)} KB`);
}

// GitHub Pages serves the repository root. Keep its homepage and assets in sync.
fs.copyFileSync('dist/site/apple.html', 'index.html');
fs.cpSync('src/media', 'media', { recursive: true });
fs.writeFileSync('.nojekyll', '');
console.log('published files ready: index.html and media/');
