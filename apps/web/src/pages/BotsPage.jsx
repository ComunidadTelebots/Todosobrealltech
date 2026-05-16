import React, { useState, useEffect, useCallback } from 'react';
import { Helmet } from 'react-helmet';
import pb from '@/lib/pocketbaseClient.js';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Plus, Bot, AlertCircle, RefreshCw } from 'lucide-react';
import BotCard from '@/components/BotCard.jsx';
import BotFormModal from '@/components/BotFormModal.jsx';

const BotsPage = () => {
  const [bots, setBots] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingBot, setEditingBot] = useState(null);

  const fetchBots = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    console.log('Fetching bots from PocketBase...');
    
    try {
      // Fetch all bots without filtering by user_id
      const result = await pb.collection('bots').getList(1, 50, {
        sort: '-created',
        $autoCancel: false
      });
      
      console.log('Raw response from pb.collection("bots").getList():', result);
      console.log('Number of records received:', result.items.length);
      
      result.items.forEach((bot, index) => {
        console.log(`Bot data [${index}]:`, bot);
      });

      setBots(result.items);
    } catch (err) {
      console.error('Error fetching bots:', err);
      setError(err.message || 'Failed to load bots. Please try again.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBots();
  }, [fetchBots]);

  const handleOpenCreateModal = () => {
    setEditingBot(null);
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (bot) => {
    setEditingBot(bot);
    setIsModalOpen(true);
  };

  const handleModalClose = () => {
    setIsModalOpen(false);
    setTimeout(() => setEditingBot(null), 200); // Clear after animation
  };

  return (
    <>
      <Helmet>
        <title>Bot Directory - Todo sobre alltech</title>
        <meta name="description" content="Browse and manage all available bots in the platform." />
      </Helmet>

      <div className="min-h-[calc(100vh-4rem)] py-12 bg-muted/30">
        <div className="container max-w-7xl">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
            <div>
              <h1 className="text-3xl font-bold tracking-tight text-balance">Bot Directory</h1>
              <p className="text-muted-foreground mt-1 text-balance">
                Discover, manage, and interact with all available bots on the platform.
              </p>
            </div>
            <Button onClick={handleOpenCreateModal} className="shrink-0 shadow-sm">
              <Plus className="w-4 h-4 mr-2" />
              Create New Bot
            </Button>
          </div>

          {error ? (
            <div className="flex flex-col items-center justify-center py-16 px-4 text-center bg-card rounded-2xl border shadow-sm">
              <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center mb-4">
                <AlertCircle className="w-8 h-8 text-destructive" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Failed to load bots</h3>
              <p className="text-muted-foreground mb-6 max-w-md">
                {error}
              </p>
              <Button onClick={fetchBots} variant="outline">
                <RefreshCw className="w-4 h-4 mr-2" />
                Try Again
              </Button>
            </div>
          ) : loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div key={i} className="rounded-2xl border bg-card p-6 flex flex-col h-[280px]">
                  <div className="flex items-start space-x-4 mb-6">
                    <Skeleton className="w-12 h-12 rounded-xl shrink-0" />
                    <div className="space-y-2 flex-1 pt-1">
                      <Skeleton className="h-5 w-3/4" />
                      <Skeleton className="h-3 w-1/2" />
                    </div>
                  </div>
                  <div className="space-y-2 mb-auto">
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-5/6" />
                  </div>
                  <div className="grid grid-cols-2 gap-3 mt-6 mb-4">
                    <Skeleton className="h-12 w-full rounded-lg" />
                    <Skeleton className="h-12 w-full rounded-lg" />
                  </div>
                  <Skeleton className="h-10 w-full mt-auto" />
                </div>
              ))}
            </div>
          ) : bots.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-24 px-4 text-center bg-card rounded-2xl border shadow-sm">
              <div className="w-20 h-20 rounded-2xl bg-primary/10 flex items-center justify-center mb-6">
                <Bot className="w-10 h-10 text-primary" />
              </div>
              <h3 className="text-2xl font-semibold mb-2">No bots found</h3>
              <p className="text-muted-foreground mb-8 max-w-md">
                There are currently no bots available in the directory. Be the first to create one!
              </p>
              <Button onClick={handleOpenCreateModal} size="lg">
                <Plus className="w-5 h-5 mr-2" />
                Create a Bot
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {bots.map((bot) => (
                <BotCard 
                  key={bot.id} 
                  bot={bot} 
                  onEdit={handleOpenEditModal}
                  onDeleteSuccess={fetchBots}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      <BotFormModal 
        isOpen={isModalOpen} 
        onClose={handleModalClose} 
        bot={editingBot}
        onSuccess={fetchBots}
      />
    </>
  );
};

export default BotsPage;