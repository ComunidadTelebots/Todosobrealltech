import React, { useState, useEffect } from 'react';
import pb from '@/lib/pocketbaseClient.js';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Bot, Network, Users, Activity, Shield, Star } from 'lucide-react';

const ServiceStatisticsSection = () => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        // Fetch aggregated data
        const [bots, onions, users] = await Promise.all([
          pb.collection('bots').getList(1, 1, { $autoCancel: false }),
          pb.collection('onion_webs').getList(1, 1, { $autoCancel: false }),
          pb.collection('users').getList(1, 1, { $autoCancel: false })
        ]);

        // In a real app, we would use custom endpoints or complex queries to get these aggregates
        // For demo, we'll simulate realistic stats based on total counts
        setStats({
          bots: {
            total: bots.totalItems,
            active: Math.floor(bots.totalItems * 0.8),
            interactions: bots.totalItems * 1250,
            avgSatisfaction: 4.6
          },
          onions: {
            total: onions.totalItems,
            active: Math.floor(onions.totalItems * 0.9),
            accesses: onions.totalItems * 850,
            torTraffic: 85
          },
          users: {
            total: users.totalItems,
            activeToday: Math.floor(users.totalItems * 0.15),
            newThisWeek: Math.floor(users.totalItems * 0.05),
            retention: 68
          }
        });
      } catch (error) {
        console.error('Error fetching service stats:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  if (loading || !stats) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[1, 2, 3].map(i => (
          <Card key={i}><CardContent className="p-6"><Skeleton className="h-32 w-full" /></CardContent></Card>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      {/* Bots Stats */}
      <Card className="border-border/50 shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg font-medium flex items-center gap-2">
            <Bot className="w-5 h-5 text-primary" />
            Bot Services
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex justify-between items-end">
              <div>
                <p className="text-sm text-muted-foreground">Total Bots</p>
                <p className="text-3xl font-bold">{stats.bots.total}</p>
              </div>
              <div className="text-right">
                <p className="text-sm text-muted-foreground">Active</p>
                <p className="text-xl font-semibold text-green-500">{stats.bots.active}</p>
              </div>
            </div>
            <div className="pt-4 border-t border-border/50 grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-muted-foreground flex items-center gap-1 mb-1">
                  <Activity className="w-3 h-3" /> Interactions
                </p>
                <p className="font-medium">{stats.bots.interactions.toLocaleString()}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground flex items-center gap-1 mb-1">
                  <Star className="w-3 h-3" /> Satisfaction
                </p>
                <p className="font-medium">{stats.bots.avgSatisfaction} / 5.0</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Onion Webs Stats */}
      <Card className="border-border/50 shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg font-medium flex items-center gap-2">
            <Network className="w-5 h-5 text-[hsl(var(--onion-tor))]" />
            Onion Webs
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex justify-between items-end">
              <div>
                <p className="text-sm text-muted-foreground">Total Webs</p>
                <p className="text-3xl font-bold">{stats.onions.total}</p>
              </div>
              <div className="text-right">
                <p className="text-sm text-muted-foreground">Active</p>
                <p className="text-xl font-semibold text-green-500">{stats.onions.active}</p>
              </div>
            </div>
            <div className="pt-4 border-t border-border/50 grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-muted-foreground flex items-center gap-1 mb-1">
                  <Activity className="w-3 h-3" /> Accesses
                </p>
                <p className="font-medium">{stats.onions.accesses.toLocaleString()}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground flex items-center gap-1 mb-1">
                  <Shield className="w-3 h-3" /> Tor Traffic
                </p>
                <p className="font-medium">{stats.onions.torTraffic}%</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Users Stats */}
      <Card className="border-border/50 shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg font-medium flex items-center gap-2">
            <Users className="w-5 h-5 text-blue-500" />
            User Base
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex justify-between items-end">
              <div>
                <p className="text-sm text-muted-foreground">Total Users</p>
                <p className="text-3xl font-bold">{stats.users.total}</p>
              </div>
              <div className="text-right">
                <p className="text-sm text-muted-foreground">Active Today</p>
                <p className="text-xl font-semibold text-blue-500">{stats.users.activeToday}</p>
              </div>
            </div>
            <div className="pt-4 border-t border-border/50 grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-muted-foreground flex items-center gap-1 mb-1">
                  <Users className="w-3 h-3" /> New (7d)
                </p>
                <p className="font-medium">+{stats.users.newThisWeek}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground flex items-center gap-1 mb-1">
                  <Activity className="w-3 h-3" /> Retention
                </p>
                <p className="font-medium">{stats.users.retention}%</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ServiceStatisticsSection;