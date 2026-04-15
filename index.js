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

    const token = env.BOT_TOKEN;
    const adminGroup = env.GROUP_ID ? env.GROUP_ID.toString().trim() : "";
    const adminThreadId = 3424; 

    if (request.method === 'POST') {
      const url = new URL(request.url);

      if (url.pathname === '/order') {
        const body = await request.json();
        const u = body.user || {};
        const userId = u.id || 'Невідомо';

        // Надійна екранізація для HTML, щоб ніякі дивні символи в імені не ламали бота
        const safeFirstName = (u.first_name || 'Анонім').replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
        const safeUsername = u.username ? `(@${u.username})` : '';

        // Профіль тепер зашитий прямо в ім'я, жодних небезпечних інлайн-кнопок
        const dossierText = `📋 <b>Нове замовлення реклами</b>\n\n👤 <a href="tg://user?id=${userId}">${safeFirstName}</a> ${safeUsername}\n🆔 <code>${userId}</code>\n🌐 мова: ${u.language_code || 'uk'}\n➖➖➖➖➖➖➖➖\n${body.text}`;

        await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: adminGroup,
            text: dossierText,
            parse_mode: 'HTML',
            message_thread_id: adminThreadId
          })
        });
        
        if (userId !== 'Невідомо') {
          await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ chat_id: userId, text: "✅ Ваше замовлення успішно передано адміністраторам! Очікуйте на відповідь." })
          }).catch(() => {});
        }
        return new Response('OK', { headers: { 'Access-Control-Allow-Origin': '*' } });
      }

      const update = await request.json();
      if (!update.message) return new Response('OK');

      const msg = update.message;
      const chatId = msg.chat.id.toString();

      // ВІДПОВІДЬ АДМІНА (РЕПЛАЙ)
      if (chatId === adminGroup && msg.reply_to_message && msg.message_thread_id === adminThreadId) {
        const originalText = msg.reply_to_message.text || msg.reply_to_message.caption || '';
        const match = originalText.match(/🆔\s*(\d+)/); 
        
        if (match && match[1]) {
          const targetUserId = match[1];
          const prefix = `📩 <b>Відповідь від адмінів:</b>\n\n`;
          
          if (msg.text) {
            await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ chat_id: targetUserId, text: prefix + msg.text, parse_mode: 'HTML' })
            });
          } else {
            await fetch(`https://api.telegram.org/bot${token}/copyMessage`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                chat_id: targetUserId,
                from_chat_id: adminGroup,
                message_id: msg.message_id,
                caption: msg.caption ? prefix + msg.caption : `📩 Відповідь від адмінів`,
                parse_mode: 'HTML'
              })
            });
          }
        }
        return new Response('OK');
      }

      // ЗАМОВЛЕННЯ ЧЕРЕЗ КНОПКУ (WEB_APP_DATA)
      if (msg.web_app_data) {
        const u = msg.from || {};
        const safeFirstName = (u.first_name || 'Анонім').replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
        const safeUsername = u.username ? `(@${u.username})` : '';

        const dossierText = `📋 <b>Нове замовлення реклами!</b>\n\n👤 <a href="tg://user?id=${u.id}">${safeFirstName}</a> ${safeUsername}\n🆔 <code>${u.id}</code>\n🌐 мова: ${u.language_code || 'uk'}\n➖➖➖➖➖➖➖➖\n${msg.web_app_data.data}`;
        
        await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: adminGroup,
            text: dossierText,
            parse_mode: 'HTML',
            message_thread_id: adminThreadId
          })
        });
        return new Response('OK');
      }

      // СТАРТ ТА ЗВИЧАЙНІ ПОВІДОМЛЕННЯ
      if (chatId > 0) {
        if (msg.text === '/start') {
          await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              chat_id: chatId,
              text: "Вітаю! Тисни кнопку «Глянути» зліва біля поля вводу."
            })
          });
        } else {
          const u = msg.from || {};
          const safeFirstName = (u.first_name || 'Анонім').replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
          const safeUsername = u.username ? `(@${u.username})` : '';

          await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              chat_id: adminGroup,
              message_thread_id: adminThreadId,
              text: `💬 <b>Повідомлення від клієнта</b>\n👤 <a href="tg://user?id=${u.id}">${safeFirstName}</a> ${safeUsername}\n🆔 <code>${u.id}</code>`,
              parse_mode: 'HTML'
            })
          });

          await fetch(`https://api.telegram.org/bot${token}/copyMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              chat_id: adminGroup,
              from_chat_id: chatId,
              message_id: msg.message_id,
              message_thread_id: adminThreadId
            })
          });
        }
      }
      return new Response('OK');
    }
    return new Response('Method not allowed', { status: 405 });
  }
}
