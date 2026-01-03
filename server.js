const express = require('express');
const http = require('http');
const socketIO = require('socket.io');
const path = require('path');
require('dotenv').config();

const app = express();
const server = http.createServer(app);
const io = socketIO(server);
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.static(__dirname));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Socket.io bağlantısı
io.on('connection', (socket) => {
    console.log('Yeni kullanıcı bağlandı:', socket.id);
    
    socket.on('start-bot', async (data) => {
        try {
            const Bot = require('./bot');
            const bot = new Bot(data, io, socket);
            socket.emit('bot-status', { status: 'başlatıldı', message: 'Bot başlatılıyor...' });
        } catch (error) {
            socket.emit('bot-error', { message: `Bot başlatma hatası: ${error.message}` });
        }
    });
    
    socket.on('start-automation', (data) => {
        socket.emit('automation-status', { 
            status: 'başlatıldı', 
            message: 'Otomasyon ayarları alındı' 
        });
        io.emit('automation-data', data);
    });
    
    socket.on('stop-bot', () => {
        socket.emit('bot-status', { status: 'durduruldu', message: 'Bot durduruldu' });
    });
    
    socket.on('stop-automation', () => {
        socket.emit('automation-status', { status: 'durduruldu', message: 'Otomasyon durduruldu' });
    });
    
    socket.on('send-command', (command) => {
        socket.emit('chat-message', {
            type: 'command',
            message: command,
            sender: 'Kullanıcı'
        });
    });
    
    socket.on('disconnect', () => {
        console.log('Kullanıcı ayrıldı:', socket.id);
    });
});

// Ana route
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Render.com uyku modu engelleme
setInterval(() => {
    console.log('Keep-alive ping');
}, 280000);

// Hata yakalama
process.on('uncaughtException', (err) => {
    console.error('Yakalanmamış hata:', err);
});

server.listen(PORT, () => {
    console.log(`✅ Sunucu ${PORT} portunda çalışıyor`);
    console.log(`🌐 Panel adresi: http://localhost:${PORT}`);
});