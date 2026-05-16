import React, { useState } from 'react';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Globe, Shield, Activity, Edit2, Trash2, Play, Clock, AlertCircle, CheckCircle2 } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

const ProxyCard = ({ proxy, onEdit, onDelete, onTest }) => {
  const [isTesting, setIsTesting] = useState(false);

  const handleTest = async () => {
    setIsTesting(true);
    await onTest(proxy);
    setIsTesting(false);
  };

  const getStatusConfig = (status) => {
    switch (status) {
      case 'active':
        return { color: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20', icon: CheckCircle2, label: 'Active' };
      case 'inactive':
        return { color: 'bg-destructive/10 text-destructive border-destructive/20', icon: AlertCircle, label: 'Inactive' };
      case 'testing':
        return { color: 'bg-blue-500/10 text-blue-600 border-blue-500/20', icon: Activity, label: 'Testing...' };
      default:
        return { color: 'bg-muted text-muted-foreground border-border', icon: Clock, label: 'Untested' };
    }
  };

  const statusConfig = getStatusConfig(proxy.status);
  const StatusIcon = statusConfig.icon;

  return (
    <Card className="flex flex-col h-full transition-all duration-200 hover:shadow-md border-border/50">
      <CardContent className="p-5 flex-1">
        <div className="flex justify-between items-start mb-4">
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="font-mono text-xs uppercase tracking-wider">
              {proxy.proxy_type}
            </Badge>
            {proxy.country && (
              <Badge variant="secondary" className="text-xs uppercase">
                <Globe className="w-3 h-3 mr-1" />
                {proxy.country}
              </Badge>
            )}
          </div>
          <Badge variant="outline" className={statusConfig.color}>
            <StatusIcon className={`w-3 h-3 mr-1 ${proxy.status === 'testing' ? 'animate-pulse' : ''}`} />
            {statusConfig.label}
          </Badge>
        </div>

        <div className="space-y-3">
          <div>
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">Address</p>
            <p className="font-mono text-sm bg-muted/40 p-2 rounded border border-border/50 truncate">
              {proxy.proxy_url}
            </p>
          </div>

          {proxy.username && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted/20 p-2 rounded border border-border/30">
              <Shield className="w-3.5 h-3.5" />
              <span>Authentication Enabled</span>
            </div>
          )}

          {proxy.last_tested && (
            <div className="text-xs text-muted-foreground flex flex-col gap-1 mt-2">
              <span className="flex items-center gap-1">
                <Clock className="w-3 h-3" />
                Tested {formatDistanceToNow(new Date(proxy.last_tested), { addSuffix: true })}
              </span>
              {proxy.test_result && (
                <span className={`truncate ${proxy.status === 'active' ? 'text-emerald-600/80' : 'text-destructive/80'}`}>
                  {proxy.test_result}
                </span>
              )}
            </div>
          )}
        </div>
      </CardContent>
      
      <CardFooter className="p-3 bg-muted/10 border-t border-border/50 flex justify-between gap-2">
        <Button 
          variant="outline" 
          size="sm" 
          className="flex-1 bg-background" 
          onClick={handleTest}
          disabled={isTesting || proxy.status === 'testing'}
        >
          <Play className={`w-3.5 h-3.5 mr-1.5 ${isTesting ? 'animate-pulse text-blue-500' : ''}`} />
          Test
        </Button>
        <div className="flex gap-1">
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onEdit(proxy)}>
            <Edit2 className="w-3.5 h-3.5" />
            <span className="sr-only">Edit</span>
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10" onClick={() => onDelete(proxy.id)}>
            <Trash2 className="w-3.5 h-3.5" />
            <span className="sr-only">Delete</span>
          </Button>
        </div>
      </CardFooter>
    </Card>
  );
};

export default ProxyCard;