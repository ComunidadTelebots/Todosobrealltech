import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet';
import pb from '@/lib/pocketbaseClient';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Calendar, Eye, ArrowLeft, Share2, Twitter, Linkedin, Facebook, Link as LinkIcon } from 'lucide-react';
import { toast } from 'sonner';
import CommentsSection from '@/components/CommentsSection.jsx';
import RelatedArticles from '@/components/RelatedArticles.jsx';

const BlogPostPage = () => {
  const { slug } = useParams();
  const navigate = useNavigate();
  const [post, setPost] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPost = async () => {
      try {
        // Fetch post by slug
        const record = await pb.collection('blog_posts').getFirstListItem(`slug="${slug}" && published=true`, {
          expand: 'author',
          $autoCancel: false
        });
        
        setPost(record);

        // Increment views (fire and forget)
        pb.collection('blog_posts').update(record.id, {
          views: (record.views || 0) + 1
        }, { $autoCancel: false }).catch(console.error);

      } catch (error) {
        console.error('Error fetching post:', error);
        toast.error('Article not found');
        navigate('/blog');
      } finally {
        setLoading(false);
      }
    };

    fetchPost();
    window.scrollTo(0, 0);
  }, [slug, navigate]);

  const handleShare = (platform) => {
    const url = window.location.href;
    const title = post?.title || 'Check out this article';
    
    switch (platform) {
      case 'twitter':
        window.open(`https://twitter.com/intent/tweet?url=${encodeURIComponent(url)}&text=${encodeURIComponent(title)}`, '_blank');
        break;
      case 'linkedin':
        window.open(`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`, '_blank');
        break;
      case 'facebook':
        window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`, '_blank');
        break;
      case 'copy':
        navigator.clipboard.writeText(url);
        toast.success('Link copied to clipboard');
        break;
      default:
        break;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!post) return null;

  return (
    <>
      <Helmet>
        <title>{`${post.title} - Blog`}</title>
        <meta name="description" content={post.excerpt} />
      </Helmet>

      <article className="min-h-screen bg-background pb-24">
        {/* Hero Section */}
        <div className="w-full h-[40vh] md:h-[60vh] relative bg-muted">
          {post.featured_image && (
            <img 
              src={pb.files.getUrl(post, post.featured_image)} 
              alt={post.title}
              className="w-full h-full object-cover"
            />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-background via-background/20 to-transparent" />
        </div>

        <div className="container max-w-4xl -mt-32 relative z-10">
          {/* Article Header */}
          <div className="bg-background rounded-3xl p-8 md:p-12 shadow-xl border mb-12">
            <Button variant="ghost" size="sm" asChild className="mb-6 -ml-3 text-muted-foreground">
              <Link to="/blog"><ArrowLeft className="w-4 h-4 mr-2" /> Back to Blog</Link>
            </Button>
            
            <div className="flex items-center space-x-3 mb-6">
              <Badge className="bg-primary/10 text-primary hover:bg-primary/20 border-transparent">
                {post.category}
              </Badge>
              <span className="text-sm text-muted-foreground flex items-center">
                <Calendar className="w-4 h-4 mr-1" /> {new Date(post.created_at).toLocaleDateString()}
              </span>
              <span className="text-sm text-muted-foreground flex items-center">
                <Eye className="w-4 h-4 mr-1" /> {post.views || 0} views
              </span>
            </div>

            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight mb-8 leading-tight">
              {post.title}
            </h1>

            <div className="flex items-center justify-between border-t pt-6">
              <div className="flex items-center space-x-4">
                <Avatar className="w-12 h-12 border-2 border-background shadow-sm">
                  <AvatarImage src={post.expand?.author?.avatar ? pb.files.getUrl(post.expand.author, post.expand.author.avatar) : ''} />
                  <AvatarFallback>{post.expand?.author?.name?.charAt(0) || 'A'}</AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-semibold text-lg">{post.expand?.author?.name || 'Admin'}</p>
                  <p className="text-sm text-muted-foreground">Author</p>
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <Button variant="outline" size="icon" className="rounded-full" onClick={() => handleShare('twitter')}>
                  <Twitter className="w-4 h-4" />
                </Button>
                <Button variant="outline" size="icon" className="rounded-full" onClick={() => handleShare('linkedin')}>
                  <Linkedin className="w-4 h-4" />
                </Button>
                <Button variant="outline" size="icon" className="rounded-full" onClick={() => handleShare('copy')}>
                  <LinkIcon className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>

          {/* Article Content */}
          <div className="prose-blog">
            {/* Simple markdown rendering fallback - in a real app use react-markdown */}
            {post.content.split('\n\n').map((paragraph, idx) => {
              if (paragraph.startsWith('# ')) return <h1 key={idx}>{paragraph.replace('# ', '')}</h1>;
              if (paragraph.startsWith('## ')) return <h2 key={idx}>{paragraph.replace('## ', '')}</h2>;
              if (paragraph.startsWith('### ')) return <h3 key={idx}>{paragraph.replace('### ', '')}</h3>;
              if (paragraph.startsWith('> ')) return <blockquote key={idx}>{paragraph.replace('> ', '')}</blockquote>;
              return <p key={idx}>{paragraph}</p>;
            })}
          </div>

          {/* Tags */}
          {post.tags && post.tags.length > 0 && (
            <div className="mt-12 pt-8 border-t flex flex-wrap gap-2">
              <span className="text-sm font-medium text-muted-foreground mr-2 flex items-center">Tags:</span>
              {post.tags.map(tag => (
                <Badge key={tag} variant="secondary" className="rounded-md">{tag}</Badge>
              ))}
            </div>
          )}

          <CommentsSection postId={post.id} />
          <RelatedArticles category={post.category} currentPostId={post.id} />
        </div>
      </article>
    </>
  );
};

export default BlogPostPage;