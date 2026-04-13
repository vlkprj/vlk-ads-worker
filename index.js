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

        const dossierText = `📋 <b>Нове замовлення реклами</b>\n\n👤 ${u.first_name || 'Анонім'} ${u.username ? `(@${u.username})` : ''}\n🆔 <code>${userId}</code>\n🌐 мова: ${u.language_code || 'uk'}\n➖➖➖➖➖➖➖➖\n${body.text}`;

        await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: adminGroup,
            text: dossierText,
            parse_mode: 'HTML',
            message_thread_id: adminThreadId,
            reply_markup: { inline_keyboard: [[{ text: "👤 Профіль", url: `tg://user?id=${userId}` }]] }
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
        const dossierText = `📋 <b>Нове замовлення реклами!</b>\n\n👤 ${u.first_name || 'Анонім'} ${u.username ? `(@${u.username})` : ''}\n🆔 <code>${u.id}</code>\n🌐 мова: ${u.language_code || 'uk'}\n➖➖➖➖➖➖➖➖\n${msg.web_app_data.data}`;
        await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: adminGroup,
            text: dossierText,
            parse_mode: 'HTML',
            message_thread_id: adminThreadId,
            reply_markup: { inline_keyboard: [[{ text: "👤 Профіль", url: `tg://user?id=${u.id}` }]] }
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
              text: "Вітаю! Тисни кнопку «Відкрити» зліва біля поля вводу, щоб переглянути прайс."
            })
          });
        } else {
          // Звичайне повідомлення - робимо досьє з кнопкою профілю
          const u = msg.from || {};
          await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              chat_id: adminGroup,
              message_thread_id: adminThreadId,
              text: `💬 <b>Повідомлення від клієнта</b>\n👤 ${u.first_name} ${u.username ? `(@${u.username})` : ''}\n🆔 <code>${u.id}</code>`,
              parse_mode: 'HTML',
              reply_markup: { inline_keyboard: [[{ text: "👤 Профіль", url: `tg://user?id=${u.id}` }]] }
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
