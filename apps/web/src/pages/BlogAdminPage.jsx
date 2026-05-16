import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet';
import { Link } from 'react-router-dom';
import pb from '@/lib/pocketbaseClient';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { FileText, MessageSquare, Plus, Edit2, Trash2, Eye, EyeOff, ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';
import StatCard from '@/components/StatCard.jsx';
import CommentsModeration from '@/components/CommentsModeration.jsx';

const BlogAdminPage = () => {
  const [posts, setPosts] = useState([]);
  const [stats, setStats] = useState({ total: 0, published: 0, pendingComments: 0 });
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [postsList, pendingComments] = await Promise.all([
        pb.collection('blog_posts').getList(1, 100, { sort: '-created_at', expand: 'author', $autoCancel: false }),
        pb.collection('blog_comments').getList(1, 1, { filter: 'approved=false', $autoCancel: false })
      ]);

      setPosts(postsList.items);
      setStats({
        total: postsList.totalItems,
        published: postsList.items.filter(p => p.published).length,
        pendingComments: pendingComments.totalItems
      });
    } catch (error) {
      console.error('Error fetching blog admin data:', error);
      toast.error('Failed to load blog data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleTogglePublish = async (post) => {
    try {
      await pb.collection('blog_posts').update(post.id, { published: !post.published }, { $autoCancel: false });
      toast.success(`Post ${!post.published ? 'published' : 'unpublished'}`);
      fetchData();
    } catch (error) {
      toast.error('Failed to update post status');
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this article? This cannot be undone.')) {
      try {
        await pb.collection('blog_posts').delete(id, { $autoCancel: false });
        toast.success('Article deleted successfully');
        fetchData();
      } catch (error) {
        toast.error('Failed to delete article');
      }
    }
  };

  return (
    <>
      <Helmet>
        <title>Blog Management - Admin</title>
      </Helmet>

      <div className="min-h-[calc(100vh-4rem)] py-12 bg-muted/30">
        <div className="container max-w-7xl space-y-8">
          
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center space-x-2 mb-2">
                <Button variant="ghost" size="icon" asChild className="-ml-2">
                  <Link to="/creator"><ArrowLeft className="w-4 h-4" /></Link>
                </Button>
                <h1 className="text-3xl font-bold tracking-tight">Blog Management</h1>
              </div>
              <p className="text-muted-foreground">Manage articles, categories, and comments.</p>
            </div>
            <Button asChild size="lg">
              <Link to="/creator/blog/new">
                <Plus className="w-4 h-4 mr-2" /> Create New Article
              </Link>
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <StatCard icon={FileText} title="Total Articles" value={stats.total} status="default" />
            <StatCard icon={Eye} title="Published" value={stats.published} status="success" />
            <StatCard icon={MessageSquare} title="Pending Comments" value={stats.pendingComments} status={stats.pendingComments > 0 ? "warning" : "default"} />
          </div>

          <Tabs defaultValue="articles" className="space-y-6">
            <TabsList>
              <TabsTrigger value="articles">Articles</TabsTrigger>
              <TabsTrigger value="comments">
                Comments Moderation
                {stats.pendingComments > 0 && (
                  <Badge variant="destructive" className="ml-2 px-1.5 py-0.5 text-[10px]">{stats.pendingComments}</Badge>
                )}
              </TabsTrigger>
            </TabsList>

            <TabsContent value="articles">
              <Card>
                <CardHeader>
                  <CardTitle>All Articles</CardTitle>
                </CardHeader>
                <CardContent>
                  {loading ? (
                    <div className="py-8 text-center text-muted-foreground">Loading articles...</div>
                  ) : (
                    <div className="rounded-md border overflow-hidden">
                      <Table>
                        <TableHeader className="bg-muted/50">
                          <TableRow>
                            <TableHead className="w-[40%]">Title</TableHead>
                            <TableHead>Category</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Views</TableHead>
                            <TableHead>Date</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {posts.map(post => (
                            <TableRow key={post.id}>
                              <TableCell className="font-medium">
                                <div className="line-clamp-1">{post.title}</div>
                                <div className="text-xs text-muted-foreground font-mono mt-1">/{post.slug}</div>
                              </TableCell>
                              <TableCell><Badge variant="outline">{post.category}</Badge></TableCell>
                              <TableCell>
                                <Badge variant={post.published ? "default" : "secondary"}>
                                  {post.published ? 'Published' : 'Draft'}
                                </Badge>
                              </TableCell>
                              <TableCell>{post.views || 0}</TableCell>
                              <TableCell className="text-sm text-muted-foreground">
                                {new Date(post.created_at).toLocaleDateString()}
                              </TableCell>
                              <TableCell className="text-right space-x-2">
                                <Button variant="ghost" size="icon" onClick={() => handleTogglePublish(post)} title={post.published ? "Unpublish" : "Publish"}>
                                  {post.published ? <EyeOff className="w-4 h-4 text-muted-foreground" /> : <Eye className="w-4 h-4 text-green-600" />}
                                </Button>
                                <Button variant="ghost" size="icon" asChild>
                                  <Link to={`/creator/blog/${post.id}/edit`}><Edit2 className="w-4 h-4" /></Link>
                                </Button>
                                <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive hover:bg-destructive/10" onClick={() => handleDelete(post.id)}>
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))}
                          {posts.length === 0 && (
                            <TableRow><TableCell colSpan={6} className="text-center py-8">No articles found. Create one to get started.</TableCell></TableRow>
                          )}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="comments">
              <Card>
                <CardHeader>
                  <CardTitle>Pending Comments</CardTitle>
                </CardHeader>
                <CardContent>
                  <CommentsModeration />
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>

        </div>
      </div>
    </>
  );
};

export default BlogAdminPage;