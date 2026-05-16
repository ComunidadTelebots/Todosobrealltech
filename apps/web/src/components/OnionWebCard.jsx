import React, { useState } from 'react';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Copy, Check, Shield, Globe, Power, MoreVertical, Edit2, Trash2, Network, Link as LinkIcon, Star } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { toast } from 'sonner';
import pb from '@/lib/pocketbaseClient.js';

const OnionWebCard = ({ onionWeb, onClick, onEdit, onDelete, onToggleStatus }) => {
  const [copied, setCopied] = useState(false);
  const isOwner = pb.authStore.isValid && pb.authStore.model.id === onionWeb.owner_id;
  const isAppWeb = onionWeb.name === 'TorWebManagement';

  const copyAddress = (e) => {
    e.stopPropagation();
    navigator.clipboard.writeText(onionWeb.onion_address);
    setCopied(true);
    toast.success('Address copied');
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Card 
      className={`flex flex-col h-full transition-all duration-300 hover:-translate-y-1 hover:shadow-lg cursor-pointer border-border/50 group ${isAppWeb ? 'ring-2 ring-primary/50 bg-primary/5' : ''}`}
      onClick={() => onClick(onionWeb)}
    >
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center space-x-3 overflow-hidden">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-colors ${isAppWeb ? 'bg-primary text-primary-foreground' : onionWeb.enabled ? 'bg-[hsl(var(--onion-active))]/10 text-[hsl(var(--onion-active))]' : 'bg-muted text-muted-foreground'}`}>
              {isAppWeb ? <Star className="w-5 h-5" /> : <Network className="w-5 h-5" />}
            </div>
            <div className="overflow-hidden">
              <h3 className="font-semibold text-lg truncate flex items-center gap-2" title={onionWeb.name}>
                {onionWeb.name}
                {isAppWeb && <Badge variant="secondary" className="text-[10px] h-4 px-1.5">System</Badge>}
              </h3>
              <div className="flex items-center text-xs text-muted-foreground mt-0.5">
                {onionWeb.privacy === 'private' ? (
                  <><Shield className="w-3 h-3 mr-1" /> Private</>
                ) : (
                  <><Globe className="w-3 h-3 mr-1" /> Public</>
                )}
                <span className="mx-2">•</span>
                <span>{isOwner ? 'Owner' : 'Guest'}</span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0" onClick={e => e.stopPropagation()}>
            <Badge 
              variant="outline" 
              className={onionWeb.enabled 
                ? "bg-[hsl(var(--onion-active))]/10 text-[hsl(var(--onion-active))] border-[hsl(var(--onion-active))]/20" 
                : "bg-muted text-muted-foreground border-transparent"
              }
            >
              {onionWeb.enabled ? 'Active' : 'Inactive'}
            </Badge>
            {isOwner && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8 -mr-2">
                    <MoreVertical className="w-4 h-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onEdit(onionWeb); }}>
                    <Edit2 className="w-4 h-4 mr-2" /> Edit
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onToggleStatus(onionWeb); }}>
                    <Power className="w-4 h-4 mr-2" /> {onionWeb.enabled ? 'Deactivate' : 'Activate'}
                  </DropdownMenuItem>
                  {!isAppWeb && (
                    <>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={(e) => { e.stopPropagation(); onDelete(onionWeb); }}>
                        <Trash2 className="w-4 h-4 mr-2" /> Delete
                      </DropdownMenuItem>
                    </>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="flex-1 pb-4 flex flex-col gap-3">
        <div className="bg-muted/40 rounded-lg p-2.5 flex items-center justify-between border border-border/50 group-hover:border-primary/20 transition-colors">
          <code className="text-xs font-mono text-muted-foreground truncate mr-2">
            {onionWeb.onion_address}
          </code>
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-6 w-6 shrink-0 hover:bg-background" 
            onClick={copyAddress}
            title="Copy Address"
          >
            {copied ? <Check className="w-3 h-3 text-green-500" /> : <Copy className="w-3 h-3 text-muted-foreground" />}
          </Button>
        </div>

        {onionWeb.redirect_url && (
          <div className="flex items-center text-xs text-muted-foreground bg-muted/20 p-2 rounded-md border border-border/30">
            <LinkIcon className="w-3 h-3 mr-2 shrink-0" />
            <span className="truncate" title={onionWeb.redirect_url}>{onionWeb.redirect_url}</span>
          </div>
        )}
        
        <p className="text-sm text-muted-foreground line-clamp-2 flex-1 mt-1">
          {onionWeb.description || 'No description provided.'}
        </p>
      </CardContent>
      
      <CardFooter className="pt-4 border-t bg-muted/10 text-xs text-muted-foreground flex justify-between">
        <span>Created {new Date(onionWeb.created_at).toLocaleDateString()}</span>
        <span className="truncate max-w-[100px]" title={onionWeb.owner_id}>ID: {onionWeb.owner_id.substring(0, 6)}...</span>
      </CardFooter>
    </Card>
  );
};

export default OnionWebCard;