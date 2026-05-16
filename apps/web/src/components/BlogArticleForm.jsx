import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import pb from '@/lib/pocketbaseClient';
import { useAuth } from '@/contexts/AuthContext.jsx';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { Loader2, Image as ImageIcon } from 'lucide-react';

const CATEGORIES = ['Technology', 'Tutorials', 'News', 'Opinion', 'Updates'];

const BlogArticleForm = ({ initialData = null }) => {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [imagePreview, setImagePreview] = useState(null);
  
  const [formData, setFormData] = useState({
    title: '',
    slug: '',
    content: '',
    excerpt: '',
    category: '',
    tags: '',
    published: false,
    featured_image: null
  });

  useEffect(() => {
    if (initialData) {
      setFormData({
        title: initialData.title || '',
        slug: initialData.slug || '',
        content: initialData.content || '',
        excerpt: initialData.excerpt || '',
        category: initialData.category || '',
        tags: initialData.tags ? initialData.tags.join(', ') : '',
        published: initialData.published || false,
        featured_image: null // Don't set file object from initial data
      });
      
      if (initialData.featured_image) {
        setImagePreview(pb.files.getUrl(initialData, initialData.featured_image));
      }
    }
  }, [initialData]);

  const generateSlug = (title) => {
    return title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)+/g, '');
  };

  const handleTitleChange = (e) => {
    const title = e.target.value;
    setFormData(prev => ({
      ...prev,
      title,
      slug: !initialData ? generateSlug(title) : prev.slug
    }));
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setFormData(prev => ({ ...prev, featured_image: file }));
      setImagePreview(URL.createObjectURL(file));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.title || !formData.content || !formData.category) {
      toast.error('Please fill in all required fields');
      return;
    }

    setIsSubmitting(true);
    try {
      const data = new FormData();
      data.append('title', formData.title);
      data.append('slug', formData.slug);
      data.append('content', formData.content);
      data.append('excerpt', formData.excerpt);
      data.append('category', formData.category);
      data.append('published', formData.published);
      data.append('author', currentUser.id);
      
      // Handle tags (convert comma separated string to array)
      const tagsArray = formData.tags.split(',').map(t => t.trim()).filter(t => t);
      data.append('tags', JSON.stringify(tagsArray));

      if (formData.featured_image) {
        data.append('featured_image', formData.featured_image);
      }

      if (initialData?.id) {
        await pb.collection('blog_posts').update(initialData.id, data, { $autoCancel: false });
        toast.success('Article updated successfully');
      } else {
        await pb.collection('blog_posts').create(data, { $autoCancel: false });
        toast.success('Article created successfully');
      }
      
      navigate('/creator/blog');
    } catch (error) {
      console.error('Error saving article:', error);
      toast.error(error.message || 'Failed to save article');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <div className="space-y-2">
            <Label htmlFor="title">Article Title <span className="text-destructive">*</span></Label>
            <Input 
              id="title" 
              name="title" 
              value={formData.title} 
              onChange={handleTitleChange} 
              placeholder="Enter an engaging title..."
              className="text-lg font-medium"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="content">Content (Markdown supported) <span className="text-destructive">*</span></Label>
            <Textarea 
              id="content" 
              name="content" 
              value={formData.content} 
              onChange={handleChange} 
              placeholder="Write your article content here..."
              className="min-h-[400px] font-mono text-sm"
            />
          </div>

          <div className="space-y-2">
            <div className="flex justify-between">
              <Label htmlFor="excerpt">Excerpt</Label>
              <span className="text-xs text-muted-foreground">{formData.excerpt.length}/200</span>
            </div>
            <Textarea 
              id="excerpt" 
              name="excerpt" 
              value={formData.excerpt} 
              onChange={handleChange} 
              placeholder="A brief summary of the article..."
              maxLength={200}
              className="h-24 resize-none"
            />
          </div>
        </div>

        <div className="space-y-6">
          <div className="p-6 border rounded-xl bg-muted/10 space-y-6">
            <div className="flex items-center justify-between">
              <Label htmlFor="published" className="text-base font-medium">Publish Status</Label>
              <Switch 
                id="published" 
                checked={formData.published} 
                onCheckedChange={(checked) => setFormData(prev => ({ ...prev, published: checked }))} 
              />
            </div>
            <p className="text-sm text-muted-foreground">
              {formData.published ? 'Article will be visible to the public.' : 'Article will be saved as a draft.'}
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="slug">URL Slug <span className="text-destructive">*</span></Label>
            <Input 
              id="slug" 
              name="slug" 
              value={formData.slug} 
              onChange={handleChange} 
              className="font-mono text-sm"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="category">Category <span className="text-destructive">*</span></Label>
            <Select 
              value={formData.category} 
              onValueChange={(val) => setFormData(prev => ({ ...prev, category: val }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select a category" />
              </SelectTrigger>
              <SelectContent>
                {CATEGORIES.map(cat => (
                  <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="tags">Tags (comma separated)</Label>
            <Input 
              id="tags" 
              name="tags" 
              value={formData.tags} 
              onChange={handleChange} 
              placeholder="tech, coding, web..."
            />
          </div>

          <div className="space-y-2">
            <Label>Featured Image</Label>
            <div className="border-2 border-dashed rounded-xl p-4 text-center hover:bg-muted/50 transition-colors cursor-pointer relative overflow-hidden group">
              <input 
                type="file" 
                accept="image/*" 
                onChange={handleImageChange} 
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
              />
              {imagePreview ? (
                <div className="relative aspect-video w-full overflow-hidden rounded-lg">
                  <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <span className="text-white font-medium">Change Image</span>
                  </div>
                </div>
              ) : (
                <div className="py-8 flex flex-col items-center justify-center text-muted-foreground">
                  <ImageIcon className="w-10 h-10 mb-2 opacity-50" />
                  <p className="text-sm font-medium">Click or drag to upload</p>
                  <p className="text-xs mt-1">JPEG, PNG, WebP (max 5MB)</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="flex justify-end space-x-4 pt-6 border-t">
        <Button type="button" variant="outline" onClick={() => navigate('/creator/blog')} disabled={isSubmitting}>
          Cancel
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
          {initialData ? 'Save Changes' : 'Create Article'}
        </Button>
      </div>
    </form>
  );
};

export default BlogArticleForm;