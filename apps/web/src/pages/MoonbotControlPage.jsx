import React from 'react';
import MoonbotLoadBalancer from '@/components/MoonbotLoadBalancer.jsx';
export default function MoonbotControlPage() {
  return <div className="mx-auto max-w-7xl px-4 py-8"><h1 className="mb-3 text-3xl font-bold">Control de Moonbot</h1><p className="mb-6 text-muted-foreground">Estado real del servidor. Las métricas no disponibles se muestran sin valor. El worker de pruebas está aislado del principal.</p><MoonbotLoadBalancer /></div>;
}
