import React, { useState, useEffect } from 'react';
import pb from '@/lib/pocketbaseClient.js';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertCircle, AlertTriangle, Info, X, BellRing } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

const AlertsNotificationsPanel = () => {
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAlerts = async () => {
      try {
        const result = await pb.collection('system_alerts').getList(1, 10, {
          filter: 'is_active = true',
          sort: '-triggered_at',
          $autoCancel: false
        });
        setAlerts(result.items);
      } catch (error) {
        console.error('Error fetching alerts:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchAlerts();

    // Subscribe to real-time alerts
    const unsubscribe = pb.collection('system_alerts').subscribe('*', function (e) {
      if (e.action === 'create' && e.record.is_active) {
        setAlerts(prev => [e.record, ...prev].slice(0, 10));
      } else if (e.action === 'update') {
        if (!e.record.is_active) {
          setAlerts(prev => prev.filter(a => a.id !== e.record.id));
        } else {
          setAlerts(prev => prev.map(a => a.id === e.record.id ? e.record : a));
        }
      }
    });

    return () => {
      pb.collection('system_alerts').unsubscribe('*');
    };
  }, []);

  const dismissAlert = async (id) => {
    try {
      await pb.collection('system_alerts').update(id, {
        is_active: false,
        resolved_at: new Date().toISOString()
      }, { $autoCancel: false });
      
      setAlerts(prev => prev.filter(a => a.id !== id));
    } catch (error) {
      console.error('Error dismissing alert:', error);
    }
  };

  const getSeverityStyles = (severity) => {
    switch (severity) {
      case 'critical':
        return {
          bg: 'bg-destructive/10',
          border: 'border-destructive/20',
          icon: <AlertCircle className="w-5 h-5 text-destructive" />,
          text: 'text-destructive'
        };
      case 'warning':
        return {
          bg: 'bg-amber-500/10',
          border: 'border-amber-500/20',
          icon: <AlertTriangle className="w-5 h-5 text-amber-500" />,
          text: 'text-amber-600 dark:text-amber-500'
        };
      default:
        return {
          bg: 'bg-blue-500/10',
          border: 'border-blue-500/20',
          icon: <Info className="w-5 h-5 text-blue-500" />,
          text: 'text-blue-600 dark:text-blue-500'
        };
    }
  };

  if (loading) return null;

  if (alerts.length === 0) {
    return (
      <Card className="border-border/50 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg font-medium flex items-center gap-2">
            <BellRing className="w-5 h-5 text-muted-foreground" />
            System Alerts
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-6 text-muted-foreground text-sm flex flex-col items-center">
            <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-3">
              <BellRing className="w-6 h-6 opacity-50" />
            </div>
            No active system alerts. Everything is running smoothly.
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-border/50 shadow-sm">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg font-medium flex items-center gap-2">
          <BellRing className="w-5 h-5 text-primary" />
          System Alerts
          <span className="bg-destructive text-destructive-foreground text-xs px-2 py-0.5 rounded-full ml-2">
            {alerts.length}
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {alerts.map((alert) => {
            const styles = getSeverityStyles(alert.severity);
            return (
              <div 
                key={alert.id} 
                className={`flex items-start gap-3 p-3 rounded-lg border ${styles.bg} ${styles.border}`}
              >
                <div className="shrink-0 mt-0.5">{styles.icon}</div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <h4 className={`text-sm font-semibold ${styles.text}`}>{alert.title}</h4>
                    <span className="text-xs text-muted-foreground whitespace-nowrap">
                      {formatDistanceToNow(new Date(alert.triggered_at), { addSuffix: true })}
                    </span>
                  </div>
                  <p className="text-sm mt-1 opacity-90">{alert.message}</p>
                  {alert.service_name && (
                    <p className="text-xs mt-2 font-mono opacity-70">Service: {alert.service_name}</p>
                  )}
                </div>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-6 w-6 shrink-0 -mt-1 -mr-1 opacity-50 hover:opacity-100"
                  onClick={() => dismissAlert(alert.id)}
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
};

export default AlertsNotificationsPanel;