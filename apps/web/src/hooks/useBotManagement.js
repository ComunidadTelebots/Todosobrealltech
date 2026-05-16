import { useState, useCallback } from 'react';
import pb from '@/lib/pocketbaseClient';
import { toast } from 'sonner';

export const useBotManagement = () => {
  const [bots, setBots] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchAllBots = useCallback(async (searchTerm = '', statusFilter = 'all') => {
    setLoading(true);
    setError(null);
    try {
      let filter = '';
      const filters = [];
      
      if (searchTerm) {
        filters.push(`nombre ~ "${searchTerm}"`);
      }
      
      if (statusFilter !== 'all') {
        filters.push(`estado = ${statusFilter === 'active'}`);
      }
      
      if (filters.length > 0) {
        filter = filters.join(' && ');
      }

      const records = await pb.collection('bots').getList(1, 500, {
        filter,
        sort: '-created',
        expand: 'user_id',
        $autoCancel: false
      });
      
      setBots(records.items);
      return records.items;
    } catch (err) {
      console.error('Error fetching bots:', err);
      setError(err.message);
      toast.error('Failed to fetch bots');
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  const createBot = async (data) => {
    try {
      const record = await pb.collection('bots').create({
        ...data,
        user_id: pb.authStore.model.id,
        estado: true
      }, { $autoCancel: false });
      toast.success('Bot created successfully');
      return record;
    } catch (err) {
      console.error('Error creating bot:', err);
      toast.error('Failed to create bot');
      throw err;
    }
  };

  const updateBot = async (id, data) => {
    try {
      const record = await pb.collection('bots').update(id, data, { $autoCancel: false });
      toast.success('Bot updated successfully');
      return record;
    } catch (err) {
      console.error('Error updating bot:', err);
      toast.error('Failed to update bot');
      throw err;
    }
  };

  const deleteBot = async (id) => {
    try {
      await pb.collection('bots').delete(id, { $autoCancel: false });
      toast.success('Bot deleted successfully');
      return true;
    } catch (err) {
      console.error('Error deleting bot:', err);
      toast.error('Failed to delete bot');
      throw err;
    }
  };

  const getBotDetails = async (id) => {
    try {
      return await pb.collection('bots').getOne(id, {
        expand: 'user_id',
        $autoCancel: false
      });
    } catch (err) {
      console.error('Error fetching bot details:', err);
      toast.error('Failed to fetch bot details');
      throw err;
    }
  };

  const getBotStatistics = async (id) => {
    // Mock statistics for now as we don't have a dedicated stats collection
    return {
      dailyUsage: Array.from({ length: 7 }).map((_, i) => ({
        date: new Date(Date.now() - i * 24 * 60 * 60 * 1000).toLocaleDateString(),
        users: Math.floor(Math.random() * 100),
        messages: Math.floor(Math.random() * 500)
      })).reverse(),
      totalUsers: Math.floor(Math.random() * 1000),
      activeUsers: Math.floor(Math.random() * 200)
    };
  };

  return {
    bots,
    loading,
    error,
    fetchAllBots,
    createBot,
    updateBot,
    deleteBot,
    getBotDetails,
    getBotStatistics
  };
};