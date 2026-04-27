function doPost(e) {
  var sheet = SpreadsheetApp.getActiveSpreadsheet();
  var data = JSON.parse(e.postData.contents);
  var now = new Date();
  var timestamp = Utilities.formatDate(now, 'Asia/Tokyo', 'yyyy/MM/dd HH:mm:ss');

  if (data.type === 'contact') {
    var ws = sheet.getSheetByName('問い合わせ');
    if (!ws) {
      ws = sheet.insertSheet('問い合わせ');
      ws.appendRow(['タイムスタンプ', '会社名', 'お名前', 'メールアドレス', '電話番号', '業種・職種', 'ご相談内容', '詳細']);
    }
    ws.appendRow([
      timestamp,
      data.company,
      data.name,
      data.email,
      data.phone,
      data.contact_job_role,
      data.inquiry_type,
      data.message
    ]);
  } else if (data.type === 'survey') {
    var ws = sheet.getSheetByName('アンケート回答');
    if (!ws) {
      ws = sheet.insertSheet('アンケート回答');
      ws.appendRow(['タイムスタンプ', '業種・職種', '溶接作業の種類', '局所排気装置の導入状況', '導入検討の規模・予算感', 'お悩み・ご相談']);
    }
    ws.appendRow([
      timestamp,
      data.job_role,
      data.welding_types,
      data.lev_status,
      data.introduction_scale,
      data.free_text
    ]);
  }

  return ContentService
    .createTextOutput(JSON.stringify({ status: 'ok' }))
    .setMimeType(ContentService.MimeType.JSON);
}
