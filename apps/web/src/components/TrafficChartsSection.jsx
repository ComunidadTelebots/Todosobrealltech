import React, { useState, useEffect } from 'react';
import pb from '@/lib/pocketbaseClient.js';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  LineChart, Line, AreaChart, Area, BarChart, Bar, 
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend 
} from 'recharts';
import { format, subDays, parseISO, startOfHour, subHours } from 'date-fns';

const TrafficChartsSection = ({ dateRange }) => {
  const [loading, setLoading] = useState(true);
  const [dailyVisits, setDailyVisits] = useState([]);
  const [dailyEvents, setDailyEvents] = useState([]);
  const [hourlyTraffic, setHourlyTraffic] = useState([]);
  const [realtimeUsers, setRealtimeUsers] = useState([]);

  useEffect(() => {
    const fetchChartData = async () => {
      setLoading(true);
      try {
        // In a real app, we would fetch aggregated data from the backend
        // For this demo, we'll generate realistic mock data based on the date range
        
        const days = dateRange === '7d' ? 7 : dateRange === '30d' ? 30 : 1;
        
        // 1. Daily Visits (Line Chart)
        const visitsData = Array.from({ length: days }).map((_, i) => {
          const d = subDays(new Date(), days - 1 - i);
          return {
            date: format(d, 'MMM dd'),
            visitors: Math.floor(Math.random() * 500) + 100,
            pageviews: Math.floor(Math.random() * 1500) + 300,
          };
        });
        setDailyVisits(visitsData);

        // 2. Daily Events (Line Chart)
        const eventsData = Array.from({ length: days }).map((_, i) => {
          const d = subDays(new Date(), days - 1 - i);
          return {
            date: format(d, 'MMM dd'),
            botCreations: Math.floor(Math.random() * 20),
            onionCreations: Math.floor(Math.random() * 10),
            signups: Math.floor(Math.random() * 50),
          };
        });
        setDailyEvents(eventsData);

        // 3. Hourly Traffic (Bar Chart)
        const hourlyData = Array.from({ length: 24 }).map((_, i) => {
          return {
            hour: `${i}:00`,
            traffic: Math.floor(Math.random() * 100) + (i > 8 && i < 20 ? 150 : 20), // Higher traffic during day
          };
        });
        setHourlyTraffic(hourlyData);

        // 4. Real-time Users (Area Chart - last 60 minutes)
        const realtimeData = Array.from({ length: 60 }).map((_, i) => {
          const d = new Date(Date.now() - (59 - i) * 60000);
          return {
            time: format(d, 'HH:mm'),
            active: Math.floor(Math.random() * 50) + 20,
          };
        });
        setRealtimeUsers(realtimeData);

      } catch (error) {
        console.error('Error fetching chart data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchChartData();
  }, [dateRange]);

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-card border border-border p-3 rounded-lg shadow-lg">
          <p className="font-medium mb-2">{label}</p>
          {payload.map((entry, index) => (
            <div key={index} className="flex items-center gap-2 text-sm">
              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: entry.color }} />
              <span className="text-muted-foreground capitalize">{entry.name}:</span>
              <span className="font-medium">{entry.value}</span>
            </div>
          ))}
        </div>
      );
    }
    return null;
  };

  if (loading) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {[1, 2, 3, 4].map(i => (
          <Card key={i}>
            <CardHeader><Skeleton className="h-6 w-1/3" /></CardHeader>
            <CardContent><Skeleton className="h-[300px] w-full" /></CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Visitors Line Chart */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg font-medium">Traffic Overview</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={dailyVisits} margin={{ top: 5, right: 20, left: -20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }} />
                <Tooltip content={<CustomTooltip />} />
                <Legend wrapperStyle={{ paddingTop: '20px' }} />
                <Line type="monotone" dataKey="visitors" name="Unique Visitors" stroke="hsl(var(--chart-1))" strokeWidth={2} dot={false} activeDot={{ r: 6 }} />
                <Line type="monotone" dataKey="pageviews" name="Page Views" stroke="hsl(var(--chart-2))" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Events Line Chart */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg font-medium">System Events</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={dailyEvents} margin={{ top: 5, right: 20, left: -20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }} />
                <Tooltip content={<CustomTooltip />} />
                <Legend wrapperStyle={{ paddingTop: '20px' }} />
                <Line type="monotone" dataKey="botCreations" name="Bots Created" stroke="hsl(var(--chart-3))" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="onionCreations" name="Onion Webs" stroke="hsl(var(--chart-4))" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="signups" name="New Users" stroke="hsl(var(--chart-5))" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Real-time Area Chart */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg font-medium">Real-time Active Users (Last Hour)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={realtimeUsers} margin={{ top: 5, right: 20, left: -20, bottom: 5 }}>
                <defs>
                  <linearGradient id="colorActive" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--chart-1))" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="hsl(var(--chart-1))" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                <XAxis dataKey="time" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }} dy={10} minTickGap={30} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }} />
                <Tooltip content={<CustomTooltip />} />
                <Area type="monotone" dataKey="active" name="Active Users" stroke="hsl(var(--chart-1))" strokeWidth={2} fillOpacity={1} fill="url(#colorActive)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Hourly Traffic Bar Chart */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg font-medium">Traffic by Hour of Day</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={hourlyTraffic} margin={{ top: 5, right: 20, left: -20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                <XAxis dataKey="hour" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }} dy={10} minTickGap={20} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }} />
                <Tooltip content={<CustomTooltip />} cursor={{ fill: 'hsl(var(--muted))', opacity: 0.4 }} />
                <Bar dataKey="traffic" name="Visits" fill="hsl(var(--chart-2))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default TrafficChartsSection;