import React from 'react';
import { FileText } from 'lucide-react';
import LegalDocument from '@/components/LegalDocument.jsx';

export default function TermsPage() {
  return <LegalDocument title="Términos del servicio" description="Condiciones de uso de TodoSobreAllTech y sus servicios comunitarios." icon={FileText}>
    <section><h2>1. Ámbito y aceptación</h2><p>Estos términos regulan el acceso a TodoSobreAllTech, sus paneles, noticias, directorios, proxies, bots, Mini Apps y demás herramientas asociadas. Al utilizar el servicio aceptas estas condiciones y las políticas de privacidad y cookies.</p></section>
    <section><h2>2. Naturaleza del proyecto</h2><p>TodoSobreAllTech es un proyecto comunitario <strong>gratuito y sin ánimo de lucro</strong>. No se garantiza que todas las funciones estén disponibles permanentemente ni que sean adecuadas para una finalidad concreta.</p></section>
    <section><h2>3. Cuentas y seguridad</h2><ul><li>Debes facilitar información legítima y proteger tus credenciales.</li><li>No puedes suplantar identidades, eludir controles de acceso ni utilizar cuentas automatizadas sin autorización.</li><li>Podemos limitar, congelar o cerrar cuentas ante abuso, riesgo técnico o incumplimiento, con posibilidad de revisión cuando corresponda.</li></ul></section>
    <section><h2>4. Bots, grupos y moderación</h2><p>Los administradores que incorporan nuestros bots autorizan únicamente las acciones permitidas por Telegram y por la configuración del grupo. Las decisiones automáticas —como captcha, silencios o filtros antispam— pueden revisarse y apelarse. El administrador del grupo continúa siendo responsable de sus reglas y decisiones finales.</p></section>
    <section><h2>5. Uso permitido</h2><p>No se permite emplear el servicio para spam, fraude, acoso, explotación infantil, terrorismo, malware, evasión de bloqueos legítimos, extracción masiva de datos, ataques, vulneración de derechos o cualquier actividad ilegal. Tampoco está permitido interferir con la infraestructura o superar deliberadamente sus límites.</p></section>
    <section><h2>6. Contenido y propiedad intelectual</h2><p>Conservas los derechos sobre el contenido que aportes. Nos concedes únicamente los permisos técnicos necesarios para alojarlo, procesarlo, moderarlo y mostrarlo en las funciones solicitadas. Los contenidos de terceros conservan sus licencias y atribuciones originales.</p></section>
    <section><h2>7. Servicios externos</h2><p>Telegram, Google, PocketBase, fuentes RSS, CAS, VirusTotal y otros servicios externos se rigen por sus propias condiciones. No controlamos su disponibilidad, sus decisiones ni los cambios de sus API.</p></section>
    <section><h2>8. Disponibilidad y responsabilidad</h2><p>Procuramos mantener un servicio seguro y correcto, pero puede haber interrupciones, errores o resultados automáticos inexactos. Nada de lo publicado constituye asesoramiento profesional. En la medida permitida por la ley, no respondemos por daños indirectos derivados del uso indebido o de servicios externos.</p></section>
    <section><h2>9. Cambios y finalización</h2><p>Podemos actualizar funciones y condiciones por motivos legales, técnicos o de seguridad. Los cambios relevantes se publicarán en esta página. Puedes dejar de usar el servicio y solicitar la eliminación de tu cuenta y datos cuando sea aplicable.</p></section>
    <section><h2>10. Contacto</h2><p>Consultas sobre estas condiciones: <a href="mailto:legal@todosobrealltech.com">legal@todosobrealltech.com</a>.</p></section>
  </LegalDocument>;
}
