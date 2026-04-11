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
        
        const firstName = u.first_name || 'Анонім';
        const usernameStr = u.username ? `(@${u.username})` : '';
        const userId = u.id || 'Невідомо';
        const lang = u.language_code || 'uk';

        const dossierText = `📋 <b>Нове замовлення реклами!</b>\n\n🧑 ${firstName} ${usernameStr}\n🆔 <code>${userId}</code>\n🌐 мова: ${lang}\n➖➖➖➖➖➖➖➖\n${body.text}`;

        const payload = {
            chat_id: adminGroup,
            text: dossierText,
            parse_mode: 'HTML',
            message_thread_id: adminThreadId,
            reply_markup: {
                inline_keyboard: [[{ text: "👤 Профіль", url: `tg://user?id=${userId}` }]]
            }
        };

        await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        
        if (userId !== 'Невідомо') {
            await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                chat_id: userId,
                text: "✅ Ваше замовлення успішно передано адміністраторам! Очікуйте на відповідь."
              })
            }).catch(() => {});
        }

        return new Response('OK', { headers: { 'Access-Control-Allow-Origin': '*' } });
      }

      const update = await request.json();

      if (update.message) {
        const msg = update.message;
        const chatId = msg.chat.id.toString();

        if (msg.web_app_data) {
          const orderText = msg.web_app_data.data;
          const u = msg.from || {};
          
          const firstName = u.first_name || 'Анонім';
          const usernameStr = u.username ? `(@${u.username})` : '';
          const userId = u.id || 'Невідомо';
          const lang = u.language_code || 'uk';

          const dossierText = `📋 <b>Нове замовлення реклами!</b>\n\n👤 ${firstName} ${usernameStr}\n🆔 <code>${userId}</code>\n🌐 мова: ${lang}\n➖➖➖➖➖➖➖➖\n${orderText}`;

          const payload = {
              chat_id: adminGroup,
              text: dossierText,
              parse_mode: 'HTML',
              message_thread_id: adminThreadId,
              reply_markup: {
                  inline_keyboard: [[{ text: "👤 Профіль", url: `tg://user?id=${userId}` }]]
              }
          };

          await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
          });
        }

        if (chatId === adminGroup.toString() && msg.reply_to_message) {
            const originalText = msg.reply_to_message.text || '';
            const match = originalText.match(/🆔\s*(\d+)/); 
            
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
                web_app: { url: "https://tvoy-github-pages.com" } // І ось тут теж лінк не забудь!
              }]
            ],
            resize_keyboard: true
          };

          await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              chat_id: msg.chat.id,
              text: "Вітаю! Тисни кнопку «Відкрити» зліва або кнопку нижче",
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
