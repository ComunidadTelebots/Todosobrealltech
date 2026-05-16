import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Copy, Check, Shield, Globe, Power, Edit2, Trash2, Info, Link as LinkIcon, Save, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import pb from '@/lib/pocketbaseClient.js';
import OnionWebStatistics from '@/components/OnionWebStatistics.jsx';

const OnionWebDetailsModal = ({ isOpen, onClose, onionWeb, onEdit, onDelete, onToggleStatus, onUpdate }) => {
  const [copied, setCopied] = useState(false);
  const [copiedRedirect, setCopiedRedirect] = useState(false);
  const [isEditingRedirect, setIsEditingRedirect] = useState(false);
  const [redirectUrl, setRedirectUrl] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  React.useEffect(() => {
    if (onionWeb) {
      setRedirectUrl(onionWeb.redirect_url || '');
      setIsEditingRedirect(false);
    }
  }, [onionWeb]);

  if (!onionWeb) return null;

  const isOwner = pb.authStore.isValid && pb.authStore.model.id === onionWeb.owner_id;
  const isAppWeb = onionWeb.name === 'TorWebManagement';

  const copyAddress = () => {
    navigator.clipboard.writeText(onionWeb.onion_address);
    setCopied(true);
    toast.success('Address copied to clipboard');
    setTimeout(() => setCopied(false), 2000);
  };

  const copyRedirect = () => {
    if (!onionWeb.redirect_url) return;
    navigator.clipboard.writeText(onionWeb.redirect_url);
    setCopiedRedirect(true);
    toast.success('Redirect URL copied');
    setTimeout(() => setCopiedRedirect(false), 2000);
  };

  const saveRedirectUrl = async () => {
    if (!isOwner) return;
    setIsSaving(true);
    try {
      const updated = await pb.collection('onion_webs').update(onionWeb.id, {
        redirect_url: redirectUrl
      }, { $autoCancel: false });
      toast.success('Redirect URL updated');
      setIsEditingRedirect(false);
      if (onUpdate) onUpdate(updated);
    } catch (error) {
      console.error('Failed to update redirect URL:', error);
      toast.error('Failed to update redirect URL');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader className="pb-4 border-b border-border/50">
          <div className="flex items-start justify-between pr-6">
            <div>
              <DialogTitle className="text-2xl font-bold flex items-center gap-3">
                {onionWeb.name}
                <Badge 
                  variant="outline" 
                  className={onionWeb.enabled 
                    ? "bg-[hsl(var(--onion-active))]/10 text-[hsl(var(--onion-active))] border-[hsl(var(--onion-active))]/20" 
                    : "bg-muted text-muted-foreground border-transparent"
                  }
                >
                  {onionWeb.enabled ? 'Active' : 'Inactive'}
                </Badge>
                {isAppWeb && <Badge variant="secondary">System App</Badge>}
              </DialogTitle>
              <DialogDescription className="mt-1.5">
                Created on {new Date(onionWeb.created_at).toLocaleDateString()}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <Tabs defaultValue="details" className="mt-4">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="details">Details & Access</TabsTrigger>
            <TabsTrigger value="stats">Statistics & Logs</TabsTrigger>
          </TabsList>
          
          <TabsContent value="details" className="space-y-6 pt-4">
            <div className="space-y-4">
              <div className="bg-muted/30 p-4 rounded-xl border border-border/50">
                <p className="text-sm font-medium text-muted-foreground mb-2">.onion Address</p>
                <div className="flex items-center justify-between bg-background border border-border rounded-lg p-2 pl-3">
                  <code className="text-sm font-mono text-primary truncate mr-4">
                    {onionWeb.onion_address}
                  </code>
                  <Button variant="secondary" size="sm" onClick={copyAddress} className="shrink-0">
                    {copied ? <Check className="w-4 h-4 mr-2 text-green-500" /> : <Copy className="w-4 h-4 mr-2" />}
                    Copy
                  </Button>
                </div>
              </div>

              <div className="bg-muted/30 p-4 rounded-xl border border-border/50">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm font-medium text-muted-foreground">Redirect URL</p>
                  {isOwner && !isEditingRedirect && (
                    <Button variant="ghost" size="sm" className="h-6 text-xs" onClick={() => setIsEditingRedirect(true)}>
                      <Edit2 className="w-3 h-3 mr-1" /> Edit
                    </Button>
                  )}
                </div>
                
                {isEditingRedirect ? (
                  <div className="flex items-center gap-2">
                    <Input 
                      value={redirectUrl} 
                      onChange={(e) => setRedirectUrl(e.target.value)} 
                      placeholder="https://example.com"
                      className="h-9"
                    />
                    <Button size="sm" onClick={saveRedirectUrl} disabled={isSaving}>
                      {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => { setIsEditingRedirect(false); setRedirectUrl(onionWeb.redirect_url || ''); }}>
                      Cancel
                    </Button>
                  </div>
                ) : (
                  <div className="flex items-center justify-between bg-background border border-border rounded-lg p-2 pl-3">
                    <div className="flex items-center overflow-hidden mr-4">
                      <LinkIcon className="w-4 h-4 text-muted-foreground mr-2 shrink-0" />
                      <span className="text-sm truncate">
                        {onionWeb.redirect_url || <span className="text-muted-foreground italic">No redirect configured</span>}
                      </span>
                    </div>
                    {onionWeb.redirect_url && (
                      <Button variant="ghost" size="sm" onClick={copyRedirect} className="shrink-0 h-8 w-8 p-0">
                        {copiedRedirect ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                      </Button>
                    )}
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="bg-muted/30 p-4 rounded-xl border border-border/50">
                  <p className="text-sm font-medium text-muted-foreground mb-1">Privacy Level</p>
                  <div className="flex items-center font-medium capitalize">
                    {onionWeb.privacy === 'private' ? (
                      <><Shield className="w-4 h-4 mr-2 text-amber-500" /> Private</>
                    ) : (
                      <><Globe className="w-4 h-4 mr-2 text-blue-500" /> Public</>
                    )}
                  </div>
                </div>
                <div className="bg-muted/30 p-4 rounded-xl border border-border/50">
                  <p className="text-sm font-medium text-muted-foreground mb-1">Owner ID</p>
                  <p className="font-mono text-sm truncate" title={onionWeb.owner_id}>{onionWeb.owner_id}</p>
                </div>
              </div>

              {onionWeb.description && (
                <div className="bg-muted/30 p-4 rounded-xl border border-border/50">
                  <p className="text-sm font-medium text-muted-foreground mb-1">Description</p>
                  <p className="text-sm leading-relaxed">{onionWeb.description}</p>
                </div>
              )}

              <div className="bg-[hsl(var(--onion-tor))]/5 border border-[hsl(var(--onion-tor))]/20 p-4 rounded-xl flex gap-3">
                <Info className="w-5 h-5 text-[hsl(var(--onion-tor))] shrink-0 mt-0.5" />
                <div className="text-sm text-[hsl(var(--onion-tor-foreground))]">
                  <p className="font-medium text-[hsl(var(--onion-tor))] mb-1">Tor Browser Required</p>
                  <p className="opacity-90">This address can only be accessed using the Tor Browser. Standard web browsers will not be able to resolve this domain.</p>
                </div>
              </div>
            </div>

            {isOwner && (
              <div className="flex items-center justify-between pt-4 border-t border-border/50">
                <Button 
                  variant="outline" 
                  className={onionWeb.enabled ? "text-amber-600 hover:text-amber-700 hover:bg-amber-50" : "text-green-600 hover:text-green-700 hover:bg-green-50"}
                  onClick={() => onToggleStatus(onionWeb)}
                >
                  <Power className="w-4 h-4 mr-2" />
                  {onionWeb.enabled ? 'Deactivate' : 'Activate'}
                </Button>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => onEdit(onionWeb)}>
                    <Edit2 className="w-4 h-4 mr-2" />
                    Edit
                  </Button>
                  {!isAppWeb && (
                    <Button variant="destructive" onClick={() => onDelete(onionWeb)}>
                      <Trash2 className="w-4 h-4 mr-2" />
                      Delete
                    </Button>
                  )}
                </div>
              </div>
            )}
          </TabsContent>

          <TabsContent value="stats" className="pt-4">
            <OnionWebStatistics onionWebId={onionWeb.id} redirectUrl={onionWeb.redirect_url} />
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};

export default OnionWebDetailsModal;