/**
 * 岩代工業 問い合わせ 統合管理 GAS
 *
 * 公式サイト(WordPress) と サポートアーム(Cloudflare) の両方から受信し、
 * 1つのスプレッドシート内のタブに振り分けて記録する。
 *
 * 振り分けルール:
 *   type='survey'                        → 「アンケート回答」  (サポートアーム)
 *   type='contact' & site='support-arm'  → 「サポートアーム問い合わせ」
 *   type='contact' & site='official'     → 「公式サイト」
 *   (site未指定の contact は「公式サイト」扱い)
 *
 * 設置先: サポートアームの既存スプレッドシート（既存データのある所）を統合ハブとして使用。
 * デプロイ: 「デプロイを管理 → 既存を編集 → 新バージョン」で更新すればURLは不変。
 *
 * ※このファイルは iwashiro-landing-page の
 *   wordpress-setup/iwashiro-contact/gas-sheet-sync.gs と同一内容（統合版）。
 */

// 設定すると検証する。両サイトが同じ値を送る必要あり。空なら検証しない。
const SHARED_SECRET = '';

function doPost(e) {
  try {
    var data = JSON.parse(e.postData.contents || '{}');

    if (SHARED_SECRET && data.secret !== SHARED_SECRET) {
      return json_({ success: false, error: 'unauthorized' });
    }

    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var stamp = Utilities.formatDate(new Date(), 'Asia/Tokyo', 'yyyy/MM/dd HH:mm:ss');
    var reply = data.auto_reply_sent === 'sent' ? '✅ 送信済' : '⚠️ 失敗';

    if (data.type === 'survey') {
      appendRow_(ss, 'アンケート回答',
        ['タイムスタンプ', '業種・職種', '溶接作業の種類', '局所排気装置の導入状況', '導入検討の規模・予算感', 'お悩み・ご相談'],
        [stamp, data.job_role, data.welding_types, data.lev_status, data.introduction_scale, data.free_text]);

    } else if (data.type === 'contact' && data.site === 'support-arm') {
      appendRow_(ss, 'サポートアーム問い合わせ',
        ['タイムスタンプ', '会社名', 'お名前', 'メールアドレス', '電話番号', '業種・職種', 'ご相談内容', '詳細', '自動返信'],
        [stamp, data.company, data.name, data.email, data.phone, data.contact_job_role, data.inquiry_type, data.message, reply]);

    } else if (data.type === 'contact') {
      // 公式サイト（site未指定もここ）
      appendRow_(ss, '公式サイト',
        ['受信日時', '会社名', 'お名前', 'メールアドレス', '電話番号', 'ご相談内容', '詳細', '送信元ページ', '自動返信'],
        [data.received_at || stamp, data.company, data.name, data.email, data.phone, data.inquiry_type, data.details, data.source_url, reply]);
    }

    return json_({ success: true });
  } catch (err) {
    return json_({ success: false, error: String(err) });
  }
}

/** 動作確認用（ブラウザでURLを開くと200が返る） */
function doGet() {
  return json_({ success: true, message: 'iwashiro unified contact sheet sync is running' });
}

function appendRow_(ss, sheetName, headers, row) {
  var ws = ss.getSheetByName(sheetName);
  if (!ws) {
    ws = ss.insertSheet(sheetName);
    ws.appendRow(headers);
    ws.getRange(1, 1, 1, headers.length).setFontWeight('bold');
    ws.setFrozenRows(1);
  }
  ws.appendRow(row);
}

function json_(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
