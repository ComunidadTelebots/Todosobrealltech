import React from 'react';
import { Cookie } from 'lucide-react';
import LegalDocument from '@/components/LegalDocument.jsx';
import { Button } from '@/components/ui/button';
import { useAnalytics } from '@/contexts/AnalyticsProvider.jsx';

export default function CookiePolicyPage() {
  const { openCookieModal } = useAnalytics();
  return <LegalDocument title="Política de cookies" description="Información y preferencias sobre las cookies de TodoSobreAllTech." icon={Cookie}>
    <section><h2>1. Qué son las cookies</h2><p>Las cookies y el almacenamiento local permiten recordar información en tu navegador. Esta política explica qué categorías utiliza la web principal y cómo puedes controlarlas.</p></section>
    <section><h2>2. Almacenamiento esencial</h2><p>Se utiliza para funciones solicitadas por ti, como sesión, seguridad, idioma, tema, preferencias y conservación de tu elección de consentimiento. Es necesario para el funcionamiento básico y no se usa para crear perfiles publicitarios.</p></section>
    <section><h2>3. Analítica</h2><p>Con tu consentimiento, Google Analytics puede medir páginas visitadas, eventos técnicos, dispositivo aproximado y rendimiento. La web mantiene la analítica desactivada antes del consentimiento en las regiones donde este es obligatorio.</p></section>
    <section><h2>4. Publicidad</h2><p>Google AdSense puede almacenar o acceder a identificadores cuando la legislación y tu elección lo permitan. Los anuncios propios de la comunidad se sirven desde nuestra infraestructura; medimos impresiones, emplazamiento y clics, sin necesitar crear un perfil personal para seleccionar la campaña.</p></section>
    <section><h2>5. Terceros y duración</h2><p>La duración depende de cada proveedor y de la configuración del navegador. Los servicios enlazados, Telegram y páginas externas pueden aplicar políticas independientes. Puedes borrar las cookies desde tu navegador en cualquier momento.</p></section>
    <section><h2>6. Gestionar preferencias</h2><p>Puedes aceptar o rechazar las categorías opcionales y cambiar tu decisión posteriormente.</p><Button type="button" variant="outline" onClick={openCookieModal}><Cookie className="mr-2 h-4 w-4" />Configurar cookies</Button></section>
    <section><h2>7. Contacto</h2><p>Consultas sobre cookies y privacidad: <a href="mailto:privacy@todosobrealltech.com">privacy@todosobrealltech.com</a>.</p></section>
  </LegalDocument>;
}
