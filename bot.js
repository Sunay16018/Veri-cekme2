const mineflayer = require('mineflayer');
const pathfinder = require('mineflayer-pathfinder').pathfinder;

class MinecraftBot {
    constructor(config, socket) {
        this.config = config;
        this.socket = socket;
        this.bot = null;
        this.isConnected = false;
        this.automation = null;
        
        this.initBot();
    }
    
    initBot() {
        try {
            console.log('Bot oluşturuluyor:', this.config);
            
            this.bot = mineflayer.createBot({
                host: this.config.host || 'localhost',
                port: parseInt(this.config.port) || 25565,
                username: this.config.username || 'OtomasyonBot',
                version: this.config.version || '1.16.5',
                auth: 'offline',
                hideErrors: false
            });
            
            // Pathfinder eklentisi
            this.bot.loadPlugin(pathfinder);
            
            this.setupEventListeners();
            
        } catch (error) {
            console.error('Bot oluşturma hatası:', error);
            this.socket.emit('bot-error', { 
                message: `Bot oluşturma hatası: ${error.message}` 
            });
        }
    }
    
    setupEventListeners() {
        // Bağlantı olayları
        this.bot.on('login', () => {
            console.log('Bot sunucuya bağlandı');
            this.isConnected = true;
            this.socket.emit('bot-status', { 
                status: 'bağlandı', 
                message: `${this.bot.username} sunucuya bağlandı!`
            });
            this.socket.emit('chat-message', {
                type: 'system',
                message: '✅ Sunucuya başarıyla bağlanıldı!',
                sender: 'Sistem'
            });
        });
        
        this.bot.on('spawn', () => {
            console.log('Bot spawn oldu');
            this.socket.emit('bot-status', { 
                status: 'spawn', 
                message: 'Dünyada oluştu'
            });
            this.updateDashboard();
            // Düzenli durum güncelleme
            this.statusInterval = setInterval(() => this.updateDashboard(), 1000);
        });
        
        // TÜM mesajları yakala
        this.bot.on('message', (jsonMsg) => {
            try {
                const message = jsonMsg.toString();
                if (message && message.trim()) {
                    console.log('Mesaj alındı:', message);
                    
                    // Mesaj tipini belirle
                    let type = 'chat';
                    let sender = 'Sunucu';
                    
                    // Sistem mesajlarını ayır
                    if (message.includes('<') && message.includes('>')) {
                        const match = message.match(/<([^>]+)>/);
                        if (match) {
                            sender = match[1];
                            type = 'player-chat';
                        }
                    } else if (message.startsWith('[') && message.includes(']')) {
                        type = 'server-message';
                    } else if (message.toLowerCase().includes('error') || 
                               message.toLowerCase().includes('hata')) {
                        type = 'error';
                    } else if (message.toLowerCase().includes('başarı') || 
                               message.toLowerCase().includes('başarılı')) {
                        type = 'success';
                    }
                    
                    this.socket.emit('chat-message', {
                        type: type,
                        message: this.stripColors(message),
                        sender: sender
                    });
                }
            } catch (err) {
                console.error('Mesaj işleme hatası:', err);
            }
        });
        
        // Action Bar mesajları
        this.bot._client.on('title', (packet) => {
            try {
                if (packet.action === 2 && packet.text) { // Action Bar
                    const text = typeof packet.text === 'string' 
                        ? packet.text 
                        : JSON.parse(packet.text).text;
                    this.socket.emit('action-bar', {
                        message: this.stripColors(text)
                    });
                }
            } catch (err) {
                console.error('Title paketi hatası:', err);
            }
        });
        
        // System message (messagestr)
        this.bot._client.on('messagestr', (packet) => {
            try {
                if (packet.message) {
                    this.socket.emit('chat-message', {
                        type: 'system-message',
                        message: this.stripColors(packet.message),
                        sender: 'Sunucu'
                    });
                }
            } catch (err) {
                console.error('Messagestr hatası:', err);
            }
        });
        
        // Chat packet (daha spesifik)
        this.bot._client.on('chat', (packet) => {
            try {
                let message = '';
                if (packet.message) {
                    message = packet.message;
                } else if (packet.translate) {
                    message = packet.translate;
                }
                
                if (message && message.trim()) {
                    this.socket.emit('chat-message', {
                        type: 'chat-packet',
                        message: this.stripColors(message),
                        sender: 'Sunucu'
                    });
                }
            } catch (err) {
                console.error('Chat paketi hatası:', err);
            }
        });
        
        // Health ve diğer olaylar
        this.bot.on('health', () => {
            this.updateDashboard();
        });
        
        this.bot.on('death', () => {
            this.socket.emit('chat-message', {
                type: 'error',
                message: '❌ Bot öldü! Yeniden doğuyor...',
                sender: 'Sistem'
            });
        });
        
        this.bot.on('kicked', (reason) => {
            console.log('Bot sunucudan atıldı:', reason);
            this.socket.emit('bot-error', { 
                message: `🚫 Sunucudan atıldı: ${reason}`
            });
            this.cleanup();
        });
        
        this.bot.on('error', (err) => {
            console.error('Bot hatası:', err);
            this.socket.emit('bot-error', { 
                message: `⚠️ Bot hatası: ${err.message}`
            });
        });
        
        this.bot.on('end', (reason) => {
            console.log('Bot bağlantısı kapandı:', reason);
            this.socket.emit('bot-status', { 
                status: 'kapandı', 
                message: 'Bot bağlantısı kapandı'
            });
            this.socket.emit('chat-message', {
                type: 'system',
                message: '🔌 Bot bağlantısı kapandı',
                sender: 'Sistem'
            });
            this.cleanup();
        });
        
        // Bot hareket ettiğinde
        this.bot.on('move', () => {
            this.updateDashboard();
        });
    }
    
    stripColors(text) {
        if (typeof text !== 'string') return text;
        // Minecraft renk kodlarını temizle
        return text.replace(/§[0-9a-fk-or]/g, '');
    }
    
    updateDashboard() {
        if (!this.bot || !this.bot.entity) return;
        
        try {
            const data = {
                health: Math.floor(this.bot.health),
                food: this.bot.food || 20,
                position: {
                    x: Math.floor(this.bot.entity.position.x),
                    y: Math.floor(this.bot.entity.position.y),
                    z: Math.floor(this.bot.entity.position.z)
                },
                equippedItem: this.bot.inventory.slots[36]?.displayName || 'Boş',
                ping: this.bot.player?.ping || 0
            };
            
            this.socket.emit('dashboard-update', data);
        } catch (err) {
            console.error('Dashboard güncelleme hatası:', err);
        }
    }
    
    cleanup() {
        this.isConnected = false;
        if (this.statusInterval) {
            clearInterval(this.statusInterval);
        }
    }
    
    end() {
        if (this.bot) {
            this.bot.end();
        }
        this.cleanup();
    }
}

module.exports = MinecraftBot;
