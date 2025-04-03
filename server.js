const express = require('express');
const fs = require('fs');
const axios = require('axios');
const bodyParser = require('body-parser');
const app = express();
const PORT = process.env.PORT || 3000;

const productFile = 'products.json';
const telegramBotToken = '7230860487:AAEGztON8bC2WLXGGnp57aVMLo56zIH8FGU';
let telegramChatId = '5206449238';

app.use(bodyParser.urlencoded({ extended: true }));
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
        products.push({ name, price, link });
        fs.writeFileSync(productFile, JSON.stringify(products, null, 2));
        res.redirect('/');
    } else {
        res.send('❌ Sila lengkapkan semua maklumat.');
    }
});

app.post('/blast', async (req, res) => {
    const products = fs.existsSync(productFile)
        ? JSON.parse(fs.readFileSync(productFile))
        : [];

    if (products.length === 0) {
        return res.send('❌ Tiada produk untuk dihantar.');
    }

    let log = '';
    for (const product of products) {
        const message = `🧕🏻 <b>${product.name}</b>\nHarga: RM${product.price}\n👉 <a href='${product.link}'>Beli Sekarang</a>`;
        try {
            const response = await axios.post(`https://api.telegram.org/bot${telegramBotToken}/sendMessage`, {
                chat_id: telegramChatId,
                text: message,
                parse_mode: 'HTML'
            });
            log += `✅ Hantar ${product.name}: ${response.status}\n`;
        } catch (err) {
            log += `❌ Gagal hantar ${product.name}: ${err.message}\n`;
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
            telegramChatId = lastChatId;
            res.send(`🔍 Chat ID anda: <strong>${lastChatId}</strong>`);
        } else {
            res.send('❌ Gagal dapatkan Chat ID. Pastikan anda sudah start chat dengan bot.');
        }
    } catch (err) {
        res.send(`❌ Error: ${err.message}`);
    }
});

app.listen(PORT, () => {
    console.log(`🚀 Affiliate Admin Panel running at http://localhost:${PORT}`);
});
