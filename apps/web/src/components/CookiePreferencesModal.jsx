
import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { ShieldCheck, Activity, Target } from 'lucide-react';
import { useAnalytics } from '@/contexts/AnalyticsProvider.jsx';
import { Link } from 'react-router-dom';

const CookiePreferencesModal = () => {
  const { consent, updateConsent, isModalOpen, closeCookieModal } = useAnalytics();
  
  const [preferences, setPreferences] = useState({
    essential: true,
    analytics: false,
    marketing: false
  });

  // Sync internal state when modal opens or consent changes
  useEffect(() => {
    if (isModalOpen) {
      if (consent && consent.categories) {
        setPreferences({
          essential: true, // Always true
          analytics: consent.categories.analytics,
          marketing: consent.categories.marketing
        });
      } else {
        // Defaults if no consent yet
        setPreferences({
          essential: true,
          analytics: false,
          marketing: false
        });
      }
    }
  }, [isModalOpen, consent]);

  const handleToggle = (category) => {
    if (category === 'essential') return; // Cannot toggle essential
    setPreferences(prev => ({ ...prev, [category]: !prev[category] }));
  };

  const handleSave = () => {
    updateConsent(preferences);
    closeCookieModal();
  };

  const handleAcceptAll = () => {
    const all = { essential: true, analytics: true, marketing: true };
    setPreferences(all);
    updateConsent(all);
    closeCookieModal();
  };

  const handleRejectAll = () => {
    const none = { essential: true, analytics: false, marketing: false };
    setPreferences(none);
    updateConsent(none);
    closeCookieModal();
  };

  return (
    <Dialog open={isModalOpen} onOpenChange={(open) => !open && closeCookieModal()}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Preferencias de Cookies</DialogTitle>
          <DialogDescription>
            Utilizamos cookies para mejorar tu experiencia. Puedes personalizar qué categorías de cookies permites a continuación.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          <div className="flex items-start justify-between space-x-4">
            <div className="space-y-1 pr-6">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-500" />
                <Label className="text-base font-semibold">Esenciales</Label>
              </div>
              <p className="text-sm text-muted-foreground">
                Necesarias para que el sitio web funcione correctamente. No pueden ser desactivadas.
              </p>
            </div>
            <Switch checked={true} disabled />
          </div>

          <div className="flex items-start justify-between space-x-4">
            <div className="space-y-1 pr-6">
              <div className="flex items-center gap-2">
                <Activity className="w-4 h-4 text-blue-500" />
                <Label htmlFor="analytics-toggle" className="text-base font-semibold cursor-pointer">Analíticas</Label>
              </div>
              <p className="text-sm text-muted-foreground">
                Nos ayudan a entender cómo los visitantes interactúan con el sitio web, recogiendo y reportando información de forma anónima (Google Analytics).
              </p>
            </div>
            <Switch 
              id="analytics-toggle" 
              checked={preferences.analytics} 
              onCheckedChange={() => handleToggle('analytics')} 
            />
          </div>

          <div className="flex items-start justify-between space-x-4">
            <div className="space-y-1 pr-6">
              <div className="flex items-center gap-2">
                <Target className="w-4 h-4 text-purple-500" />
                <Label htmlFor="marketing-toggle" className="text-base font-semibold cursor-pointer">Marketing</Label>
              </div>
              <p className="text-sm text-muted-foreground">
                Se utilizan para rastrear a los visitantes en los sitios web. La intención es mostrar anuncios que sean relevantes y atractivos para el usuario individual.
              </p>
            </div>
            <Switch 
              id="marketing-toggle" 
              checked={preferences.marketing} 
              onCheckedChange={() => handleToggle('marketing')} 
            />
          </div>
        </div>

        <div className="text-sm text-muted-foreground pb-2">
          Más información en la <Link to="/cookies" onClick={closeCookieModal} className="text-primary hover:underline font-medium">Política de cookies</Link> y la <Link to="/privacy" onClick={closeCookieModal} className="text-primary hover:underline font-medium">Política de privacidad</Link>.
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2 sm:gap-0">
          <Button variant="ghost" onClick={handleRejectAll} className="w-full sm:w-auto">
            Rechazar Todo
          </Button>
          <div className="flex w-full sm:w-auto gap-2">
            <Button variant="outline" onClick={handleSave} className="flex-1 sm:flex-none">
              Guardar
            </Button>
            <Button onClick={handleAcceptAll} className="flex-1 sm:flex-none">
              Aceptar Todo
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default CookiePreferencesModal;
