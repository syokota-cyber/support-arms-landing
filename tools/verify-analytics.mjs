/**
 * GA4 計測の自動検証スクリプト
 *
 * ローカルの静的サーバに対して Puppeteer でページを開き、
 * dataLayer に push された gtag イベントを捕捉して検証する。
 *
 * 実運用の GA4 に一切ヒットを飛ばさないよう、google-analytics / googletagmanager
 * へのリクエストは全て abort する（gtag() 自体は dataLayer への push なので動く）。
 *
 * 使い方:
 *   python3 -m http.server 8899   # リポジトリルートで
 *   node tools/verify-analytics.mjs [--url http://localhost:8899/index.html] [--headful]
 */

import puppeteer from 'puppeteer';

const args = process.argv.slice(2);
const getArg = (name, fallback) => {
  const i = args.indexOf(name);
  return i !== -1 && args[i + 1] ? args[i + 1] : fallback;
};
const URL = getArg('--url', 'http://localhost:8899/index.html');
const HEADFUL = args.includes('--headful');
const MOBILE = args.includes('--mobile');
const VIEWPORT = MOBILE
  ? { width: 390, height: 844, isMobile: true, hasTouch: true, deviceScaleFactor: 2 }
  : { width: 1280, height: 900 };

const BLOCK_HOSTS = [
  'google-analytics.com',
  'googletagmanager.com',
  'analytics.google.com',
  'youtube.com',
  'ytimg.com',
  'doubleclick.net',
];

// ---------- 検証結果の集計 ----------
const results = [];
const check = (name, ok, detail = '') => {
  results.push({ name, ok, detail });
  const mark = ok ? '\x1b[32m PASS \x1b[0m' : '\x1b[31m FAIL \x1b[0m';
  console.log(`${mark} ${name}${detail ? `\n         ${detail}` : ''}`);
};

const setup = async (page) => {
  await page.setRequestInterception(true);
  page.on('request', (req) => {
    const url = req.url();
    if (BLOCK_HOSTS.some((h) => url.includes(h))) return req.abort();
    req.continue();
  });

  // ページの全スクリプトより先に dataLayer をフックする
  await page.evaluateOnNewDocument(() => {
    window.__gaEvents = [];
    window.__gaAll = [];
    const dl = [];
    const origPush = dl.push.bind(dl);
    dl.push = function (...items) {
      for (const item of items) {
        // gtag() は arguments オブジェクトを push する
        if (item && typeof item === 'object' && item[0] === 'event') {
          const rec = { name: item[1], params: item[2] || {} };
          window.__gaEvents.push(rec);
          window.__gaAll.push(rec);
        }
      }
      return origPush(...items);
    };
    window.dataLayer = dl;

    // ページ遷移・ファイルDLで検証が止まらないようにする
    window.__navAttempts = [];
    document.addEventListener(
      'click',
      (e) => {
        const a = e.target.closest && e.target.closest('a');
        if (a && a.getAttribute('href')) {
          const href = a.getAttribute('href');
          if (!href.startsWith('#')) {
            window.__navAttempts.push(href);
            e.preventDefault();
          }
        }
      },
      true,
    );
  });
};

const events = (page) => page.evaluate(() => window.__gaEvents);
const eventsNamed = async (page, name) =>
  (await events(page)).filter((e) => e.name === name);
const clearEvents = (page) => page.evaluate(() => (window.__gaEvents = []));
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const clipStr = (t, n = 160) => (t.length > n ? `${t.slice(0, n)}…` : t);

// ---------- シナリオ ----------

/** ページ全体をゆっくりスクロールし、各セクションを一定時間表示する */
const scrollThroughSections = async (page, dwellMs = 1300) => {
  const ids = await page.evaluate(() =>
    Array.from(document.querySelectorAll('section[id]')).map((s) => s.id),
  );
  for (const id of ids) {
    await page.evaluate((sectionId) => {
      const el = document.getElementById(sectionId);
      if (el) el.scrollIntoView({ block: 'center', behavior: 'instant' });
    }, id);
    await wait(dwellMs);
  }
  return ids;
};

/** タブの可視状態を切り替える（visibilityState は読み取り専用なので差し替える） */
const setVisibility = async (page, state) => {
  await page.evaluate((v) => {
    Object.defineProperty(document, 'visibilityState', {
      configurable: true,
      get: () => v,
    });
    Object.defineProperty(document, 'hidden', {
      configurable: true,
      get: () => v === 'hidden',
    });
    document.dispatchEvent(new Event('visibilitychange'));
  }, state);
  await wait(200);
};

/** 離脱シグナルを発火させて、まとめ送信されるイベントを取り出す */
const firePageHide = async (page) => {
  await setVisibility(page, 'hidden');
  await page.evaluate(() => window.dispatchEvent(new Event('pagehide')));
  await wait(200);
};

const clickAndCollect = async (page, selector, label) => {
  await clearEvents(page);
  const found = await page.evaluate((sel) => {
    const el = document.querySelector(sel);
    if (!el) return false;
    el.scrollIntoView({ block: 'center', behavior: 'instant' });
    el.click();
    return true;
  }, selector);
  if (!found) return { found: false, events: [] };
  await wait(250);
  // scrollIntoView に伴う scroll_depth はクリック起因ではないので除外する
  const fired = (await events(page)).filter((e) => e.name !== 'scroll_depth');
  return { found: true, events: fired };
};

// ---------- メイン ----------
const main = async () => {
  const browser = await puppeteer.launch({
    headless: !HEADFUL,
    args: ['--no-sandbox', '--disable-dev-shm-usage'],
  });

  try {
    const page = await browser.newPage();
    await page.setViewport(VIEWPORT);
    const consoleErrors = [];
    page.on('console', (m) => {
      // ブロックした外部ホスト(GA/YouTube)由来の読み込み失敗はノイズなので除外
      const t = m.text();
      if (m.type() === 'error' && !t.includes('Failed to load resource')) {
        consoleErrors.push(t);
      }
    });
    page.on('pageerror', (e) => consoleErrors.push(`pageerror: ${e.message}`));

    await setup(page);
    await page.goto(URL, { waitUntil: 'networkidle2', timeout: 30000 });
    await wait(500);

    console.log(
      `\n=== 検証対象: ${URL} (${MOBILE ? 'モバイル 390x844' : 'デスクトップ 1280x900'}) ===\n`,
    );

    // --- 1. セクション閲覧 ---
    const sectionIds = await scrollThroughSections(page);
    const viewEvents = await eventsNamed(page, 'section_view');
    const viewedIds = [...new Set(viewEvents.map((e) => e.params.section_id))];
    const missing = sectionIds.filter((id) => !viewedIds.includes(id));

    check(
      'section_view が全セクションで発火する',
      missing.length === 0,
      missing.length ? `未発火: ${missing.join(', ')}` : `${viewedIds.length} セクション検知`,
    );

    const dupes = viewEvents
      .map((e) => e.params.section_id)
      .filter((id, i, arr) => arr.indexOf(id) !== i);
    check(
      'section_view は 1 セクション 1 回のみ',
      dupes.length === 0,
      dupes.length ? `重複: ${[...new Set(dupes)].join(', ')}` : '重複なし',
    );

    const withName = viewEvents.every(
      (e) => e.params.section_name && typeof e.params.section_index === 'number',
    );
    check(
      'section_view に section_name / section_index が入っている',
      withName,
      withName ? '' : `例: ${JSON.stringify(viewEvents[0]?.params)}`,
    );

    // --- 2. セクション滞在時間 ---
    // 2-a. あるセクションに留まってから離れると、その時点で送信されること
    await clearEvents(page);
    await page.evaluate(() => {
      document.getElementById('specs')?.scrollIntoView({ block: 'center', behavior: 'instant' });
    });
    await wait(4500); // DWELL_MIN_MS(3秒)を超えて滞在する
    await page.evaluate(() => {
      document.getElementById('contact')?.scrollIntoView({ block: 'center', behavior: 'instant' });
    });
    await wait(1500);

    const liveDwell = (await events(page)).filter((e) => e.name === 'section_engagement');
    const specsDwell = liveDwell.find((e) => e.params.section_id === 'specs');
    check(
      'セクションを離れた時点で section_engagement が送信される（離脱前）',
      Boolean(specsDwell),
      specsDwell
        ? `specs: ${specsDwell.params.engagement_sec}秒`
        : `送信なし（取得: ${liveDwell.map((e) => e.params.section_id).join(', ') || 'なし'}）`,
    );
    check(
      'engagement_sec が実滞在時間とおおむね一致する',
      Boolean(specsDwell) && specsDwell.params.engagement_sec >= 3 && specsDwell.params.engagement_sec <= 7,
      specsDwell ? `4.5秒滞在 → ${specsDwell.params.engagement_sec}秒として記録` : '',
    );

    // 2-b. 離脱時に残りとサマリが送信されること
    await clearEvents(page);
    await firePageHide(page);
    const dwellEvents = await events(page);
    const summary = dwellEvents.filter((e) => e.name === 'page_engagement_summary');
    check(
      '離脱時に滞在時間イベントが送信される',
      dwellEvents.length > 0,
      dwellEvents.length
        ? `${dwellEvents.length} 件: ${[...new Set(dwellEvents.map((e) => e.name))].join(', ')}`
        : 'イベントなし',
    );
    check(
      'page_engagement_summary は1回だけ（visibilitychange と pagehide で二重送信しない）',
      summary.length === 1,
      `${summary.length} 件` + (summary[0] ? ` / ${JSON.stringify(summary[0].params)}` : ''),
    );

    // 2-c. タブを離れて戻り、さらに閲覧してから離脱するケース
    //      （1回きりの送信にすると最初のタブ切替時点の値で固定されてしまう）
    await clearEvents(page);
    await setVisibility(page, 'visible');
    await page.evaluate(() => {
      document.getElementById('features')?.scrollIntoView({ block: 'center', behavior: 'instant' });
    });
    await wait(4500);
    await firePageHide(page);

    const secondSummary = (await events(page)).filter((e) => e.name === 'page_engagement_summary');
    check(
      'タブ復帰後の滞在もサマリに反映される（summary_seq が進む）',
      secondSummary.length === 1 && secondSummary[0].params.summary_seq === 2,
      secondSummary.length ? JSON.stringify(secondSummary[0].params) : 'サマリが送信されない',
    );
    check(
      '2回目のサマリが復帰後の区間だけを表す（合計で総滞在になる）',
      Boolean(secondSummary[0]) &&
        secondSummary[0].params.total_engagement_sec > 0 &&
        secondSummary[0].params.total_engagement_sec < 15,
      secondSummary[0]
        ? `復帰後4.5秒 → ${secondSummary[0].params.total_engagement_sec}秒`
        : '',
    );

    // --- 3. 追加クリック計測 ---
    const page2 = await browser.newPage();
    await page2.setViewport(VIEWPORT);
    await setup(page2);
    await page2.goto(URL, { waitUntil: 'networkidle2', timeout: 30000 });
    await wait(500);

    const clickTargets = [
      ['a[href^="tel:"]', '電話タップ'],
      ['[data-open-download-modal]', '資料DLモーダル開封'],
      ['a[href$=".pdf"]', 'PDFリンク'],
      ['#openFaqModalBtn', 'FAQモーダル開封'],
      ['.gallery-item', 'ギャラリー画像(ライトボックス)'],
      ['.gallery-carousel__btn--next', 'ギャラリーカルーセル送り'],
      ['.model-toggle-btn:not(.active)', '3Dモデル切替(既存)'],
      ['a[href="#contact"]', '相談CTA(既存)'],
    ];

    for (const [sel, label] of clickTargets) {
      const r = await clickAndCollect(page2, sel, label);
      if (!r.found) {
        check(`クリック計測: ${label}`, false, `要素が見つからない (${sel})`);
        continue;
      }
      check(
        `クリック計測: ${label}`,
        r.events.length > 0,
        r.events.length
          ? r.events.map((e) => `${e.name} ${JSON.stringify(e.params)}`).join(' / ').slice(0, 300)
          : `イベント未発火 (${sel})`,
      );
    }

    // --- 3-b. 活用例モーダル内のCTA（文言が重複するCTAの区別） ---
    await clearEvents(page2);
    await page2.evaluate(() => {
      document.querySelector('[data-app-modal="app-food"]')?.click();
    });
    await wait(400);
    await page2.evaluate(() => {
      document.querySelector('#app-food a[href="#contact"]')?.click();
    });
    await wait(300);
    const modalCta = (await events(page2)).filter((e) => e.name === 'contact_click');
    check(
      'モーダル内CTAが発生元モーダルごとに区別できる',
      modalCta.length > 0 && modalCta[0].params.section_id === 'app-food',
      modalCta.length ? JSON.stringify(modalCta[0].params) : 'contact_click が発火していない',
    );

    // --- 3-c. フォーム計測 ---
    await clearEvents(page2);
    await page2.evaluate(() => {
      const input = document.querySelector('#contactForm input[name="name"]');
      if (!input) return;
      input.scrollIntoView({ block: 'center', behavior: 'instant' });
      input.value = 'テスト太郎';
      input.dispatchEvent(new Event('input', { bubbles: true }));
    });
    await wait(300);
    const formStart = (await events(page2)).filter((e) => e.name === 'form_input_start');
    check(
      'フォーム入力開始が計測される',
      formStart.length === 1,
      formStart.length ? JSON.stringify(formStart[0].params) : '未発火',
    );

    await clearEvents(page2);
    await page2.evaluate(() => {
      // 必須項目未入力のまま送信ボタンを押す。
      // HTML5バリデーションで弾かれるため既存の contact_form_submit は発火しないが、
      // 送信操作そのものは form_submit_attempt で拾えること
      document.getElementById('contactSubmitBtn')?.click();
    });
    await wait(400);
    const attempts = (await events(page2)).filter((e) => e.name === 'form_submit_attempt');
    const succeeded = (await events(page2)).filter((e) => e.name === 'contact_form_submit');
    const invalids = (await events(page2)).filter((e) => e.name === 'form_validation_error');
    check(
      '送信失敗時も form_submit_attempt で操作を捕捉できる',
      attempts.length === 1 && succeeded.length === 0,
      `attempt=${attempts.length}, submit=${succeeded.length}`,
    );
    check(
      '入力エラーで送信できなかったことを計測できる',
      invalids.length === 1,
      invalids.length ? JSON.stringify(invalids[0].params) : `${invalids.length} 件`,
    );

    // --- 3-d. FAQ質問クリック（既存イベントの回帰確認） ---
    await clearEvents(page2);
    await page2.evaluate(() => {
      document.getElementById('openFaqModalBtn')?.click();
    });
    await wait(400);
    await page2.evaluate(() => {
      document.querySelector('#faqModal .faq-question')?.click();
    });
    await wait(300);
    const faqClicks = (await events(page2)).filter((e) => e.name === 'faq_click');
    check(
      'FAQ質問クリック（既存 faq_click）が壊れていない',
      faqClicks.length > 0,
      faqClicks.length ? clipStr(JSON.stringify(faqClicks[0].params)) : '未発火',
    );

    await clearEvents(page2);
    await page2.evaluate(() => {
      document.querySelector('#faqModal a[href="#contact"]')?.click();
    });
    await wait(300);
    const faqCta = (await events(page2)).filter((e) => e.name === 'contact_click');
    check(
      'FAQモーダル内CTAの発生元が unknown にならない',
      faqCta.length > 0 && faqCta[0].params.section_id === 'faqModal',
      faqCta.length ? JSON.stringify(faqCta[0].params) : '未発火',
    );

    // --- 3-e. モーダル表示中の滞在が背後のセクションに加算されないこと ---
    await clearEvents(page2);
    await page2.evaluate(() => {
      document.querySelector('[data-app-modal="app-paint"]')?.click();
    });
    await wait(4500);
    await page2.evaluate(() => {
      document.querySelector('#app-paint [data-close-modal]')?.click();
    });
    await wait(1200);
    const modalDwell = (await events(page2)).filter((e) => e.name === 'section_engagement');
    check(
      'モーダル閲覧中の滞在がモーダルに帰属する（背後のセクションに誤加算しない）',
      modalDwell.some((e) => e.params.section_id === 'app-paint'),
      modalDwell.length
        ? modalDwell.map((e) => `${e.params.section_id}:${e.params.engagement_sec}秒`).join(', ')
        : '滞在イベントなし',
    );

    // --- 3-f. Enterキーによる暗黙送信 ---
    await clearEvents(page2);
    await page2.evaluate(() => {
      const form = document.getElementById('contactForm');
      const input = form?.querySelector('input[name="name"]');
      if (!input) return;
      input.scrollIntoView({ block: 'center', behavior: 'instant' });
      // 送信ボタンの click を経由しない暗黙送信を再現する
      form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    });
    await wait(400);
    const enterAttempts = (await events(page2)).filter((e) => e.name === 'form_submit_attempt');
    check(
      'Enterキーによる送信も form_submit_attempt で拾える',
      enterAttempts.length === 1,
      `${enterAttempts.length} 件`,
    );

    // --- 3-g. 絶対URLのファイルリンクが二重計上されないこと ---
    await clearEvents(page2);
    await page2.evaluate(() => {
      const a = document.createElement('a');
      a.href = 'https://example.com/catalog.pdf';
      a.target = '_blank';
      a.textContent = '外部カタログPDF';
      a.id = 'tmp-abs-pdf';
      document.querySelector('#specs')?.appendChild(a);
    });
    // main.js の external_link_click は読み込み時に登録済みなので、
    // 動的追加した要素では発火しない。判定ロジック自体を直接確認する。
    const dualFire = await page2.evaluate(() => {
      const link = document.getElementById('tmp-abs-pdf');
      link.click();
      return window.__gaEvents.map((e) => e.name);
    });
    await wait(200);
    check(
      '絶対URLのPDFリンクは file_open のみで計測される',
      dualFire.filter((n) => n === 'file_open').length === 1 &&
        !dualFire.includes('external_link_click'),
      `発火: ${dualFire.join(', ') || 'なし'}`,
    );

    // --- 4. GA4 の仕様に準拠しているか（全捕捉イベントを検査） ---
    const allEvents = [
      ...(await page.evaluate(() => window.__gaAll)),
      ...(await page2.evaluate(() => window.__gaAll)),
    ];
    const NAME_RE = /^[A-Za-z][A-Za-z0-9_]{0,39}$/;
    const RESERVED_PREFIX = /^(ga_|google_|firebase_|gtag_|_)/;
    // GA4拡張計測が自動収集する名前。自前実装で使うと二重計上になる
    const ENHANCED = [
      'form_start', 'form_submit', 'file_download', 'scroll', 'click',
      'video_start', 'video_progress', 'video_complete', 'view_search_results',
      'page_view', 'user_engagement', 'session_start', 'first_visit',
    ];

    const badNames = [...new Set(allEvents.map((e) => e.name))].filter(
      (n) => !NAME_RE.test(n) || RESERVED_PREFIX.test(n),
    );
    check(
      'イベント名が GA4 の命名規則を満たす（英字始まり・40文字以内・予約接頭辞なし）',
      badNames.length === 0,
      badNames.length ? `違反: ${badNames.join(', ')}` : `${new Set(allEvents.map((e) => e.name)).size} 種類を検査`,
    );

    const collisions = [...new Set(allEvents.map((e) => e.name))].filter((n) => ENHANCED.includes(n));
    check(
      '拡張計測の自動収集イベント名と衝突していない',
      collisions.length === 0,
      collisions.length ? `衝突: ${collisions.join(', ')}` : '衝突なし',
    );

    const badParams = [];
    allEvents.forEach((e) => {
      const keys = Object.keys(e.params);
      if (keys.length > 25) badParams.push(`${e.name}: パラメータ${keys.length}個(上限25)`);
      keys.forEach((k) => {
        if (!NAME_RE.test(k)) badParams.push(`${e.name}.${k}: パラメータ名が不正`);
        const v = e.params[k];
        if (typeof v === 'string' && v.length > 100) {
          badParams.push(`${e.name}.${k}: 値が${v.length}文字(上限100)`);
        }
      });
    });
    check(
      'パラメータ名・値・個数が GA4 の上限内',
      badParams.length === 0,
      [...new Set(badParams)].slice(0, 5).join(' / '),
    );

    const contactClicks = allEvents.filter((e) => e.name === 'contact_click');
    check(
      'contact_click に発生元セクションが付いている',
      contactClicks.length > 0 && contactClicks.every((e) => e.params.section_id),
      contactClicks.length ? JSON.stringify(contactClicks[0].params) : 'contact_click が発火していない',
    );

    // --- 5. JS エラーがないこと ---
    check(
      'コンソールに JS エラーが出ていない',
      consoleErrors.length === 0,
      consoleErrors.slice(0, 5).join(' | '),
    );

    // --- サマリ ---
    const failed = results.filter((r) => !r.ok);
    console.log(
      `\n=== 結果: ${results.length - failed.length}/${results.length} PASS ===\n`,
    );
    process.exitCode = failed.length ? 1 : 0;
  } finally {
    await browser.close();
  }
};

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
