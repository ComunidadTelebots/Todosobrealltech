import { useRef, useEffect } from 'react';

export function getTelegramPost(article) {
  const url = article.telegramUrl
    || (article.externalUrl?.includes('t.me/') ? article.externalUrl : null);
  if (!url) return null;
  const m = url.match(/t\.me\/([^?#]+)/);
  return m ? m[1] : null;
}

export function TelegramEmbed({ post }) {
  const ref = useRef(null);

  useEffect(() => {
    if (!ref.current || !post) return;
    ref.current.innerHTML = '';
    const script = document.createElement('script');
    script.src = 'https://telegram.org/js/telegram-widget.js?23';
    script.setAttribute('data-telegram-post', post);
    script.setAttribute('data-width', '100%');
    script.async = true;
    ref.current.appendChild(script);
    return () => { if (ref.current) ref.current.innerHTML = ''; };
  }, [post]);

  return <div ref={ref} style={{ marginTop: '12px' }} />;
}
