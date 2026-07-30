import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const products = [
  { id: 'web', name: 'TodoSobreAllTech Web', quota: 334, contexts: ['cuentas', 'creadores', 'noticias', 'proxies', 'panel principal', 'analÃ­tica', 'privacidad', 'SEO', 'comunidades', 'soporte', 'suscripciones', 'accesibilidad'] },
  { id: 'moonbot', name: 'Moonbot', quota: 333, contexts: ['moderaciÃ³n', 'seguridad', 'IA', 'grupos', 'canales', 'usuarios', 'automatizaciones', 'multimedia', 'bots administrados', 'auditorÃ­a', 'backups', 'integraciones'] },
  { id: 'webapp', name: 'Telegram WebApp', quota: 333, contexts: ['inicio', 'administraciÃ³n de grupos', 'perfil', 'alertas', 'acciones rÃ¡pidas', 'modo offline', 'accesibilidad', 'moderaciÃ³n mÃ³vil', 'contenido', 'seguridad', 'IA', 'notificaciones'] },
];

const capabilities = [
  ['Panel predictivo', 'analytics', 'high', 'advanced', 'historial agregado'],
  ['Asistente guiado', 'ux', 'high', 'medium', 'ayuda contextual'],
  ['Alertas adaptativas', 'notifications', 'high', 'medium', 'motor de eventos'],
  ['AutomatizaciÃ³n configurable', 'automation', 'high', 'advanced', 'cola de tareas'],
  ['Comparador temporal', 'analytics', 'medium', 'medium', 'snapshots'],
  ['ExportaciÃ³n firmada', 'security', 'medium', 'advanced', 'auditorÃ­a'],
  ['Simulador previo', 'safety', 'high', 'advanced', 'entorno aislado'],
  ['Historial versionado', 'content', 'high', 'medium', 'almacenamiento'],
  ['BÃºsqueda semÃ¡ntica', 'ai', 'medium', 'advanced', 'Ã­ndice vectorial'],
  ['Resumen explicable', 'ai', 'high', 'advanced', 'modelo de lenguaje'],
  ['Control granular de permisos', 'security', 'critical', 'advanced', 'roles'],
  ['Plantillas reutilizables', 'productivity', 'medium', 'easy', 'biblioteca'],
  ['Acciones masivas con deshacer', 'operations', 'high', 'advanced', 'registro transaccional'],
  ['Calendario inteligente', 'planning', 'medium', 'medium', 'programador'],
  ['Modo de privacidad reforzada', 'privacy', 'critical', 'advanced', 'polÃ­ticas de retenciÃ³n'],
  ['DiagnÃ³stico automÃ¡tico', 'operations', 'high', 'advanced', 'telemetrÃ­a'],
  ['Recomendaciones personalizadas', 'ai', 'medium', 'advanced', 'preferencias'],
  ['Flujo de aprobaciÃ³n', 'governance', 'high', 'medium', 'roles'],
  ['Panel colaborativo', 'community', 'medium', 'medium', 'identidad'],
  ['MÃ©tricas en tiempo real', 'analytics', 'high', 'advanced', 'eventos'],
  ['Modo accesible multimodal', 'accessibility', 'high', 'advanced', 'i18n'],
  ['IntegraciÃ³n mediante webhooks', 'integrations', 'medium', 'advanced', 'firmas'],
  ['DetecciÃ³n de anomalÃ­as', 'security', 'critical', 'advanced', 'lÃ­nea base'],
  ['Centro de aprendizaje', 'education', 'medium', 'medium', 'contenido'],
  ['ConfiguraciÃ³n por idioma', 'i18n', 'high', 'medium', 'traducciones'],
  ['Vista compacta configurable', 'ux', 'low', 'easy', 'preferencias'],
  ['RecuperaciÃ³n selectiva', 'resilience', 'critical', 'advanced', 'backups'],
  ['Informe programado', 'reporting', 'medium', 'medium', 'programador'],
  ['Sandbox de pruebas', 'developer', 'high', 'advanced', 'aislamiento'],
  ['Conector interoperable', 'integrations', 'medium', 'advanced', 'API'],
];

const completedCapabilities = [
  ['Mapa de dependencias funcionales', 'operations', 'high', 'advanced', 'inventario de servicios'],
  ['Reglas condicionales visuales', 'automation', 'high', 'advanced', 'motor de reglas'],
  ['Bandeja unificada de revisión', 'governance', 'high', 'medium', 'flujos de aprobación'],
  ['Detección de cambios sensibles', 'security', 'critical', 'advanced', 'auditoría diferencial'],
  ['Explicación de decisiones automáticas', 'ai', 'high', 'advanced', 'trazas de decisión'],
  ['Panel de calidad de datos', 'analytics', 'high', 'advanced', 'validación de datos'],
  ['Importación con vista previa', 'operations', 'medium', 'medium', 'validación transaccional'],
  ['Colaboración mediante comentarios', 'community', 'medium', 'medium', 'identidad y permisos'],
  ['Etiquetas inteligentes', 'content', 'medium', 'advanced', 'clasificación semántica'],
  ['Resumen de actividad configurable', 'reporting', 'medium', 'medium', 'eventos agregados'],
  ['Alertas de caducidad', 'notifications', 'high', 'medium', 'programador temporal'],
  ['Modo de emergencia reversible', 'resilience', 'critical', 'advanced', 'planes de recuperación'],
  ['Historial de permisos efectivo', 'security', 'high', 'advanced', 'auditoría de roles'],
  ['Objetivos y progreso compartidos', 'planning', 'medium', 'medium', 'métricas de progreso'],
  ['Recomendador de configuración', 'ai', 'medium', 'advanced', 'telemetría anonimizada'],
  ['Pruebas automáticas de configuración', 'developer', 'high', 'advanced', 'sandbox'],
  ['Centro de consentimiento', 'privacy', 'critical', 'advanced', 'registro de consentimiento'],
  ['Navegación simplificada por tareas', 'accessibility', 'high', 'medium', 'mapa de tareas'],
  ['Sincronización entre dispositivos', 'integrations', 'high', 'advanced', 'identidad portable'],
  ['Detección de duplicados', 'content', 'medium', 'advanced', 'índice de similitud'],
  ['Cuotas adaptativas por uso', 'operations', 'high', 'advanced', 'telemetría y límites'],
  ['Panel de impacto comunitario', 'community', 'medium', 'advanced', 'métricas agregadas'],
  ['Traducción revisable por la comunidad', 'i18n', 'high', 'advanced', 'memoria de traducción'],
  ['Notificaciones agrupadas por contexto', 'notifications', 'medium', 'medium', 'motor de eventos'],
  ['Asistente de migración', 'ux', 'high', 'advanced', 'versionado de configuración'],
  ['Registro de decisiones administrativas', 'governance', 'high', 'medium', 'auditoría'],
  ['Análisis de accesibilidad continuo', 'accessibility', 'high', 'advanced', 'reglas WCAG'],
  ['Conector de almacenamiento externo', 'integrations', 'medium', 'advanced', 'API de archivos'],
  ['Políticas por franja horaria', 'automation', 'medium', 'medium', 'zonas horarias'],
  ['Simulador de crecimiento sostenible', 'analytics', 'medium', 'advanced', 'series históricas'],
];

const nextCapabilities = [
  ['Centro de incidencias correlacionadas', 'operations', 'critical', 'advanced', 'eventos y trazas'],
  ['Constructor de flujos sin código', 'automation', 'high', 'advanced', 'motor de automatización'],
  ['Delegación temporal de funciones', 'governance', 'high', 'medium', 'roles con caducidad'],
  ['Protección contra abuso coordinado', 'security', 'critical', 'advanced', 'señales de comportamiento'],
  ['Copiloto de respuesta contextual', 'ai', 'high', 'advanced', 'base de conocimiento'],
  ['Pronóstico de capacidad y demanda', 'analytics', 'high', 'advanced', 'series temporales'],
  ['Centro de operaciones por lotes', 'operations', 'high', 'advanced', 'cola transaccional'],
  ['Espacios de trabajo compartidos', 'community', 'medium', 'advanced', 'identidad y permisos'],
  ['Biblioteca multimedia inteligente', 'content', 'medium', 'advanced', 'metadatos multimedia'],
  ['Informes narrativos automáticos', 'reporting', 'medium', 'advanced', 'métricas verificadas'],
  ['Escalado inteligente de avisos', 'notifications', 'high', 'advanced', 'reglas de escalado'],
  ['Continuidad operativa sin conexión', 'resilience', 'critical', 'advanced', 'caché sincronizable'],
  ['Acceso de confianza adaptativa', 'security', 'critical', 'advanced', 'evaluación de riesgo'],
  ['Planificador de campañas comunitarias', 'planning', 'medium', 'medium', 'calendario compartido'],
  ['Detección de intención y contexto', 'ai', 'high', 'advanced', 'clasificador contextual'],
  ['Laboratorio de integraciones', 'developer', 'high', 'advanced', 'entorno de pruebas'],
  ['Bóveda de datos personales', 'privacy', 'critical', 'advanced', 'cifrado y consentimiento'],
  ['Interfaz de lectura fácil', 'accessibility', 'high', 'medium', 'perfiles de accesibilidad'],
  ['Continuidad de sesión multidispositivo', 'integrations', 'high', 'advanced', 'sesiones firmadas'],
  ['Curación editorial asistida', 'content', 'medium', 'advanced', 'señales de relevancia'],
  ['Control presupuestario de recursos', 'operations', 'high', 'advanced', 'cuotas y costes'],
  ['Sistema de reputación transparente', 'community', 'high', 'advanced', 'historial auditable'],
  ['Localización cultural automática', 'i18n', 'high', 'advanced', 'reglas regionales'],
  ['Centro de preferencias de comunicación', 'notifications', 'medium', 'medium', 'perfiles de usuario'],
  ['Recorridos personalizados de incorporación', 'ux', 'high', 'medium', 'segmentación funcional'],
  ['Gobernanza mediante propuestas y votos', 'governance', 'medium', 'advanced', 'identidad verificable'],
  ['Control por voz accesible', 'accessibility', 'medium', 'advanced', 'reconocimiento de voz'],
  ['Puente de datos federado', 'integrations', 'high', 'advanced', 'API federada'],
  ['Automatización por eventos externos', 'automation', 'high', 'advanced', 'webhooks firmados'],
  ['Gemelo digital operativo', 'analytics', 'medium', 'advanced', 'modelo de simulación'],
];

const difficultyCycle = ['easy', 'medium', 'advanced'];
const mojibake = new Map([
  ['ÃƒÂ¡', 'á'], ['ÃƒÂ©', 'é'], ['ÃƒÂ­', 'í'], ['ÃƒÂ³', 'ó'], ['ÃƒÂº', 'ú'], ['ÃƒÂ±', 'ñ'],
  ['Ã¡', 'á'], ['Ã©', 'é'], ['Ã­', 'í'], ['Ã³', 'ó'], ['Ãº', 'ú'], ['Ã±', 'ñ'], ['Â', ''],
]);
const cleanText = (value) => {
  let result = value;
  for (const [broken, fixed] of mojibake) result = result.split(broken).join(fixed);
  return result;
};
const implementedEvidence = new Map([
  ['future-0003', ['apps/web/src/components/AccountHorizonTools.jsx']],
  ['future-0004', ['apps/web/src/components/AccountHorizonTools.jsx']],
  ['future-0006', ['apps/web/src/components/AccountHorizonTools.jsx', 'apps/api/src/routes/moonbot-admin.js']],
  ['future-0007', ['apps/web/src/components/AccountHorizonTools.jsx', 'apps/api/src/routes/moonbot-admin.js']],
  ['future-0008', ['apps/web/src/components/AccountHorizonTools.jsx', 'apps/api/src/routes/moonbot-admin.js']],
  ['future-0010', ['apps/web/src/components/AccountHorizonTools.jsx']],
  ['future-0011', ['apps/web/src/components/AccountHorizonTools.jsx', 'apps/api/src/routes/moonbot-admin.js']],
  ['future-0012', ['apps/web/src/components/AccountHorizonTools.jsx']],
  ['future-0013', ['apps/web/src/components/AccountHorizonTools.jsx', 'apps/api/src/routes/moonbot-admin.js']],
  ['future-0015', ['apps/web/src/lib/accountPrivacy.js', 'apps/web/src/pages/SettingsPage.jsx', 'apps/web/src/components/CreatorAccountProxyManager.jsx']],
  ['future-0016', ['apps/web/src/components/AccountHorizonTools.jsx']],
  ['future-1133', ['apps/web/src/components/MoonbotGroupsManager.jsx', 'core/routes_public.py']],
  ['future-1437', ['core/routes_public.py']],
  ['future-1710', ['web/hub.html', 'core/routes_public.py']],
  // Auditoría efectiva de cambios sensibles compartida por web, Moonbot y MiniApp.
  ['future-1124', ['apps/web/src/components/MoonbotGroupsManager.jsx', 'group_suite.py', 'core/routes_public.py']],
  ['future-1428', ['group_suite.py', 'core/routes_public.py']],
  ['future-1701', ['web/hub.html', 'group_suite.py', 'core/routes_public.py']],
  // Vista previa e historial de campañas de captcha, equilibrados entre productos.
  ['future-0247', ['apps/web/src/components/MoonbotGroupsManager.jsx']],
  ['future-0248', ['apps/web/src/components/MoonbotGroupsManager.jsx']],
  ['future-0431', ['core/routes_public.py']], ['future-0432', ['core/routes_public.py']],
  ['future-0704', ['web/hub.html']], ['future-0705', ['web/hub.html']],
  // Exenciones granulares y calendario de reverificación en los tres paneles.
  ['future-0251', ['apps/web/src/components/MoonbotGroupsManager.jsx']],
  ['future-0254', ['apps/web/src/components/MoonbotGroupsManager.jsx']],
  ['future-0435', ['core/routes_public.py']], ['future-0438', ['core/routes_public.py']],
  ['future-0708', ['web/hub.html']], ['future-0711', ['web/hub.html']],
  // Control por voz real: navegación web, análisis multimedia Moonbot y acciones rápidas WebApp.
  ['future-2147', ['apps/web/src/components/VoiceNavigation.jsx']],
  ['future-2571', ['core/media_analyzer.py']], ['future-2814', ['web/hub.html']],
  // Bóveda personal cifrada y consentida en privacidad web y perfil WebApp.
  ['future-2197', ['apps/web/src/lib/personalVault.js']],
  ['future-2744', ['apps/web/src/lib/personalVault.js', 'web/hub.html']],
  // Correlación temporal y semántica de incidencias en motor, web y WebApp.
  ['future-2121', ['apps/web/src/components/MoonbotSecurityCenter.jsx']],
  ['future-2365', ['roadmap_engine.py', 'core/routes_public.py']],
  ['future-2938', ['web/hub.html', 'core/routes_public.py']],
  // Automatización RSS por grupo verificada en Moonbot y administración WebApp.
  ['future-0428', ['group_rss.py', 'core/routes_public.py']],
  ['future-0701', ['web/hub.html', 'core/routes_public.py']],
]);
const implemented = new Set(implementedEvidence.keys());
const items = [];
for (const product of products) {
  let index = 0;
  for (const context of product.contexts) {
    for (const [capabilityIndex, [label, category, priority, difficulty, dependency]] of capabilities.entries()) {
      if (index >= product.quota) break;
      const number = items.length + 1;
      items.push({
        id: `future-${String(number).padStart(4, '0')}`,
        product: product.id,
        product_name: product.name,
        category,
        capability_index: capabilityIndex + 1,
        capability: label,
        context,
        title: `${label} para ${context} en ${product.name}`,
        description: `${label} aplicado al Ã¡rea de ${context}, con controles auditables, configuraciÃ³n gradual y una experiencia coherente entre los tres productos.`,
        priority,
        difficulty: difficulty || difficultyCycle[index % difficultyCycle.length],
        dependency,
        status: implemented.has(`future-${String(number).padStart(4, '0')}`) ? 'implemented' : 'scaffolded',
      });
      index += 1;
    }
    if (index >= product.quota) break;
  }
}

for (const product of products) {
  let index = 0;
  for (const context of product.contexts) {
    for (const [capabilityIndex, [label, category, priority, difficulty, dependency]] of completedCapabilities.entries()) {
      if (index >= product.quota) break;
      const number = items.length + 1;
      items.push({
        id: `future-${String(number).padStart(4, '0')}`,
        product: product.id,
        product_name: product.name,
        category,
        capability_index: capabilities.length + capabilityIndex + 1,
        capability: label,
        context,
        title: `${label} para ${context} en ${product.name}`,
        description: `${label} aplicado al área de ${context}. Su definición funcional en el roadmap está completada; su implementación técnica se valida por separado.`,
        priority,
        difficulty,
        dependency,
        status: implemented.has(`future-${String(number).padStart(4, '0')}`) ? 'implemented' : 'specified',
      });
      index += 1;
    }
    if (index >= product.quota) break;
  }
}

for (const product of products) {
  let index = 0;
  for (const context of product.contexts) {
    for (const [capabilityIndex, [label, category, priority, difficulty, dependency]] of nextCapabilities.entries()) {
      if (index >= product.quota) break;
      const number = items.length + 1;
      items.push({
        id: `future-${String(number).padStart(4, '0')}`,
        product: product.id,
        product_name: product.name,
        category,
        capability_index: capabilities.length + completedCapabilities.length + capabilityIndex + 1,
        capability: label,
        context,
        title: `${label} para ${context} en ${product.name}`,
        description: `${label} aplicado al área de ${context}, con alcance verificable, privacidad por defecto y paridad funcional entre productos.`,
        priority,
        difficulty,
        dependency,
        status: implemented.has(`future-${String(number).padStart(4, '0')}`) ? 'implemented' : 'proposed',
      });
      index += 1;
    }
    if (index >= product.quota) break;
  }
}

if (items.length !== 3000) throw new Error(`Se esperaban 3000 funciones y se generaron ${items.length}`);
const catalog = {
  version: 'Roadmap',
  generated_at: new Date().toISOString(),
  status: 'in_progress',
  implemented: items.filter((item) => item.status === 'implemented').length,
  scaffolded: items.filter((item) => item.status === 'scaffolded').length,
  specified: items.filter((item) => item.status === 'specified').length,
  proposed: items.filter((item) => item.status === 'proposed').length,
  remaining_real: items.filter((item) => item.status !== 'implemented').length,
  verified_percent: Number((items.filter((item) => item.status === 'implemented').length * 100 / items.length).toFixed(2)),
  totals: Object.fromEntries(products.map((product) => [product.id, product.quota * 3])),
  total: items.length,
  items,
};
for (const item of catalog.items) {
  for (const key of ['product_name', 'capability', 'context', 'title', 'description', 'dependency']) {
    item[key] = cleanText(item[key]);
  }
  item.evidence = implementedEvidence.get(item.id) || [];
  item.completion_state = item.status === 'implemented'
    ? 'implemented'
    : item.status === 'scaffolded' ? 'partial' : 'not_implemented';
}
catalog.completion = {
  implemented: catalog.items.filter((item) => item.completion_state === 'implemented').length,
  partial: catalog.items.filter((item) => item.completion_state === 'partial').length,
  not_implemented: catalog.items.filter((item) => item.completion_state === 'not_implemented').length,
};
catalog.data_quality = {
  unique_ids: new Set(catalog.items.map((item) => item.id)).size,
  duplicate_ids: catalog.items.length - new Set(catalog.items.map((item) => item.id)).size,
  implemented_without_evidence: catalog.items.filter((item) => item.status === 'implemented' && !item.evidence.length).length,
  encoding_errors: catalog.items.filter((item) => /[ÃÂ]/.test(`${item.title} ${item.description} ${item.dependency}`)).length,
  verified_at: catalog.generated_at,
};
const output = process.argv[2] ? path.resolve(process.argv[2]) : path.join(root, 'public', 'future-features-1000.json');
fs.writeFileSync(output, `${JSON.stringify(catalog, null, 2)}\n`, 'utf8');
console.log(`CatÃ¡logo generado: ${items.length} propuestas`);
