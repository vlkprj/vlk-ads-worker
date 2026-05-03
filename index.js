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

      // === ЗАМОВЛЕННЯ З САЙТУ (/order) ===
      if (url.pathname === '/order') {
        const body = await request.json();
        const u = body.user || {};
        const userId = u.id || 'Невідомо';

        const safeFirstName = (u.first_name || 'Анонім').replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
        const safeUsername = u.username ? `(@${u.username})` : '';

        const dossierText = `📋 <b>Нове замовлення реклами</b>\n\n👤 <a href="tg://user?id=${userId}">${safeFirstName}</a> ${safeUsername}\n🆔 <code>${userId}</code>\n🌐 мова: ${u.language_code || 'uk'}\n➖➖➖➖➖➖➖➖\n${body.text}`;

        const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: adminGroup,
            text: dossierText,
            parse_mode: 'HTML',
            message_thread_id: adminThreadId
          })
        });
        
        const data = await res.json();
        // Зберігаємо в базу (на 30 днів)
        if (data.ok && userId !== 'Невідомо') {
          await env.REKLAMA_KV.put(`msg:${data.result.message_id}`, userId.toString(), { expirationTtl: 2592000 });
        }
        
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

      // === ВІДПОВІДЬ АДМІНА (РЕПЛАЙ) ===
      if (chatId === adminGroup && msg.reply_to_message && msg.message_thread_id === adminThreadId) {
        const repliedMsgId = msg.reply_to_message.message_id;
        
        // Шукаємо в базі, чиє це повідомлення
        const targetUserId = await env.REKLAMA_KV.get(`msg:${repliedMsgId}`);
        
        if (targetUserId) {
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
        } else {
          // Якщо ти репнув на щось дуже старе або ліве, бот все одно скаже
          await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
              chat_id: adminGroup, 
              message_thread_id: adminThreadId,
              text: "⚠️ ВІДПОВІДЬ НЕ ДОСТАВЛЕНА! Цього повідомлення вже немає в базі або це глюк." 
            })
          });
        }
        return new Response('OK');
      }

      // === ЗАМОВЛЕННЯ ЧЕРЕЗ КНОПКУ (WEB_APP_DATA) ===
      if (msg.web_app_data) {
        const u = msg.from || {};
        const safeFirstName = (u.first_name || 'Анонім').replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
        const safeUsername = u.username ? `(@${u.username})` : '';

        const dossierText = `📋 <b>Нове замовлення реклами!</b>\n\n👤 <a href="tg://user?id=${u.id}">${safeFirstName}</a> ${safeUsername}\n🆔 <code>${u.id}</code>\n🌐 мова: ${u.language_code || 'uk'}\n➖➖➖➖➖➖➖➖\n${msg.web_app_data.data}`;
        
        const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: adminGroup,
            text: dossierText,
            parse_mode: 'HTML',
            message_thread_id: adminThreadId
          })
        });

        const data = await res.json();
        if (data.ok) {
          await env.REKLAMA_KV.put(`msg:${data.result.message_id}`, u.id.toString(), { expirationTtl: 2592000 });
        }
        return new Response('OK');
      }

      // === СТАРТ ТА ЗВИЧАЙНІ ПОВІДОМЛЕННЯ ВІД КЛІЄНТА ===
      if (chatId > 0 && chatId !== adminGroup) {
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

          // 1. Відправляємо досьє
          const res1 = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              chat_id: adminGroup,
              message_thread_id: adminThreadId,
              text: `💬 <b>Повідомлення від клієнта</b>\n👤 <a href="tg://user?id=${u.id}">${safeFirstName}</a> ${safeUsername}\n🆔 <code>${u.id}</code>`,
              parse_mode: 'HTML'
            })
          });
          const data1 = await res1.json();
          if (data1.ok) await env.REKLAMA_KV.put(`msg:${data1.result.message_id}`, u.id.toString(), { expirationTtl: 2592000 });

          // 2. Копіюємо текст/файл клієнта
          const res2 = await fetch(`https://api.telegram.org/bot${token}/copyMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              chat_id: adminGroup,
              from_chat_id: chatId,
              message_id: msg.message_id,
              message_thread_id: adminThreadId
            })
          });
          const data2 = await res2.json();
          if (data2.ok) await env.REKLAMA_KV.put(`msg:${data2.result.message_id}`, u.id.toString(), { expirationTtl: 2592000 });
        }
      }
      return new Response('OK');
    }
    return new Response('Method not allowed', { status: 405 });
  }
}
