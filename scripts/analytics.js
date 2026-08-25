/**
 * GA4 計測モジュール
 *
 * 既存の計測（contact_click / faq_click / contact_form_submit / guide_download /
 * product_3d_* / video_load / scroll_depth など）は scripts/main.js に残したまま、
 * このファイルでは以下の3つを追加する。
 *
 *   1. section_view        … どのセクションが実際に見られたか
 *   2. section_engagement  … どのセクションにどれだけ滞在したか
 *   3. 未計測だったクリック … 電話タップ・資料DLモーダル・PDF・FAQ/ギャラリー操作 等
 *
 * 設計方針:
 *   - 全クリック計測は document へのイベント委譲で行う（要素ごとの addEventListener を増やさない）
 *   - どのセクション発のアクションかを常に section_id パラメータで送る
 *     （「この用途で相談する」のように文言が重複するCTAを区別するため）
 *   - 滞在時間はタブが可視のときのみ加算し、セクションを抜けた時点で随時送る
 *     （離脱時の一括送信だけに頼ると取りこぼすため。離脱時は残りを flush する）
 */

// ====================================
// 設定
// ====================================

/** セクションID → レポート表示用の日本語名 */
const SECTION_NAMES = {
  hero: 'ヒーロー',
  challenges: '現場の課題',
  regulation: '法規制',
  features: '製品の特徴',
  applications: '活用例',
  'case-studies': '導入事例',
  'viewer360-header': '360度ビューア',
  'parts-gallery': '製品ギャラリー',
  videos: '動画',
  specs: '製品仕様',
  'after-support': 'アフターサポート',
  faq: 'よくある質問',
  knowledge: 'お役立ち情報',
  'regulation-video': '法令解説動画',
  'download-guide': '資料ダウンロード',
  contact: 'お問い合わせ',
};

/** モーダルID → レポート表示用の日本語名（モーダルは section に属さないため擬似セクション扱い） */
const MODAL_NAMES = {
  'app-food': '活用例モーダル:食品工場',
  'app-paint': '活用例モーダル:塗装・印刷',
  'app-camera': '活用例モーダル:検査カメラ',
  'app-logistics': '活用例モーダル:物流倉庫',
  downloadGuideModal: '資料DLモーダル',
  faqModal: 'FAQモーダル',
  galleryLightbox: 'ギャラリー拡大表示',
};

/** セクション到達とみなす可視割合（セクションが画面より高い場合は画面占有率で判定） */
const VIEW_RATIO = 0.5;
/** 流し読みを除外するための最低表示時間(ms) */
const VIEW_MIN_MS = 1000;
/** これ未満の滞在は送信しない(ms)。イベント数の膨張を防ぐ */
const DWELL_MIN_MS = 3000;
/** 滞在時間の加算間隔(ms) */
const TICK_MS = 500;

// ====================================
// 共通ユーティリティ
// ====================================

const hasGtag = () => typeof window.gtag === 'function';

const track = (name, params = {}) => {
  if (!hasGtag()) return;
  window.gtag('event', name, params);
};

/** GA4 のパラメータ値は100文字まで。日本語の見出し等が長くなるため丸める */
const clip = (text, max = 100) =>
  (text || '').replace(/\s+/g, ' ').trim().slice(0, max);

/** DOM順のセクション一覧（id付き section のみ） */
const sections = Array.from(document.querySelectorAll('section[id]'));

const sectionMeta = new Map(
  sections.map((el, index) => [
    el,
    {
      id: el.id,
      name: SECTION_NAMES[el.id] || clip(el.querySelector('h1, h2')?.textContent) || el.id,
      index,
    },
  ]),
);

/** 任意の要素から、それが属するセクションのメタ情報を得る */
const sectionOf = (el) => {
  const section = el?.closest?.('section[id]');
  if (section && sectionMeta.has(section)) return sectionMeta.get(section);

  // モーダルは body 直下にあり section に属さないため、開いた元を辿れない。
  // モーダル自身のIDを擬似セクションとして扱う。
  const modal = el?.closest?.('.app-modal, .download-modal, .modal, .gallery-lightbox');
  if (modal?.id) return { id: modal.id, name: MODAL_NAMES[modal.id] || modal.id, index: -1 };

  if (el?.closest?.('.header')) return { id: 'header', name: 'ヘッダー', index: -1 };
  if (el?.closest?.('.footer')) return { id: 'footer', name: 'フッター', index: -1 };
  return { id: 'unknown', name: 'unknown', index: -1 };
};

/**
 * ファイルへのリンクか。
 * main.js の external_link_click と二重計上しないよう、判定をここに集約している
 * （絶対URLのPDF等は file_open だけで計測する）
 */
const FILE_LINK_RE = /\.(pdf|xlsx?|docx?|pptx?|zip|csv|dwg|dxf)(\?|#|$)/i;
const isFileLink = (href) => FILE_LINK_RE.test(href || '');

const sectionParams = (el) => {
  const meta = sectionOf(el);
  return { section_id: meta.id, section_name: meta.name };
};

// ====================================
// 1. セクション閲覧 (section_view)
// ====================================

const viewed = new Set();
const viewTimers = new Map();

/** section_view を1セクションにつき1回だけ送る */
const markViewed = (meta) => {
  if (!meta || viewed.has(meta.id)) return;
  viewed.add(meta.id);
  track('section_view', {
    section_id: meta.id,
    section_name: meta.name,
    section_index: meta.index,
  });
};

const initSectionView = () => {
  if (!sections.length || !('IntersectionObserver' in window)) return;

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        const el = entry.target;
        const meta = sectionMeta.get(el);
        if (!meta || viewed.has(meta.id)) return;

        // 画面より高いセクションは intersectionRatio が閾値に届かないため、
        // 「画面のどれだけを占めているか」でも判定する
        const visiblePx = entry.intersectionRect.height;
        const ratioOfSection = entry.intersectionRatio;
        const ratioOfViewport = visiblePx / window.innerHeight;
        const isVisible = entry.isIntersecting && (ratioOfSection >= VIEW_RATIO || ratioOfViewport >= 0.6);

        if (isVisible) {
          if (viewTimers.has(el)) return;
          viewTimers.set(
            el,
            window.setTimeout(() => {
              viewTimers.delete(el);
              markViewed(meta);
            }, VIEW_MIN_MS),
          );
        } else if (viewTimers.has(el)) {
          window.clearTimeout(viewTimers.get(el));
          viewTimers.delete(el);
        }
      });
    },
    { threshold: [0, 0.25, VIEW_RATIO, 0.75, 1] },
  );

  sections.forEach((el) => observer.observe(el));
};

// ====================================
// 2. セクション滞在時間 (section_engagement)
// ====================================

/** section_id → { dwellMs: 累積, sentMs: 送信済み, summaryBaseMs: 前回サマリ時点 } */
const dwell = new Map();
let activeSection = null;
let tickTimer = null;

/** 表示中のモーダル（あれば）。モーダルは position:fixed で背後のセクションを覆う */
const openModal = () =>
  document.querySelector(
    '.app-modal.is-open, .download-modal.is-open, .modal.is-open, .gallery-lightbox.active',
  );

/** 画面中央にあるセクションを「今見ているセクション」とみなす */
const currentSection = () => {
  // モーダルを開いている間はモーダルを読んでいる。背後のセクションに加算しない
  const modal = openModal();
  if (modal?.id) {
    return { id: modal.id, name: MODAL_NAMES[modal.id] || modal.id, index: -1 };
  }

  const centerY = window.innerHeight / 2;
  let best = null;
  let bestArea = 0;

  for (const el of sections) {
    const rect = el.getBoundingClientRect();
    const top = Math.max(rect.top, 0);
    const bottom = Math.min(rect.bottom, window.innerHeight);
    const area = bottom - top;
    if (area <= 0) continue;

    // 画面中央を含むセクションを最優先、なければ可視面積が最大のもの
    if (rect.top <= centerY && rect.bottom >= centerY) return sectionMeta.get(el);
    if (area > bestArea) {
      bestArea = area;
      best = sectionMeta.get(el);
    }
  }
  return best;
};

/** 1セクション分の未送信滞在時間を送る（閾値未満なら送らずに次回へ持ち越す） */
const sendDwell = (entry) => {
  const pendingMs = entry.dwellMs - entry.sentMs;
  if (pendingMs < DWELL_MIN_MS) return false;

  entry.sentMs = entry.dwellMs;
  track('section_engagement', {
    section_id: entry.meta.id,
    section_name: entry.meta.name,
    section_index: entry.meta.index,
    engagement_sec: Math.round(pendingMs / 1000),
  });
  return true;
};

const tick = () => {
  if (document.visibilityState !== 'visible') return;
  const meta = currentSection();
  if (!meta) return;

  // セクションを抜けた時点で送る。離脱時の一括送信に頼らないので取りこぼしにくい
  if (activeSection && activeSection.id !== meta.id) {
    const prev = dwell.get(activeSection.id);
    if (prev) sendDwell(prev);
  }

  activeSection = meta;
  const entry = dwell.get(meta.id) || { meta, dwellMs: 0, sentMs: 0, summaryBaseMs: 0 };
  entry.dwellMs += TICK_MS;
  dwell.set(meta.id, entry);

  // 画面より極端に高いセクションは IntersectionObserver の閾値をまたがず
  // コールバックが来ないことがあるので、実滞在時間からも到達を判定する
  // （モーダルは擬似セクション扱いなので section_view の対象外）
  if (entry.dwellMs >= VIEW_MIN_MS && meta.index >= 0) markViewed(meta);
};

/**
 * 未送信分の滞在時間とサマリを送る。
 *
 * サマリは「前回サマリ以降の区間」を表す差分イベントにしている。
 * タブを離れて戻ってきたユーザーでも合計が正しくなるようにするため
 * （1回だけ送る方式だと、最初にタブを切り替えた時点の値で固定されてしまう）。
 * したがって total_engagement_sec は合計（SUM）して使ってよい。
 */
let summarySeq = 0;

const flushDwell = () => {
  if (!hasGtag()) return;

  let intervalSec = 0;
  let top = null;
  let topMs = 0;

  dwell.forEach((entry) => {
    const intervalMs = entry.dwellMs - entry.summaryBaseMs;
    intervalSec += Math.round(intervalMs / 1000);
    if (intervalMs > topMs) {
      topMs = intervalMs;
      top = entry;
    }
    sendDwell(entry);
  });

  if (!top || intervalSec <= 0) return;

  summarySeq += 1;
  dwell.forEach((entry) => {
    entry.summaryBaseMs = entry.dwellMs;
  });

  track('page_engagement_summary', {
    summary_seq: summarySeq,
    top_section_id: top.meta.id,
    top_section_name: top.meta.name,
    top_section_sec: Math.round(topMs / 1000),
    total_engagement_sec: intervalSec,
  });
};

const initSectionDwell = () => {
  if (!sections.length) return;

  tickTimer = window.setInterval(tick, TICK_MS);

  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') flushDwell();
  });
  // pagehide はタブを閉じる / 別ページへ遷移する場合の最後の砦
  window.addEventListener('pagehide', flushDwell);
};

// ====================================
// 3. 追加のクリック計測（イベント委譲）
// ====================================

const initClickTracking = () => {
  document.addEventListener(
    'click',
    (e) => {
      const target = e.target;
      if (!target || typeof target.closest !== 'function') return;

      // --- 電話タップ ---
      const tel = target.closest('a[href^="tel:"]');
      if (tel) {
        track('tel_click', {
          ...sectionParams(tel),
          phone_number: tel.getAttribute('href').replace('tel:', ''),
        });
      }

      // --- 資料DLモーダルを開く ---
      const dlOpen = target.closest('[data-open-download-modal]');
      if (dlOpen) {
        track('download_modal_open', {
          ...sectionParams(dlOpen),
          link_text: clip(dlOpen.textContent),
        });
      }

      // --- PDF / ファイルリンク（相対パスも含む。既存の外部リンク計測から漏れていた） ---
      const fileLink = target.closest('a[href]');
      const href = fileLink?.getAttribute('href') || '';
      if (fileLink && isFileLink(href)) {
        const fileName = decodeURIComponent(href.split('/').pop().split('?')[0]);
        track('file_open', {
          ...sectionParams(fileLink),
          file_name: clip(fileName),
          file_extension: (fileName.split('.').pop() || '').toLowerCase(),
          link_text: clip(fileLink.textContent),
        });
      }

      // --- FAQ導線 ---
      const faqCategory = target.closest('[data-faq-category]');
      if (faqCategory) {
        track('faq_modal_open', {
          ...sectionParams(faqCategory),
          open_from: 'category',
          faq_category: faqCategory.getAttribute('data-faq-category'),
          link_text: clip(faqCategory.textContent),
        });
      } else if (target.closest('#openFaqModalBtn')) {
        track('faq_modal_open', {
          section_id: 'faq',
          section_name: SECTION_NAMES.faq,
          open_from: 'button',
        });
      }

      // --- 製品ギャラリー ---
      const galleryItem = target.closest('.gallery-item');
      if (galleryItem) {
        track('gallery_image_open', {
          section_id: 'parts-gallery',
          section_name: SECTION_NAMES['parts-gallery'],
          image_label: clip(galleryItem.querySelector('.gallery-item__label')?.textContent),
        });
      }

      // --- カルーセル操作（法規制 / 特徴 / お役立ち情報 / ギャラリー共通） ---
      const carouselBtn = target.closest(
        '[data-carousel-prev], [data-carousel-next], [data-carousel-indicator],' +
          '.features-carousel__btn, .features-carousel__indicator,' +
          '.gallery-carousel__btn, .gallery-carousel__indicator',
      );
      if (carouselBtn) {
        const direction = carouselBtn.matches('[data-carousel-prev], [class*="--prev"]')
          ? 'prev'
          : carouselBtn.matches('[data-carousel-next], [class*="--next"]')
            ? 'next'
            : 'indicator';
        track('carousel_interact', {
          ...sectionParams(carouselBtn),
          direction,
        });
      }

      // --- お役立ち情報のタブ切替 ---
      const knowledgeTab = target.closest('[data-knowledge-tab]');
      if (knowledgeTab) {
        track('knowledge_tab_select', {
          section_id: 'knowledge',
          section_name: SECTION_NAMES.knowledge,
          tab_index: Number(knowledgeTab.getAttribute('data-knowledge-tab')),
          tab_name: clip(knowledgeTab.textContent),
        });
      }

      // --- ナビゲーション（ヘッダー/フッターのアンカー） ---
      // #contact は contact_click、資料DLは download_modal_open で計測済みなので
      // 同一クリックを二重に数えないよう除外する
      const navLink = target.closest('.header a[href^="#"], .footer a[href^="#"]');
      if (
        navLink &&
        !navLink.hasAttribute('data-open-download-modal') &&
        navLink.getAttribute('href') !== '#contact'
      ) {
        track('nav_click', {
          ...sectionParams(navLink),
          link_text: clip(navLink.textContent),
          target_section: navLink.getAttribute('href').replace('#', ''),
        });
      }
    },
    true, // capture: 途中で stopPropagation されても取りこぼさない
  );
};

// ====================================
// 4. フォームの計測補完
// ====================================

const initFormTracking = () => {
  // 入力開始（1フォームにつき1回）
  const forms = [
    ['contactForm', 'contact'],
    ['surveyForm', 'download_survey'],
  ];

  forms.forEach(([id, formName]) => {
    const form = document.getElementById(id);
    if (!form) return;

    let started = false;
    const onStart = () => {
      if (started) return;
      started = true;
      track('form_input_start', { form_name: formName });
    };
    form.addEventListener('input', onStart, { once: false });
    form.addEventListener('change', onStart, { once: false });

    // 送信ボタン押下そのもの。
    // 既存の contact_form_submit / guide_download は API 成功時にしか発火しないため、
    // 「押したのに送れなかった」を差分で把握できるようにする。
    // submit イベントではなく click を見るのは、HTML5 の必須チェックで弾かれると
    // submit イベント自体が発火せず、取りこぼすため。
    let lastAttemptAt = 0;
    const trackAttempt = () => {
      // ボタンクリックと submit の両方が起きる正常系で二重に数えない
      const now = Date.now();
      if (now - lastAttemptAt < 1000) return;
      lastAttemptAt = now;
      track('form_submit_attempt', { form_name: formName });
    };

    form.addEventListener('click', (e) => {
      const submitBtn = e.target.closest('button[type="submit"], input[type="submit"]');
      if (!submitBtn || !form.contains(submitBtn)) return;
      trackAttempt();
    });
    // テキスト入力中の Enter キーによる暗黙送信はボタンの click が発生しない
    form.addEventListener('submit', trackAttempt, true);

    // 入力エラーで送信できなかったケース（1回の送信操作につき最初の1件だけ送る）
    let invalidReported = false;
    form.addEventListener(
      'invalid',
      (e) => {
        if (invalidReported) return;
        invalidReported = true;
        window.setTimeout(() => {
          invalidReported = false;
        }, 0);
        track('form_validation_error', {
          form_name: formName,
          field_name: e.target?.name || e.target?.id || 'unknown',
        });
      },
      true, // invalid はバブリングしないので capture で拾う
    );
  });
};

// ====================================
// 起動
// ====================================

const init = () => {
  initSectionView();
  initSectionDwell();
  initClickTracking();
  initFormTracking();
};

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}

export { flushDwell, sectionParams, isFileLink, SECTION_NAMES, MODAL_NAMES };
