// --- Moon Multibot v16.14.0 - Clean Neural Logic ---
console.log("Moon Multibot Core v16.14.0 Loaded");

let authToken = localStorage.getItem('moon_token') || "";
if (authToken && !authToken.startsWith('Bearer ')) {
    authToken = 'Bearer ' + authToken;
    localStorage.setItem('moon_token', authToken);
}

let currentChatId = null;
let perfChart = null;
let cpuData = [];
let ramData = [];
let matrixInterval = null;
let moonAnalyticsConfig = {
    measurementId: "",
    cookieBannerEnabled: "on",
    analyticsEnabled: "on"
};
let moonAnalyticsLoaded = false;
let moonAnalyticsActiveId = "";
let moonLastTrackedPage = "";
const MOON_COOKIE_CONSENT_KEY = "moon_cookie_consent";

function getStoredAuthToken() {
    return authToken || localStorage.getItem('moon_token') || "";
}

function escapeJsArg(value) {
    return String(value ?? "").replace(/\\/g, "\\\\").replace(/'/g, "\\'");
}

async function downloadWithAuth(url, filename) {
    const res = await fetch(url, { headers: { "Authorization": getStoredAuthToken() } });
    if (!res.ok) {
        showToast("Error", "No se pudo descargar el archivo.");
        return;
    }
    const blob = await res.blob();
    const objectUrl = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = objectUrl;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(objectUrl);
}

function normalizeAnalyticsId(value) {
    return String(value || "").trim().toUpperCase();
}

function isAnalyticsConsentGranted() {
    return localStorage.getItem(MOON_COOKIE_CONSENT_KEY) === "accepted";
}

function setAnalyticsConsent(consent) {
    localStorage.setItem(MOON_COOKIE_CONSENT_KEY, consent);
    const banner = document.getElementById("cookieConsentBanner");
    if(banner) banner.remove();

    if(consent === "accepted") {
        loadGoogleAnalytics();
        if(typeof gtag === "function") {
            gtag("event", "cookie_consent", { consent_state: "accepted" });
        }
        showToast("Cookies", "Preferencias guardadas.");
    } else {
        disableGoogleAnalytics();
        showToast("Cookies", "Analytics desactivado.");
    }
}

function disableGoogleAnalytics() {
    if(typeof gtag === "function") {
        gtag("consent", "update", {
            analytics_storage: "denied",
            ad_storage: "denied"
        });
    }
}

function loadGoogleAnalytics() {
    const measurementId = normalizeAnalyticsId(moonAnalyticsConfig.measurementId);
    if(!measurementId || moonAnalyticsConfig.analyticsEnabled !== "on") {
        disableGoogleAnalytics();
        return;
    }

    const consentGranted = isAnalyticsConsentGranted();
    window.dataLayer = window.dataLayer || [];
    window.gtag = window.gtag || function(){ dataLayer.push(arguments); };
    gtag("consent", "default", {
        analytics_storage: consentGranted ? "granted" : "denied",
        ad_storage: "denied"
    });
    gtag("consent", "update", {
        analytics_storage: consentGranted ? "granted" : "denied",
        ad_storage: "denied"
    });

    if(!moonAnalyticsLoaded) {
        const script = document.createElement("script");
        script.async = true;
        script.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(measurementId)}`;
        document.head.appendChild(script);
        moonAnalyticsLoaded = true;
        gtag("js", new Date());
    }

    if(moonAnalyticsActiveId !== measurementId) {
        gtag("config", measurementId, { send_page_view: false });
        moonAnalyticsActiveId = measurementId;
    }

    if(consentGranted) trackPageView(window.MOON_CONFIG?.currentTab || "dashboard");
}

function trackPageView(tabId) {
    const measurementId = normalizeAnalyticsId(moonAnalyticsConfig.measurementId);
    if(!measurementId || !moonAnalyticsLoaded || !isAnalyticsConsentGranted() || typeof gtag !== "function") return;
    const pagePath = tabId === "login" ? "/" : `/${tabId}`;
    if(moonLastTrackedPage === pagePath) return;
    moonLastTrackedPage = pagePath;
    gtag("event", "page_view", {
        page_title: `Moon Multibot - ${tabId}`,
        page_path: pagePath
    });
}

function showCookieConsentBanner() {
    if(!normalizeAnalyticsId(moonAnalyticsConfig.measurementId)) return;
    if(moonAnalyticsConfig.cookieBannerEnabled !== "on" || localStorage.getItem(MOON_COOKIE_CONSENT_KEY)) return;
    if(document.getElementById("cookieConsentBanner")) return;

    const banner = document.createElement("div");
    banner.id = "cookieConsentBanner";
    banner.className = "cookie-consent-banner";
    banner.innerHTML = `
        <div class="cookie-consent-copy">
            <strong>Cookies de analitica</strong>
            <span>Usamos Google Analytics solo si das permiso para medir uso del dashboard y mejorar el sistema.</span>
        </div>
        <div class="cookie-consent-actions">
            <button type="button" onclick="setAnalyticsConsent('rejected')" class="cookie-btn secondary">Rechazar</button>
            <button type="button" onclick="setAnalyticsConsent('accepted')" class="cookie-btn primary">Aceptar</button>
        </div>
    `;
    document.body.appendChild(banner);
}

function initCookieConsent(settings) {
    moonAnalyticsConfig = {
        measurementId: normalizeAnalyticsId(settings?.google_analytics_id),
        cookieBannerEnabled: settings?.cookie_banner_enabled || "on",
        analyticsEnabled: settings?.analytics_enabled || "on"
    };

    if(!moonAnalyticsConfig.measurementId || moonAnalyticsConfig.analyticsEnabled !== "on") {
        const banner = document.getElementById("cookieConsentBanner");
        if(banner) banner.remove();
        disableGoogleAnalytics();
        return;
    }
    showCookieConsentBanner();
    loadGoogleAnalytics();
}

function refreshAnalyticsSettings() {
    const url = authToken ? '/api/admin/settings' : '/api/public/analytics';
    const options = authToken ? { headers: { 'Authorization': authToken } } : {};
    fetch(url, options)
    .then(r => r.json()).then(data => {
        if(data.ok) initCookieConsent(data.settings || data || {});
    }).catch(() => {});
}

// --- Session Management ---
function login() {
    const key = document.getElementById("authKey").value;
    if(!key) return;
    fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: key })
    })
    .then(r => r.json())
    .then(data => {
        if(data.ok) {
            authToken = 'Bearer ' + data.token;
            localStorage.setItem('moon_token', authToken);
            document.getElementById("loginScreen").style.display = "none";
            document.getElementById("dashboard").style.display = "block";
            if(typeof gtag === "function" && isAnalyticsConsentGranted()) {
                gtag("event", "login", { method: "dashboard" });
            }
            switchTab('dashboard');
            refreshAnalyticsSettings();
            showToast("🌙 Bienvenido", "Conexión neuronal establecida.");
        } else {
            document.getElementById("loginError").innerText = "❌ Clave Incorrecta";
        }
    });
}

function logout() {
    if(typeof gtag === "function" && isAnalyticsConsentGranted()) {
        gtag("event", "logout");
    }
    localStorage.removeItem("moon_token");
    location.reload();
}

// --- Tab Management ---
function switchTab(tabId, btn) {
    const container = document.getElementById('tab-container');
    if(!container) return;

    // UI Feedback
    document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));
    if (btn) btn.classList.add('active');
    else {
        const targetBtn = document.querySelector(`.nav-item[onclick*="'${tabId}'"]`);
        if(targetBtn) targetBtn.classList.add('active');
    }

    const fileMap = {
        'dashboard': 'dashboard.html',
        'bots': 'bots.html',
        'chat': 'chat.html',
        'ia': 'ia.html',
        'brain-map': 'brain_map.html',
        'history-global': 'history.html',
        'history': 'history.html',
        'moderation': 'moderation.html',
        'plugins': 'plugins.html',
        'diagnostics': 'diagnostics.html',
        'terminal': 'terminal.html',
        'changelog': 'changelog.html',
        'settings': 'settings.html',
        'business': 'business.html',
        'proxies': 'proxies.html',
        'security': 'security.html',
        'queue': 'queue.html',
        'games': 'games.html'
    };

    const fileName = fileMap[tabId] || 'dashboard.html';
    fetch(fileName + '?v=' + Date.now())
    .then(r => r.text())
    .then(html => {
        container.innerHTML = html;
        window.MOON_CONFIG = window.MOON_CONFIG || {};
        window.MOON_CONFIG.currentTab = tabId;
        
        // Aplicar traducciones al nuevo contenido dinámico
        if(typeof applyTranslations === 'function') applyTranslations();
        
        // Tab-specific initializers
        if(tabId === 'dashboard') { startPolling(); fetchBots(); initPerfChart(); }
        if(tabId === 'chat') updateDirectory();
        if(tabId === 'bots') fetchBots();
        if(tabId === 'ia') { fetchAdminSummary(); fetchIAFeeders(); fetchVisionStats(); initIATab(); fetchInlineStats(); }
        if(tabId === 'brain-map') drawNeuralMap();
        if(tabId === 'history-global') fetchGlobalHistory();
        if(tabId === 'moderation') { loadModerationTab(); fetchSecurityBlacklist(); }
        if(tabId === 'changelog') loadChangelog();
        if(tabId === 'diagnostics') runDiagnostics();
        if(tabId === 'settings') loadSettings();
        if(tabId === 'business') loadBusinessTab();
        if(tabId === 'proxies') loadProxiesTab();
        if(tabId === 'security') loadSecurityTab();
        if(tabId === 'queue') loadQueueTab();
        trackPageView(tabId);
    });
}

// --- Data Polling ---
function startPolling() {
    fetchData();
    if(window.pollingTimer) clearInterval(window.pollingTimer);
    window.pollingTimer = setInterval(fetchData, 2000);
}

function fetchData() {
    if(!authToken) return;
    fetch('/api/status', { headers: { 'Authorization': authToken } })
    .then(res => res.json()).then(data => {
        if (!data.ok) return;

        // Dashboard Stats
        const cpuVal = document.getElementById("cpuVal");
        const ramVal = document.getElementById("ramVal");
        const cpuBar = document.getElementById("cpuBar");
        const ramBar = document.getElementById("ramBar");
        if(cpuVal) cpuVal.innerText = data.cpu + "%";
        if(ramVal) ramVal.innerText = (data.ram_used || 0) + " / " + (data.ram_total || 0) + " GB";
        if(cpuBar) cpuBar.style.width = data.cpu + "%";
        if(ramBar) ramBar.style.width = data.ram + "%";
        
        // Mode Badge
        const devBadge = document.getElementById("devBadge");
        if(devBadge) {
            devBadge.style.display = (data.moon_env === "dev") ? "block" : "none";
        }

        // Header
        const uptimeEl = document.getElementById("uptimeDisplay");
        if(uptimeEl) uptimeEl.innerText = data.uptime;
        const versionEl = document.getElementById("appVersionTag");
        if(versionEl && data.version) versionEl.innerText = data.version;

        // Hero Stats reales
        updateHeroStats(data);

        // System Console
        const webLog = document.getElementById("webLog");
        if(webLog && data.logs) {
            let html = "";
            data.logs.forEach(log => {
                const colorMap = { 'ERROR': '#ef4444', 'SUCCESS': '#10b981', 'IA': '#a78bfa', 'SECURITY': '#f59e0b', 'ADMIN': '#38bdf8' };
                const color = colorMap[log.level] || '#94a3b8';
                html += `<div style="margin-bottom: 4px; word-wrap: break-word;"><span style="color:#64748b">[${log.time}]</span> <b style="color:${color}">[${log.level}]</b> ${log.text.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</div>`;
            });
            const isScrolledToBottom = webLog.scrollHeight - webLog.clientHeight <= webLog.scrollTop + 50;
            webLog.innerHTML = html;
            if(isScrolledToBottom) webLog.scrollTop = webLog.scrollHeight;
        }

        // Update Charts
        if(data.telemetry && perfChart) {
            perfChart.data.labels = data.telemetry.time;
            perfChart.data.datasets[0].data = data.telemetry.cpu;
            perfChart.data.datasets[1].data = data.telemetry.ram;
            perfChart.update('none'); // Update without animation for performance
        }
    }).catch(err => {
        console.error('Error fetching data:', err);
    });
}

// --- Bot Management ---
function fetchBots() {
    if(!authToken) return;
    fetch("/api/bots", { headers: { "Authorization": authToken } })
    .then(r => r.json()).then(data => {
        const list = document.getElementById("botList");
        const fullList = document.getElementById("fullBotList");
        const countEl = document.getElementById("activeBotsCount");
        
        if(data.bots) {
            const html = data.bots.map(b => `<div class="user-row">Bot <b>${escapeHtml(b.name)}</b><br><small>${escapeHtml(b.token_preview || "token protegido")}</small></div>`).join("");
            if(list) list.innerHTML = html;
            if(fullList) fullList.innerHTML = data.bots.map(b => `
                <div class="glass-panel bot-card" style="padding: 20px; position: relative; overflow: visible;">
                    <div style="font-size: 40px; filter: drop-shadow(0 0 10px var(--primary)); margin-bottom: 10px;">Bot</div>
                    <h4 style="margin: 0; font-size: 16px;">${escapeHtml(b.name)}</h4>
                    <small style="display:block;color:var(--text-muted);margin-top:6px;">${escapeHtml(b.token_preview || "token protegido")}</small>
                    <span class="status-badge online" style="font-size: 8px; padding: 2px 8px; margin-top: 5px;">NODO ACTIVO</span>
                    
                    <div class="bot-controls-area" style="margin-top: 20px;">
                        <button onclick="toggleBotDropdown('${escapeJsArg(b.id)}')" class="btn-glow-mini" style="width: 100%; font-size: 10px; font-weight: 800;">AJUSTES NODO</button>
                        
                        <div id="drop-${escapeHtml(b.id)}" class="bot-settings-dropdown" style="display: none;">
                            <label>GRUPOS VINCULADOS</label>
                            <select class="input-style-mini" onchange="openGroupSettings(this.value)">
                                <option value="">-- Ver Chats --</option>
                                ${(b.chats || []).map(c => `<option value="${escapeHtml(c.id)}">${escapeHtml(c.name)}</option>`).join("")}
                            </select>
                            
                            <div class="drop-actions" style="margin-top: 10px; display: grid; grid-template-columns: 1fr 1fr; gap: 5px;">
                                <button class="btn-mini-wide" style="font-size: 8px;" onclick="renameBot('${escapeJsArg(b.id)}')">REBAUTIZAR</button>
                                <button class="btn-mini-wide" style="font-size: 8px; border-color: var(--danger); color: var(--danger);" onclick="deleteBot('${escapeJsArg(b.id)}')">ELIMINAR</button>
                            </div>
                        </div>
                    </div>
                </div>`).join("");
            if(countEl) countEl.innerText = data.bots.length;
        }
    });
}

function toggleBotDropdown(id) {
    const el = document.getElementById(`drop-${id}`);
    if(el) el.style.display = el.style.display === "none" ? "block" : "none";
}

function renameBot(id) {
    const name = prompt("Nuevo nombre para este bot:");
    if(!name) return;
    showToast("Renombrar", `Solicitud enviada para ${name}`);
}

function deleteBot(id) {
    if(!confirm("Seguro que quieres desconectar este bot?")) return;
    fetch('/api/bots', {
        method: 'DELETE',
        headers: { 'Authorization': authToken, 'Content-Type': 'application/json' },
        body: JSON.stringify({ id })
    }).then(r => r.json()).then(data => {
        if(data.ok) { showToast("Eliminado", "Bot desconectado."); fetchBots(); }
        else showToast("Error", data.msg || "No se pudo eliminar el bot.");
    });
}
function openGroupSettings(cid) {
    if(!cid) return;
    showToast("⚙️ Ajustes de Grupo", `Abriendo configuración para ${cid}...`);
    // Aquí se podría abrir un modal específico para ese grupo
}

function addBot() {
    const token = document.getElementById("botTokenInput").value;
    if(!token) return;
    fetch('/api/bots', {
        method: 'POST',
        headers: { 'Authorization': authToken, 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: token })
    }).then(r => r.json()).then(data => {
        if(data.ok) {
            document.getElementById("botTokenInput").value = "";
            fetchBots();
            showToast("🤖 Bot", "Nueva instancia vinculada.");
        }
    });
}

// --- Chart Initialization ---
function initPerfChart() {
    const ctx = document.getElementById('perfChart');
    if(!ctx) return;
    
    if(perfChart) perfChart.destroy();
    
    perfChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: [],
            datasets: [
                {
                    label: 'CPU %',
                    data: [],
                    borderColor: '#8b5cf6',
                    backgroundColor: 'rgba(139, 92, 246, 0.1)',
                    borderWidth: 2,
                    tension: 0.4,
                    fill: true,
                    pointRadius: 0
                },
                {
                    label: 'RAM %',
                    data: [],
                    borderColor: '#10b981',
                    backgroundColor: 'rgba(16, 185, 129, 0.1)',
                    borderWidth: 2,
                    tension: 0.4,
                    fill: true,
                    pointRadius: 0
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: { beginAtZero: true, max: 100, grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: '#94a3b8', font: { size: 10 } } },
                x: { grid: { display: false }, ticks: { color: '#94a3b8', font: { size: 10 }, maxRotation: 0 } }
            },
            plugins: {
                legend: { display: false }
            },
            animation: { duration: 0 }
        }
    });
}

// --- Chat System ---
function updateDirectory() {
    if(!authToken) return;
    fetch("/api/chats", { headers: { "Authorization": authToken } })
    .then(res => res.json()).then(data => {
        if(!data.ok) return;
        const dashList = document.getElementById("directoryList");
        const chatList = document.getElementById("chatDirectoryList");
        const countEl = document.getElementById("chatCount");
        
        let html = data.vistos_obj.map(v => `
            <div class="chat-contact-item ${(currentChatId === v.id) ? 'active' : ''}" onclick="selectChat('${v.id}', '${v.name}')">
                <div style="display: flex; justify-content: space-between; align-items: center;">
                    <strong>${v.name}</strong>
                    <span class="badge-ch">${v.type === 'private' ? '👤' : '👥'}</span>
                </div>
                <small style="opacity: 0.5; font-size: 10px;">ID: ${v.id}</small>
            </div>`).join("");
        
        if(dashList) dashList.innerHTML = html || "Sin contactos.";
        if(chatList) chatList.innerHTML = html || "Sin contactos.";
        if(countEl) countEl.innerText = data.vistos_obj.length;
    });
}

function selectChat(id, name) {
    currentChatId = id;
    const nameEl = document.getElementById("currentChatName");
    const idEl = document.getElementById("currentChatId");
    const avatarEl = document.getElementById("chatAvatar");
    
    if(nameEl) nameEl.innerText = name;
    if(idEl) idEl.innerText = "Canal ID: " + id;
    if(avatarEl) avatarEl.innerText = name.substring(0,1).toUpperCase();
    
    fetchChatHistory();
    fetchGroupSettings(id);
    updateDirectory();
}

function fetchGroupSettings(cid) {
    if(!authToken) return;
    fetch(`/api/moderation/${cid}`, { headers: { 'Authorization': authToken } })
    .then(r => r.json()).then(data => {
        if(data.ok && data.config) {
            const checkIA = document.getElementById("checkIALearning");
            const checkMod = document.getElementById("checkAutoMod");
            const checkWel = document.getElementById("checkWelcome");
            const checkLink = document.getElementById("checkAntiLink");
            const checkFlood = document.getElementById("checkAntiFlood");
            const checkJoin = document.getElementById("checkCleanJoin");
            const selectMood = document.getElementById("selectIAMood");
            const notes = document.getElementById("groupNotes");
            
            if(checkIA) checkIA.checked = data.config.ia_learning;
            if(checkMod) checkMod.checked = data.config.auto_mod;
            if(checkWel) checkWel.checked = data.config.welcome;
            if(checkLink) checkLink.checked = data.config.anti_link;
            if(checkFlood) checkFlood.checked = data.config.anti_flood;
            if(checkJoin) checkJoin.checked = data.config.clean_join;
            if(selectMood) selectMood.value = data.config.ia_mood || "friendly";
            if(notes) notes.value = data.notes || "";
        }
    });
}

function toggleGroupSettings() {
    const sidebar = document.getElementById("groupSettingsSidebar");
    if(!sidebar) return;
    sidebar.style.width = sidebar.style.width === "0px" || sidebar.style.width === "" ? "280px" : "0px";
}

function saveGroupSettings() {
    if(!currentChatId || !authToken) return;
    
    const config = {
        ia_learning: document.getElementById("checkIALearning").checked,
        auto_mod: document.getElementById("checkAutoMod").checked,
        welcome: document.getElementById("checkWelcome").checked,
        anti_link: document.getElementById("checkAntiLink").checked,
        anti_flood: document.getElementById("checkAntiFlood").checked,
        clean_join: document.getElementById("checkCleanJoin").checked,
        ia_mood: document.getElementById("selectIAMood").value
    };
    const notes = document.getElementById("groupNotes").value;

    fetch('/api/moderation/settings', {
        method: 'POST',
        headers: { 'Authorization': authToken, 'Content-Type': 'application/json' },
        body: JSON.stringify({ cid: currentChatId, config: config })
    }).then(r => r.json()).then(data => {
        if(data.ok) showToast("✅ Configuración Guardada", "Los cambios se han aplicado al nodo.");
    });

    fetch('/api/moderation/notes', {
        method: 'POST',
        headers: { 'Authorization': authToken, 'Content-Type': 'application/json' },
        body: JSON.stringify({ cid: currentChatId, note: notes })
    });
}

function quickAction(uid, type, name) {
    if(!currentChatId || !authToken) return;
    
    const endpoints = {
        'mute': '/api/moderation/mute',
        'ban': '/api/users/ban',
        'warn': '/api/moderation/warn',
        'karma': '/api/moderation/karma'
    };
    
    const endpoint = endpoints[type];
    if(!endpoint) return;

    showToast(`⚡ Acción: ${type.toUpperCase()}`, `Procesando para ${name}...`);
    
    fetch(endpoint, {
        method: 'POST',
        headers: { 'Authorization': authToken, 'Content-Type': 'application/json' },
        body: JSON.stringify({ uid: uid, cid: currentChatId, target: uid, val: 10 }) // target para ban, val para karma
    })
    .then(r => r.json()).then(data => {
        if(data.ok) {
            Swal.close(); // Cerrar carga si existe
            showToast("✅ Éxito", `${name} ha sido procesado.`);
            fetchChatHistory();
        } else {
            showToast("❌ Error", data.msg || "No se pudo ejecutar la acción.");
        }
    });
}

function fetchChatHistory() {
    if(!currentChatId || !authToken) return;
    const body = document.getElementById("chatMessages");
    if(!body) return;
    
    fetch(`/api/history?chat_id=${currentChatId}`, { headers: { "Authorization": authToken } })
    .then(res => res.json()).then(data => {
        const history = data.history || [];
        const isAtBottom = body.scrollHeight - body.clientHeight <= body.scrollTop + 100;

        if (!history.length) {
            body.innerHTML = '<div class="empty-state"><p>Sin mensajes registrados en este canal aún.</p></div>';
            return;
        }

        body.innerHTML = history.map(m => {
            const isBot = m.sender === 'Bot';
            const bubbleClass = isBot ? 'right' : 'left';
            const senderColor = isBot ? '#fff' : (m.sender === 'Sistema' ? '#f59e0b' : '#38bdf8');
            
            // Lógica de Trust Score y Estados
            const score = m.trust_score || 50;
            const scoreColor = score > 80 ? '#10b981' : (score > 40 ? '#f59e0b' : '#ef4444');
            
            let statusTags = "";
            if(data.banned_users && data.banned_users.includes(m.uid)) statusTags += `<span class="status-tag banned" style="font-size:8px; margin-left:5px;">BANNED</span>`;
            if(data.muted_users && data.muted_users.includes(m.uid)) statusTags += `<span class="status-tag muted" style="font-size:8px; margin-left:5px;">MUTED</span>`;
            if(data.warns && data.warns[m.uid]) statusTags += `<span class="status-tag warns" style="font-size:8px; margin-left:5px; background: #f59e0b22; color: #f59e0b; border: 1px solid #f59e0b44;">${data.warns[m.uid]}/3 WARNS</span>`;

            const scoreText = isBot ? "" : `<span class="trust-badge" style="background: ${scoreColor}22; color: ${scoreColor}; border: 1px solid ${scoreColor}44;">${score}% Trust</span> ${statusTags}`;

            // Burbujas de acciones recomendadas (Solo para mensajes de otros usuarios)
            let actionsHtml = "";
            if (!isBot && m.sender !== 'Sistema') {
                actionsHtml = `
                <div class="chat-actions">
                    <button onclick="quickAction('${m.uid}', 'mute', '${m.sender}')" title="Silenciar (30m)">🔇</button>
                    <button onclick="quickAction('${m.uid}', 'ban', '${m.sender}')" title="Banear">🚫</button>
                    <button onclick="quickAction('${m.uid}', 'warn', '${m.sender}')" title="Advertir">⚠️</button>
                    <button onclick="quickAction('${m.uid}', 'karma', '${m.sender}')" title="Dar Karma">⭐</button>
                </div>`;
            }

            let mediaHtml = "";
            if(m.media) {
                const fileUrl = `/api/telegram/file/${m.media.file_id}`;
                if(m.media.type === 'photo') {
                    mediaHtml = `<div class="msg-media" style="margin-bottom:10px;"><img src="${fileUrl}" class="gallery-img" style="max-height:300px; cursor:pointer;" onclick="window.open('${fileUrl}', '_blank')"></div>`;
                } else if(m.media.type === 'video') {
                    mediaHtml = `<div class="msg-media" style="margin-bottom:10px;"><video src="${fileUrl}" controls style="width:100%; border-radius:8px; max-height:300px;"></video></div>`;
                } else if(m.media.type === 'voice') {
                    mediaHtml = `<div class="msg-media" style="margin-bottom:10px;"><audio src="${fileUrl}" controls style="width:100%; height:30px;"></audio></div>`;
                } else if(m.media.type === 'sticker') {
                    mediaHtml = `<div class="msg-media" style="margin-bottom:10px;"><img src="${fileUrl}" style="width:120px; height:120px; object-fit:contain;"></div>`;
                } else if(m.media.type === 'document') {
                    mediaHtml = `<div class="msg-media" style="margin-bottom:10px;"><a href="${fileUrl}" target="_blank" class="btn-mini-wide" style="display:block; text-align:center; padding:10px; background:rgba(255,255,255,0.05); border-radius:8px;">📄 ${m.media.name || 'Archivo'}</a></div>`;
                }
            }

            const cleanText = m.text ? m.text.replace(/\n/g, '<br>') : "";
            
            return `
            <div class="chat-bubble-container ${bubbleClass}">
                <div class="chat-bubble ${bubbleClass}">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 5px;">
                        <div class="chat-sender" style="color: ${senderColor}">${m.sender}</div>
                        ${scoreText}
                    </div>
                    ${mediaHtml}
                    <div class="chat-text">${cleanText}</div>
                    <div class="chat-time">${m.time}</div>
                </div>
                ${actionsHtml}
            </div>`;
        }).join("");

        if(isAtBottom || body.innerHTML.length < 500) {
            body.scrollTop = body.scrollHeight;
        }
    }).catch(() => {});
}

// Auto-refrescar chat activo cada 3 segundos
setInterval(() => {
    if (window.MOON_CONFIG && window.MOON_CONFIG.currentTab === 'chat' && currentChatId) {
        fetchChatHistory();
    }
}, 3000);

function insertFormat(char) {
    const input = document.getElementById("chatInput");
    if(!input) return;
    const start = input.selectionStart;
    const end = input.selectionEnd;
    const text = input.value;
    input.value = text.substring(0, start) + char + text.substring(start, end) + char + text.substring(end);
    input.focus();
    input.setSelectionRange(start + char.length, end + char.length);
}

function sendChatMessage() {
    const input = document.getElementById("chatInput");
    if(!input || !input.value || !currentChatId) return;
    const text = input.value;
    input.value = "";
    
    fetch("/api/send", {
        method: "POST",
        headers: { "Authorization": authToken, "Content-Type": "application/json" },
        body: JSON.stringify({ target: currentChatId, text: text })
    }).then(() => { 
        fetchChatHistory(); 
    });
}

// --- Moon IA ---
function fetchIAFeeders() {
    if(!authToken) return;
    fetch("/api/ia/stats", { headers: { "Authorization": authToken } })
    .then(res => res.json()).then(data => {
        if(!data.ok) return;
        const words = document.getElementById("iaWords");
        const connections = document.getElementById("iaConnections");
        const rate = document.getElementById("iaRate");
        const eta = document.getElementById("iaETA");
        const millionGoal = document.getElementById("iaMillionGoal");
        const billionGoal = document.getElementById("iaBillionGoal");
        const balancerState = document.getElementById("iaBalancerState");
        
        if(words) words.innerText = data.stats.words;
        if(connections) connections.innerText = data.stats.connections;
        if(rate) rate.innerText = data.stats.rate;
        if(eta) eta.innerText = data.stats.est_maturity;
        if(millionGoal) {
            millionGoal.innerText = `${data.stats.milestone_progress} | ${data.stats.milestone_status}`;
            millionGoal.title = `Restan ${data.stats.milestone_remaining} palabras. Ritmo requerido: ${data.stats.milestone_required_rate}`;
        }
        if(billionGoal) {
            billionGoal.innerText = `${data.stats.billion_progress} | ${data.stats.billion_status}`;
            billionGoal.title = `Restan ${data.stats.billion_remaining} palabras. Ritmo requerido: ${data.stats.billion_required_rate}`;
        }
        if(balancerState && data.stats.load_balancer) {
            const lb = data.stats.load_balancer;
            const plan = lb.last_plan || {};
            balancerState.innerText = `${lb.active ? "ACTIVO" : "PAUSADO"} | Workers: ${lb.workers || 0}/${plan.max_workers || 0} | Necesarios: ${plan.needed_workers || 0} | Fuentes: ${lb.processed_sources || 0}`;
        }

        // Update language stats
        const langStats = document.getElementById("iaLangStats");
        if(langStats && data.lang_counts) {
            const sorted = Object.entries(data.lang_counts).sort((a,b) => b[1] - a[1]);
            langStats.innerHTML = sorted.slice(0, 10).map(([lang, count]) => `
                <div class="lang-item">
                    <span class="lang-code">${lang.toUpperCase()}</span>
                    <span class="lang-count">${count}</span>
                </div>
            `).join("");
        }

        // Update IA settings
        const currentMode = document.getElementById("iaCurrentMode");
        const currentMood = document.getElementById("iaCurrentMood");
        const listenMode = document.getElementById("iaListenMode");
        const supportedLangs = document.getElementById("iaSupportedLangs");
        if(currentMode) currentMode.innerText = data.ia_mode || "Desconocido";
        if(currentMood) currentMood.innerText = data.ia_mood || "Desconocido";
        if(listenMode) listenMode.innerText = data.listen_mode ? "Activado" : "Desactivado";
        if(supportedLangs && data.supported_languages) {
            supportedLangs.innerText = data.supported_languages.length + " idiomas";
        }

        const list = document.getElementById("iaFeederList");
        if(list && data.feeders) {
            list.innerHTML = data.feeders.map(f => `
                <div class="user-row feeder-row">
                    <div class="feeder-info">
                        <span class="feeder-icon">📡</span>
                        <div>
                            <b>${f.name}</b><br>
                            <small>ID: ${f.id} | Último: ${f.last}</small>
                        </div>
                    </div>
                    <div style="display: flex; align-items: center; gap: 8px;">
                        <button class="btn-link-mini" onclick="downloadAudit('${f.id}')" style="background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); color: var(--text-muted); font-size: 8px;">📊 CSV</button>
                        <button class="btn-link-mini" onclick="quickAudit('${f.id}')" style="background: rgba(99, 102, 241, 0.1); border-color: #6366f1; color: #a5b4fc; font-size: 8px;">AUDITAR</button>
                        <button class="btn-link-mini" onclick="removeIAFeeder('${f.id}')" style="background: rgba(239, 68, 68, 0.1); border-color: #f87171; color: #f87171; font-size: 8px;">BORRAR</button>
                        <span class="status-tag ${f.status.toLowerCase()}">${f.status}</span>
                    </div>
                </div>`).join("");
        }

        fetch("/api/ia/potentials", { headers: { "Authorization": authToken } })
        .then(res => res.json()).then(data => {
            const plist = document.getElementById("iaPotentialList");
            if(plist && data.potentials) {
                const keys = Object.keys(data.potentials);
                if(keys.length === 0) {
                    plist.innerHTML = `<p style="font-size: 11px; color: var(--text-muted);">Sin nuevas fuentes detectadas.</p>`;
                    return;
                }
                
                // Obtener auditorías actuales para marcar en la lista
                fetch("/api/ia/audit/status", { headers: { "Authorization": authToken } })
                .then(r => r.json()).then(auditData => {
                    const audits = auditData.audits || {};
                    const datalist = document.getElementById("groupList");
                    let options = "";

                    plist.innerHTML = keys.map(k => {
                        const name = data.potentials[k].name || k;
                        const hasAudit = audits[k];
                        const statusTag = hasAudit ? `<span class="status-tag ${hasAudit.status}" style="font-size: 7px; margin-left: 10px;">${hasAudit.status.toUpperCase()}</span>` : '';
                        
                        options += `<option value="${k}">${name}</option>`;

                        return `
                        <div class="user-row potential-row" style="opacity: 0.8; border-left: 3px solid #6366f1;">
                            <div class="feeder-info">
                                <span class="feeder-icon" style="filter: grayscale(1);">📡</span>
                                <div>
                                    <b>${name}</b> ${statusTag}<br>
                                    <small>ID: ${k}</small>
                                </div>
                            </div>
                            <button class="btn-link-mini" onclick="quickLinkFeeder('${k}')">VINCULAR</button>
                        </div>`;
                    }).join("");
                    if(datalist) datalist.innerHTML = options;
                });
            }
        });

        fetch("/api/ia/library", { headers: { "Authorization": authToken } })
        .then(r => r.json()).then(libData => {
            if(!libData.ok) return;
            const libBody = document.getElementById("iaLibraryBody");
            const topBody = document.getElementById("iaTopSources");
            if(libBody) libBody.innerHTML = libData.library.reverse().slice(0, 50).map(i => `<tr><td><b>${i.word}</b></td><td>${i.source}</td></tr>`).join("");
            if(topBody) topBody.innerHTML = libData.top_sources.map(s => `
                <div class="ranking-item" style="flex-direction: column; align-items: flex-start; gap: 5px; padding: 10px; border-bottom: 1px solid rgba(255,255,255,0.05);">
                    <div style="width: 100%; display: flex; justify-content: space-between; cursor: pointer; align-items: center;" onclick="this.nextElementSibling.style.display = this.nextElementSibling.style.display === 'none' ? 'block' : 'none'">
                        <span style="font-weight: 700; font-size: 13px;">${s.name}</span> 
                        <span style="background: var(--primary); padding: 2px 8px; border-radius: 10px; font-size: 10px;">${s.count}</span>
                    </div>
                    <div class="source-words" style="display: none; font-size: 10px; color: var(--text-muted); padding: 8px; background: rgba(0,0,0,0.2); border-radius: 5px; width: 100%; box-sizing: border-box; line-height: 1.4;">
                        <b style="color: var(--secondary); display: block; margin-bottom: 3px;">Muestra Neuronal:</b>
                        ${s.words.join(", ")}...
                    </div>
                </div>
            `).join("");
        });
    });
}

function testIA() {
    const input = document.getElementById("iaTestInput");
    const res = document.getElementById("iaTestRes");
    if(!input || !input.value || !res) return;
    res.innerHTML = "<i>Pensando...</i>";
    fetch('/api/ia/test', {
        method: 'POST',
        headers: { 'Authorization': authToken, 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: input.value })
    }).then(r => r.json()).then(data => {
        if(data.ok) {
            res.innerHTML = `<div class="res-content">${data.response}</div>`;
        } else {
            res.innerHTML = `<div class="res-content error">❌ Error: ${data.msg || 'Fallo en la conexión neural'}</div>`;
        }
    }).catch(err => {
        res.innerHTML = `<div class="res-content error">❌ Error crítico: ${err.message}</div>`;
    });
}

function addIAFeeder() {
    const input = document.getElementById("feederInput");
    if(!input || !input.value) return;
    fetch("/api/ia/feeders/add", {
        method: "POST",
        headers: { "Authorization": authToken, "Content-Type": "application/json" },
        body: JSON.stringify({ id: input.value })
    }).then(r => r.json()).then(data => {
        if(data.ok) { showToast("📡 IA Feed", "Fuente vinculada."); input.value = ""; fetchIAFeeders(); }
        else { showToast("❌ Error", data.msg); }
    });
}

function downloadAudit(id) {
    if(!authToken) return;
    downloadWithAuth(`/api/ia/audit/export?id=${encodeURIComponent(id)}`, `audit_${id}.csv`);
}

function quickAudit(id) {
    if(!authToken) return;
    openAuditModal(id);
    fetch("/api/ia/audit/start", {
        method: "POST",
        headers: { "Authorization": authToken, "Content-Type": "application/json" },
        body: JSON.stringify({ id: id })
    }).then(res => res.json()).then(data => {
        if(data.ok) showToast("🛡️ Auditoría", "Análisis de calidad iniciado.");
        else { showToast("❌ Error", data.msg || "No se pudo iniciar."); closeAuditModal(); }
    });
}

function quickLinkFeeder(id) {
    if(!authToken) return;
    fetch("/api/ia/feeders/add", {
        method: "POST",
        headers: { "Authorization": authToken, "Content-Type": "application/json" },
        body: JSON.stringify({ link: id })
    }).then(r => r.json()).then(data => {
        if(data.ok) { 
            showToast("📡 IA Feed", "Fuente vinculada con éxito.");
            fetchIAFeeders(); 
        }
    });
}

function clearPotentials() {
    if(!authToken) return;
    fetch("/api/ia/potentials/clear", {
        method: "POST",
        headers: { "Authorization": authToken }
    }).then(r => r.json()).then(data => {
        if(data.ok) {
            showToast("🧹 Limpieza", "Sugerencias eliminadas.");
            fetchIAFeeders();
        }
    });
}

function startIAAudit() {
    const input = document.getElementById("feederInput");
    if(!input.value) return showToast("⚠️ Error", "Introduce un ID o enlace.");
    openAuditModal(input.value);
    fetch("/api/ia/audit/start", {
        method: "POST",
        headers: { "Authorization": authToken, "Content-Type": "application/json" },
        body: JSON.stringify({ id: input.value })
    }).then(r => r.json()).then(data => {
        if(data.ok) {
            showToast("🛡️ Auditoría", "Análisis de calidad iniciado.");
            input.value = "";
        } else {
            showToast("❌ Error", data.msg || "No se pudo iniciar la auditoría.");
            closeAuditModal();
        }
    });
}

function refreshAuditStatus() {
    if(!authToken) return;
    fetch("/api/ia/audit/status", { headers: { "Authorization": authToken } })
    .then(r => r.json()).then(data => {
        const zone = document.getElementById("auditProgressZone");
        const count = document.getElementById("activeAuditsCount");
        const audits = Object.keys(data.audits);
        if(count) count.innerText = `${audits.length} Auditorías en curso`;
        
        if(zone) {
            if(audits.length === 0) { zone.innerHTML = ""; return; }
            zone.innerHTML = audits.map(k => {
                const a = data.audits[k];
                const progress = (a.messages.length / 15) * 100;
                const qualityClass = (a.report && a.report.verdict === 'NO RECOMENDADO') ? 'low-quality' : '';
                
                return `
                    <div class="audit-card ${a.status} ${qualityClass}">
                        <div style="display: flex; justify-content: space-between; align-items: center;">
                            <div>
                                <b style="color: var(--accent);">AUDITANDO: ${a.name || k}</b><br>
                                <small>${a.messages.length}/15 mensajes analizados</small>
                            </div>
                            <div class="audit-score-circle">${a.status === 'finished' ? a.final_score + '%' : '...'}</div>
                        </div>
                        <div class="progress-bar" style="height: 4px; margin-top: 10px;">
                            <div style="width: ${progress}%; background: var(--accent); height: 100%; transition: 0.5s;"></div>
                        </div>
                        ${a.report ? `
                            <div style="font-size: 9px; margin-top: 8px; padding: 8px; background: rgba(255,255,255,0.03); border-radius: 6px; border: 1px solid rgba(255,255,255,0.05); color: var(--text-muted);">
                                <b style="color: var(--primary);">📝 INFORME DE PERITAJE:</b><br>
                                📏 Longitud media: ${a.report.avg_len} caracteres<br>
                                📚 Vocabulario único: ${a.report.unique_words} palabras<br>
                                ⚖️ Veredicto: <span style="color: ${a.final_score > 60 ? '#4ade80' : '#f87171'}">${a.report.verdict}</span>
                            </div>
                        ` : ''}
                        ${a.status === 'finished' ? `<button onclick="quickLinkFeeder('${k}')" style="width: 100%; margin-top: 10px; padding: 5px; background: rgba(74, 222, 128, 0.2); border: 1px solid #4ade80; color: #4ade80; border-radius: 4px; cursor: pointer; font-size: 10px; font-weight: 800;">VINCULAR FUENTE APROBADA</button>` : ''}
                    </div>
                `;
            }).join("");
        }
    });
}
function openAuditModal(targetId) {
    const modal = document.getElementById("auditModal");
    if(!modal) return;
    modal.style.display = "flex";
    
    // Reset steps
    document.getElementById("neural-status").innerText = "Iniciando escaneo de sinapsis...";
    document.getElementById("neural-bar").style.width = "10%";
    document.getElementById("cas-status").innerText = "Conectando con base de datos Combot...";
    document.getElementById("cas-led").className = "status-led";
    document.getElementById("spam-status").innerText = "Analizando patrones de estafa...";
    document.getElementById("audit-live-results").innerHTML = `<p>Analizando grupo: <b>${targetId}</b>...</p>`;
    
    // Simulación de pasos para feedback visual inmediato
    setTimeout(() => {
        const nStat = document.getElementById("neural-status");
        const nBar = document.getElementById("neural-bar");
        if(nStat) nStat.innerText = "Cargando historial retrospectivo...";
        if(nBar) nBar.style.width = "45%";
    }, 1200);
    
    setTimeout(() => {
        const cStat = document.getElementById("cas-status");
        const cLed = document.getElementById("cas-led");
        if(cStat) cStat.innerText = "Escudo Global Activo. Verificando integridad...";
        if(cLed) cLed.className = "status-led active";
    }, 2200);

    setTimeout(() => {
        const sStat = document.getElementById("spam-status");
        if(sStat) sStat.innerText = "Filtro Anti-Spam configurado. Monitoreando entrada...";
    }, 3200);
}

function closeAuditModal() {
    const modal = document.getElementById("auditModal");
    if(modal) modal.style.display = "none";
}

function refreshAuditHistory() {
    if(!authToken) return;
    fetch("/api/ia/audit/history", { headers: { "Authorization": authToken } })
    .then(r => r.json()).then(data => {
        const body = document.getElementById("iaAuditHistoryBody");
        if(body && data.history) {
            if(data.history.length === 0) {
                body.innerHTML = '<tr><td colspan="5" style="text-align: center;">Sin registros previos.</td></tr>';
                return;
            }
            body.innerHTML = data.history.map(h => `
                <tr>
                    <td style="color: var(--text-muted); font-size: 11px;">${h.time}</td>
                    <td><b>${h.chat}</b></td>
                    <td style="color: var(--accent); font-weight: 800;">${h.score}%</td>
                    <td style="color: ${h.score > 60 ? '#4ade80' : '#f87171'}; font-weight: 800; font-size: 11px;">${h.verdict}</td>
                    <td>${h.cid ? `<button class="btn-link-mini" onclick="downloadAudit('${h.cid}')">📥 CSV</button>` : '-'}</td>
                </tr>
            `).join("");
        }
    });
}
setInterval(refreshAuditStatus, 3000);
setInterval(refreshAuditHistory, 10000);
setInterval(fetchIAFeeders, 2000);
setInterval(fetchInlineStats, 15000);
fetchInlineStats();

function removeIAFeeder(id) {
    if(!confirm("¿Deseas desvincular esta fuente de aprendizaje (" + id + ")?")) return;
    fetch('/api/ia/feeders/remove', {
        method: 'POST',
        headers: { 'Authorization': authToken, 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: id })
    }).then(r => r.json()).then(data => {
        if(data.ok) {
            showToast("📡 Fuente Eliminada", data.msg);
            fetchIAFeeders();
        }
    });
}

function clearAuditHistory() {
    if(!confirm("¿Seguro que quieres vaciar todo el historial de auditorías?")) return;
    fetch('/api/ia/audit/history/clear', {
        method: 'POST',
        headers: { 'Authorization': authToken }
    }).then(r => r.json()).then(data => {
        if(data.ok) {
            showToast("📋 Historial Limpio", data.msg);
            refreshAuditHistory();
        }
    });
}
refreshAuditHistory();
fetchIAFeeders();

// --- Graphics & Maps ---
function drawNeuralMap() {
    const canvas = document.getElementById("neuralCanvas");
    if(!canvas) return;
    const ctx = canvas.getContext("2d");
    const container = canvas.parentElement;
    
    let neurons = [];
    let pulses = []; 
    
    function resize() {
        canvas.width = container.offsetWidth;
        canvas.height = container.offsetHeight - 60;
    }
    window.addEventListener('resize', resize);
    resize();

    function syncBrain() {
        if(!authToken) return;
        fetch("/api/ia/library", { headers: { "Authorization": authToken } })
        .then(r => r.json()).then(data => {
            if(data.library && data.library.length > 0) {
                const recent = data.library.slice(-25);
                neurons = recent.map((item, i) => ({
                    id: item.word,
                    text: item.word.substring(0, 15),
                    source: item.source,
                    x: Math.random() * canvas.width,
                    y: Math.random() * canvas.height,
                    vx: (Math.random() - 0.5) * 0.4,
                    vy: (Math.random() - 0.5) * 0.4,
                    size: 3 + (item.word.length / 3),
                    alpha: 0
                }));
                if(document.getElementById("nodeCount")) document.getElementById("nodeCount").innerText = data.library.length;
            }
        });
    }
    syncBrain();
    setInterval(syncBrain, 15000);

    canvas.onclick = (e) => {
        const rect = canvas.getBoundingClientRect();
        const mx = e.clientX - rect.left;
        const my = e.clientY - rect.top;
        let found = null;
        neurons.forEach(n => {
            const dist = Math.sqrt((n.x-mx)**2 + (n.y-my)**2);
            if(dist < n.size * 4) found = n;
        });
        if(found) {
            showToast("🧠 Inspección Neuronal", `CONCEPTO: ${found.text.toUpperCase()}\nORIGEN: ${found.source}`);
        }
    };

    class ActivityPulse {
        constructor(text) {
            this.text = text;
            this.x = Math.random() * canvas.width;
            this.y = canvas.height + 10;
            this.vy = -(Math.random() * 0.8 + 0.4);
            this.alpha = 0.8;
        }
        update() {
            this.y += this.vy;
            this.alpha -= 0.003;
        }
        draw() {
            ctx.fillStyle = `rgba(167, 139, 250, ${this.alpha})`;
            ctx.font = "italic 9px Inter";
            ctx.fillText(this.text, this.x, this.y);
        }
    }

    function animate() {
        if(!document.getElementById("neuralCanvas")) return;
        ctx.clearRect(0,0, canvas.width, canvas.height);
        
        neurons.forEach(n => {
            n.x += n.vx; n.y += n.vy;
            if(n.x < 0 || n.x > canvas.width) n.vx *= -1;
            if(n.y < 0 || n.y > canvas.height) n.vy *= -1;
            if(n.alpha < 1) n.alpha += 0.01;

            const grad = ctx.createRadialGradient(n.x, n.y, 0, n.x, n.y, n.size * 2);
            grad.addColorStop(0, `rgba(139, 92, 246, ${n.alpha})`);
            grad.addColorStop(1, `rgba(139, 92, 246, 0)`);
            
            ctx.fillStyle = grad;
            ctx.beginPath(); ctx.arc(n.x, n.y, n.size * 2, 0, Math.PI*2); ctx.fill();
            
            ctx.fillStyle = `rgba(255, 255, 255, ${n.alpha * 0.6})`;
            ctx.font = "500 8px Inter";
            ctx.textAlign = "center";
            ctx.fillText(n.text, n.x, n.y + n.size + 8);
        });

        let edgeCount = 0;
        ctx.strokeStyle = "rgba(139, 92, 246, 0.1)";
        ctx.lineWidth = 0.5;
        for(let i=0; i<neurons.length; i++) {
            for(let j=i+1; j<neurons.length; j++) {
                const dx = neurons[i].x - neurons[j].x;
                const dy = neurons[i].y - neurons[j].y;
                const dist = Math.sqrt(dx*dx + dy*dy);
                if(dist < 120) {
                    edgeCount++;
                    ctx.beginPath(); ctx.moveTo(neurons[i].x, neurons[i].y);
                    ctx.lineTo(neurons[j].x, neurons[j].y); ctx.stroke();
                }
            }
        }
        if(document.getElementById("edgeCount")) document.getElementById("edgeCount").innerText = edgeCount;
        
        if(Math.random() < 0.015) {
             const samples = ["Procesando...", "Aprendiendo", "Enlazando", "Infiltración", "Sinapsis"];
             pulses.push(new ActivityPulse(samples[Math.floor(Math.random()*samples.length)]));
        }
        
        pulses = pulses.filter(p => p.alpha > 0);
        pulses.forEach(p => { p.update(); p.draw(); });

        requestAnimationFrame(animate);
    }
    animate();
}

// --- System Tools ---
function fetchGlobalHistory() {
    const body = document.getElementById("globalHistoryBody");
    if(!body) return;
    fetch("/api/global/history", { headers: { "Authorization": authToken } })
    .then(r => r.json()).then(data => {
        if(data.history) {
            body.innerHTML = data.history.reverse().map(m => `<tr><td>${m.time}</td><td>${m.chat}</td><td>${m.user}</td><td>${m.text}</td></tr>`).join("");
        }
    });
}

function exportLogs() {
    fetch('/api/status', { headers: { 'Authorization': authToken } })
    .then(r => r.json()).then(data => {
        if(!data.logs) return;
        const blob = new Blob([JSON.stringify(data.logs, null, 2)], { type: 'application/json' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `moon_logs_${Date.now()}.json`;
        a.click();
        showToast("📂 Exportar", "Logs descargados.");
    });
}

function runDiagnostics() {
    const diag = document.getElementById("diagConsole");
    if(diag) diag.innerHTML = "> Ejecutando escaneo neuronal...<br>> Todo el sistema OK.";
    refreshTDLib();
}

function loadChangelog() {
    const cont = document.getElementById("changelogContent");
    if(cont) fetch("/CHANGELOG.md").then(r => r.text()).then(t => { cont.innerText = t; });
}

function setTheme(theme) {
    document.body.className = (theme === 'moon') ? '' : 'theme-' + theme;
    localStorage.setItem('moon_theme', theme);
    if(theme === 'matrix') initMatrix();
    else if(matrixInterval) { clearInterval(matrixInterval); matrixInterval = null; document.getElementById('matrix-bg')?.remove(); }
}

function initMatrix() {
    if(document.getElementById('matrix-bg')) return;
    const canvas = document.createElement('canvas');
    canvas.id = 'matrix-bg';
    canvas.style = "position: fixed; top:0; left:0; z-index: -1; opacity: 0.15;";
    document.body.appendChild(canvas);
    const ctx = canvas.getContext('2d');
    canvas.width = window.innerWidth; canvas.height = window.innerHeight;
    const columns = canvas.width / 16;
    const drops = Array(Math.floor(columns)).fill(1);
    matrixInterval = setInterval(() => {
        ctx.fillStyle = "rgba(0, 0, 0, 0.05)";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = "#0f0"; ctx.font = "16px monospace";
        for (let i = 0; i < drops.length; i++) {
            ctx.fillText(String.fromCharCode(Math.random()*128), i * 16, drops[i] * 16);
            if (drops[i] * 16 > canvas.height && Math.random() > 0.975) drops[i] = 0;
            drops[i]++;
        }
    }, 35);
}

// --- Helpers ---
function showToast(title, message) {
    const container = document.getElementById("toast-container");
    if(!container) return;
    const toast = document.createElement("div");
    toast.className = "toast";
    toast.innerHTML = `<strong>${title}</strong><br>${message}`;
    container.appendChild(toast);
    setTimeout(() => { toast.style.opacity = '0'; setTimeout(() => toast.remove(), 300); }, 3000);
}

function updateClock() {
    const el = document.getElementById("serverClock");
    if(el) el.innerText = new Date().toLocaleTimeString();
}

async function injectMultilingual() {
    if (!confirm("¿Deseas inyectar semillas de conocimiento en múltiples idiomas (EN, FR, IT, DE, PT)?")) return;
    try {
        const r = await fetch('/api/ia/multilingual', {
            method: 'POST',
            headers: { 'Authorization': getStoredAuthToken() }
        });
        if (r.ok) {
            showToast("🌎 Iniciando expansión multilingüe...", "success");
        }
    } catch (e) { console.error(e); }
}

// --- Initialization ---
document.addEventListener("DOMContentLoaded", () => {
    setTheme(localStorage.getItem('moon_theme') || 'moon');
    refreshAnalyticsSettings();
    if(authToken) {
        document.getElementById("loginScreen").style.display = "none";
        document.getElementById("dashboard").style.display = "block";
        switchTab('dashboard');
    }
    initMatrix();
    setInterval(updateClock, 1000);
});

// --- Settings Logic ---
function loadSettings() {
    if(!authToken) return;
    fetch('/api/admin/settings', { headers: { 'Authorization': authToken } })
    .then(r => r.json()).then(data => {
        if(data.ok) {
            const s = data.settings;
            if(document.getElementById("welcomeMsgInput")) document.getElementById("welcomeMsgInput").value = s.welcome_msg || "";
            if(document.getElementById("botDescInput")) document.getElementById("botDescInput").value = s.bot_description || "";
            if(document.getElementById("iaPowerMode")) document.getElementById("iaPowerMode").value = s.ia_power || "balanced";
            if(document.getElementById("syncFrequency")) document.getElementById("syncFrequency").value = s.sync_frequency || "21600";
            if(document.getElementById("visionDepth")) document.getElementById("visionDepth").value = s.vision_depth || "full";
            if(document.getElementById("mediaPurgeDays")) document.getElementById("mediaPurgeDays").value = s.media_purge_days || "7";
            if(document.getElementById("dailyReportHour")) document.getElementById("dailyReportHour").value = s.daily_report_hour ?? "8";
            if(document.getElementById("autoBackupHours")) document.getElementById("autoBackupHours").value = s.auto_backup_hours ?? "0";
            if(document.getElementById("autoCleanupDays")) document.getElementById("autoCleanupDays").value = s.auto_cleanup_days ?? "0";
            if(document.getElementById("googleAnalyticsId")) document.getElementById("googleAnalyticsId").value = s.google_analytics_id || "";
            if(document.getElementById("cookieBannerEnabled")) document.getElementById("cookieBannerEnabled").value = s.cookie_banner_enabled || "on";
            if(document.getElementById("analyticsEnabled")) document.getElementById("analyticsEnabled").value = s.analytics_enabled || "on";

            if(document.getElementById("casProtection")) document.getElementById("casProtection").value = s.cas_protection || "on";
            if(document.getElementById("auditThreshold")) document.getElementById("auditThreshold").value = s.audit_threshold || "60";
            if(document.getElementById("floodLimit")) document.getElementById("floodLimit").value = s.flood_limit || "6";
            spamFilterEnabled = (s.spam_filter || "on") === "on";
            maintenanceMode = (s.maintenance_mode || "off") === "on";
            joinDeleteEnabled = (s.join_delete || "on") === "on";
            const spamBtn = document.getElementById("spamFilterBtn");
            if(spamBtn) {
                spamBtn.innerText = `SPAM FILTER: ${spamFilterEnabled ? 'ON' : 'OFF'}`;
                spamBtn.style.color = spamFilterEnabled ? '#10b981' : '#ef4444';
            }
            const joinBtn = document.getElementById("joinBtn");
            if(joinBtn) {
                joinBtn.innerText = `UNIONES: ${joinDeleteEnabled ? 'ON' : 'OFF'}`;
                joinBtn.style.color = joinDeleteEnabled ? '#10b981' : '#94a3b8';
            }

            const maintBtn = document.getElementById("maintBtn");
            if(maintBtn) maintBtn.innerText = `MANTENIMIENTO: ${maintenanceMode ? 'ON' : 'OFF'}`;
            if(maintBtn) maintBtn.style.color = maintenanceMode ? 'var(--danger)' : 'var(--text-muted)';

            initCookieConsent(s);
        }
    });
}

function saveGlobalSettings() {
    const data = {
        welcome_msg: document.getElementById("welcomeMsgInput")?.value,
        bot_description: document.getElementById("botDescInput")?.value,
        ia_power: document.getElementById("iaPowerMode")?.value,
        cas_protection: document.getElementById("casProtection")?.value,
        audit_threshold: document.getElementById("auditThreshold")?.value,
        flood_limit: document.getElementById("floodLimit")?.value || 6,
        spam_filter: spamFilterEnabled ? "on" : "off",
        maintenance_mode: maintenanceMode ? "on" : "off",
        join_delete: joinDeleteEnabled ? "on" : "off",
        sync_frequency: document.getElementById("syncFrequency")?.value,
        vision_depth: document.getElementById("visionDepth")?.value,
        media_purge_days: document.getElementById("mediaPurgeDays")?.value,
        daily_report_hour: document.getElementById("dailyReportHour")?.value ?? "8",
        auto_backup_hours: document.getElementById("autoBackupHours")?.value ?? "0",
        auto_cleanup_days: document.getElementById("autoCleanupDays")?.value ?? "0",
        google_analytics_id: normalizeAnalyticsId(document.getElementById("googleAnalyticsId")?.value),
        cookie_banner_enabled: document.getElementById("cookieBannerEnabled")?.value ?? "on",
        analytics_enabled: document.getElementById("analyticsEnabled")?.value ?? "on"
    };
    fetch('/api/admin/settings', {
        method: 'POST',
        headers: { 'Authorization': authToken, 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
    }).then(r => r.json()).then(data => {
        if(data.ok) {
            showToast("✅ Éxito", "Ajustes globales aplicados.");
            const stat = document.getElementById("settingsStatus");
            if(stat) { stat.innerText = "SINCRO OK"; stat.style.color = "#10b981"; }
            initCookieConsent({
                google_analytics_id: normalizeAnalyticsId(document.getElementById("googleAnalyticsId")?.value),
                cookie_banner_enabled: document.getElementById("cookieBannerEnabled")?.value ?? "on",
                analytics_enabled: document.getElementById("analyticsEnabled")?.value ?? "on"
            });
        }
    });
}

let spamFilterEnabled = true;
function toggleSpamFilter() {
    spamFilterEnabled = !spamFilterEnabled;
    const btn = document.getElementById("spamFilterBtn");
    if(btn) {
        btn.innerText = `SPAM FILTER: ${spamFilterEnabled ? 'ON' : 'OFF'}`;
        btn.style.color = spamFilterEnabled ? '#10b981' : '#ef4444';
    }
}

let maintenanceMode = false;
function toggleMaintenance() {
    maintenanceMode = !maintenanceMode;
    const btn = document.getElementById("maintBtn");
    if(btn) {
        btn.innerText = `MANTENIMIENTO: ${maintenanceMode ? 'ON' : 'OFF'}`;
        btn.style.color = maintenanceMode ? '#ef4444' : '#94a3b8';
    }
}

let joinDeleteEnabled = true;
function toggleJoinDelete() {
    joinDeleteEnabled = !joinDeleteEnabled;
    const btn = document.getElementById("joinBtn");
    if(btn) {
        btn.innerText = `UNIONES: ${joinDeleteEnabled ? 'ON' : 'OFF'}`;
        btn.style.color = joinDeleteEnabled ? '#10b981' : '#94a3b8';
    }
}

function setIAPower() {
    const mode = document.getElementById("iaPowerMode").value;
    showToast("🧠 IA Power", `Cambiando a modo ${mode.toUpperCase()}`);
}

async function backupIA() {
    const token = getStoredAuthToken().replace("Bearer ", "");
    const a = document.createElement("a");
    a.href = `/api/ia/download?token=${encodeURIComponent(token)}`;
    a.click();
}

async function restoreIA(input) {
    const file = input.files[0];
    if (!file) return;
    if (!file.name.endsWith(".db")) { showToast("❌ Error", "Solo se aceptan archivos .db"); return; }
    const fd = new FormData();
    fd.append("file", file);
    try {
        const res = await fetch("/api/ia/restore", {
            method: "POST",
            headers: { "Authorization": getStoredAuthToken() },
            body: fd
        });
        const data = await res.json();
        if (data.ok) showToast("✅ Restauración completada", data.msg);
        else showToast("❌ Error", data.msg || "Fallo al restaurar");
    } catch (e) { showToast("❌ Error", "Fallo en la restauración"); }
    input.value = "";
}

function changeLanguage() {
    const lang = document.getElementById("langSelect")?.value;
    showToast("🌐 Idioma", "Cambiando a: " + (lang === 'es' ? 'Español' : 'English'));
}

// --- Inline / Guest AI Stats ---
function fetchAdminSummary() {
    if (!authToken) return;
    fetch('/api/admin/summary', { headers: { "Authorization": authToken } })
    .then(r => r.json()).then(data => {
        if (!data.ok) return;
        const el = id => document.getElementById(id);
        if (el("summaryUsers")) el("summaryUsers").innerText = data.total_users || 0;
        if (el("summaryGroups")) el("summaryGroups").innerText = data.total_groups || 0;
        if (el("summaryBanned")) el("summaryBanned").innerText = data.total_banned || 0;
        if (el("summaryMedia")) el("summaryMedia").innerText = `${data.photos || 0} / ${data.videos || 0}`;
    }).catch(() => {});
}

function fetchInlineStats() {
    if (!authToken) return;
    fetch("/api/ia/inline_stats", { headers: { "Authorization": authToken } })
    .then(r => r.json()).then(data => {
        if (!data.ok) return;

        const s = data.summary || {};
        const el = id => document.getElementById(id);
        if (el("inlineTotalReq")) el("inlineTotalReq").innerText = s.total_requests || 0;
        if (el("inlineSuccessRate")) el("inlineSuccessRate").innerText = (s.success_rate_percent || 0) + "%";
        if (el("inlineAvgTime")) el("inlineAvgTime").innerText = (s.avg_response_time_ms || 0) + "ms";
        if (el("inlineCountInline")) el("inlineCountInline").innerText = s.inline_requests || 0;
        if (el("inlineCountGuest")) el("inlineCountGuest").innerText = s.guest_requests || 0;

        const res = data.results || {};
        if (el("inlineSuccess")) el("inlineSuccess").innerText = res.success || 0;
        if (el("inlineFailed")) el("inlineFailed").innerText = res.failed || 0;

        const dist = data.ai_distribution || {};
        if (el("inlineDistMarkov")) el("inlineDistMarkov").innerText = dist.markov || 0;
        if (el("inlineDistOllama")) el("inlineDistOllama").innerText = dist.ollama || 0;
        if (el("inlineDistGemini")) el("inlineDistGemini").innerText = dist.gemini || 0;
        if (el("inlineDistHybrid")) el("inlineDistHybrid").innerText = dist.hybrid || 0;

        const mode = data.default_ai_mode || "hybrid";
        if (el("inlineAiDefaultBadge")) el("inlineAiDefaultBadge").innerText = mode.toUpperCase();
        ["ollama","gemini","hybrid"].forEach(m => {
            const btn = el("aiBtnOllama".replace("ollama", m).replace("aiBtnOllama", "aiBtn" + m.charAt(0).toUpperCase() + m.slice(1)));
            if (btn) btn.classList.toggle("active", m === mode);
        });

        const events = data.recent_events || [];
        const feed = el("inlineRecentEvents");
        if (feed) {
            if (!events.length) {
                feed.innerHTML = '<p style="color: var(--text-muted); text-align: center; margin: 0;">Sin eventos recientes...</p>';
            } else {
                feed.innerHTML = events.slice().reverse().map(e => {
                    const icon = e.mode === "inline" ? "📱" : "👤";
                    const ok = e.success ? "✅" : "❌";
                    const aiLabel = { ollama: "🦙", gemini: "🌐", hybrid: "⚡" }[e.ai_used] || "❓";
                    return `<div style="padding: 4px 0; border-bottom: 1px solid rgba(255,255,255,0.04); display:flex; gap:8px; align-items:center;">
                        <span>${ok}</span><span>${icon}</span><span style="color:#a78bfa;">${aiLabel} ${e.ai_used}</span>
                        <span style="color:var(--text-muted);">${e.user_name || e.user_id}</span>
                        <span style="margin-left:auto; color:var(--text-muted); font-size:10px;">${e.elapsed_ms}ms · ${e.time}</span>
                    </div>`;
                }).join("");
            }
        }
    }).catch(() => {});
}

function refreshInlineStats() {
    fetchInlineStats();
    showToast("📊 Stats", "Estadísticas actualizadas");
}

function setDefaultAI(mode) {
    if (!authToken) return;
    fetch("/api/ia/inline_stats/set_default", {
        method: "POST",
        headers: { "Authorization": authToken, "Content-Type": "application/json" },
        body: JSON.stringify({ mode })
    }).then(r => r.json()).then(data => {
        if (data.ok) {
            showToast("⚡ IA", `Motor por defecto: ${data.new.toUpperCase()}`);
            fetchInlineStats();
        } else {
            showToast("❌ Error", data.msg || "No se pudo cambiar");
        }
    });
}

function setIAMood(mood) {
    if(!authToken) return;
    fetch("/api/ia/mood", {
        method: "POST",
        headers: { "Authorization": authToken, "Content-Type": "application/json" },
        body: JSON.stringify({ mood: mood })
    }).then(r => r.json()).then(data => {
        if(data.ok) showToast("🎭 Humor", `Estado de ánimo cambiado a ${mood}`);
    });
}

function setIAMode(mode) {
    if(!authToken) return;
    fetch("/api/ia/mode", {
        method: "POST",
        headers: { "Authorization": authToken, "Content-Type": "application/json" },
        body: JSON.stringify({ mode: mode })
    }).then(r => r.json()).then(data => {
        if(data.ok) showToast("⚙️ Modo", `Perfil de potencia cambiado a ${mode}`);
    });
}

function evolveIA() {
    if(!authToken) return;
    fetch("/api/ia/evolve", {
        method: "POST",
        headers: { "Authorization": authToken }
    }).then(r => r.json()).then(data => {
        if(data.ok) showToast("🧬 Evolución", "Disparando evolución neuronal...");
    });
}

function forceFeedIA() {
    if(!authToken) return;
    fetch("/api/ia/force_feed", {
        method: "POST",
        headers: { "Authorization": authToken }
    }).then(r => r.json()).then(data => {
        if(data.ok) showToast("🧠 IA Boost", "Inyectando conocimiento del historial...");
    });
}

function injectMasterIntelligence() {
    if(!authToken) return;
    fetch("/api/ia/master_seed", {
        method: "POST",
        headers: { "Authorization": authToken }
    }).then(r => r.json()).then(data => {
        if(data.ok) showToast("🧠 Master IA", "Expansión Maestra iniciada (Wikipedia + Patrones).");
    });
}

function injectWikipediaTopics() {
    const input = document.getElementById("wikiTopicsInput");
    if(!input || !input.value.trim()) return;
    if(!authToken) return;

    fetch("/api/ia/wikipedia", {
        method: "POST",
        headers: { "Authorization": authToken, "Content-Type": "application/json" },
        body: JSON.stringify({ topics: input.value.trim() })
    }).then(r => r.json()).then(data => {
        if(data.ok) {
            showToast("🌐 Wikipedia Boost", data.msg);
            input.value = "";
        } else {
            showToast("❌ Error", data.msg);
        }
    });
}

function requestIABackup() {
    if(!authToken) return;
    showToast("💾 Backup", "Solicitando copia de seguridad...");
    fetch("/api/ia/backup", {
        method: "POST",
        headers: { "Authorization": authToken }
    }).then(r => r.json()).then(data => {
        if(data.ok) {
            showToast("✅ Enviado", "La copia ha sido enviada a tu Telegram.");
        } else {
            showToast("❌ Error", data.msg || "Fallo al solicitar backup.");
        }
    });
}

// --- Neuro-Search ---
function runNeuralSearch() {
    const input = document.getElementById('neuralSearchInput');
    const resPanel = document.getElementById('neuralSearchResults');
    const resContent = document.getElementById('neuralSearchContent');
    if(!input || !input.value) return;
    
    resPanel.style.display = 'flex';
    resContent.innerHTML = '<span style="color: var(--primary);">🔍 Escaneando satélites... conectando con nodos globales...</span>';
    
    fetch('/api/ia/search', {
        method: 'POST',
        headers: { 'Authorization': authToken, 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: input.value })
    })
    .then(r => r.json()).then(data => {
        if(data.ok) {
            resContent.innerHTML = '<i style="color: var(--accent);">Resultado del análisis:</i><br><br>' + data.result;
        } else {
            resContent.innerText = '❌ Error en la conexión neuronal.';
        }
    });
}

// --- Global Search ---
function handleGlobalSearch(e) {
    const q = e.target.value.toLowerCase();
    const suggestions = document.getElementById("searchSuggestions");
    if(!q) { suggestions.style.display = "none"; return; }

    suggestions.style.display = "block";
    suggestions.innerHTML = "";

    // 1. Buscar en Chats/Grupos
    fetch("/api/chats", { headers: { "Authorization": authToken } })
    .then(r => r.json()).then(data => {
        const chats = data.vistos_obj || [];
        const matches = chats.filter(c => c.name.toLowerCase().includes(q) || c.id.toString().includes(q));
        matches.forEach(m => {
            const div = document.createElement("div");
            div.className = "search-item";
            div.style = "padding: 8px; cursor: pointer; border-bottom: 1px solid rgba(255,255,255,0.05); font-size: 11px;";
            div.innerHTML = `💬 <b>${m.name}</b> <small style="color: var(--text-muted)">(Grupo)</small>`;
            div.onmouseover = () => div.style.background = "rgba(139,92,246,0.1)";
            div.onmouseout = () => div.style.background = "transparent";
            div.onclick = () => { switchTab('chat'); setTimeout(() => selectChat(m.id, m.name), 200); suggestions.style.display = "none"; };
            suggestions.appendChild(div);
        });
    });

    // 2. Buscar en Bots
    fetch("/api/bots", { headers: { "Authorization": authToken } })
    .then(r => r.json()).then(data => {
        const bots = data.bots || [];
        const matches = bots.filter(b => b.name.toLowerCase().includes(q));
        matches.forEach(m => {
            const div = document.createElement("div");
            div.className = "search-item";
            div.style = "padding: 8px; cursor: pointer; border-bottom: 1px solid rgba(255,255,255,0.05); font-size: 11px;";
            div.innerHTML = `🤖 <b>${m.name}</b> <small style="color: var(--text-muted)">(Nodo)</small>`;
            div.onmouseover = () => div.style.background = "rgba(139,92,246,0.1)";
            div.onmouseout = () => div.style.background = "transparent";
            div.onclick = () => { switchTab('bots'); suggestions.style.display = "none"; };
            suggestions.appendChild(div);
        });
    });
}

// --- Dashboard: Datos Reales ---
function updateHeroStats(data) {
    const vistos = document.getElementById("heroDbVistos");
    const disk = document.getElementById("heroDiskVal");
    if (vistos && data.db_vistos !== undefined) vistos.innerText = data.db_vistos;
    if (disk && data.disk !== undefined) disk.innerText = data.disk + "%";
}

// --- Dashboard: quickSeed ---
function quickSeed() {
    const input = document.getElementById("iaQuickSeed");
    if (!input || !input.value.trim()) return;
    fetch("/api/ia/test", {
        method: "POST",
        headers: { "Authorization": authToken, "Content-Type": "application/json" },
        body: JSON.stringify({ text: input.value.trim() })
    }).then(r => r.json()).then(data => {
        if (data.ok) {
            showToast("🧠 Semilla Inyectada", `IA procesó: "${input.value.trim()}"`);
            input.value = "";
        }
    });
}

async function injectExpansionTopics() {
    const source = document.getElementById("expansionSource").value;
    const input = document.getElementById("wikiTopicsInput");
    const topics = input.value.trim();
    if (!topics) return;

    input.disabled = true;
    try {
        const res = await fetch("/api/ia/expand", {
            method: "POST",
            headers: { "Content-Type": "application/json", "Authorization": getStoredAuthToken() },
            body: JSON.stringify({ source, items: topics })
        });
        const data = await res.json();
        if (data.ok) {
            showToast("🚀 Expansión Iniciada", `Absorbiendo de ${source.toUpperCase()}...`);
            input.value = "";
        } else {
            showToast("❌ Error", data.msg);
        }
    } catch (e) {
        showToast("❌ Error", "Fallo de conexión");
    }
    input.disabled = false;
}

function injectProgrammingCore() {
    const source = document.getElementById("expansionSource");
    const input = document.getElementById("wikiTopicsInput");
    if(source) source.value = "programming";
    if(input) input.value = "python,javascript,typescript,sql,html,css,bash,go,rust,java";
    injectExpansionTopics();
}


async function startIALoadBalancer() {
    const workers = parseInt(document.getElementById("iaBalancerWorkers")?.value || "8", 10);
    const sourceMultiplier = parseInt(document.getElementById("iaBalancerSources")?.value || "3", 10);
    try {
        const res = await fetch("/api/ia/load_balancer", {
            method: "POST",
            headers: { "Content-Type": "application/json", "Authorization": getStoredAuthToken() },
            body: JSON.stringify({ action: "start", max_workers: workers, source_multiplier: sourceMultiplier })
        });
        const data = await res.json();
        showToast(data.ok ? "Balanceador" : "Error", data.msg || "Solicitud procesada");
        fetchIAFeeders();
    } catch (e) {
        showToast("Error", "No se pudo iniciar el balanceador");
    }
}

async function stopIALoadBalancer() {
    try {
        const res = await fetch("/api/ia/load_balancer", {
            method: "POST",
            headers: { "Content-Type": "application/json", "Authorization": getStoredAuthToken() },
            body: JSON.stringify({ action: "stop" })
        });
        const data = await res.json();
        showToast(data.ok ? "Balanceador" : "Error", data.msg || "Solicitud procesada");
        fetchIAFeeders();
    } catch (e) {
        showToast("Error", "No se pudo detener el balanceador");
    }
}

// --- IA: Configuración Híbrida ---
let currentIAProvider = "gemini";

function updateRatioLabel() {
    const ratio = document.getElementById("hybridRatio").value;
    document.getElementById("ratioDisplay").innerText = `${100 - ratio}% / ${ratio}%`;
}

function updateProviderUI(provider) {
    currentIAProvider = provider;
    document.getElementById("geminiStatusBadge").innerText = provider === "gemini" ? "ACTIVO" : "INACTIVO";
    document.getElementById("geminiStatusBadge").style.background = provider === "gemini" ? "var(--secondary)" : "#64748b";
    
    document.getElementById("ollamaStatusBadge").innerText = provider === "ollama" ? "ACTIVO" : "INACTIVO";
    document.getElementById("ollamaStatusBadge").style.background = provider === "ollama" ? "var(--primary)" : "#64748b";
    
    document.getElementById("activeProviderLabel").innerText = provider.toUpperCase();
    
    // Actualizar Pill de Cabecera
    const pill = document.getElementById("ai-mode-pill");
    if (pill) {
        const useExternal = document.getElementById("useExternalLLM")?.checked;
        const dreaming = document.getElementById("deepDreamMode")?.checked;
        
        pill.className = "ai-status-pill";
        if (!useExternal) {
            pill.innerText = "MOON";
        } else if (dreaming) {
            pill.innerText = "DREAMING";
            pill.classList.add("dreaming");
        } else {
            pill.innerText = provider.toUpperCase();
            pill.classList.add(provider);
        }
    }
}

function setProvider(provider) {
    // Auto-activar LLM externo al seleccionar proveedor
    const checkbox = document.getElementById("useExternalLLM");
    if (checkbox) checkbox.checked = true;
    updateProviderUI(provider);
    saveIAConfig();
    showToast("🧠 Proveedor Activado", `${provider.toUpperCase()} configurado como cerebro externo.`);
}

async function testOllamaConnection() {
    const resultDiv = document.getElementById("ollamaTestResult");
    const modelSelect = document.getElementById("ollamaModelSelect");
    const urlInput = document.getElementById("ollamaUrl");
    resultDiv.style.display = "block";
    resultDiv.style.background = "rgba(139, 92, 246, 0.1)";
    resultDiv.style.border = "1px solid var(--primary)";
    resultDiv.style.color = "var(--primary)";
    resultDiv.innerHTML = "⏳ Probando conexión con Ollama...";

    try {
        const res = await fetch("/api/ia/ollama/test", {
            method: "POST",
            headers: { "Content-Type": "application/json", "Authorization": getStoredAuthToken() },
            body: JSON.stringify({ url: urlInput?.value || "" })
        });
        const data = await res.json();
        if (data.ok) {
            resultDiv.style.background = "rgba(34, 197, 94, 0.1)";
            resultDiv.style.border = "1px solid #4ade80";
            resultDiv.style.color = "#4ade80";
            resultDiv.innerHTML = `✅ ${data.msg}`;
            
            // Actualizar URL detectada
            if (urlInput && data.url) urlInput.placeholder = data.url;
            if (urlInput && data.generate_url) urlInput.value = "";
            
            // Poblar dropdown de modelos
            if (modelSelect && data.models && data.models.length > 0) {
                modelSelect.innerHTML = '<option value="">▼ Modelos</option>';
                data.models.forEach(m => {
                    const opt = document.createElement("option");
                    opt.value = m;
                    opt.textContent = m;
                    modelSelect.appendChild(opt);
                });
                // Si el campo de modelo está vacío, seleccionar el primero
                const modelInput = document.getElementById("ollamaModel");
                if (modelInput && !modelInput.value) {
                    modelInput.value = data.models[0];
                }
            }
        } else {
            resultDiv.style.background = "rgba(239, 68, 68, 0.1)";
            resultDiv.style.border = "1px solid #f87171";
            resultDiv.style.color = "#f87171";
            resultDiv.innerHTML = `❌ ${data.msg}`;
            if (data.tried) {
                resultDiv.innerHTML += `<br><small style="opacity: 0.7;">URLs probadas: ${data.tried.join(", ")}</small>`;
            }
        }
    } catch (e) {
        resultDiv.style.background = "rgba(239, 68, 68, 0.1)";
        resultDiv.style.border = "1px solid #f87171";
        resultDiv.style.color = "#f87171";
        resultDiv.innerHTML = "❌ Error de conexión con el servidor del bot.";
    }
}

async function updateNeuralFeed() {
    try {
        const res = await fetch("/api/ia/library", { headers: { "Authorization": getStoredAuthToken() } });
        const data = await res.json();
        if (data.ok && data.library) {
            const container = document.getElementById("neuralLiveFeed");
            if (!container) return;
            
            // Tomar los últimos 10
            const recent = data.library.slice(0, 10);
            if (recent.length > 0) {
                container.innerHTML = "";
                recent.forEach(item => {
                    const entry = document.createElement("div");
                    entry.className = "neural-entry";
                    entry.innerHTML = `
                        <span class="word">${item.word}</span>
                        <span class="source">${item.source}</span>
                        <span style="font-size: 8px; color: var(--text-muted);">${item.time}</span>
                    `;
                    container.appendChild(entry);
                });
                
                document.getElementById("lastSource").innerText = recent[0].source;
                document.getElementById("avgQuality").innerText = "98%"; // Simulado por ahora
            }
        }
    } catch (e) { console.error("Error en Neural Feed", e); }
}

async function loadIAConfig() {
    try {
        const res = await fetch("/api/ia/config", { headers: { "Authorization": getStoredAuthToken() } });
        const data = await res.json();
        if (data.ok) {
            document.getElementById("useExternalLLM").checked = data.use_external;
            document.getElementById("deepDreamMode").checked = data.deep_dream;
            _applyDeepDreamUI(data.deep_dream);
            document.getElementById("hybridRatio").value = data.hybrid_ratio;
            document.getElementById("ollamaModel").value = data.ollama_model || "qwen2:0.5b";
            
            // Cargar URL de Ollama
            const urlInput = document.getElementById("ollamaUrl");
            if (urlInput && data.ollama_url) {
                urlInput.placeholder = data.ollama_url.replace("/api/generate", "");
            }
            
            updateProviderUI(data.provider || "gemini");
            if (data.api_key === "***") document.getElementById("geminiKey").placeholder = "Clave guardada (********)";
            updateRatioLabel();
            
            // Iniciar pooling de Feed Neuronal
            if (window.neuralFeedInterval) clearInterval(window.neuralFeedInterval);
            window.neuralFeedInterval = setInterval(updateNeuralFeed, 5000);
            updateNeuralFeed();
        }
    } catch (e) { console.error("Error cargando config IA", e); }
}

async function saveIAConfig() {
    const use_external = document.getElementById("useExternalLLM").checked;
    const deep_dream = document.getElementById("deepDreamMode").checked;
    const api_key = document.getElementById("geminiKey").value;
    const hybrid_ratio = document.getElementById("hybridRatio").value;
    const ollama_model = document.getElementById("ollamaModel").value;
    const ollama_url_input = document.getElementById("ollamaUrl")?.value;
    const ollama_url = ollama_url_input ? (ollama_url_input.replace(/\/$/, "") + "/api/generate") : "";

    try {
        const payload = { 
            use_external, 
            deep_dream,
            api_key, 
            hybrid_ratio, 
            provider: currentIAProvider, 
            ollama_model 
        };
        if (ollama_url) payload.ollama_url = ollama_url;
        
        const res = await fetch("/api/ia/config", {
            method: "POST",
            headers: { "Content-Type": "application/json", "Authorization": getStoredAuthToken() },
            body: JSON.stringify(payload)
        });
        const data = await res.json();
        if (data.ok) {
            showToast("🧠 Configuración Guardada", use_external ? `Modo Híbrido: ${currentIAProvider.toUpperCase()}` : "Solo IA Nativa");
            if (api_key) {
                document.getElementById("geminiKey").value = "";
                document.getElementById("geminiKey").placeholder = "Clave guardada (********)";
            }
        }
    } catch (e) { showToast("❌ Error", "Fallo al guardar"); }
}

function _applyDeepDreamUI(active) {
    const dot = document.getElementById("deepDreamDot");
    const label = document.getElementById("deepDreamLabel");
    const panel = document.getElementById("deepDreamPanel");
    if (!dot || !label) return;
    if (active) {
        dot.style.background = "#a78bfa";
        dot.style.boxShadow = "0 0 6px #a78bfa";
        label.textContent = "Activo — Cintia aprende en segundo plano con Wikipedia y Ollama.";
        if (panel) panel.style.background = "rgba(167,139,250,0.13)";
    } else {
        dot.style.background = "#475569";
        dot.style.boxShadow = "none";
        label.textContent = "Inactivo — activa el interruptor para que Cintia aprenda en segundo plano.";
        if (panel) panel.style.background = "rgba(167,139,250,0.06)";
    }
}

async function toggleDeepDream(active) {
    _applyDeepDreamUI(active);
    await saveIAConfig();
    showToast(active ? "🌙 Sueño Profundo activado" : "⏹ Sueño Profundo desactivado",
              active ? "Cintia estudiará en segundo plano." : "Auto-estudio pausado.");
}

// Lote inicial al cargar IA
function initIATab() {
    loadIAConfig();
}

// --- Dashboard: execCmd (consola interna) ---
function execCmd() {
    const input = document.getElementById("consoleCmd");
    if (!input || !input.value.trim()) return;
    const cmd = input.value.trim();
    input.value = "";
    const log = document.getElementById("webLog");
    if (!log) return;

    if (cmd === "clear") { log.innerHTML = ""; return; }
    if (cmd === "backup") { runBackup(); return; }
    if (cmd === "reboot") {
        fetch("/api/reboot", { method: "POST", headers: { "Authorization": authToken } })
            .then(() => showToast("🔄 Reinicio", "El servidor se está reiniciando..."));
        return;
    }
    if (cmd.startsWith("send ")) {
        const parts = cmd.split(" ");
        const cid = parts[1];
        const msg = parts.slice(2).join(" ");
        fetch("/api/send", {
            method: "POST",
            headers: { "Authorization": authToken, "Content-Type": "application/json" },
            body: JSON.stringify({ target: cid, text: msg })
        }).then(() => showToast("📤 Enviado", `Mensaje enviado a ${cid}`));
        return;
    }
    // Comando desconocido - registrar
    const entry = document.createElement("div");
    entry.style = "color: #f87171; font-size: 11px; margin-bottom: 4px;";
    entry.textContent = `❌ Comando no reconocido: "${cmd}". Disponibles: clear, backup, reboot, send <cid> <msg>`;
    log.appendChild(entry);
    log.scrollTop = log.scrollHeight;
}

// --- Dashboard: clearLogs ---
function clearLogs() {
    const log = document.getElementById("webLog");
    if (log) { log.innerHTML = ""; showToast("🗑️ Consola", "Logs limpiados."); }
}

// --- Dashboard: exportLogs ---
function exportLogs() {
    fetch("/api/audit", { headers: { "Authorization": authToken } })
    .then(r => r.json()).then(data => {
        if (!data.ok) return;
        const lines = data.logs.map(l => `[${l.time}] ${l.action}`).join("\n");
        const blob = new Blob([lines], { type: "text/plain" });
        const a = document.createElement("a");
        a.href = URL.createObjectURL(blob);
        a.download = `moon_audit_${Date.now()}.txt`;
        a.click();
        showToast("📤 Exportado", "Logs de auditoría descargados.");
    });
}

// --- Dashboard: runBackup ---
function runBackup() {
    fetch("/api/admin/backup", { method: "POST", headers: { "Authorization": authToken } })
    .then(r => r.json()).then(data => {
        if (data.ok) showToast("💾 Backup", `Copia de seguridad creada: ${data.file}`);
        else showToast("❌ Error", "No se pudo crear el backup.");
    });
}

// --- Audit CSV Download ---
function downloadAudit(cid) {
    if(!authToken) return;
    downloadWithAuth(`/api/ia/audit/export?id=${encodeURIComponent(cid)}`, `audit_${cid}.csv`);
}

// === PESTAÑA DE MODERACIÓN ===
let currentModCid = null;

function loadModerationTab() {
    // Cargar grupos en el selector
    fetch("/api/chats", { headers: { "Authorization": authToken } })
    .then(r => r.json()).then(data => {
        const sel = document.getElementById("modGroupSelect");
        if (!sel) return;
        sel.innerHTML = '<option value="">— Seleccionar Grupo —</option>';
        (data.vistos_obj || []).forEach(c => {
            const opt = document.createElement("option");
            opt.value = c.id;
            opt.textContent = c.name || c.id;
            sel.appendChild(opt);
        });
    });
    // Cargar leaderboard
    refreshLeaderboard();
}

function loadModerationData() {
    const sel = document.getElementById("modGroupSelect");
    if (!sel || !sel.value) return;
    currentModCid = sel.value;

    fetch(`/api/moderation/${currentModCid}`, { headers: { "Authorization": authToken } })
    .then(r => r.json()).then(data => {
        if (!data.ok) return;

        // Warns
        const warnsList = document.getElementById("modWarnsList");
        if (warnsList) {
            const warns = data.warns || {};
            if (Object.keys(warns).length === 0) {
                warnsList.innerHTML = '<div style="color: var(--accent); text-align: center; margin-top: 20px;">✅ Sin advertencias</div>';
            } else {
                warnsList.innerHTML = Object.entries(warns).map(([k, v]) =>
                    `<div class="mod-item">
                        <span>${k} <b style="color:#f87171">⚠️ ${v}/3</b></span>
                        <button class="btn-mod-mini" onclick="webUnwarn('${k}')">✕ Quitar</button>
                    </div>`
                ).join("");
            }
        }

        // Mutes
        const mutesList = document.getElementById("modMutesList");
        if (mutesList) {
            const muted = data.muted || [];
            if (muted.length === 0) {
                mutesList.innerHTML = '<div style="color: var(--accent); text-align: center; margin-top: 20px;">✅ Sin silenciados</div>';
            } else {
                mutesList.innerHTML = muted.map(m =>
                    `<div class="mod-item">
                        <span>🔇 ${m}</span>
                        <button class="btn-mod-mini" onclick="webUnmute('${m}')">🔊</button>
                    </div>`
                ).join("");
            }
        }

        // Notas
        const notesArea = document.getElementById("modGroupNotes");
        if (notesArea) notesArea.value = data.notes || "";
    });
}

function webUnwarn(target) {
    if (!currentModCid) return;
    fetch("/api/moderation/unwarn", {
        method: "POST",
        headers: { "Authorization": authToken, "Content-Type": "application/json" },
        body: JSON.stringify({ cid: currentModCid, target })
    }).then(() => { showToast("✅ Warn eliminado", target); loadModerationData(); });
}

function webUnmute(target) {
    if (!currentModCid) return;
    fetch("/api/moderation/unmute", {
        method: "POST",
        headers: { "Authorization": authToken, "Content-Type": "application/json" },
        body: JSON.stringify({ cid: currentModCid, target })
    }).then(() => { showToast("🔊 Silencio levantado", target); loadModerationData(); });
}

function saveGroupNotes() {
    if (!currentModCid) { showToast("⚠️ Sin grupo", "Selecciona un grupo primero."); return; }
    const note = document.getElementById("modGroupNotes").value;
    fetch("/api/moderation/notes", {
        method: "POST",
        headers: { "Authorization": authToken, "Content-Type": "application/json" },
        body: JSON.stringify({ cid: currentModCid, note })
    }).then(r => r.json()).then(data => {
        if (data.ok) showToast("📝 Nota guardada", "La nota se ha guardado en la base de datos.");
    });
}

function refreshLeaderboard() {
    fetch("/api/users/leaderboard", { headers: { "Authorization": authToken } })
    .then(r => r.json()).then(data => {
        const body = document.getElementById("leaderboardBody");
        if (!body) return;
        const lb = data.leaderboard || [];
        if (lb.length === 0) {
            body.innerHTML = '<tr><td colspan="5" style="text-align:center; color: var(--text-muted); padding: 20px;">Sin datos de actividad aún.</td></tr>';
            return;
        }
        const medals = ["🥇", "🥈", "🥉", "4️⃣", "5️⃣", "6️⃣", "7️⃣", "8️⃣", "9️⃣", "🔟"];
        body.innerHTML = lb.map((u, i) => `
            <tr style="border-bottom: 1px solid rgba(255,255,255,0.05);">
                <td style="padding: 10px; color: var(--text-muted);">${medals[i] || (i+1)}</td>
                <td style="padding: 10px; font-weight: 600;">${u.name}</td>
                <td style="padding: 10px; color: var(--accent);">${u.count}</td>
                <td style="padding: 10px; color: var(--primary);">${u.karma}</td>
                <td style="padding: 10px; font-size: 11px;">${u.badge}</td>
            </tr>
        `).join("");
    });
}

function modBanUser() {
    const uid = document.getElementById("modBanUid").value.trim();
    if (!uid) return;
    fetch("/api/users/ban", {
        method: "POST",
        headers: { "Authorization": authToken, "Content-Type": "application/json" },
        body: JSON.stringify({ uid })
    }).then(r => r.json()).then(data => {
        if (data.ok) { showToast("⛔ Usuario baneado", `UID ${uid} añadido a la lista negra.`); document.getElementById("modBanUid").value = ""; }
    });
}

function modSendToGroup() {
    const msg = document.getElementById("modBroadcastMsg").value.trim();
    if (!msg || !currentModCid) { showToast("⚠️", "Selecciona un grupo y escribe un mensaje."); return; }
    fetch("/api/send", {
        method: "POST",
        headers: { "Authorization": authToken, "Content-Type": "application/json" },
        body: JSON.stringify({ target: currentModCid, text: msg })
    }).then(() => { showToast("📢 Enviado", "Mensaje enviado al grupo."); document.getElementById("modBroadcastMsg").value = ""; });
}

// --- Global Bans Management ---
function loadGlobalBans() {
    if (!authToken) return;

    // Cargar estadísticas
    fetch("/api/users/bans/stats", { headers: { "Authorization": authToken } })
    .then(r => r.json()).then(data => {
        if (data.ok) {
            document.getElementById("totalBans").innerText = data.total_banned_users;
            document.getElementById("recentBans").innerText = data.recent_bans;

            // Mostrar breakdown por fuente
            let breakdown = "<strong>Por fuente:</strong> ";
            for (let [source, count] of Object.entries(data.sources || {})) {
                breakdown += `${source}: ${count} | `;
            }
            document.getElementById("banSourcesBreakdown").innerText = breakdown.slice(0, -3);
        }
    });

    // Cargar lista de baneados
    fetch("/api/users/bans", { headers: { "Authorization": authToken } })
    .then(r => r.json()).then(data => {
        if (data.ok) {
            const bans = data.bans || [];
            const list = document.getElementById("globalBansList");
            if (bans.length === 0) {
                list.innerHTML = "<div style='color: var(--text-muted);'>Sin usuarios baneados</div>";
            } else {
                list.innerHTML = bans.map((uid, i) => `
                    <div style="padding: 5px; border-bottom: 1px solid rgba(255,255,255,0.05); display: flex; justify-content: space-between; align-items: center;">
                        <span>${uid}</span>
                        <button class="btn-mod-mini" onclick="unbanUser('${uid}')">DESBANEAR</button>
                    </div>
                `).join("");
            }
        }
    });
}

function unbanUser(uid) {
    if (!uid) uid = document.getElementById("unbanUid").value.trim();
    if (!uid) { showToast("⚠️", "Ingresa un UID"); return; }
    if (!confirm(`¿Desbanear ${uid}?`)) return;

    fetch("/api/users/unban", {
        method: "POST",
        headers: { "Authorization": authToken, "Content-Type": "application/json" },
        body: JSON.stringify({ uid: uid })
    }).then(r => r.json()).then(data => {
        if (data.ok) {
            showToast("✅ Desbaneado", data.message);
            document.getElementById("unbanUid").value = "";
            loadGlobalBans();
        } else {
            showToast("❌ Error", data.message);
        }
    });
}

// Cargar baneos al abrir moderación
const origLoadModerationData = typeof loadModerationData === 'function' ? loadModerationData : null;
if (origLoadModerationData) {
    window.loadModerationData = function() {
        origLoadModerationData();
        setTimeout(loadGlobalBans, 300);
    };
}

// --- Plugin Commands ---
function sendPluginCommand(cmd) {
    if (!currentChatId) {
        showToast("❌ Error", "Selecciona un chat primero.");
        return;
    }
    fetch("/api/send", {
        method: "POST",
        headers: { "Authorization": authToken, "Content-Type": "application/json" },
        body: JSON.stringify({ target: currentChatId, text: cmd })
    }).then(() => {
        showToast("🔌 Comando", "Enviado al bot.");
        setTimeout(fetchChatHistory, 1000); // Actualizar chat
    });
}

// --- Vision & Security Core Logic ---
function fetchVisionStats() {
    if(!authToken || window.MOON_CONFIG.currentTab !== 'ia') return;
    fetch("/api/vision/stats", { headers: { "Authorization": authToken } })
    .then(r => r.json()).then(data => {
        if(data.ok) {
            if(document.getElementById("visionPhotos")) document.getElementById("visionPhotos").innerText = data.photos;
            if(document.getElementById("visionVideos")) document.getElementById("visionVideos").innerText = data.videos;
            if(document.getElementById("visionThreats")) document.getElementById("visionThreats").innerText = data.threats;
            
            // Estado del Escudo
            const toggle = document.getElementById("neuralShieldToggle");
            const statusText = document.getElementById("shieldStatus");
            if(toggle && statusText) {
                toggle.checked = data.shield_enabled;
                statusText.innerText = data.shield_enabled ? "🛡️ ESCUDO ACTIVO" : "🛡️ ESCUDO DESACTIVADO";
                statusText.style.color = data.shield_enabled ? "#4ade80" : "#f87171";
            }
        }
    });
}

function toggleNeuralShield() {
    fetch("/api/admin/shield", {
        method: "POST",
        headers: { "Authorization": authToken }
    }).then(r => r.json()).then(data => {
        if(data.ok) {
            showToast("🛡️ Neural Shield", data.enabled ? "Protección activada." : "Protección desactivada.");
            fetchVisionStats();
        }
    });
}

function fetchSecurityBlacklist() {
    if(!authToken || window.MOON_CONFIG.currentTab !== 'moderation') return;
    fetch("/api/security/blacklist", { headers: { "Authorization": authToken } })
    .then(r => r.json()).then(data => {
        const list = document.getElementById("bannedHashesList");
        if(list && data.blacklist) {
            if(data.blacklist.length === 0) {
                list.innerHTML = "Sin registros en la lista negra.";
            } else {
                list.innerHTML = data.blacklist.map(h => `
                    <div style="display: flex; justify-content: space-between; border-bottom: 1px solid rgba(255,255,255,0.05); padding: 5px 0;">
                        <span>${h.substring(0, 16)}...${h.substring(h.length-8)}</span>
                        <i style="color: #f87171; cursor: pointer;" title="Eliminar">🗑️</i>
                    </div>
                `).join("");
            }
        }
        const syncList = document.getElementById("syncUrlsList");
        if(syncList && data.sync_urls) {
            syncList.innerHTML = data.sync_urls.map(u => `<div>🔗 ${u}</div>`).join("");
        }
    });
}

function addSyncUrl() {
    const url = document.getElementById("syncUrlInput").value.trim();
    if(!url) return;
    fetch("/api/security/add_sync_url", {
        method: "POST",
        headers: { "Authorization": authToken, "Content-Type": "application/json" },
        body: JSON.stringify({ url })
    }).then(r => r.json()).then(data => {
        if(data.ok) {
            showToast("🌐 Sync", "URL añadida. Sincronizando hashes...");
            document.getElementById("syncUrlInput").value = "";
            fetchSecurityBlacklist();
        }
    });
}

function addManualHash() {
    const hash = document.getElementById("manualHashInput").value.trim();
    if(!hash) return;
    fetch("/api/security/ban_hash", {
        method: "POST",
        headers: { "Authorization": authToken, "Content-Type": "application/json" },
        body: JSON.stringify({ hash })
    }).then(r => r.json()).then(data => {
        if(data.ok) {
            showToast("🛡️ Seguridad", "Hash añadido a la lista negra.");
            document.getElementById("manualHashInput").value = "";
            fetchSecurityBlacklist();
        }
    });
}

// --- Telegram Business Tab ---
function loadBusinessTab() {
    if(!authToken || window.MOON_CONFIG.currentTab !== 'business') return;
    
    // Status Polling
    fetch("/api/business/status", { headers: { "Authorization": authToken } })
    .then(r => r.json()).then(data => {
        const badge = document.getElementById("busConnBadge");
        if(badge && data.connections) {
            if(data.connections.length > 0) {
                const c = data.connections[0];
                badge.className = "status-badge online";
                badge.innerHTML = `<span class="status-dot online"></span> <b>${c.user}</b> (Connected)`;
            } else {
                badge.className = "status-badge";
                badge.innerHTML = `<span class="status-dot"></span> Sin conexiones`;
            }
        }
    });

    // Config Fetch
    fetch("/api/business/config", { headers: { "Authorization": authToken } })
    .then(r => r.json()).then(data => {
        if(data.ok && data.config) {
            document.getElementById("busGreeting").value = data.config.greeting || "";
            document.getElementById("busAway").value = data.config.away || "";
            document.getElementById("busAwayMode").checked = data.config.away_mode || false;
            document.getElementById("busIAAuto").checked = data.config.ia_auto || false;
        }
    });

    fetchQuickReplies();
}

function saveBusConfig() {
    const config = {
        greeting: document.getElementById("busGreeting").value,
        away: document.getElementById("busAway").value,
        away_mode: document.getElementById("busAwayMode").checked,
        ia_auto: document.getElementById("busIAAuto").checked
    };
    fetch("/api/business/config", {
        method: "POST",
        headers: { "Authorization": authToken, "Content-Type": "application/json" },
        body: JSON.stringify(config)
    }).then(r => r.json()).then(data => {
        if(data.ok) showToast("💼 Business", "Configuración guardada.");
    });
}

function fetchQuickReplies() {
    fetch("/api/business/quick_replies", { headers: { "Authorization": authToken } })
    .then(r => r.json()).then(data => {
        const list = document.getElementById("quickRepliesList");
        if(list && data.replies) {
            if(data.replies.length === 0) {
                list.innerHTML = `<div class="subtitle" style="text-align:center; padding:20px;">No hay respuestas rápidas.</div>`;
            } else {
                list.innerHTML = data.replies.map((r, index) => `
                    <div style="display: flex; justify-content: space-between; align-items: center; background: rgba(255,255,255,0.03); padding: 10px; border-radius: 8px; margin-bottom: 8px;">
                        <div>
                            <code style="color: var(--primary); font-weight: 800;">${r.cmd}</code>
                            <div style="font-size: 11px; color: var(--text-muted); margin-top: 3px;">${r.text.substring(0, 40)}${r.text.length > 40 ? '...' : ''}</div>
                        </div>
                        <button onclick="removeQuickReply(${index})" style="width: auto; margin:0; padding: 5px; background:transparent;">🗑️</button>
                    </div>
                `).join("");
            }
        }
    });
}

function addQuickReply() {
    const cmd = document.getElementById("newQuickCmd").value.trim();
    const text = document.getElementById("newQuickText").value.trim();
    if(!cmd || !text) return;
    
    fetch("/api/business/quick_replies", { headers: { "Authorization": authToken } })
    .then(r => r.json()).then(data => {
        const replies = data.replies || [];
        replies.push({ cmd, text });
        fetch("/api/business/quick_replies", {
            method: "POST",
            headers: { "Authorization": authToken, "Content-Type": "application/json" },
            body: JSON.stringify(replies)
        }).then(r => r.json()).then(d => {
            if(d.ok) {
                document.getElementById("newQuickCmd").value = "";
                document.getElementById("newQuickText").value = "";
                fetchQuickReplies();
                showToast("⚡ Quick Reply", "Atajo añadido.");
            }
        });
    });
}

function removeQuickReply(index) {
    fetch("/api/business/quick_replies", { headers: { "Authorization": authToken } })
    .then(r => r.json()).then(data => {
        const replies = data.replies || [];
        replies.splice(index, 1);
        fetch("/api/business/quick_replies", {
            method: "POST",
            headers: { "Authorization": authToken, "Content-Type": "application/json" },
            body: JSON.stringify(replies)
        }).then(r => r.json()).then(d => {
            if(d.ok) fetchQuickReplies();
        });
    });
}

// --- MTProto Proxy Tab ---
function loadProxiesTab() {
    if(!authToken || window.MOON_CONFIG.currentTab !== 'proxies') return;
    const vpsHostField = document.getElementById("vpsHost");
    if(vpsHostField && !vpsHostField.dataset.loaded) loadVpsProxyConfig();
    loadVpsProxyStats();
    
    fetch("/api/proxies/stats", { headers: { "Authorization": authToken } })
    .then(r => r.json()).then(data => {
        const grid = document.getElementById("proxyGrid");
        if(grid && data.proxies) {
            if(data.proxies.length === 0) {
                grid.innerHTML = `<div class="glass-panel" style="grid-column: 1/-1; text-align:center; padding: 40px;">
                    <div style="font-size: 40px; margin-bottom: 20px;">🌐</div>
                    <h3 data-i18n="prox_no_nodes">No hay nodos configurados</h3>
                    <p class="subtitle">Despliega tu primer proxy MTProto para empezar.</p>
                </div>`;
            } else {
                grid.innerHTML = data.proxies.map(p => `
                    <div class="glass-panel proxy-card ${p.status.toLowerCase()}">
                        <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 20px;">
                            <div>
                                <span class="status-badge ${p.status.toLowerCase()}" style="font-size: 9px;">${p.status}</span>
                                <h4 style="margin: 10px 0 5px 0;">Puerto ${p.port}</h4>
                                <code style="font-size: 10px; color: var(--text-muted);">${p.secret.substring(0,16)}...</code>
                            </div>
                            <div style="display: flex; gap: 8px;">
                                <button onclick="toggleProxy(${p.index}, '${p.status === 'ONLINE' ? 'stop' : 'start'}')" class="btn-mini-wide" style="width: 32px; height: 32px; padding: 0;">${p.status === 'ONLINE' ? '⏹️' : '▶️'}</button>
                                <button onclick="removeProxy(${p.index})" class="btn-mini-wide" style="width: 32px; height: 32px; padding: 0; background: rgba(239,68,68,0.1);">🗑️</button>
                            </div>
                        </div>
                        <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 10px;">
                            <div class="proxy-mini-stat">
                                <label data-i18n="prox_stat_conns">CONNS</label>
                                <span>${p.conns}</span>
                            </div>
                            <div class="proxy-mini-stat">
                                <label data-i18n="prox_stat_up">UP</label>
                                <span>${p.up}</span>
                            </div>
                            <div class="proxy-mini-stat">
                                <label data-i18n="prox_stat_down">DOWN</label>
                                <span>${p.down}</span>
                            </div>
                        </div>
                    </div>
                `).join("");
            }
        }
    });
}

function escapeHtml(value) {
    return String(value ?? "").replace(/[&<>"']/g, ch => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;"
    }[ch]));
}

function loadVpsProxyConfig() {
    fetch("/api/proxies/vps/config", { headers: { "Authorization": authToken } })
    .then(r => r.json()).then(data => {
        if(!data.ok || !data.config) return;
        const cfg = data.config;
        const set = (id, val) => { const el = document.getElementById(id); if(el && val !== undefined) el.value = val; };
        set("vpsHost", cfg.host || "");
        set("vpsUser", cfg.user || "root");
        set("vpsPort", cfg.port || 22);
        set("vpsKeyPath", cfg.key_path || "");
        set("vpsPorts", (cfg.ports || [8443,8444,8445,8446]).join(","));
        const host = document.getElementById("vpsHost");
        if(host) host.dataset.loaded = "1";
    });
}

function saveVpsProxyConfig() {
    const get = id => document.getElementById(id)?.value || "";
    fetch("/api/proxies/vps/config", {
        method: "POST",
        headers: { "Authorization": authToken, "Content-Type": "application/json" },
        body: JSON.stringify({
            host: get("vpsHost"),
            user: get("vpsUser") || "root",
            port: parseInt(get("vpsPort") || "22", 10),
            key_path: get("vpsKeyPath"),
            ports: get("vpsPorts")
        })
    }).then(r => r.json()).then(data => {
        if(data.ok) {
            showToast("VPS", "Configuracion SSH guardada.");
            loadVpsProxyStats();
        } else {
            showToast("Error VPS", data.error || "No se pudo guardar");
        }
    });
}

function loadVpsProxyStats() {
    const box = document.getElementById("vpsProxyStats");
    if(!box) return;
    box.innerHTML = "Conectando al VPS...";
    fetch("/api/proxies/vps/stats", { headers: { "Authorization": authToken } })
    .then(r => r.json()).then(data => {
        if(!data.ok) {
            box.innerHTML = `<span style="color: var(--danger);">Error VPS: ${data.error || "sin conexion"}</span>`;
            return;
        }
        const s = data.stats;
        const ports = (s.ports || []).map(p => `
            <div class="proxy-mini-stat">
                <label>PUERTO ${escapeHtml(p.port)}</label>
                <span style="color:${p.listening ? 'var(--accent)' : 'var(--danger)'}">${p.listening ? 'LISTEN' : 'OFF'}</span>
                <small>${escapeHtml(p.connections)} conns</small>
            </div>
        `).join("");
        const containers = (s.containers || []).map(c => `
            <tr>
                <td>${escapeHtml(c.name)}</td><td>${escapeHtml(c.image)}</td><td>${escapeHtml(c.status)}</td>
                <td>${escapeHtml(c.cpu)}</td><td>${escapeHtml(c.mem)}</td><td>${escapeHtml(c.net)}</td><td>${escapeHtml(c.ports)}</td>
            </tr>
        `).join("");
        box.innerHTML = `
            <div style="display:flex; justify-content:space-between; gap:10px; flex-wrap:wrap;">
                <div><b>${escapeHtml(s.hostname || s.host)}</b><br><small>${escapeHtml(s.host)}</small></div>
                ${s.suggested_link ? `<button class="btn-glow-mini" data-link="${escapeHtml(s.suggested_link)}" onclick="copyVpsProxyLink(this)">COPIAR LINK REAL</button>` : ""}
            </div>
            <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(120px, 1fr)); gap:10px; margin:12px 0;">${ports}</div>
            <div class="knowledge-table-cont">
                <table class="data-table">
                    <thead><tr><th>Contenedor</th><th>Imagen</th><th>Estado</th><th>CPU</th><th>RAM</th><th>NET I/O</th><th>Puertos</th></tr></thead>
                    <tbody>${containers || '<tr><td colspan="7">Sin contenedores detectados</td></tr>'}</tbody>
                </table>
            </div>
            ${s.proxy_secret ? `<p style="font-size:11px;color:var(--text-muted);margin-top:10px;">Secret detectado: <code>${escapeHtml(s.proxy_secret)}</code></p>` : ""}
        `;
    }).catch(e => {
        box.innerHTML = `<span style="color: var(--danger);">Error VPS: ${e.message}</span>`;
    });
}

function copyVpsProxyLink(btn) {
    const link = btn?.dataset?.link;
    if(!link) return;
    navigator.clipboard.writeText(link);
    showToast("VPS", "Link MTProto copiado.");
}

function openProxyModal() { document.getElementById("proxyModal").style.display = "flex"; }
function closeProxyModal() { document.getElementById("proxyModal").style.display = "none"; }

function deployProxy() {
    const port = document.getElementById("newProxyPort").value;
    const secret = document.getElementById("newProxySecret").value;
    const tag = document.getElementById("newProxyTag").value;
    
    if(!port || !secret) return;
    
    fetch("/api/proxies/add", {
        method: "POST",
        headers: { "Authorization": authToken, "Content-Type": "application/json" },
        body: JSON.stringify({ port: parseInt(port), secret, tag })
    }).then(r => r.json()).then(data => {
        if(data.ok) {
            closeProxyModal();
            loadProxiesTab();
            showToast("🌐 Proxy", "Configuración guardada.");
        }
    });
}

function toggleProxy(index, action) {
    fetch("/api/proxies/toggle", {
        method: "POST",
        headers: { "Authorization": authToken, "Content-Type": "application/json" },
        body: JSON.stringify({ index, action })
    }).then(r => r.json()).then(data => {
        if(data.ok) {
            showToast("🌐 Proxy", action === 'start' ? "Nodo iniciado." : "Nodo detenido.");
            loadProxiesTab();
        }
    });
}

function removeProxy(index) {
    if(!confirm("¿Eliminar este nodo?")) return;
    fetch("/api/proxies/remove", {
        method: "POST",
        headers: { "Authorization": authToken, "Content-Type": "application/json" },
        body: JSON.stringify({ index })
    }).then(r => r.json()).then(data => {
        if(data.ok) loadProxiesTab();
    });
}

// --- Security Tab ---
function loadSecurityTab() {
    if(!authToken || window.MOON_CONFIG.currentTab !== 'security') return;
    fetchSecurityBlacklist();
    fetchSecurityAudit();
    fetchGlobalBans();
}

function fetchGlobalBans() {
    if(!authToken || window.MOON_CONFIG.currentTab !== 'security') return;
    fetch("/api/admin/bans", { headers: { "Authorization": authToken } })
    .then(r => r.json()).then(data => {
        const body = document.getElementById("globalBansBody");
        if(!body) return;
        body.innerHTML = "";

        const bans = data.bans || [];
        if(bans.length === 0) {
            body.innerHTML = `<tr><td colspan="3" style="padding: 15px; color: var(--text-muted); text-align: center;">No hay usuarios baneados globalmente.</td></tr>`;
            return;
        }

        bans.forEach(ban => {
            const row = document.createElement("tr");
            row.innerHTML = `
                <td style="padding: 10px;"><code>${ban.user_id}</code></td>
                <td style="color: var(--text-muted);">${ban.reason || '—'}</td>
                <td style="text-align: right;">
                    <button class="btn-unban" onclick="unbanGlobalUser('${ban.user_id}')">Desbanear</button>
                </td>
            `;
            body.appendChild(row);
        });
    });
}

function unbanGlobalUser(userId) {
    if(!confirm(`¿Desbanear globalmente al usuario ${userId}?`)) return;
    fetch("/api/admin/unban", {
        method: "POST",
        headers: { "Authorization": authToken, "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: userId })
    }).then(r => r.json()).then(data => {
        if(data.ok) {
            showToast("🚫 Baneos", `Usuario ${userId} desbaneado globalmente.`);
            fetchGlobalBans();
        } else {
            showToast("Error", data.msg || "No se pudo desbanear al usuario.");
        }
    });
}

function fetchSecurityAudit() {
    fetch("/api/security/audit", { headers: { "Authorization": authToken } })
    .then(r => r.json()).then(data => {
        const body = document.getElementById("securityAuditBody");
        if(!body) return;
        body.innerHTML = "";
        
        data.logs.reverse().forEach(log => {
            const isMalicious = log.vt_malicious > 0;
            const row = document.createElement("tr");
            row.innerHTML = `
                <td style="color: var(--text-muted);">${log.time.split(' ')[1]}</td>
                <td title="${log.chat_id}">${log.chat_name || log.chat_id}</td>
                <td title="${log.hash}"><code>${log.hash.substring(0, 8)}...</code></td>
                <td>${log.user}</td>
                <td>
                    <span class="vt-badge ${isMalicious ? 'danger' : 'success'}">${isMalicious ? '🚨 ' + (log.vt_malicious || 'Malware') : '✅ OK'}</span>
                </td>
            `;
            body.appendChild(row);
        });
    });
}

function scanHashVT() {
    const hash = document.getElementById("vtHashInput").value.trim();
    if(!hash) return;
    
    const resultDiv = document.getElementById("vtResult");
    resultDiv.style.display = "block";
    resultDiv.innerHTML = `<div class="loading-spinner">Consultando base de datos de VirusTotal...</div>`;
    
    fetch("/api/security/vt/scan", {
        method: "POST",
        headers: { "Authorization": authToken, "Content-Type": "application/json" },
        body: JSON.stringify({ hash })
    }).then(r => r.json()).then(data => {
        if(data.error) {
            resultDiv.innerHTML = `<div class="vt-card" style="border-color: var(--danger);">
                <h4 style="color: var(--danger);">❌ Error</h4>
                <p style="font-size: 13px;">${data.error}</p>
                <p style="font-size: 11px; color: var(--text-muted); margin-top: 10px;">Asegúrate de configurar VT_API_KEY en el archivo .env</p>
            </div>`;
            return;
        }
        
        if(data.not_found) {
            resultDiv.innerHTML = `<div class="vt-card">
                <h4>⚪ No encontrado</h4>
                <p style="font-size: 13px;">El hash no figura en la base de datos de VirusTotal. Puede ser una amenaza nueva o un archivo limpio desconocido.</p>
            </div>`;
            return;
        }

        const isDangerous = data.malicious > 0 || data.suspicious > 0;
        resultDiv.innerHTML = `
            <div class="vt-card" style="border-color: ${isDangerous ? 'var(--danger)' : 'var(--success)'}">
                <div style="display: flex; justify-content: space-between; align-items: center;">
                    <h4 style="color: ${isDangerous ? 'var(--danger)' : 'var(--success)'}">${isDangerous ? '🚨 AMENAZA DETECTADA' : '✅ ARCHIVO LIMPIO'}</h4>
                    <a href="${data.link}" target="_blank" style="font-size: 11px; color: var(--primary);">Ver en VirusTotal ↗️</a>
                </div>
                <div class="vt-stat-grid">
                    <div class="vt-stat-item danger">
                        <label>MALICIOSOS</label>
                        <span>${data.malicious}</span>
                    </div>
                    <div class="vt-stat-item">
                        <label>SOSPECHOSOS</label>
                        <span>${data.suspicious}</span>
                    </div>
                    <div class="vt-stat-item success">
                        <label>LIMPIOS</label>
                        <span>${data.harmless}</span>
                    </div>
                    <div class="vt-stat-item">
                        <label>INCIERTOS</label>
                        <span>${data.undetected}</span>
                    </div>
                </div>
            </div>
        `;
        
        if(isDangerous) {
            showToast("🚨 SEGURIDAD", "Se ha detectado un hash malicioso en el análisis.");
        }
    });
}

// --- Queue Tab ---
function loadQueueTab() {
    if(!authToken || window.MOON_CONFIG.currentTab !== 'queue') return;
    
    fetchTelegramHealth();
    
    fetch("/api/queue/list", { headers: { "Authorization": authToken } })
    .then(r => r.json()).then(data => {
        const body = document.getElementById("queueListBody");
        const emptyMsg = document.getElementById("emptyQueueMsg");
        body.innerHTML = "";
        
        if(!data.queue || data.queue.length === 0) {
            emptyMsg.style.display = "block";
            return;
        }
        
        emptyMsg.style.display = "none";
        data.queue.forEach(t => {
            const row = document.createElement("tr");
            row.innerHTML = `
                <td>#${t.id}</td>
                <td><span class="status-pill running">${t.type.toUpperCase()}</span></td>
                <td><code>${t.target}</code></td>
                <td style="max-width: 200px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${JSON.stringify(t.data)}</td>
                <td><span class="priority-badge">${t.priority}</span></td>
                <td><span class="status-pill ${t.status.toLowerCase()}">${t.status}</span></td>
                <td>
                    <button onclick="prioritizeTask(${t.id})" class="btn-glow-mini" style="width: auto; padding: 2px 8px; font-size: 10px; background: rgba(16,185,129,0.1); border-color: rgba(16,185,129,0.3);">↑ UP</button>
                    <button onclick="cancelTask(${t.id})" class="btn-glow-mini" style="width: auto; padding: 2px 8px; font-size: 10px; background: rgba(239,68,68,0.1); border-color: rgba(239,68,68,0.3);">❌ CANCEL</button>
                </td>
            `;
            body.appendChild(row);
        });
    });
}

function prioritizeTask(id) {
    fetch("/api/queue/prioritize", {
        method: "POST",
        headers: { "Authorization": authToken, "Content-Type": "application/json" },
        body: JSON.stringify({ id })
    }).then(() => loadQueueTab());
}

function cancelTask(id) {
    fetch("/api/queue/cancel", {
        method: "POST",
        headers: { "Authorization": authToken, "Content-Type": "application/json" },
        body: JSON.stringify({ id })
    }).then(() => loadQueueTab());
}

function fetchTelegramHealth() {
    fetch("/api/health/telegram", { headers: { "Authorization": authToken } })
    .then(r => r.json()).then(data => {
        const val = document.getElementById("tgStatusVal");
        const badge = document.getElementById("tgStatusBadge");
        if(!val) return;
        val.innerText = `${data.status} (${data.ping})`;
        badge.className = `status-badge ${data.status === 'ONLINE' ? 'online' : 'offline'}`;
    });
}

function scanDocker() {
    showToast("📦 Docker", "Escaneando red en busca de proxies...");
    fetch("/api/proxies/scan", { headers: { "Authorization": authToken } })
    .then(r => r.json()).then(data => {
        if(data.ok && data.detected) {
            if(data.detected.length > 0) {
                showToast("✅ Docker", `Se detectaron ${data.detected.length} proxies activos.`);
                console.table(data.detected);
                // Aquí podrías añadir lógica para importarlos automáticamente
            } else {
                showToast("⚠️ Docker", "No se detectaron contenedores compatibles.");
            }
        }
    });
}

// Integración en Polling
setInterval(fetchVisionStats, 5000);
setInterval(fetchSecurityBlacklist, 10000);
setInterval(() => { 
    if(window.MOON_CONFIG.currentTab === 'business') loadBusinessTab(); 
    if(window.MOON_CONFIG.currentTab === 'proxies') loadProxiesTab();
}, 5000);

// --- GitHub Update System ---
function checkSystemUpdate() {
    if(!authToken) return;
    const commitEl = document.getElementById("currentCommit");
    const remoteEl = document.getElementById("remoteStatusText");
    const applyBtn = document.getElementById("applyUpdateBtn");

    if(commitEl) commitEl.innerText = "Consultando...";
    if(remoteEl) remoteEl.innerText = "Sincronizando con GitHub...";

    fetch('/api/system/update', { headers: { 'Authorization': authToken } })
    .then(r => r.json()).then(data => {
        if(data.ok) {
            if(commitEl) commitEl.innerText = data.current_commit || "Unknown";
            if(data.behind) {
                if(remoteEl) {
                    remoteEl.innerText = "🚀 NUEVA VERSIÓN DISPONIBLE EN GITHUB";
                    remoteEl.style.color = "#3b82f6";
                }
                if(applyBtn) applyBtn.style.display = "block";
                showToast("🚀 Actualización", "Hay una nueva versión disponible en el repositorio.");
            } else {
                if(remoteEl) {
                    remoteEl.innerText = "✅ El sistema está actualizado.";
                    remoteEl.style.color = "#10b981";
                }
                if(applyBtn) applyBtn.style.display = "none";
            }
        } else {
            if(remoteEl) remoteEl.innerText = "❌ Error: " + data.error;
            showToast("❌ Git Error", data.error);
        }
    });
}

function applySystemUpdate() {
    showToast("Auto-update", "Descargando, reconstruyendo Docker y reiniciando sin intervencion...");
    fetch('/api/system/update', { 
        method: 'POST',
        headers: { 'Authorization': authToken }
    })
    .then(r => r.json()).then(data => {
        if(data.ok) {
            showToast("Exito", data.msg || "Sistema actualizado. Reinicio automatico en curso...");
            setTimeout(() => location.reload(), 8000);
        } else {
            showToast("❌ Error", data.error);
        }
    });
}

// Ensure settings loads with update check
const originalLoadSettings = typeof loadSettings === 'function' ? loadSettings : () => {};
window.loadSettings = function() {
    originalLoadSettings();
    setTimeout(checkSystemUpdate, 500);
};

// --- TDLib Panel ---
function refreshTDLib() {
    if(!authToken) return;
    fetch('/api/tdlib/status', { headers: { 'Authorization': authToken } })
    .then(r => r.json()).then(d => {
        const s = d.status || {};
        const el = id => document.getElementById(id);
        if(el('tdlib-mode'))    el('tdlib-mode').textContent    = s.mode || '---';
        if(el('tdlib-auth'))    el('tdlib-auth').textContent    = (s.auth_state || '---').replace('authorizationState','');
        if(el('tdlib-ready'))   el('tdlib-ready').textContent   = s.ready ? '✅ SÍ' : '❌ NO';
        if(el('tdlib-userbot')) el('tdlib-userbot').textContent = s.userbot_enabled ? 'ON' : 'OFF';
        const me = s.me || {};
        if(el('tdlib-me') && me.id) el('tdlib-me').textContent = `👤 @${me.username || '?'} (id: ${me.id})`;
        const btn = el('tdlib-userbot-btn');
        if(btn) btn.textContent = `USERBOT: ${s.userbot_enabled ? 'ON' : 'OFF'}`;
    }).catch(() => {});
}

function tdlibAuth(action) {
    if(!authToken) return;
    const vals = { phone: document.getElementById('tdlib-phone')?.value, code: document.getElementById('tdlib-code')?.value, password: document.getElementById('tdlib-pass')?.value };
    const value = vals[action];
    if(!value) { showToast('⚠️ Campo vacío', `Introduce el valor para ${action}`); return; }
    fetch('/api/tdlib/auth', { method:'POST', headers:{'Authorization':authToken,'Content-Type':'application/json'}, body: JSON.stringify({action, value}) })
    .then(r => r.json()).then(d => { showToast(d.ok ? '✅ Enviado' : '❌ Error', d.msg || action); refreshTDLib(); });
}

function tdlibToggleUserbot() {
    if(!authToken) return;
    fetch('/api/tdlib/userbot', { headers: { 'Authorization': authToken } })
    .then(r => r.json()).then(d => {
        const current = d.enabled || false;
        return fetch('/api/tdlib/userbot', { method:'POST', headers:{'Authorization':authToken,'Content-Type':'application/json'}, body: JSON.stringify({enabled: !current}) });
    }).then(r => r.json()).then(d => { showToast('✅ Userbot', d.enabled ? 'Activado' : 'Desactivado'); refreshTDLib(); });
}

function tdlibSyncHistory() {
    if(!authToken) return;
    const cid = document.getElementById('tdlib-sync-cid')?.value;
    if(!cid) { showToast('⚠️ Falta Chat ID', 'Introduce un chat_id para sincronizar'); return; }
    fetch('/api/tdlib/sync', { method:'POST', headers:{'Authorization':authToken,'Content-Type':'application/json'}, body: JSON.stringify({chat_id: parseInt(cid)}) })
    .then(r => r.json()).then(d => showToast(d.ok ? '✅ Sincronizado' : '❌ Error', `${d.new_messages ?? 0} mensajes nuevos`));
}

// --- Process Management ---
function fetchMoonProcesses() {
    if(!authToken) return;
    const list = document.getElementById("processList");
    if(!list) return;

    fetch('/api/system/processes', { headers: { 'Authorization': authToken } })
    .then(r => r.json()).then(data => {
        if(data.ok) {
            list.innerHTML = data.processes.map(p => `
                <div class="process-card ${p.is_self ? 'self' : 'zombie'}">
                    <div class="proc-info">
                        <b>PID: ${p.pid}</b> ${p.is_self ? '<span style="color: var(--success); font-size: 9px; margin-left: 5px;">(ESTA INSTANCIA)</span>' : ''}
                        <span class="badge-role role-${p.role}">${p.role.toUpperCase()}</span>
                        <br>
                        <small>CPU: ${p.cpu.toFixed(1)}% | MEM: ${p.mem.toFixed(1)} MB | UPTIME: ${Math.floor(p.uptime/60)} min</small>
                    </div>
                    ${!p.is_self ? `<button onclick="killMoonProcess(${p.pid})" class="btn-mini-wide" style="background: rgba(239,68,68,0.1); border-color: var(--danger); color: var(--danger); font-size: 9px; padding: 5px 10px; width:auto;">ELIMINAR ZOMBIE</button>` : ''}
                </div>
            `).join("");
        } else {
            list.innerHTML = `<div style="color: var(--danger); padding: 10px;">Error: ${data.error}</div>`;
        }
    });
}

function killMoonProcess(pid) {
    if(!confirm("¿Seguro que quieres matar el proceso " + pid + "?")) return;
    fetch('/api/system/kill', {
        method: 'POST',
        headers: { 'Authorization': authToken, 'Content-Type': 'application/json' },
        body: JSON.stringify({ pid: pid })
    }).then(r => r.json()).then(data => {
        if(data.ok) {
            showToast("💀 Eliminado", data.msg);
            fetchMoonProcesses();
        } else {
            showToast("❌ Error", data.msg || data.error);
        }
    });
}

// Hook into diagnostics tab load
const originalSwitchTab = typeof switchTab === 'function' ? switchTab : null;
if (originalSwitchTab) {
    window.switchTab = function(tabId, btn) {
        originalSwitchTab(tabId, btn);
        if(tabId === 'diagnostics') setTimeout(fetchMoonProcesses, 500);
    };
}
