import React, { useEffect, useState } from 'react';
import { Helmet } from 'react-helmet';
import { useAuth } from '@/contexts/AuthContext.jsx';
import { useNavigate, Link } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { User, Mail, Shield, LogOut, Settings, Bot, ArrowRight, Users, Activity, FileText, MessageSquare } from 'lucide-react';
import pb from '@/lib/pocketbaseClient';

const DashboardPage = () => {
  const { currentUser, logout } = useAuth();
  const navigate = useNavigate();
  const [userData, setUserData] = useState(null);
  const [botStats, setBotStats] = useState({ total: 0, active: 0 });
  const [systemStats, setSystemStats] = useState({ users: 0, totalBots: 0 });
  const [blogStats, setBlogStats] = useState({ total: 0, pendingComments: 0, latest: [] });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDashboardData = async () => {
      if (currentUser?.id) {
        try {
          // Fetch user data
          const user = await pb.collection('users').getOne(currentUser.id, { $autoCancel: false });
          setUserData(user);

          // Fetch personal bot stats
          const bots = await pb.collection('bots').getFullList({
            filter: `user_id="${currentUser.id}"`,
            $autoCancel: false
          });
          
          setBotStats({
            total: bots.length,
            active: bots.filter(b => b.estado).length
          });

          // Fetch system stats if admin or creator
          if (user.role === 'admin' || user.role === 'creator') {
            const [usersList, allBotsList, postsList, commentsList] = await Promise.all([
              pb.collection('users').getList(1, 1, { $autoCancel: false }),
              pb.collection('bots').getList(1, 1, { $autoCancel: false }),
              pb.collection('blog_posts').getList(1, 3, { sort: '-created_at', $autoCancel: false }),
              pb.collection('blog_comments').getList(1, 1, { filter: 'approved=false', $autoCancel: false })
            ]);
            
            setSystemStats({
              users: usersList.totalItems,
              totalBots: allBotsList.totalItems
            });

            setBlogStats({
              total: postsList.totalItems,
              pendingComments: commentsList.totalItems,
              latest: postsList.items
            });
          }
        } catch (error) {
          console.error('Error fetching dashboard data:', error);
        }
      }
      setLoading(false);
    };

    fetchDashboardData();
  }, [currentUser]);

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  if (loading) {
    return (
      <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  const renderAdminContent = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <Card className="relative overflow-hidden group border-primary/20">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
        <CardHeader>
          <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4">
            <Shield className="w-6 h-6 text-primary" />
          </div>
          <CardTitle>Admin Control Panel</CardTitle>
          <CardDescription>Manage users, roles, and system settings</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between mb-6">
            <div>
              <p className="text-3xl font-bold text-foreground">{systemStats.users}</p>
              <p className="text-sm text-muted-foreground">Total Users</p>
            </div>
            <div className="text-right">
              <p className="text-3xl font-bold text-foreground">{systemStats.totalBots}</p>
              <p className="text-sm text-muted-foreground">Total Bots</p>
            </div>
          </div>
          <Button className="w-full group-hover:bg-primary/90 transition-colors" asChild>
            <Link to="/admin">
              Open Admin Dashboard
              <ArrowRight className="w-4 h-4 ml-2 transition-transform group-hover:translate-x-1" />
            </Link>
          </Button>
        </CardContent>
      </Card>

      <Card className="relative overflow-hidden group border-blue-500/20">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
        <CardHeader>
          <div className="w-12 h-12 rounded-xl bg-blue-500/10 flex items-center justify-center mb-4">
            <FileText className="w-6 h-6 text-blue-600" />
          </div>
          <CardTitle>Blog Management</CardTitle>
          <CardDescription>Manage articles and moderate comments</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between mb-6">
            <div>
              <p className="text-3xl font-bold text-foreground">{blogStats.total}</p>
              <p className="text-sm text-muted-foreground">Total Articles</p>
            </div>
            <div className="text-right">
              <p className={`text-3xl font-bold ${blogStats.pendingComments > 0 ? 'text-yellow-600' : 'text-foreground'}`}>
                {blogStats.pendingComments}
              </p>
              <p className="text-sm text-muted-foreground">Pending Comments</p>
            </div>
          </div>
          <Button className="w-full bg-blue-600 hover:bg-blue-700 text-white transition-colors" asChild>
            <Link to="/creator/blog">
              Manage Blog
              <ArrowRight className="w-4 h-4 ml-2 transition-transform group-hover:translate-x-1" />
            </Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );

  const renderUserContent = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <Card className="relative overflow-hidden group">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
        <CardHeader>
          <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4">
            <Bot className="w-6 h-6 text-primary" />
          </div>
          <CardTitle>My Bots</CardTitle>
          <CardDescription>Configure and monitor your automated integrations</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between mb-6">
            <div>
              <p className="text-3xl font-bold text-foreground">{botStats.total}</p>
              <p className="text-sm text-muted-foreground">Total Bots</p>
            </div>
            <div className="text-right">
              <p className="text-3xl font-bold text-green-600">{botStats.active}</p>
              <p className="text-sm text-muted-foreground">Active</p>
            </div>
          </div>
          <Button className="w-full group-hover:bg-primary/90 transition-colors" asChild>
            <Link to="/bots">
              View All Bots
              <ArrowRight className="w-4 h-4 ml-2 transition-transform group-hover:translate-x-1" />
            </Link>
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Account Status</CardTitle>
          <CardDescription>Your membership details</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            <div className="flex items-center justify-between p-4 rounded-lg bg-muted/50">
              <div>
                <p className="text-sm font-medium">Member Since</p>
                <p className="text-sm text-muted-foreground">
                  {new Date(userData?.created).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                </p>
              </div>
              <div className="w-10 h-10 rounded-full bg-background flex items-center justify-center shadow-sm">
                <CalendarIcon className="w-5 h-5 text-muted-foreground" />
              </div>
            </div>
            <div className="flex items-center justify-between p-4 rounded-lg bg-muted/50">
              <div>
                <p className="text-sm font-medium">Verification</p>
                <p className="text-sm text-muted-foreground">
                  {userData?.verified ? 'Fully verified' : 'Pending verification'}
                </p>
              </div>
              <div className={`w-10 h-10 rounded-full flex items-center justify-center shadow-sm ${userData?.verified ? 'bg-green-500/10' : 'bg-yellow-500/10'}`}>
                <Shield className={`w-5 h-5 ${userData?.verified ? 'text-green-600' : 'text-yellow-600'}`} />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );

  return (
    <>
      <Helmet>
        <title>{`Dashboard - ${currentUser?.name || 'User'} - Todo sobre alltech`}</title>
        <meta name="description" content="Manage your Todo sobre alltech account, view your profile information, and access personalized features." />
      </Helmet>

      <div className="min-h-[calc(100vh-4rem)] py-12 bg-muted/30">
        <div className="container max-w-6xl">
          <div className="mb-8">
            <div className="flex items-center space-x-3 mb-2">
              <h1 className="text-4xl font-bold tracking-tight">
                Welcome back, {userData?.name || 'User'}
              </h1>
              <Badge variant="outline" className="capitalize text-sm px-3 py-1">
                {userData?.role || 'user'}
              </Badge>
            </div>
            <p className="text-muted-foreground text-lg">
              Manage your account and explore your personalized dashboard
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <Card className="md:col-span-2">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <User className="w-5 h-5" />
                  <span>Profile Information</span>
                </CardTitle>
                <CardDescription>Your account details and settings</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div className="flex items-start space-x-3">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                      <User className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">Name</p>
                      <p className="text-sm text-muted-foreground">
                        {userData?.name || 'Not set'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start space-x-3">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                      <Mail className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">Email</p>
                      <p className="text-sm text-muted-foreground">{userData?.email}</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Quick Actions</CardTitle>
                <CardDescription>Manage your account</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button variant="outline" className="w-full justify-start" disabled>
                  <User className="w-4 h-4 mr-2" />
                  View Profile
                </Button>
                <Button variant="outline" className="w-full justify-start" disabled>
                  <Settings className="w-4 h-4 mr-2" />
                  Settings
                </Button>
                <Button
                  variant="outline"
                  className="w-full justify-start text-destructive hover:text-destructive hover:bg-destructive/10"
                  onClick={handleLogout}
                >
                  <LogOut className="w-4 h-4 mr-2" />
                  Logout
                </Button>
              </CardContent>
            </Card>
          </div>

          {(userData?.role === 'admin' || userData?.role === 'creator') && renderAdminContent()}
          {(userData?.role === 'user' || !userData?.role) && renderUserContent()}
        </div>
      </div>
    </>
  );
};

// Helper icon component for the dashboard
const CalendarIcon = (props) => (
  <svg
    {...props}
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <rect width="18" height="18" x="3" y="4" rx="2" ry="2" />
    <line x1="16" x2="16" y1="2" y2="6" />
    <line x1="8" x2="8" y1="2" y2="6" />
    <line x1="3" x2="21" y1="10" y2="10" />
  </svg>
);

export default DashboardPage;