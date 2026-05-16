import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Bot, Calendar, User, Activity, Key } from 'lucide-react';

const BotDetailsModal = ({ isOpen, onClose, bot, onEdit }) => {
  if (!bot) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="flex items-center text-xl">
              <Bot className="w-5 h-5 mr-2 text-primary" />
              {bot.nombre}
            </DialogTitle>
            <Badge variant={bot.estado ? "default" : "secondary"}>
              {bot.estado ? 'Active' : 'Inactive'}
            </Badge>
          </div>
          <DialogDescription>Bot ID: {bot.id}</DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="details" className="mt-4">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="details">Details</TabsTrigger>
            <TabsTrigger value="config">Configuration</TabsTrigger>
          </TabsList>
          
          <TabsContent value="details" className="space-y-4 mt-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <p className="text-sm font-medium text-muted-foreground flex items-center">
                  <User className="w-4 h-4 mr-1" /> Creator
                </p>
                <p className="text-sm">{bot.expand?.user_id?.email || bot.user_id}</p>
              </div>
              <div className="space-y-1">
                <p className="text-sm font-medium text-muted-foreground flex items-center">
                  <Calendar className="w-4 h-4 mr-1" /> Created
                </p>
                <p className="text-sm">{new Date(bot.created).toLocaleDateString()}</p>
              </div>
              <div className="space-y-1 col-span-2">
                <p className="text-sm font-medium text-muted-foreground flex items-center">
                  <Activity className="w-4 h-4 mr-1" /> Description
                </p>
                <p className="text-sm bg-muted/50 p-3 rounded-md mt-1">
                  {bot.descripcion || 'No description provided.'}
                </p>
              </div>
            </div>
          </TabsContent>
          
          <TabsContent value="config" className="space-y-4 mt-4">
            <div className="space-y-2">
              <p className="text-sm font-medium text-muted-foreground flex items-center">
                <Key className="w-4 h-4 mr-1" /> API Token
              </p>
              <div className="flex items-center space-x-2">
                <code className="flex-1 bg-muted p-2 rounded text-xs truncate">
                  {bot.token ? '••••••••••••••••••••••••' : 'Not set'}
                </code>
              </div>
            </div>
          </TabsContent>
        </Tabs>

        <div className="flex justify-end space-x-2 mt-6">
          <Button variant="outline" onClick={onClose}>Close</Button>
          <Button onClick={() => { onClose(); onEdit(bot); }}>Edit Bot</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default BotDetailsModal;