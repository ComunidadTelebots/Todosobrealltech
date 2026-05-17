import { useEffect } from 'react';

const CLIENT = import.meta.env.VITE_ADSENSE_ID;

function loadScript() {
  if (!CLIENT || document.getElementById('adsense-script')) return;

  const meta = document.createElement('meta');
  meta.name = 'google-adsense-account';
  meta.content = CLIENT;
  document.head.appendChild(meta);

  const s = document.createElement('script');
  s.id = 'adsense-script';
  s.async = true;
  s.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${CLIENT}`;
  s.crossOrigin = 'anonymous';
  document.head.appendChild(s);
}

function getPreviewLabel(slot) {
  if (slot === 'SLOT_TOP') return 'Banner superior';
  if (slot === 'SLOT_RIGHT') return 'Lateral derecho';
  if (slot === 'SLOT_INLINE') return 'Entre contenidos';
  return 'Espacio publicitario';
}

export default function AdSense({ slot, style, className = '' }) {
  const hasRealSlot = Boolean(slot && !String(slot).startsWith('SLOT_'));
  const label = getPreviewLabel(slot);

  useEffect(() => {
    if (!CLIENT || !hasRealSlot) return;
    loadScript();
    try {
      (window.adsbygoogle = window.adsbygoogle || []).push({});
    } catch (_) {}
  }, [hasRealSlot]);

  if (!CLIENT || !hasRealSlot) {
    return (
      <div className={`ad-preview ${className}`} style={style} role="complementary" aria-label={label}>
        <span>Publicidad</span>
        <strong>{label}</strong>
        <small>Espacio reservado para Google AdSense o campaña directa</small>
      </div>
    );
  }

  return (
    <div className={`ad-slot ${className}`} style={style} role="complementary" aria-label={label}>
      <div className="ad-preview ad-preview-fallback">
        <span>Publicidad</span>
        <strong>{label}</strong>
        <small>Google AdSense se mostrara aqui cuando entregue anuncio</small>
      </div>
      <ins
        className="adsbygoogle"
        style={{ display: 'block', width: '100%', height: '100%' }}
        data-ad-client={CLIENT}
        data-ad-slot={slot}
        data-ad-format="auto"
        data-full-width-responsive="false"
      />
    </div>
  );
}
