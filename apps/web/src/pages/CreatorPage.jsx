import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet';
import pb from '@/lib/pocketbaseClient.js';
import { useAuditLog } from '@/hooks/useAuditLog.js';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Crown, Users, Shield, Activity, ArrowUpCircle, ArrowDownCircle, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import StatCard from '@/components/StatCard.jsx';
import BotManagementSection from '@/components/BotManagementSection.jsx';
import UserManagementSection from '@/components/UserManagementSection.jsx';

const CreatorPage = () => {
  const [users, setUsers] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const { logAction } = useAuditLog();

  const fetchData = async () => {
    setLoading(true);
    try {
      const [usersList, logsList] = await Promise.all([
        pb.collection('users').getFullList({ sort: '-created', $autoCancel: false }),
        pb.collection('audit_logs').getList(1, 50, { sort: '-created', expand: 'performed_by', $autoCancel: false })
      ]);

      setUsers(usersList);
      setAuditLogs(logsList.items);
    } catch (error) {
      console.error('Error fetching creator data:', error);
      toast.error('Failed to load creator dashboard data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleRoleChange = async (user, newRole) => {
    try {
      await pb.collection('users').update(user.id, { role: newRole }, { $autoCancel: false });
      await logAction({
        action_type: 'role_change',
        affected_user: user.id,
        details: `Changed role from ${user.role} to ${newRole}`
      });
      toast.success(`Updated ${user.email} to ${newRole}`);
      fetchData();
    } catch (error) {
      toast.error('Failed to update role');
    }
  };

  const handleDeleteUser = async (user) => {
    if (window.confirm(`Delete user ${user.email}? This is permanent.`)) {
      try {
        await pb.collection('users').delete(user.id, { $autoCancel: false });
        await logAction({
          action_type: 'user_deleted',
          affected_user: user.id,
          details: `Deleted user ${user.email}`
        });
        toast.success('User deleted');
        fetchData();
      } catch (error) {
        toast.error('Failed to delete user');
      }
    }
  };

  const admins = users.filter(u => u.role === 'admin');
  const regularUsers = users.filter(u => u.role !== 'admin' && u.role !== 'creator');

  if (loading) {
    return (
      <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center">
        <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <>
      <Helmet>
        <title>Creator Dashboard - Todo sobre alltech</title>
      </Helmet>

      <div className="min-h-[calc(100vh-4rem)] py-12 bg-muted/30">
        <div className="container max-w-7xl space-y-8">
          
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 rounded-xl bg-yellow-500/20 flex items-center justify-center">
              <Crown className="w-6 h-6 text-yellow-600" />
            </div>
            <div>
              <h1 className="text-4xl font-bold tracking-tight">Creator Panel</h1>
              <p className="text-muted-foreground">Master control for the entire platform.</p>
            </div>
          </div>

          <Tabs defaultValue="dashboard" className="space-y-6">
            <TabsList className="grid grid-cols-2 md:grid-cols-6 h-auto">
              <TabsTrigger value="dashboard" className="py-3">Dashboard</TabsTrigger>
              <TabsTrigger value="admins" className="py-3">Admins</TabsTrigger>
              <TabsTrigger value="users" className="py-3">Users</TabsTrigger>
              <TabsTrigger value="bots" className="py-3">Bots</TabsTrigger>
              <TabsTrigger value="audit" className="py-3">Audit Logs</TabsTrigger>
              <TabsTrigger value="settings" className="py-3">Settings</TabsTrigger>
            </TabsList>

            <TabsContent value="dashboard" className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <StatCard icon={Users} title="Total Users" value={users.length} status="default" />
                <StatCard icon={Shield} title="Total Admins" value={admins.length} status="success" />
                <StatCard icon={Activity} title="System Health" value="100%" status="success" />
              </div>
            </TabsContent>

            <TabsContent value="admins">
              <Card>
                <CardHeader>
                  <CardTitle>Admin Management</CardTitle>
                  <CardDescription>Manage platform administrators.</CardDescription>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Joined</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {admins.map(admin => (
                        <TableRow key={admin.id}>
                          <TableCell className="font-medium">{admin.name || 'N/A'}</TableCell>
                          <TableCell>{admin.email}</TableCell>
                          <TableCell>{new Date(admin.created).toLocaleDateString()}</TableCell>
                          <TableCell className="text-right space-x-2">
                            <Button variant="outline" size="sm" onClick={() => handleRoleChange(admin, 'user')}>
                              <ArrowDownCircle className="w-4 h-4 mr-2" /> Demote
                            </Button>
                            <Button variant="destructive" size="sm" onClick={() => handleDeleteUser(admin)}>
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                      {admins.length === 0 && (
                        <TableRow><TableCell colSpan={4} className="text-center py-4">No admins found.</TableCell></TableRow>
                      )}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="users">
              <UserManagementSection 
                users={regularUsers} 
                onUpdate={fetchData}
                onDelete={handleDeleteUser}
                onRoleChange={(user) => handleRoleChange(user, 'admin')}
              />
            </TabsContent>

            <TabsContent value="bots">
              <BotManagementSection />
            </TabsContent>

            <TabsContent value="audit">
              <Card>
                <CardHeader>
                  <CardTitle>System Audit Logs</CardTitle>
                  <CardDescription>Recent administrative and system actions.</CardDescription>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Timestamp</TableHead>
                        <TableHead>Action</TableHead>
                        <TableHead>Performed By</TableHead>
                        <TableHead>Details</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {auditLogs.map(log => (
                        <TableRow key={log.id}>
                          <TableCell className="text-sm text-muted-foreground">
                            {new Date(log.created).toLocaleString()}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className="capitalize">
                              {log.action_type.replace('_', ' ')}
                            </Badge>
                          </TableCell>
                          <TableCell className="font-mono text-xs">
                            {log.expand?.performed_by?.email || log.performed_by}
                          </TableCell>
                          <TableCell className="text-sm">{log.details}</TableCell>
                        </TableRow>
                      ))}
                      {auditLogs.length === 0 && (
                        <TableRow><TableCell colSpan={4} className="text-center py-4">No logs found.</TableCell></TableRow>
                      )}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="settings">
              <Card>
                <CardHeader>
                  <CardTitle>General Web Settings</CardTitle>
                  <CardDescription>Global configuration options.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="p-4 border rounded-lg bg-muted/50 text-center text-muted-foreground">
                    Settings configuration coming soon.
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

          </Tabs>
        </div>
      </div>
    </>
  );
};

export default CreatorPage;