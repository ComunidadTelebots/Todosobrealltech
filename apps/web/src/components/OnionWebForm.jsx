import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import pb from '@/lib/pocketbaseClient.js';
import apiServerClient from '@/lib/apiServerClient.js';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Copy, Check, Shield, Globe, Link as LinkIcon } from 'lucide-react';
import { toast } from 'sonner';

const formSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  description: z.string().optional(),
  privacy: z.enum(['public', 'private']),
  enabled: z.boolean().default(true),
  redirect_url: z.string().url('Must be a valid URL').optional().or(z.literal('')),
});

const OnionWebForm = ({ initialData, onSuccess, onCancel }) => {
  const [onionAddress] = useState(initialData?.onion_address || '');
  const [copied, setCopied] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { register, handleSubmit, formState: { errors }, setValue, watch } = useForm({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: initialData?.name || '',
      description: initialData?.description || '',
      privacy: initialData?.privacy || 'private',
      enabled: initialData?.enabled ?? true,
      redirect_url: initialData?.redirect_url || '',
    }
  });

  const privacyValue = watch('privacy');
  const enabledValue = watch('enabled');

  const copyToClipboard = () => {
    if (!onionAddress) return;
    navigator.clipboard.writeText(onionAddress);
    setCopied(true);
    toast.success('Address copied to clipboard');
    setTimeout(() => setCopied(false), 2000);
  };

  const onSubmit = async (data) => {
    setIsSubmitting(true);
    try {
      console.log('--- Auth Token Debugging ---');
      console.log('Is Valid:', pb.authStore.isValid);
      console.log('Token exists:', pb.authStore.token ? 'YES' : 'NO');
      console.log('Token length:', pb.authStore.token?.length || 0);
      console.log('----------------------------');

      if (!pb.authStore.isValid || !pb.authStore.token) {
        toast.error('You must be logged in to create an Onion Web');
        setIsSubmitting(false);
        return;
      }

      if (initialData?.id) {
        await pb.collection('onion_webs').update(initialData.id, {
          ...data,
          owner_id: pb.authStore.model.id
        }, { $autoCancel: false });
        toast.success('Onion web updated successfully');
      } else {
        const token = pb.authStore.token;
        const headers = { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        };

        const response = await apiServerClient.fetch('/onion/generate', {
          method: 'POST',
          headers,
          body: JSON.stringify(data)
        });
        
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to generate onion web');
        }
        
        await response.json();
        toast.success('Onion web created successfully');
      }
      
      if (onSuccess) onSuccess();
    } catch (error) {
      console.error('Save error:', error);
      toast.error(error.message || 'Failed to save onion web');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="name">Web Name <span className="text-destructive">*</span></Label>
          <Input 
            id="name" 
            placeholder="e.g., Secure Vault" 
            {...register('name')} 
            className="text-foreground"
          />
          {errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}
        </div>

        <div className="space-y-2">
          <Label htmlFor="onion_address">.onion Address</Label>
          <div className="flex space-x-2">
            <div className="relative flex-1">
              <Input 
                id="onion_address" 
                value={initialData ? onionAddress : 'Generated automatically upon creation'} 
                readOnly 
                className={`font-mono text-sm bg-muted/50 pr-10 text-foreground ${!initialData ? 'italic text-muted-foreground' : ''}`}
              />
              {initialData && onionAddress && (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-1 top-1 h-7 w-7 text-muted-foreground hover:text-foreground"
                  onClick={copyToClipboard}
                >
                  {copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                </Button>
              )}
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="redirect_url">Redirect URL (Destination)</Label>
          <div className="relative">
            <LinkIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input 
              id="redirect_url" 
              placeholder="https://example.com" 
              {...register('redirect_url')} 
              className="pl-9 text-foreground"
            />
          </div>
          {errors.redirect_url && <p className="text-sm text-destructive">{errors.redirect_url.message}</p>}
          <p className="text-xs text-muted-foreground">Optional. Traffic to your .onion address will be redirected here.</p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="description">Description</Label>
          <Textarea 
            id="description" 
            placeholder="Brief description of this hidden service..." 
            {...register('description')}
            className="resize-none h-20 text-foreground"
          />
        </div>

        <div className="grid grid-cols-2 gap-6 pt-2">
          <div className="space-y-3">
            <Label>Privacy Level</Label>
            <Select value={privacyValue} onValueChange={(val) => setValue('privacy', val)}>
              <SelectTrigger>
                <SelectValue placeholder="Select privacy" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="private">
                  <div className="flex items-center">
                    <Shield className="w-4 h-4 mr-2 text-muted-foreground" />
                    Private (Invite Only)
                  </div>
                </SelectItem>
                <SelectItem value="public">
                  <div className="flex items-center">
                    <Globe className="w-4 h-4 mr-2 text-muted-foreground" />
                    Public (Discoverable)
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-3">
            <Label>Status</Label>
            <div className="flex items-center space-x-3 h-10 px-3 rounded-md border border-border/50 bg-muted/20">
              <Switch 
                checked={enabledValue} 
                onCheckedChange={(val) => setValue('enabled', val)} 
              />
              <span className="text-sm font-medium">
                {enabledValue ? 'Active' : 'Inactive'}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="flex justify-end space-x-3 pt-4 border-t border-border/50">
        <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting}>
          Cancel
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
          {initialData ? 'Save Changes' : 'Create Onion Web'}
        </Button>
      </div>
    </form>
  );
};

export default OnionWebForm;