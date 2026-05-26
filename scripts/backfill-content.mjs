#!/usr/bin/env node
/**
 * backfill-content.mjs
 * --------------------
 * Enriquece artículos antiguos de nw3_noticias cuyo `contenido` es demasiado
 * corto (típicamente un extracto del feed) descargando el cuerpo completo desde
 * su `fuente_url`.
 *
 * Para cada artículo con `contenido` de menos de MIN_LEN (300) caracteres y
 * `fuente_url` no vacío:
 *   1. Descarga la página fuente y extrae el texto principal (fetchArticleContent).
 *   2. Recalcula la categoría (detectCategory) sobre el texto completo.
 *   3. Recalcula los hashtags (buildHashtagsFromContent) sobre el texto completo.
 *   4. Reescribe el cuerpo (rewriteText) y actualiza el registro en PocketBase.
 *
 * Solo se actualiza cuando la extracción tiene éxito (≥200 caracteres) y el nuevo
 * contenido es más largo que el actual, para no degradar artículos ya razonables.
 *
 * Reutiliza la misma lógica que el job rssAutoPublisher (sin duplicarla) y el
 * cliente PocketBase del backend (autenticación automática con el superusuario).
 *
 * Uso (desde la raíz del repo):
 *   node scripts/backfill-content.mjs            # dry-run: solo informa, NO escribe
 *   node scripts/backfill-content.mjs --apply    # aplica las actualizaciones en PocketBase
 *   node scripts/backfill-content.mjs --apply --limit 50   # tope de artículos a procesar
 *
 * Variables de entorno (en el .env de la raíz del repo, leídas por pocketbaseClient):
 *   POCKETBASE_HOST        — URL de PocketBase (default: http://localhost:8090)
 *   PB_SUPERUSER_EMAIL     — email del superusuario PocketBase
 *   PB_SUPERUSER_PASSWORD  — contraseña del superusuario PocketBase
 */

import { pocketbaseClient } from '../apps/api/src/utils/pocketbaseClient.js';
import {
  fetchArticleContent,
  detectCategory,
  buildHashtagsFromContent,
} from '../apps/api/src/utils/rssAutoPublisher.js';
import { rewriteText } from '../apps/api/src/utils/textRewriter.js';

// ── Config ────────────────────────────────────────────────────────────────────
const APPLY = process.argv.includes('--apply');
const MIN_LEN = 300;            // umbral: artículos con menos de 300 caracteres de contenido
const FETCH_DELAY_MS = 600;     // pausa entre descargas de páginas fuente (cortesía)

// --limit N: tope opcional de artículos a procesar en esta ejecución.
function parseLimit() {
  const i = process.argv.indexOf('--limit');
  if (i === -1) return Infinity;
  const n = Number(process.argv[i + 1]);
  return Number.isFinite(n) && n > 0 ? n : Infinity;
}
const LIMIT = parseLimit();

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// ── Main ──────────────────────────────────────────────────────────────────────
async function main() {
  console.log(APPLY
    ? '⚙️  Modo APPLY: se actualizarán los artículos en PocketBase.'
    : '🔍 Modo dry-run: solo informa, no escribe (usa --apply para actualizar).');

  // PocketBase filtra por fuente_url no vacío; el corte por longitud de contenido
  // se hace en JS (el operador de longitud no está disponible en el filtro).
  const candidates = await pocketbaseClient.collection('nw3_noticias').getFullList({
    filter: 'fuente_url != ""',
    sort: '-created',
  });
  const targets = candidates.filter((r) => (r.contenido || '').length < MIN_LEN);

  console.log(`📚 ${candidates.length} artículos con fuente_url; ${targets.length} con contenido < ${MIN_LEN} caracteres.\n`);

  const stats = { scanned: 0, fetched: 0, updated: 0, skipped: 0, errors: 0 };

  for (const record of targets) {
    if (stats.scanned >= LIMIT) break;
    stats.scanned++;

    let fullContent = '';
    try {
      fullContent = await fetchArticleContent(record.fuente_url);
    } catch (err) {
      stats.errors++;
      console.log(`  ✗ error al descargar ${record.fuente_url}: ${err.message}`);
      continue;
    }
    await sleep(FETCH_DELAY_MS);

    if (!fullContent) {
      stats.skipped++;
      console.log(`  ⚠️  ${record.slug}: no se pudo extraer contenido suficiente de ${record.fuente_url}`);
      continue;
    }
    stats.fetched++;

    const categoria = detectCategory(`${record.titulo} ${fullContent}`, record.categoria);
    const hashtags = buildHashtagsFromContent(categoria, `${record.titulo}\n${fullContent}`);
    const contenido = `${rewriteText(fullContent, categoria)}\n\n${hashtags}`;

    // No degradar artículos ya razonables: solo actualizar si el nuevo cuerpo es más largo.
    if (contenido.length <= (record.contenido || '').length) {
      stats.skipped++;
      console.log(`  ⏭️  ${record.slug}: el contenido extraído no mejora el actual (${contenido.length} ≤ ${(record.contenido || '').length}).`);
      continue;
    }

    const catChanged = categoria !== record.categoria ? `  categoría: ${record.categoria || '—'} → ${categoria}` : '';
    console.log(`\n🔧 ${record.slug}  (${(record.contenido || '').length} → ${contenido.length} caracteres)${catChanged}`);
    console.log(`   hashtags: ${hashtags}`);

    if (!APPLY) continue;

    try {
      await pocketbaseClient.collection('nw3_noticias').update(record.id, { categoria, contenido });
      stats.updated++;
      console.log('   ✓ actualizado');
    } catch (err) {
      stats.errors++;
      console.log(`   ✗ error al actualizar: ${err.message}`);
    }
  }

  console.log('\n──────── RESUMEN ────────');
  console.log(`Artículos candidatos:           ${targets.length}`);
  console.log(`Procesados:                     ${stats.scanned}`);
  console.log(`Con contenido extraído:         ${stats.fetched}`);
  console.log(`Omitidos (sin/insuf. mejora):   ${stats.skipped}`);
  if (APPLY) {
    console.log(`Actualizados:                   ${stats.updated}`);
    console.log(`Errores:                        ${stats.errors}`);
  } else {
    console.log('(dry-run: ninguno actualizado — ejecuta con --apply para aplicar)');
  }
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Fatal:', err);
    process.exit(1);
  });
