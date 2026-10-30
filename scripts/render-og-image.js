// Render the 1200x630 Open Graph image. Usage: node scripts/render-og-image.js
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const url = (p) => 'file://' + path.join(root, p);

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1200, height: 630 } });
  // Load from a temporary file so file:// fonts and images resolve.
  const tmp = path.join(root, '.og-tmp.html');
  fs.writeFileSync(tmp, `
    <style>
      @font-face { font-family: Teko; font-weight: 500; src: url(${url('assets/fonts/teko-latin-500-normal.woff2')}); }
      @font-face { font-family: Poppins; font-weight: 500; src: url(${url('assets/fonts/poppins-latin-500-normal.woff2')}); }
      body { margin: 0; width: 1200px; height: 630px; background: #142D30; position: relative; overflow: hidden; }
      .img { position: absolute; inset: 0 0 0 52%; background: url(${url('assets/img/hero-960.webp')}) 40% center / cover; }
      .img::after { content: ""; position: absolute; inset: 0; background: linear-gradient(90deg, #142D30, rgba(20,45,48,.35) 55%, rgba(20,45,48,.15)); }
      .copy { position: absolute; left: 80px; top: 92px; }
      .copy img { width: 300px; }
      h1 { font: 500 112px/0.88 Teko; color: #fff; text-transform: uppercase; margin: 64px 0 0; }
      h1 span { color: #D4A66A; display: block; }
      .line { position: absolute; left: 0; bottom: 72px; width: 360px; height: 1px; background: #D4A66A; }
    </style>
    <div class="img"></div>
    <div class="copy">
      <img src="${url('assets/brand/northvale-logo-dark-bg.svg')}">
      <h1>More Control.<span>More Possibility.</span></h1>
    </div>
    <div class="line"></div>`);
  await page.goto('file://' + tmp);
  fs.unlinkSync(tmp);
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(300);
  await page.screenshot({ path: path.join(root, 'assets/img/og-image.jpg'), type: 'jpeg', quality: 85 });
  await browser.close();
  console.log('wrote assets/img/og-image.jpg');
})();
