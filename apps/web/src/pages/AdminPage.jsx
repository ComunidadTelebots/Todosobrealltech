import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet';
import { Link } from 'react-router-dom';
import pb from '@/lib/pocketbaseClient';
import apiServerClient from '@/lib/apiServerClient';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Users, Bot, Shield, Activity, Loader2, UserCheck, Network, Globe, ArrowRight, ShieldAlert } from 'lucide-react';
import { toast } from 'sonner';
import StatCard from '@/components/StatCard.jsx';
import SystemStatusModal from '@/components/SystemStatusModal.jsx';
import RecentActivitySection from '@/components/RecentActivitySection.jsx';
import UserManagementTable from '@/components/UserManagementTable.jsx';
import BlockedUsersPanel from '@/components/BlockedUsersPanel.jsx';
import BlockedUsersImportLog from '@/components/BlockedUsersImportLog.jsx';

const AdminPage = () => {
  const [users, setUsers] = useState([]);
  const [bots, setBots] = useState([]);
  const [onionWebs, setOnionWebs] = useState([]);
  const [onionLogs, setOnionLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [metrics, setMetrics] = useState({
    totalUsers: 0,
    activeUsers: 0,
    inactiveUsers: 0,
    newUsers7d: 0,
    totalBots: 0,
    activeBots: 0,
    inactiveBots: 0,
    newBots7d: 0,
    activityRate: 0,
    lastActivity: null,
    activeOnionWebs: 0,
    onionAccessesMonth: 0
  });

  const [recentActivity, setRecentActivity] = useState([]);

  const [isRoleModalOpen, setIsRoleModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [newRole, setNewRole] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);

  const [statusModal, setStatusModal] = useState({
    isOpen: false,
    title: '',
    data: [],
    type: 'users'
  });

  const fetchData = async () => {
    setLoading(true);
    try {
      const statsPromise = apiServerClient.fetch('/stats', {
        headers: { Authorization: `Bearer ${pb.authStore.token}` },
      }).then(async (response) => {
        const payload = await apiServerClient.readJson(response);
        if (!response.ok) throw new Error(payload.error || `HTTP ${response.status}`);
        return payload;
      });
      const [usersResult, botsResult, onionWebsResult, onionLogsResult, statsResult] = await Promise.allSettled([
        pb.collection('users').getFullList({ sort: '-created', $autoCancel: false }),
        pb.collection('bots').getFullList({ sort: '-created', expand: 'user_id', $autoCancel: false }),
        pb.collection('onion_webs').getFullList({ sort: '-created_at', $autoCancel: false }),
        pb.collection('onion_access_logs').getFullList({ sort: '-access_timestamp', $autoCancel: false }),
        statsPromise,
      ]);
      const usersList = usersResult.status === 'fulfilled' ? usersResult.value : [];
      const botsList = botsResult.status === 'fulfilled' ? botsResult.value : [];
      const onionWebsList = onionWebsResult.status === 'fulfilled' ? onionWebsResult.value : [];
      const onionLogsList = onionLogsResult.status === 'fulfilled' ? onionLogsResult.value : [];
      const serverStats = statsResult.status === 'fulfilled' ? statsResult.value : null;

      setUsers(usersList);
      setBots(botsList);
      setOnionWebs(onionWebsList);
      setOnionLogs(onionLogsList);

      const now = new Date();
      const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      
      const activeUsersList = usersList.filter(u => new Date(u.updated) >= sevenDaysAgo || u.verified);
      const newUsersList = usersList.filter(u => new Date(u.created) >= sevenDaysAgo);
      
      const activeBotsList = botsList.filter(b => b.estado === true);
      const inactiveBotsList = botsList.filter(b => b.estado === false);
      const newBotsList = botsList.filter(b => new Date(b.created) >= sevenDaysAgo);

      const activeOnionWebsList = onionWebsList.filter(w => w.enabled === true);
      const recentOnionLogs = onionLogsList.filter(l => new Date(l.access_timestamp) >= thirtyDaysAgo);

      const totalActive = activeUsersList.length + activeBotsList.length;
      const totalEntities = usersList.length + botsList.length;
      const activityRate = totalEntities > 0 ? Math.round((totalActive / totalEntities) * 100) : 0;

      const allDates = [...usersList.map(u => new Date(u.updated)), ...botsList.map(b => new Date(b.updated))];
      const lastActivityDate = allDates.length > 0 ? new Date(Math.max(...allDates)) : null;

      setMetrics({
        totalUsers: usersList.length,
        activeUsers: activeUsersList.length,
        inactiveUsers: usersList.length - activeUsersList.length,
        newUsers7d: newUsersList.length,
        totalBots: serverStats?.bots ?? botsList.length,
        activeBots: activeBotsList.length,
        inactiveBots: inactiveBotsList.length,
        newBots7d: newBotsList.length,
        activityRate,
        lastActivity: lastActivityDate,
        activeOnionWebs: serverStats?.onions?.active ?? activeOnionWebsList.length,
        onionAccessesMonth: serverStats?.onions?.accessesMonth ?? recentOnionLogs.length
      });

      const activities = [
        ...usersList.map(u => ({
          id: `u_${u.id}`,
          type: 'user_registered',
          title: 'New User Registered',
          description: u.email,
          meta: `Role: ${u.role || 'user'}`,
          date: u.created
        })),
        ...botsList.map(b => ({
          id: `b_${b.id}`,
          type: 'bot_created',
          title: 'New Bot Created',
          description: b.nombre,
          meta: `Creator ID: ${b.user_id}`,
          date: b.created
        })),
        ...onionWebsList.map(w => ({
          id: `o_${w.id}`,
          type: 'onion_created',
          title: 'New Onion Web',
          description: w.name,
          meta: `Privacy: ${w.privacy}`,
          date: w.created_at
        }))
      ].sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 15);

      setRecentActivity(activities);

    } catch (error) {
      console.error('Error fetching admin data:', error);
      toast.error('Failed to load admin data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleOpenRoleModal = (user) => {
    setSelectedUser(user);
    setNewRole(user.role || 'user');
    setIsRoleModalOpen(true);
  };

  const handleUpdateRole = async () => {
    if (!selectedUser || newRole !== 'admin' || pb.authStore.model?.role !== 'creator') return;
    const reason = window.prompt('Motivo de la elevación a administrador web:')?.trim();
    if (!reason) return;
    
    setIsUpdating(true);
    try {
      const response = await apiServerClient.fetch('/moonbot-admin/web-admin-invitations', {
        method: 'POST', headers: { Authorization: `Bearer ${pb.authStore.token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'elevate', account_id: selectedUser.id, role: 'admin', reason }),
      });
      const payload = await apiServerClient.readJson(response);
      if (!response.ok) throw new Error(payload.error || 'No se pudo elevar la cuenta');
      
      toast.success(`Role updated to ${newRole} for ${selectedUser.email}`);
      setIsRoleModalOpen(false);
      fetchData();
    } catch (error) {
      console.error('Error updating role:', error);
      toast.error('Failed to update user role');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDeleteUser = async (user) => {
    if (window.confirm(`Are you sure you want to delete user ${user.email}? This action cannot be undone.`)) {
      try {
        await pb.collection('users').delete(user.id, { $autoCancel: false });
        toast.success('User deleted successfully');
        fetchData();
      } catch (error) {
        console.error('Error deleting user:', error);
        toast.error('Failed to delete user');
      }
    }
  };

  const openStatusModal = (title, data, type) => {
    setStatusModal({
      isOpen: true,
      title,
      data,
      type
    });
  };

  if (loading) {
    return (
      <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading admin dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <Helmet>
        <title>Admin Dashboard - Todo sobre alltech</title>
        <meta name="description" content="System administration and user management." />
      </Helmet>

      <div className="min-h-[calc(100vh-4rem)] py-12 bg-muted/30">
        <div className="container max-w-7xl space-y-10">
          
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-4xl font-bold tracking-tight mb-2">Admin Dashboard</h1>
              <p className="text-muted-foreground text-lg">
                Comprehensive system overview, metrics, and user management.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <Button variant="outline" asChild>
                <Link to="/admin/onion-webs">
                  <Network className="w-4 h-4 mr-2" />
                  Onion Webs
                </Link>
              </Button>
              <Button variant="outline" asChild>
                <Link to="/admin/translations">
                  <Globe className="w-4 h-4 mr-2" />
                  Translations
                </Link>
              </Button>
            </div>
          </div>

          <Tabs defaultValue="overview" className="space-y-8">
            <TabsList className="grid w-full max-w-md grid-cols-2">
              <TabsTrigger value="overview">System Overview</TabsTrigger>
              <TabsTrigger value="blocked" className="data-[state=active]:text-destructive">
                <ShieldAlert className="w-4 h-4 mr-2" />
                Blocked Users
              </TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-8">
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <h2 className="text-2xl font-semibold tracking-tight">System Status</h2>
                  {metrics.lastActivity && (
                    <span className="text-sm text-muted-foreground flex items-center">
                      <Activity className="w-4 h-4 mr-2 text-green-500" />
                      Last active: {metrics.lastActivity.toLocaleTimeString()}
                    </span>
                  )}
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                  <StatCard
                    icon={Users}
                    title="Total Users"
                    value={metrics.totalUsers}
                    percentage={`+${metrics.newUsers7d} this week`}
                    trend="up"
                    status="default"
                    description="Total registered accounts"
                    onClick={() => openStatusModal('All Users', users, 'users')}
                  />
                  <StatCard
                    icon={UserCheck}
                    title="Active Users"
                    value={metrics.activeUsers}
                    percentage={`${Math.round((metrics.activeUsers / (metrics.totalUsers || 1)) * 100)}%`}
                    trend="neutral"
                    status="success"
                    description="Users active recently"
                    onClick={() => openStatusModal('Active Users', users.filter(u => u.verified || new Date(u.updated) >= new Date(Date.now() - 7*24*60*60*1000)), 'users')}
                  />
                  <StatCard
                    icon={Bot}
                    title="Total Bots"
                    value={metrics.totalBots}
                    percentage={`+${metrics.newBots7d} this week`}
                    trend="up"
                    status="default"
                    description="Total bot integrations"
                    onClick={() => openStatusModal('All Bots', bots, 'bots')}
                  />
                  <StatCard
                    icon={Network}
                    title="Active Onion Webs"
                    value={metrics.activeOnionWebs}
                    percentage={`${metrics.onionAccessesMonth} accesses/mo`}
                    trend="up"
                    status="success"
                    description="Running hidden services"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 space-y-8">
                  <Card className="flex flex-col">
                    <CardHeader>
                      <CardTitle>User Management</CardTitle>
                      <CardDescription>View and manage all registered users on the platform.</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <UserManagementTable 
                        users={users.slice(0, 5)} 
                        onUpdate={fetchData}
                        onDelete={handleDeleteUser}
                        onRoleChange={pb.authStore.model?.role === 'creator' ? handleOpenRoleModal : undefined}
                      />
                      {users.length > 5 && (
                        <div className="mt-4 text-center">
                          <Button variant="outline" onClick={() => openStatusModal('All Users', users, 'users')}>
                            View All {users.length} Users
                          </Button>
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  <Card className="flex flex-col">
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                      <div>
                        <CardTitle>Recent Onion Webs</CardTitle>
                        <CardDescription>Latest hidden services created on the platform.</CardDescription>
                      </div>
                      <Button variant="ghost" size="sm" asChild>
                        <Link to="/admin/onion-webs" className="flex items-center">
                          View All <ArrowRight className="ml-2 w-4 h-4" />
                        </Link>
                      </Button>
                    </CardHeader>
                    <CardContent>
                      {onionWebs.length === 0 ? (
                        <div className="text-center py-6 text-muted-foreground text-sm">
                          No onion webs created yet.
                        </div>
                      ) : (
                        <div className="space-y-4">
                          {onionWebs.slice(0, 5).map((web) => (
                            <div key={web.id} className="flex items-center justify-between p-3 rounded-lg border border-border/50 bg-muted/20">
                              <div className="flex items-center space-x-3">
                                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${web.enabled ? 'bg-[hsl(var(--onion-active))]/10 text-[hsl(var(--onion-active))]' : 'bg-muted text-muted-foreground'}`}>
                                  <Network className="w-4 h-4" />
                                </div>
                                <div>
                                  <p className="font-medium text-sm">{web.name}</p>
                                  <p className="text-xs text-muted-foreground font-mono truncate max-w-[200px] sm:max-w-[300px]">
                                    {web.onion_address}
                                  </p>
                                </div>
                              </div>
                              <Badge variant="outline" className={web.enabled ? "bg-[hsl(var(--onion-active))]/10 text-[hsl(var(--onion-active))] border-transparent" : "bg-muted text-muted-foreground border-transparent"}>
                                {web.enabled ? 'Active' : 'Inactive'}
                              </Badge>
                            </div>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>

                <div className="lg:col-span-1">
                  <RecentActivitySection activities={recentActivity} />
                </div>
              </div>
            </TabsContent>

            <TabsContent value="blocked" className="space-y-8">
              <BlockedUsersPanel />
              <BlockedUsersImportLog />
            </TabsContent>
          </Tabs>

        </div>
      </div>

      <Dialog open={isRoleModalOpen} onOpenChange={setIsRoleModalOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Change User Role</DialogTitle>
            <DialogDescription>
              Update the access level for {selectedUser?.email}.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Select Role</label>
              <Select value={newRole} onValueChange={setNewRole}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsRoleModalOpen(false)} disabled={isUpdating}>
              Cancel
            </Button>
            <Button onClick={handleUpdateRole} disabled={isUpdating}>
              {isUpdating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <SystemStatusModal 
        isOpen={statusModal.isOpen}
        onClose={() => setStatusModal(prev => ({ ...prev, isOpen: false }))}
        title={statusModal.title}
        data={statusModal.data}
        type={statusModal.type}
      />
    </>
  );
};

export default AdminPage;
