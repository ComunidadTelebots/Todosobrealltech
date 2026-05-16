import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet';
import pb from '@/lib/pocketbaseClient.js';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { BarChart3, Users, Bot, Network, Activity, TrendingUp } from 'lucide-react';
import StatCard from '@/components/StatCard.jsx';
import ServiceControlPanel from '@/components/ServiceControlPanel.jsx';
import TrafficChartsSection from '@/components/TrafficChartsSection.jsx';
import VisitorAnalyticsSection from '@/components/VisitorAnalyticsSection.jsx';
import ServiceStatisticsSection from '@/components/ServiceStatisticsSection.jsx';
import AlertsNotificationsPanel from '@/components/AlertsNotificationsPanel.jsx';
import ExportDataSection from '@/components/ExportDataSection.jsx';

const AdminStatisticsPage = () => {
  const [dateRange, setDateRange] = useState('7d');
  const [metrics, setMetrics] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchGlobalMetrics = async () => {
      setLoading(true);
      try {
        // In a real app, we would fetch aggregated data based on dateRange
        // For demo, we simulate fetching global metrics
        const [users, bots, onions] = await Promise.all([
          pb.collection('users').getList(1, 1, { $autoCancel: false }),
          pb.collection('bots').getList(1, 1, { $autoCancel: false }),
          pb.collection('onion_webs').getList(1, 1, { $autoCancel: false })
        ]);

        setMetrics({
          visitors: { total: 45231, unique: 12845, trend: '+12.5%' },
          bots: { total: bots.totalItems, trend: '+5.2%' },
          onions: { active: Math.floor(onions.totalItems * 0.9), trend: '+2.1%' },
          users: { total: users.totalItems, trend: '+8.4%' },
          revenue: { total: '$12,450', trend: '+15.3%' },
          conversion: { rate: '3.2%', trend: '+0.5%' }
        });
      } catch (error) {
        console.error('Error fetching metrics:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchGlobalMetrics();
  }, [dateRange]);

  return (
    <>
      <Helmet>
        <title>Analytics Dashboard - Admin</title>
        <meta name="description" content="Comprehensive system analytics and statistics." />
      </Helmet>

      <div className="min-h-[calc(100vh-4rem)] py-12 bg-muted/30">
        <div className="container max-w-7xl space-y-8">
          
          {/* Header & Date Range */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
                <BarChart3 className="w-8 h-8 text-primary" />
                Analytics Dashboard
              </h1>
              <p className="text-muted-foreground mt-1">
                Monitor system performance, traffic, and user behavior.
              </p>
            </div>
            <div className="flex items-center gap-3 bg-card p-1.5 rounded-lg border shadow-sm">
              <Select value={dateRange} onValueChange={setDateRange}>
                <SelectTrigger className="w-[160px] border-0 bg-transparent focus:ring-0 focus:ring-offset-0">
                  <SelectValue placeholder="Select range" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="today">Today</SelectItem>
                  <SelectItem value="7d">Last 7 Days</SelectItem>
                  <SelectItem value="30d">Last 30 Days</SelectItem>
                  <SelectItem value="custom">Custom Range...</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Global Metrics */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
            <StatCard
              icon={Activity}
              title="Total Visitors"
              value={metrics?.visitors.total.toLocaleString() || '-'}
              percentage={metrics?.visitors.trend}
              trend="up"
              status="default"
              loading={loading}
            />
            <StatCard
              icon={Bot}
              title="Total Bots"
              value={metrics?.bots.total || '-'}
              percentage={metrics?.bots.trend}
              trend="up"
              status="default"
              loading={loading}
            />
            <StatCard
              icon={Network}
              title="Active Onions"
              value={metrics?.onions.active || '-'}
              percentage={metrics?.onions.trend}
              trend="up"
              status="success"
              loading={loading}
            />
            <StatCard
              icon={Users}
              title="Registered Users"
              value={metrics?.users.total || '-'}
              percentage={metrics?.users.trend}
              trend="up"
              status="default"
              loading={loading}
            />
            <StatCard
              icon={TrendingUp}
              title="Revenue"
              value={metrics?.revenue.total || '-'}
              percentage={metrics?.revenue.trend}
              trend="up"
              status="success"
              loading={loading}
            />
            <StatCard
              icon={BarChart3}
              title="Conversion Rate"
              value={metrics?.conversion.rate || '-'}
              percentage={metrics?.conversion.trend}
              trend="up"
              status="default"
              loading={loading}
            />
          </div>

          {/* Main Content Grid */}
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
            
            {/* Left Column (Wider) */}
            <div className="xl:col-span-2 space-y-8">
              <TrafficChartsSection dateRange={dateRange} />
              <VisitorAnalyticsSection />
              <ServiceStatisticsSection />
            </div>

            {/* Right Column (Narrower) */}
            <div className="space-y-8">
              <AlertsNotificationsPanel />
              <ServiceControlPanel />
              <ExportDataSection />
            </div>

          </div>
        </div>
      </div>
    </>
  );
};

export default AdminStatisticsPage;