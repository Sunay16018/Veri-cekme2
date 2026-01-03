class Automation {
    constructor(botInstance, socket) {
        this.bot = botInstance;
        this.socket = socket;
        this.isRunning = false;
        this.cycleCount = 0;
        
        this.socket.on('automation-data', (data) => {
            this.start(data);
        });
    }
    
    async start(config) {
        this.isRunning = true;
        this.config = config;
        
        this.socket.emit('automation-status', {
            status: 'başlatıldı',
            message: '🔄 Otomasyon başlatıldı!'
        });
        
        while (this.isRunning && this.bot.isConnected) {
            try {
                await this.executeCycle();
                this.cycleCount++;
                this.socket.emit('automation-cycle', {
                    count: this.cycleCount,
                    message: `✅ Döngü ${this.cycleCount} tamamlandı`
                });
                
                await this.sleep(2000); // 2 saniye bekle
                
            } catch (error) {
                this.socket.emit('automation-error', {
                    message: `❌ Döngü hatası: ${error.message}`
                });
                await this.sleep(3000); // Hata durumunda 3 saniye bekle
            }
        }
    }
    
    async executeCycle() {
        // Demo için basit döngü mantığı
        this.socket.emit('chat-message', {
            type: 'system',
            message: `📍 Sandığa gidiliyor: X=${this.config.chestCoords.x}, Y=${this.config.chestCoords.y}, Z=${this.config.chestCoords.z}`,
            sender: 'Otomasyon'
        });
        
        await this.sleep(1000);
        
        this.socket.emit('chat-message', {
            type: 'system',
            message: `📦 Sandık açılıyor ve eşyalar alınıyor...`,
            sender: 'Otomasyon'
        });
        
        await this.sleep(1000);
        
        this.socket.emit('chat-message', {
            type: 'system',
            message: `🎯 Hedefe gidiliyor: X=${this.config.targetCoords.x}, Y=${this.config.targetCoords.y}, Z=${this.config.targetCoords.z}`,
            sender: 'Otomasyon'
        });
        
        await this.sleep(1000);
        
        this.socket.emit('chat-message', {
            type: 'system',
            message: `⚡ Blok aktifleştiriliyor...`,
            sender: 'Otomasyon'
        });
        
        await this.sleep(1000);
        
        this.socket.emit('chat-message', {
            type: 'system',
            message: `🗑️ Envanter boşaltma noktasına gidiliyor...`,
            sender: 'Otomasyon'
        });
        
        await this.sleep(1000);
        
        this.socket.emit('chat-message', {
            type: 'system',
            message: `✅ Envanter boşaltıldı!`,
            sender: 'Otomasyon'
        });
    }
    
    stop() {
        this.isRunning = false;
        this.socket.emit('automation-status', {
            status: 'durduruldu',
            message: '⏹️ Otomasyon durduruldu'
        });
    }
    
    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

module.exports = Automation;