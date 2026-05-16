import { useCallback } from 'react';
import pb from '@/lib/pocketbaseClient';
import { useAuth } from '@/contexts/AuthContext.jsx';

export const useAuditLog = () => {
  const { currentUser } = useAuth();

  const logAction = useCallback(async ({ action_type, affected_user = '', affected_bot = '', details = '' }) => {
    if (!currentUser) return;
    
    try {
      await pb.collection('audit_logs').create({
        action_type,
        performed_by: currentUser.id,
        affected_user,
        affected_bot,
        details
      }, { $autoCancel: false });
    } catch (error) {
      console.error('Failed to write audit log:', error);
    }
  }, [currentUser]);

  return { logAction };
};