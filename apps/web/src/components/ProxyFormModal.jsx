import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle, Loader2 } from 'lucide-react';

const ProxyFormModal = ({ isOpen, onClose, onSubmit, initialData = null }) => {
  const [formData, setFormData] = useState({
    proxy_url: '',
    proxy_type: 'HTTP',
    username: '',
    password: '',
    country: ''
  });
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      if (initialData) {
        setFormData({
          proxy_url: initialData.proxy_url || '',
          proxy_type: initialData.proxy_type || 'HTTP',
          username: initialData.username || '',
          password: initialData.password || '',
          country: initialData.country || ''
        });
      } else {
        setFormData({
          proxy_url: '',
          proxy_type: 'HTTP',
          username: '',
          password: '',
          country: ''
        });
      }
      setError('');
    }
  }, [isOpen, initialData]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (error) setError('');
  };

  const handleSelectChange = (value) => {
    setFormData(prev => ({ ...prev, proxy_type: value }));
    if (error) setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);

    try {
      await onSubmit(formData);
      onClose();
    } catch (err) {
      setError(err.message || 'An error occurred while saving the proxy.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !isSubmitting && onClose()}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{initialData ? 'Edit Proxy' : 'Add New Proxy'}</DialogTitle>
          <DialogDescription>
            Enter the details of your proxy server. The URL should be in host:port format.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-4">
          {error && (
            <Alert variant="destructive" className="bg-destructive/10 text-destructive border-destructive/20">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="space-y-2">
            <Label htmlFor="proxy_url">Proxy URL (host:port) <span className="text-destructive">*</span></Label>
            <Input
              id="proxy_url"
              name="proxy_url"
              placeholder="e.g., 192.168.1.1:8080"
              value={formData.proxy_url}
              onChange={handleChange}
              required
              className="font-mono text-sm"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="proxy_type">Protocol <span className="text-destructive">*</span></Label>
            <Select value={formData.proxy_type} onValueChange={handleSelectChange}>
              <SelectTrigger id="proxy_type">
                <SelectValue placeholder="Select protocol" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="HTTP">HTTP</SelectItem>
                <SelectItem value="HTTPS">HTTPS</SelectItem>
                <SelectItem value="SOCKS5">SOCKS5</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="username">Username (Optional)</Label>
              <Input
                id="username"
                name="username"
                placeholder="Auth username"
                value={formData.username}
                onChange={handleChange}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password (Optional)</Label>
              <Input
                id="password"
                name="password"
                type="password"
                placeholder="Auth password"
                value={formData.password}
                onChange={handleChange}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="country">Country (Optional)</Label>
            <Input
              id="country"
              name="country"
              placeholder="e.g., US, DE, FR"
              value={formData.country}
              onChange={handleChange}
              maxLength={2}
              className="uppercase"
            />
          </div>

          <DialogFooter className="pt-4">
            <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {initialData ? 'Save Changes' : 'Add Proxy'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default ProxyFormModal;