import { useState, useEffect, useCallback } from 'react';
import pb from '@/lib/pocketbaseClient.js';

let cachedBlockedUsers = null;
let lastFetchTime = 0;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

export const useBlockedUsers = () => {
  const [blockedUsers, setBlockedUsers] = useState(cachedBlockedUsers || []);
  const [loading, setLoading] = useState(!cachedBlockedUsers);

  const fetchBlockedUsers = useCallback(async (force = false) => {
    const now = Date.now();
    if (!force && cachedBlockedUsers && (now - lastFetchTime < CACHE_DURATION)) {
      setBlockedUsers(cachedBlockedUsers);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const records = await pb.collection('blocked_users').getFullList({
        filter: 'is_active=true',
        $autoCancel: false
      });
      cachedBlockedUsers = records;
      lastFetchTime = now;
      setBlockedUsers(records);
    } catch (error) {
      console.error('Failed to fetch blocked users:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBlockedUsers();
  }, [fetchBlockedUsers]);

  const isUserBlocked = useCallback((userId) => {
    return blockedUsers.some(user => user.user_id === userId);
  }, [blockedUsers]);

  return { 
    blockedUsers, 
    isUserBlocked, 
    loading, 
    refresh: () => fetchBlockedUsers(true) 
  };
};