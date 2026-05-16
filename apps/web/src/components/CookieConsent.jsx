
import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Cookie, Settings2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAnalytics } from '@/contexts/AnalyticsProvider.jsx';

const CookieConsent = () => {
  const { consent, updateConsent, openCookieModal } = useAnalytics();

  // If consent is already recorded, don't show the banner
  if (consent !== null) return null;

  const handleAcceptAll = () => {
    updateConsent({ essential: true, analytics: true, marketing: true });
  };

  const handleRejectAll = () => {
    updateConsent({ essential: true, analytics: false, marketing: false });
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ y: 100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 100, opacity: 0 }}
        transition={{ type: "spring", stiffness: 300, damping: 30 }}
        className="fixed bottom-4 left-4 right-4 md:left-auto md:right-8 md:max-w-[420px] z-[100] cookie-banner-surface"
        role="dialog"
        aria-labelledby="cookie-banner-title"
        aria-describedby="cookie-banner-desc"
      >
        <div className="bg-card text-card-foreground p-6 rounded-2xl shadow-xl border border-border/60">
          <div className="flex items-start gap-4 mb-4">
            <div className="p-2.5 bg-primary/10 rounded-xl text-primary shrink-0 mt-0.5">
              <Cookie className="w-6 h-6" />
            </div>
            <div>
              <h2 id="cookie-banner-title" className="text-lg font-semibold tracking-tight mb-1">
                Valoramos tu privacidad
              </h2>
              <p id="cookie-banner-desc" className="text-sm text-muted-foreground leading-relaxed">
                Utilizamos cookies propias y de terceros para fines analíticos y para mostrarte publicidad personalizada en base a un perfil elaborado a partir de tus hábitos de navegación.
              </p>
            </div>
          </div>
          
          <div className="flex flex-col sm:flex-row gap-3 pt-2">
            <Button 
              variant="outline" 
              className="flex-1 font-medium bg-background" 
              onClick={handleRejectAll}
            >
              Rechazar
            </Button>
            <Button 
              className="flex-1 font-medium" 
              onClick={handleAcceptAll}
            >
              Aceptar Cookies
            </Button>
          </div>
          
          <div className="mt-4 text-center">
            <button 
              onClick={openCookieModal}
              className="text-xs font-medium text-muted-foreground hover:text-primary transition-colors inline-flex items-center gap-1.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-sm px-1"
            >
              <Settings2 className="w-3.5 h-3.5" />
              Configurar preferencias
            </button>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};

export default CookieConsent;
