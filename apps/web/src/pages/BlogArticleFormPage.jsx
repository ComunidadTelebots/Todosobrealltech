import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Helmet } from 'react-helmet';
import pb from '@/lib/pocketbaseClient';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import BlogArticleForm from '@/components/BlogArticleForm.jsx';

const BlogArticleFormPage = () => {
  const { id } = useParams();
  const isEditing = !!id;
  const [initialData, setInitialData] = useState(null);
  const [loading, setLoading] = useState(isEditing);

  useEffect(() => {
    const fetchPost = async () => {
      if (isEditing) {
        try {
          const record = await pb.collection('blog_posts').getOne(id, { $autoCancel: false });
          setInitialData(record);
        } catch (error) {
          console.error('Error fetching post:', error);
        } finally {
          setLoading(false);
        }
      }
    };

    fetchPost();
  }, [id, isEditing]);

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">Loading editor...</div>;
  }

  return (
    <>
      <Helmet>
        <title>{isEditing ? 'Edit Article' : 'Create New Article'} - Blog Admin</title>
      </Helmet>

      <div className="min-h-[calc(100vh-4rem)] py-12 bg-muted/30">
        <div className="container max-w-6xl space-y-8">
          
          <div className="flex items-center space-x-4">
            <Button variant="outline" size="icon" asChild>
              <Link to="/creator/blog"><ArrowLeft className="w-4 h-4" /></Link>
            </Button>
            <div>
              <h1 className="text-3xl font-bold tracking-tight">
                {isEditing ? 'Edit Article' : 'Create New Article'}
              </h1>
              <p className="text-muted-foreground">
                {isEditing ? 'Update your existing content.' : 'Draft and publish a new post to your blog.'}
              </p>
            </div>
          </div>

          <div className="bg-background rounded-2xl p-6 md:p-8 shadow-sm border">
            <BlogArticleForm initialData={initialData} />
          </div>

        </div>
      </div>
    </>
  );
};

export default BlogArticleFormPage;