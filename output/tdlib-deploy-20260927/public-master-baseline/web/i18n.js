/**
 * MoonBot i18n Engine - Centralized Translation Platform
 */

let currentLang = localStorage.getItem('moon_lang') || 'es';
let translations = {};

async function initI18n() {
    try {
        const response = await fetch('/api/ia/translations');
        const data = await response.json();
        translations = data.translations;
        applyTranslations();
    } catch (error) {
        console.error("Error loading translations:", error);
    }
}

function applyTranslations() {
    if (!translations || Object.keys(translations).length === 0) return;
    const elements = document.querySelectorAll('[data-i18n]');
    const langData = translations[currentLang] || translations['es'];
    
    elements.forEach(el => {
        const key = el.getAttribute('data-i18n');
        if (langData[key]) {
            if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') {
                el.placeholder = langData[key];
            } else {
                el.innerText = langData[key];
            }
        }
    });
    
    // Actualizar selectores de idioma en la UI
    const langSelectors = document.querySelectorAll('.lang-select');
    langSelectors.forEach(s => s.value = currentLang);
}

function setLanguage(lang) {
    currentLang = lang;
    localStorage.setItem('moon_lang', lang);
    applyTranslations();
    showToast("🌐 Idioma", `Sistema cambiado a: ${lang.toUpperCase()}`);
}

// Inicializar al cargar
window.addEventListener('DOMContentLoaded', initI18n);
