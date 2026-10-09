// --- Moon Multibot v15.0.1 - Dashboard Logic ---
console.log("Moon Multibot Dashboard v15.0.1 Loaded");

// Global States
let authToken = "";
let currentChatId = null;
let lastLogCount = 0;
let perfChart = null;
let cpuData = [];
let ramData = [];
let matrixInterval = null;
const notifySound = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');

function fetchReplies() {
    fetch('/api/replies', { headers: { 'Authorization': authToken } })
    .then(res => res.json()).then(data => {
        if(!data.ok) return;
        const list = document.getElementById("repliesList");
        let html = "";
        if(data.replies) {
            Object.keys(data.replies).forEach(trigger => {
                const r = data.replies[trigger];
                html += `<div class="user-row" style="background: rgba(139, 92, 246, 0.05); padding: 10px; border-radius: 8px; margin-bottom: 8px; border: 1px solid rgba(139, 92, 246, 0.1);">
                    <div style="display: flex; justify-content: space-between; align-items: center;">
                        <div>
                            <span style="color: var(--primary); font-weight: 600;">/${trigger}</span>
                            <div style="font-size: 11px; color: #64748b;">${r.text}</div>
                        </div>
                        <button onclick="deleteReply('${trigger}')" style="width: auto; padding: 4px 8px; font-size: 10px; background: rgba(239, 68, 68, 0.2); border: 1px solid #ef4444; color: #ef4444; margin:0;">Eliminar</button>
                    </div>
                </div>`;
            });
        }
        list.innerHTML = html || '<p style="text-align: center; color: #64748b;">No hay auto-respuestas configuradas.</p>';
    });
}

function fetchAuditLogs() {
    fetch('/api/audit', { headers: { 'Authorization': authToken } })
    .then(res => res.json()).then(data => {
        if(!data.ok) return;
        const list = document.getElementById("auditLogsList");
        let html = "";
        if(data.logs) {
            data.logs.reverse().forEach(log => {
                html += `<div style="padding: 5px 0; border-bottom: 1px solid rgba(255,255,255,0.05);">
                    <span style="color: #64748b;">[${log.time}]</span> <span style="color: #10b981;">ADMIN:</span> ${log.action}
                </div>`;
            });
        }
        list.innerHTML = html || '<p style="color: #64748b;">No hay registros de auditor\u{ED}a.</p>';
    });
}

// Tab Management
function switchTab(tabId, btn) {
    const container = document.getElementById('tab-container');
    
    // UI Update (Buttons)
    document.querySelectorAll('.tab-btn').forEach(el => el.classList.remove('active'));
    if (btn) btn.classList.add('active');

    // Mapeo de IDs a archivos (algunos nombres cambian ligeramente para coincidir con archivos)
    const fileMap = {
        'dashboard': 'dashboard.html',
        'bots': 'bots.html',
        'chat': 'chat.html',
        'ia': 'ia.html',
        'brain-map': 'brain_map.html',
        'history-global': 'history.html',
        'diagnostics': 'diagnostics.html',
        'changelog': 'changelog.html',
        'settings': 'settings.html'
    };

    const fileName = fileMap[tabId] || 'dashboard.html';

    // Cargar plantilla si no está en caché o forzar recarga para desarrollo
    fetch(fileName)
    .then(response => response.text())
    .then(html => {
        container.innerHTML = html;
        window.MOON_CONFIG.currentTab = tabId;
        
        // Ejecutar funciones post-carga
        if(tabId === 'chat') updateDirectory();
        if(tabId === 'bots') fetchBots(); // Nueva función o alias de fetchBots
        if(tabId === 'ia') fetchIAFeeders();
        if(tabId === 'brain-map') drawNeuralMap();
        if(tabId === 'history-global') fetchGlobalHistory();
        if(tabId === 'changelog') loadChangelog();
        if(tabId === 'diagnostics') runDiagnostics();
        if(tabId === 'settings') fetchGlobalSettings();
        
        // Asegurar que el gráfico se inicialice si volvemos al dashboard
        if(tabId === 'dashboard') {
            startPolling();
        }
    })
    .catch(err => {
        console.error("Error cargando plantilla:", err);
        container.innerHTML = `<div class="glass-panel" style="color: var(--danger)">⚠️ Error al cargar el módulo ${tabId}</div>`;
    });
}


// Translations Data
const translations = {
    es: { settings: "\u2699\uFE0F Configuraci\u{F3}n Global", welcome: "Mensaje de Bienvenida", save: "Guardar Configuraci\u{F3}n", lang: "Idioma del Panel" },
    en: { settings: "\u2699\uFE0F Global Settings", welcome: "Welcome Message", save: "Save Settings", lang: "Dashboard Language" }
};

function changeLanguage() {
    const lang = document.getElementById("langSelect").value;
    localStorage.setItem('moon_lang', lang);
    const t = translations[lang];
    document.querySelector('#tab-settings h3').innerText = t.settings;
    document.querySelector('label[for="welcomeMsgInput"]').innerText = t.welcome;
    showToast("\u{1F310}", lang === 'es' ? "Idioma cambiado" : "Language changed");
}



// Theme & Matrix Mode
function setTheme(theme) {
    // Clear Matrix if active
    if(matrixInterval) {
        clearInterval(matrixInterval);
        matrixInterval = null;
        const canvas = document.getElementById('matrix-bg');
        if(canvas) canvas.remove();
    }

    document.body.className = (theme === 'moon') ? '' : 'theme-' + theme;
    localStorage.setItem('moon_theme', theme);
    showToast("\u{1F3A8} Tema", "Cambiado a " + theme);

    if(theme === 'matrix') initMatrix();
}

function initMatrix() {
    const canvas = document.createElement('canvas');
    canvas.id = 'matrix-bg';
    canvas.style = "position: fixed; top:0; left:0; z-index: -1; opacity: 0.15;";
    document.body.appendChild(canvas);
    
    const ctx = canvas.getContext('2d');
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const characters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789$+-*/=%\"'#&_(),.;:?!\\|{}<>[]^~";
    const fontSize = 16;
    const columns = canvas.width / fontSize;
    const drops = Array(Math.floor(columns)).fill(1);

    matrixInterval = setInterval(() => {
        ctx.fillStyle = "rgba(0, 0, 0, 0.05)";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = "#0f0";
        ctx.font = fontSize + "px monospace";

        for (let i = 0; i < drops.length; i++) {
            const text = characters.charAt(Math.floor(Math.random() * characters.length));
            ctx.fillText(text, i * fontSize, drops[i] * fontSize);
            if (drops[i] * fontSize > canvas.height && Math.random() > 0.975) drops[i] = 0;
            drops[i]++;
        }
    }, 35);
}

// Auth & Polling
function login() {
    const key = document.getElementById("authKey").value;
    fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: key })
    }).then(res => res.json()).then(data => {
        if (data.ok) {
            authToken = "Bearer " + data.token;
            localStorage.setItem('moon_token', authToken);
            document.getElementById("loginScreen").style.display = "none";
            document.getElementById("dashboard").style.display = "block";
            switchTab('dashboard', document.querySelector('.tab-btn.active'));
        } else {
            document.getElementById("loginError").innerText = "\u{274C} Contrase\u{F1}a incorrecta";
        }
    });
}

function startPolling() {
    fetchData();
    setInterval(fetchData, 2000);
    setInterval(updateClock, 1000);
    setInterval(() => {
        if(window.MOON_CONFIG && window.MOON_CONFIG.currentTab === 'history-global') fetchGlobalHistory();
    }, 5000);
}

function fetchData() {
    if(!authToken) return;
    fetch('/api/status', { headers: { 'Authorization': authToken } })
    .then(res => res.json())
    .then(data => {
        if (!data.ok) return;
        
        // Elementos del Dashboard (si están cargados)
        const cpuEl = document.getElementById("cpuVal");
        const ramEl = document.getElementById("ramVal");
        const cpuBar = document.getElementById("cpuBar");
        const ramBar = document.getElementById("ramBar");
        const activeBots = document.getElementById("activeBotsCount");

        if(cpuEl) cpuEl.innerText = data.cpu + "%";
        if(ramEl) ramEl.innerText = (data.ram_used || 0) + "/" + (data.ram_total || 0) + " GB";
        if(cpuBar) cpuBar.style.width = data.cpu + "%";
        if(ramBar) ramBar.style.width = data.ram + "%";
        
        // Uptime en Header
        const uptimeEl = document.getElementById("uptimeDisplay");
        if(uptimeEl) uptimeEl.innerText = data.uptime;

        // Consola (webLog)
        const webLog = document.getElementById("webLog");
        if(webLog && data.logs) {
            let html = "";
            data.logs.forEach(log => {
                html += `<div><span style="color:#94a3b8">[${log.time}]</span> ${log.text}</div>`;
            });
            const isScrolledToBottom = webLog.scrollHeight - webLog.clientHeight <= webLog.scrollTop + 20;
            webLog.innerHTML = html;
            if (isScrolledToBottom) webLog.scrollTop = webLog.scrollHeight;
        }
    });
}

// Stats & Users
function fetchUserStats() {
    fetch('/api/stats/users', { headers: { 'Authorization': authToken } })
    .then(res => res.json())
    .then(data => {
        if(!data.ok) return;
        const list = document.getElementById("topUsersList");
        let html = "";
        data.users.forEach((u, i) => {
            html += `<div class="user-row">
                <span>#${i+1} ${u.name}</span>
                <div>
                    <span class="count">${u.count} msgs</span>
                    <button onclick="banUser('${u.id}')" class="btn-ban">\u{1F6AB}</button>
                </div>
            </div>`;
        });
        list.innerHTML = html;
    });
}

function banUser(uid) {
    if(!confirm("\u{BF}Banear a este usuario?")) return;
    fetch('/api/users/ban', {
        method: 'POST',
        headers: { 'Authorization': authToken, 'Content-Type': 'application/json' },
        body: JSON.stringify({ uid: uid })
    }).then(r => r.json()).then(d => {
        if(d.ok) showToast("\u{1F6AB} Ban", "Usuario bloqueado");
    });
}

// Chat System
function updateDirectory() {
    fetch('/api/chats', { headers: { 'Authorization': authToken } })
    .then(res => res.json())
    .then(data => {
        if(!data.ok) return;
        const dashList = document.getElementById("directoryList");
        const chatList = document.getElementById("chatDirectoryList");
        let html = "";
        data.vistos_obj.forEach(v => {
            const activeClass = (currentChatId === v.id) ? 'active' : '';
            html += `<div class="chat-contact-item ${activeClass}" onclick="selectChat('${v.id}', '${v.name}')">
                <strong>${v.name}</strong><br>
                <small style="font-size: 10px; opacity: 0.6;">ID: ${v.id}</small>
            </div>`;
        });
        if(dashList) dashList.innerHTML = html || "Sin contactos.";
        if(chatList) chatList.innerHTML = html || "Sin contactos.";
    });
}

function selectChat(id, name) {
    currentChatId = id;
    document.getElementById("currentChatName").innerText = name;
    document.getElementById("currentChatId").innerText = id;
    fetchChatHistory();
    updateDirectory();
}

function fetchChatHistory() {
    if(!currentChatId) return;
    fetch(`/api/history?chat_id=${currentChatId}`, { headers: { 'Authorization': authToken } })
    .then(res => res.json()).then(data => {
        const body = document.getElementById("chatMessages");
        let html = "";
        data.history.forEach(m => {
            const side = m.sender === 'Bot' ? 'right' : 'left';
            const sentimentEmoji = m.sentiment === 'positive' ? '\u{1F7E2}' : (m.sentiment === 'negative' ? '\u{1F534}' : '');
            
            html += `<div class="chat-bubble ${side}">
                <div class="chat-sender">${m.sender} ${sentimentEmoji}</div>
                <div class="chat-text">${m.text}</div>
                <div class="chat-time">${m.time}</div>
            </div>`;
        });
        body.innerHTML = html || '<div style="text-align:center; color:#94a3b8; margin-top:50px;">No hay mensajes en este chat.</div>';
        body.scrollTop = body.scrollHeight;
    });
}

function sendChatMessage() {
    const text = document.getElementById("chatInput").value;
    if(!text) return;
    fetch('/api/send', {
        method: 'POST',
        headers: { 'Authorization': authToken, 'Content-Type': 'application/json' },
        body: JSON.stringify({ target: currentChatId, text: text })
    }).then(() => {
        document.getElementById("chatInput").value = "";
        fetchChatHistory();
    });
}

function searchInChat() {
    const q = document.getElementById("chatSearch").value.toLowerCase();
    const bubbles = document.querySelectorAll(".chat-bubble");
    bubbles.forEach(b => {
        const text = b.querySelector(".text").innerText.toLowerCase();
        b.style.display = text.includes(q) ? "block" : "none";
    });
}

function downloadLogs() {
    window.open('/api/logs/download?token=' + authToken.split(' ')[1]);
}

// Plugins & Settings
function fetchPlugins() {
    fetch('/api/plugins', { headers: { 'Authorization': authToken } })
    .then(res => res.json()).then(data => {
        const list = document.getElementById("pluginsList");
        list.innerHTML = "";
        data.plugins.forEach(p => {
            const enabled = p.status === 'Enabled';
            list.innerHTML += `<div class="plugin-item">
                <span>${p.name} (${p.status})</span>
                <button onclick="togglePlugin('${p.name}')">${enabled ? 'OFF' : 'ON'}</button>
            </div>`;
        });
    });
}

function togglePlugin(name) {
    fetch('/api/plugins/toggle', {
        method: 'POST',
        headers: { 'Authorization': authToken, 'Content-Type': 'application/json' },
        body: JSON.stringify({ name })
    }).then(() => fetchPlugins());
}

function fetchGlobalSettings() {
    fetch('/api/settings', { headers: { 'Authorization': authToken } })
    .then(res => res.json()).then(data => {
        document.getElementById("welcomeMsgInput").value = data.welcome_msg;
        document.getElementById("masterIdDisplay").value = data.master_id;
        document.getElementById("maintSwitch").checked = data.maintenance_mode || false;
    });
}

function saveGlobalSettings() {
    const welcome = document.getElementById("welcomeMsgInput").value;
    const maint = document.getElementById("maintSwitch").checked;
    fetch('/api/settings', {
        method: 'POST',
        headers: { 'Authorization': authToken, 'Content-Type': 'application/json' },
        body: JSON.stringify({ welcome_msg: welcome, maintenance_mode: maint })
    }).then(r => r.json()).then(d => {
        if(d.ok) showToast("\u{2699}\u{FE0F} Ajustes", "Guardado con \u{E9}xito");
    });
}

// Multimedia & Analytics
function fetchGallery() {
    fetch('/api/media', { headers: { 'Authorization': authToken } })
    .then(res => res.json()).then(data => {
        const list = document.getElementById("mediaGallery");
        let html = "";
        data.media.reverse().forEach(url => {
            html += `<img src="${url}" class="gallery-img" onclick="window.open('${url}')">`;
        });
        list.innerHTML = html || "Sin im\u{E1}genes.";
    });
}

function fetchHeatmap() {
    fetch('/api/stats/heatmap', { headers: { 'Authorization': authToken } })
    .then(res => res.json()).then(data => {
        const body = document.getElementById("heatmapBody");
        let html = "";
        data.heatmap.forEach((val, hr) => {
            html += `<div class="heat-bar" style="height:${val}px;" title="Hora ${hr}: ${val} msgs"></div>`;
        });
        body.innerHTML = `<div class="heat-container">${html}</div>`;
    });
}

// Utils
function showToast(title, message) {
    const container = document.getElementById("toast-container");
    const toast = document.createElement("div");
    toast.className = "toast";
    toast.innerHTML = `<strong>${title}</strong><br>${message}`;
    container.appendChild(toast);
    setTimeout(() => { toast.style.opacity = '0'; setTimeout(() => toast.remove(), 300); }, 4000);
}

function initChart() {
    const ctx = document.getElementById('perfChart').getContext('2d');
    perfChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: Array(20).fill(''),
            datasets: [
                { label: 'CPU', borderColor: '#8b5cf6', data: cpuData, fill: false, tension: 0.4 },
                { label: 'RAM', borderColor: '#38bdf8', data: ramData, fill: false, tension: 0.4 }
            ]
        },
        options: { responsive: true, scales: { y: { min: 0, max: 100 } }, plugins: { legend: { display: false } } }
    });
}

function updateChart(cpu, ram) {
    if(!perfChart) return;
    cpuData.push(cpu);
    ramData.push(ram);
    if(cpuData.length > 20) { cpuData.shift(); ramData.shift(); }
    perfChart.update();
}

function updateClock() {
    document.getElementById("serverClock").innerText = new Date().toLocaleTimeString();
}

function rebootSystem() {
    if(!confirm("\u{BF}Reiniciar sistema?")) return;
    fetch('/api/reboot', { method: 'POST', headers: { 'Authorization': authToken } })
    .then(() => { showToast("\u{1F504}", "Reiniciando..."); setTimeout(() => location.reload(), 5000); });
}

function populateScheduleTargets() {
    fetch('/api/chats', { headers: { 'Authorization': authToken } })
    .then(res => res.json()).then(data => {
        const select = document.getElementById("scheduleTarget");
        select.innerHTML = '<option value="">Selecciona...</option>';
        data.vistos_obj.forEach(v => { select.innerHTML += `<option value="${v.id}">${v.name}</option>`; });
    });
}
// Moon IA Logic
function evolveIA() {
    if(!confirm("¿Deseas iniciar el Protocolo de Evolución Neuronal? Esto creará miles de nuevas conexiones sinápticas.")) return;
    
    const progressDiv = document.getElementById("iaEvolutionProgress");
    const bar = document.getElementById("iaEvolBar");
    const percentText = document.getElementById("iaEvolPercent");
    
    progressDiv.style.display = "block";
    bar.style.width = "0%";
    percentText.innerText = "0%";

    fetch('/api/ia/evolve', {
        method: 'POST',
        headers: { 'Authorization': authToken }
    }).then(r => r.json()).then(data => {
        if(data.ok) {
            showToast("🧬 Evolución", "Protocolo iniciado. Observa el crecimiento.");
            
            // Simulación de barra de progreso basada en el tiempo estimado del backend
            let progress = 0;
            const interval = setInterval(() => {
                progress += 2;
                bar.style.width = progress + "%";
                percentText.innerText = progress + "%";
                
                if(progress >= 100) {
                    clearInterval(interval);
                    showToast("🔥 Éxito", "Evolución completada. El cerebro es ahora más denso.");
                    setTimeout(() => progressDiv.style.display = "none", 2000);
                    fetchIAFeeders(); // Refresh stats
                }
            }, 100);
        }
    });
}

function injectKnowledge() {
    if(!confirm("\u{BF}Deseas inyectar el paquete de conocimiento base? Esto ampliar\u{E1} el vocabulario inicial de la IA.")) return;
    fetch('/api/ia/seed', {
        method: 'POST',
        headers: { 'Authorization': authToken }
    }).then(r => r.json()).then(data => {
        if(data.ok) {
            showToast("\u{1F9E0} Cerebro", "Conocimiento inyectado correctamente.");
            fetchIAFeeders(); // Refresh stats
        }
    });
}

function setIAMood(mood) {
    fetch('/api/ia/mood', {
        method: 'POST',
        headers: { 'Authorization': authToken, 'Content-Type': 'application/json' },
        body: JSON.stringify({ mood: mood })
    }).then(r => r.json()).then(data => {
        if(data.ok) {
            showToast("\u{1F3AD} IA Mood", "Personalidad cambiada a: " + mood.toUpperCase());
        }
    });
}

function setIAMode(mode) {
    fetch('/api/ia/mode', {
        method: 'POST',
        headers: { 'Authorization': authToken, 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode: mode })
    }).then(r => r.json()).then(data => {
        if(data.ok) {
            showToast("\u{2699}\u{FE0F} IA Mode", "Perfil cambiado a: " + mode.toUpperCase());
        }
    });
}

function forceFeedIA() {
    showToast("\u{1F525} Neuro-Boost", "Iniciando alimentaci\u{F3}n forzada...");
    fetch('/api/ia/force_feed', {
        method: 'POST',
        headers: { 'Authorization': authToken }
    }).then(r => r.json()).then(data => {
        if(data.ok) {
            showToast("\u{2705} Completado", "La IA ha re-procesado todo el historial.");
            fetchIAFeeders();
        }
    });
}

function drawNeuralMap() {
    const canvas = document.getElementById('neuralCanvas');
    if(!canvas) return;
    const ctx = canvas.getContext('2d');
    canvas.width = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;
    
    fetch('/api/ia/feeders', { headers: { 'Authorization': authToken } })
    .then(r => r.json()).then(data => {
        if(!data.ok) return;
        const nodes = [];
        const wordsCount = Math.min(data.words, 150); // M\u{E1}s nodos
        const edgesCount = Math.min(data.connections, 400); // M\u{E1}s conexiones
        
        document.getElementById('nodeCount').innerText = data.words;
        document.getElementById('edgeCount').innerText = data.connections;

        ctx.clearRect(0,0, canvas.width, canvas.height);
        
        // Crear nodos con posiciones pseudo-aleatorias basadas en la hora para que "vivan"
        const time = Date.now() * 0.001;
        for(let i=0; i<wordsCount; i++) {
            const seed = i * 137.5; // Angulo aureo
            nodes.push({
                x: (canvas.width / 2) + Math.cos(seed + time * 0.2) * (i * 3),
                y: (canvas.height / 2) + Math.sin(seed + time * 0.2) * (i * 2),
                size: 1.5 + (i % 5)
            });
        }
        
        // Dibujar conexiones con gradiente
        ctx.lineWidth = 0.4;
        for(let i=0; i<edgesCount; i++) {
            const n1 = nodes[i % nodes.length];
            const n2 = nodes[(i * 7) % nodes.length];
            
            const dist = Math.hypot(n1.x - n2.x, n1.y - n2.y);
            const opacity = Math.max(0.02, 1 - (dist / 300));
            
            ctx.strokeStyle = `rgba(139, 92, 246, ${opacity})`;
            ctx.beginPath();
            ctx.moveTo(n1.x, n1.y);
            ctx.lineTo(n2.x, n2.y);
            ctx.stroke();
        }
        
        // Dibujar nodos con brillo
        nodes.forEach((n, i) => {
            const pulse = 0.5 + Math.sin(time + i) * 0.5;
            ctx.fillStyle = `rgba(167, 139, 250, ${0.5 + pulse * 0.5})`;
            ctx.shadowBlur = 5 * pulse;
            ctx.shadowColor = "#8b5cf6";
            ctx.beginPath();
            ctx.arc(n.x, n.y, n.size, 0, Math.PI * 2);
            ctx.fill();
            ctx.shadowBlur = 0;
        });
    });
}

function initNeuralBooster() {
    showToast("\u{1F525} Neural Booster", "Iniciando animaci\u{F3}n de alta frecuencia...");
    let frames = 0;
    const timer = setInterval(() => {
        drawNeuralMap();
        frames++;
        if(frames > 10) clearInterval(timer);
    }, 100);
}

function sendBroadcast() {
    const msg = document.getElementById("broadcastMsg").value;
    if(!msg) return showToast("\u{274C} Error", "Escribe un mensaje primero.");
    fetch('/api/admin/broadcast', {
        method: 'POST',
        headers: { 'Authorization': authToken, 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: msg })
    }).then(r => r.json()).then(data => {
        if(data.ok) {
            showToast("\u{1F4E2} Broadcast", `Enviado a ${data.count} grupos.`);
            document.getElementById("broadcastMsg").value = "";
        }
    });
}

function toggleMaintenance() {
    fetch('/api/admin/maintenance', {
        method: 'POST',
        headers: { 'Authorization': authToken }
    }).then(r => r.json()).then(data => {
        if(data.ok) {
            const btn = document.getElementById("maintBtn");
            btn.innerText = data.enabled ? "\u{26A0}\u{FE0F} Modo Mantenimiento: ON" : "\u{26A0}\u{FE0F} Modo Mantenimiento: OFF";
            btn.style.background = data.enabled ? "#ef4444" : "#f59e0b";
            showToast("\u{1F6E1}\u{FE0F} Sistema", data.enabled ? "Modo mantenimiento activado" : "Modo mantenimiento desactivado");
        }
    });
}

function runBackup() {
    showToast("\u{1F4BE} Backup", "Iniciando copia de seguridad...");
    fetch('/api/admin/backup', {
        method: 'POST',
        headers: { 'Authorization': authToken }
    }).then(r => r.json()).then(data => {
        if(data.ok) {
            showToast("\u{2705} Backup", "Copia guardada en: " + data.file);
        }
    });
}

function testIA() {
    const input = document.getElementById("iaTestInput");
    const resDiv = document.getElementById("iaTestRes");
    const text = input.value;
    if(!text) return;
    
    resDiv.innerHTML = "<i>Pensando...</i>";
    fetch('/api/ia/test', {
        method: 'POST',
        headers: { 'Authorization': authToken, 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: text })
    }).then(r => r.json()).then(data => {
        if(data.ok) {
            resDiv.innerHTML = `<span style="color: #10b981;">${data.response}</span>`;
        } else {
            resDiv.innerHTML = `<span style="color: #ef4444;">Error al consultar la IA</span>`;
        }
    });
}


function fetchIAFeeders() {
    fetch('/api/ia/stats', { headers: { 'Authorization': authToken } })
    .then(res => res.json()).then(data => {
        if(!data.ok) return;
        
        // Update Stats
        document.getElementById("iaWords").innerText = data.stats.words;
        document.getElementById("iaConnections").innerText = data.stats.connections;
        document.getElementById("iaRate").innerText = data.stats.rate;
        document.getElementById("iaETA").innerText = data.stats.est_maturity;
        
        const list = document.getElementById("iaFeederList");
        let html = "";
        if(data.feeders && data.feeders.length > 0) {
            data.feeders.forEach(f => {
                html += `<div class="user-row" style="background: rgba(16, 185, 129, 0.05); padding: 10px; border-radius: 8px; margin-bottom: 8px; border: 1px solid rgba(16, 185, 129, 0.1);">
                    <div style="display: flex; align-items: center; gap: 10px;">
                        <span style="font-size: 18px;">\u{1F4E1}</span>
                        <div>
                            <div style="font-weight: 600; font-size: 13px; color: #10b981;">${f.name}</div>
                            <div style="font-size: 10px; color: #64748b;">ID: ${f.id} | Alimentando cerebro</div>
                        </div>
                    </div>
                </div>`;
            });
        } else {
            html = `<div style="text-align: center; padding: 40px; color: #64748b;">\u{1F4E1} No hay se\u{F1}ales de aprendizaje activo.<br><small>Usa /ia_feed on en un grupo</small></div>`;
        }
        list.innerHTML = html;
    });
}

function addFeederByLink() {
    const input = document.getElementById("newFeederLink");
    const link = input.value;
    if(!link) return;
    
    fetch('/api/ia/feeders/add', {
        method: 'POST',
        headers: { 'Authorization': authToken, 'Content-Type': 'application/json' },
        body: JSON.stringify({ link: link })
    }).then(r => r.json()).then(data => {
        if(data.ok) {
            showToast("\u{1F4E1} IA Feed", "V\u{ED}nculo neuronal establecido con: " + data.name);
            input.value = "";
            fetchIAFeeders();
        } else {
            showToast("\u{274C} Error", data.msg);
        }
    });
}

function fetchGlobalHistory() {
    console.log("Fetching global history...");
    fetch('/api/global/history', { headers: { 'Authorization': authToken } })
    .then(res => res.json()).then(data => {
        console.log("Global history data:", data);
        if(!data.ok) return;
        const body = document.getElementById("globalHistoryBody");
        let html = "";
        data.history.reverse().forEach(m => {
            html += `<tr style="border-bottom: 1px solid rgba(255,255,255,0.05);">
                <td style="padding: 10px; color: #64748b;">${m.time}</td>
                <td style="padding: 10px; color: #38bdf8; font-weight: 600;">${m.chat}</td>
                <td style="padding: 10px; color: #a78bfa;">${m.user}</td>
                <td style="padding: 10px;">${m.text}</td>
            </tr>`;
        });
        body.innerHTML = html || '<tr><td colspan="4" style="text-align: center; padding: 40px; color: #64748b;">\u{1F4DC} No hay mensajes registrados a\u{FA}n.</td></tr>';
    });
}

// Changelog Logic
function loadChangelog() {
    const viewer = document.getElementById("changelogContent");
    fetch('/CHANGELOG.md').then(res => res.text()).then(text => {
        // Basic Markdown to HTML conversion
        let html = text
            .replace(/^# (.*$)/gim, '<h1 style="color: #8b5cf6;">$1</h1>')
            .replace(/^## (.*$)/gim, '<h2 style="color: #38bdf8; margin-top: 20px;">$1</h2>')
            .replace(/^### (.*$)/gim, '<h3 style="color: #10b981;">$1</h3>')
            .replace(/^\- (.*$)/gim, '<li style="margin-left: 20px;">$1</li>')
            .replace(/\*\*(.*)\*\*/gim, '<b>$1</b>')
            .replace(/\*(.*)\*/gim, '<i>$1</i>')
            .replace(/\n/g, '<br>');
        viewer.innerHTML = html;
    });
}
function runDiagnostics() {
    const diagConsole = document.getElementById("diagConsole");
    const serverStat = document.getElementById("diag-server");
    const dbStat = document.getElementById("diag-db");
    const iaStat = document.getElementById("diag-ia");
    const botsStat = document.getElementById("diag-bots");

    const addLog = (msg, type = "info") => {
        const color = type === "error" ? "#ef4444" : (type === "success" ? "#10b981" : "#38bdf8");
        diagConsole.innerHTML += `<div style="color: ${color};">> ${msg}</div>`;
        diagConsole.scrollTop = diagConsole.scrollHeight;
    };

    diagConsole.innerHTML = "> Iniciando diagnóstico profundo...<br>";
    
    // 1. Test Servidor
    addLog("Probando conectividad con la API...", "info");
    fetch('/api/status', { headers: { 'Authorization': authToken } })
    .then(r => r.json()).then(data => {
        if(data.ok) {
            serverStat.innerText = "ONLINE";
            serverStat.style.color = "#10b981";
            addLog("Servidor responde correctamente (HTTP 200)", "success");
            
            // 2. Test DB
            addLog("Validando integridad de Base de Datos...", "info");
            if(data.db_vistos >= 0) {
                dbStat.innerText = "OK (" + data.db_vistos + " users)";
                dbStat.style.color = "#10b981";
                addLog("Base de Datos activa y con registros.", "success");
            } else {
                dbStat.innerText = "VACÍA";
                dbStat.style.color = "#f59e0b";
                addLog("Advertencia: La Base de Datos no tiene registros de usuarios.", "warning");
            }
        }
    }).catch(e => {
        serverStat.innerText = "ERROR";
        serverStat.style.color = "#ef4444";
        addLog("Fallo crítico: No se pudo contactar con el servidor.", "error");
    });

    // 3. Test IA
    addLog("Analizando densidad de red neuronal...", "info");
    fetch('/api/ia/stats', { headers: { 'Authorization': authToken } })
    .then(r => r.json()).then(data => {
        if(data.ok) {
            iaStat.innerText = data.stats.words + " nodos";
            iaStat.style.color = "#10b981";
            addLog("IA operativa con " + data.stats.words + " conceptos aprendidos.", "success");
        }
    });

    // 4. Test Bots
    addLog("Verificando tokens activos...", "info");
    fetch('/api/bots', { headers: { 'Authorization': authToken } })
    .then(r => r.json()).then(data => {
        if(data.ok) {
            const count = data.bots ? data.bots.length : 0;
            botsStat.innerText = count + " activos";
            botsStat.style.color = count > 0 ? "#10b981" : "#f59e0b";
    fetch('/api/admin/maintenance', {
        method: 'POST',
        headers: { 'Authorization': authToken }
    }).then(r => r.json()).then(data => {
        if(data.ok) {
            const btn = document.getElementById("maintBtn");
            btn.innerText = data.enabled ? "\u{26A0}\u{FE0F} Modo Mantenimiento: ON" : "\u{26A0}\u{FE0F} Modo Mantenimiento: OFF";
            btn.style.background = data.enabled ? "#ef4444" : "#f59e0b";
            showToast("\u{1F6E1}\u{FE0F} Sistema", data.enabled ? "Modo mantenimiento activado" : "Modo mantenimiento desactivado");
        }
    });
}

function runBackup() {
    showToast("\u{1F4BE} Backup", "Iniciando copia de seguridad...");
    fetch('/api/admin/backup', {
        method: 'POST',
        headers: { 'Authorization': authToken }
    }).then(r => r.json()).then(data => {
        if(data.ok) {
            showToast("\u{2705} Backup", "Copia guardada en: " + data.file);
        }
    });
}

function testIA() {
    const input = document.getElementById("iaTestInput");
    const resDiv = document.getElementById("iaTestRes");
    const text = input.value;
    if(!text) return;
    
    resDiv.innerHTML = "<i>Pensando...</i>";
    fetch('/api/ia/test', {
        method: 'POST',
        headers: { 'Authorization': authToken, 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: text })
    }).then(r => r.json()).then(data => {
        if(data.ok) {
            resDiv.innerHTML = `<span style="color: #10b981;">${data.response}</span>`;
        } else {
            resDiv.innerHTML = `<span style="color: #ef4444;">Error al consultar la IA</span>`;
        }
    });
}


function fetchIAFeeders() {
    fetch('/api/ia/stats', { headers: { 'Authorization': authToken } })
    .then(res => res.json()).then(data => {
        if(!data.ok) return;
        
        // Update Stats
        document.getElementById("iaWords").innerText = data.stats.words;
        document.getElementById("iaConnections").innerText = data.stats.connections;
        document.getElementById("iaRate").innerText = data.stats.rate;
        document.getElementById("iaETA").innerText = data.stats.est_maturity;
        
        const list = document.getElementById("iaFeederList");
        let html = "";
        if(data.feeders && data.feeders.length > 0) {
            data.feeders.forEach(f => {
                html += `<div class="user-row" style="background: rgba(16, 185, 129, 0.05); padding: 10px; border-radius: 8px; margin-bottom: 8px; border: 1px solid rgba(16, 185, 129, 0.1);">
                    <div style="display: flex; align-items: center; gap: 10px;">
                        <span style="font-size: 18px;">\u{1F4E1}</span>
                        <div>
                            <div style="font-weight: 600; font-size: 13px; color: #10b981;">${f.name}</div>
                            <div style="font-size: 10px; color: #64748b;">ID: ${f.id} | Alimentando cerebro</div>
                        </div>
                    </div>
                </div>`;
            });
        } else {
            html = `<div style="text-align: center; padding: 40px; color: #64748b;">\u{1F4E1} No hay se\u{F1}ales de aprendizaje activo.<br><small>Usa /ia_feed on en un grupo</small></div>`;
        }
        list.innerHTML = html;
    });
}

function addFeederByLink() {
    const input = document.getElementById("newFeederLink");
    const link = input.value;
    if(!link) return;
    
    fetch('/api/ia/feeders/add', {
        method: 'POST',
        headers: { 'Authorization': authToken, 'Content-Type': 'application/json' },
        body: JSON.stringify({ link: link })
    }).then(r => r.json()).then(data => {
        if(data.ok) {
            showToast("\u{1F4E1} IA Feed", "V\u{ED}nculo neuronal establecido con: " + data.name);
            input.value = "";
            fetchIAFeeders();
        } else {
            showToast("\u{274C} Error", data.msg);
        }
    });
}

function fetchGlobalHistory() {
    console.log("Fetching global history...");
    fetch('/api/global/history', { headers: { 'Authorization': authToken } })
    .then(res => res.json()).then(data => {
        console.log("Global history data:", data);
        if(!data.ok) return;
        const body = document.getElementById("globalHistoryBody");
        let html = "";
        data.history.reverse().forEach(m => {
            html += `<tr style="border-bottom: 1px solid rgba(255,255,255,0.05);">
                <td style="padding: 10px; color: #64748b;">${m.time}</td>
                <td style="padding: 10px; color: #38bdf8; font-weight: 600;">${m.chat}</td>
                <td style="padding: 10px; color: #a78bfa;">${m.user}</td>
                <td style="padding: 10px;">${m.text}</td>
            </tr>`;
        });
        body.innerHTML = html || '<tr><td colspan="4" style="text-align: center; padding: 40px; color: #64748b;">\u{1F4DC} No hay mensajes registrados a\u{FA}n.</td></tr>';
    });
}

// Changelog Logic
function loadChangelog() {
    const viewer = document.getElementById("changelogContent");
    fetch('/CHANGELOG.md').then(res => res.text()).then(text => {
        // Basic Markdown to HTML conversion
        let html = text
            .replace(/^# (.*$)/gim, '<h1 style="color: #8b5cf6;">$1</h1>')
            .replace(/^## (.*$)/gim, '<h2 style="color: #38bdf8; margin-top: 20px;">$1</h2>')
            .replace(/^### (.*$)/gim, '<h3 style="color: #10b981;">$1</h3>')
            .replace(/^\- (.*$)/gim, '<li style="margin-left: 20px;">$1</li>')
            .replace(/\*\*(.*)\*\*/gim, '<b>$1</b>')
            .replace(/\*(.*)\*/gim, '<i>$1</i>')
            .replace(/\n/g, '<br>');
        viewer.innerHTML = html;
    });
}
function runDiagnostics() {
    const diagConsole = document.getElementById("diagConsole");
    const serverStat = document.getElementById("diag-server");
    const dbStat = document.getElementById("diag-db");
    const iaStat = document.getElementById("diag-ia");
    const botsStat = document.getElementById("diag-bots");

    const addLog = (msg, type = "info") => {
        const color = type === "error" ? "#ef4444" : (type === "success" ? "#10b981" : "#38bdf8");
        diagConsole.innerHTML += `<div style="color: ${color};">> ${msg}</div>`;
        diagConsole.scrollTop = diagConsole.scrollHeight;
    };

    diagConsole.innerHTML = "> Iniciando diagnóstico profundo...<br>";
    
    // 1. Test Servidor
    addLog("Probando conectividad con la API...", "info");
    fetch('/api/status', { headers: { 'Authorization': authToken } })
    .then(r => r.json()).then(data => {
        if(data.ok) {
            serverStat.innerText = "ONLINE";
            serverStat.style.color = "#10b981";
            addLog("Servidor responde correctamente (HTTP 200)", "success");
            
            // 2. Test DB
            addLog("Validando integridad de Base de Datos...", "info");
            if(data.db_vistos >= 0) {
                dbStat.innerText = "OK (" + data.db_vistos + " users)";
                dbStat.style.color = "#10b981";
                addLog("Base de Datos activa y con registros.", "success");
            } else {
                dbStat.innerText = "VACÍA";
                dbStat.style.color = "#f59e0b";
                addLog("Advertencia: La Base de Datos no tiene registros de usuarios.", "warning");
            }
        }
    }).catch(e => {
        serverStat.innerText = "ERROR";
        serverStat.style.color = "#ef4444";
        addLog("Fallo crítico: No se pudo contactar con el servidor.", "error");
    });

    // 3. Test IA
    addLog("Analizando densidad de red neuronal...", "info");
    fetch('/api/ia/stats', { headers: { 'Authorization': authToken } })
    .then(r => r.json()).then(data => {
        if(data.ok) {
            iaStat.innerText = data.stats.words + " nodos";
            iaStat.style.color = "#10b981";
            addLog("IA operativa con " + data.stats.words + " conceptos aprendidos.", "success");
        }
    });

    // 4. Test Bots
    addLog("Verificando tokens activos...", "info");
    fetch('/api/bots', { headers: { 'Authorization': authToken } })
    .then(r => r.json()).then(data => {
        if(data.ok) {
            const count = data.bots ? data.bots.length : 0;
            botsStat.innerText = count + " activos";
            botsStat.style.color = count > 0 ? "#10b981" : "#f59e0b";
            addLog("Se detectaron " + count + " bots vinculados al sistema.", "success");
        }
    });
}

document.addEventListener("DOMContentLoaded", () => {
    // Restaurar Tema
    const savedTheme = localStorage.getItem('moon_theme');
    if (savedTheme) setTheme(savedTheme);
    
    // Restaurar Idioma
    const savedLang = localStorage.getItem('moon_lang');
    if(savedLang) {
        document.getElementById("langSelect").value = savedLang;
        changeLanguage();
    }

    // Auto-Login si hay token
    const savedToken = localStorage.getItem('moon_token');
    if(savedToken) {
        authToken = savedToken;
        document.getElementById("loginScreen").style.display = "none";
        document.getElementById("dashboard").style.display = "block";
        switchTab('dashboard', document.querySelector('.tab-btn.active'));
    }
    
    // Inicializar Componentes UI
    initMatrix();
    updateClock();
    
    console.log("Moon Multibot Interface Ready");
});



function quickSeed() {
    const input = document.getElementById('iaQuickSeed');
    if(!input) return;
    const text = input.value;
    if(!text) return;
    fetch('/api/ia/seed', {
        method: 'POST',
        headers: { 'Authorization': authToken, 'Content-Type': 'application/json' },
        body: JSON.stringify({ knowledge: text })
    }).then(r => r.json()).then(data => {
        if(data.ok) {
            showToast('🧠 IA', 'Conocimiento inyectado.');
            input.value = '';
            if(typeof fetchIAFeeders === 'function') fetchIAFeeders();
        }
    });
}

function execCmd() {
    const input = document.getElementById('consoleCmd');
    if(!input) return;
    const cmd = input.value;
    if(!cmd) return;
    if(typeof addWebLog === 'function') addWebLog('CMD', '> ' + cmd);
    if(cmd === '/help') {
        if(typeof addWebLog === 'function') addWebLog('INFO', 'Comandos disponibles: /stats, /clear, /evolve');
    } else {
        if(typeof addWebLog === 'function') addWebLog('WARN', 'Comando no reconocido.');
    }
    input.value = '';
}

function exportLogs() {
    const logEl = document.getElementById('webLog');
    if(!logEl) return;
    const logs = logEl.innerText;
    const blob = new Blob([logs], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'moon_logs_' + Date.now() + '.txt';
    a.click();
    if(typeof showToast === 'function') showToast('📂 Exportar', 'Logs descargados.');
}
