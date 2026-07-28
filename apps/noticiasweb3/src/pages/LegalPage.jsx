import { Link } from 'react-router-dom';

const updatedAt = '28 de julio de 2026';
const documents = {
  terms: { title: 'Términos de servicio', intro: 'Estos términos regulan el acceso y uso de NoticiasWeb3, un servicio informativo comunitario, gratuito y sin ánimo de lucro de TodoSobreAllTech.', sections: [
    ['Uso del servicio', 'Puedes consultar y compartir el contenido para fines lícitos. No puedes intentar dañar el servicio, eludir sus medidas de seguridad, suplantar identidades ni utilizarlo para difundir contenido ilegal.'],
    ['Contenido e información', 'Las noticias tienen carácter informativo y pueden contener enlaces a terceros. No constituyen asesoramiento profesional, financiero, jurídico o de seguridad. Procuramos corregir errores cuando son detectados.'],
    ['Cuentas y aportaciones', 'Eres responsable de la actividad de tu cuenta y de que tus aportaciones respeten la ley y los derechos de terceros. Podemos moderar o retirar contenido abusivo.'],
    ['Disponibilidad', 'El servicio se ofrece tal como está y puede cambiar o interrumpirse por mantenimiento, seguridad o causas técnicas.'],
    ['Contacto', 'Para consultas sobre estos términos puedes escribir a info@todosobrealltech.com.'],
  ] },
  privacy: { title: 'Política de privacidad', intro: 'Esta política explica qué datos puede tratar NoticiasWeb3 y con qué finalidad.', sections: [
    ['Datos tratados', 'Podemos tratar datos técnicos necesarios para servir la web, preferencias guardadas en tu navegador, datos facilitados voluntariamente y datos de cuenta cuando inicies sesión.'],
    ['Finalidades', 'Usamos esos datos para prestar y proteger el servicio, recordar preferencias, atender solicitudes, moderar aportaciones y obtener estadísticas cuando exista consentimiento.'],
    ['Publicidad y analítica', 'La web puede mostrar anuncios propios y Google AdSense. Google Analytics y los servicios publicitarios reciben solo el almacenamiento permitido por tu consentimiento y la normativa aplicable.'],
    ['Conservación y terceros', 'Conservamos los datos durante el tiempo necesario para su finalidad y obligaciones legales. Los enlaces externos aplican sus propias políticas.'],
    ['Tus derechos', 'Puedes solicitar acceso, rectificación, supresión, oposición, limitación o portabilidad escribiendo a privacy@todosobrealltech.com.'],
  ] },
  cookies: { title: 'Política de cookies', intro: 'NoticiasWeb3 utiliza almacenamiento local y, si lo autorizas, cookies o tecnologías similares.', sections: [
    ['Necesarias', 'Permiten funciones esenciales, seguridad y conservación de preferencias de versión, plataforma, apariencia y consentimiento.'],
    ['Analítica', 'Google Analytics puede medir visitas y uso agregado cuando hayas dado permiso en las regiones donde sea obligatorio.'],
    ['Publicidad', 'Google AdSense puede usar identificadores publicitarios conforme a tu consentimiento. Los anuncios propios pueden contabilizar impresiones y clics sin crear perfiles publicitarios de terceros.'],
    ['Control', 'Puedes aceptar, rechazar o cambiar el consentimiento desde el aviso de cookies y borrar el almacenamiento desde la configuración de tu navegador.'],
    ['Más información', 'Para dudas relacionadas con cookies o privacidad escribe a privacy@todosobrealltech.com.'],
  ] },
};

export default function LegalPage({ type }) {
  const document = documents[type] || documents.terms;
  return <main id="main" className="legal-page">
    <h1>{document.title}</h1><p className="legal-updated">Actualizada el {updatedAt}</p><p>{document.intro}</p>
    {document.sections.map(([title, content]) => <section key={title}><h2>{title}</h2><p>{content}</p></section>)}
    <p className="legal-links"><Link to="/terminos">Términos</Link> · <Link to="/privacidad">Privacidad</Link> · <Link to="/cookies">Cookies</Link></p>
  </main>;
}
