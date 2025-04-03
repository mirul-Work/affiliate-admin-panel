const express = require('express');
const fs = require('fs');
const axios = require('axios');
const bodyParser = require('body-parser');
const cron = require('node-cron');
const app = express();
const PORT = process.env.PORT || 3000;

const productFile = 'products.json';
const telegramBotToken = '7230860487:AAEGztON8bC2WLXGGnp57aVMLo56zIH8FGU';
const telegramChatIds = ['5206449238', '-1002549440336'];

app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static('public'));

app.get('/', (req, res) => {
    res.sendFile(__dirname + '/public/index.html');
});

app.get('/products', (req, res) => {
    const products = fs.existsSync(productFile)
        ? JSON.parse(fs.readFileSync(productFile))
        : [];
    res.json(products);
});

app.post('/save', (req, res) => {
    const { name, price, link } = req.body;
    if (name && price && link) {
        let products = fs.existsSync(productFile)
            ? JSON.parse(fs.readFileSync(productFile))
            : [];
        products.push({ id: Date.now(), name, price, link });
        fs.writeFileSync(productFile, JSON.stringify(products, null, 2));
        res.redirect('/');
    } else {
        res.send('❌ Sila lengkapkan semua maklumat.');
    }
});

app.post('/delete', (req, res) => {
    const { id } = req.body;
    let products = fs.existsSync(productFile)
        ? JSON.parse(fs.readFileSync(productFile))
        : [];
    products = products.filter(product => product.id !== parseInt(id));
    fs.writeFileSync(productFile, JSON.stringify(products, null, 2));
    res.json({ status: 'success' });
});

app.post('/edit', (req, res) => {
    const { id, name, price, link } = req.body;
    let products = fs.existsSync(productFile)
        ? JSON.parse(fs.readFileSync(productFile))
        : [];
    products = products.map(product => {
        if (product.id === parseInt(id)) {
            return { ...product, name, price, link };
        }
        return product;
    });
    fs.writeFileSync(productFile, JSON.stringify(products, null, 2));
    res.json({ status: 'success' });
});

app.post('/blast', async (req, res) => {
    const products = fs.existsSync(productFile)
        ? JSON.parse(fs.readFileSync(productFile))
        : [];

    if (products.length === 0) {
        return res.send('❌ Tiada produk untuk dihantar.');
    }

    let log = '';
    for (const chatId of telegramChatIds) {
        for (const product of products) {
            const message = `🧕🏻 <b>${product.name}</b>\nHarga: RM${product.price}\n👉 <a href='${product.link}'>Beli Sekarang</a>`;
            try {
                const response = await axios.post(`https://api.telegram.org/bot${telegramBotToken}/sendMessage`, {
                    chat_id: chatId,
                    text: message,
                    parse_mode: 'HTML'
                });
                log += `✅ Hantar ${product.name} ke ${chatId}: ${response.status}\n`;
            } catch (err) {
                log += `❌ Gagal hantar ${product.name} ke ${chatId}: ${err.message}\n`;
            }
        }
    }

    res.send(`<pre>${log}</pre>`);
});

app.post('/detect', async (req, res) => {
    try {
        const response = await axios.get(`https://api.telegram.org/bot${telegramBotToken}/getUpdates`);
        const data = response.data;
        if (data.result.length > 0) {
            const lastChatId = data.result[data.result.length - 1].message.chat.id;
            res.send(`🔍 Chat ID anda: <strong>${lastChatId}</strong>`);
        } else {
            res.send('❌ Gagal dapatkan Chat ID. Pastikan anda sudah start chat dengan bot.');
        }
    } catch (err) {
        res.send(`❌ Error: ${err.message}`);
    }
});

// === AUTO CRON SCHEDULE ===
async function autoBlast() {
    const products = fs.existsSync(productFile)
        ? JSON.parse(fs.readFileSync(productFile))
        : [];

    if (products.length > 0) {
        for (const chatId of telegramChatIds) {
            for (const product of products) {
                const message = `🧕🏻 <b>${product.name}</b>\nHarga: RM${product.price}\n👉 <a href='${product.link}'>Beli Sekarang</a>`;
                try {
                    await axios.post(`https://api.telegram.org/bot${telegramBotToken}/sendMessage`, {
                        chat_id: chatId,
                        text: message,
                        parse_mode: 'HTML'
                    });
                    console.log(`✅ Auto Blast ${product.name} to ${chatId}`);
                } catch (err) {
                    console.error(`❌ Fail Blast ${product.name} to ${chatId}:`, err.message);
                }
            }
        }
    }
}

// Malaysia Time = UTC +8 → 2AM UTC = 10AM MYT
cron.schedule('0 2 * * *', () => {
    console.log('🚀 Auto Blast Cron Triggered');
    autoBlast();
});

app.listen(PORT, () => {
    console.log(`🚀 Affiliate Admin Panel running at http://localhost:${PORT}`);
});
