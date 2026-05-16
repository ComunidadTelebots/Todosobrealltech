import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet';
import { Link } from 'react-router-dom';
import pb from '@/lib/pocketbaseClient';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Search, Calendar, Eye, ArrowRight } from 'lucide-react';

const CATEGORIES = ['All', 'Technology', 'Tutorials', 'News', 'Opinion', 'Updates'];

const BlogPage = () => {
  const [posts, setPosts] = useState([]);
  const [featuredPosts, setFeaturedPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('All');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const fetchPosts = async () => {
    setLoading(true);
    try {
      let filterStr = 'published=true';
      if (activeCategory !== 'All') {
        filterStr += ` && category="${activeCategory}"`;
      }
      if (searchQuery) {
        filterStr += ` && (title~"${searchQuery}" || excerpt~"${searchQuery}")`;
      }

      const records = await pb.collection('blog_posts').getList(page, 12, {
        filter: filterStr,
        sort: '-created_at',
        expand: 'author',
        $autoCancel: false
      });

      if (page === 1 && !searchQuery && activeCategory === 'All') {
        setFeaturedPosts(records.items.slice(0, 2));
        setPosts(records.items.slice(2));
      } else {
        setPosts(records.items);
        if (page === 1) setFeaturedPosts([]);
      }
      
      setTotalPages(records.totalPages);
    } catch (error) {
      console.error('Error fetching blog posts:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchPosts();
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery, activeCategory, page]);

  return (
    <>
      <Helmet>
        <title>Blog - Todo sobre alltech</title>
        <meta name="description" content="Read the latest articles, tutorials, and news about technology." />
      </Helmet>

      <div className="min-h-screen bg-[hsl(var(--blog-surface))] pb-24">
        {/* Header Section */}
        <div className="bg-background border-b">
          <div className="container max-w-7xl py-16 md:py-24">
            <div className="max-w-2xl">
              <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-6">
                Insights & Updates
              </h1>
              <p className="text-xl text-muted-foreground mb-8">
                Discover the latest trends, tutorials, and stories from our team of experts.
              </p>
              <div className="relative max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <Input 
                  placeholder="Search articles..." 
                  className="pl-10 h-12 text-base rounded-full bg-muted/50 border-transparent focus-visible:ring-primary"
                  value={searchQuery}
                  onChange={(e) => { setSearchQuery(e.target.value); setPage(1); }}
                />
              </div>
            </div>
          </div>
        </div>

        <div className="container max-w-7xl mt-12">
          {/* Categories */}
          <div className="flex flex-wrap gap-2 mb-12">
            {CATEGORIES.map(cat => (
              <Button
                key={cat}
                variant={activeCategory === cat ? 'default' : 'outline'}
                className="rounded-full"
                onClick={() => { setActiveCategory(cat); setPage(1); }}
              >
                {cat}
              </Button>
            ))}
          </div>

          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {[1, 2, 3, 4, 5, 6].map(i => (
                <div key={i} className="space-y-4">
                  <Skeleton className="h-64 w-full rounded-2xl" />
                  <Skeleton className="h-6 w-3/4" />
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-2/3" />
                </div>
              ))}
            </div>
          ) : (
            <>
              {/* Featured Posts (Only on page 1, no search/filter) */}
              {featuredPosts.length > 0 && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-16">
                  {featuredPosts.map((post, idx) => (
                    <Link key={post.id} to={`/blog/${post.slug}`} className="group block">
                      <Card className="h-full overflow-hidden border-transparent shadow-md hover:shadow-xl transition-all duration-500 rounded-3xl bg-background">
                        <div className="aspect-[16/10] overflow-hidden relative">
                          {post.featured_image ? (
                            <img 
                              src={pb.files.getUrl(post, post.featured_image, { thumb: '800x600' })} 
                              alt={post.title}
                              className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                            />
                          ) : (
                            <div className="w-full h-full bg-muted flex items-center justify-center">No image</div>
                          )}
                          <div className="absolute top-4 left-4">
                            <Badge className="bg-background/90 text-foreground backdrop-blur-sm hover:bg-background/90">
                              {post.category}
                            </Badge>
                          </div>
                        </div>
                        <CardContent className="p-8">
                          <div className="flex items-center space-x-4 text-sm text-muted-foreground mb-4">
                            <span className="flex items-center"><Calendar className="w-4 h-4 mr-1" /> {new Date(post.created_at).toLocaleDateString()}</span>
                            <span className="flex items-center"><Eye className="w-4 h-4 mr-1" /> {post.views || 0}</span>
                          </div>
                          <h2 className="text-2xl md:text-3xl font-bold mb-4 group-hover:text-primary transition-colors line-clamp-2">
                            {post.title}
                          </h2>
                          <p className="text-muted-foreground line-clamp-2 mb-6 text-lg">
                            {post.excerpt}
                          </p>
                          <div className="flex items-center justify-between mt-auto">
                            <span className="font-medium">{post.expand?.author?.name || 'Admin'}</span>
                            <span className="text-primary font-medium flex items-center group-hover:translate-x-1 transition-transform">
                              Read Article <ArrowRight className="w-4 h-4 ml-1" />
                            </span>
                          </div>
                        </CardContent>
                      </Card>
                    </Link>
                  ))}
                </div>
              )}

              {/* Regular Posts Grid */}
              {posts.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                  {posts.map(post => (
                    <Link key={post.id} to={`/blog/${post.slug}`} className="group block h-full">
                      <Card className="h-full flex flex-col overflow-hidden border-transparent shadow-sm hover:shadow-lg transition-all duration-300 rounded-2xl bg-background">
                        <div className="aspect-[16/10] overflow-hidden relative">
                          {post.featured_image ? (
                            <img 
                              src={pb.files.getUrl(post, post.featured_image, { thumb: '400x300' })} 
                              alt={post.title}
                              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                            />
                          ) : (
                            <div className="w-full h-full bg-muted flex items-center justify-center">No image</div>
                          )}
                          <div className="absolute top-3 left-3">
                            <Badge variant="secondary" className="bg-background/80 backdrop-blur-sm">
                              {post.category}
                            </Badge>
                          </div>
                        </div>
                        <CardContent className="p-6 flex flex-col flex-1">
                          <div className="flex items-center space-x-3 text-xs text-muted-foreground mb-3">
                            <span>{new Date(post.created_at).toLocaleDateString()}</span>
                            <span>•</span>
                            <span>{post.views || 0} views</span>
                          </div>
                          <h3 className="text-xl font-bold mb-3 group-hover:text-primary transition-colors line-clamp-2">
                            {post.title}
                          </h3>
                          <p className="text-muted-foreground line-clamp-2 mb-6 text-sm flex-1">
                            {post.excerpt}
                          </p>
                          <div className="flex items-center mt-auto pt-4 border-t">
                            <span className="text-sm font-medium">{post.expand?.author?.name || 'Admin'}</span>
                          </div>
                        </CardContent>
                      </Card>
                    </Link>
                  ))}
                </div>
              ) : (
                !featuredPosts.length && (
                  <div className="text-center py-24 bg-background rounded-3xl border border-dashed">
                    <h3 className="text-2xl font-bold mb-2">No articles found</h3>
                    <p className="text-muted-foreground">Try adjusting your search or category filter.</p>
                    <Button variant="outline" className="mt-6" onClick={() => { setSearchQuery(''); setActiveCategory('All'); }}>
                      Clear Filters
                    </Button>
                  </div>
                )
              )}

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex justify-center items-center space-x-2 mt-16">
                  <Button 
                    variant="outline" 
                    disabled={page === 1}
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                  >
                    Previous
                  </Button>
                  <span className="text-sm font-medium px-4">
                    Page {page} of {totalPages}
                  </span>
                  <Button 
                    variant="outline" 
                    disabled={page === totalPages}
                    onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  >
                    Next
                  </Button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </>
  );
};

export default BlogPage;