/**
 * Cloudflare Pages Function: Survey Response Handler
 * Sends survey responses to customer@iwashiro.co.jp via Resend API
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

    const {
      job_role,
      welding_types,
      lev_status,
      introduction_scale,
      free_text,
      downloaded_at,
    } = body;

    // Validate required fields
    if (!job_role || !welding_types || !lev_status || !introduction_scale) {
      return new Response(
        JSON.stringify({ success: false, error: 'アンケートの回答が不足しています。' }),
        { status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }

    // Get API key from environment
    const apiKey = context.env.RESEND_API_KEY;
    if (!apiKey) {
      console.error('RESEND_API_KEY is not set');
      return new Response(
        JSON.stringify({ success: false, error: '送信設定にエラーがあります。' }),
        { status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }

    // Format welding types (array to string)
    const weldingTypesStr = Array.isArray(welding_types)
      ? welding_types.join('、')
      : welding_types;

    const emailBody = `
【資料DLアンケート回答】溶接ヒューム法規制 完全対応ガイド

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
ダウンロード日時: ${downloaded_at || new Date().toISOString()}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

■ Q1. 業種・職種
${job_role}

■ Q2. 現在行っている溶接作業の種類
${weldingTypesStr}

■ Q3. 局所排気装置の導入状況
${lev_status}

■ Q4. 導入検討の規模・予算感
${introduction_scale}

■ Q5. 導入にあたってのお悩み・ご相談
${free_text || '（未記入）'}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
このメールは https://support-arm.com の資料ダウンロードアンケートから自動送信されました。
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
        subject: `【資料DL】アンケート回答 - ${job_role} / ${lev_status}`,
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
            type: 'survey',
            job_role,
            welding_types: weldingTypesStr,
            lev_status,
            introduction_scale,
            free_text: free_text || '',
          }),
        });
      } catch (gasError) {
        console.error('GAS write error:', gasError);
      }
    }

    if (resendResponse.ok) {
      return new Response(
        JSON.stringify({ success: true }),
        { status: 200, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    } else {
      const errorData = await resendResponse.text();
      console.error('Resend error:', resendResponse.status, errorData);
      // Even if email fails, allow download (don't block user)
      return new Response(
        JSON.stringify({ success: true, emailSent: false }),
        { status: 200, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }
  } catch (error) {
    console.error('Survey form error:', error);
    // Allow download even on error
    return new Response(
      JSON.stringify({ success: true, emailSent: false }),
      { status: 200, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
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
