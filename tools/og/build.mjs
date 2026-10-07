#!/usr/bin/env node
// リンクプレビュー（OGP）画像の生成
//   node tools/og/build.mjs
// 元動画（リポジトリ外管理）から写真に使うフレームを切り出し、ogp.html に載せてヘッドレスChromeで 1200x630 を書き出す。
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import puppeteer from 'puppeteer';
import { SRC } from '../video/explainer/timeline.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '../..');
const WORK = fs.mkdtempSync(path.join(os.tmpdir(), 'supportarm-ogp-'));

// 伸ばしたアームを片手で支え、手を離す直前のカット（解説動画の「手を離しても止まる」と同じ場面）
const FRAME_AT = 72.4;
// 元フレーム(1920x1080)から使う範囲（1200x630 と同じ比率）。右端は壁際の箱に入るダクトの切れ目（x≈79%）が
// 見えないよう、最後のバンド（x≈73%）の先（x=76%）で切ってダクトが画面外へ続いて見えるようにする。
// 上下は作業者の顔が文字に重ならない位置まで下げる
const CROP = { x: 0, y: 140, w: 1459, h: 766 };
const PHOTO_POS = 'center';
const OUT = 'assets/images/ogp/support-arm-ogp.jpg';

const frame = path.join(WORK, 'frame.jpg');
execFileSync('ffmpeg', ['-v', 'error', '-y', '-ss', String(FRAME_AT), '-i', path.join(ROOT, SRC), '-frames:v', '1',
  '-vf', `crop=${CROP.w}:${CROP.h}:${CROP.x}:${CROP.y}`, '-q:v', '2', frame]);

const browser = await puppeteer.launch({ headless: true, args: ['--allow-file-access-from-files'] });
const page = await browser.newPage();
await page.setViewport({ width: 1200, height: 630, deviceScaleFactor: 1 });
const url = `${pathToFileURL(path.join(HERE, 'ogp.html'))}?photo=${encodeURIComponent(pathToFileURL(frame))}&pos=${encodeURIComponent(PHOTO_POS)}`;
await page.goto(url, { waitUntil: 'networkidle0' });
await page.evaluate(() => window.ready);
const out = path.join(ROOT, OUT);
fs.mkdirSync(path.dirname(out), { recursive: true });
await page.screenshot({ path: out, type: 'jpeg', quality: 88 });
await browser.close();
fs.rmSync(WORK, { recursive: true, force: true });
console.log(`${OUT}  ${(fs.statSync(out).size / 1e3).toFixed(0)} KB`);
