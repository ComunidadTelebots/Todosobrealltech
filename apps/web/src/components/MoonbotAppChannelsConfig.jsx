import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Loader2, Smartphone, Plus, Trash2 } from 'lucide-react';
import apiServerClient from '@/lib/apiServerClient';
import pb from '@/lib/pocketbaseClient';
import { toast } from 'sonner';

const MoonbotAppChannelsConfig = () => {
  const [channels, setChannels] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const fetchChannels = async () => {
    try {
      setLoading(true);
      const res = await apiServerClient.fetch('/moonbot-admin/android-channels', {
        headers: { Authorization: `Bearer ${pb.authStore.token}` }
      });
      const data = await apiServerClient.readJson(res);
      if (data.ok && data.channels) {
        setChannels(data.channels);
      } else {
        toast.error("Error al cargar los canales de Android.");
      }
    } catch (e) {
      toast.error("Fallo de red al conectar con Cintiabot.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchChannels();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await apiServerClient.fetch('/moonbot-admin/android-channels', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          Authorization: `Bearer ${pb.authStore.token}` 
        },
        body: JSON.stringify(channels)
      });
      const data = await apiServerClient.readJson(res);
      if (data.ok) {
        toast.success("Ramas de actualización guardadas correctamente.");
      } else {
        toast.error("No se pudo guardar la configuración.");
      }
    } catch (e) {
      toast.error("Error al guardar en Cintiabot.");
    } finally {
      setSaving(false);
    }
  };

  const updateChannel = (channel, field, value) => {
    setChannels(prev => ({
      ...prev,
      [channel]: { ...prev[channel], [field]: value }
    }));
  };

  if (loading) {
    return (
      <Card className="border-primary/20 bg-card">
        <CardContent className="p-8 flex justify-center items-center">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-primary/20 bg-card shadow-sm overflow-hidden">
      <CardHeader className="bg-primary/5 pb-4">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Smartphone className="w-5 h-5 text-primary" />
              <CardTitle>Moonbot App Releases</CardTitle>
            </div>
            <CardDescription>
              Configura los enlaces de descarga y la versión obligatoria para cada rama de Android.
            </CardDescription>
          </div>
          <Button onClick={handleSave} disabled={saving}>
            {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Guardar cambios
          </Button>
        </div>
      </CardHeader>
      <CardContent className="pt-6">
        <div className="space-y-4">
          {channels && Object.entries(channels).map(([channel, config]) => (
            <div key={channel} className="flex flex-col sm:flex-row items-center gap-4 p-4 border rounded-xl bg-background/50 hover:bg-background transition-colors">
              <div className="w-full sm:w-32">
                <p className="font-semibold capitalize">{channel}</p>
                <p className="text-xs text-muted-foreground font-mono">.{channel}</p>
              </div>
              <div className="flex-1 w-full space-y-1">
                <label className="text-xs text-muted-foreground">URL de Telegram (t.me/...)</label>
                <Input 
                  value={config.url || ''} 
                  onChange={e => updateChannel(channel, 'url', e.target.value)}
                  placeholder="https://t.me/cintiabot/1" 
                  className="font-mono text-sm"
                />
              </div>
              <div className="w-full sm:w-32 space-y-1">
                <label className="text-xs text-muted-foreground">Versión mínima</label>
                <Input 
                  type="number" 
                  value={config.version || 0} 
                  onChange={e => updateChannel(channel, 'version', parseInt(e.target.value) || 0)}
                  className="font-mono text-sm text-center"
                />
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

export default MoonbotAppChannelsConfig;
