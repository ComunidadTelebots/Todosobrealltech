export default function ProxiesPage() {
  return (
    <div id="main">
      <h1>Proxies</h1>

      <div className="article">
        <h2 style={{ color: '#333', fontSize: '16px' }}>¿Qué es un proxy?</h2>
        <div className="article-body">
          <p>
            Un proxy actúa como intermediario entre tu dispositivo e Internet. Al navegar a través de
            un proxy, tu dirección IP real queda oculta y el servidor de destino ve la IP del proxy.
            Esto permite mejorar la privacidad y acceder a contenidos con restricciones geográficas.
          </p>
        </div>
      </div>

      <div className="article" style={{ borderBottom: 'none' }}>
        <h2 style={{ color: '#333', fontSize: '16px' }}>Consejos de uso</h2>
        <div className="article-body">
          <p>
            Para mayor privacidad, considera usar una VPN de confianza en lugar de proxies públicos.
            Los proxies públicos no cifran el tráfico y pueden estar comprometidos. Nunca los uses
            para transmitir datos sensibles como contraseñas o información bancaria.
          </p>
        </div>
      </div>
    </div>
  );
}
