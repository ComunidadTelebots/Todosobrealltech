import { useEffect, useState } from 'react';

export default function Fab({ siteVersion, appPlatform }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const onScroll = () => setVisible(window.scrollY > 300);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  if (siteVersion !== '2026' || appPlatform !== 'android') return null;
  if (!visible) return null;

  return (
    <button
      type="button"
      className="nw3-fab"
      aria-label="Volver arriba"
      onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
    >
      ↑
    </button>
  );
}
