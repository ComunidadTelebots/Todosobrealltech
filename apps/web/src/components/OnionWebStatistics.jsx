import React, { useState, useEffect } from 'react';
import pb from '@/lib/pocketbaseClient.js';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Activity, Shield, Globe, Clock, Network, Link as LinkIcon } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { format, subDays, parseISO } from 'date-fns';

const OnionWebStatistics = ({ onionWebId, redirectUrl }) => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [chartData, setChartData] = useState([]);
  const [stats, setStats] = useState({
    total: 0,
    torPercentage: 0,
  });

  useEffect(() => {
    const fetchStats = async () => {
      if (!onionWebId) return;
      setLoading(true);
      try {
        const result = await pb.collection('onion_access_logs').getList(1, 100, {
          filter: `onion_web_id = "${onionWebId}"`,
          sort: '-access_timestamp',
          $autoCancel: false
        });

        const items = result.items;
        setLogs(items.slice(0, 10));

        const total = result.totalItems;
        const torCount = items.filter(log => log.is_tor_network).length;
        
        setStats({
          total,
          torPercentage: total > 0 ? Math.round((torCount / items.length) * 100) : 0
        });

        const last7Days = Array.from({ length: 7 }).map((_, i) => {
          const d = subDays(new Date(), i);
          return {
            date: format(d, 'MMM dd'),
            rawDate: format(d, 'yyyy-MM-dd'),
            accesses: 0
          };
        }).reverse();

        items.forEach(log => {
          const logDate = format(parseISO(log.access_timestamp), 'yyyy-MM-dd');
          const dayData = last7Days.find(d => d.rawDate === logDate);
          if (dayData) {
            dayData.accesses += 1;
          }
        });

        setChartData(last7Days);
      } catch (error) {
        console.error('Error fetching onion stats:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, [onionWebId]);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-2 gap-4">
          <Skeleton className="h-24 w-full rounded-xl" />
          <Skeleton className="h-24 w-full rounded-xl" />
        </div>
        <Skeleton className="h-[200px] w-full rounded-xl" />
        <Skeleton className="h-[300px] w-full rounded-xl" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {redirectUrl && (
        <div className="bg-muted/30 border border-border/50 rounded-xl p-4 flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
            <LinkIcon className="w-4 h-4 text-primary" />
          </div>
          <div className="overflow-hidden">
            <p className="text-xs font-medium text-muted-foreground">Active Redirect Destination</p>
            <p className="text-sm font-medium truncate" title={redirectUrl}>{redirectUrl}</p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Card className="bg-muted/30 border-border/50 shadow-sm">
          <CardContent className="p-4 flex items-center space-x-4">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
              <Activity className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Total Accesses</p>
              <h4 className="text-2xl font-bold">{stats.total}</h4>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-muted/30 border-border/50 shadow-sm">
          <CardContent className="p-4 flex items-center space-x-4">
            <div className="w-10 h-10 rounded-full bg-[hsl(var(--onion-tor))]/10 flex items-center justify-center shrink-0">
              <Shield className="w-5 h-5 text-[hsl(var(--onion-tor))]" />
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Tor Network Traffic</p>
              <h4 className="text-2xl font-bold">{stats.torPercentage}%</h4>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="border-border/50 shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Access Trends (7 Days)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[200px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorAccesses" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }} />
                <Tooltip 
                  contentStyle={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))', borderRadius: '8px' }}
                  itemStyle={{ color: 'hsl(var(--foreground))' }}
                />
                <Area type="monotone" dataKey="accesses" stroke="hsl(var(--primary))" strokeWidth={2} fillOpacity={1} fill="url(#colorAccesses)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      <Card className="border-border/50 shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Recent Access Logs</CardTitle>
        </CardHeader>
        <CardContent>
          {logs.length === 0 ? (
            <div className="text-center py-6 text-muted-foreground text-sm">
              No access logs recorded yet.
            </div>
          ) : (
            <div className="space-y-4">
              {logs.map((log) => (
                <div key={log.id} className="flex items-center justify-between border-b border-border/50 last:border-0 pb-3 last:pb-0">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center shrink-0">
                      {log.is_tor_network ? (
                        <Network className="w-4 h-4 text-[hsl(var(--onion-tor))]" />
                      ) : (
                        <Globe className="w-4 h-4 text-muted-foreground" />
                      )}
                    </div>
                    <div>
                      <p className="text-sm font-medium flex items-center gap-2">
                        {log.ip_address || 'Unknown IP'}
                        {log.is_tor_network && (
                          <Badge variant="outline" className="text-[10px] h-4 px-1 bg-[hsl(var(--onion-tor))]/10 text-[hsl(var(--onion-tor))] border-[hsl(var(--onion-tor))]/20">Tor</Badge>
                        )}
                      </p>
                      <p className="text-xs text-muted-foreground flex items-center mt-0.5">
                        <Clock className="w-3 h-3 mr-1" />
                        {format(parseISO(log.access_timestamp), 'MMM dd, yyyy HH:mm')}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-medium text-muted-foreground">{log.access_country || 'Unknown'}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default OnionWebStatistics;