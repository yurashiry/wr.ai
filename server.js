const express = require('express');
const fetch = require('node-fetch');
const cors = require('cors');
const crypto = require('crypto');

const app = express();
app.use(cors());
app.use(express.json());

// ========== ВСТАВЬТЕ ВАШ AUTHORIZATION KEY ==========
const AUTH_KEY = "MDE5ZGUyODUtOTllMS03NmI4LWI0YzUtNzUxZTU4OGM4MWRjOjU3MjFkNWZiLTQwZTItNDRhMC04NWYxLTVjZmVjZGMwYWMxYg==";  // замените на ваш ключ
// ====================================================

let accessToken = null;
let tokenExpires = 0;

async function getToken() {
    console.log('🔄 Получение access token...');
    const response = await fetch('https://ngw.devices.sberbank.ru:9443/api/v2/oauth', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${AUTH_KEY}`,
            'Content-Type': 'application/x-www-form-urlencoded',
            'RqUID': crypto.randomUUID()
        },
        body: 'scope=GIGACHAT_API_PERS'
    });
    
    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Ошибка получения токена: ${response.status} ${errorText}`);
    }
    
    const data = await response.json();
    accessToken = data.access_token;
    tokenExpires = Date.now() + (data.expires_at || 3600000);
    console.log('✅ Access token получен');
    return accessToken;
}

app.post('/api/chat', async (req, res) => {
    try {
        const { query } = req.body;
        if (!query) {
            return res.status(400).json({ error: 'Пустой запрос' });
        }
        
        console.log(`📝 Запрос: ${query.slice(0, 50)}...`);
        
        if (!accessToken || Date.now() + 60000 > tokenExpires) {
            await getToken();
        }
        
        const response = await fetch('https://gigachat.devices.sberbank.ru/api/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: 'GigaChat',
                messages: [{ role: 'user', content: query }],
                temperature: 0.7,
                max_tokens: 2000
            })
        });
        
        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`GigaChat ошибка: ${response.status} ${errorText}`);
        }
        
        const data = await response.json();
        const reply = data.choices[0].message.content;
        console.log(`✅ Ответ отправлен (${reply.length} символов)`);
        res.json({ reply });
        
    } catch (err) {
        console.error('❌ Ошибка:', err.message);
        res.status(500).json({ error: err.message });
    }
});

app.listen(3000, () => {
    console.log('🚀 Прокси-сервер запущен на http://localhost:3000');
    console.log('📌 Не закрывайте это окно!');
});
