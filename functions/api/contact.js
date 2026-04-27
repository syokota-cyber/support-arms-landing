/**
 * Cloudflare Pages Function: Contact Form Handler
 * Sends email to customer@iwashiro.co.jp via Resend API
 *
 * Required: Set RESEND_API_KEY in Cloudflare Pages environment variables
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

    // Build email body

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
■ 業種・職種: ${contact_job_role}

■ 詳細:
${message}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
このメールは https://support-arm.com のお問い合わせフォームから自動送信されました。
`.trim();

    // Send email via Resend API
    const resendResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        from: 'サポートアーム ウェブサイト <noreply@support-arm.com>',
        to: ['customer@iwashiro.co.jp'],
        reply_to: email,
        subject: `【サポートアーム】${inquiry_type} - ${company}様`,
        text: emailBody,
      }),
    });

    // Save to Google Sheets via GAS (non-blocking)
    const gasUrl = context.env.GAS_WEBHOOK_URL;
    if (gasUrl) {
      try {
        await fetch(gasUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: 'contact',
            company,
            name,
            email,
            phone: body.phone || '',
            contact_job_role,
            inquiry_type,
            message: body.message || '',
          }),
        });
      } catch (gasError) {
        console.error('GAS write error:', gasError);
      }
    }

    if (!resendResponse.ok) {
      const errorData = await resendResponse.text();
      console.error('Resend error:', resendResponse.status, errorData);
      return new Response(
        JSON.stringify({ success: false, error: '送信に失敗しました。お電話にてお問い合わせください。' }),
        { status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }

    // Auto-reply to the submitter (non-blocking)
    try {
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
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

※ このメールは自動送信されています。
  本メールへの返信はできませんのでご了承ください。
  ご不明点がございましたら下記までご連絡ください。

─────────────────────────────
岩代工業株式会社
サポートアーム事業部
TEL: 0250-62-1477
Email: customer@iwashiro.co.jp
https://support-arm.com
─────────────────────────────
`.trim();

      await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          from: 'サポートアーム 岩代工業 <noreply@support-arm.com>',
          to: [email],
          subject: '【サポートアーム】お問い合わせありがとうございます',
          text: autoReplyBody,
        }),
      });
    } catch (autoReplyError) {
      console.error('Auto-reply error:', autoReplyError);
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
