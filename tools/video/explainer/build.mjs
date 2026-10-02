#!/usr/bin/env node
// サポートアーム解説動画のビルド
//   node tools/video/explainer/build.mjs                 # full / hero を両方レンダリングして書き出し
//   node tools/video/explainer/build.mjs --only=full     # 片方だけ
//   node tools/video/explainer/build.mjs --stills=3,12.5 # 指定秒の静止画だけ確認用に出力（--only と併用）
//   node tools/video/explainer/build.mjs --from=10 --to=20 --only=full  # 区間プレビュー（書き出しは work/ のみ）
// 作業ファイルは WORK_DIR（既定: OS の一時ディレクトリ）に置く。元動画はリポジトリ外管理。
import { spawn, execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import puppeteer from 'puppeteer';
import { SRC, STILLS, TIMELINES, resolve } from './timeline.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '../../..');
const WORK = process.env.WORK_DIR || path.join(os.tmpdir(), 'supportarm-explainer');
const args = Object.fromEntries(process.argv.slice(2).map((a) => {
  const [k, v] = a.replace(/^--/, '').split('=');
  return [k, v ?? true];
}));

const OUTPUTS = {
  full: { dir: 'assets/videos/explainer', base: 'supportarm-explainer', posterAt: 7.2 },
  hero: { dir: 'assets/videos/hero', base: 'supportarm-hero-loop', posterAt: 0 },
};

const ff = (argv) => execFileSync('ffmpeg', ['-v', 'error', '-y', ...argv], { stdio: 'inherit' });

function extractScene(sc, fps) {
  if (!sc.src && sc.src !== 0) return 0;
  const dir = path.join(WORK, 'frames', sc.id);
  const key = JSON.stringify({ src: sc.src, speed: sc.speed, clipDur: sc.clipDur, still: !!sc.still, fps });
  const keyFile = path.join(dir, 'key.json');
  if (fs.existsSync(keyFile) && fs.readFileSync(keyFile, 'utf8') === key) {
    return fs.readdirSync(dir).filter((f) => f.endsWith('.jpg')).length;
  }
  fs.rmSync(dir, { recursive: true, force: true });
  fs.mkdirSync(dir, { recursive: true });
  const srcDur = sc.still ? 0.1 : sc.clipDur * sc.speed + 0.3;
  ff([
    '-ss', String(sc.src), '-i', path.join(ROOT, SRC), '-t', srcDur.toFixed(3),
    '-vf', `setpts=(PTS-STARTPTS)/${sc.speed},fps=${fps},scale=1920:1080`,
    ...(sc.still ? ['-frames:v', '1'] : []),
    '-q:v', '2', '-start_number', '0', path.join(dir, '%05d.jpg'),
  ]);
  fs.writeFileSync(keyFile, key);
  return fs.readdirSync(dir).filter((f) => f.endsWith('.jpg')).length;
}

function extractStills() {
  const dir = path.join(WORK, 'frames', 'stills');
  fs.mkdirSync(dir, { recursive: true });
  for (const [name, s] of Object.entries(STILLS)) {
    const out = path.join(dir, `${name}.jpg`);
    if (fs.existsSync(out)) continue;
    const { x, y, w, h } = s.crop;
    ff(['-ss', String(s.t), '-i', path.join(ROOT, SRC), '-frames:v', '1', '-vf', `crop=${w}:${h}:${x}:${y},scale=580:596`, '-q:v', '2', out]);
  }
}

async function render(name) {
  const tl = resolve(TIMELINES[name]);
  for (const sc of tl.scenes) sc.frames = extractScene(sc, tl.fps);
  extractStills();
  tl.base = pathToFileURL(path.join(WORK, 'frames')).href;
  const total = Math.round(tl.duration * tl.fps);
  console.log(`[${name}] duration ${tl.duration.toFixed(2)}s, ${total} frames`);

  const browser = await puppeteer.launch({ headless: true, args: ['--allow-file-access-from-files', '--disable-web-security'] });
  const page = await browser.newPage();
  await page.setViewport({ width: 1920, height: 1080, deviceScaleFactor: 1 });
  await page.goto(pathToFileURL(path.join(HERE, 'compositor.html')).href, { waitUntil: 'networkidle0' });
  await page.evaluate(async () => { await document.fonts.ready; });
  await page.evaluate((t) => window.setTimeline(t), tl);
  // フォントの全ウェイトを先に読み込ませる
  await page.evaluate(async () => {
    await Promise.all(['500', '700', '900'].map((w) => document.fonts.load(`${w} 40px "Noto Sans JP"`, 'あア漢')));
    await document.fonts.load('italic 800 40px "Barlow Condensed"', '0123');
    await document.fonts.load('600 40px "Barlow Condensed"', 'ABC');
  });

  const shot = async (i) => {
    await page.evaluate((t, n) => window.renderFrame(t, n), i / tl.fps, i);
    return page.screenshot({ type: 'jpeg', quality: 95, optimizeForSpeed: true });
  };

  fs.mkdirSync(path.join(WORK, 'out'), { recursive: true });
  if (args.stills) {
    for (const s of String(args.stills).split(',')) {
      const buf = await shot(Math.round(parseFloat(s) * tl.fps));
      const f = path.join(WORK, 'out', `${name}_${s}.jpg`);
      fs.writeFileSync(f, buf);
      console.log(f);
    }
    await browser.close();
    return;
  }

  const from = args.from ? Math.round(parseFloat(args.from) * tl.fps) : 0;
  const to = args.to ? Math.min(total, Math.round(parseFloat(args.to) * tl.fps)) : total;
  const preview = from !== 0 || to !== total;
  const master = path.join(WORK, 'out', `${name}${preview ? '_preview' : ''}_master.mp4`);
  const enc = spawn('ffmpeg', ['-v', 'error', '-y', '-f', 'image2pipe', '-framerate', String(tl.fps), '-c:v', 'mjpeg', '-i', '-',
    '-c:v', 'libx264', '-crf', '12', '-preset', 'medium', '-pix_fmt', 'yuv420p', master], { stdio: ['pipe', 'inherit', 'inherit'] });
  const done = new Promise((res, rej) => enc.on('close', (c) => (c === 0 ? res() : rej(new Error(`ffmpeg exit ${c}`)))));
  const t0 = Date.now();
  for (let i = from; i < to; i++) {
    const buf = await shot(i);
    if (!enc.stdin.write(buf)) await new Promise((r) => enc.stdin.once('drain', r));
    if (i % 60 === 0) process.stdout.write(`\r[${name}] ${i}/${to} (${((Date.now() - t0) / 1000).toFixed(0)}s)`);
  }
  enc.stdin.end();
  await done;
  await browser.close();
  console.log(`\n[${name}] master: ${master}`);
  if (preview) return;

  // 配信用に書き出し（無音・faststart）
  const o = OUTPUTS[name];
  const outDir = path.join(ROOT, o.dir);
  fs.mkdirSync(outDir, { recursive: true });
  const common = ['-an', '-c:v', 'libx264', '-preset', 'slow', '-profile:v', 'high', '-pix_fmt', 'yuv420p', '-movflags', '+faststart'];
  // 目標: full 1080≦12MB / 720≦6MB、hero 1080≦4MB / 720≦2MB（Cloudflare Pages の 25MiB 上限に対して十分な余裕）
  ff(['-i', master, '-vf', 'scale=1920:1080', '-crf', '26', '-maxrate', '2.2M', '-bufsize', '4.4M', ...common, path.join(outDir, `${o.base}-1080.mp4`)]);
  ff(['-i', master, '-vf', 'scale=1280:720', '-crf', '27', '-maxrate', '1.1M', '-bufsize', '2.2M', ...common, path.join(outDir, `${o.base}-720.mp4`)]);
  ff(['-ss', String(o.posterAt), '-i', master, '-frames:v', '1', '-vf', 'scale=1280:720', '-q:v', '4', path.join(outDir, `${o.base}-poster.jpg`)]);
  for (const f of fs.readdirSync(outDir).filter((f) => f.startsWith(o.base))) {
    console.log(`  ${o.dir}/${f}  ${(fs.statSync(path.join(outDir, f)).size / 1e6).toFixed(2)} MB`);
  }
}

const names = args.only ? String(args.only).split(',') : ['full', 'hero'];
for (const n of names) await render(n);
