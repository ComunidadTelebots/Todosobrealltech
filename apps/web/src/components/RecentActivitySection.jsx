import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { UserPlus, Bot, ShieldAlert, Clock } from 'lucide-react';

const RecentActivitySection = ({ activities = [] }) => {
  const getIcon = (type) => {
    switch (type) {
      case 'user_registered':
        return <UserPlus className="w-4 h-4 text-blue-600" />;
      case 'bot_created':
        return <Bot className="w-4 h-4 text-green-600" />;
      case 'admin_action':
        return <ShieldAlert className="w-4 h-4 text-purple-600" />;
      default:
        return <Clock className="w-4 h-4 text-muted-foreground" />;
    }
  };

  const getBgColor = (type) => {
    switch (type) {
      case 'user_registered': return 'bg-blue-500/10';
      case 'bot_created': return 'bg-green-500/10';
      case 'admin_action': return 'bg-purple-500/10';
      default: return 'bg-muted';
    }
  };

  const formatTimeAgo = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const seconds = Math.floor((now - date) / 1000);
    
    if (seconds < 60) return 'just now';
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    if (days < 7) return `${days}d ago`;
    
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent Activity</CardTitle>
        <CardDescription>Latest events across the platform</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {activities.length === 0 ? (
            <div className="text-center py-6 text-muted-foreground">
              No recent activity found.
            </div>
          ) : (
            <div className="relative before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-border before:to-transparent">
              {activities.map((activity, index) => (
                <div key={activity.id || index} className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active mb-8 last:mb-0">
                  <div className={`flex items-center justify-center w-10 h-10 rounded-full border-4 border-background shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 shadow-sm z-10 ${getBgColor(activity.type)}`}>
                    {getIcon(activity.type)}
                  </div>
                  
                  <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] p-4 rounded-xl border bg-card shadow-sm transition-all hover:shadow-md">
                    <div className="flex items-center justify-between mb-1">
                      <h4 className="font-semibold text-sm">{activity.title}</h4>
                      <span className="text-xs font-medium text-muted-foreground flex items-center">
                        <Clock className="w-3 h-3 mr-1" />
                        {formatTimeAgo(activity.date)}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {activity.description}
                    </p>
                    {activity.meta && (
                      <div className="mt-2 pt-2 border-t text-xs text-muted-foreground">
                        {activity.meta}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default RecentActivitySection;