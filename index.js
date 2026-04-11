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
      
      
      const adminThreadId = 3424; 

      
      if (url.pathname === '/order') {
        const body = await request.json();
        const u = body.user || {};
        
        const username = u.username ? `@${u.username}` : 'Без юзернейму';
        const fullName = `${u.first_name || ''} ${u.last_name || ''}`.trim() || 'Анонім';
        const userId = u.id || 'Невідомо';
        const lang = u.language_code || 'ХЗ';
        const premium = u.is_premium ? '⭐️ Premium' : 'Звичайний';

        
        const userLink = userId !== 'Невідомо' ? `<a href="tg://user?id=${userId}">${fullName}</a>` : fullName;

        const messageText = `📋 Нове замовлення реклами!\n\n` +
                            `👤 Клієнт: ${userLink} (${username})\n` +
                            `🆔 ID: <code>${userId}</code>\n` +
                            `🌍 Мова: ${lang} | 💎 Статус: ${premium}\n` +
                            `➖➖➖➖➖➖➖➖\n` +
                            `${body.text}`;

        const payload = {
            chat_id: adminGroup,
            text: messageText,
            parse_mode: 'HTML'
        };
        if (adminThreadId) payload.message_thread_id = adminThreadId;

        await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });

        return new Response('OK', { headers: { 'Access-Control-Allow-Origin': '*' } });
      }

      const update = await request.json();

      if (update.message) {
        const msg = update.message;
        const chatId = msg.chat.id.toString();

        
        if (msg.web_app_data) {
          const orderText = msg.web_app_data.data;
          const u = msg.from || {};
          
          const username = u.username ? `@${u.username}` : 'Без юзернейму';
          const fullName = `${u.first_name || ''} ${u.last_name || ''}`.trim() || 'Анонім';
          const userId = u.id || 'Невідомо';
          const lang = u.language_code || 'ХЗ';
          const premium = u.is_premium ? '⭐️ Premium' : 'Звичайний';

          const userLink = userId !== 'Невідомо' ? `<a href="tg://user?id=${userId}">${fullName}</a>` : fullName;

          const messageText = `📋 Нове замовлення реклами!\n\n` +
                              `👤 Клієнт: ${userLink} (${username})\n` +
                              `🆔 ID: <code>${userId}</code>\n` +
                              `🌍 Мова: ${lang} | 💎 Статус: ${premium}\n` +
                              `➖➖➖➖➖➖➖➖\n` +
                              `${orderText}`;

          const payload = {
              chat_id: adminGroup,
              text: messageText,
              parse_mode: 'HTML'
          };
          if (adminThreadId) payload.message_thread_id = adminThreadId;

          await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
          });
        }

        
        if (chatId === adminGroup.toString() && msg.reply_to_message) {
            const originalText = msg.reply_to_message.text || '';
            
            const match = originalText.match(/ID:\s*(\d+)/);
            
            if (match && match[1]) {
                const targetUserId = match[1];
                
                
                await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    chat_id: targetUserId,
                    text: `📩 Відповідь від адмінів:\n\n${msg.text}`
                  })
                });
            }
        }

        
        if (msg.text === '/start') {
          const replyMarkup = {
            keyboard: [
              [{
                text: "❇️ Замовити рекламу",
                web_app: { url: "https://tvoy-github-pages.com" } // Твоя лінка
              }]
            ],
            resize_keyboard: true
          };

          await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              chat_id: msg.chat.id,
              text: "Привіт! Тисни кнопку нижче, щоб відкрити прайс і замовити рекламу:",
              reply_markup: replyMarkup
            })
          });
        }
      }

      return new Response('OK');
    }

    return new Response('Method not allowed', { status: 405 });
  }
}
