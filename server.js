const express = require('express');
const http = require('http');
const socketIO = require('socket.io');
const path = require('path');
require('dotenv').config();

const app = express();
const server = http.createServer(app);
const io = socketIO(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});
const PORT = process.env.PORT || 3000;

// Bot instance'larını saklamak için
const botInstances = new Map();

// Middleware
app.use(express.static(__dirname));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Socket.io bağlantısı
io.on('connection', (socket) => {
    console.log('Yeni kullanıcı bağlandı:', socket.id);
    
    // Bot başlatma
    socket.on('start-bot', async (data) => {
        try {
            console.log('Bot başlatma isteği:', data);
            
            // Eski bot varsa temizle
            if (botInstances.has(socket.id)) {
                const oldBot = botInstances.get(socket.id);
                if (oldBot.bot) {
                    oldBot.bot.end();
                }
                botInstances.delete(socket.id);
            }
            
            // Yeni bot oluştur
            const Bot = require('./bot');
            const bot = new Bot(data, socket);
            botInstances.set(socket.id, bot);
            
            socket.emit('bot-status', { 
                status: 'başlatıldı', 
                message: 'Bot başlatılıyor...' 
            });
            
        } catch (error) {
            console.error('Bot başlatma hatası:', error);
            socket.emit('bot-error', { 
                message: `Bot başlatma hatası: ${error.message}` 
            });
        }
    });
    
    // Komut gönderme
    socket.on('send-command', (command) => {
        try {
            if (botInstances.has(socket.id)) {
                const botInstance = botInstances.get(socket.id);
                if (botInstance.bot && botInstance.bot.isConnected) {
                    console.log('Komut gönderiliyor:', command);
                    botInstance.bot.chat(command);
                    
                    socket.emit('chat-message', {
                        type: 'command',
                        message: command,
                        sender: 'Kullanıcı'
                    });
                } else {
                    socket.emit('bot-error', { 
                        message: 'Bot bağlı değil!' 
                    });
                }
            }
        } catch (error) {
            console.error('Komut gönderme hatası:', error);
            socket.emit('bot-error', { 
                message: `Komut gönderme hatası: ${error.message}` 
            });
        }
    });
    
    // Otomasyon başlatma
    socket.on('start-automation', (data) => {
        socket.emit('automation-status', { 
            status: 'başlatıldı', 
            message: 'Otomasyon başlatıldı' 
        });
        
        // Automation modülünü başlat
        try {
            const Automation = require('./automation');
            if (botInstances.has(socket.id)) {
                const botInstance = botInstances.get(socket.id);
                const automation = new Automation(botInstance, socket);
                botInstance.automation = automation;
                automation.start(data);
            }
        } catch (error) {
            console.error('Otomasyon başlatma hatası:', error);
        }
    });
    
    // Otomasyon durdurma
    socket.on('stop-automation', () => {
        if (botInstances.has(socket.id)) {
            const botInstance = botInstances.get(socket.id);
            if (botInstance.automation) {
                botInstance.automation.stop();
            }
        }
        socket.emit('automation-status', { 
            status: 'durduruldu', 
            message: 'Otomasyon durduruldu' 
        });
    });
    
    // Bot durdurma
    socket.on('stop-bot', () => {
        if (botInstances.has(socket.id)) {
            const botInstance = botInstances.get(socket.id);
            if (botInstance.bot) {
                botInstance.bot.end();
            }
            botInstances.delete(socket.id);
        }
        socket.emit('bot-status', { 
            status: 'durduruldu', 
            message: 'Bot durduruldu' 
        });
    });
    
    // Bağlantı kesildiğinde
    socket.on('disconnect', () => {
        console.log('Kullanıcı ayrıldı:', socket.id);
        if (botInstances.has(socket.id)) {
            const botInstance = botInstances.get(socket.id);
            if (botInstance.bot) {
                botInstance.bot.end();
            }
            botInstances.delete(socket.id);
        }
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
