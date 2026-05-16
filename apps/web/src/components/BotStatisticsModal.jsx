import React, { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { useBotManagement } from '@/hooks/useBotManagement.js';
import { Loader2, Users, MessageSquare } from 'lucide-react';

const BotStatisticsModal = ({ isOpen, onClose, bot }) => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const { getBotStatistics } = useBotManagement();

  useEffect(() => {
    if (isOpen && bot) {
      setLoading(true);
      getBotStatistics(bot.id)
        .then(data => setStats(data))
        .finally(() => setLoading(false));
    }
  }, [isOpen, bot]);

  if (!bot) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[700px]">
        <DialogHeader>
          <DialogTitle>Statistics: {bot.nombre}</DialogTitle>
          <DialogDescription>Usage analytics for the last 7 days.</DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex justify-center items-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : stats ? (
          <div className="space-y-6 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-muted/50 p-4 rounded-lg flex items-center space-x-4">
                <div className="p-3 bg-primary/10 rounded-full">
                  <Users className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total Users</p>
                  <p className="text-2xl font-bold">{stats.totalUsers}</p>
                </div>
              </div>
              <div className="bg-muted/50 p-4 rounded-lg flex items-center space-x-4">
                <div className="p-3 bg-primary/10 rounded-full">
                  <MessageSquare className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Active Users</p>
                  <p className="text-2xl font-bold">{stats.activeUsers}</p>
                </div>
              </div>
            </div>

            <div className="h-[300px] w-full mt-4">
              <h4 className="text-sm font-medium mb-4">Daily Messages</h4>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={stats.dailyUsage} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                  <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))', borderRadius: '8px' }}
                    itemStyle={{ color: 'hsl(var(--foreground))' }}
                  />
                  <Line type="monotone" dataKey="messages" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        ) : (
          <div className="text-center py-8 text-muted-foreground">Failed to load statistics.</div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default BotStatisticsModal;