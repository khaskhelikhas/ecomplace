/**
 * Email notifications via Resend (https://resend.com) - free tier, plain REST.
 *
 *   RESEND_API_KEY   your Resend API key
 *   NOTIFY_FROM      verified sender, e.g. "EcomPlace <deals@yourdomain.com>"
 *                    (defaults to Resend's onboarding sender for testing)
 *   APP_URL          public app URL for links (default the live site)
 *
 * No-ops quietly when RESEND_API_KEY is not set.
 */

const APP_URL = process.env.APP_URL || 'https://ecomplace-app-4db34.web.app';

async function sendEmail(to, subject, html) {
  const key = process.env.RESEND_API_KEY;
  if (!key || !to) return false;

  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${key}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: process.env.NOTIFY_FROM || 'EcomPlace <onboarding@resend.dev>',
        to: [to],
        subject,
        html,
      }),
    });
    if (!res.ok) {
      console.warn('Resend error:', res.status, (await res.text()).slice(0, 200));
      return false;
    }
    return true;
  } catch (err) {
    console.warn('Email send failed:', err.message);
    return false;
  }
}

/**
 * Notify a user that one of their price alerts fired.
 */
export async function notifyTriggeredAlert({ email, product, alert }) {
  if (!email) return false;
  const target =
    alert.targetPrice != null ? `$${alert.targetPrice}` : `${alert.targetMargin}% off`;

  const html = `
    <div style="font-family:system-ui,sans-serif;max-width:520px">
      <h2 style="color:#2563eb;margin:0 0 4px">EcomPlace price alert</h2>
      <p style="color:#555">Your target of <b>${target}</b> was hit.</p>
      <div style="border:1px solid #e5e7eb;border-radius:8px;padding:16px;margin:12px 0">
        <p style="font-weight:600;margin:0 0 8px">${product.name}</p>
        <p style="margin:2px 0">Now: <b>$${product.currentPrice}</b>
          &nbsp;·&nbsp; ${product.marginPercentage || 0}% off
          &nbsp;·&nbsp; ${product.source}</p>
        ${product.recommendation ? `<p style="margin:2px 0;color:#16a34a">Signal: <b>${product.recommendation}</b> — ${product.reason || ''}</p>` : ''}
        <p style="margin:12px 0 0">
          <a href="${product.sourceUrl}" style="background:#2563eb;color:#fff;padding:8px 14px;border-radius:6px;text-decoration:none">View deal</a>
        </p>
      </div>
      <p style="color:#888;font-size:12px">
        <a href="${APP_URL}/alerts">Manage alerts</a> ·
        Links may earn EcomPlace a commission.
      </p>
    </div>`;

  return sendEmail(email, `Price alert: ${product.name.slice(0, 60)}`, html);
}

/**
 * Optional weekly-digest style email of the top deals.
 */
export async function sendDealDigest(email, deals) {
  if (!email || !deals?.length) return false;
  const rows = deals
    .slice(0, 10)
    .map(
      (d) => `
      <tr>
        <td style="padding:6px 8px">${d.name}</td>
        <td style="padding:6px 8px;font-weight:600">$${d.currentPrice}</td>
        <td style="padding:6px 8px;color:#16a34a">${d.marginPercentage || 0}%</td>
        <td style="padding:6px 8px"><a href="${d.sourceUrl}">open</a></td>
      </tr>`
    )
    .join('');

  const html = `
    <div style="font-family:system-ui,sans-serif;max-width:600px">
      <h2 style="color:#2563eb">Top deals right now</h2>
      <table style="border-collapse:collapse;width:100%">${rows}</table>
      <p style="color:#888;font-size:12px">
        <a href="${APP_URL}">See all on EcomPlace</a> · affiliate links
      </p>
    </div>`;

  return sendEmail(email, 'EcomPlace — top deals', html);
}
