class MinecraftPanel {
    constructor() {
        this.socket = null;
        this.cycleCount = 0;
        this.errorCount = 0;
        this.autoscroll = true;
        this.isConnected = false;
        this.botStarted = false;
        this.activeFilter = 'all';
        
        this.initElements();
        this.setupEventListeners();
        this.connectSocket();
        this.updateServerTime();
        
        this.showToast('Minecraft Otomasyon Paneline Hoş Geldiniz!', 'success');
    }
    
    connectSocket() {
        this.socket = io();
        this.setupSocketListeners();
    }
    
    initElements() {
        // Bağlantı elemanları
        this.hostInput = document.getElementById('host');
        this.portInput = document.getElementById('port');
        this.usernameInput = document.getElementById('username');
        this.versionInput = document.getElementById('version');
        
        // Koordinat elemanları
        this.chestX = document.getElementById('chest-x');
        this.chestY = document.getElementById('chest-y');
        this.chestZ = document.getElementById('chest-z');
        this.targetX = document.getElementById('target-x');
        this.targetY = document.getElementById('target-y');
        this.targetZ = document.getElementById('target-z');
        this.emptyX = document.getElementById('empty-x');
        this.emptyY = document.getElementById('empty-y');
        this.emptyZ = document.getElementById('empty-z');
        
        // Butonlar
        this.startBotBtn = document.getElementById('start-bot');
        this.stopBotBtn = document.getElementById('stop-bot');
        this.startAutomationBtn = document.getElementById('start-automation');
        this.stopAutomationBtn = document.getElementById('stop-automation');
        this.sendCommandBtn = document.getElementById('send-command');
        this.clearTerminalBtn = document.getElementById('clear-terminal');
        this.toggleAutoscrollBtn = document.getElementById('toggle-autoscroll');
        this.sendTerminalCommandBtn = document.getElementById('send-terminal-command');
        
        // Dashboard elemanları
        this.healthBar = document.getElementById('health-bar');
        this.healthText = document.getElementById('health-text');
        this.foodBar = document.getElementById('food-bar');
        this.foodText = document.getElementById('food-text');
        this.posX = document.getElementById('pos-x');
        this.posY = document.getElementById('pos-y');
        this.posZ = document.getElementById('pos-z');
        this.equippedItem = document.getElementById('equipped-item');
        this.botStatusDot = document.getElementById('bot-status-dot');
        this.botStatusText = document.getElementById('bot-status-text');
        this.actionBarText = document.getElementById('action-bar-text');
        this.titleText = document.getElementById('title-text');
        
        // Terminal
        this.terminalOutput = document.getElementById('terminal-output');
        this.commandInput = document.getElementById('command-input');
        this.terminalCommand = document.getElementById('terminal-command');
        
        // İstatistikler
        this.cycleCountElement = document.getElementById('cycle-count');
        this.errorCountElement = document.getElementById('error-count');
        this.connectionStatus = document.getElementById('connection-status');
        this.serverTime = document.getElementById('server-time');
        this.onlineStatus = document.getElementById('online-status');
    }
    
    setupEventListeners() {
        // Bot başlat/durdur
        this.startBotBtn.addEventListener('click', () => this.startBot());
        this.stopBotBtn.addEventListener('click', () => this.stopBot());
        
        // Otomasyon başlat/durdur
        this.startAutomationBtn.addEventListener('click', () => this.startAutomation());
        this.stopAutomationBtn.addEventListener('click', () => this.stopAutomation());
        
        // Komut gönder (hızlı komut)
        this.sendCommandBtn.addEventListener('click', () => this.sendQuickCommand());
        this.commandInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.sendQuickCommand();
        });
        
        // Terminal komut gönder
        this.sendTerminalCommandBtn.addEventListener('click', () => this.sendTerminalCommand());
        this.terminalCommand.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.sendTerminalCommand();
        });
        
        // Terminal kontrolleri
        this.clearTerminalBtn.addEventListener('click', () => this.clearTerminal());
        this.toggleAutoscrollBtn.addEventListener('click', () => this.toggleAutoscroll());
        
        // Filtre butonları
        document.querySelectorAll('.filter-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.setFilter(e.target.dataset.filter);
            });
        });
        
        // Hızlı komut butonları
        document.querySelectorAll('.quick-command').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const command = e.target.dataset.command;
                this.commandInput.value = command;
                this.sendQuickCommand();
            });
        });
        
        // Demo için örnek koordinatlar
        this.setupDemoCoordinates();
    }
    
    setupSocketListeners() {
        this.socket.on('connect', () => {
            console.log('✅ Socket bağlantısı kuruldu');
            this.isConnected = true;
            this.connectionStatus.classList.add('connected');
            this.connectionStatus.innerHTML = '<i class="fas fa-wifi"></i><span>Bağlı</span>';
            this.onlineStatus.textContent = 'Çevrimiçi';
            this.onlineStatus.className = 'text-success';
            this.logMessage('system', '✅ Sunucuya bağlanıldı', 'Bağlantı');
        });
        
        this.socket.on('disconnect', () => {
            console.log('❌ Socket bağlantısı kesildi');
            this.isConnected = false;
            this.connectionStatus.classList.remove('connected');
            this.connectionStatus.innerHTML = '<i class="fas fa-wifi"></i><span>Bağlantı Yok</span>';
            this.onlineStatus.textContent = 'Çevrimdışı';
            this.onlineStatus.className = 'text-danger';
            this.logMessage('error', '❌ Sunucu bağlantısı kesildi', 'Bağlantı');
        });
        
        this.socket.on('bot-status', (data) => {
            this.updateBotStatus(data.status, data.message);
            this.logMessage('system', data.message, 'Bot');
            
            if (data.status === 'bağlandı' || data.status === 'spawn') {
                this.startAutomationBtn.disabled = false;
                this.commandInput.disabled = false;
                this.sendCommandBtn.disabled = false;
                this.botStarted = true;
                this.showToast('Bot başarıyla bağlandı!', 'success');
            }
            
            if (data.status === 'durduruldu') {
                this.botStarted = false;
                this.startAutomationBtn.disabled = true;
                this.stopAutomationBtn.disabled = true;
                this.commandInput.disabled = true;
                this.sendCommandBtn.disabled = true;
            }
        });
        
        this.socket.on('bot-error', (data) => {
            this.errorCount++;
            this.errorCountElement.textContent = this.errorCount;
            this.logMessage('error', data.message, 'Hata');
            this.showToast(data.message, 'error');
        });
        
        this.socket.on('dashboard-update', (data) => {
            this.updateDashboard(data);
        });
        
        this.socket.on('chat-message', (data) => {
            this.logMessage(data.type, data.message, data.sender);
        });
        
        this.socket.on('action-bar', (data) => {
            this.updateActionBar(data.message);
        });
        
        this.socket.on('system-message', (data) => {
            this.logMessage('system-message', data.message, 'Sunucu');
        });
        
        this.socket.on('automation-status', (data) => {
            this.logMessage('system', data.message, 'Otomasyon');
            if (data.status === 'başlatıldı') {
                this.startAutomationBtn.disabled = true;
                this.stopAutomationBtn.disabled = false;
            } else if (data.status === 'durduruldu') {
                this.startAutomationBtn.disabled = false;
                this.stopAutomationBtn.disabled = true;
            }
        });
        
        this.socket.on('automation-cycle', (data) => {
            this.cycleCount++;
            this.cycleCountElement.textContent = this.cycleCount;
            this.logMessage('success', data.message, 'Otomasyon');
        });
        
        this.socket.on('automation-error', (data) => {
            this.errorCount++;
            this.errorCountElement.textContent = this.errorCount;
            this.logMessage('error', data.message, 'Otomasyon');
        });
    }
    
    setupDemoCoordinates() {
        // Demo için rastgele koordinatlar
        const randomCoord = () => Math.floor(Math.random() * 200) - 100;
        const randomY = () => Math.floor(Math.random() * 40) + 60;
        
        this.chestX.value = randomCoord();
        this.chestY.value = randomY();
        this.chestZ.value = randomCoord();
        
        this.targetX.value = randomCoord();
        this.targetY.value = randomY();
        this.targetZ.value = randomCoord();
        
        this.emptyX.value = randomCoord();
        this.emptyY.value = randomY();
        this.emptyZ.value = randomCoord();
    }
    
    async startBot() {
        if (!this.hostInput.value.trim()) {
            this.showToast('Lütfen sunucu adresini girin!', 'warning');
            return;
        }
        
        const botConfig = {
            host: this.hostInput.value,
            port: this.portInput.value,
            username: this.usernameInput.value,
            version: this.versionInput.value
        };
        
        this.startBotBtn.disabled = true;
        this.startBotBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Bağlanıyor...';
        
        this.logMessage('system', `Bot başlatılıyor: ${botConfig.username}@${botConfig.host}:${botConfig.port}`, 'Sistem');
        
        this.socket.emit('start-bot', botConfig);
        
        // Zaman aşımı kontrolü
        setTimeout(() => {
            if (!this.botStarted) {
                this.startBotBtn.disabled = false;
                this.startBotBtn.innerHTML = '<i class="fas fa-play"></i> Bot Başlat';
                this.logMessage('error', 'Bot başlatma zaman aşımı! Sunucuyu kontrol edin.', 'Sistem');
                this.showToast('Bot başlatılamadı. Sunucuyu kontrol edin.', 'error');
            }
        }, 15000);
    }
    
    async stopBot() {
        this.socket.emit('stop-bot');
        this.botStarted = false;
        this.startBotBtn.disabled = false;
        this.startBotBtn.innerHTML = '<i class="fas fa-play"></i> Bot Başlat';
        this.stopBotBtn.disabled = true;
        this.startAutomationBtn.disabled = true;
        this.stopAutomationBtn.disabled = true;
        this.commandInput.disabled = true;
        this.sendCommandBtn.disabled = true;
        
        this.updateBotStatus('durduruldu', 'Bot durduruldu');
        this.logMessage('system', 'Bot durduruldu', 'Sistem');
    }
    
    startAutomation() {
        const chestCoords = {
            x: parseInt(this.chestX.value),
            y: parseInt(this.chestY.value),
            z: parseInt(this.chestZ.value)
        };
        
        const targetCoords = {
            x: parseInt(this.targetX.value),
            y: parseInt(this.targetY.value),
            z: parseInt(this.targetZ.value)
        };
        
        const emptyCoords = {
            x: parseInt(this.emptyX.value),
            y: parseInt(this.emptyY.value),
            z: parseInt(this.emptyZ.value)
        };
        
        if (isNaN(chestCoords.x) || isNaN(targetCoords.x) || isNaN(emptyCoords.x)) {
            this.showToast('Lütfen tüm koordinatları girin!', 'warning');
            return;
        }
        
        const automationData = { chestCoords, targetCoords, emptyCoords };
        this.socket.emit('start-automation', automationData);
        
        this.logMessage('system', `Otomasyon başlatılıyor... Sandık: ${chestCoords.x},${chestCoords.y},${chestCoords.z}`, 'Otomasyon');
    }
    
    stopAutomation() {
        this.socket.emit('stop-automation');
        this.logMessage('system', 'Otomasyon durduruluyor...', 'Otomasyon');
    }
    
    sendQuickCommand() {
        const command = this.commandInput.value.trim();
        if (!command) {
            this.showToast('Lütfen bir komut girin!', 'warning');
            return;
        }
        
        const fullCommand = command.startsWith('/') ? command : `/${command}`;
        this.socket.emit('send-command', fullCommand);
        this.commandInput.value = '';
        
        this.logMessage('command', fullCommand, 'Kullanıcı');
    }
    
    sendTerminalCommand() {
        const command = this.terminalCommand.value.trim();
        if (!command) {
            this.showToast('Lütfen bir komut veya mesaj girin!', 'warning');
            return;
        }
        
        if (command.startsWith('/')) {
            // Komut gönder
            this.socket.emit('send-command', command);
            this.logMessage('command', command, 'Kullanıcı');
        } else {
            // Mesaj gönder
            this.socket.emit('send-command', command);
            this.logMessage('chat', command, this.usernameInput.value || 'Kullanıcı');
        }
        
        this.terminalCommand.value = '';
    }
    
    updateBotStatus(status, message) {
        this.botStatusText.textContent = message;
        
        // Durum göstergesi
        this.botStatusDot.className = 'status-dot';
        if (status === 'bağlandı' || status === 'spawn' || status === 'başlatıldı') {
            this.botStatusDot.classList.add('online');
            this.stopBotBtn.disabled = false;
            this.startBotBtn.style.display = 'none';
            this.stopBotBtn.style.display = 'flex';
        } else if (status === 'durduruldu' || status === 'kapandı') {
            this.startBotBtn.style.display = 'flex';
            this.stopBotBtn.style.display = 'none';
        }
    }
    
    updateDashboard(data) {
        // Can barı
        const healthPercent = (data.health / 20) * 100;
        this.healthBar.style.width = `${healthPercent}%`;
        this.healthText.textContent = `${data.health}/20`;
        
        // Can barı rengi
        if (data.health <= 5) {
            this.healthBar.style.background = 'linear-gradient(90deg, #e74c3c, #c0392b)';
        } else if (data.health <= 10) {
            this.healthBar.style.background = 'linear-gradient(90deg, #f39c12, #e67e22)';
        } else {
            this.healthBar.style.background = 'linear-gradient(90deg, #2ecc71, #1abc9c)';
        }
        
        // Yemek barı
        const foodPercent = (data.food / 20) * 100;
        this.foodBar.style.width = `${foodPercent}%`;
        this.foodText.textContent = `${data.food}/20`;
        
        // Koordinatlar
        this.posX.textContent = data.position.x;
        this.posY.textContent = data.position.y;
        this.posZ.textContent = data.position.z;
        
        // Eldeki eşya
        this.equippedItem.textContent = data.equippedItem;
    }
    
    updateActionBar(message) {
        this.actionBarText.textContent = message;
        this.actionBarText.classList.add('fade-in');
        setTimeout(() => this.actionBarText.classList.remove('fade-in'), 500);
    }
    
    logMessage(type, message, sender = 'Sistem') {
        const timestamp = new Date().toLocaleTimeString('tr-TR');
        const logEntry = document.createElement('div');
        logEntry.className = `log-entry ${type}`;
        logEntry.dataset.type = type;
        
        const typeText = this.getTypeText(type);
        const typeColor = this.getTypeColor(type);
        
        logEntry.innerHTML = `
            <span class="timestamp">[${timestamp}]</span>
            <span class="log-type" style="color: ${typeColor}">[${typeText}]</span>
            ${sender ? `<span class="sender">${sender}:</span>` : ''}
            <span class="log-message">${this.escapeHtml(message)}</span>
        `;
        
        // Filtre kontrolü
        if (this.shouldShowMessage(type)) {
            this.terminalOutput.appendChild(logEntry);
            
            // Otomatik kaydırma
            if (this.autoscroll) {
                this.terminalOutput.scrollTop = this.terminalOutput.scrollHeight;
            }
            
            // Vurgulama efekti
            logEntry.classList.add('highlight');
            setTimeout(() => logEntry.classList.remove('highlight'), 1000);
        }
    }
    
    getTypeText(type) {
        const types = {
            'system': 'SİSTEM',
            'chat': 'SOHBET',
            'player-chat': 'OYUNCU',
            'server-message': 'SUNUCU',
            'command': 'KOMUT',
            'error': 'HATA',
            'success': 'BAŞARI',
            'warning': 'UYARI',
            'automation': 'OTOMASYON',
            'system-message': 'SİSTEM',
            'chat-packet': 'PAKET'
        };
        return types[type] || type.toUpperCase();
    }
    
    getTypeColor(type) {
        const colors = {
            'system': '#1abc9c',
            'chat': '#3498db',
            'player-chat': '#2ecc71',
            'server-message': '#9b59b6',
            'command': '#f39c12',
            'error': '#e74c3c',
            'success': '#2ecc71',
            'warning': '#f1c40f',
            'automation': '#8e44ad',
            'system-message': '#1abc9c',
            'chat-packet': '#3498db'
        };
        return colors[type] || '#ffffff';
    }
    
    shouldShowMessage(type) {
        if (this.activeFilter === 'all') return true;
        if (this.activeFilter === 'chat') {
            return ['chat', 'player-chat', 'server-message'].includes(type);
        }
        if (this.activeFilter === 'system') {
            return ['system', 'system-message', 'automation', 'success', 'error', 'warning'].includes(type);
        }
        if (this.activeFilter === 'command') {
            return type === 'command';
        }
        return false;
    }
    
    setFilter(filter) {
        this.activeFilter = filter;
        
        // Butonları güncelle
        document.querySelectorAll('.filter-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.filter === filter);
        });
        
        // Mesajları filtrele
        this.filterMessages();
    }
    
    filterMessages() {
        const entries = this.terminalOutput.querySelectorAll('.log-entry');
        entries.forEach(entry => {
            const type = entry.dataset.type;
            if (this.shouldShowMessage(type)) {
                entry.style.display = 'flex';
            } else {
                entry.style.display = 'none';
            }
        });
    }
    
    clearTerminal() {
        this.terminalOutput.innerHTML = `
            <div class="log-entry system">
                <span class="timestamp">[${new Date().toLocaleTimeString('tr-TR')}]</span>
                <span class="log-type">[SİSTEM]</span>
                <span class="log-message">Terminal temizlendi</span>
            </div>
        `;
    }
    
    toggleAutoscroll() {
        this.autoscroll = !this.autoscroll;
        const icon = this.toggleAutoscrollBtn.querySelector('i');
        this.toggleAutoscrollBtn.classList.toggle('active', this.autoscroll);
        
        if (this.autoscroll) {
            icon.className = 'fas
