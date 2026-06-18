/**
 * Cloudflare Pages Function: Contact Form Handler
 * Sends email to customer@iwashiro.co.jp via Resend API
 *
 * Required: Set RESEND_API_KEY in Cloudflare Pages environment variables
 *
 * フロー（公式サイト iwashiro-contact と同一方針）:
 *   1. 自動返信を先に送信し、成否・日時を記録
 *   2. 管理通知メールに「自動返信ステータス（✅/⚠️）＋自動返信の写し」をぶら下げ
 *   3. Googleスプレッドシート連携（GAS）
 */

export async function onRequestPost(context) {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };

  // JST（日本時間）の "YYYY/MM/DD HH:MM" を返す（Workerは UTC 実行のため +9h）
  const jstStamp = () => {
    const d = new Date(Date.now() + 9 * 60 * 60 * 1000);
    const p = (n) => String(n).padStart(2, '0');
    return `${d.getUTCFullYear()}/${p(d.getUTCMonth() + 1)}/${p(d.getUTCDate())} ${p(d.getUTCHours())}:${p(d.getUTCMinutes())}`;
  };

  try {
    const body = await context.request.json();

    // Validate required fields
    const { company, name, email, inquiry_type, contact_job_role } = body;
    if (!company || !name || !email || !inquiry_type || !contact_job_role) {
      return new Response(
        JSON.stringify({ success: false, error: '必須項目を入力してください。' }),
        { status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return new Response(
        JSON.stringify({ success: false, error: '有効なメールアドレスを入力してください。' }),
        { status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }

    // Honeypot check - silently reject
    if (body.website) {
      return new Response(
        JSON.stringify({ success: true }),
        { status: 200, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }

    // URL detection in text fields
    const urlPattern = /https?:\/\/|www\./i;
    if (urlPattern.test(body.message || '') || urlPattern.test(name || '') || urlPattern.test(company || '')) {
      return new Response(
        JSON.stringify({ success: false, error: 'URLを含む送信はできません。' }),
        { status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }

    // Message length check
    if (body.message && body.message.length > 500) {
      return new Response(
        JSON.stringify({ success: false, error: '詳細は500文字以内で入力してください。' }),
        { status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }

    // Get API key from environment
    const apiKey = context.env.RESEND_API_KEY;
    if (!apiKey) {
      console.error('RESEND_API_KEY is not set');
      return new Response(
        JSON.stringify({ success: false, error: '送信設定にエラーがあります。お電話にてお問い合わせください。' }),
        { status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }

    const phone = body.phone || '（未記入）';
    const message = body.message || '（未記入）';

    const resendEndpoint = 'https://api.resend.com/emails';
    const authHeaders = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    };

    // --- 自動返信本文（送信にも、管理通知の「写し」にも同じ文面を使う） ---
    const autoReplyBody = `
${name} 様

この度はサポートアーム ウェブサイトよりお問い合わせいただき、
誠にありがとうございます。

以下の内容でお問い合わせを受け付けいたしました。
担当者より折り返しご連絡いたしますので、
今しばらくお待ちくださいますようお願い申し上げます。

━━━━━━━━ お問い合わせ内容 ━━━━━━━━
【ご相談内容】${inquiry_type}
【会社名】${company}
【お名前】${name}
【電話番号】${phone}
【業種・職種】${contact_job_role}
【詳細】
${message}
━━━━━━━━━━━━━━━━━━━━━━━━━

※ このメールは自動送信されています。
  本メールへの返信はできませんのでご了承ください。
  ご不明点がございましたら下記までご連絡ください。

─────────────────────────────
岩代工業株式会社
営業部
TEL: 03-3756-1511
Email: customer@iwashiro.co.jp
https://support-arm.com
─────────────────────────────
`.trim();

    // --- ① 自動返信を先に送信し、成否・日時を記録 ---
    let autoReplySent = false;
    let autoReplyAt = '';
    try {
      const ar = await fetch(resendEndpoint, {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({
          from: 'サポートアーム 岩代工業 <noreply@support-arm.com>',
          to: [email],
          subject: '【サポートアーム】お問い合わせありがとうございます',
          text: autoReplyBody,
        }),
      });
      autoReplySent = ar.ok;
      if (ar.ok) {
        autoReplyAt = jstStamp();
      } else {
        console.error('Auto-reply error:', ar.status, await ar.text());
      }
    } catch (autoReplyError) {
      console.error('Auto-reply error:', autoReplyError);
    }

    // --- ② 管理通知（自動返信ステータス＋写しをぶら下げ） ---
    const replyStatus = autoReplySent
      ? `✅ 自動返信メール：送信済み（宛先: ${email} / ${autoReplyAt}）`
      : `⚠️ 自動返信メール：送信に失敗しました（宛先: ${email}）。お手数ですが手動でご連絡ください。`;

    const emailBody = `
サポートアーム ウェブサイトからお問い合わせがありました。

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
【ご相談内容】${inquiry_type}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

■ 会社名: ${company}
■ お名前: ${name}
■ メールアドレス: ${email}
■ 電話番号: ${phone}
■ 業種・職種: ${contact_job_role}

■ 詳細:
${message}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
${replyStatus}

──────── 以下、お客様へ送信した自動返信メールの写し ────────

${autoReplyBody}
──────────────────────────────────────────

このメールは https://support-arm.com のお問い合わせフォームから自動送信されました。
`.trim();

    const resendResponse = await fetch(resendEndpoint, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({
        from: 'サポートアーム ウェブサイト <noreply@support-arm.com>',
        to: ['customer@iwashiro.co.jp'],
        reply_to: email,
        subject: `【サポートアーム】${inquiry_type} - ${company}様`,
        text: emailBody,
      }),
    });

    // --- ③ Save to Google Sheets via GAS (non-blocking) ---
    const gasUrl = context.env.GAS_WEBHOOK_URL;
    if (gasUrl) {
      try {
        await fetch(gasUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: 'contact',
            site: 'support-arm',
            company,
            name,
            email,
            phone: body.phone || '',
            contact_job_role,
            inquiry_type,
            message: body.message || '',
            auto_reply_sent: autoReplySent ? 'sent' : 'failed',
          }),
        });
      } catch (gasError) {
        console.error('GAS write error:', gasError);
      }
    }

    // --- ④ WP wp_iwashiro_contacts へ記録のみ送信（共有ポータル統合用・non-blocking） ---
    //   公式サイトの受信プラグイン iwashiro-contact が record_only=1 を受けると
    //   「DB記録のみ（自動返信・管理通知・GAS送信はスキップ）」で保存し、共有ポータルに表示される。
    //   ① Resend / ③ GAS は既に実施済みのため二重発火させない。失敗してもユーザー応答には影響させない。
    // WordPressは /wp/ 配下に設置されているため REST は /wp/wp-json/...（/wp 抜けは404）
    const wpContactUrl = context.env.WP_CONTACT_URL
      || 'https://iwashiro.co.jp/wp/wp-json/iwashiro/v1/contact';
    // 共有シークレット（Cloudflare Pages 環境変数 WP_INGEST_SECRET）。公開リポジトリのため値はコードに置かない。
    // WP側の IWASHIRO_INGEST_SECRET と一致すれば record_only 投入が許可される。未設定なら送らない（WP側も未設定なら従来動作）。
    const wpIngestSecret = context.env.WP_INGEST_SECRET || '';
    try {
      await fetch(wpContactUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(wpIngestSecret ? { 'X-Iwashiro-Token': wpIngestSecret } : {}),
        },
        body: JSON.stringify({
          record_only: 1,
          source: 'support-arm',
          company,
          name,
          email,
          phone: body.phone || '',
          inquiry_type,
          message: body.message || '',   // WP側で details に変換
          contact_job_role,              // WP側で details 先頭に追記
          source_url: 'https://support-arm.com',
          auto_reply_sent: autoReplySent ? 1 : 0,
        }),
      });
    } catch (wpError) {
      console.error('WP record_only write error:', wpError);
    }

    // 管理通知（最重要）の失敗時は、フロントのmailtoフォールバックを促すため500を返す
    if (!resendResponse.ok) {
      const errorData = await resendResponse.text();
      console.error('Resend error:', resendResponse.status, errorData);
      return new Response(
        JSON.stringify({ success: false, error: '送信に失敗しました。お電話にてお問い合わせください。' }),
        { status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }

    return new Response(
      JSON.stringify({ success: true }),
      { status: 200, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
    );
  } catch (error) {
    console.error('Contact form error:', error);
    return new Response(
      JSON.stringify({ success: false, error: '送信に失敗しました。お電話にてお問い合わせください。' }),
      { status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
    );
  }
}

// Handle CORS preflight
export async function onRequestOptions() {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}
