export const recommendedContent = [
  {
    id: 'recommended-news',
    title: 'Noticias Web3',
    description: 'Actualidad tecnológica, inteligencia artificial, seguridad y cultura digital.',
    url: '/noticias',
    label: 'Leer noticias',
    icon: 'NW3',
    accent: '#1473e6',
    slots: ['home-after-content', 'sidebar'],
    enabled: true,
  },
  {
    id: 'recommended-telegram',
    title: 'TodoSobreAllTech',
    description: 'El canal oficial con publicaciones breves y novedades de la comunidad.',
    url: 'https://t.me/todosobrealltech',
    label: 'Abrir Telegram',
    icon: '✈',
    accent: '#229ed9',
    slots: ['home-after-content', 'news-inline', 'sidebar'],
    enabled: true,
  },
  {
    id: 'recommended-proxies',
    title: 'Proxies MTProto',
    description: 'Consulta proxies comunitarios y recursos para mejorar la conectividad con Telegram.',
    url: 'https://proxy.todosobreall.tech/',
    label: 'Ver proxies',
    icon: 'PX',
    accent: '#059669',
    slots: ['home-after-content', 'news-inline'],
    enabled: true,
  },
  {
    id: 'recommended-resistance',
    title: 'Resistencia a la censura',
    description: 'Herramientas, información y proyectos para mantener Internet accesible.',
    url: 'https://resistenciaalacensura.todosobreall.tech/',
    label: 'Abrir proyecto',
    icon: 'RC',
    accent: '#7c3aed',
    slots: ['home-after-content', 'news-inline'],
    enabled: true,
  },
];

export const recommendationsFor = (slot) => recommendedContent
  .filter((item) => item.enabled !== false && item.slots.includes(slot));
