import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Unplug, Link as LinkIcon } from 'lucide-react';
import pb from '@/lib/pocketbaseClient.js';
import { toast } from 'sonner';
import { useLanguage } from '@/contexts/LanguageContext.jsx';

const SocialNetworksSection = ({ user, onUpdate }) => {
  const { getTranslation } = useLanguage();
  const [isDisconnecting, setIsDisconnecting] = useState(false);

  const isTelegramConnected = !!user?.telegram_id;

  const handleDisconnectTelegram = async () => {
    if (!window.confirm(getTranslation('confirm_disconnect_telegram') || 'Are you sure you want to disconnect Telegram?')) {
      return;
    }

    setIsDisconnecting(true);
    try {
      const updatedUser = await pb.collection('users').update(user.id, {
        telegram_id: "",
        telegram_username: "",
        telegram_name: "",
        telegram_photo_url: ""
      }, { $autoCancel: false });
      
      toast.success(getTranslation('disconnect_success') || 'Social network disconnected successfully');
      if (onUpdate) onUpdate(updatedUser);
    } catch (error) {
      console.error('Failed to disconnect Telegram:', error);
      toast.error(getTranslation('disconnect_error') || 'Failed to disconnect social network');
    } finally {
      setIsDisconnecting(false);
    }
  };

  return (
    <Card className="border-none shadow-md">
      <CardHeader>
        <CardTitle className="text-xl">{getTranslation('connected_networks') || 'Connected Networks'}</CardTitle>
        <CardDescription>
          {getTranslation('connected_networks_desc') || 'Manage your linked social accounts and integrations.'}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        
        {/* Telegram Connection Item */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 rounded-xl border bg-card gap-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-[#0088cc]/10 flex items-center justify-center shrink-0">
              <svg viewBox="0 0 24 24" className="w-6 h-6 fill-[#0088cc]">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-.99-.65-.35-1.01.22-1.59.15-.15 2.71-2.48 2.76-2.69a.2.2 0 00-.05-.18c-.06-.05-.14-.03-.21-.02-.09.02-1.49.95-4.22 2.79-.4.27-.76.41-1.08.4-.36-.01-1.04-.2-1.55-.37-.63-.2-1.12-.31-1.08-.66.02-.18.27-.36.74-.55 2.92-1.27 4.86-2.11 5.83-2.51 2.78-1.16 3.35-1.36 3.73-1.36.08 0 .27.02.39.12.1.08.13.19.14.27-.01.06.01.24 0 .38z"/>
              </svg>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-foreground">Telegram</h3>
                {isTelegramConnected ? (
                  <Badge variant="default" className="bg-emerald-500/15 text-emerald-700 hover:bg-emerald-500/25 border-none">
                    {getTranslation('connected') || 'Connected'}
                  </Badge>
                ) : (
                  <Badge variant="secondary" className="text-muted-foreground">
                    {getTranslation('disconnected') || 'Disconnected'}
                  </Badge>
                )}
              </div>
              {isTelegramConnected ? (
                <p className="text-sm text-muted-foreground mt-1">
                  {user.telegram_username ? `@${user.telegram_username}` : user.telegram_name || 'Linked Account'}
                </p>
              ) : (
                <p className="text-sm text-muted-foreground mt-1">
                  {getTranslation('telegram_not_connected') || 'Connect to receive bot notifications'}
                </p>
              )}
            </div>
          </div>

          <div className="w-full sm:w-auto flex justify-end">
            {isTelegramConnected ? (
              <Button 
                variant="destructive" 
                size="sm" 
                onClick={handleDisconnectTelegram}
                disabled={isDisconnecting}
                className="w-full sm:w-auto"
              >
                <Unplug className="w-4 h-4 mr-2" />
                {getTranslation('disconnect') || 'Disconnect'}
              </Button>
            ) : (
              <Button variant="outline" size="sm" disabled className="w-full sm:w-auto">
                <LinkIcon className="w-4 h-4 mr-2" />
                {getTranslation('connect') || 'Connect'}
              </Button>
            )}
          </div>
        </div>

        {!isTelegramConnected && (
          <div className="text-center p-6 border border-dashed rounded-xl bg-muted/30">
            <p className="text-sm text-muted-foreground">
              {getTranslation('no_networks_connected') || 'No social networks are currently connected to your account.'}
            </p>
          </div>
        )}

      </CardContent>
    </Card>
  );
};

export default SocialNetworksSection;