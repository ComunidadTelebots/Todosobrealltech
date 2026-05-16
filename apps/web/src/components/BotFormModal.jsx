import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2 } from 'lucide-react';

const BotFormModal = ({ isOpen, onClose, bot, onSubmit }) => {
  const [formData, setFormData] = useState({
    nombre: '',
    descripcion: '',
    token: '',
    tipo: 'standard'
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (bot) {
      setFormData({
        nombre: bot.nombre || '',
        descripcion: bot.descripcion || '',
        token: bot.token || '',
        tipo: 'standard'
      });
    } else {
      setFormData({
        nombre: '',
        descripcion: '',
        token: '',
        tipo: 'standard'
      });
    }
  }, [bot, isOpen]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await onSubmit(formData);
      onClose();
    } catch (error) {
      // Error handled by hook
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{bot ? 'Edit Bot' : 'Create New Bot'}</DialogTitle>
          <DialogDescription>
            {bot ? 'Update the configuration for this bot.' : 'Fill in the details to create a new bot.'}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="nombre">Bot Name <span className="text-destructive">*</span></Label>
            <Input 
              id="nombre" 
              name="nombre" 
              value={formData.nombre} 
              onChange={handleChange} 
              required 
              placeholder="e.g., Customer Support Bot"
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="descripcion">Description</Label>
            <Textarea 
              id="descripcion" 
              name="descripcion" 
              value={formData.descripcion} 
              onChange={handleChange} 
              placeholder="What does this bot do?"
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="token">API Token <span className="text-destructive">*</span></Label>
            <Input 
              id="token" 
              name="token" 
              value={formData.token} 
              onChange={handleChange} 
              required 
              type="password"
              placeholder="Enter bot token"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="tipo">Bot Type</Label>
            <Select value={formData.tipo} onValueChange={(val) => setFormData(prev => ({ ...prev, tipo: val }))}>
              <SelectTrigger>
                <SelectValue placeholder="Select type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="standard">Standard</SelectItem>
                <SelectItem value="ai">AI Powered</SelectItem>
                <SelectItem value="automation">Automation</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <DialogFooter className="pt-4">
            <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {bot ? 'Save Changes' : 'Create Bot'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default BotFormModal;