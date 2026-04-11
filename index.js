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
        const firstName = u.first_name || 'Анонім';
        const usernameStr = u.username ? `(@${u.username})` : '';
        const userId = u.id || 'Невідомо';
        const lang = u.language_code || 'uk';

        const dossierText = `📋 <b>Нове замовлення реклами</b>\n\n👤 ${firstName} ${usernameStr}\n🆔 <code>${userId}</code>\n🌐 мова: ${lang}\n➖➖➖➖➖➖➖➖\n${body.text}`;

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

      
            if (chatId === adminGroup && msg.reply_to_message && msg.message_thread_id === adminThreadId) {
        const originalText = msg.reply_to_message.text || msg.reply_to_message.caption || '';
        const match = originalText.match(/🆔\s*(\d+)/); 
        
        if (match && match[1]) {
          const targetUserId = match[1];
          
          if (msg.text) {
            await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                chat_id: targetUserId,
                text: `📩 <b>Відповідь від адмінів:</b>\n\n${msg.text}`,
                parse_mode: 'HTML'
              })
            });
          } else {
            const newCaption = msg.caption ? `📩 <b>Відповідь від адмінів:</b>\n\n${msg.caption}` : `📩 Відповідь від адмінів`;
            await fetch(`https://api.telegram.org/bot${token}/copyMessage`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                chat_id: targetUserId,
                from_chat_id: adminGroup,
                message_id: msg.message_id,
                caption: newCaption,
                parse_mode: 'HTML'
              })
            });
          }
        }
      }


    
      if (msg.web_app_data) {
        const u = msg.from || {};
        const dossierText = `📋 <b>Нове замовлення реклами</b>\n\n👤 ${u.first_name || 'Анонім'} ${u.username ? `(@${u.username})` : ''}\n🆔 <code>${u.id}</code>\n🌐 мова: ${u.language_code || 'uk'}\n➖➖➖➖➖➖➖➖\n${msg.web_app_data.data}`;
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
      }

     
      if (msg.text === '/start') {
        await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: chatId,
            text: "Вітаю! Тисни кнопку «Відкрити» зліва або кнопку нижче",
            reply_markup: {
              keyboard: [[{ text: "❇️ Замовити рекламу", web_app: { url: "https://vlkprj.github.io/ads" } }]],
              resize_keyboard: true
            }
          })
        });
      }

      
      if (chatId > 0 && msg.text !== '/start' && !msg.web_app_data) {
        const u = msg.from || {};
        await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: adminGroup,
            message_thread_id: adminThreadId,
            text: `💬 <b>Повідомлення від клієнта</b>\n👤 <a href="tg://user?id=${u.id}">${u.first_name}</a> ${u.username ? `(@${u.username})` : ''}\n🆔 <code>${u.id}</code>`,
            parse_mode: 'HTML'
          })
        });

        await fetch(`https://api.telegram.org/bot${token}/copyMessage`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ chat_id: adminGroup, from_chat_id: chatId, message_id: msg.message_id, message_thread_id: adminThreadId })
        });
      }
      return new Response('OK');
    }
    return new Response('Method not allowed', { status: 405 });
  }
}
