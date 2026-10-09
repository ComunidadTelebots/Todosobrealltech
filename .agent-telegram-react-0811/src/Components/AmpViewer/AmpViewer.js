/*
 * AmpViewer — muestra una página AMP en un visor iframe in-app.
 * Fuente primaria: Google AMP Cache (cdn.ampproject.org)
 * Fuente de respaldo: Cloudflare AMP Cache (amp.cloudflare.com)
 *
 * Modo lectura: extrae el artículo del HTML AMP, lo sanea y lo
 * renderiza como texto nativo sin iframe. El resultado se almacena
 * en AmpCache (LRU, 30 entradas) para aperturas instantáneas.
 */

import React from 'react';
import IconButton from '@material-ui/core/IconButton';
import CircularProgress from '@material-ui/core/CircularProgress';
import Tooltip from '@material-ui/core/Tooltip';
import CloseIcon from '@material-ui/icons/Close';
import OpenInNewIcon from '@material-ui/icons/OpenInNew';
import BrokenImageIcon from '@material-ui/icons/BrokenImage';
import SubjectIcon from '@material-ui/icons/Subject';
import WebIcon from '@material-ui/icons/Web';
import { withTranslation } from 'react-i18next';
import * as AmpCache from '../../Stores/AmpCache';
import { getSafeHttpUrl } from '../../Utils/SafeExternalUrl';
import './AmpViewer.css';

// ── AMP Cache URL builders ────────────────────────────────────────────────────

function encodeAmpDomain(hostname) {
    return hostname.replace(/-/g, '--').replace(/\./g, '-');
}

function buildGoogleAmpUrl(url) {
    try {
        const u = new URL(url);
        if (u.protocol !== 'https:') return null;
        const encoded = encodeAmpDomain(u.hostname);
        return `https://${encoded}.cdn.ampproject.org/c/s/${u.hostname}${u.pathname}${u.search}`;
    } catch {
        return null;
    }
}

function buildCloudflareAmpUrl(url) {
    try {
        const u = new URL(url);
        if (u.protocol !== 'https:') return null;
        const encoded = encodeAmpDomain(u.hostname);
        return `https://${encoded}.amp.cloudflare.com/c/s/${u.hostname}${u.pathname}${u.search}`;
    } catch {
        return null;
    }
}

// ── HTML sanitizer (sin DOMPurify) ────────────────────────────────────────────

const ALLOWED_TAGS = new Set([
    'p',
    'h1',
    'h2',
    'h3',
    'h4',
    'h5',
    'h6',
    'ul',
    'ol',
    'li',
    'strong',
    'b',
    'em',
    'i',
    'u',
    's',
    'del',
    'mark',
    'sup',
    'sub',
    'a',
    'blockquote',
    'q',
    'cite',
    'img',
    'figure',
    'figcaption',
    'picture',
    'code',
    'pre',
    'kbd',
    'samp',
    'br',
    'hr',
    'div',
    'span',
    'section',
    'article',
    'aside',
    'main',
    'table',
    'thead',
    'tbody',
    'tfoot',
    'tr',
    'th',
    'td',
    'caption',
    'time',
    'address',
    'abbr',
    'acronym',
]);

// Atributos seguros por tag (y '*' para todos)
const ALLOWED_ATTRS = {
    a: ['href', 'title'],
    img: ['src', 'alt', 'width', 'height', 'title'],
    time: ['datetime'],
    td: ['colspan', 'rowspan'],
    th: ['colspan', 'rowspan', 'scope'],
    '*': [],
};

function sanitizeNode(srcNode, destParent) {
    for (const child of srcNode.childNodes) {
        if (child.nodeType === Node.TEXT_NODE) {
            destParent.appendChild(document.createTextNode(child.textContent));
            continue;
        }
        if (child.nodeType !== Node.ELEMENT_NODE) continue;

        const srcTag = child.tagName.toLowerCase();
        // amp-img, amp-video, etc. → strip the "amp-" prefix
        const tag = srcTag.startsWith('amp-') ? srcTag.slice(4) : srcTag;

        if (!ALLOWED_TAGS.has(tag)) {
            // Descarta el elemento pero preserva el texto interior
            sanitizeNode(child, destParent);
            continue;
        }

        const el = document.createElement(tag);
        const allowed = [...(ALLOWED_ATTRS[tag] || []), ...(ALLOWED_ATTRS['*'] || [])];

        for (const attr of allowed) {
            // Para amp-img los atributos pueden estar en el nombre original o con data-
            const val = child.getAttribute(attr) ?? child.getAttribute(`data-${attr}`);
            if (!val) continue;
            if (attr === 'href' && /^javascript:/i.test(val.trim())) continue;
            if ((attr === 'src' || attr === 'href') && /^data:/i.test(val.trim())) continue;
            el.setAttribute(attr, val);
        }

        if (tag === 'img') {
            el.style.maxWidth = '100%';
            el.style.height = 'auto';
            el.loading = 'lazy';
        }
        if (tag === 'a') {
            el.setAttribute('target', '_blank');
            el.setAttribute('rel', 'noopener noreferrer');
        }

        sanitizeNode(child, el);
        destParent.appendChild(el);
    }
}

function extractContent(html) {
    const doc = new DOMParser().parseFromString(html, 'text/html');

    // Título
    const title = doc.querySelector('h1')?.textContent?.trim() || doc.querySelector('title')?.textContent?.trim() || '';

    // Zona principal del artículo
    const content =
        doc.querySelector('article') ||
        doc.querySelector('[role="main"]') ||
        doc.querySelector('main') ||
        doc.querySelector('.post-content, .article-content, .entry-content, .story-body') ||
        doc.body;

    // Eliminar ruido antes de sanear
    content
        .querySelectorAll(
            'script, style, noscript, template, ' +
                'amp-analytics, amp-pixel, amp-auto-ads, amp-sidebar, amp-consent, ' +
                'nav, header, footer, ' +
                '[role="navigation"], [role="banner"], [role="complementary"], ' +
                '[class*="nav-"], [class*="-nav"], [class*="menu"], ' +
                '[class*="sidebar"], [class*="related"], [class*="recommend"], ' +
                '[class*="advert"], [class*=" ad-"], [id*="cookie"], [class*="cookie"], ' +
                '[class*="share"], [class*="social"], [class*="comment"]',
        )
        .forEach(el => el.remove());

    const container = document.createElement('div');
    sanitizeNode(content, container);
    return { html: container.innerHTML, title };
}

// ── Fetch helper ──────────────────────────────────────────────────────────────

async function tryFetch(url) {
    const res = await fetch(url, { mode: 'cors', credentials: 'omit' });
    if (!res.ok) throw new Error(`http-${res.status}`);
    return res.text();
}

async function fetchAmpContent(url) {
    const candidates = [
        buildGoogleAmpUrl(url),
        buildCloudflareAmpUrl(url),
        url, // URL original como último recurso
    ].filter(Boolean);

    let lastErr;
    for (const candidate of candidates) {
        try {
            const html = await tryFetch(candidate);
            const content = extractContent(html);
            // Descartar si el cuerpo extraído es demasiado corto (página de error, etc.)
            if (content.html.replace(/<[^>]*>/g, '').trim().length < 100) {
                throw new Error('content-too-short');
            }
            return content;
        } catch (e) {
            lastErr = e;
        }
    }
    throw lastErr || new Error('fetch-failed');
}

// ── Contenido lite (fallback desde datos del mensaje) ────────────────────────

function buildLiteContent(webPage) {
    const { title = '', description = '', site_name = '', url = '' } = webPage;
    // Construir HTML seguro a mano (sin innerHTML de datos externos)
    const parts = [];
    if (site_name) {
        parts.push(`<p class="amp-lite-site">${escapeHtml(site_name)}</p>`);
    }
    if (description) {
        // La descripción puede tener varios párrafos separados por \n
        description.split(/\n{2,}/).forEach(para => {
            const trimmed = para.trim();
            if (trimmed) parts.push(`<p>${escapeHtml(trimmed)}</p>`);
        });
    }
    const safeUrl = getSafeHttpUrl(url);
    if (safeUrl) {
        parts.push(
            `<p class="amp-lite-readmore"><a href="${escapeHtml(
                safeUrl,
            )}" target="_blank" rel="noopener noreferrer">Leer artículo completo →</a></p>`,
        );
    }
    return { html: parts.join('\n'), title, lite: true };
}

function escapeHtml(str) {
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

// ── Constantes ────────────────────────────────────────────────────────────────

const LOAD_TIMEOUT_MS = 15000;
const LS_KEY = 'amp-reader-mode';

// ── Componente ────────────────────────────────────────────────────────────────

class AmpViewer extends React.Component {
    constructor(props) {
        super(props);
        const savedReaderMode = localStorage.getItem(LS_KEY) === '1';
        // Si hay caché para esta URL, el modo lectura ya funcionó antes.
        const cachedContent = AmpCache.get(props.url);
        this.state = {
            // Modo iframe
            loading: true,
            error: false,
            useFallback: false,
            // Modo lectura
            readerMode: savedReaderMode && !!cachedContent,
            readerLoading: false,
            // null = aún no intentado, true = disponible, false = no disponible (ocultar botón)
            readerSupported: cachedContent ? true : null,
            readerContent: cachedContent || null,
        };
        this.iframeRef = React.createRef();
        this._errorTimer = null;
        this._mounted = false;
    }

    componentDidMount() {
        this._mounted = true;
        document.body.style.overflow = 'hidden';
        document.addEventListener('keydown', this.onKeyDown);

        if (this.state.readerMode) {
            // El contenido ya está en el estado desde el constructor (caché).
            // No llamar a _loadReaderContent para evitar doble lectura del caché.
        } else {
            this._startTimer();
            window.addEventListener('message', this.onMessage);
        }
    }

    componentWillUnmount() {
        this._mounted = false;
        document.body.style.overflow = '';
        clearTimeout(this._errorTimer);
        window.removeEventListener('message', this.onMessage);
        document.removeEventListener('keydown', this.onKeyDown);
    }

    // ── Iframe ────────────────────────────────────────────────────────────────

    _startTimer() {
        clearTimeout(this._errorTimer);
        this._errorTimer = setTimeout(() => {
            if (!this._mounted) return;
            if (this.state.loading && !this.state.useFallback) {
                this.setState({ loading: true, useFallback: true }, () => {
                    if (this._mounted) this._startTimer();
                });
            } else if (this.state.loading) {
                this.setState({ loading: false, error: true });
            }
        }, LOAD_TIMEOUT_MS);
    }

    onMessage = event => {
        if (event.data && typeof event.data === 'string' && event.data.startsWith('amp-')) {
            clearTimeout(this._errorTimer);
            this.setState({ loading: false, error: false });
        }
    };

    onIframeLoad = () => {
        clearTimeout(this._errorTimer);
        this.setState({ loading: false, error: false });
    };

    // ── Modo lectura ──────────────────────────────────────────────────────────

    _loadReaderContent = async () => {
        const { url } = this.props;

        const cached = AmpCache.get(url);
        if (cached) {
            if (this._mounted) {
                this.setState({ readerContent: cached, readerLoading: false, readerSupported: true });
            }
            return;
        }
        try {
            const content = await fetchAmpContent(url);
            AmpCache.set(url, content);
            if (this._mounted) {
                this.setState({ readerContent: content, readerLoading: false, readerSupported: true });
            }
        } catch {
            if (!this._mounted) return;
            // Fetch fallido — intentar modo lite con datos del mensaje de Telegram
            const { webPage } = this.props;
            if (webPage && (webPage.title || webPage.description)) {
                const liteContent = buildLiteContent(webPage);
                AmpCache.set(url, liteContent);
                this.setState({ readerContent: liteContent, readerLoading: false, readerSupported: true });
            } else {
                // Sin datos de respaldo — ocultar el botón y volver al iframe
                localStorage.removeItem(LS_KEY);
                this.setState(
                    {
                        readerMode: false,
                        readerLoading: false,
                        readerSupported: false,
                        loading: true,
                        error: false,
                        useFallback: false,
                    },
                    () => {
                        if (!this._mounted) return;
                        this._startTimer();
                        window.addEventListener('message', this.onMessage);
                    },
                );
            }
        }
    };

    onToggleReaderMode = () => {
        if (this.state.readerMode) {
            // Volver al iframe
            localStorage.removeItem(LS_KEY);
            this.setState({ readerMode: false, loading: true, error: false, useFallback: false }, () => {
                this._startTimer();
                window.addEventListener('message', this.onMessage);
            });
        } else {
            // Activar modo lectura — readerLoading: true en el mismo setState
            // para evitar un render intermedio con readerMode=true y sin contenido.
            clearTimeout(this._errorTimer);
            window.removeEventListener('message', this.onMessage);
            localStorage.setItem(LS_KEY, '1');
            this.setState({ readerMode: true, readerLoading: true }, this._loadReaderContent);
        }
    };

    // ── Común ─────────────────────────────────────────────────────────────────

    onKeyDown = e => {
        if (e.key === 'Escape') this.props.onClose();
    };

    onOpenExternal = () => {
        const { url } = this.props;
        const safeUrl = getSafeHttpUrl(url);
        if (safeUrl) window.open(safeUrl, '_blank', 'noopener,noreferrer');
        this.props.onClose();
    };

    onBackdropClick = e => {
        if (e.target === e.currentTarget) this.props.onClose();
    };

    // ── Render ────────────────────────────────────────────────────────────────

    renderIframeBody() {
        const { url, t } = this.props;
        const { loading, error, useFallback } = this.state;
        const ampUrl = useFallback ? buildCloudflareAmpUrl(url) || url : buildGoogleAmpUrl(url) || url;

        return (
            <>
                {loading && (
                    <div className='amp-viewer-loading'>
                        <CircularProgress size={32} />
                    </div>
                )}
                {error ? (
                    <div className='amp-viewer-error'>
                        <BrokenImageIcon fontSize='large' />
                        <p>{t('AmpNotAvailable', 'Esta página no tiene versión AMP.')}</p>
                        <button className='amp-viewer-open-btn' onClick={this.onOpenExternal}>
                            {t('OpenInBrowser', 'Abrir en navegador')}
                        </button>
                    </div>
                ) : (
                    <iframe
                        key={useFallback ? 'fallback' : 'primary'}
                        ref={this.iframeRef}
                        className='amp-viewer-iframe'
                        src={ampUrl}
                        title='AMP Preview'
                        onLoad={this.onIframeLoad}
                        sandbox='allow-same-origin allow-scripts allow-forms allow-popups allow-popups-to-escape-sandbox allow-presentation allow-top-navigation-by-user-activation allow-modals'
                        referrerPolicy='no-referrer'
                    />
                )}
            </>
        );
    }

    renderReaderBody() {
        const { readerLoading, readerContent } = this.state;

        if (readerLoading || !readerContent) {
            return (
                <div className='amp-viewer-loading'>
                    <CircularProgress size={32} />
                </div>
            );
        }

        return (
            <div className='amp-reader-content'>
                {readerContent.title && <h1 className='amp-reader-title'>{readerContent.title}</h1>}
                <div className='amp-reader-body' dangerouslySetInnerHTML={{ __html: readerContent.html }} />
            </div>
        );
    }

    render() {
        const { url, onClose, t } = this.props;
        const { readerMode, readerSupported, readerContent } = this.state;

        let hostname = '';
        try {
            hostname = new URL(url).hostname;
        } catch {}

        const readerTooltip = readerMode
            ? t('AmpShowIframe', 'Mostrar versión AMP')
            : t('AmpReaderMode', 'Modo lectura');

        // Mostrar botón solo si el modo lectura aún no ha fallado
        const showReaderBtn = readerSupported !== false;

        return (
            <div className='amp-viewer' onClick={this.onBackdropClick} style={{ touchAction: 'none' }}>
                <div className='amp-viewer-container' onClick={e => e.stopPropagation()}>
                    <div className='amp-viewer-header'>
                        <div className='amp-viewer-title'>
                            <span className='amp-viewer-badge'>
                                {readerMode ? (readerContent?.lite ? 'VISTA' : 'LEER') : 'AMP'}
                            </span>
                            <span className='amp-viewer-origin'>{hostname}</span>
                        </div>
                        <div className='amp-viewer-actions'>
                            {showReaderBtn && (
                                <Tooltip title={readerTooltip}>
                                    <IconButton
                                        size='small'
                                        onClick={this.onToggleReaderMode}
                                        className={readerMode ? 'amp-reader-btn-active' : ''}>
                                        {readerMode ? <WebIcon fontSize='small' /> : <SubjectIcon fontSize='small' />}
                                    </IconButton>
                                </Tooltip>
                            )}
                            <Tooltip title={t('OpenInBrowser', 'Abrir en navegador')}>
                                <IconButton size='small' onClick={this.onOpenExternal}>
                                    <OpenInNewIcon fontSize='small' />
                                </IconButton>
                            </Tooltip>
                            <Tooltip title={t('Close', 'Cerrar')}>
                                <IconButton size='small' onClick={onClose}>
                                    <CloseIcon fontSize='small' />
                                </IconButton>
                            </Tooltip>
                        </div>
                    </div>

                    <div className='amp-viewer-body'>
                        {readerMode ? this.renderReaderBody() : this.renderIframeBody()}
                    </div>
                </div>
            </div>
        );
    }
}

export default withTranslation()(AmpViewer);
