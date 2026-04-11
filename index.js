export default {
  async fetch(request, env) {
    if (request.method === 'OPTIONS') {
      return new Response('OK', {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type',
        }
      });
    }

    if (request.method === 'POST') {
      const url = new URL(request.url);
      const token = env.BOT_TOKEN;
      const adminGroup = env.GROUP_ID;

      if (url.pathname === '/order') {
  const body = await request.json();
  const u = body.user || {};
  
 
  const username = u.username ? `@${u.username}` : 'Без юзернейму';
  const fullName = `${u.first_name || ''} ${u.last_name || ''}`.trim() || 'Анонім';
  const userId = u.id || 'Невідомо';
  const lang = u.language_code || 'ХЗ';
  const premium = u.is_premium ? '⭐️ Premium' : 'Звичайний';

 
  const messageText = `📋 Нове замовлення реклами!\n\n` +
                      `👤 Клієнт: ${fullName} (${username})\n` +
                      `🆔 ID: <code>${userId}</code>\n` +
                      `🌍 Мова: ${lang} | 💎 Статус: ${premium}\n` +
                      `➖➖➖➖➖➖➖➖\n` +
                      `${body.text}`;

  await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: adminGroup,
      text: messageText,
      parse_mode: 'HTML'
    })
  });

  return new Response('OK', { headers: { 'Access-Control-Allow-Origin': '*' } });
}


      const update = await request.json();

      if (update.message && update.message.text === '/start') {
        const chatId = update.message.chat.id;
        const replyMarkup = {
          keyboard: [
            [{
              text: "Замовити рекламу 📋",
              web_app: { url: "https://vlkprj.github.io/ads/" }
            }]
          ],
          resize_keyboard: true
        };

        await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: chatId,
            text: "Привіт! Тисни кнопку нижче, щоб відкрити прайс і замовити рекламу:",
            reply_markup: replyMarkup
          })
        });
      }

      return new Response('OK');
    }

    return new Response('Method not allowed', { status: 405 });
  }
}
