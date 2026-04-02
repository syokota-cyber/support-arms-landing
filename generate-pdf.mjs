/**
 * PDF生成スクリプト
 * guide-content.html → assets/guide.pdf
 *
 * 使い方: node generate-pdf.mjs
 * 前提: Google Chromeがインストールされていること
 */
import puppeteer from 'puppeteer';
import { fileURLToPath } from 'url';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const inputPath = path.join(__dirname, 'guide-content.html');
const outputPath = path.join(__dirname, 'assets', '溶接ヒューム法規制_完全対応ガイド_岩代工業.pdf');

async function generatePDF() {
  console.log('PDF生成を開始...');

  const browser = await puppeteer.launch({
    headless: 'new',
    executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  const page = await browser.newPage();

  // Load the local HTML file
  const fileUrl = `file://${inputPath}`;
  await page.goto(fileUrl, { waitUntil: 'networkidle0', timeout: 30000 });

  // Wait for fonts to load
  await page.evaluateHandle('document.fonts.ready');
  await new Promise(r => setTimeout(r, 2000));

  // Generate PDF
  await page.pdf({
    path: outputPath,
    format: 'A4',
    printBackground: true,
    margin: { top: 0, right: 0, bottom: 0, left: 0 },
    preferCSSPageSize: true,
  });

  await browser.close();
  console.log(`PDF生成完了: ${outputPath}`);
}

generatePDF().catch(err => {
  console.error('PDF生成エラー:', err);
  process.exit(1);
});
