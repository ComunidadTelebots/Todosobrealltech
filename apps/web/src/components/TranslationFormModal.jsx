import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import pb from '@/lib/pocketbaseClient';

const TranslationFormModal = ({ isOpen, onClose, translation, onSuccess }) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    key: '',
    es: '',
    en: '',
    pt: '',
    fr: '',
    de: ''
  });

  useEffect(() => {
    if (translation) {
      setFormData({
        key: translation.key || '',
        es: translation.es || '',
        en: translation.en || '',
        pt: translation.pt || '',
        fr: translation.fr || '',
        de: translation.de || ''
      });
    } else {
      setFormData({ key: '', es: '', en: '', pt: '', fr: '', de: '' });
    }
  }, [translation, isOpen]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.key.trim()) {
      toast.error('Translation key is required');
      return;
    }

    setIsSubmitting(true);
    try {
      if (translation?.id) {
        await pb.collection('translations').update(translation.id, formData, { $autoCancel: false });
        toast.success('Translation updated successfully');
      } else {
        await pb.collection('translations').create(formData, { $autoCancel: false });
        toast.success('Translation created successfully');
      }
      onSuccess();
      onClose();
    } catch (error) {
      console.error('Translation save error:', error);
      toast.error(error.message || 'Failed to save translation');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[500px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>{translation ? 'Edit Translation' : 'Add Translation'}</DialogTitle>
            <DialogDescription>
              {translation ? 'Update the translation values below.' : 'Create a new translation key and its values.'}
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="key">Translation Key <span className="text-destructive">*</span></Label>
              <Input 
                id="key" 
                name="key" 
                value={formData.key} 
                onChange={handleChange} 
                placeholder="e.g., nav.home" 
                disabled={!!translation}
                className="font-mono text-sm"
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="es">Español (ES)</Label>
                <Input id="es" name="es" value={formData.es} onChange={handleChange} placeholder="Spanish translation" />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="en">English (EN)</Label>
                <Input id="en" name="en" value={formData.en} onChange={handleChange} placeholder="English translation" />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="pt">Português (PT)</Label>
                <Input id="pt" name="pt" value={formData.pt} onChange={handleChange} placeholder="Portuguese translation" />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="fr">Français (FR)</Label>
                <Input id="fr" name="fr" value={formData.fr} onChange={handleChange} placeholder="French translation" />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="de">Deutsch (DE)</Label>
                <Input id="de" name="de" value={formData.de} onChange={handleChange} placeholder="German translation" />
              </div>
            </div>
          </div>
          
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {translation ? 'Save Changes' : 'Create Translation'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default TranslationFormModal;