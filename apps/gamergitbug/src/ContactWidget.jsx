import React, { useRef, useState } from 'react';
import { CONTACT_BOT, TELEGRAM_CONTACT_URL } from './contact.js';

export default function ContactWidget() {
  const [open, setOpen] = useState(false);
  const toggle = useRef(null);
  return <aside className="contact-widget" aria-label="Contacto por Telegram" onKeyDown={event => {
    if (event.key === 'Escape') { setOpen(false); toggle.current?.focus(); }
  }}>
    {open && <section id="telegram-contact-card" className="contact-widget-card" aria-labelledby="telegram-contact-title">
      <h2 id="telegram-contact-title">Hablemos de tu proyecto</h2>
      <p>Contacto oficial de GamerGitBug mediante <strong>@{CONTACT_BOT}</strong>.</p>
      <p>Abre el bot y pulsa Iniciar: se activará el contacto de GamerGitBug. Escribe tu consulta en el siguiente mensaje. El bot mantiene todas sus demás funciones.</p>
      <a className="button primary" href={TELEGRAM_CONTACT_URL} target="_blank" rel="noopener noreferrer">Abrir @{CONTACT_BOT} ↗</a>
      <small>Se abrirá Telegram con el comando /start gamergitbug_contact. Puedes salir con /cancelar_contacto. Evita compartir contraseñas o datos sensibles.</small>
      <a href="mailto:hello@gamergitbug.com">También puedes escribir por correo</a>
    </section>}
    <button ref={toggle} className="button primary contact-widget-toggle" type="button" aria-expanded={open} aria-controls="telegram-contact-card" onClick={() => setOpen(value => !value)}>{open ? 'Cerrar contacto ×' : 'Contactar · Telegram'}</button>
  </aside>;
}
