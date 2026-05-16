import React, { useState, useEffect } from 'react';
import pb from '@/lib/pocketbaseClient';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Check, X, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

const CommentsModeration = () => {
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState(null);

  const fetchPendingComments = async () => {
    setLoading(true);
    try {
      const records = await pb.collection('blog_comments').getList(1, 50, {
        filter: 'approved=false',
        sort: '-created_at',
        expand: 'author,post_id',
        $autoCancel: false
      });
      setComments(records.items);
    } catch (error) {
      console.error('Error fetching pending comments:', error);
      toast.error('Failed to load pending comments');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPendingComments();
  }, []);

  const handleApprove = async (id) => {
    setProcessingId(id);
    try {
      await pb.collection('blog_comments').update(id, { approved: true }, { $autoCancel: false });
      toast.success('Comment approved');
      setComments(comments.filter(c => c.id !== id));
    } catch (error) {
      toast.error('Failed to approve comment');
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = async (id) => {
    if (!window.confirm('Are you sure you want to delete this comment?')) return;
    
    setProcessingId(id);
    try {
      await pb.collection('blog_comments').delete(id, { $autoCancel: false });
      toast.success('Comment rejected and deleted');
      setComments(comments.filter(c => c.id !== id));
    } catch (error) {
      toast.error('Failed to reject comment');
    } finally {
      setProcessingId(null);
    }
  };

  if (loading) {
    return <div className="py-8 text-center text-muted-foreground">Loading pending comments...</div>;
  }

  if (comments.length === 0) {
    return (
      <div className="py-12 text-center border rounded-xl bg-muted/10">
        <p className="text-muted-foreground">No pending comments to moderate.</p>
      </div>
    );
  }

  return (
    <div className="rounded-md border overflow-hidden">
      <Table>
        <TableHeader className="bg-muted/50">
          <TableRow>
            <TableHead>Author</TableHead>
            <TableHead>Post</TableHead>
            <TableHead className="w-1/2">Comment</TableHead>
            <TableHead>Date</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {comments.map(comment => (
            <TableRow key={comment.id}>
              <TableCell className="font-medium">
                {comment.expand?.author?.name || comment.expand?.author?.email || 'Unknown'}
              </TableCell>
              <TableCell className="text-sm text-muted-foreground truncate max-w-[150px]">
                {comment.expand?.post_id?.title || 'Unknown Post'}
              </TableCell>
              <TableCell className="text-sm">
                <p className="line-clamp-2">{comment.content}</p>
              </TableCell>
              <TableCell className="text-sm text-muted-foreground">
                {new Date(comment.created_at).toLocaleDateString()}
              </TableCell>
              <TableCell className="text-right space-x-2">
                <Button 
                  size="sm" 
                  variant="outline" 
                  className="text-green-600 hover:text-green-700 hover:bg-green-50"
                  onClick={() => handleApprove(comment.id)}
                  disabled={processingId === comment.id}
                >
                  {processingId === comment.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4 mr-1" />}
                  Approve
                </Button>
                <Button 
                  size="sm" 
                  variant="outline" 
                  className="text-destructive hover:text-destructive hover:bg-destructive/10"
                  onClick={() => handleReject(comment.id)}
                  disabled={processingId === comment.id}
                >
                  <X className="w-4 h-4 mr-1" />
                  Reject
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
};

export default CommentsModeration;