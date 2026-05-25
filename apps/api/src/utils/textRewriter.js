/**
 * textRewriter
 * ------------
 * Reescribe un texto dándole "voz propia" SIN usar ninguna API externa: todo el
 * trabajo es local y determinista. Pensado para transformar el extracto crudo de
 * un feed RSS en un cuerpo de artículo algo más original antes de guardarlo.
 *
 * Pipeline de rewriteText(text, category):
 *   1. Limpia URLs sueltas, emails y marcas de truncado ("…", "...").
 *   2. Divide el texto en frases (por puntos y saltos de línea).
 *   3. Elimina frases repetidas o truncadas (deduplicado con detección de prefijos).
 *   4. Sustituye conectores comunes por sinónimos (además → también, etc.).
 *   5. Reordena algunas frases del medio (no todas, para no romper la coherencia).
 *   6. Antepone una frase introductoria acorde a la categoría.
 *
 * Exporta: rewriteText(text, category)
 */

// ── Conectores → sinónimos ─────────────────────────────────────────────────────
// Mapa de una sola dirección: ningún destino aparece como origen, así que el
// reemplazo en una sola pasada no se "deshace" a sí mismo.
const CONNECTORS = {
  'además': 'también',
  'sin embargo': 'no obstante',
  'porque': 'dado que',
  'por lo tanto': 'en consecuencia',
  'por ejemplo': 'como muestra',
  'es decir': 'en otras palabras',
  'ya que': 'puesto que',
  'debido a': 'a causa de',
  'en cambio': 'por el contrario',
  'aunque': 'si bien',
  'asimismo': 'de igual modo',
  'por su parte': 'a su vez',
  'de hecho': 'en realidad',
  'mientras que': 'en tanto que',
};

// Regex único con todas las claves (más largas primero, para que "por lo tanto"
// gane a un hipotético "por"). \b funciona porque todos los orígenes empiezan y
// acaban en letras ASCII.
const CONNECTOR_KEYS = Object.keys(CONNECTORS).sort((a, b) => b.length - a.length);
const CONNECTOR_RE = new RegExp(`\\b(${CONNECTOR_KEYS.map(escapeRegExp).join('|')})\\b`, 'gi');

// ── Frases introductorias por categoría ────────────────────────────────────────
const CATEGORY_INTROS = {
  'Ciberseguridad': [
    'La seguridad digital vuelve a situarse en el centro de la conversación.',
    'En un escenario de amenazas que no deja de evolucionar, conviene detenerse en lo siguiente.',
  ],
  'IA': [
    'La inteligencia artificial sigue redefiniendo lo que creíamos posible.',
    'El avance de la IA deja una novedad que merece un análisis pausado.',
  ],
  'Tecnología': [
    'El pulso de la innovación tecnológica no se detiene.',
    'La actualidad tecnológica trae novedades que vale la pena repasar.',
  ],
  'Gaming': [
    'El mundo del videojuego suma un nuevo capítulo que dará que hablar.',
    'La industria del gaming vuelve a mover ficha.',
  ],
  'Espacio': [
    'La exploración del cosmos nos regala otra historia fascinante.',
    'Más allá de nuestra atmósfera, la actualidad espacial no descansa.',
  ],
  'Móviles': [
    'El terreno de la movilidad estrena novedades que conviene conocer.',
    'En el bolsillo de millones de usuarios se libra una nueva batalla tecnológica.',
  ],
  'Energía': [
    'La transición energética marca el rumbo de esta noticia.',
    'En el debate sobre el futuro de la energía surge un nuevo episodio.',
  ],
  'Redes Sociales': [
    'Las plataformas que median nuestra vida digital vuelven a ser noticia.',
    'En el ecosistema de las redes sociales se cuece un nuevo movimiento.',
  ],
  'Economía': [
    'Los números vuelven a contar una historia que conviene leer con calma.',
    'La economía del sector tecnológico deja una novedad relevante.',
  ],
  'Salud': [
    'La ciencia aplicada a la salud abre una nueva línea de interés.',
    'En el ámbito de la salud surge un avance que merece atención.',
  ],
  'Ciencia': [
    'La curiosidad científica nos lleva hasta este nuevo hallazgo.',
    'La investigación vuelve a ampliar las fronteras de lo conocido.',
  ],
};
const DEFAULT_INTROS = ['Repasamos a continuación las claves de esta noticia.'];

// ── Helpers ─────────────────────────────────────────────────────────────────────
function escapeRegExp(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// Hash sencillo y determinista (suma de códigos) para elegir variantes sin azar.
function stableHash(str = '') {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = (h + str.charCodeAt(i)) | 0;
  return Math.abs(h);
}

// Si el original empieza en mayúscula, capitaliza también el reemplazo.
function matchCase(original, replacement) {
  const first = original.charAt(0);
  if (first && first === first.toUpperCase() && first !== first.toLowerCase()) {
    return replacement.charAt(0).toUpperCase() + replacement.slice(1);
  }
  return replacement;
}

function capitalize(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

// Asegura que la frase empieza en mayúscula y termina en signo de puntuación.
function tidySentence(str) {
  let s = str.trim().replace(/\s+/g, ' ');
  if (!s) return s;
  s = capitalize(s);
  if (!/[.!?…]$/.test(s)) s += '.';
  return s;
}

// 1. Limpieza de URLs, emails y marcas de truncado.
function clean(text) {
  return text
    .replace(/https?:\/\/\S+/gi, ' ')   // URLs http(s)
    .replace(/\bwww\.\S+/gi, ' ')        // URLs sin esquema
    .replace(/\S+@\S+\.\S+/g, ' ')        // emails sueltos
    .replace(/[…]+|\.{3,}/g, ' ')         // puntos suspensivos de truncado
    .replace(/[ \t]{2,}/g, ' ')
    .trim();
}

// 2. División en frases por puntos (y signos ? !) y saltos de línea.
function splitSentences(text) {
  return text
    .split(/\n+|(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

// Restos de boilerplate del feed: "Más información en …", fuentes, y fragmentos
// colgantes muy cortos que quedan tras quitar una URL (acaban en preposición).
function isNoise(s) {
  const w = s.trim();
  if (!w) return true;
  if (/^(más información|leer más|ver más|seguir leyendo|fuente|vía|via|source|read more)\b/i.test(w)) return true;
  const words = w.split(/\s+/);
  const tail = w.replace(/[.!?…]+$/, '');
  if (words.length <= 3 && /\b(en|a|de|con|para|por|y|o|el|la|los|las|un|una)$/i.test(tail)) return true;
  return false;
}

// Normaliza una frase para comparar duplicados (minúsculas, sin signos).
function normalizeForCompare(str) {
  return str
    .toLowerCase()
    .replace(/[^a-z0-9áéíóúñü ]/gi, '')
    .replace(/\s+/g, ' ')
    .trim();
}

// 3. Deduplicado: descarta frases idénticas y fragmentos que son prefijo de otra
//    (típico de los extractos que repiten el título truncado con "…").
function dedupeSentences(sentences) {
  const kept = [];
  for (const s of sentences) {
    const norm = normalizeForCompare(s);
    if (!norm) continue;
    let redundant = false;
    for (let i = 0; i < kept.length; i++) {
      const kn = normalizeForCompare(kept[i]);
      if (kn === norm || kn.startsWith(norm)) { redundant = true; break; }   // s ya cubierta
      if (norm.startsWith(kn)) { kept[i] = s; redundant = true; break; }      // s es la versión completa
    }
    if (!redundant) kept.push(s);
  }
  return kept;
}

// 4. Sustitución de conectores en una sola pasada.
function replaceConnectors(text) {
  return text.replace(CONNECTOR_RE, (m) => matchCase(m, CONNECTORS[m.toLowerCase()]));
}

// 5. Reordena algunas frases del medio, conservando la primera y la última.
function reorderSentences(sentences) {
  if (sentences.length < 4) return sentences.slice();
  const out = sentences.slice();
  const swap = (i, j) => { [out[i], out[j]] = [out[j], out[i]]; };
  swap(1, 2);                          // un par tras la entradilla
  if (out.length >= 6) swap(3, 4);     // y otro par en textos largos
  return out;                          // la última frase nunca se mueve
}

// 6. Frase introductoria determinista según la categoría.
function introFor(category, seed) {
  const opts = CATEGORY_INTROS[category] || DEFAULT_INTROS;
  return opts[seed % opts.length];
}

/**
 * Reescribe `text` con voz propia para la `category` dada.
 * Si no hay contenido aprovechable, devuelve el texto original sin tocar.
 */
export function rewriteText(text, category) {
  if (!text || !text.trim()) return '';

  const cleaned = clean(text);
  const sentences = dedupeSentences(splitSentences(cleaned).filter((s) => !isNoise(s)));

  // Sin frases utilizables (p. ej. el extracto era solo una URL): devolvemos el
  // texto ya limpio, que en ese caso queda vacío — no reinyectamos la URL.
  if (sentences.length === 0) return cleaned;

  const reordered = reorderSentences(sentences).map((s) => tidySentence(replaceConnectors(s)));
  const intro = tidySentence(introFor(category, stableHash(text)));

  return [intro, ...reordered].join(' ');
}

export default rewriteText;
