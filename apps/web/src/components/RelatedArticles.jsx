import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import pb from '@/lib/pocketbaseClient';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

const RelatedArticles = ({ category, currentPostId }) => {
  const [articles, setArticles] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchRelated = async () => {
      try {
        const records = await pb.collection('blog_posts').getList(1, 3, {
          filter: `category="${category}" && id != "${currentPostId}" && published=true`,
          sort: '-created_at',
          $autoCancel: false
        });
        setArticles(records.items);
      } catch (error) {
        console.error('Error fetching related articles:', error);
      } finally {
        setLoading(false);
      }
    };

    if (category && currentPostId) {
      fetchRelated();
    }
  }, [category, currentPostId]);

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8">
        {[1, 2, 3].map(i => (
          <div key={i} className="space-y-4">
            <Skeleton className="h-48 w-full rounded-xl" />
            <Skeleton className="h-6 w-3/4" />
            <Skeleton className="h-4 w-full" />
          </div>
        ))}
      </div>
    );
  }

  if (articles.length === 0) {
    return (
      <div className="text-center py-12 bg-muted/30 rounded-2xl mt-8">
        <p className="text-muted-foreground">No related articles found in this category.</p>
      </div>
    );
  }

  return (
    <div className="mt-16">
      <h3 className="text-2xl font-bold mb-8">Related Articles</h3>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {articles.map(article => (
          <Link key={article.id} to={`/blog/${article.slug}`} className="group block h-full">
            <Card className="h-full overflow-hidden border-transparent shadow-sm hover:shadow-md transition-all duration-300 bg-muted/30 hover:bg-muted/50">
              <div className="aspect-[16/9] overflow-hidden bg-muted">
                {article.featured_image ? (
                  <img 
                    src={pb.files.getUrl(article, article.featured_image, { thumb: '400x300' })} 
                    alt={article.title}
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-muted-foreground">No image</div>
                )}
              </div>
              <CardContent className="p-5">
                <h4 className="font-semibold text-lg mb-2 line-clamp-2 group-hover:text-primary transition-colors">
                  {article.title}
                </h4>
                <p className="text-sm text-muted-foreground line-clamp-2">
                  {article.excerpt}
                </p>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
};

export default RelatedArticles;