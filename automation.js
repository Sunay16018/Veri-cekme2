class Automation {
    constructor(botInstance, socket) {
        this.bot = botInstance.bot;
        this.socket = socket;
        this.isRunning = false;
        this.cycleCount = 0;
        this.taskInterval = null;
    }
    
    start(config) {
        if (this.isRunning) return;
        
        this.isRunning = true;
        this.config = config;
        
        this.socket.emit('automation-status', {
            status: 'başlatıldı',
            message: '🔄 Otomasyon başlatıldı!'
        });
        
        this.socket.emit('chat-message', {
            type: 'system',
            message: `⚙️ Otomasyon başlatıldı! Sandık: ${config.chestCoords.x},${config.chestCoords.y},${config.chestCoords.z}`,
            sender: 'Otomasyon'
        });
        
        // Simülasyon modunda çalış
        this.taskInterval = setInterval(() => {
            this.executeCycle();
        }, 5000);
    }
    
    async executeCycle() {
        if (!this.isRunning || !this.bot) return;
        
        try {
            this.cycleCount++;
            
            // Demo mesajları gönder
            const messages = [
                `🔄 Döngü ${this.cycleCount} başladı`,
                `📍 Sandığa gidiliyor: X=${this.config.chestCoords.x}, Y=${this.config.chestCoords.y}, Z=${this.config.chestCoords.z}`,
                `📦 Sandık açılıyor...`,
                `🎯 Hedefe gidiliyor: X=${this.config.targetCoords.x}, Y=${this.config.targetCoords.y}, Z=${this.config.targetCoords.z}`,
                `⚡ Blok aktifleştiriliyor...`,
                `🗑️ Envanter boşaltılıyor...`,
                `✅ Döngü ${this.cycleCount} tamamlandı!`
            ];
            
            for (const msg of messages) {
                if (!this.isRunning) break;
                
                this.socket.emit('chat-message', {
                    type: 'automation',
                    message: msg,
                    sender: 'Otomasyon'
                });
                
                await this.sleep(500);
            }
            
            this.socket.emit('automation-cycle', {
                count: this.cycleCount,
                message: `✅ Döngü ${this.cycleCount} tamamlandı`
            });
            
        } catch (error) {
            this.socket.emit('automation-error', {
                message: `❌ Otomasyon hatası: ${error.message}`
            });
        }
    }
    
    stop() {
        this.isRunning = false;
        if (this.taskInterval) {
            clearInterval(this.taskInterval);
            this.taskInterval = null;
        }
        
        this.socket.emit('automation-status', {
            status: 'durduruldu',
            message: '⏹️ Otomasyon durduruldu'
        });
        
        this.socket.emit('chat-message', {
            type: 'system',
            message: '⏹️ Otomasyon durduruldu',
            sender: 'Otomasyon'
        });
    }
    
    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

module.exports = Automation;
