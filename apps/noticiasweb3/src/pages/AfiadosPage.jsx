const affiliates = [
  {
    name: 'Comunidad TeleBots',
    label: 'Comunidad',
    initials: 'CT',
    description: 'Bots, grupos y proyectos de Telegram.',
    href: 'https://t.me/comunidadtelebots?utm_source=noticiasweb3&utm_medium=affiliate',
    color: '#00a7c7',
  },
  {
    name: 'TodoSobreAllTech',
    label: 'Canal oficial',
    initials: 'TA',
    description: 'Tecnologia, IA, Web3 y seguridad.',
    href: 'https://t.me/TodoSobreAllTech?utm_source=noticiasweb3&utm_medium=affiliate',
    color: '#168acd',
  },
  {
    name: 'TodoSobreTelegram',
    label: 'Telegram',
    initials: 'TG',
    description: 'Noticias, recursos y novedades de Telegram.',
    href: 'https://t.me/todosobretelegram?utm_source=noticiasweb3&utm_medium=affiliate',
    color: '#229ed9',
  },
  {
    name: '@todosobretelegram',
    label: 'Instagram',
    initials: 'IG',
    description: 'Contenido visual de TodoSobreTelegram.',
    href: 'https://www.instagram.com/todosobretelegram/?utm_source=noticiasweb3&utm_medium=affiliate',
    color: '#d62976',
  },
];

export default function AfiadosPage() {
  return (
    <div id="main">
      <h1>Afiliados</h1>
      <div className="article-body">
        <aside className="affiliate-disclosure" aria-labelledby="affiliate-disclosure-title">
          <strong id="affiliate-disclosure-title">Aviso de transparencia sobre afiliados</strong>
          <p>
            Los espacios mostrados a continuación no constituyen publicidad remunerada, patrocinio ni una
            recomendación comercial. NoticiasWeb3 no recibe pagos, comisiones, productos, servicios ni ninguna
            otra contraprestación directa o indirecta por su inclusión. Se publican exclusivamente como un
            intercambio recíproco de visibilidad y visitas entre proyectos de la comunidad.
          </p>
          <p>
            Los enlaces se identifican y presentan de forma diferenciada conforme a los principios de
            transparencia y claridad aplicables en la Unión Europea. Cada sitio enlazado es responsable de sus
            propios contenidos, condiciones y tratamiento de datos personales.
          </p>
        </aside>
        <div className="affiliate-grid" aria-label="Afiliados de NoticiasWeb3">
          {affiliates.map((affiliate) => (
            <a
              className="affiliate-banner"
              href={affiliate.href}
              key={affiliate.name}
              rel="noopener noreferrer"
              style={{ '--affiliate-color': affiliate.color }}
              target="_blank"
            >
              <span className="affiliate-banner__icon" aria-hidden="true">{affiliate.initials}</span>
              <span className="affiliate-banner__copy">
                <small>{affiliate.label}</small>
                <strong>{affiliate.name}</strong>
                <span>{affiliate.description}</span>
              </span>
              <span className="affiliate-banner__arrow" aria-hidden="true">&#8599;</span>
            </a>
          ))}
        </div>
      </div>
    </div>
  );
}
