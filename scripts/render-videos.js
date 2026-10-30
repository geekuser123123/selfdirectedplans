// Render the background video loops frame by frame with Chromium, then encode
// with ffmpeg (MP4/H.264 + WebM/VP9). Every animated value is periodic in the
// loop length, so the videos loop seamlessly.
// Usage: node scripts/render-videos.js   (requires ffmpeg on PATH)
const { chromium } = require('playwright');
const { execFileSync } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');

const root = path.join(__dirname, '..');
const outDir = path.join(root, 'assets', 'video');
fs.mkdirSync(outDir, { recursive: true });
const FPS = 24;

const VIDEOS = [
  {
    // Slow camera drift across the hero office photo with a soft light sweep.
    name: 'hero-loop', width: 1280, height: 876, seconds: 16,
    image: 'assets/img/hero-1216.webp',
    draw: `(ctx, t, W, H, img) => {
      const a = 2 * Math.PI * t;
      const s = 1.09 + 0.035 * Math.sin(a);
      const w = W * s, h = H * s;
      const x = (W - w) / 2 + 22 * Math.cos(a);
      const y = (H - h) / 2 + 10 * Math.sin(a);
      ctx.filter = 'saturate(0.85)';
      ctx.drawImage(img, x, y, w, h);
      ctx.filter = 'none';
      // Light sweep travels fully off-canvas at the loop seam.
      const p = -0.6 + 2.2 * t;
      const g = ctx.createLinearGradient(W * (p - 0.35), 0, W * (p + 0.35), H * 0.4);
      g.addColorStop(0, 'rgba(255,255,255,0)');
      g.addColorStop(0.5, 'rgba(255,244,228,0.11)');
      g.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, W, H);
    }`,
  },
  {
    // Flowing topographic contour lines in copper on Deep Pine.
    name: 'contours-loop', width: 1280, height: 720, seconds: 20,
    draw: `(ctx, t, W, H) => {
      const a = 2 * Math.PI * t;
      ctx.fillStyle = '#142D30';
      ctx.fillRect(0, 0, W, H);
      const lines = 22;
      for (let k = 0; k < lines; k++) {
        const base = -60 + (H + 120) * (k / (lines - 1));
        const ph = k * 0.55;
        ctx.beginPath();
        for (let x = -10; x <= W + 10; x += 6) {
          const u = x / W;
          const y = base
            + 38 * Math.sin(u * 5.2 + ph + a)
            + 22 * Math.sin(u * 9.1 - ph * 0.7 - 2 * a)
            + 14 * Math.cos(u * 2.3 + k * 0.31 + a);
          x <= -10 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
        }
        const accent = k % 4 === 1;
        ctx.strokeStyle = accent ? 'rgba(212,166,106,0.55)' : 'rgba(212,166,106,0.18)';
        ctx.lineWidth = accent ? 1.4 : 1;
        ctx.stroke();
      }
    }`,
  },
];

(async () => {
  const browser = await chromium.launch();
  for (const v of VIDEOS) {
    const frames = fs.mkdtempSync(path.join(os.tmpdir(), v.name + '-'));
    const page = await browser.newPage({ viewport: { width: v.width, height: v.height } });
    const html = path.join(root, '.video-tmp.html');
    fs.writeFileSync(html, `<style>html,body{margin:0;background:#142D30}canvas{display:block}</style>
      <canvas id="c" width="${v.width}" height="${v.height}"></canvas>
      ${v.image ? `<img id="i" src="${v.image}" style="display:none">` : ''}
      <script>
        const ctx = document.getElementById('c').getContext('2d');
        const draw = ${v.draw};
        window.frame = (t) => draw(ctx, t, ${v.width}, ${v.height}, document.getElementById('i'));
      </script>`);
    await page.goto('file://' + html);
    if (v.image) await page.waitForFunction(() => document.getElementById('i').complete);
    const total = v.seconds * FPS;
    for (let i = 0; i < total; i++) {
      await page.evaluate((t) => window.frame(t), i / total);
      await page.screenshot({ path: path.join(frames, `f${String(i).padStart(4, '0')}.jpg`), type: 'jpeg', quality: 92 });
    }
    fs.unlinkSync(html);
    await page.close();

    const input = ['-y', '-loglevel', 'error', '-framerate', String(FPS), '-i', path.join(frames, 'f%04d.jpg')];
    execFileSync('ffmpeg', [...input, '-c:v', 'libx264', '-preset', 'slow', '-crf', '27', '-pix_fmt', 'yuv420p',
      '-movflags', '+faststart', '-an', path.join(outDir, `${v.name}.mp4`)]);
    execFileSync('ffmpeg', [...input, '-c:v', 'libvpx-vp9', '-b:v', '0', '-crf', '40', '-row-mt', '1',
      '-an', path.join(outDir, `${v.name}.webm`)]);
    // Poster: first frame, for instant paint before the video loads.
    execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-i', path.join(frames, 'f0000.jpg'), '-q:v', '70',
      path.join(outDir, `${v.name}-poster.webp`)]);
    fs.rmSync(frames, { recursive: true });
    console.log('wrote', v.name);
  }
  await browser.close();
})();
