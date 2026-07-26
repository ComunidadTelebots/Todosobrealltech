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

const difficultyCycle = ['easy', 'medium', 'advanced'];
const implemented = new Set([
  'future-0001', 'future-0002', 'future-0003', 'future-0004', 'future-0005', 'future-0006',
  'future-0007', 'future-0008', 'future-0009', 'future-0010', 'future-0011', 'future-0012',
  'future-0013', 'future-0014', 'future-0015', 'future-0016', 'future-0017',
  // Vista previa e historial de campañas de captcha, equilibrados entre productos.
  'future-0247', 'future-0248', 'future-0431', 'future-0432', 'future-0704', 'future-0705',
]);
const items = [];
for (const product of products) {
  let index = 0;
  for (const context of product.contexts) {
    for (const [label, category, priority, difficulty, dependency] of capabilities) {
      if (index >= product.quota) break;
      const number = items.length + 1;
      items.push({
        id: `future-${String(number).padStart(4, '0')}`,
        product: product.id,
        product_name: product.name,
        category,
        title: `${label} para ${context} en ${product.name}`,
        description: `${label} aplicado al Ã¡rea de ${context}, con controles auditables, configuraciÃ³n gradual y una experiencia coherente entre los tres productos.`,
        priority,
        difficulty: difficulty || difficultyCycle[index % difficultyCycle.length],
        dependency,
        status: implemented.has(`future-${String(number).padStart(4, '0')}`) ? 'implemented' : 'proposed',
      });
      index += 1;
    }
    if (index >= product.quota) break;
  }
}

if (items.length !== 1000) throw new Error(`Se esperaban 1000 propuestas y se generaron ${items.length}`);
const catalog = {
  version: 'Horizonte 1000',
  generated_at: new Date().toISOString(),
  status: 'in_progress',
  implemented: items.filter((item) => item.status === 'implemented').length,
  totals: Object.fromEntries(products.map((product) => [product.id, product.quota])),
  total: items.length,
  items,
};
const output = process.argv[2] ? path.resolve(process.argv[2]) : path.join(root, 'public', 'future-features-1000.json');
fs.writeFileSync(output, `${JSON.stringify(catalog, null, 2)}\n`, 'utf8');
console.log(`CatÃ¡logo generado: ${items.length} propuestas`);
