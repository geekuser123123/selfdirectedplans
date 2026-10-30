// Render transparent PNGs of the brand SVGs with the pre-installed Chromium.
// Usage: node scripts/render-logo-png.js
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const dir = path.join(__dirname, '..', 'assets', 'brand');
const jobs = [
  ['northvale-logo-dark-bg.svg', 'northvale-logo-dark-bg.png', 4],
  ['northvale-logo-light-bg.svg', 'northvale-logo-light-bg.png', 4],
  ['northvale-icon.svg', 'northvale-icon-512.png', 512 / 48],
  ['northvale-icon-light.svg', 'northvale-icon-light-512.png', 512 / 48],
  ['favicon.svg', 'apple-touch-icon.png', 180 / 48],
  ['favicon.svg', 'favicon-32.png', 32 / 48],
  ['favicon.svg', 'icon-192.png', 192 / 48],
];

(async () => {
  const browser = await chromium.launch();
  for (const [src, out, scale] of jobs) {
    const svg = fs.readFileSync(path.join(dir, src), 'utf8');
    const [, w, h] = svg.match(/viewBox="0 0 ([\d.]+) ([\d.]+)"/).map(Number);
    const page = await browser.newPage({
      viewport: { width: Math.ceil(w), height: Math.ceil(h) },
      deviceScaleFactor: scale,
    });
    await page.setContent(`<style>html,body{margin:0;background:transparent}svg{display:block}</style>${svg}`);
    await page.screenshot({ path: path.join(dir, out), omitBackground: true });
    await page.close();
    console.log('wrote', out);
  }
  await browser.close();
})();
