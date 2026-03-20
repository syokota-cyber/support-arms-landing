/**
 * Cloudflare Pages Function: Contact Form Handler
 * Sends email to customer@iwashiro.co.jp via MailChannels API
 *
 * Required: Add SPF record to DNS:
 *   _mailchannels.support-arm.com TXT "v=mc1 cfid=support-arms-landing.pages.dev"
 *   (adjust cfid to your actual Cloudflare Pages project name)
 */

export async function onRequestPost(context) {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };

  try {
    const body = await context.request.json();

    // Validate required fields
    const { name, email, inquiry_type } = body;
    if (!name || !email || !inquiry_type) {
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

    // Build email body
    const company = body.company || '（未記入）';
    const phone = body.phone || '（未記入）';
    const message = body.message || '（未記入）';

    const emailBody = `
サポートアーム ウェブサイトからお問い合わせがありました。

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
【ご相談内容】${inquiry_type}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

■ 会社名: ${company}
■ お名前: ${name}
■ メールアドレス: ${email}
■ 電話番号: ${phone}

■ 詳細:
${message}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
このメールは https://support-arm.com のお問い合わせフォームから自動送信されました。
`.trim();

    // Send email via MailChannels
    const mailResponse = await fetch('https://api.mailchannels.net/tx/v1/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        personalizations: [
          {
            to: [{ email: 'customer@iwashiro.co.jp', name: '岩代工業 お問い合わせ窓口' }],
          },
        ],
        from: {
          email: 'noreply@support-arm.com',
          name: 'サポートアーム ウェブサイト',
        },
        reply_to: {
          email: email,
          name: name,
        },
        subject: `【サポートアーム】${inquiry_type} - ${company !== '（未記入）' ? company : name}様`,
        content: [
          {
            type: 'text/plain',
            value: emailBody,
          },
        ],
      }),
    });

    if (mailResponse.status === 202 || mailResponse.status === 200) {
      return new Response(
        JSON.stringify({ success: true }),
        { status: 200, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    } else {
      const errorText = await mailResponse.text();
      console.error('MailChannels error:', mailResponse.status, errorText);
      return new Response(
        JSON.stringify({ success: false, error: '送信に失敗しました。お電話にてお問い合わせください。' }),
        { status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }
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
