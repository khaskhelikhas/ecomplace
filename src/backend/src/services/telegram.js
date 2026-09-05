/**
 * Post the best new deals to a Telegram channel.
 *
 *   TELEGRAM_BOT_TOKEN   from @BotFather
 *   TELEGRAM_CHAT_ID     channel/group id or "@yourchannel"
 *
 * Create a bot with @BotFather, add it to your channel as an admin, then
 * set these two values. No-ops quietly when unset.
 */

const esc = (s = '') =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

export async function postDealToTelegram(product) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;
  if (!token || !chatId || !product) return false;

  const discount = product.marginPercentage ? ` · ${product.marginPercentage}% off` : '';
  const ends =
    product.expiresInHours != null && product.expiresInHours > 0
      ? ` · ends in ${product.expiresInHours}h`
      : '';
  const signal = product.recommendation ? `\n🎯 <b>${product.recommendation}</b> — ${esc(product.reason || '')}` : '';

  const text =
    `🛍️ <b>${esc(product.name)}</b>\n` +
    `💵 <b>$${product.currentPrice}</b>${discount} · ${esc(product.source)}${ends}` +
    signal +
    `\n\n<a href="${product.sourceUrl}">Open deal »</a>`;

  try {
    const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: 'HTML',
        disable_web_page_preview: false,
      }),
    });
    if (!res.ok) {
      console.warn('Telegram error:', res.status, (await res.text()).slice(0, 200));
      return false;
    }
    return true;
  } catch (err) {
    console.warn('Telegram post failed:', err.message);
    return false;
  }
}
