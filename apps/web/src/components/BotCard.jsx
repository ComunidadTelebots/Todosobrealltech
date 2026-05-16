import React, { useState } from 'react';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Bot, Edit2, Trash2, Users, Star, MessageSquare, Loader2 } from 'lucide-react';
import pb from '@/lib/pocketbaseClient.js';
import { toast } from 'sonner';

const BotCard = ({ bot, onEdit, onDeleteSuccess }) => {
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async () => {
    if (!window.confirm(`Are you sure you want to delete the bot "${bot.nombre}"? This action cannot be undone.`)) {
      return;
    }

    setIsDeleting(true);
    try {
      await pb.collection('bots').delete(bot.id, { $autoCancel: false });
      toast.success('Bot deleted successfully');
      onDeleteSuccess();
    } catch (error) {
      console.error('Error deleting bot:', error);
      toast.error('Failed to delete bot. Please try again.');
      setIsDeleting(false);
    }
  };

  const handleInteract = () => {
    toast.info('Chat interface coming soon.');
  };

  return (
    <Card className="flex flex-col h-full transition-all duration-300 hover:-translate-y-1 hover:shadow-lg group border-border/50">
      <CardHeader className="pb-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center space-x-3 overflow-hidden">
            <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
              <Bot className="w-6 h-6 text-primary" />
            </div>
            <div className="overflow-hidden">
              <h3 className="font-semibold text-lg truncate" title={bot.nombre}>
                {bot.nombre}
              </h3>
              <p className="text-xs text-muted-foreground truncate mt-0.5">
                ID: {bot.id.substring(0, 8)}...
              </p>
            </div>
          </div>
          <Badge 
            variant="outline"
            className={
              bot.estado 
                ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/20 shrink-0" 
                : "bg-muted text-muted-foreground border-transparent shrink-0"
            }
          >
            {bot.estado ? 'Active' : 'Inactive'}
          </Badge>
        </div>
      </CardHeader>
      
      <CardContent className="flex-1 pb-4 flex flex-col">
        <p className="text-sm text-muted-foreground line-clamp-2 mb-6 flex-1">
          {bot.descripcion || 'No description provided for this bot.'}
        </p>
        
        <div className="grid grid-cols-2 gap-3 mt-auto">
          <div className="flex items-center space-x-2 bg-secondary/50 rounded-lg p-2.5">
            <Users className="w-4 h-4 text-primary/70" />
            <div>
              <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Users</p>
              <p className="text-sm font-semibold">{bot.users?.toLocaleString() || 0}</p>
            </div>
          </div>
          <div className="flex items-center space-x-2 bg-secondary/50 rounded-lg p-2.5">
            <Star className="w-4 h-4 text-amber-500/70" />
            <div>
              <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Satisfaction</p>
              <p className="text-sm font-semibold">{bot.satisfaction || 0}%</p>
            </div>
          </div>
        </div>
      </CardContent>
      
      <CardFooter className="pt-4 border-t bg-muted/10 flex items-center justify-between gap-2">
        <Button 
          variant="default" 
          size="sm" 
          className="flex-1"
          onClick={handleInteract}
          disabled={!bot.estado}
        >
          <MessageSquare className="w-4 h-4 mr-2" />
          Interact
        </Button>
        
        <div className="flex items-center space-x-1 shrink-0">
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-8 w-8 text-muted-foreground hover:text-foreground"
            onClick={() => onEdit(bot)}
            disabled={isDeleting}
            title="Edit Bot"
          >
            <Edit2 className="w-4 h-4" />
          </Button>
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
            onClick={handleDelete}
            disabled={isDeleting}
            title="Delete Bot"
          >
            {isDeleting ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Trash2 className="w-4 h-4" />
            )}
          </Button>
        </div>
      </CardFooter>
    </Card>
  );
};

export default BotCard;