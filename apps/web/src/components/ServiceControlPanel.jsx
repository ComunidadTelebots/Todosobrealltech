import React, { useState, useEffect } from 'react';
import pb from '@/lib/pocketbaseClient.js';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Play, Square, RotateCw, FileText, Server, Activity, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';

const ServiceControlPanel = () => {
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(null);

  const fetchServices = async () => {
    try {
      const result = await pb.collection('service_status').getList(1, 50, {
        sort: 'service_name',
        $autoCancel: false
      });
      setServices(result.items);
    } catch (error) {
      console.error('Error fetching services:', error);
      toast.error('Failed to load service status');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchServices();
    
    // Subscribe to real-time updates
    const unsubscribe = pb.collection('service_status').subscribe('*', function (e) {
      if (e.action === 'update') {
        setServices(prev => prev.map(s => s.id === e.record.id ? e.record : s));
      } else if (e.action === 'create') {
        setServices(prev => [...prev, e.record]);
      } else if (e.action === 'delete') {
        setServices(prev => prev.filter(s => s.id !== e.record.id));
      }
    });

    return () => {
      pb.collection('service_status').unsubscribe('*');
    };
  }, []);

  const handleServiceAction = async (serviceId, action) => {
    setActionLoading(`${serviceId}-${action}`);
    try {
      // In a real app, this would call a backend endpoint to actually control the service
      // For now, we just update the status in the database
      let newStatus = 'active';
      if (action === 'stop') newStatus = 'inactive';
      
      await pb.collection('service_status').update(serviceId, {
        status: newStatus,
        last_activity: new Date().toISOString(),
        ...(action === 'restart' ? { restart_count: (services.find(s => s.id === serviceId)?.restart_count || 0) + 1 } : {})
      }, { $autoCancel: false });
      
      toast.success(`Service ${action} command sent successfully`);
    } catch (error) {
      console.error(`Error performing ${action} on service:`, error);
      toast.error(`Failed to ${action} service`);
    } finally {
      setActionLoading(null);
    }
  };

  const handleMasterAction = async (action) => {
    setActionLoading(`master-${action}`);
    try {
      const newStatus = action === 'start' ? 'active' : 'inactive';
      
      // Update all services
      await Promise.all(services.map(service => 
        pb.collection('service_status').update(service.id, {
          status: newStatus,
          last_activity: new Date().toISOString()
        }, { $autoCancel: false })
      ));
      
      toast.success(`All services ${action === 'start' ? 'started' : 'stopped'} successfully`);
    } catch (error) {
      console.error(`Error performing master ${action}:`, error);
      toast.error(`Failed to ${action} all services`);
    } finally {
      setActionLoading(null);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Service Control Panel</CardTitle>
          <CardDescription>Loading service status...</CardDescription>
        </CardHeader>
        <CardContent className="h-64 flex items-center justify-center">
          <RotateCw className="w-8 h-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <div>
          <CardTitle className="flex items-center gap-2">
            <Server className="w-5 h-5" />
            Service Control Panel
          </CardTitle>
          <CardDescription>Manage and monitor core system services</CardDescription>
        </div>
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            size="sm" 
            className="text-green-600 hover:text-green-700 hover:bg-green-50"
            onClick={() => handleMasterAction('start')}
            disabled={actionLoading === 'master-start'}
          >
            <Play className="w-4 h-4 mr-2" />
            Start All
          </Button>
          <Button 
            variant="outline" 
            size="sm" 
            className="text-destructive hover:text-destructive hover:bg-destructive/10"
            onClick={() => handleMasterAction('stop')}
            disabled={actionLoading === 'master-stop'}
          >
            <Square className="w-4 h-4 mr-2" />
            Stop All
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Service</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Uptime</TableHead>
                <TableHead>Last Activity</TableHead>
                <TableHead>Active Users</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {services.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    No services found.
                  </TableCell>
                </TableRow>
              ) : (
                services.map((service) => (
                  <TableRow key={service.id}>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        <Activity className="w-4 h-4 text-muted-foreground" />
                        {service.service_name}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={service.status === 'active' ? 'default' : 'secondary'} 
                             className={service.status === 'active' ? 'bg-green-500 hover:bg-green-600' : ''}>
                        {service.status}
                      </Badge>
                      {service.error_count > 0 && (
                        <Badge variant="destructive" className="ml-2" title={service.last_error_message}>
                          <AlertCircle className="w-3 h-3 mr-1" />
                          {service.error_count} Errors
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>{service.uptime_percentage || 100}%</TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {service.last_activity ? formatDistanceToNow(new Date(service.last_activity), { addSuffix: true }) : 'Never'}
                    </TableCell>
                    <TableCell>{service.active_users_count || 0}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        {service.status === 'inactive' ? (
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-8 w-8 text-green-600 hover:text-green-700 hover:bg-green-50"
                            onClick={() => handleServiceAction(service.id, 'start')}
                            disabled={actionLoading === `${service.id}-start`}
                            title="Start Service"
                          >
                            <Play className="w-4 h-4" />
                          </Button>
                        ) : (
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-8 w-8 text-amber-600 hover:text-amber-700 hover:bg-amber-50"
                            onClick={() => handleServiceAction(service.id, 'stop')}
                            disabled={actionLoading === `${service.id}-stop`}
                            title="Stop Service"
                          >
                            <Square className="w-4 h-4" />
                          </Button>
                        )}
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-8 w-8"
                          onClick={() => handleServiceAction(service.id, 'restart')}
                          disabled={actionLoading === `${service.id}-restart`}
                          title="Restart Service"
                        >
                          <RotateCw className={`w-4 h-4 ${actionLoading === `${service.id}-restart` ? 'animate-spin' : ''}`} />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8" title="View Logs">
                          <FileText className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
};

export default ServiceControlPanel;