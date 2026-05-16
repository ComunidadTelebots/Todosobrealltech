import { useState, useCallback } from 'react';
import pb from '@/lib/pocketbaseClient.js';
import apiServerClient from '@/lib/apiServerClient.js';
import { toast } from 'sonner';

export const useProxyManagement = (userId) => {
  const [proxies, setProxies] = useState([]);
  const [loading, setLoading] = useState(false);

  const fetchProxies = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    try {
      const records = await pb.collection('user_proxies').getFullList({
        filter: `user_id="${userId}"`,
        sort: '-created',
        $autoCancel: false
      });
      setProxies(records);
    } catch (error) {
      console.error('Error fetching user proxies:', error);
      toast.error('Failed to load your proxies.');
    } finally {
      setLoading(false);
    }
  }, [userId]);

  const validateProxyData = (data) => {
    const errors = [];
    
    // Basic URL/IP:Port validation
    const urlPattern = /^([a-zA-Z0-9.-]+):([0-9]{1,5})$/;
    if (!data.proxy_url) {
      errors.push('Proxy URL is required.');
    } else if (!urlPattern.test(data.proxy_url)) {
      errors.push('Invalid format. Use host:port (e.g., 192.168.1.1:8080).');
    } else {
      const [, , portStr] = data.proxy_url.match(urlPattern);
      const port = parseInt(portStr, 10);
      if (port < 1 || port > 65535) {
        errors.push('Port must be between 1 and 65535.');
      }
    }

    if (!data.proxy_type) {
      errors.push('Proxy type is required.');
    }

    return errors;
  };

  const checkDuplicate = async (proxyUrl, excludeId = null) => {
    try {
      let filter = `user_id="${userId}" && proxy_url="${proxyUrl}"`;
      if (excludeId) {
        filter += ` && id!="${excludeId}"`;
      }
      const existing = await pb.collection('user_proxies').getList(1, 1, {
        filter,
        $autoCancel: false
      });
      return existing.items.length > 0;
    } catch (error) {
      console.error('Error checking duplicate:', error);
      return false;
    }
  };

  const addProxy = async (proxyData) => {
    const errors = validateProxyData(proxyData);
    if (errors.length > 0) throw new Error(errors.join(' '));

    const isDuplicate = await checkDuplicate(proxyData.proxy_url);
    if (isDuplicate) throw new Error('A proxy with this URL already exists in your list.');

    try {
      const record = await pb.collection('user_proxies').create({
        ...proxyData,
        user_id: userId,
        status: 'testing'
      }, { $autoCancel: false });
      
      setProxies(prev => [record, ...prev]);
      toast.success('Proxy added successfully.');
      return record;
    } catch (error) {
      console.error('Error adding proxy:', error);
      throw new Error(error.message || 'Failed to add proxy.');
    }
  };

  const updateProxy = async (id, proxyData) => {
    const errors = validateProxyData(proxyData);
    if (errors.length > 0) throw new Error(errors.join(' '));

    const isDuplicate = await checkDuplicate(proxyData.proxy_url, id);
    if (isDuplicate) throw new Error('A proxy with this URL already exists in your list.');

    try {
      const record = await pb.collection('user_proxies').update(id, proxyData, { $autoCancel: false });
      setProxies(prev => prev.map(p => p.id === id ? record : p));
      toast.success('Proxy updated successfully.');
      return record;
    } catch (error) {
      console.error('Error updating proxy:', error);
      throw new Error(error.message || 'Failed to update proxy.');
    }
  };

  const deleteProxy = async (id) => {
    try {
      await pb.collection('user_proxies').delete(id, { $autoCancel: false });
      setProxies(prev => prev.filter(p => p.id !== id));
      toast.success('Proxy deleted successfully.');
    } catch (error) {
      console.error('Error deleting proxy:', error);
      throw new Error('Failed to delete proxy.');
    }
  };

  const testProxyConnection = async (proxy) => {
    try {
      // Optimistically set status to testing
      setProxies(prev => prev.map(p => p.id === proxy.id ? { ...p, status: 'testing' } : p));
      
      const response = await apiServerClient.fetch('/test-proxy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          proxy_url: proxy.proxy_url,
          proxy_type: proxy.proxy_type.toLowerCase(),
          username: proxy.username,
          password: proxy.password
        })
      });

      const data = await response.json();
      
      const status = response.ok && data.success ? 'active' : 'inactive';
      const testResult = response.ok && data.success 
        ? `Success (${data.responseTime}ms)` 
        : (data.error || data.message || 'Connection failed');

      const updatedRecord = await pb.collection('user_proxies').update(proxy.id, {
        status,
        last_tested: new Date().toISOString(),
        test_result: testResult
      }, { $autoCancel: false });

      setProxies(prev => prev.map(p => p.id === proxy.id ? updatedRecord : p));
      
      if (status === 'active') {
        toast.success(`Proxy test successful (${data.responseTime}ms)`);
      } else {
        toast.error(`Proxy test failed: ${testResult}`);
      }
      
      return updatedRecord;
    } catch (error) {
      console.error('Error testing proxy:', error);
      
      const updatedRecord = await pb.collection('user_proxies').update(proxy.id, {
        status: 'inactive',
        last_tested: new Date().toISOString(),
        test_result: error.message || 'Network error'
      }, { $autoCancel: false });
      
      setProxies(prev => prev.map(p => p.id === proxy.id ? updatedRecord : p));
      toast.error(`Proxy test failed: ${error.message}`);
      return updatedRecord;
    }
  };

  return {
    proxies,
    loading,
    fetchProxies,
    addProxy,
    updateProxy,
    deleteProxy,
    testProxyConnection
  };
};