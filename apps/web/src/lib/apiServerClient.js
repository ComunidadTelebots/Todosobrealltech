import pb from './pocketbaseClient.js';

const API_SERVER_URL = "/hcgi/api";

const apiServerClient = {
    fetch: async (url, options = {}) => {
        const headers = new Headers(options.headers || {});
        if (pb.authStore.token && !headers.has('Authorization')) {
            headers.set('Authorization', `Bearer ${pb.authStore.token}`);
        }
        return await window.fetch(API_SERVER_URL + url, { ...options, headers });
    },
    readJson: async (response) => {
        const text = await response.text();
        if (!text.trim()) return {};
        try {
            return JSON.parse(text);
        } catch {
            const error = new Error(response.ok
                ? 'La API devolvió una respuesta inválida'
                : `Servicio API temporalmente no disponible (HTTP ${response.status})`);
            error.status = response.status;
            throw error;
        }
    },
};

export default apiServerClient;

export { apiServerClient };
