const mineflayer = require('mineflayer');
const pathfinder = require('mineflayer-pathfinder').pathfinder;

class MinecraftBot {
    constructor(config, io, socket) {
        this.config = config;
        this.io = io;
        this.socket = socket;
        this.bot = null;
        this.isConnected = false;
        
        this.initBot();
    }
    
    initBot() {
        try {
            this.bot = mineflayer.createBot({
                host: this.config.host || 'localhost',
                port: parseInt(this.config.port) || 25565,
                username: this.config.username || 'OtomasyonBot',
                version: this.config.version || '1.16.5',
                auth: 'offline'
            });
            
            // Pathfinder eklentisi
            this.bot.loadPlugin(pathfinder);
            
            this.setupEventListeners();
            this.setupPacketListeners();
            
        } catch (error) {
            this.socket.emit('bot-error', { message: `Bot oluşturma hatası: ${error.message}` });
        }
    }
    
    setupEventListeners() {
        this.bot.on('login', () => {
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
            this.socket.emit('bot-status', { 
                status: 'spawn', 
                message: 'Dünyada oluştu'
            });
            this.updateDashboard();
            // Düzenli durum güncelleme
            this.statusInterval = setInterval(() => this.updateDashboard(), 1000);
        });
        
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
            this.socket.emit('bot-error', { 
                message: `🚫 Sunucudan atıldı: ${reason}`
            });
            this.cleanup();
        });
        
        this.bot.on('error', (err) => {
            this.socket.emit('bot-error', { 
                message: `⚠️ Bot hatası: ${err.message}`
            });
        });
        
        this.bot.on('end', () => {
            this.socket.emit('bot-status', { 
                status: 'kapandı', 
                message: 'Bot bağlantısı kapandı'
            });
            this.cleanup();
        });
    }
    
    setupPacketListeners() {
        this.bot._client.on('chat', (packet) => {
            try {
                const message = this.parseChatPacket(packet);
                if (message) {
                    this.socket.emit('chat-message', {
                        type: 'chat',
                        message: this.stripColors(message),
                        sender: 'Sunucu'
                    });
                }
            } catch (err) {
                console.error('Chat paketi hatası:', err);
            }
        });
        
        this.bot._client.on('title', (packet) => {
            try {
                if (packet.action === 2 && packet.text) {
                    const text = typeof packet.text === 'string' ? packet.text : JSON.parse(packet.text).text;
                    this.socket.emit('action-bar', {
                        message: this.stripColors(text)
                    });
                }
            } catch (err) {
                console.error('Title paketi hatası:', err);
            }
        });
        
        this.bot.on('message', (jsonMsg) => {
            const message = jsonMsg.toString();
            if (message && message.trim()) {
                this.socket.emit('system-message', {
                    message: this.stripColors(message),
                    type: 'system'
                });
            }
        });
    }
    
    parseChatPacket(packet) {
        if (packet.message) return packet.message;
        if (packet.translate) return packet.translate;
        if (typeof packet === 'string') return packet;
        return null;
    }
    
    stripColors(text) {
        if (typeof text !== 'string') return text;
        return text.replace(/§[0-9a-fk-or]/g, '');
    }
    
    updateDashboard() {
        if (!this.bot || !this.bot.entity) return;
        
        const data = {
            health: Math.floor(this.bot.health),
            food: this.bot.food,
            position: {
                x: Math.floor(this.bot.entity.position.x),
                y: Math.floor(this.bot.entity.position.y),
                z: Math.floor(this.bot.entity.position.z)
            },
            equippedItem: this.bot.inventory.slots[36]?.name || 'Boş'
        };
        
        this.socket.emit('dashboard-update', data);
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