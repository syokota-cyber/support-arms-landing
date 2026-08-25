#!/usr/bin/env node
/**
 * GA4 カスタムディメンション／カスタム指標の一括登録
 *
 * docs/GA4計測仕様.md の 3-1 / 3-2 をそのまま GA4 Admin API で作る。
 * 既に登録済みのものは触らない（表示名・説明はユーザーが付けたものを尊重する）。
 * FIXES に挙げたものだけ、表示名・説明を上書きする。
 *
 * 使い方:
 *   node tools/ga4-setup-dimensions.mjs                # 差分表示のみ（デフォルト）
 *   node tools/ga4-setup-dimensions.mjs --apply        # 実際に作成・修正する
 *
 * 認証（gcloud 不要）:
 *   1. https://developers.google.com/oauthplayground/ を開く
 *   2. 右上の歯車 → "Use your own OAuth credentials" はOFFのままでよい
 *   3. 左の入力欄に次のスコープを貼って Authorize APIs
 *        https://www.googleapis.com/auth/analytics.edit
 *   4. GA4プロパティの編集権限があるGoogleアカウントで承認
 *   5. "Exchange authorization code for tokens" → Access token をコピー
 *   6. export GA4_TOKEN="ya29...."   （有効期限1時間）
 *
 * プロパティIDは測定ID G-DE9NN4XB0P から自動で探す。
 * 明示したい場合は GA4_PROPERTY_ID=123456789 を渡す。
 */

const API = 'https://analyticsadmin.googleapis.com/v1beta';
const MEASUREMENT_ID = 'G-DE9NN4XB0P';

const TOKEN = process.env.GA4_TOKEN || argValue('--token');
const APPLY = process.argv.includes('--apply');

/** 仕様書 3-1: カスタムディメンション（イベントスコープ） */
const DIMENSIONS = [
  // セクション
  ['section_id', 'section_id', 'features specs など。集計のキー'],
  ['section_name', 'section_name', '製品の特徴／製品仕様 など。レポートで主に使う'],
  ['section_index', 'section_index', 'ページ上から 0,1,2… 並べ替え用'],
  ['summary_seq', 'サマリ連番', '1=初回、2以降は再訪時の区間。重複排除用'],
  ['top_section_id', '最長滞在セクションID', 'その区間で最も長く見たセクション'],
  ['top_section_name', '最長滞在セクション名', 'その区間で最も長く見たセクション'],
  // フォーム
  ['form_name', 'フォーム名', 'contact / download_survey'],
  ['field_name', 'エラー項目', '入力エラーになった項目名'],
  ['inquiry_type', '問い合わせ種別', 'お見積もり依頼 など'],
  ['contact_job_role', 'contact_job_role', '問い合わせフォームの職種'],
  ['job_role', '資料DL_職種', '資料DLフォームの職種'],
  ['lev_status', '局排_設置状況', '局所排気装置の設置状況'],
  // リンク・ファイル
  ['link_text', 'link_text', '押されたリンクの表示テキスト'],
  ['link_url', 'link_url', '外部リンクの遷移先URL'],
  ['file_name', 'file_name', '開かれたPDFのファイル名'],
  ['file_extension', 'file_extension', 'pdf など'],
  ['phone_number', '電話番号', 'タップされた tel: 番号'],
  // UI操作
  ['image_label', '画像名', '拡大されたギャラリー画像のラベル'],
  ['direction', 'カルーセル操作', 'prev / next / indicator'],
  ['open_from', 'FAQを開いた経路', 'button / category'],
  ['faq_category', 'FAQカテゴリ', '価格・購入／納期 など'],
  ['tab_index', 'タブ位置', 'お役立ち情報タブの並び順 0,1,2…'],
  ['tab_name', 'タブ名', 'お役立ち情報のタブ'],
  ['target_section', '遷移先セクション', 'ナビから飛んだ先'],
  ['modal_id', 'モーダルID', '開かれた活用例モーダル'],
  // 既存イベントが UA 由来の event_label に実データを載せているため必要
  ['event_label', 'イベントラベル', 'FAQ質問文／CTA文言／活用例名／3Dモデル種別など'],
];

/** 仕様書 3-2: カスタム指標（イベントスコープ・単位=標準） */
const METRICS = [
  ['engagement_sec', 'セクション滞在秒数', 'section_engagement の滞在秒数'],
  ['top_section_sec', '最長滞在セクション秒数', 'その区間で最も長く見たセクションの秒数'],
  ['total_engagement_sec', '合計滞在秒数', '区間内の合計。SUMで合算してよい'],
];

/**
 * 登録済みだが表示名・説明が壊れているもの。ここに挙げたものだけ上書きする。
 * 直したら、この配列から消してよい。
 */
const FIXES = [
  ['phone_number', '電話番号', 'タップされた tel: 番号'],   // 名前が file_extensionphone_number になっていた
  ['open_from', 'FAQを開いた経路', 'button / category'],    // 説明が buttan/acategory になっていた
];

function argValue(flag) {
  const i = process.argv.indexOf(flag);
  return i !== -1 ? process.argv[i + 1] : undefined;
}

async function api(path, { method = 'GET', body } = {}) {
  const res = await fetch(`${API}/${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  if (!res.ok) {
    const detail = text.slice(0, 500);
    if (res.status === 401) {
      throw new Error(`認証エラー(401)。GA4_TOKEN の期限切れかスコープ不足。\n${detail}`);
    }
    if (res.status === 403) {
      throw new Error(`権限エラー(403)。そのアカウントにプロパティの編集権限があるか確認。\n${detail}`);
    }
    throw new Error(`${method} ${path} → ${res.status}\n${detail}`);
  }
  return text ? JSON.parse(text) : {};
}

/** ページングをまとめて取る */
async function listAll(path, key) {
  const items = [];
  let pageToken;
  do {
    const sep = path.includes('?') ? '&' : '?';
    const q = `${path}${sep}pageSize=200${pageToken ? `&pageToken=${pageToken}` : ''}`;
    const page = await api(q);
    items.push(...(page[key] || []));
    pageToken = page.nextPageToken;
  } while (pageToken);
  return items;
}

/** 測定ID から プロパティID を逆引きする */
async function findProperty() {
  if (process.env.GA4_PROPERTY_ID) return `properties/${process.env.GA4_PROPERTY_ID}`;

  const summaries = await listAll('accountSummaries', 'accountSummaries');
  const properties = summaries.flatMap((a) =>
    (a.propertySummaries || []).map((p) => ({ ...p, account: a.displayName }))
  );
  if (properties.length === 0) {
    throw new Error('アクセスできるGA4プロパティがありません。承認したアカウントを確認してください。');
  }

  for (const p of properties) {
    const streams = await listAll(`${p.property}/dataStreams`, 'dataStreams');
    const hit = streams.find(
      (s) => s.webStreamData?.measurementId === MEASUREMENT_ID
    );
    if (hit) {
      console.log(`プロパティ: ${p.displayName} (${p.property}) / ${MEASUREMENT_ID}`);
      return p.property;
    }
  }

  const list = properties.map((p) => `  ${p.property}  ${p.account} / ${p.displayName}`).join('\n');
  throw new Error(
    `測定ID ${MEASUREMENT_ID} を持つプロパティが見つかりません。\n` +
      `GA4_PROPERTY_ID=<番号> を指定してください。候補:\n${list}`
  );
}

async function sync({ property, kind, defs, collection, extra }) {
  const existing = await listAll(`${property}/${collection}`, collection);
  const byParam = new Map(existing.map((d) => [d.parameterName, d]));

  const missing = defs.filter(([param]) => !byParam.has(param));
  const fixes = FIXES.filter(([param, name, desc]) => {
    const cur = byParam.get(param);
    return cur && (cur.displayName !== name || (cur.description || '') !== desc);
  });

  console.log(`\n[${kind}] 登録済み ${existing.length}件 / 仕様 ${defs.length}件`);

  if (missing.length === 0) {
    console.log('  追加が必要なものはありません');
  } else {
    for (const [param, name, desc] of missing) {
      console.log(`  ${APPLY ? '作成' : '未登録'}: ${param.padEnd(22)} ${name}`);
      if (APPLY) {
        await api(`${property}/${collection}`, {
          method: 'POST',
          body: { parameterName: param, displayName: name, description: desc, scope: 'EVENT', ...extra },
        });
      }
    }
  }

  for (const [param, name, desc] of fixes) {
    const cur = byParam.get(param);
    console.log(`  ${APPLY ? '修正' : '要修正'}: ${param.padEnd(22)} "${cur.displayName}" → "${name}"`);
    if (APPLY) {
      await api(`${cur.name}?updateMask=displayName,description`, {
        method: 'PATCH',
        body: { displayName: name, description: desc },
      });
    }
  }

  return missing.length + fixes.length;
}

async function main() {
  if (!TOKEN) {
    console.error(
      'GA4_TOKEN が未設定です。ファイル冒頭のコメントの手順でアクセストークンを取得し、\n' +
        '  export GA4_TOKEN="ya29...."\n' +
        'としてから実行してください。'
    );
    process.exit(1);
  }

  const property = await findProperty();

  let pending = 0;
  pending += await sync({
    property,
    kind: 'カスタムディメンション',
    defs: DIMENSIONS,
    collection: 'customDimensions',
  });
  pending += await sync({
    property,
    kind: 'カスタム指標',
    defs: METRICS,
    collection: 'customMetrics',
    extra: { measurementUnit: 'STANDARD' },
  });

  if (!APPLY && pending > 0) {
    console.log(`\n上記 ${pending}件 を実行するには --apply を付けてください。`);
  } else if (APPLY) {
    console.log('\n完了。GA4管理画面のカスタム定義を再読み込みして確認してください。');
  } else {
    console.log('\n仕様どおりに揃っています。');
  }
}

main().catch((err) => {
  console.error(`\n${err.message}`);
  process.exit(1);
});
