import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext.jsx';
import { useLanguage } from '@/contexts/LanguageContext.jsx';
import pb from '@/lib/pocketbaseClient.js';
import UserProfileCard from '@/components/UserProfileCard.jsx';
import SocialNetworksSection from '@/components/SocialNetworksSection.jsx';

const UserProfilePage = () => {
  const { currentUser } = useAuth();
  const { getTranslation } = useLanguage();
  const navigate = useNavigate();
  
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUser = async () => {
      if (!currentUser?.id) return;
      try {
        const record = await pb.collection('users').getOne(currentUser.id, { $autoCancel: false });
        setUser(record);
      } catch (error) {
        console.error('Failed to fetch user profile:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchUser();
  }, [currentUser]);

  const handleUserUpdate = (updatedUser) => {
    setUser(updatedUser);
  };

  if (loading) {
    return (
      <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center bg-muted/30">
        <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-[calc(100vh-4rem)] flex flex-col items-center justify-center bg-muted/30 p-4">
        <h2 className="text-2xl font-bold mb-4">User not found</h2>
        <Button onClick={() => navigate('/')}>Return Home</Button>
      </div>
    );
  }

  return (
    <>
      <Helmet>
        <title>{`${getTranslation('user_profile') || 'User Profile'} - Todo sobre alltech`}</title>
      </Helmet>

      <div className="min-h-[calc(100vh-4rem)] py-12 bg-muted/30">
        <div className="container max-w-3xl mx-auto px-4 sm:px-6">
          
          <div className="mb-8">
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => navigate(-1)}
              className="mb-4 -ml-2 text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              {getTranslation('back') || 'Back'}
            </Button>
            <h1 className="text-3xl font-bold tracking-tight text-foreground">
              {getTranslation('profile') || 'Profile Settings'}
            </h1>
            <p className="text-muted-foreground mt-1">
              {getTranslation('profile_desc') || 'Manage your personal information and connected accounts.'}
            </p>
          </div>

          <div className="space-y-8">
            <UserProfileCard user={user} />
            <SocialNetworksSection user={user} onUpdate={handleUserUpdate} />
          </div>

        </div>
      </div>
    </>
  );
};

export default UserProfilePage;