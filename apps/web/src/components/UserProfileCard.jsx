import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { CalendarDays, Mail, User } from 'lucide-react';
import pb from '@/lib/pocketbaseClient.js';
import { useLanguage } from '@/contexts/LanguageContext.jsx';

const UserProfileCard = ({ user }) => {
  const { getTranslation } = useLanguage();
  
  if (!user) return null;

  const avatarUrl = user.avatar ? pb.files.getUrl(user, user.avatar) : '';
  const initials = (user.name || user.email || '?').charAt(0).toUpperCase();
  const joinDate = new Date(user.created).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  return (
    <Card className="overflow-hidden border-none shadow-lg">
      <div className="h-32 bg-gradient-to-r from-primary/20 to-primary/5 w-full"></div>
      <CardContent className="relative pt-0 pb-8 px-6 sm:px-10">
        <div className="flex flex-col sm:flex-row gap-6 items-center sm:items-end -mt-12 sm:-mt-16 mb-6">
          <Avatar className="w-24 h-24 sm:w-32 sm:h-32 border-4 border-background shadow-sm rounded-2xl">
            <AvatarImage src={avatarUrl} alt={user.name || user.email} className="object-cover" />
            <AvatarFallback className="text-3xl sm:text-4xl font-semibold rounded-2xl bg-primary/10 text-primary">
              {initials}
            </AvatarFallback>
          </Avatar>
          <div className="text-center sm:text-left flex-1 pb-2">
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
              {user.name || getTranslation('unnamed_user') || 'Unnamed User'}
            </h2>
            <div className="flex items-center justify-center sm:justify-start gap-2 text-muted-foreground mt-1">
              <span className="inline-flex items-center gap-1.5 text-sm font-medium px-2.5 py-0.5 rounded-full bg-secondary text-secondary-foreground capitalize">
                {user.role}
              </span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mt-8">
          <div className="flex items-center gap-3 p-4 rounded-xl bg-muted/50">
            <div className="p-2 bg-background rounded-lg shadow-sm">
              <Mail className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                {getTranslation('email') || 'Email Address'}
              </p>
              <p className="text-sm font-medium text-foreground truncate">
                {user.email}
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-3 p-4 rounded-xl bg-muted/50">
            <div className="p-2 bg-background rounded-lg shadow-sm">
              <CalendarDays className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                {getTranslation('registered') || 'Registered'}
              </p>
              <p className="text-sm font-medium text-foreground">
                {joinDate}
              </p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default UserProfileCard;