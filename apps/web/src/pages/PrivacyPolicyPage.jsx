
import React from 'react';
import { Helmet } from 'react-helmet';
import { Link } from 'react-router-dom';
import { ArrowLeft, Shield, Cookie, Database, Mail } from 'lucide-react';
import { useAnalytics } from '@/contexts/AnalyticsProvider.jsx';
import { Button } from '@/components/ui/button';

const PrivacyPolicyPage = () => {
  const { openCookieModal } = useAnalytics();

  return (
    <>
      <Helmet>
        <title>Política de Privacidad | Todo sobre alltech</title>
        <meta name="description" content="Nuestra política de privacidad, uso de datos y cookies en cumplimiento con las normativas internacionales de protección de datos (GDPR)." />
      </Helmet>

      <div className="min-h-screen bg-muted/10 py-12">
        <div className="container max-w-4xl mx-auto px-4 sm:px-6">
          <div className="mb-8">
            <Link to="/" className="inline-flex items-center text-sm font-medium text-muted-foreground hover:text-primary transition-colors">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Volver al inicio
            </Link>
          </div>

          <article className="bg-card text-card-foreground rounded-2xl shadow-sm border border-border/50 overflow-hidden">
            <div className="bg-primary/5 border-b p-8 sm:p-12 text-center sm:text-left flex flex-col sm:flex-row items-center gap-6">
              <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center shrink-0 text-primary">
                <Shield className="w-8 h-8" />
              </div>
              <div>
                <h1 className="text-3xl sm:text-4xl font-bold tracking-tight mb-2">Política de Privacidad</h1>
                <p className="text-muted-foreground">Última actualización: {new Date().toLocaleDateString()}</p>
              </div>
            </div>

            <div className="p-8 sm:p-12 space-y-12">
              <section className="space-y-4">
                <h2 className="text-2xl font-semibold flex items-center gap-3 border-b pb-2">
                  <Database className="w-5 h-5 text-primary" />
                  1. Recopilación de Datos
                </h2>
                <div className="text-muted-foreground leading-relaxed space-y-4">
                  <p>
                    En Todo sobre alltech, nos tomamos muy en serio la privacidad de nuestros usuarios. Esta Política de Privacidad describe cómo recopilamos, usamos, procesamos y distribuimos su información, incluyendo los datos personales utilizados para acceder a nuestros servicios.
                  </p>
                  <p>
                    Recopilamos información que nos proporciona directamente, como cuando crea una cuenta, se suscribe a nuestro boletín, solicita soporte al cliente o se comunica con nosotros de otra manera. Los tipos de información que podemos recopilar incluyen su nombre, dirección de correo electrónico, credenciales de cuenta e historial de comunicación.
                  </p>
                </div>
              </section>

              <section className="space-y-4">
                <h2 className="text-2xl font-semibold flex items-center gap-3 border-b pb-2">
                  <Cookie className="w-5 h-5 text-primary" />
                  2. Política de Cookies
                </h2>
                <div className="text-muted-foreground leading-relaxed space-y-4">
                  <p>
                    Utilizamos cookies y tecnologías de seguimiento similares para rastrear la actividad en nuestro servicio y mantener cierta información. Las cookies son archivos con una pequeña cantidad de datos que pueden incluir un identificador único anónimo.
                  </p>
                  <ul className="list-disc pl-5 space-y-2">
                    <li><strong className="text-foreground">Cookies Esenciales:</strong> Necesarias para el funcionamiento básico del sitio.</li>
                    <li><strong className="text-foreground">Cookies Analíticas:</strong> Nos ayudan a entender cómo los visitantes interactúan con nuestro sitio web (ej. Google Analytics).</li>
                    <li><strong className="text-foreground">Cookies de Marketing:</strong> Utilizadas para rastrear a los visitantes a través de los sitios web para mostrar anuncios relevantes.</li>
                  </ul>
                  <div className="mt-6 p-4 bg-muted rounded-xl border">
                    <p className="text-sm text-foreground font-medium mb-3">¿Deseas cambiar tus preferencias actuales?</p>
                    <Button variant="outline" onClick={openCookieModal}>
                      <Cookie className="w-4 h-4 mr-2" />
                      Configurar Cookies
                    </Button>
                  </div>
                </div>
              </section>

              <section className="space-y-4">
                <h2 className="text-2xl font-semibold flex items-center gap-3 border-b pb-2">
                  <Shield className="w-5 h-5 text-primary" />
                  3. Derechos del Usuario (GDPR)
                </h2>
                <div className="text-muted-foreground leading-relaxed space-y-4">
                  <p>
                    Si es residente del Espacio Económico Europeo (EEE), tiene ciertos derechos de protección de datos. Nuestro objetivo es tomar medidas razonables para permitirle corregir, modificar, eliminar o limitar el uso de sus Datos Personales.
                  </p>
                  <p>Sus derechos incluyen:</p>
                  <ul className="list-disc pl-5 space-y-2">
                    <li>Derecho de acceso a sus datos.</li>
                    <li>Derecho de rectificación o corrección de datos inexactos.</li>
                    <li>Derecho a oponerse al procesamiento de datos personales.</li>
                    <li>Derecho de eliminación (derecho al olvido).</li>
                    <li>Derecho a la portabilidad de los datos.</li>
                  </ul>
                </div>
              </section>

              <section className="space-y-4">
                <h2 className="text-2xl font-semibold flex items-center gap-3 border-b pb-2">
                  <Mail className="w-5 h-5 text-primary" />
                  4. Información de Contacto
                </h2>
                <div className="text-muted-foreground leading-relaxed space-y-4">
                  <p>
                    Si tiene alguna pregunta sobre esta Política de Privacidad o sobre cómo manejamos sus datos, puede ponerse en contacto con nuestro equipo de protección de datos:
                  </p>
                  <div className="bg-primary/5 p-4 rounded-lg border border-primary/10 inline-block">
                    <p className="font-medium text-foreground">Correo electrónico:</p>
                    <a href="mailto:privacy@todosobrealltech.com" className="text-primary hover:underline">privacy@todosobrealltech.com</a>
                  </div>
                </div>
              </section>
            </div>
          </article>
        </div>
      </div>
    </>
  );
};

export default PrivacyPolicyPage;
